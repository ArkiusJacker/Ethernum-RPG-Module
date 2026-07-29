import { ETHERNUM } from "../config.js";
import { AutomationAuthority } from "../core/AutomationAuthority.js";

const MAX_FIDES_MARKERS = 3;
const MAX_FIDES_CHARGES = 3;

type CombatOutcome = "criticalFailure" | "failure" | "success" | "criticalSuccess";
export type CombatVisualEventType =
  | "fides-mark"
  | "fides-ready"
  | "fides-consumed"
  | "fulgor-start"
  | "fulgor-continue"
  | "fulgor-end";

export interface CombatVisualEvent {
  id: string;
  type: CombatVisualEventType;
  at: number;
  intensity: number;
  reason: string;
}

export interface CombatMomentumState {
  version: 1;
  combatId: string;
  fides: {
    markers: number;
    charges: number;
    armed: boolean;
  };
  fulgor: {
    active: boolean;
    chainCount: number;
    maxChain: number;
    targetActorRef: string;
    targetTokenRef: string;
    targetName: string;
    mapIncreases: number;
    turnKey: string;
  };
  stats: {
    attacks: number;
    failures: number;
    criticalFailures: number;
    successes: number;
    criticalSuccesses: number;
    natural1s: number;
    natural20s: number;
    fidesUses: number;
    fidesConversions: number;
    fulgorTriggers: number;
    fulgorExtensions: number;
    longestFulgor: number;
  };
  lastResult: {
    outcome: CombatOutcome | "";
    natural: number;
    label: string;
  };
  visualEvent: CombatVisualEvent | null;
}

interface TargetChoice {
  id: string;
  name: string;
  actor: Actor;
  actorRef: string;
  tokenRef: string;
  token: {
    id?: string;
    name?: string;
    actor?: Actor;
    document?: unknown;
  };
}

interface PF2EStrikeAction {
  type?: string;
  label?: string;
  slug?: string;
  item?: Item;
  variants?: Array<{
    label?: string;
    roll?: (params?: Record<string, unknown>) => Promise<Roll | null>;
  }>;
  damage?: (params?: Record<string, unknown>) => Promise<unknown>;
  critical?: (params?: Record<string, unknown>) => Promise<unknown>;
  altUsages?: PF2EStrikeAction[];
}

interface StrikeConfiguration {
  mode: "automatic" | "manual";
  target?: TargetChoice;
  strike?: PF2EStrikeAction;
}

interface AttackTarget {
  actorRef: string;
  tokenRef: string;
  name: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function escapeHTML(value: unknown): string {
  const text = String(value ?? "");
  const escape = (foundry.utils as { escapeHTML?: (input: string) => string }).escapeHTML;
  if (escape) return escape(text);
  return text.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character] ?? character));
}

function actorRef(actor: Actor): string {
  return String((actor as Actor & { uuid?: string }).uuid ?? actor.id ?? "");
}

function tokenRef(token: { id?: string; document?: unknown }): string {
  const document = token.document as { uuid?: string; id?: string } | undefined;
  return String(document?.uuid ?? document?.id ?? token.id ?? "");
}

function createEmptyStats(): CombatMomentumState["stats"] {
  return {
    attacks: 0,
    failures: 0,
    criticalFailures: 0,
    successes: 0,
    criticalSuccesses: 0,
    natural1s: 0,
    natural20s: 0,
    fidesUses: 0,
    fidesConversions: 0,
    fulgorTriggers: 0,
    fulgorExtensions: 0,
    longestFulgor: 0,
  };
}

function createEmptyFulgor(): CombatMomentumState["fulgor"] {
  return {
    active: false,
    chainCount: 0,
    maxChain: 0,
    targetActorRef: "",
    targetTokenRef: "",
    targetName: "",
    mapIncreases: 0,
    turnKey: "",
  };
}

export function createDefaultCombatMomentumState(charges = MAX_FIDES_CHARGES): CombatMomentumState {
  return {
    version: 1,
    combatId: "",
    fides: {
      markers: 0,
      charges: clamp(charges, 0, MAX_FIDES_CHARGES),
      armed: false,
    },
    fulgor: createEmptyFulgor(),
    stats: createEmptyStats(),
    lastResult: {
      outcome: "",
      natural: 0,
      label: "",
    },
    visualEvent: null,
  };
}

export function normalizeCombatMomentumState(value: unknown): CombatMomentumState {
  const raw = asRecord(value);
  const rawFides = asRecord(raw.fides);
  const rawFulgor = asRecord(raw.fulgor);
  const rawStats = asRecord(raw.stats);
  const rawLastResult = asRecord(raw.lastResult);
  const rawVisualEvent = asRecord(raw.visualEvent);
  const markers = clamp(Number(rawFides.markers), 0, MAX_FIDES_MARKERS);
  const charges = clamp(
    rawFides.charges === undefined ? MAX_FIDES_CHARGES : Number(rawFides.charges),
    0,
    MAX_FIDES_CHARGES,
  );
  const outcome = String(rawLastResult.outcome ?? "");
  const validOutcome = ["criticalFailure", "failure", "success", "criticalSuccess"].includes(outcome)
    ? outcome as CombatOutcome
    : "";

  return {
    version: 1,
    combatId: String(raw.combatId ?? ""),
    fides: {
      markers,
      charges,
      armed: Boolean(rawFides.armed) && markers >= MAX_FIDES_MARKERS && charges > 0,
    },
    fulgor: {
      active: Boolean(rawFulgor.active),
      chainCount: clamp(Number(rawFulgor.chainCount), 0, 10),
      maxChain: clamp(Number(rawFulgor.maxChain), 0, 10),
      targetActorRef: String(rawFulgor.targetActorRef ?? ""),
      targetTokenRef: String(rawFulgor.targetTokenRef ?? ""),
      targetName: String(rawFulgor.targetName ?? ""),
      mapIncreases: clamp(Number(rawFulgor.mapIncreases), 0, 2),
      turnKey: String(rawFulgor.turnKey ?? ""),
    },
    stats: {
      attacks: Math.max(0, clamp(Number(rawStats.attacks), 0, Number.MAX_SAFE_INTEGER)),
      failures: Math.max(0, clamp(Number(rawStats.failures), 0, Number.MAX_SAFE_INTEGER)),
      criticalFailures: Math.max(0, clamp(Number(rawStats.criticalFailures), 0, Number.MAX_SAFE_INTEGER)),
      successes: Math.max(0, clamp(Number(rawStats.successes), 0, Number.MAX_SAFE_INTEGER)),
      criticalSuccesses: Math.max(0, clamp(Number(rawStats.criticalSuccesses), 0, Number.MAX_SAFE_INTEGER)),
      natural1s: Math.max(0, clamp(Number(rawStats.natural1s), 0, Number.MAX_SAFE_INTEGER)),
      natural20s: Math.max(0, clamp(Number(rawStats.natural20s), 0, Number.MAX_SAFE_INTEGER)),
      fidesUses: Math.max(0, clamp(Number(rawStats.fidesUses), 0, Number.MAX_SAFE_INTEGER)),
      fidesConversions: Math.max(0, clamp(Number(rawStats.fidesConversions), 0, Number.MAX_SAFE_INTEGER)),
      fulgorTriggers: Math.max(0, clamp(Number(rawStats.fulgorTriggers), 0, Number.MAX_SAFE_INTEGER)),
      fulgorExtensions: Math.max(0, clamp(Number(rawStats.fulgorExtensions), 0, Number.MAX_SAFE_INTEGER)),
      longestFulgor: Math.max(0, clamp(Number(rawStats.longestFulgor), 0, Number.MAX_SAFE_INTEGER)),
    },
    lastResult: {
      outcome: validOutcome,
      natural: clamp(Number(rawLastResult.natural), 0, 20),
      label: String(rawLastResult.label ?? "").slice(0, 120),
    },
    visualEvent: typeof rawVisualEvent.id === "string" && typeof rawVisualEvent.type === "string"
      ? {
        id: rawVisualEvent.id,
        type: rawVisualEvent.type as CombatVisualEventType,
        at: Number(rawVisualEvent.at ?? 0) || 0,
        intensity: clamp(Number(rawVisualEvent.intensity ?? 1), 1, 10),
        reason: String(rawVisualEvent.reason ?? "").slice(0, 160),
      }
      : null,
  };
}

function createVisualEvent(
  type: CombatVisualEventType,
  intensity = 1,
  reason = "",
): CombatVisualEvent {
  return {
    id: `${type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    type,
    at: Date.now(),
    intensity,
    reason,
  };
}

export interface FidesAttackResolution {
  fides: CombatMomentumState["fides"];
  applied: boolean;
  converted: boolean;
  visualEvent: CombatVisualEvent | null;
}

export function resolveFidesAttack(
  fides: CombatMomentumState["fides"],
  degree: number,
  forcedMomentum = false,
): FidesAttackResolution {
  const applied = fides.charges > 0
    && fides.markers >= MAX_FIDES_MARKERS
    && (fides.armed || forcedMomentum);
  if (applied) {
    return {
      fides: {
        markers: 0,
        charges: fides.charges - 1,
        armed: false,
      },
      applied: true,
      converted: degree < 2,
      visualEvent: createVisualEvent("fides-consumed", 3),
    };
  }
  if (degree < 2) {
    const markers = clamp(fides.markers + 1, 0, MAX_FIDES_MARKERS);
    return {
      fides: {
        ...fides,
        markers,
        armed: markers >= MAX_FIDES_MARKERS && fides.charges > 0,
      },
      applied: false,
      converted: false,
      visualEvent: createVisualEvent(
        markers >= MAX_FIDES_MARKERS ? "fides-ready" : "fides-mark",
        markers,
      ),
    };
  }
  return {
    fides: {
      ...fides,
      markers: 0,
      armed: false,
    },
    applied: false,
    converted: false,
    visualEvent: null,
  };
}

export type FulgorEndReason =
  | "turn-changed"
  | "target-changed"
  | "target-defeated"
  | "miss"
  | "natural-below-17"
  | "limit-reached";

export interface FulgorContinuationResolution {
  fulgor: CombatMomentumState["fulgor"];
  extendsChain: boolean;
  chainCount: number;
  reason: FulgorEndReason | "";
}

export function resolveFulgorContinuation(
  fulgor: CombatMomentumState["fulgor"],
  context: {
    sameTurn: boolean;
    sameTarget: boolean;
    targetStanding: boolean;
    effectiveDegree: number;
    natural: number;
  },
): FulgorContinuationResolution {
  const chainCount = fulgor.chainCount + 1;
  const extendsChain = context.sameTurn
    && context.sameTarget
    && context.targetStanding
    && context.effectiveDegree >= 2
    && context.natural >= 17
    && chainCount < fulgor.maxChain;
  const reason = extendsChain
    ? ""
    : !context.sameTurn
      ? "turn-changed"
      : !context.sameTarget
        ? "target-changed"
        : !context.targetStanding
          ? "target-defeated"
          : context.effectiveDegree < 2
            ? "miss"
            : context.natural < 17
              ? "natural-below-17"
              : "limit-reached";
  return {
    fulgor: extendsChain ? { ...fulgor, chainCount } : createEmptyFulgor(),
    extendsChain,
    chainCount,
    reason,
  };
}

export function createFulgorTrigger(
  natural: number,
  maxChain: number,
  target: AttackTarget,
  mapIncreases: number,
  turnKey: string,
): CombatMomentumState["fulgor"] | null {
  if (natural !== 20 || maxChain <= 0) return null;
  return {
    active: true,
    chainCount: 0,
    maxChain,
    targetActorRef: target.actorRef,
    targetTokenRef: target.tokenRef,
    targetName: target.name,
    mapIncreases,
    turnKey,
  };
}

function getControlledActor(): Actor | null {
  return canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
}

function canManageActor(actor: Actor): boolean {
  return Boolean(game.user?.isGM || (actor as Actor & { isOwner?: boolean }).isOwner);
}

function resolveMacroActor(actor?: Actor | null): Actor | null {
  const target = actor ?? getControlledActor();
  if (!target || (target.type as string) !== "character") {
    ui.notifications?.warn("Selecione um personagem antes de usar esta mecânica.");
    return null;
  }
  if (!canManageActor(target)) {
    ui.notifications?.warn("Você não possui permissão para alterar este personagem.");
    return null;
  }
  return target;
}

function getActiveCombat(): (Combat & { started?: boolean; turn?: number | null }) | null {
  const combat = game.combat as (Combat & { started?: boolean; turn?: number | null }) | null;
  if (!combat) return null;
  if (combat.started === false) return null;
  return combat;
}

function getCombatForMessage(message: ChatMessage, actor: Actor): (Combat & { started?: boolean; turn?: number | null }) | null {
  const speaker = (message as ChatMessage & {
    speaker?: { actor?: string; token?: string; scene?: string };
  }).speaker ?? {};
  const combats = Array.from(
    (game as unknown as { combats?: Collection<Combat> }).combats ?? [],
  ) as Array<Combat & {
    started?: boolean;
    scene?: { id?: string };
    combatants?: Collection<Combatant>;
  }>;
  const candidates = combats.filter(combat => combat.started !== false).map(combat => {
    const combatants = Array.from(combat.combatants ?? []) as Array<Combatant & {
      actorId?: string;
      tokenId?: string;
      token?: { id?: string };
    }>;
    const exactToken = Boolean(speaker.token && combatants.some(combatant => (
      combatant.tokenId === speaker.token || combatant.token?.id === speaker.token
    )));
    const sameActor = combatants.some(combatant => (
      combatant.actorId === actor.id || combatant.actor?.id === actor.id
    ));
    const sameScene = !speaker.scene || combat.scene?.id === speaker.scene;
    return { combat, exactToken, sameActor, sameScene };
  }).filter(candidate => candidate.exactToken || candidate.sameActor);
  const exact = candidates.find(candidate => candidate.exactToken && candidate.sameScene)
    ?? candidates.find(candidate => candidate.exactToken)
    ?? candidates.find(candidate => candidate.sameActor && candidate.sameScene)
    ?? candidates[0];
  return exact?.combat ?? getActiveCombat();
}

function getCombatTurnKey(combat: Combat | null = getActiveCombat()): string {
  if (!combat?.id) return "";
  const typed = combat as Combat & { turn?: number | null };
  return `${combat.id}:${combat.round ?? 0}:${typed.turn ?? -1}`;
}

function getChatContext(message: ChatMessage): Record<string, unknown> {
  const flags = asRecord((message as ChatMessage & { flags?: unknown }).flags);
  const pf2e = asRecord(flags.pf2e);
  return asRecord(pf2e.context ?? pf2e);
}

function getPF2EFlags(message: ChatMessage): Record<string, unknown> {
  return asRecord(asRecord((message as ChatMessage & { flags?: unknown }).flags).pf2e);
}

function isGeneratedMessage(message: ChatMessage): boolean {
  const flags = asRecord((message as ChatMessage & { flags?: unknown }).flags);
  return Boolean(asRecord(flags[ETHERNUM.MODULE_NAME]).combatMomentum);
}

function isAttackRollMessage(message: ChatMessage): boolean {
  const context = getChatContext(message);
  const type = String(context.type ?? context.rollType ?? "");
  if (type.includes("damage")) return false;
  if (type === "attack-roll" || type === "strike-attack-roll" || type === "spell-attack-roll") return true;
  if (type && type !== "check") return false;
  const domains = Array.isArray(context.domains) ? context.domains.map(String) : [];
  return domains.some(domain => domain.includes("attack-roll"));
}

function getActorFromMessage(message: ChatMessage): Actor | null {
  const directActor = (message as unknown as { actor?: Actor | null }).actor;
  if (directActor) return directActor;
  const speaker = (message as ChatMessage & {
    speaker?: { actor?: string; token?: string; scene?: string };
  }).speaker;
  if (speaker?.token) {
    const canvasToken = (canvas?.tokens as unknown as {
      get?: (id: string) => { actor?: Actor | null } | undefined;
    })?.get?.(speaker.token);
    if (canvasToken?.actor) return canvasToken.actor;
    const scene = speaker.scene ? game.scenes?.get(speaker.scene) : null;
    const tokenDocument = (scene as unknown as {
      tokens?: { get?: (id: string) => { actor?: Actor | null } | undefined };
    } | null)?.tokens?.get?.(speaker.token);
    if (tokenDocument?.actor) return tokenDocument.actor;
  }
  return speaker?.actor ? game.actors?.get(speaker.actor) as Actor | null ?? null : null;
}

function getMessageOptions(message: ChatMessage): string[] {
  const context = getChatContext(message);
  return Array.isArray(context.options) ? context.options.map(String) : [];
}

function parseOutcome(value: unknown): CombatOutcome | null {
  if (typeof value === "number") {
    return (["criticalFailure", "failure", "success", "criticalSuccess"] as const)[clamp(value, 0, 3)];
  }
  const normalized = String(value ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (normalized === "criticalfailure" || normalized === "falhacritica") return "criticalFailure";
  if (normalized === "failure" || normalized === "falha") return "failure";
  if (normalized === "success" || normalized === "sucesso") return "success";
  if (normalized === "criticalsuccess" || normalized === "sucessocritico") return "criticalSuccess";
  return null;
}

function getMessageOutcome(message: ChatMessage): CombatOutcome | null {
  const context = getChatContext(message);
  const flags = getPF2EFlags(message);
  const roll = ((message as ChatMessage & { rolls?: Roll[] }).rolls ?? [])[0] as
    | (Roll & { options?: unknown; degreeOfSuccess?: unknown })
    | undefined;
  const candidates = [
    context.outcome,
    context.degreeOfSuccess,
    asRecord(context.check).degreeOfSuccess,
    asRecord(context.roll).degreeOfSuccess,
    flags.outcome,
    flags.degreeOfSuccess,
    asRecord(flags.check).degreeOfSuccess,
    roll?.degreeOfSuccess,
    asRecord(roll?.options).degreeOfSuccess,
  ];
  for (const candidate of candidates) {
    const outcome = parseOutcome(candidate);
    if (outcome) return outcome;
  }
  return null;
}

function outcomeDegree(outcome: CombatOutcome): number {
  return ["criticalFailure", "failure", "success", "criticalSuccess"].indexOf(outcome);
}

function outcomeLabel(outcome: CombatOutcome): string {
  return {
    criticalFailure: "Falha crítica",
    failure: "Falha",
    success: "Sucesso",
    criticalSuccess: "Sucesso crítico",
  }[outcome];
}

function getNaturalD20(roll: Roll | undefined): number {
  const dice = (roll as Roll & {
    dice?: Array<{ faces?: number; total?: number; results?: Array<{ active?: boolean; result?: number }> }>;
  } | undefined)?.dice ?? [];
  const die = dice.find(candidate => candidate.faces === 20);
  if (!die) return 0;
  const activeResult = die?.results?.find(result => result.active !== false)?.result;
  const total = Number(activeResult ?? die?.total);
  return Number.isFinite(total) ? clamp(total, 0, 20) : 0;
}

function getMessageNaturalD20(message: ChatMessage): number {
  const rolls = (message as ChatMessage & { rolls?: Roll[] }).rolls ?? [];
  for (const roll of rolls) {
    const natural = getNaturalD20(roll);
    if (natural > 0) return natural;
  }
  return 0;
}

function readRef(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return String(record.uuid ?? record.id ?? "");
}

function getAttackTarget(message: ChatMessage): AttackTarget {
  const context = getChatContext(message);
  const flags = getPF2EFlags(message);
  const target = {
    ...asRecord(flags.target),
    ...asRecord(context.target),
  };
  return {
    actorRef: readRef(target.actor),
    tokenRef: readRef(target.token),
    name: String(target.name ?? asRecord(target.actor).name ?? asRecord(target.token).name ?? ""),
  };
}

function refsMatch(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  const leftId = left.split(".").filter(Boolean).at(-1) ?? left;
  const rightId = right.split(".").filter(Boolean).at(-1) ?? right;
  return leftId.length >= 8 && leftId === rightId;
}

function targetsMatch(expected: CombatMomentumState["fulgor"], actual: AttackTarget): boolean {
  if (!expected.targetActorRef && !expected.targetTokenRef) return true;
  return refsMatch(expected.targetActorRef, actual.actorRef)
    || refsMatch(expected.targetTokenRef, actual.tokenRef);
}

function getMapIncreases(message: ChatMessage): number {
  const context = getChatContext(message);
  const direct = Number(context.mapIncreases);
  if (Number.isFinite(direct)) return clamp(direct, 0, 2);
  const mapOption = getMessageOptions(message).find(option => option.startsWith("map:increases:"));
  return clamp(Number(mapOption?.split(":").pop()), 0, 2);
}

function getKeyAbilityModifier(actor: Actor): number {
  const system = asRecord(actor.system);
  const details = asRecord(system.details);
  const keyAbility = String(asRecord(details.keyability).value ?? "str");
  const ability = asRecord(asRecord(system.abilities)[keyAbility]);
  return clamp(Number(ability.mod), 0, 10);
}

function getTargetActor(target: AttackTarget): Actor | null {
  const fromUuidSync = (globalThis as {
    fromUuidSync?: (uuid: string) => unknown;
  }).fromUuidSync;
  if (target.actorRef && fromUuidSync) {
    const document = fromUuidSync(target.actorRef) as Actor | { actor?: Actor | null } | null;
    if (document instanceof Actor) return document;
    if (document?.actor) return document.actor;
  }
  const actors = Array.from(game.actors ?? []);
  return actors.find(actor => refsMatch(actorRef(actor), target.actorRef) || refsMatch(String(actor.id ?? ""), target.actorRef)) ?? null;
}

function isDefeatedTarget(target: AttackTarget): boolean {
  const actor = getTargetActor(target);
  if (!actor) return false;
  const hp = asRecord(asRecord(actor.system).attributes).hp;
  return Number(asRecord(hp).value) <= 0;
}

function isAutomationAuthority(message?: ChatMessage, actor?: Actor): boolean {
  if (AutomationAuthority.getPrimaryGM()) return AutomationAuthority.isPrimaryGM();
  if (!message || !actor || !AutomationAuthority.canMutate(actor, true)) return false;
  const messageUsers = message as unknown as {
    user?: { id?: string };
    author?: { id?: string };
  };
  const author = messageUsers.user ?? messageUsers.author;
  return author?.id === game.user?.id && Boolean((actor as Actor & { isOwner?: boolean }).isOwner);
}

function markMessageProcessed(message: ChatMessage): boolean {
  return AutomationAuthority.claimChatMessage(message, "combat-momentum", 500);
}

function getPF2EStrikes(actor: Actor): PF2EStrikeAction[] {
  const actions = (actor.system as unknown as { actions?: PF2EStrikeAction[] }).actions ?? [];
  const strikes = actions.flatMap(action => [action, ...(action.altUsages ?? [])]).filter(action => {
    return (!action.type || action.type === "strike") && Array.isArray(action.variants) && action.variants.length > 0;
  });
  const seen = new Set<string>();
  return strikes.filter((strike, index) => {
    const key = `${strike.item?.id ?? "strike"}:${strike.slug ?? strike.label ?? index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getStrikeLabel(strike: PF2EStrikeAction, index: number): string {
  return String(strike.item?.name ?? strike.label ?? strike.slug ?? `Strike ${index + 1}`);
}

function getTargetChoices(): TargetChoice[] {
  return (Array.from(game.user?.targets ?? []) as Array<{
    id?: string;
    name?: string;
    actor?: Actor;
    document?: unknown;
  }>).filter(target => target.actor).map((target, index) => ({
    id: String(target.id ?? target.actor?.id ?? index),
    name: String(target.name ?? target.actor?.name ?? `Alvo ${index + 1}`),
    actor: target.actor as Actor,
    actorRef: actorRef(target.actor as Actor),
    tokenRef: tokenRef(target),
    token: target,
  }));
}

function getPF2ESkipDialogEvent(type: "check" | "damage"): MouseEvent {
  const settings = asRecord((game.user as unknown as { settings?: unknown })?.settings);
  const showDialogs = Boolean(settings[type === "check" ? "showCheckDialogs" : "showDamageDialogs"]);
  return new MouseEvent("click", { shiftKey: showDialogs });
}

function getRollDegree(roll: Roll | null): number {
  const typedRoll = roll as unknown as { options?: unknown; degreeOfSuccess?: unknown } | null;
  const value = Number(typedRoll?.degreeOfSuccess ?? asRecord(typedRoll?.options).degreeOfSuccess);
  return Number.isFinite(value) ? clamp(value, 0, 3) : -1;
}

async function chooseStrikeConfiguration(
  actor: Actor,
  title: string,
  expectedFulgor?: CombatMomentumState["fulgor"],
): Promise<StrikeConfiguration | null> {
  const allTargets = getTargetChoices();
  const targets = expectedFulgor && (expectedFulgor.targetActorRef || expectedFulgor.targetTokenRef)
    ? allTargets.filter(target => (
      refsMatch(expectedFulgor.targetActorRef, target.actorRef)
      || refsMatch(expectedFulgor.targetTokenRef, target.tokenRef)
    ))
    : allTargets;
  const strikes = getPF2EStrikes(actor);

  return new Promise(resolve => {
    let resolved = false;
    const automaticAvailable = targets.length > 0 && strikes.length > 0;
    const targetHint = expectedFulgor?.targetName
      ? `<p class="hint">O alvo deve continuar sendo <strong>${escapeHTML(expectedFulgor.targetName)}</strong>.</p>`
      : "";
    const content = `
      <form class="ethernum-combat-momentum-choice">
        ${targetHint}
        ${automaticAvailable ? `
          <label><span>Alvo</span><select name="target">
            ${targets.map(target => `<option value="${escapeHTML(target.id)}">${escapeHTML(target.name)}</option>`).join("")}
          </select></label>
          <label><span>Strike</span><select name="strike">
            ${strikes.map((strike, index) => `<option value="${index}">${escapeHTML(getStrikeLabel(strike, index))}</option>`).join("")}
          </select></label>
        ` : `
          <p>Não há um Strike e um alvo compatíveis disponíveis. Selecione o alvo correto no canvas ou use o ataque manualmente pela ficha.</p>
        `}
        <p class="hint">Ataques de magia podem ser feitos manualmente depois de armar a mecânica.</p>
      </form>`;
    const buttons: Record<string, {
      label: string;
      callback: (html: JQuery) => void;
    }> = {};
    if (automaticAvailable) {
      buttons.automatic = {
        label: "Executar Strike",
        callback: (html: JQuery) => {
          resolved = true;
          const selectedTarget = String(html.find('[name="target"]').val() ?? "");
          const strikeIndex = clamp(Number(html.find('[name="strike"]').val()), 0, strikes.length - 1);
          resolve({
            mode: "automatic",
            target: targets.find(target => target.id === selectedTarget) ?? targets[0],
            strike: strikes[strikeIndex],
          });
        },
      };
    }
    buttons.manual = {
      label: "Usar ataque manual",
      callback: () => {
        resolved = true;
        resolve({ mode: "manual" });
      },
    };
    buttons.cancel = {
      label: "Cancelar",
      callback: () => {
        resolved = true;
        resolve(null);
      },
    };
    new Dialog({
      title,
      content,
      buttons,
      close: () => {
        if (!resolved) resolve(null);
      },
    }).render(true);
  });
}

async function createMechanicCard(actor: Actor, content: string): Promise<void> {
  const data = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="ethernum-combat-momentum-chat">${content}</div>`,
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        combatMomentum: true,
      },
    },
  };
  await (ChatMessage as unknown as {
    create: (source: Record<string, unknown>) => Promise<unknown>;
  }).create(data);
}

function isHpChange(changed: Record<string, unknown>): boolean {
  const system = asRecord(changed.system);
  const attributes = asRecord(system.attributes);
  const hp = asRecord(attributes.hp);
  return "value" in hp;
}

function outcomeFromDegree(degree: number): CombatOutcome {
  return (["criticalFailure", "failure", "success", "criticalSuccess"] as const)[clamp(degree, 0, 3)];
}

export class CombatMomentumSystem {
  private static actorQueues = new Map<string, Promise<unknown>>();

  static getState(actor: Actor): CombatMomentumState {
    return normalizeCombatMomentumState(actor.getFlag(ETHERNUM.MODULE_NAME, "combatMomentum"));
  }

  static async setState(actor: Actor, state: CombatMomentumState): Promise<CombatMomentumState> {
    const normalized = normalizeCombatMomentumState(state);
    await (actor as Actor & {
      update: (data: Record<string, unknown>, operation?: Record<string, unknown>) => Promise<Actor>;
    }).update({
      [`flags.${ETHERNUM.MODULE_NAME}.combatMomentum`]: normalized,
    }, { render: false });
    return normalized;
  }

  static async initializeActor(actor: Actor): Promise<void> {
    if ((actor.type as string) !== "character") return;
    if (actor.getFlag(ETHERNUM.MODULE_NAME, "combatMomentum") !== undefined) return;
    await this.setState(actor, createDefaultCombatMomentumState());
  }

  private static enqueue<T>(actor: Actor, operation: () => Promise<T>): Promise<T> {
    const key = String(actor.id ?? actor.name ?? "actor");
    const previous = this.actorQueues.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    this.actorQueues.set(key, next);
    void next.finally(() => {
      if (this.actorQueues.get(key) === next) this.actorQueues.delete(key);
    });
    return next as Promise<T>;
  }

  private static prepareForCombat(state: CombatMomentumState, combatId: string): CombatMomentumState {
    if (state.combatId === combatId) return state;
    return {
      ...createDefaultCombatMomentumState(state.fides.charges),
      combatId,
    };
  }

  private static updateRawStats(
    stats: CombatMomentumState["stats"],
    outcome: CombatOutcome,
    natural: number,
    isAttack: boolean,
  ): CombatMomentumState["stats"] {
    const next = { ...stats, attacks: stats.attacks + (isAttack ? 1 : 0) };
    if (outcome === "criticalFailure") next.criticalFailures += 1;
    if (outcome === "failure") next.failures += 1;
    if (outcome === "success") next.successes += 1;
    if (outcome === "criticalSuccess") next.criticalSuccesses += 1;
    if (natural === 1) next.natural1s += 1;
    if (natural === 20) next.natural20s += 1;
    return next;
  }

  static async handlePF2EChatMessage(message: ChatMessage): Promise<void> {
    if (game.system?.id !== "pf2e" || isGeneratedMessage(message)) return;
    const actor = getActorFromMessage(message);
    if (!actor || (actor.type as string) !== "character") return;
    const outcome = getMessageOutcome(message);
    const natural = getMessageNaturalD20(message);
    if (!outcome || natural < 1) return;
    if (!isAutomationAuthority(message, actor) || !markMessageProcessed(message)) return;
    const context = getChatContext(message);
    if (Boolean(context.isReroll) || getMessageOptions(message).includes("check:reroll")) {
      console.warn(`Ethernum RPG Module | Rerrolagem ${message.id ?? "sem id"} ignorada para evitar dupla contagem.`);
      return;
    }
    const combat = getCombatForMessage(message, actor);
    if (!combat?.id) return;

    await this.enqueue(actor, async () => {
      let state = this.prepareForCombat(this.getState(actor), combat.id as string);
      const rawDegree = outcomeDegree(outcome);
      const isAttack = isAttackRollMessage(message);
      const nextStats = this.updateRawStats(state.stats, outcome, natural, isAttack);
      if (!isAttack) {
        await this.setState(actor, {
          ...state,
          stats: nextStats,
          lastResult: {
            outcome,
            natural,
            label: outcomeLabel(outcome),
          },
        });
        return;
      }
      const target = getAttackTarget(message);
      const options = getMessageOptions(message);
      const forcedMomentum = options.includes("ethernum:momentum-fides");
      const fidesResolution = resolveFidesAttack(state.fides, rawDegree, forcedMomentum);
      const fidesApplied = fidesResolution.applied;
      const effectiveDegree = fidesApplied ? (natural === 20 ? 3 : 2) : rawDegree;
      let fidesCard = "";
      let fulgorCard = "";
      let visualEvent = state.visualEvent;

      if (fidesApplied) {
        nextStats.fidesUses += 1;
        if (fidesResolution.converted) nextStats.fidesConversions += 1;
        state = {
          ...state,
          fides: fidesResolution.fides,
        };
        fidesCard = `
          <section class="fides">
            <h3>Momentum Fides</h3>
            <p>As três marcas foram consumidas. O ataque de <strong>${escapeHTML(actor.name)}</strong> é tratado como
            <strong>${natural === 20 ? "sucesso crítico" : "sucesso"}</strong>, sem MAP, com resultado-base igual à CA.</p>
            <p><strong>Cargas restantes:</strong> ${state.fides.charges}/${MAX_FIDES_CHARGES}</p>
          </section>`;
        visualEvent = fidesResolution.visualEvent;
      } else {
        state = {
          ...state,
          fides: fidesResolution.fides,
        };
        if (fidesResolution.visualEvent) visualEvent = fidesResolution.visualEvent;
      }

      if (state.fulgor.active) {
        const fulgorLimit = state.fulgor.maxChain;
        const sameTurn = !state.fulgor.turnKey || state.fulgor.turnKey === getCombatTurnKey(combat);
        const sameTarget = targetsMatch(state.fulgor, target);
        const targetStanding = !isDefeatedTarget(target);
        const fulgorResolution = resolveFulgorContinuation(state.fulgor, {
          sameTurn,
          sameTarget,
          targetStanding,
          effectiveDegree,
          natural,
        });
        const { chainCount, extendsChain } = fulgorResolution;
        nextStats.longestFulgor = Math.max(nextStats.longestFulgor, chainCount);
        if (extendsChain) nextStats.fulgorExtensions += 1;
        const reason = fulgorResolution.reason === "turn-changed"
          ? "o turno mudou"
          : fulgorResolution.reason === "target-changed"
            ? "o ataque não manteve o mesmo alvo"
            : fulgorResolution.reason === "target-defeated"
              ? "o alvo foi derrotado"
              : fulgorResolution.reason === "miss"
                ? "o ataque não atingiu a CA"
                : fulgorResolution.reason === "natural-below-17"
                  ? `o d20 natural foi ${natural}`
                  : "o limite da habilidade-chave foi alcançado";
        state = {
          ...state,
          fulgor: fulgorResolution.fulgor,
        };
        visualEvent = createVisualEvent(
          extendsChain ? "fulgor-continue" : "fulgor-end",
          Math.max(1, chainCount),
          extendsChain ? "" : reason,
        );
        fulgorCard = `
          <section class="fulgor">
            <h3>Fulgor Negro ${extendsChain ? "continua" : "encerrado"}</h3>
            <p><strong>Ataque ${chainCount}/${Math.max(1, fulgorLimit)}:</strong>
            ${extendsChain ? `acerto com d20 natural ${natural}; outra ação livre foi liberada.` : `${escapeHTML(reason)}.`}</p>
          </section>`;
      } else if (natural === 20) {
        const maxChain = getKeyAbilityModifier(actor);
        const triggeredFulgor = createFulgorTrigger(
          natural,
          maxChain,
          target,
          getMapIncreases(message),
          getCombatTurnKey(combat),
        );
        nextStats.fulgorTriggers += 1;
        state = {
          ...state,
          fulgor: triggeredFulgor ?? createEmptyFulgor(),
        };
        if (triggeredFulgor) visualEvent = createVisualEvent("fulgor-start", 3);
        fulgorCard = `
          <section class="fulgor">
            <h3>Fulgor Negro ativado</h3>
            <p>O 20 natural liberou uma ação livre imediata contra
            <strong>${escapeHTML(target.name || "o mesmo alvo")}</strong>, mantendo o MAP anterior.</p>
            <p><strong>Limite:</strong> ${maxChain} ataque(s), conforme o modificador da habilidade-chave.</p>
          </section>`;
      }

      state = {
        ...state,
        stats: nextStats,
        lastResult: {
          outcome,
          natural,
          label: fidesApplied
            ? `${outcomeLabel(outcome)} convertida em ${natural === 20 ? "sucesso crítico" : "sucesso"}`
            : outcomeLabel(outcome),
        },
        visualEvent,
      };
      await this.setState(actor, state);
      if (fidesCard || fulgorCard) await createMechanicCard(actor, `${fidesCard}${fulgorCard}`);
    });
  }

  static async useMomentumFides(actor?: Actor | null): Promise<void> {
    const target = resolveMacroActor(actor);
    if (!target) return;
    const combat = getActiveCombat();
    if (!combat?.id) {
      ui.notifications?.warn("Momentum Fides só pode ser usado durante um combate ativo.");
      return;
    }
    let state = this.prepareForCombat(this.getState(target), combat.id);
    if (state.fides.charges <= 0) {
      ui.notifications?.warn("Momentum Fides está sem cargas até o próximo descanso longo.");
      return;
    }
    if (state.fides.markers < MAX_FIDES_MARKERS) {
      ui.notifications?.warn(`Momentum Fides exige 3 falhas consecutivas. Marcas atuais: ${state.fides.markers}/3.`);
      return;
    }
    if (!state.fides.armed) {
      state = await this.enqueue(target, async () => {
        const current = this.prepareForCombat(this.getState(target), combat.id as string);
        return this.setState(target, {
          ...current,
          fides: { ...current.fides, armed: true },
        });
      });
    }
    const configuration = await chooseStrikeConfiguration(target, "Momentum Fides");
    if (!configuration || configuration.mode === "manual") {
      if (configuration?.mode === "manual") {
        ui.notifications?.info("Momentum Fides armado. Faça agora o ataque pela ficha; o próximo ataque será resolvido automaticamente.");
      }
      return;
    }
    const variant = configuration.strike?.variants?.[0];
    if (!configuration.target || !configuration.strike || typeof variant?.roll !== "function") return;
    const roll = await variant.roll({
      target: configuration.target.token,
      event: getPF2ESkipDialogEvent("check"),
      options: ["ethernum:momentum-fides", "action:momentum-fides"],
    });
    if (!roll) return;
    const natural = getNaturalD20(roll);
    const damageParams = {
      target: configuration.target.token,
      mapIncreases: 0,
      event: getPF2ESkipDialogEvent("damage"),
      options: ["ethernum:momentum-fides", "action:momentum-fides"],
    };
    if (natural === 20) await configuration.strike.critical?.(damageParams);
    else await configuration.strike.damage?.(damageParams);
  }

  static async useFulgorNegro(actor?: Actor | null): Promise<void> {
    const target = resolveMacroActor(actor);
    if (!target) return;
    const combat = getActiveCombat();
    if (!combat?.id) {
      ui.notifications?.warn("Fulgor Negro só pode ser usado durante um combate ativo.");
      return;
    }
    let state = this.prepareForCombat(this.getState(target), combat.id);
    if (!state.fulgor.active) {
      ui.notifications?.warn("Fulgor Negro ainda não está ativo. Ele é liberado por um 20 natural em um ataque.");
      return;
    }
    if (state.fulgor.turnKey && state.fulgor.turnKey !== getCombatTurnKey(combat)) {
      await this.endFulgor(target, "O turno mudou antes do ataque livre.");
      return;
    }
    const configuration = await chooseStrikeConfiguration(target, "Fulgor Negro", state.fulgor);
    if (!configuration || configuration.mode === "manual") {
      if (configuration?.mode === "manual") {
        ui.notifications?.info("Fulgor Negro aguardando. Faça agora um ataque contra o mesmo alvo pela ficha.");
      }
      return;
    }
    if (!configuration.target || !configuration.strike) return;
    if (!state.fulgor.targetActorRef && !state.fulgor.targetTokenRef) {
      state = await this.enqueue(target, async () => {
        const current = this.getState(target);
        return this.setState(target, {
          ...current,
          fulgor: {
            ...current.fulgor,
            targetActorRef: configuration.target?.actorRef ?? "",
            targetTokenRef: configuration.target?.tokenRef ?? "",
            targetName: configuration.target?.name ?? "",
          },
        });
      });
    }
    const mapIncreases = clamp(state.fulgor.mapIncreases, 0, 2);
    const variant = configuration.strike.variants?.[mapIncreases];
    if (typeof variant?.roll !== "function") {
      ui.notifications?.error("O PF2e não expôs a variante de MAP necessária para este Strike.");
      return;
    }
    const fidesWillApply = state.fides.armed
      && state.fides.markers >= MAX_FIDES_MARKERS
      && state.fides.charges > 0;
    const roll = await variant.roll({
      target: configuration.target.token,
      event: getPF2ESkipDialogEvent("check"),
      options: ["ethernum:fulgor-negro", "action:fulgor-negro"],
    });
    if (!roll) return;
    const degree = getRollDegree(roll);
    const natural = getNaturalD20(roll);
    const hit = degree >= 2 || fidesWillApply;
    if (!hit) return;
    const damageParams = {
      target: configuration.target.token,
      mapIncreases,
      event: getPF2ESkipDialogEvent("damage"),
      options: ["ethernum:fulgor-negro", "action:fulgor-negro"],
    };
    if (degree >= 3 && (!fidesWillApply || natural === 20)) {
      await configuration.strike.critical?.(damageParams);
    } else {
      await configuration.strike.damage?.(damageParams);
    }
  }

  static async adjustFidesMarkers(actor: Actor, amount: number): Promise<CombatMomentumState> {
    if (!game.user?.isGM) return this.getState(actor);
    return this.enqueue(actor, async () => {
      const combatId = getActiveCombat()?.id ?? this.getState(actor).combatId;
      const state = this.prepareForCombat(this.getState(actor), combatId ?? "");
      const markers = clamp(state.fides.markers + amount, 0, MAX_FIDES_MARKERS);
      return this.setState(actor, {
        ...state,
        fides: {
          ...state.fides,
          markers,
          armed: markers >= MAX_FIDES_MARKERS && state.fides.charges > 0,
        },
        visualEvent: amount > 0
          ? createVisualEvent(markers >= MAX_FIDES_MARKERS ? "fides-ready" : "fides-mark", Math.max(1, markers))
          : state.visualEvent,
      });
    });
  }

  static async endFulgor(actor: Actor, reason = ""): Promise<CombatMomentumState> {
    if (!canManageActor(actor)) return this.getState(actor);
    return this.enqueue(actor, async () => {
      const state = this.getState(actor);
      if (!state.fulgor.active) return state;
      const next = await this.setState(actor, {
        ...state,
        fulgor: createEmptyFulgor(),
        visualEvent: createVisualEvent("fulgor-end", 1, reason),
      });
      if (reason) {
        await createMechanicCard(actor, `
          <section class="fulgor">
            <h3>Fulgor Negro encerrado</h3>
            <p>${escapeHTML(reason)}</p>
          </section>`);
      }
      return next;
    });
  }

  static async resetCombat(actor: Actor, combatId = getActiveCombat()?.id ?? ""): Promise<CombatMomentumState> {
    if (!canManageActor(actor)) return this.getState(actor);
    return this.enqueue(actor, async () => {
      const state = this.getState(actor);
      return this.setState(actor, {
        ...createDefaultCombatMomentumState(state.fides.charges),
        combatId,
      });
    });
  }

  static async dailyReset(actor: Actor): Promise<CombatMomentumState> {
    if (!canManageActor(actor)) return this.getState(actor);
    return this.enqueue(actor, async () => {
      return this.setState(actor, {
        ...createDefaultCombatMomentumState(MAX_FIDES_CHARGES),
        combatId: getActiveCombat()?.id ?? "",
      });
    });
  }

  static async handleCombatUpdate(combat: Combat): Promise<void> {
    const turnKey = getCombatTurnKey(combat);
    for (const actor of game.actors ?? []) {
      if ((actor.type as string) !== "character") continue;
      if (!isAutomationAuthority(undefined, actor)) continue;
      const state = this.getState(actor);
      if (!state.fulgor.active || state.combatId !== combat.id) continue;
      if (state.fulgor.turnKey && state.fulgor.turnKey !== turnKey) {
        await this.endFulgor(actor, "A ação livre não foi usada antes da mudança de turno.");
      }
    }
  }

  static async handleCombatDelete(combat: Combat): Promise<void> {
    for (const actor of game.actors ?? []) {
      if ((actor.type as string) !== "character") continue;
      if (!isAutomationAuthority(undefined, actor)) continue;
      const state = this.getState(actor);
      if (state.combatId !== combat.id) continue;
      await this.resetCombat(actor, "");
    }
  }

  static async handleActorUpdate(actor: Actor, changed: Record<string, unknown>): Promise<void> {
    if (!isHpChange(changed)) return;
    const hp = asRecord(asRecord(asRecord(changed.system).attributes).hp);
    if (Number(hp.value) > 0) return;
    const defeatedRef = actorRef(actor);
    for (const owner of game.actors ?? []) {
      if ((owner.type as string) !== "character") continue;
      if (!isAutomationAuthority(undefined, owner)) continue;
      const state = this.getState(owner);
      if (!state.fulgor.active || !refsMatch(state.fulgor.targetActorRef, defeatedRef)) continue;
      await this.endFulgor(owner, `${actor.name ?? "O alvo"} foi derrotado.`);
    }
  }

  static async resetAllCombat(): Promise<void> {
    if (!game.user?.isGM) return;
    for (const actor of game.actors ?? []) {
      if ((actor.type as string) === "character") await this.resetCombat(actor);
    }
  }

  static async resetAllDaily(): Promise<void> {
    if (!game.user?.isGM) return;
    for (const actor of game.actors ?? []) {
      if ((actor.type as string) === "character") await this.dailyReset(actor);
    }
  }
}
