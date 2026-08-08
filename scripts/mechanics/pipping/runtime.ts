import {
  applyPF2eMutations,
  rollSave as rollPF2eSave,
  type PF2eActorMutation,
  type PF2eConditionMutation,
  type PF2eEffectMutation,
} from "../../core/PF2eAdapter.js";
import {
  resolvePippingTargetSpec,
  type PippingActionDefinition,
  type PippingResolvedTargetSpec,
} from "./progression.js";
import {
  createPippingPersistentArea,
  removePippingPersistentAreas,
  spawnPippingShadowManifestations,
  type PippingPersistentAreaReference,
} from "./canvas.js";
import {
  requestPippingAreaPlacement,
  requestPippingShadowPlacement,
  type PippingAreaPlacement,
} from "./placement.js";
import { PippingAnimationService } from "./animations.js";
import {
  resolvePippingAreaCandidates,
  type PippingAreaGeometry,
  type PippingGeometryToken,
  type PippingSceneGeometry,
} from "./geometry.js";
import {
  getPippingAnimationMode,
  getPippingAnimationSpeed,
} from "../../settings.js";
import {
  basicSaveDamage,
  type PippingDegreeOfSuccess,
} from "./rules.js";
import {
  resolvePippingAnimatedShadowPosition,
  type PippingNightState,
  type PippingShadowManifestation,
  type PippingTier,
} from "./state.js";

interface TokenTarget {
  id: string;
  name: string;
  actor: Actor;
  token: Token;
  allied: boolean;
  distance: number;
}

interface SaveResult {
  total: number;
  natural: number;
  degree: PippingDegreeOfSuccess;
  fallback: boolean;
}

interface TargetOutcome {
  target: TokenTarget;
  save?: SaveResult;
  hpDelta?: number;
  conditionLabels: string[];
  applied: boolean;
}

interface PippingMutationContext {
  damageType: string;
  darkWhisperBonus: number;
  livingNightActive: boolean;
  darknessRadius: number;
  liturgyConditionByActor: Map<string, string>;
}

interface PippingOutcomeMetadata {
  totalPulseCost: number;
  formula: string | null;
  dc: number;
  targetSpec: PippingResolvedTargetSpec;
}

function localizePippingPresentation(
  path: string,
  replacements?: Record<string, string | number>,
): string {
  const key = `ETHERNUM.Unique.Pipping.Presentation.${path}`;
  return replacements ? game.i18n!.format(key, replacements) : game.i18n!.localize(key);
}

export interface PippingActionExecutionOptions {
  actor: Actor;
  action: PippingActionDefinition;
  state: PippingNightState;
  tier: PippingTier;
  formula: string | null;
  dc: number;
  executionId?: string;
  reserveAdditionalPulse?: (amount: number) => Promise<boolean>;
}

export interface PippingActionExecutionResult {
  completed: boolean;
  manifestations?: PippingShadowManifestation[];
  animatedShadow?: {
    tileId?: string;
    sceneId?: string;
    position: {
      x: number;
      y: number;
    };
  };
  persistentArea?: PippingPersistentAreaReference;
  additionalPulseCost?: number;
  assisted?: boolean;
}

function escapeHtml(value: unknown): string {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function tokenCenter(token: Token): { x: number; y: number } | null {
  const center = (token as Token & { center?: { x?: number; y?: number } }).center;
  const x = Number(center?.x);
  const y = Number(center?.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function tokenDisposition(token: Token): number {
  const document = token.document as TokenDocument & { disposition?: number };
  return Number(document.disposition ?? 0);
}

function tokensAllied(source: Token, target: Token): boolean {
  if (source.actor?.id && source.actor.id === target.actor?.id) return true;
  const sourceDisposition = tokenDisposition(source);
  const targetDisposition = tokenDisposition(target);
  return sourceDisposition !== 0 && sourceDisposition === targetDisposition;
}

function sceneDistance(source: Token, target: Token): number {
  const sourceCenter = tokenCenter(source);
  const targetCenter = tokenCenter(target);
  if (!sourceCenter || !targetCenter) return Number.POSITIVE_INFINITY;
  const grid = canvas?.scene?.grid as unknown as { size?: number; distance?: number } | undefined;
  const size = Math.max(1, Number(grid?.size ?? 100));
  const distance = Math.max(1, Number(grid?.distance ?? 5));
  return (Math.hypot(targetCenter.x - sourceCenter.x, targetCenter.y - sourceCenter.y) / size) * distance;
}

function actorToken(actor: Actor): Token | null {
  const controlled = canvas?.tokens?.controlled?.find(token => token.actor?.id === actor.id);
  if (controlled) return controlled;
  const active = typeof actor.getActiveTokens === "function" ? actor.getActiveTokens() : [];
  return active[0] ?? null;
}

function sceneGeometry(): PippingSceneGeometry {
  const grid = canvas?.scene?.grid as unknown as {
    type?: number;
    size?: number;
    distance?: number;
  } | undefined;
  const size = Math.max(1, Number(grid?.size ?? 100));
  const distance = Math.max(1, Number(grid?.distance ?? 5));
  return grid?.type === 0
    ? { type: "gridless", pixelsPerDistance: size / distance }
    : { type: "square", gridSize: size, gridDistance: distance };
}

function tokenDimensions(token: Token): {
  width: number;
  height: number;
  elevation?: number;
  dimensionUnit: "pixels";
} {
  const document = token.document as TokenDocument & {
    width?: number;
    height?: number;
    elevation?: number;
  };
  const rendered = token as Token & { w?: number; h?: number };
  const gridSize = Math.max(1, Number(canvas?.scene?.grid?.size ?? 100));
  const elevation = Number(document.elevation);
  return {
    width: Math.max(0, Number(rendered.w ?? Number(document.width ?? 1) * gridSize)),
    height: Math.max(0, Number(rendered.h ?? Number(document.height ?? 1) * gridSize)),
    dimensionUnit: "pixels",
    ...(Number.isFinite(elevation) ? { elevation } : {}),
  };
}

function areaGeometry(
  source: Token,
  spec: PippingResolvedTargetSpec,
  placement: PippingAreaPlacement,
): PippingAreaGeometry | null {
  if (!spec.area) return null;
  const dimensions = spec.area.origin === "self"
    ? tokenDimensions(source)
    : { width: 0, height: 0 };
  const origin = {
    kind: spec.area.origin,
    point: placement.center,
    ...dimensions,
  };
  if (spec.area.type === "cone") {
    return {
      type: "cone",
      origin,
      distance: spec.area.size,
      direction: placement.direction,
      angle: 90,
    };
  }
  return {
    type: spec.area.type === "emanation" ? "emanation" : "burst",
    origin,
    radius: spec.area.size,
  };
}

function collectTargets(
  actor: Actor,
  spec: PippingResolvedTargetSpec,
  placement?: PippingAreaPlacement,
): TokenTarget[] {
  const source = actorToken(actor);
  if (!source) return [];
  const userTargets = new Set(
    Array.from((game.user as User & { targets?: Set<Token> } | undefined)?.targets ?? [])
      .map(token => token.id),
  );
  const placeables = Array.from(canvas?.tokens?.placeables ?? []);
  const candidates = placeables.flatMap(token => {
    const targetActor = token.actor;
    if (!targetActor) return [];
    const allied = tokensAllied(source, token);
    const isSelf = targetActor.id === actor.id;
    const attitudeAllowed = spec.attitude === "mixed"
      || (spec.attitude === "ally" && allied)
      || (spec.attitude === "enemy" && !allied)
      || (spec.attitude === "self" && isSelf);
    if (!attitudeAllowed || (!spec.includeSelf && isSelf)) return [];
    const distance = sceneDistance(source, token);
    if (!spec.area && distance > spec.range && !isSelf) return [];
    const center = tokenCenter(token);
    if (!center) return [];
    const dimensions = tokenDimensions(token);
    return [{
      id: token.id,
      name: String(token.name ?? targetActor.name ?? "Alvo"),
      actor: targetActor,
      token,
      allied,
      distance,
      selected: userTargets.has(token.id),
      center,
      disposition: tokenDisposition(token),
      ...dimensions,
    }];
  });
  const geometry = placement ? areaGeometry(source, spec, placement) : null;
  const valid = geometry
    ? resolvePippingAreaCandidates({
      area: geometry,
      scene: sceneGeometry(),
      candidates: candidates as Array<TokenTarget & PippingGeometryToken>,
    })
    : candidates;
  return valid.sort((left, right) => {
    const leftSelected = userTargets.has(left.id) ? 0 : 1;
    const rightSelected = userTargets.has(right.id) ? 0 : 1;
    return leftSelected - rightSelected || left.distance - right.distance || left.name.localeCompare(right.name);
  });
}

async function chooseTargets(
  actor: Actor,
  action: PippingActionDefinition,
  spec: PippingResolvedTargetSpec,
  placement?: PippingAreaPlacement,
): Promise<TokenTarget[] | null> {
  if (spec.attitude === "none") return [];
  const targets = collectTargets(actor, spec, placement);
  if (spec.attitude === "self") return targets.slice(0, 1);
  if (targets.length === 0) {
    ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Pipping.Errors.NoValidTargets"));
    return null;
  }

  const selectedByUser = new Set(
    Array.from((game.user as User & { targets?: Set<Token> } | undefined)?.targets ?? [])
      .map(token => token.id),
  );
  const checked = (target: TokenTarget, index: number) =>
    selectedByUser.has(target.id)
    || (selectedByUser.size === 0 && (spec.allByDefault || index < spec.maximum));
  const actionName = game.i18n!.localize(action.nameKey);
  return new Promise(resolve => {
    let settled = false;
    const rows = targets.map((target, index) => `
      <label class="ethernum-pipping-target-option">
        <input type="checkbox" name="target" value="${escapeHtml(target.id)}"${checked(target, index) ? " checked" : ""} />
        <span>${escapeHtml(target.name)}</span>
        <small>${Math.round(target.distance)} ft · ${target.allied ? game.i18n!.localize("ETHERNUM.Unique.Pipping.Ally") : game.i18n!.localize("ETHERNUM.Unique.Pipping.Enemy")}</small>
      </label>
    `).join("");
    new Dialog({
      title: game.i18n!.format("ETHERNUM.Unique.Pipping.TargetDialogTitle", { action: actionName }),
      content: `
        <form class="ethernum-pipping-target-dialog">
          <p>${escapeHtml(game.i18n!.format("ETHERNUM.Unique.Pipping.TargetDialogHint", {
            maximum: spec.maximum >= 99 ? targets.length : spec.maximum,
          }))}</p>
          <div>${rows}</div>
        </form>`,
      buttons: {
        confirm: {
          label: game.i18n!.localize("ETHERNUM.Unique.Pipping.Execute"),
          callback: (html: JQuery) => {
            settled = true;
            const ids = new Set(
              html.find('input[name="target"]:checked').toArray()
                .map(input => String((input as HTMLInputElement).value)),
            );
            const selected = targets.filter(target => ids.has(target.id)).slice(0, spec.maximum);
            if (selected.length === 0) {
              ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Pipping.Errors.NoValidTargets"));
              resolve(null);
              return;
            }
            resolve(selected);
          },
        },
        cancel: {
          label: game.i18n!.localize("ETHERNUM.Buttons.Cancel"),
          callback: () => {
            settled = true;
            resolve(null);
          },
        },
      },
      close: () => {
        if (!settled) resolve(null);
      },
    }).render(true);
  });
}

async function confirmAssistedAction(action: PippingActionDefinition): Promise<boolean> {
  const name = game.i18n!.localize(action.nameKey);
  return new Promise(resolve => {
    let settled = false;
    new Dialog({
      title: name,
      content: `
        <div class="ethernum-pipping-assisted-dialog">
          <p>${escapeHtml(game.i18n!.localize(action.descriptionKey))}</p>
          <p>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.AssistedHint"))}</p>
        </div>`,
      buttons: {
        confirm: {
          label: game.i18n!.localize("ETHERNUM.Unique.Pipping.ConfirmUse"),
          callback: () => {
            settled = true;
            resolve(true);
          },
        },
        cancel: {
          label: game.i18n!.localize("ETHERNUM.Buttons.Cancel"),
          callback: () => {
            settled = true;
            resolve(false);
          },
        },
      },
      close: () => {
        if (!settled) resolve(false);
      },
    }).render(true);
  });
}

function actorConditionSlugs(actor: Actor): string[] {
  return Array.from(actor.items ?? []).flatMap(item => {
    const data = item as Item & { slug?: string };
    const slug = data.slug ?? String((data.system as unknown as { slug?: string })?.slug ?? "");
    return slug ? [slug] : [];
  });
}

function actorHasDeathTrigger(actor: Actor): boolean {
  const attributes = actor.system as unknown as {
    attributes?: {
      hp?: {
        value?: number;
      };
    };
  };
  const hp = Number(attributes.attributes?.hp?.value);
  const conditions = new Set(actorConditionSlugs(actor));
  return hp <= 0 || conditions.has("dying") || conditions.has("dead");
}

async function chooseDarkWhisperUse(
  state: PippingNightState,
  actor: Actor,
): Promise<{ bonus: number; totalCost: number } | null> {
  const sceneDarkness = Number((canvas?.scene as unknown as { darkness?: number })?.darkness ?? 0);
  const canIntensify = state.livingNightActive || sceneDarkness >= 0.25;
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: { bonus: number; totalCost: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    new Dialog({
      title: game.i18n!.localize("ETHERNUM.Unique.Pipping.DarkWhisperChoice.Title"),
      content: `
        <form class="ethernum-pipping-use-choice">
          <label>
            <input type="radio" name="pipping-dark-whisper" value="normal" checked />
            <span><strong>${game.i18n!.localize("ETHERNUM.Unique.Pipping.DarkWhisperChoice.Normal")}</strong>
            <small>${game.i18n!.localize("ETHERNUM.Unique.Pipping.DarkWhisperChoice.NormalHint")}</small></span>
          </label>
          <label class="${canIntensify ? "" : "disabled"}">
            <input type="radio" name="pipping-dark-whisper" value="intensified" ${canIntensify ? "" : "disabled"} />
            <span><strong>${game.i18n!.localize("ETHERNUM.Unique.Pipping.DarkWhisperChoice.Intensified")}</strong>
            <small>${game.i18n!.localize(canIntensify
              ? "ETHERNUM.Unique.Pipping.DarkWhisperChoice.IntensifiedHint"
              : "ETHERNUM.Unique.Pipping.DarkWhisperChoice.RequiresDarkness")}</small></span>
          </label>
        </form>`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n!.localize("ETHERNUM.Buttons.Activate"),
          callback: (html: JQuery) => {
            const choice = String(html.find('input[name="pipping-dark-whisper"]:checked').val() ?? "normal");
            if (choice === "intensified") {
              if (!canIntensify || state.pulse < 2) {
                ui.notifications?.warn(game.i18n!.localize(
                  state.pulse < 2
                    ? "ETHERNUM.Unique.Pipping.Errors.NotEnoughPulse"
                    : "ETHERNUM.Unique.Pipping.DarkWhisperChoice.RequiresDarkness",
                ));
                finish(null);
                return;
              }
              finish({ bonus: 2, totalCost: 2 });
              return;
            }
            finish({ bonus: 1, totalCost: 1 });
          },
        },
        cancel: {
          icon: '<i class="fas fa-xmark"></i>',
          label: game.i18n!.localize("ETHERNUM.Buttons.Cancel"),
          callback: () => finish(null),
        },
      },
      default: "confirm",
      close: () => finish(null),
    }).render(true);
  });
}

async function chooseDamageType(action: PippingActionDefinition): Promise<string | null> {
  const type = action.damage?.type;
  if (type !== "void-or-cold") return type ?? "void";
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    new Dialog({
      title: game.i18n!.localize("ETHERNUM.Unique.Pipping.DamageType.Title"),
      content: `
        <form class="ethernum-pipping-use-choice">
          <label><input type="radio" name="pipping-damage-type" value="void" checked />
            <span><strong>${game.i18n!.localize("ETHERNUM.Unique.Pipping.DamageType.Void")}</strong></span></label>
          <label><input type="radio" name="pipping-damage-type" value="cold" />
            <span><strong>${game.i18n!.localize("ETHERNUM.Unique.Pipping.DamageType.Cold")}</strong></span></label>
        </form>`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n!.localize("ETHERNUM.Buttons.Confirm"),
          callback: (html: JQuery) => finish(String(
            html.find('input[name="pipping-damage-type"]:checked').val() ?? "void",
          )),
        },
        cancel: {
          icon: '<i class="fas fa-xmark"></i>',
          label: game.i18n!.localize("ETHERNUM.Buttons.Cancel"),
          callback: () => finish(null),
        },
      },
      default: "confirm",
      close: () => finish(null),
    }).render(true);
  });
}

async function chooseLiturgyCondition(target: TokenTarget): Promise<string | null> {
  const choices = actorConditionSlugs(target.actor)
    .filter(slug => ["frightened", "sickened", "stupefied"].includes(slug));
  if (choices.length === 0) return null;
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    new Dialog({
      title: game.i18n!.format("ETHERNUM.Unique.Pipping.LiturgyChoice.Title", {
        target: target.name,
      }),
      content: `<form class="ethernum-pipping-use-choice">${choices.map((slug, index) => `
        <label><input type="radio" name="pipping-liturgy-condition" value="${escapeHtml(slug)}" ${index === 0 ? "checked" : ""} />
          <span><strong>${escapeHtml(slug)}</strong></span></label>`).join("")}</form>`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n!.localize("ETHERNUM.Buttons.Confirm"),
          callback: (html: JQuery) => finish(String(
            html.find('input[name="pipping-liturgy-condition"]:checked').val() ?? "",
          ) || null),
        },
        skip: {
          icon: '<i class="fas fa-forward"></i>',
          label: game.i18n!.localize("ETHERNUM.Unique.Pipping.LiturgyChoice.Skip"),
          callback: () => finish(null),
        },
      },
      default: "confirm",
      close: () => finish(null),
    }).render(true);
  });
}

async function rollSave(
  source: Actor,
  target: Actor,
  action: PippingActionDefinition,
  dc: number,
  livingNightPenalty = false,
): Promise<SaveResult | undefined> {
  if (!action.defense) return undefined;
  const result = await rollPF2eSave({
    actor: target,
    save: action.defense,
    dc,
    origin: source,
    traits: action.traits.map(trait => trait.toLowerCase()),
    options: {
      rollOptions: [
        `action:${action.id}`,
        "origin:effect:ethernum-pipping",
        ...(action.save?.incapacitation ? ["incapacitation"] : []),
      ],
      modifiers: livingNightPenalty
        ? [{
          slug: "ethernum-pipping-living-night",
          label: game.i18n!.localize("ETHERNUM.Unique.Pipping.Actions.LivingNight.Name"),
          modifier: -1,
          type: "status",
        }]
        : [],
    },
  });
  return result
    ? {
      total: result.total,
      natural: result.natural,
      degree: result.degree,
      fallback: result.fallback,
    }
    : undefined;
}

function managedEffect(
  name: string,
  slug: string,
  description: string,
  rules: Array<Record<string, unknown>> = [],
  durationRounds = 1,
): PF2eEffectMutation {
  return { name, slug, description, rules, durationRounds };
}

function condition(
  slug: string,
  value = 1,
  mode: "increase" | "decrease" = "increase",
  turnStartsRemaining = mode === "increase" ? 1 : undefined,
): PF2eConditionMutation {
  return { slug, value, mode, turnStartsRemaining };
}

function persistentDamage(formula: string, damageType: string): PF2eConditionMutation {
  return {
    slug: "persistent-damage",
    value: 1,
    mode: "increase",
    persistent: {
      formula,
      damageType,
      dc: 15,
    },
  };
}

function actorHasCondition(actor: Actor, slugs: string[]): string | null {
  const wanted = new Set(slugs);
  for (const item of Array.from(actor.items ?? [])) {
    const data = item as Item & { slug?: string };
    const slug = data.slug ?? String((data.system as unknown as { slug?: string })?.slug ?? "");
    if (wanted.has(slug)) return slug;
  }
  return null;
}

function mutationsForTarget(
  action: PippingActionDefinition,
  target: TokenTarget,
  save: SaveResult | undefined,
  rolledTotal: number,
  tier: PippingTier,
  context: PippingMutationContext,
): { mutation: PF2eActorMutation; hpDelta: number; labels: string[] } {
  const labels: string[] = [];
  const conditions: PF2eConditionMutation[] = [];
  const effects: PF2eEffectMutation[] = [];
  let hpDelta = 0;
  const degree = save?.degree;
  const failed = degree === "failure" || degree === "criticalFailure";
  const criticallyFailed = degree === "criticalFailure";

  if (action.basicSave && degree) hpDelta = -basicSaveDamage(rolledTotal, degree);
  switch (action.id) {
    case "dark-whisper":
      effects.push(managedEffect(
        "Sussurro das Trevas",
        "ethernum-pipping-dark-whisper",
        `Bônus circunstancial de +${context.darkWhisperBonus} no próximo ataque ou salvamento antes do próximo turno de Pipping.`,
        [{
          key: "FlatModifier",
          selector: ["attack-roll", "saving-throw"],
          type: "circumstance",
          value: context.darkWhisperBonus,
          label: "Sussurro das Trevas",
          removeAfterRoll: true,
        }],
      ));
      labels.push(`+${context.darkWhisperBonus} ataque/salvamento`);
      break;
    case "restoring-pulse":
    case "requiem-persist":
    case "gentle-night-liturgy":
    case "night-refuses-end":
      hpDelta = rolledTotal;
      labels.push(`${rolledTotal} PV`);
      if (action.id === "requiem-persist") {
        effects.push(managedEffect(
          "Réquiem dos Que Persistem",
          "ethernum-pipping-requiem",
          "+1 de status no próximo salvamento antes do próximo turno de Pipping.",
          [{ key: "FlatModifier", selector: "saving-throw", type: "status", value: 1, label: "Réquiem" }],
        ));
        labels.push("+1 próximo salvamento");
      }
      if (action.id === "gentle-night-liturgy") {
        const removable = context.liturgyConditionByActor.get(target.actor.uuid) ?? null;
        if (removable) {
          conditions.push(condition(removable, 1, "decrease"));
          labels.push(`reduz ${removable}`);
        }
      }
      if (action.id === "night-refuses-end") {
        conditions.push(condition("doomed", 1, "increase", 0));
        labels.push("Doomed 1");
      }
      break;
    case "ruin-note":
      if (criticallyFailed) {
        conditions.push(condition("frightened", 1));
        labels.push("Frightened 1");
      }
      break;
    case "broken-meter":
      if (failed) {
        conditions.push(condition("off-guard", 1));
        labels.push(criticallyFailed ? "Off-Guard; 10 ft; sem reações" : "Off-Guard; 5 ft");
      }
      break;
    case "void-touch":
      if (failed) {
        const persistentFormula = criticallyFailed ? "2d6" : "1d6";
        conditions.push(persistentDamage(persistentFormula, context.damageType));
        labels.push(`${persistentFormula} persistente ${context.damageType}`);
      }
      if (criticallyFailed) {
        conditions.push(condition("enfeebled", 1));
        labels.push("Enfeebled 1");
      }
      break;
    case "black-order-mantle":
      effects.push(managedEffect(
        "Manto da Ordem Negra",
        "ethernum-pipping-black-order-mantle",
        `Reduz o próximo dano em ${rolledTotal}; em escuridão, concede ${tier} PV temporários.`,
        context.livingNightActive && target.distance <= context.darknessRadius
          ? [{ key: "TempHP", value: tier }]
          : [],
      ));
      labels.push(`redução assistida ${rolledTotal}`);
      if (context.livingNightActive && target.distance <= context.darknessRadius) {
        labels.push(`${tier} PV temporários`);
      }
      break;
    case "shadow-resonance":
      if (failed) {
        const frightened = criticallyFailed ? 2 : 1;
        conditions.push(condition("frightened", frightened));
        labels.push(`Frightened ${frightened}; sem reações`);
      }
      break;
    case "night-emanation":
      if (failed) {
        const enfeebled = criticallyFailed ? 2 : 1;
        conditions.push(condition("enfeebled", enfeebled));
        labels.push(`Enfeebled ${enfeebled}`);
      }
      break;
    case "shadow-king":
      if (failed) {
        conditions.push(condition("off-guard", 1));
        labels.push("Off-Guard");
      }
      if (criticallyFailed) {
        conditions.push(condition("frightened", 1));
        labels.push("Frightened 1");
      }
      break;
    case "ending-chorus":
      if (failed) {
        const frightened = criticallyFailed ? 2 : 1;
        conditions.push(condition("frightened", frightened));
        labels.push(`Frightened ${frightened}`);
      }
      if (criticallyFailed) {
        conditions.push(condition("stupefied", 1));
        labels.push("Stupefied 1");
      }
      break;
    case "abyss-voice":
      if (failed) {
        effects.push(managedEffect(
          "Voz do Abismo",
          "ethernum-pipping-abyss-voice",
          criticallyFailed
            ? "As duas primeiras ações do próximo turno seguem a ordem válida de Pipping."
            : "A primeira ação do próximo turno segue a ordem válida de Pipping.",
        ));
        labels.push(criticallyFailed ? "2 ações comandadas" : "1 ação comandada");
      }
      break;
    case "beyond-form":
      effects.push(managedEffect(
        "Além da Forma",
        "ethernum-pipping-beyond-form",
        "Voo, passagem por criaturas/objetos e resistência 15, exceto força e espírito.",
        [{ key: "Resistance", type: "all-damage", value: 15, exceptions: ["force", "spirit"] }],
      ));
      labels.push("resistência 15; voo");
      break;
    case "dead-sun-epitaph":
      if (failed) {
        const persistentFormula = criticallyFailed ? "4d6" : "2d6";
        conditions.push(persistentDamage(persistentFormula, context.damageType));
        labels.push(`${persistentFormula} persistente ${context.damageType}`);
      }
      if (criticallyFailed) {
        conditions.push(condition("enfeebled", 2));
        labels.push("Enfeebled 2");
      }
      break;
    case "forbidden-performance":
      if (target.allied) {
        conditions.push(condition("quickened", 1));
        labels.push("Quickened");
      } else if (degree === "success" || degree === "criticalSuccess") {
        conditions.push(condition("off-guard", 1));
        labels.push("Off-Guard");
      } else if (failed) {
        const slowed = criticallyFailed ? 2 : 1;
        conditions.push(condition("slowed", slowed));
        labels.push(`Slowed ${slowed}`);
      }
      break;
  }
  return {
    mutation: {
      actorUuid: target.actor.uuid,
      damage: hpDelta < 0 && action.damage
        ? { total: Math.abs(hpDelta), type: context.damageType }
        : undefined,
      healing: hpDelta > 0 && action.healing
        ? { total: hpDelta }
        : undefined,
      conditions,
      effects,
    },
    hpDelta,
    labels,
  };
}

function degreeLabel(degree: PippingDegreeOfSuccess | undefined): string {
  if (!degree) return "";
  return game.i18n!.localize(`ETHERNUM.Unique.Pipping.Degrees.${degree}`);
}

function buildOutcomeCard(
  action: PippingActionDefinition,
  outcomes: TargetOutcome[],
  assisted: boolean,
  metadata?: PippingOutcomeMetadata,
): string {
  const rows = outcomes.length > 0
    ? `<ul>${outcomes.map(outcome => `
        <li>
          <strong>${escapeHtml(outcome.target.name)}</strong>
          ${outcome.save ? `<span>${escapeHtml(degreeLabel(outcome.save.degree))} · ${outcome.save.total} (d20 ${outcome.save.natural})${outcome.save.fallback ? ` · ${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.SaveFallback"))}` : ""}</span>` : ""}
          ${outcome.hpDelta ? `<em>${outcome.hpDelta > 0 ? "+" : ""}${outcome.hpDelta} PV</em>` : ""}
          ${outcome.conditionLabels.length > 0 ? `<small>${outcome.conditionLabels.map(escapeHtml).join(" · ")}</small>` : ""}
          ${outcome.applied ? "" : `<small>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.ManualAdjustment"))}</small>`}
        </li>`).join("")}</ul>`
    : `<p>${escapeHtml(assisted
      ? game.i18n!.localize("ETHERNUM.Unique.Pipping.AssistedResolved")
      : game.i18n!.localize(action.descriptionKey))}</p>`;
  const expression = action.expression ?? "order";
  const durations = [...new Set([
    action.area?.duration,
    ...action.effects.map(effect => effect.duration),
    ...Object.values(action.outcomes ?? {}).map(outcome => outcome?.duration),
  ].filter((value): value is string => Boolean(value)))]
    .map(duration => localizePippingPresentation(`Durations.${duration}`));
  const assistedComponents = action.effects
    .filter(effect => effect.automation !== "automatic")
    .map(effect => localizePippingPresentation(`Effects.${effect.id}`));
  if (metadata?.targetSpec.area) {
    assistedComponents.unshift(localizePippingPresentation("Automation.Components.AreaAndTargetSelection"));
  } else if (metadata && !["none", "self"].includes(metadata.targetSpec.attitude)) {
    assistedComponents.unshift(localizePippingPresentation("Automation.Components.TargetSelection"));
  }
  if (action.automationMode !== "automatic") {
    assistedComponents.push(localizePippingPresentation("Automation.Components.EffectResolution"));
  }
  const targetNames = outcomes.map(outcome => outcome.target.name);
  const area = metadata?.targetSpec.area;
  const areaLabel = area
    ? localizePippingPresentation(`Areas.Display.${area.type}`, { size: area.size })
    : null;
  const areaOrigin = area
    ? localizePippingPresentation(`Origins.${area.origin}`)
    : null;
  const metadataRows = metadata
    ? `
      <dl class="ethernum-pipping-chat-metadata">
        <div><dt>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.Chat.Cost"))}</dt><dd>${escapeHtml(localizePippingPresentation("Units.PulseCost", { cost: metadata.totalPulseCost }))}</dd></div>
        ${metadata.formula ? `<div><dt>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.Chat.Formula"))}</dt><dd>${escapeHtml(metadata.formula)}</dd></div>` : ""}
        ${action.defense ? `<div><dt>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.Chat.DC"))}</dt><dd>${metadata.dc}</dd></div>` : ""}
        ${area
          ? `<div><dt>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.Chat.Area"))}</dt><dd>${escapeHtml(`${areaLabel} · ${areaOrigin}`)}</dd></div>`
          : metadata.targetSpec.range > 0
            ? `<div><dt>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.Chat.Range"))}</dt><dd>${escapeHtml(localizePippingPresentation("Units.Feet", { value: metadata.targetSpec.range }))}</dd></div>`
            : ""}
        <div><dt>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.Chat.Targets"))}</dt><dd>${escapeHtml(targetNames.join(", ") || game.i18n!.localize("ETHERNUM.Unique.Pipping.Chat.NoTargets"))}</dd></div>
        ${durations.length > 0 ? `<div><dt>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.Chat.Duration"))}</dt><dd>${escapeHtml(durations.join(", "))}</dd></div>` : ""}
        ${assistedComponents.length > 0 ? `<div><dt>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.Chat.Assisted"))}</dt><dd>${escapeHtml([...new Set(assistedComponents)].join(", "))}</dd></div>` : ""}
      </dl>`
    : "";
  return `
    <div class="ethernum-unique-chat-card ethernum-pipping-chat-card expression-${expression}">
      <header>
        <img src="modules/ethernum-rpg-module/assets/unique/pipping/shadow-${expression}.png" alt="" />
        <div>
          <span>${escapeHtml(game.i18n!.localize(`ETHERNUM.Unique.Pipping.Expressions.${expression}`))}</span>
          <h3>${escapeHtml(game.i18n!.localize(action.nameKey))}</h3>
        </div>
      </header>
      ${metadataRows}
      ${rows}
    </div>`;
}

async function postOutcome(
  actor: Actor,
  action: PippingActionDefinition,
  outcomes: TargetOutcome[],
  assisted = false,
  metadata?: PippingOutcomeMetadata,
): Promise<void> {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: buildOutcomeCard(action, outcomes, assisted, metadata),
    flags: {
      "ethernum-rpg-module": {
        generated: true,
        uniqueMechanics: true,
        pippingActionId: action.id,
        automated: !assisted,
      },
    } as never,
  });
}

async function resolveAreaPlacement(
  actor: Actor,
  action: PippingActionDefinition,
  state: PippingNightState,
  spec: PippingResolvedTargetSpec,
): Promise<PippingAreaPlacement | null | undefined> {
  const area = spec.area;
  if (!area) return undefined;
  const source = actorToken(actor);
  const sourceCenter = source ? tokenCenter(source) : null;
  if (area.type === "cone") {
    return requestPippingAreaPlacement(actor, {
      actionId: action.id,
      nameKey: action.nameKey,
      areaType: "cone",
      areaSize: area.size,
      maximumRange: area.size,
    });
  }
  if (area.origin === "point") {
    return requestPippingAreaPlacement(actor, {
      actionId: action.id,
      nameKey: action.nameKey,
      areaType: "burst",
      areaSize: area.size,
      maximumRange: spec.range,
    });
  }
  if (area.origin === "shadow") {
    const currentScene = canvas?.scene as unknown as {
      id?: string;
      tiles?: { get?: (id: string) => unknown };
    } | undefined;
    const center = resolvePippingAnimatedShadowPosition(
      state.animatedShadow,
      currentScene?.id,
      tileId => Boolean(currentScene?.tiles?.get?.(tileId)),
    );
    if (!center) {
      ui.notifications?.warn(game.i18n!.localize(
        "ETHERNUM.Unique.Pipping.Errors.RequiresAnimatedShadow",
      ));
      return null;
    }
    return { center, direction: 0 };
  }
  if (!sourceCenter) {
    ui.notifications?.warn(game.i18n!.localize(
      "ETHERNUM.Unique.Pipping.Errors.RequiresActiveToken",
    ));
    return null;
  }
  return { center: sourceCenter, direction: 0 };
}

export async function executePippingAction(
  options: PippingActionExecutionOptions,
): Promise<PippingActionExecutionResult> {
  const { actor, action, state, tier, formula, dc, executionId } = options;
  if (action.id === "animated-shadow" || action.id === "mirrored-shadows") {
    try {
      const count = action.id === "animated-shadow" ? 1 : tier >= 5 ? 4 : tier >= 3 ? 3 : 2;
      const kind = action.id === "animated-shadow" ? "animated" : "mirrored";
      const placement = await requestPippingShadowPlacement(actor, kind, tier);
      if (!placement) return { completed: false };
      const manifestations = await spawnPippingShadowManifestations(
        actor,
        state,
        count,
        kind,
        placement,
      );
      const sourceToken = actorToken(actor);
      await PippingAnimationService.playPersistent({
        actionId: action.id,
        expression: action.expression,
        sourceActorUuid: actor.uuid,
        sourceTokenUuid: sourceToken?.document.uuid,
        targetActorUuids: [],
        targetTokenUuids: [],
        tier,
        intensity: count,
        mode: getPippingAnimationMode(),
        speed: getPippingAnimationSpeed(),
        persistentId: `${actor.uuid}:${action.id}`,
      });
      await postOutcome(actor, action, [], false);
      const animatedManifestation = kind === "animated"
        ? manifestations.find(entry => entry.kind === "animated")
        : undefined;
      return {
        completed: true,
        manifestations,
        ...(kind === "animated"
          ? {
            animatedShadow: {
              tileId: animatedManifestation?.id,
              sceneId: animatedManifestation?.sceneId,
              position: placement,
            },
          }
          : {}),
      };
    } catch (error) {
      console.warn("Ethernum | Pipping shadow manifestation failed", error);
      ui.notifications?.error(game.i18n!.localize("ETHERNUM.Unique.Pipping.Errors.ShadowSpawnFailed"));
      return { completed: false };
    }
  }

  if (action.id === "shadow-form") {
    const confirmed = await confirmAssistedAction(action);
    if (!confirmed) return { completed: false };
    const sourceToken = actorToken(actor);
    await PippingAnimationService.playAction({
      actionId: action.id,
      sourceActorUuid: actor.uuid,
      sourceTokenUuid: sourceToken?.document.uuid,
      targetActorUuids: [],
      targetTokenUuids: [],
      tier,
      intensity: 1,
      mode: getPippingAnimationMode(),
      speed: getPippingAnimationSpeed(),
    });
    await postOutcome(actor, action, [], true);
    return { completed: true, assisted: true };
  }

  const darkWhisperChoice = action.id === "dark-whisper"
    ? await chooseDarkWhisperUse(state, actor)
    : { bonus: 1, totalCost: action.pulseCost };
  if (!darkWhisperChoice) return { completed: false };
  const additionalPulse = Math.max(0, darkWhisperChoice.totalCost - action.pulseCost);
  if (additionalPulse > 0 && options.reserveAdditionalPulse) {
    const reserved = await options.reserveAdditionalPulse(additionalPulse);
    if (!reserved) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Pipping.Errors.NotEnoughPulse"));
      return { completed: false };
    }
  }
  const damageType = await chooseDamageType(action);
  if (!damageType) return { completed: false };
  const spec = resolvePippingTargetSpec(action, Number(
    (actor.system as unknown as { details?: { level?: { value?: number } } })
      .details?.level?.value ?? action.requiredLevel,
  ), tier);
  const areaPlacement = await resolveAreaPlacement(actor, action, state, spec);
  if (areaPlacement === null) return { completed: false };
  const targets = await chooseTargets(actor, action, spec, areaPlacement);
  if (targets === null) return { completed: false };
  if (
    action.id === "night-refuses-end"
    && (targets.length !== 1 || !actorHasDeathTrigger(targets[0].actor))
  ) {
    ui.notifications?.warn(game.i18n!.localize(
      "ETHERNUM.Unique.Pipping.Errors.InvalidNightRefusesEndTrigger",
    ));
    return { completed: false };
  }
  const liturgyConditionByActor = new Map<string, string>();
  if (action.id === "gentle-night-liturgy") {
    for (const target of targets) {
      const chosen = await chooseLiturgyCondition(target);
      if (chosen) liturgyConditionByActor.set(target.actor.uuid, chosen);
    }
  }
  const sourceToken = actorToken(actor);
  let persistentArea: PippingPersistentAreaReference | undefined;
  if (action.id === "shadow-king" || action.id === "dead-sun-epitaph") {
    const areaCenter = areaPlacement?.center;
    if (!areaCenter) {
      ui.notifications?.warn(game.i18n!.localize(
        action.id === "shadow-king"
          ? "ETHERNUM.Unique.Pipping.Errors.RequiresAnimatedShadow"
          : "ETHERNUM.Unique.Pipping.Errors.RequiresActiveToken",
      ));
      return { completed: false };
    }
    try {
      persistentArea = await createPippingPersistentArea(
        actor,
        state,
        action.id,
        areaCenter,
        spec.area?.size ?? 20,
      );
    } catch (error) {
      console.warn(`Ethernum | Pipping ${action.id} area creation failed`, error);
      ui.notifications?.error(game.i18n!.localize("ETHERNUM.Unique.Pipping.Errors.TemplateFailed"));
      return { completed: false };
    }
  }
  const animationContext = {
    actionId: action.id,
    expression: action.expression,
    sourceActorUuid: actor.uuid,
    sourceTokenUuid: sourceToken?.document.uuid,
    targetActorUuids: targets.map(target => target.actor.uuid),
    targetTokenUuids: targets.map(target => target.token.document.uuid),
    tier,
    intensity: Math.max(1, targets.length),
    damageType,
    templateUuid: persistentArea?.documentUuid,
    mode: getPippingAnimationMode(),
    speed: getPippingAnimationSpeed(),
    persistentId: `${actor.uuid}:${action.id}`,
  };
  if (action.animation.persistent) {
    await PippingAnimationService.playPersistent(animationContext);
  } else {
    await PippingAnimationService.playAction(animationContext);
  }
  const roll = formula ? new Roll(formula) : null;
  if (roll) {
    await roll.evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: game.i18n!.localize(action.nameKey),
      flags: {
        "ethernum-rpg-module": {
          generated: true,
          uniqueMechanics: true,
          pippingActionId: action.id,
        },
      } as never,
    });
  }
  const rolledTotal = Math.max(0, Math.floor(Number(roll?.total ?? 0)));
  const mutations: PF2eActorMutation[] = [];
  const pendingOutcomes: Array<Omit<TargetOutcome, "applied">> = [];
  const mutationContext: PippingMutationContext = {
    damageType,
    darkWhisperBonus: darkWhisperChoice.bonus,
    livingNightActive: state.livingNightActive,
    darknessRadius: state.darkness.radius,
    liturgyConditionByActor,
  };
  for (const target of targets) {
    const save = target.allied && action.id === "forbidden-performance"
      ? undefined
      : await rollSave(
        actor,
        target.actor,
        action,
        dc,
        state.livingNightActive
          && !target.allied
          && target.distance <= state.darkness.radius,
      );
    const result = mutationsForTarget(
      action,
      target,
      save,
      rolledTotal,
      tier,
      mutationContext,
    );
    mutations.push(result.mutation);
    pendingOutcomes.push({
      target,
      save,
      hpDelta: result.hpDelta,
      conditionLabels: result.labels,
    });
  }

  let appliedResults;
  try {
    appliedResults = await applyPF2eMutations(actor, mutations, action.id, { executionId });
  } catch (error) {
    if (persistentArea) {
      await removePippingPersistentAreas(actor, state, persistentArea.actionId).catch(() => {});
    }
    console.warn("Ethernum | Pipping target mutations failed", error);
    ui.notifications?.error(game.i18n!.localize("ETHERNUM.Unique.Pipping.Errors.AutomationFailed"));
    return { completed: false };
  }
  const outcomes = pendingOutcomes.map((outcome, index) => ({
    ...outcome,
    applied: appliedResults[index]?.applied ?? mutations[index] === undefined,
  }));
  const usedSaveFallback = outcomes.some(outcome => outcome.save?.fallback);
  await postOutcome(
    actor,
    action,
    outcomes,
    usedSaveFallback || (action.automationMode === "assisted" && targets.length === 0),
    {
      totalPulseCost: darkWhisperChoice.totalCost,
      formula,
      dc,
      targetSpec: spec,
    },
  );
  return {
    completed: true,
    assisted: usedSaveFallback,
    additionalPulseCost: Math.max(0, darkWhisperChoice.totalCost - action.pulseCost),
    persistentArea,
  };
}
