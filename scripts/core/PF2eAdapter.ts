import { ETHERNUM } from "../config.js";
import {
  getPippingAction,
  getPippingActionAvailability,
  pippingTierForLevel,
} from "../mechanics/pipping/progression.js";
import { normalizePippingState, type PippingTier } from "../mechanics/pipping/state.js";
import { AutomationAuthority } from "./AutomationAuthority.js";

export interface PF2eConditionMutation {
  slug: string;
  value?: number;
  mode?: "increase" | "decrease";
  turnStartsRemaining?: number;
  persistent?: {
    formula: string;
    damageType: string;
    dc?: number;
  };
}

export interface PF2eEffectMutation {
  name: string;
  slug: string;
  description: string;
  durationRounds?: number;
  rules?: Array<Record<string, unknown>>;
  img?: string;
}

export interface PF2eActorMutation {
  actorUuid: string;
  hpDelta?: number;
  damage?: {
    total: number;
    type: string;
  };
  healing?: {
    total: number;
  };
  conditions?: PF2eConditionMutation[];
  effects?: PF2eEffectMutation[];
}

export interface PF2eMutationResult {
  actorUuid: string;
  applied: boolean;
  notes: string[];
}

export type PF2eSaveType = "fortitude" | "reflex" | "will";

export type PF2eSaveDegree =
  | "criticalFailure"
  | "failure"
  | "success"
  | "criticalSuccess";

export interface PF2eSaveRollConfiguration {
  extraRollOptions?: string[];
  rollOptions?: string[];
  modifiers?: unknown[];
  [key: string]: unknown;
}

export interface PF2eSaveRollRequest {
  actor: Actor;
  save: PF2eSaveType;
  dc: number;
  traits?: string[];
  origin?: Actor | null;
  options?: string[] | PF2eSaveRollConfiguration;
}

export interface PF2eSaveRollResult {
  degree: PF2eSaveDegree;
  natural: number;
  total: number;
  fallback: boolean;
  source: "pf2e-api" | "manual-fallback";
}

interface MutationRequest {
  type: "pf2e-mutation-request";
  requestId: string;
  requesterId: string;
  sourceActorUuid: string;
  actionId: string;
  mutations: PF2eActorMutation[];
}

interface MutationResponse {
  type: "pf2e-mutation-response";
  requestId: string;
  requesterId: string;
  results: PF2eMutationResult[];
  error?: string;
}

type AdapterSocketMessage = MutationRequest | MutationResponse;

const SOCKET_CHANNEL = `module.${ETHERNUM.MODULE_NAME}`;
const REQUEST_TIMEOUT_MS = 12_000;
const pendingRequests = new Map<
  string,
  {
    resolve: (results: PF2eMutationResult[]) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();
let socketInitialized = false;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface PF2eSaveStatistic {
  mod?: unknown;
  check?: {
    mod?: unknown;
    roll?: (options: Record<string, unknown>) => Promise<unknown>;
  };
}

function saveStatistic(actor: Actor, save: PF2eSaveType): PF2eSaveStatistic | null {
  const pf2eActor = actor as Actor & {
    saves?: Partial<Record<PF2eSaveType, PF2eSaveStatistic>>;
    getStatistic?: (slug: string) => unknown;
  };
  const preparedSave = pf2eActor.saves?.[save];
  if (preparedSave) return preparedSave;
  const statistic = pf2eActor.getStatistic?.(save);
  return statistic && typeof statistic === "object"
    ? statistic as PF2eSaveStatistic
    : null;
}

function saveRollOptions(
  options: PF2eSaveRollRequest["options"],
): Record<string, unknown> {
  if (Array.isArray(options)) {
    return { extraRollOptions: [...options] };
  }
  if (!options) return {};
  const {
    extraRollOptions,
    rollOptions,
    ...rollConfiguration
  } = options as PF2eSaveRollConfiguration;
  const combinedRollOptions = [
    ...(rollOptions ?? []),
    ...(extraRollOptions ?? []),
  ];
  return {
    ...rollConfiguration,
    ...(combinedRollOptions.length > 0
      ? { extraRollOptions: combinedRollOptions }
      : {}),
  };
}

function naturalD20FromRoll(roll: unknown): number {
  const dice = Array.isArray(record(roll).dice)
    ? record(roll).dice as unknown[]
    : [];
  for (const die of dice) {
    const dieData = record(die);
    const faces = Number(dieData.faces);
    if (Number.isFinite(faces) && faces !== 20) continue;
    const results = Array.isArray(dieData.results) ? dieData.results : [];
    const activeResult = results
      .map(result => record(result))
      .find(result => result.active !== false && result.discarded !== true);
    const natural = Number(activeResult?.result ?? dieData.total);
    if (Number.isFinite(natural)) return natural;
  }
  return 0;
}

function normalizeSaveDegree(value: unknown): PF2eSaveDegree | null {
  const degreeByIndex: PF2eSaveDegree[] = [
    "criticalFailure",
    "failure",
    "success",
    "criticalSuccess",
  ];
  if (typeof value === "number" && Number.isInteger(value)) {
    return degreeByIndex[value] ?? null;
  }
  return degreeByIndex.includes(value as PF2eSaveDegree)
    ? value as PF2eSaveDegree
    : null;
}

function manualSaveDegree(total: number, dc: number, natural: number): PF2eSaveDegree {
  let degree = total >= dc + 10
    ? 3
    : total >= dc
      ? 2
      : total <= dc - 10
        ? 0
        : 1;
  if (natural === 20) degree = Math.min(3, degree + 1);
  if (natural === 1) degree = Math.max(0, degree - 1);
  return ([
    "criticalFailure",
    "failure",
    "success",
    "criticalSuccess",
  ] as PF2eSaveDegree[])[degree];
}

function numericModifier(value: unknown): number | null {
  const modifier = Number(value);
  return Number.isFinite(modifier) ? modifier : null;
}

function fallbackSaveModifier(
  actor: Actor,
  save: PF2eSaveType,
  statistic: PF2eSaveStatistic | null,
  options: Record<string, unknown>,
): number {
  const systemSaves = record(record(actor.system).saves);
  const systemSave = record(systemSaves[save]);
  const systemCheck = record(systemSave.check);
  const baseModifier = [
    statistic?.check?.mod,
    statistic?.mod,
    systemSave.total,
    systemSave.totalModifier,
    systemSave.mod,
    systemSave.value,
    systemCheck.total,
    systemCheck.totalModifier,
    systemCheck.mod,
  ]
    .map(numericModifier)
    .find((value): value is number => value !== null) ?? 0;
  const explicitModifiers = Array.isArray(options.modifiers)
    ? options.modifiers
    : [];
  return explicitModifiers.reduce((total, entry) => {
    const modifier = record(entry);
    if (modifier.enabled === false || modifier.ignored === true) return total;
    return total + (
      numericModifier(modifier.modifier)
      ?? numericModifier(modifier.value)
      ?? 0
    );
  }, baseModifier);
}

export async function rollSave(
  request: PF2eSaveRollRequest,
): Promise<PF2eSaveRollResult | null> {
  const dc = Math.trunc(Number(request.dc));
  if (!Number.isFinite(dc)) {
    throw new TypeError("PF2e save DC must be a finite number.");
  }

  const statistic = saveStatistic(request.actor, request.save);
  const options = saveRollOptions(request.options);
  const check = statistic?.check;
  const apiRoll = check?.roll;
  if (typeof apiRoll === "function") {
    const roll = await apiRoll.call(check, {
      ...options,
      dc: { value: dc },
      ...(request.traits ? { traits: request.traits } : {}),
      ...(request.origin !== undefined ? { origin: request.origin } : {}),
    });
    if (roll === null || roll === undefined) return null;
    const rollData = record(roll);
    const total = Number(rollData.total);
    const degree = normalizeSaveDegree(
      rollData.degreeOfSuccess ?? record(rollData.options).degreeOfSuccess,
    );
    if (!Number.isFinite(total) || !degree) {
      throw new Error("PF2e save API returned an incomplete roll result.");
    }
    return {
      degree,
      natural: naturalD20FromRoll(roll),
      total,
      fallback: false,
      source: "pf2e-api",
    };
  }

  const modifier = fallbackSaveModifier(
    request.actor,
    request.save,
    statistic,
    options,
  );
  const roll = new Roll("1d20 + @modifier", { modifier });
  await roll.evaluate();
  const total = Number(roll.total ?? 0);
  const natural = naturalD20FromRoll(roll);
  return {
    degree: manualSaveDegree(total, dc, natural),
    natural,
    total,
    fallback: true,
    source: "manual-fallback",
  };
}

async function resolveActor(uuid: string): Promise<Actor | null> {
  if (!uuid || typeof fromUuid !== "function") return null;
  const document = await (fromUuid as unknown as (documentUuid: string) => Promise<unknown>)(uuid);
  return document instanceof Actor ? document : null;
}

async function applyHpDelta(actor: Actor, delta: number): Promise<boolean> {
  const attributes = record(record(actor.system).attributes);
  const hp = record(attributes.hp);
  const value = Number(hp.value);
  const max = Number(hp.max);
  if (!Number.isFinite(value) || !Number.isFinite(max)) return false;
  await (actor as Actor & {
    update: (data: Record<string, unknown>) => Promise<Actor>;
  }).update({
    "system.attributes.hp.value": clamp(value + Math.floor(delta), 0, max),
  });
  return true;
}

async function applyTypedDamage(
  actor: Actor,
  total: number,
  damageType: string,
): Promise<boolean> {
  const pf2e = (game as unknown as {
    pf2e?: {
      DamageRoll?: new (
        formula: string,
        data?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => Roll;
    };
  }).pf2e;
  const applyDamage = (actor as Actor & {
    applyDamage?: (options: Record<string, unknown>) => Promise<unknown>;
  }).applyDamage;
  if (!pf2e?.DamageRoll || typeof applyDamage !== "function") return false;
  try {
    const roll = new pf2e.DamageRoll(
      `${Math.max(0, Math.floor(total))}[${damageType}]`,
      {},
      { type: "damage" },
    );
    await roll.evaluate();
    const token = typeof actor.getActiveTokens === "function"
      ? actor.getActiveTokens()[0]
      : undefined;
    await applyDamage.call(actor, {
      damage: roll,
      token,
      skipIWR: false,
      shieldBlockRequest: false,
    });
    return true;
  } catch (error) {
    console.warn("Ethernum | PF2e typed damage could not be applied", error);
    return false;
  }
}

async function applyHealing(actor: Actor, total: number): Promise<boolean> {
  const attributes = record(record(actor.system).attributes);
  const hp = record(attributes.hp);
  const value = Number(hp.value);
  const max = Number(hp.max);
  if (!Number.isFinite(value) || !Number.isFinite(max)) return false;
  const applied = Math.max(0, Math.min(Math.floor(total), max - value));
  if (applied <= 0) return true;
  try {
    await (actor as Actor & {
      update: (data: Record<string, unknown>) => Promise<Actor>;
    }).update({
      "system.attributes.hp.value": value + applied,
    });
    return true;
  } catch (error) {
    console.warn("Ethernum | PF2e healing could not be applied", error);
    return false;
  }
}

async function applyCondition(
  actor: Actor,
  mutation: PF2eConditionMutation,
): Promise<boolean> {
  const pf2eActor = actor as Actor & {
    increaseCondition?: (slug: string, options?: Record<string, unknown>) => Promise<unknown>;
    decreaseCondition?: (slug: string, options?: Record<string, unknown>) => Promise<unknown>;
  };
  const mode = mutation.mode ?? "increase";
  const value = Math.max(1, Math.floor(Number(mutation.value ?? 1)));
  try {
    if (mode === "decrease" && typeof pf2eActor.decreaseCondition === "function") {
      await pf2eActor.decreaseCondition(mutation.slug, { value });
      return true;
    }
    if (mode === "increase" && typeof pf2eActor.increaseCondition === "function") {
      const manager = (game as unknown as {
        pf2e?: {
          ConditionManager?: {
            getCondition?: (slug: string) => {
              toObject?: () => Record<string, unknown>;
            };
          };
        };
      }).pf2e?.ConditionManager;
      const source = manager?.getCondition?.(mutation.slug)?.toObject?.();
      if (source && mutation.persistent) {
        const system = record(source.system);
        system.persistent = {
          formula: mutation.persistent.formula,
          damageType: mutation.persistent.damageType,
          dc: Math.max(1, Math.floor(mutation.persistent.dc ?? 15)),
        };
        source.system = system;
        source.flags = {
          ...record(source.flags),
          [ETHERNUM.MODULE_NAME]: {
            ...record(record(source.flags)[ETHERNUM.MODULE_NAME]),
            uniqueEffect: `pipping-persistent-${foundry.utils.randomID(6)}`,
            pippingEffect: true,
          },
        };
        await (actor as Actor & {
          createEmbeddedDocuments: (
            embeddedName: "Item",
            data: Record<string, unknown>[],
            operation?: Record<string, unknown>,
          ) => Promise<Item[]>;
        }).createEmbeddedDocuments("Item", [source], { render: false });
        return true;
      }
      if (source && mutation.turnStartsRemaining) {
        const system = record(source.system);
        const valueData = record(system.value);
        if ("value" in valueData) valueData.value = value;
        system.value = valueData;
        source.system = system;
        source.flags = {
          ...record(source.flags),
          [ETHERNUM.MODULE_NAME]: {
            ...record(record(source.flags)[ETHERNUM.MODULE_NAME]),
            uniqueEffect: `pipping-${mutation.slug}-${foundry.utils.randomID(6)}`,
            pippingEffect: true,
            turnStartsRemaining: Math.max(1, Math.floor(mutation.turnStartsRemaining)),
          },
        };
        await (actor as Actor & {
          createEmbeddedDocuments: (
            embeddedName: "Item",
            data: Record<string, unknown>[],
            operation?: Record<string, unknown>,
          ) => Promise<Item[]>;
        }).createEmbeddedDocuments("Item", [source], { render: false });
        return true;
      }
      await pf2eActor.increaseCondition(mutation.slug, { value });
      return true;
    }
  } catch (error) {
    console.warn(`Ethernum | PF2e condition ${mutation.slug} could not be applied`, error);
  }
  return false;
}

function effectData(effect: PF2eEffectMutation): Record<string, unknown> {
  return {
    name: effect.name,
    type: "effect",
    img: effect.img ?? "icons/magic/unholy/silhouette-robe-evil-power.webp",
    system: {
      slug: effect.slug,
      description: { value: `<p>${escapeHtml(effect.description)}</p>` },
      level: { value: 1 },
      duration: {
        value: Math.max(1, effect.durationRounds ?? 1),
        unit: "rounds",
        sustained: false,
        expiry: "turn-start",
      },
      tokenIcon: { show: true },
      traits: { value: ["occult"] },
      rules: effect.rules ?? [],
    },
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        uniqueMechanics: true,
        uniqueEffect: effect.slug,
        pippingEffect: true,
      },
    },
  };
}

async function applyMutationLocally(
  mutation: PF2eActorMutation,
): Promise<PF2eMutationResult> {
  const actor = await resolveActor(mutation.actorUuid);
  if (!actor) {
    return {
      actorUuid: mutation.actorUuid,
      applied: false,
      notes: ["actor-not-found"],
    };
  }

  const notes: string[] = [];
  let applied = true;
  if (mutation.damage && mutation.damage.total > 0) {
    const damageApplied = await applyTypedDamage(
      actor,
      mutation.damage.total,
      mutation.damage.type,
    );
    applied &&= damageApplied;
    notes.push(damageApplied ? "damage:pf2e" : "damage-manual");
  }
  if (mutation.healing && mutation.healing.total > 0) {
    const healingApplied = await applyHealing(actor, mutation.healing.total);
    applied &&= healingApplied;
    notes.push(healingApplied ? "healing" : "healing-manual");
  }
  if (Number.isFinite(Number(mutation.hpDelta)) && Number(mutation.hpDelta) !== 0) {
    const hpApplied = await applyHpDelta(actor, Number(mutation.hpDelta));
    applied &&= hpApplied;
    notes.push(hpApplied ? "hp" : "hp-manual");
  }
  for (const condition of mutation.conditions ?? []) {
    const conditionApplied = await applyCondition(actor, condition);
    applied &&= conditionApplied;
    notes.push(conditionApplied ? `condition:${condition.slug}` : `condition-manual:${condition.slug}`);
  }
  if ((mutation.effects?.length ?? 0) > 0) {
    try {
      const effectSlugs = new Set(mutation.effects!.map(effect => effect.slug));
      const existing = Array.from(actor.items ?? []).filter(item => {
        const flags = record((item as Item & { flags?: unknown }).flags);
        const moduleFlags = record(flags[ETHERNUM.MODULE_NAME]);
        return effectSlugs.has(String(moduleFlags.uniqueEffect ?? ""));
      });
      await Promise.all(existing.map(item => item.delete()));
      await (actor as Actor & {
        createEmbeddedDocuments: (
          embeddedName: "Item",
          data: Record<string, unknown>[],
          operation?: Record<string, unknown>,
        ) => Promise<Item[]>;
      }).createEmbeddedDocuments(
        "Item",
        mutation.effects!.map(effectData),
        { render: false },
      );
      notes.push(...mutation.effects!.map(effect => `effect:${effect.slug}`));
    } catch (error) {
      applied = false;
      notes.push(...mutation.effects!.map(effect => `effect-manual:${effect.slug}`));
      console.warn("Ethernum | PF2e effects could not be created", error);
    }
  }
  return { actorUuid: mutation.actorUuid, applied, notes };
}

async function requesterOwnsSource(request: MutationRequest): Promise<boolean> {
  const requester = game.users?.get(request.requesterId);
  if (!requester) return false;
  if (requester.isGM) return true;
  const source = await resolveActor(request.sourceActorUuid);
  return Boolean(source?.testUserPermission(requester as User, "OWNER"));
}

function sourceUsesPipping(actor: Actor): boolean {
  const unique = record(actor.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics"));
  return unique.activeProfile === "pipping-night";
}

function actorLevel(actor: Actor): number {
  const system = record(actor.system);
  const details = record(system.details);
  const level = Number(record(details.level).value ?? record(system.level).value ?? 1);
  return Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
}

function validatePippingMutationRequest(
  request: MutationRequest,
  source: Actor,
): void {
  const action = getPippingAction(request.actionId);
  if (!action || !sourceUsesPipping(source)) {
    throw new Error("The requested Pipping action is not valid for this actor.");
  }
  const unique = record(source.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics"));
  const profiles = record(unique.profiles);
  const state = normalizePippingState(profiles["pipping-night"]);
  const level = actorLevel(source);
  const tier = Math.max(state.tier, pippingTierForLevel(level)) as PippingTier;
  const availability = getPippingActionAvailability(action, state, level, tier);
  if (
    !availability.usable
    || state.pendingAction?.actionId !== action.id
    || state.pendingAction.pulseCost !== action.pulseCost
  ) {
    throw new Error("The requested Pipping action is not reserved or available.");
  }
  const singleTargetActions = new Set([
    "abyss-voice",
    "black-order-mantle",
    "broken-meter",
    "dark-whisper",
    "night-refuses-end",
    "restoring-pulse",
    "ruin-note",
    "shadow-resonance",
    "void-touch",
  ]);
  const targetLimit = singleTargetActions.has(action.id)
    ? 1
    : action.id === "requiem-persist"
      ? 3
      : 30;
  if (request.mutations.length > targetLimit) {
    throw new Error("The Pipping mutation request contains too many targets.");
  }
  const allowedConditions = new Set([
    "doomed",
    "enfeebled",
    "frightened",
    "off-guard",
    "persistent-damage",
    "quickened",
    "sickened",
    "slowed",
    "stupefied",
  ]);
  const allowedRuleKeys = new Set(["FlatModifier", "Resistance", "TempHP"]);
  const damageActions = new Set([
    "dead-sun-epitaph",
    "ending-chorus",
    "night-emanation",
    "ruin-note",
    "void-touch",
  ]);
  const healingActions = new Set([
    "gentle-night-liturgy",
    "night-refuses-end",
    "requiem-persist",
    "restoring-pulse",
  ]);
  const allowedConditionsByAction: Record<string, Set<string>> = {
    "abyss-voice": new Set(),
    "black-order-mantle": new Set(),
    "broken-meter": new Set(["off-guard"]),
    "dead-sun-epitaph": new Set(["enfeebled", "persistent-damage"]),
    "ending-chorus": new Set(["frightened", "stupefied"]),
    "forbidden-performance": new Set(["off-guard", "quickened", "slowed"]),
    "gentle-night-liturgy": new Set(["frightened", "sickened", "stupefied"]),
    "night-emanation": new Set(["enfeebled"]),
    "night-refuses-end": new Set(["doomed"]),
    "ruin-note": new Set(["frightened"]),
    "shadow-king": new Set(["frightened", "off-guard"]),
    "shadow-resonance": new Set(["frightened"]),
    "void-touch": new Set(["enfeebled", "persistent-damage"]),
  };
  const allowedEffectsByAction: Record<string, Set<string>> = {
    "abyss-voice": new Set(["ethernum-pipping-abyss-voice"]),
    "beyond-form": new Set(["ethernum-pipping-beyond-form"]),
    "black-order-mantle": new Set(["ethernum-pipping-black-order-mantle"]),
    "dark-whisper": new Set(["ethernum-pipping-dark-whisper"]),
    "requiem-persist": new Set(["ethernum-pipping-requiem"]),
  };
  for (const mutation of request.mutations) {
    if (!mutation.actorUuid) throw new Error("A Pipping mutation has no target actor.");
    const hpDelta = Number(mutation.hpDelta ?? 0);
    const damageTotal = Number(mutation.damage?.total ?? 0);
    const healingTotal = Number(mutation.healing?.total ?? 0);
    if (!Number.isFinite(hpDelta) || Math.abs(hpDelta) > 500) {
      throw new Error("A Pipping HP mutation is outside the allowed range.");
    }
    if (
      !Number.isFinite(damageTotal)
      || !Number.isFinite(healingTotal)
      || damageTotal < 0
      || healingTotal < 0
      || damageTotal > 500
      || healingTotal > 500
    ) {
      throw new Error("A Pipping typed HP mutation is outside the allowed range.");
    }
    if (
      (damageActions.has(action.id) && hpDelta > 0)
      || (healingActions.has(action.id) && hpDelta < 0)
      || (!damageActions.has(action.id) && !healingActions.has(action.id) && hpDelta !== 0)
      || (damageTotal > 0 && !damageActions.has(action.id))
      || (healingTotal > 0 && !healingActions.has(action.id))
    ) {
      throw new Error("A Pipping HP mutation does not match the requested action.");
    }
    for (const condition of mutation.conditions ?? []) {
      if (
        !allowedConditions.has(condition.slug)
        || !allowedConditionsByAction[action.id]?.has(condition.slug)
        || Math.abs(Number(condition.value ?? 1)) > 4
      ) {
        throw new Error("A Pipping condition mutation is not allowed.");
      }
    }
    for (const effect of mutation.effects ?? []) {
      if (
        !effect.slug.startsWith("ethernum-pipping-")
        || !allowedEffectsByAction[action.id]?.has(effect.slug)
      ) {
        throw new Error("A Pipping effect mutation has an invalid slug.");
      }
      for (const rule of effect.rules ?? []) {
        if (!allowedRuleKeys.has(String(rule.key ?? ""))) {
          throw new Error("A Pipping effect contains an unsupported PF2e rule.");
        }
        if ("value" in rule && Math.abs(Number(rule.value)) > 50) {
          throw new Error("A Pipping effect rule is outside the allowed range.");
        }
      }
    }
  }
}

async function handleMutationRequest(request: MutationRequest): Promise<void> {
  if (!AutomationAuthority.isPrimaryGM()) return;
  let response: MutationResponse;
  try {
    if (!await requesterOwnsSource(request)) {
      throw new Error("Requester does not own the Pipping source actor.");
    }
    const source = await resolveActor(request.sourceActorUuid);
    if (!source) throw new Error("Pipping source actor was not found.");
    validatePippingMutationRequest(request, source);
    const results: PF2eMutationResult[] = [];
    for (const mutation of request.mutations.slice(0, 50)) {
      results.push(await applyMutationLocally(mutation));
    }
    response = {
      type: "pf2e-mutation-response",
      requestId: request.requestId,
      requesterId: request.requesterId,
      results,
    };
  } catch (error) {
    response = {
      type: "pf2e-mutation-response",
      requestId: request.requestId,
      requesterId: request.requesterId,
      results: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
  (game.socket as unknown as {
    emit: (channel: string, payload: AdapterSocketMessage) => void;
  } | undefined)?.emit(SOCKET_CHANNEL, response);
}

function handleMutationResponse(response: MutationResponse): void {
  if (response.requesterId !== game.user?.id) return;
  const pending = pendingRequests.get(response.requestId);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingRequests.delete(response.requestId);
  if (response.error) pending.reject(new Error(response.error));
  else pending.resolve(response.results);
}

export function initializePF2eAdapterSocket(): void {
  if (socketInitialized) return;
  const socket = game.socket as unknown as {
    on?: (channel: string, callback: (message: AdapterSocketMessage) => void) => void;
  } | undefined;
  if (!socket?.on) return;
  socketInitialized = true;
  socket.on(SOCKET_CHANNEL, message => {
    if (message?.type === "pf2e-mutation-request") {
      void handleMutationRequest(message);
    } else if (message?.type === "pf2e-mutation-response") {
      handleMutationResponse(message);
    }
  });
}

export async function applyPF2eMutations(
  sourceActor: Actor,
  mutations: PF2eActorMutation[],
  actionId: string,
): Promise<PF2eMutationResult[]> {
  if (mutations.length === 0) return [];
  if (AutomationAuthority.isPrimaryGM() || !AutomationAuthority.getPrimaryGM()) {
    const results: PF2eMutationResult[] = [];
    for (const mutation of mutations) results.push(await applyMutationLocally(mutation));
    return results;
  }

  initializePF2eAdapterSocket();
  const socket = game.socket as unknown as {
    emit?: (channel: string, payload: AdapterSocketMessage) => void;
  } | undefined;
  const requesterId = game.user?.id;
  if (!socket?.emit || !requesterId) {
    throw new Error("No active authority socket is available.");
  }

  const requestId = foundry.utils.randomID();
  const request: MutationRequest = {
    type: "pf2e-mutation-request",
    requestId,
    requesterId,
    sourceActorUuid: sourceActor.uuid,
    actionId,
    mutations,
  };
  const response = new Promise<PF2eMutationResult[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error("The primary GM did not answer the PF2e mutation request."));
    }, REQUEST_TIMEOUT_MS);
    pendingRequests.set(requestId, { resolve, reject, timeout });
  });
  socket.emit(SOCKET_CHANNEL, request);
  return response;
}
