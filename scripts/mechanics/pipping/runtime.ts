import {
  applyPF2eMutations,
  type PF2eActorMutation,
  type PF2eConditionMutation,
  type PF2eEffectMutation,
} from "../../core/PF2eAdapter.js";
import type { PippingActionDefinition } from "./progression.js";
import {
  spawnPippingShadowManifestations,
} from "./canvas.js";
import {
  basicSaveDamage,
  resolvePippingDegree,
  type PippingDegreeOfSuccess,
} from "./rules.js";
import type {
  PippingNightState,
  PippingShadowManifestation,
  PippingTier,
} from "./state.js";

type TargetAttitude = "ally" | "enemy" | "mixed" | "self" | "none";

interface PippingTargetSpec {
  attitude: TargetAttitude;
  range: number;
  maximum: number;
  includeSelf?: boolean;
  allByDefault?: boolean;
}

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
}

interface TargetOutcome {
  target: TokenTarget;
  save?: SaveResult;
  hpDelta?: number;
  conditionLabels: string[];
  applied: boolean;
}

export interface PippingActionExecutionOptions {
  actor: Actor;
  action: PippingActionDefinition;
  state: PippingNightState;
  tier: PippingTier;
  formula: string | null;
  dc: number;
}

export interface PippingActionExecutionResult {
  completed: boolean;
  manifestations?: PippingShadowManifestation[];
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

function actionTargetSpec(actionId: string): PippingTargetSpec {
  switch (actionId) {
    case "dark-whisper":
    case "restoring-pulse":
    case "black-order-mantle":
    case "night-refuses-end":
      return { attitude: "ally", range: 30, maximum: 1, includeSelf: true };
    case "ruin-note":
    case "broken-meter":
    case "void-touch":
    case "shadow-resonance":
    case "abyss-voice":
      return { attitude: "enemy", range: 30, maximum: 1 };
    case "night-emanation":
      return { attitude: "enemy", range: 15, maximum: 99, allByDefault: true };
    case "requiem-persist":
      return { attitude: "ally", range: 30, maximum: 3, includeSelf: true };
    case "shadow-king":
      return { attitude: "enemy", range: 30, maximum: 99, allByDefault: true };
    case "ending-chorus":
      return { attitude: "enemy", range: 30, maximum: 99, allByDefault: true };
    case "gentle-night-liturgy":
      return { attitude: "ally", range: 30, maximum: 99, includeSelf: true, allByDefault: true };
    case "dead-sun-epitaph":
      return { attitude: "enemy", range: 20, maximum: 99, allByDefault: true };
    case "forbidden-performance":
      return { attitude: "mixed", range: 60, maximum: 99, includeSelf: true, allByDefault: true };
    case "beyond-form":
      return { attitude: "self", range: 0, maximum: 1, includeSelf: true };
    default:
      return { attitude: "none", range: 0, maximum: 0 };
  }
}

function collectTargets(actor: Actor, spec: PippingTargetSpec): TokenTarget[] {
  const source = actorToken(actor);
  if (!source) return [];
  const userTargets = new Set(
    Array.from((game.user as User & { targets?: Set<Token> } | undefined)?.targets ?? [])
      .map(token => token.id),
  );
  const placeables = Array.from(canvas?.tokens?.placeables ?? []);
  return placeables.flatMap(token => {
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
    if (distance > spec.range && !isSelf) return [];
    return [{
      id: token.id,
      name: String(token.name ?? targetActor.name ?? "Alvo"),
      actor: targetActor,
      token,
      allied,
      distance,
      selected: userTargets.has(token.id),
    }];
  }).sort((left, right) => {
    const leftSelected = userTargets.has(left.id) ? 0 : 1;
    const rightSelected = userTargets.has(right.id) ? 0 : 1;
    return leftSelected - rightSelected || left.distance - right.distance || left.name.localeCompare(right.name);
  });
}

async function chooseTargets(
  actor: Actor,
  action: PippingActionDefinition,
  spec: PippingTargetSpec,
): Promise<TokenTarget[] | null> {
  if (spec.attitude === "none") return [];
  const targets = collectTargets(actor, spec);
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

function actorSaveModifier(actor: Actor, save: "fortitude" | "reflex" | "will"): number {
  const system = actor.system as unknown as Record<string, unknown>;
  const saves = (system.saves ?? {}) as Record<string, unknown>;
  const data = (saves[save] ?? {}) as Record<string, unknown>;
  const check = (data.check ?? {}) as Record<string, unknown>;
  for (const candidate of [
    data.total,
    data.totalModifier,
    data.mod,
    data.value,
    check.total,
    check.totalModifier,
    check.mod,
  ]) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function naturalD20(roll: Roll): number {
  const dice = (roll as Roll & {
    dice?: Array<{ total?: number; results?: Array<{ result?: number }> }>;
  }).dice ?? [];
  const value = Number(dice[0]?.total ?? dice[0]?.results?.[0]?.result);
  return Number.isFinite(value) ? value : 0;
}

async function rollSave(
  target: Actor,
  action: PippingActionDefinition,
  dc: number,
  livingNightPenalty = false,
): Promise<SaveResult | undefined> {
  if (!action.defense) return undefined;
  const modifier = actorSaveModifier(target, action.defense) - (livingNightPenalty ? 1 : 0);
  const roll = new Roll(`1d20 + ${modifier}`);
  await roll.evaluate();
  const total = Number(roll.total ?? 0);
  const natural = naturalD20(roll);
  return { total, natural, degree: resolvePippingDegree(total, dc, natural) };
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
        "Bônus circunstancial de +1 no próximo ataque ou salvamento antes do próximo turno de Pipping.",
        [{
          key: "FlatModifier",
          selector: ["attack-roll", "saving-throw"],
          type: "circumstance",
          value: 1,
          label: "Sussurro das Trevas",
        }],
      ));
      labels.push("+1 ataque/salvamento");
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
        const removable = actorHasCondition(target.actor, ["frightened", "sickened", "stupefied"]);
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
      if (failed) labels.push("dano persistente: aplicação assistida");
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
        [{ key: "Resistance", type: "all-damage", value: rolledTotal }],
      ));
      labels.push(`redução ${rolledTotal}`);
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
      if (failed) labels.push("dano persistente: aplicação assistida");
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
      hpDelta,
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
): string {
  const rows = outcomes.length > 0
    ? `<ul>${outcomes.map(outcome => `
        <li>
          <strong>${escapeHtml(outcome.target.name)}</strong>
          ${outcome.save ? `<span>${escapeHtml(degreeLabel(outcome.save.degree))} · ${outcome.save.total} (d20 ${outcome.save.natural})</span>` : ""}
          ${outcome.hpDelta ? `<em>${outcome.hpDelta > 0 ? "+" : ""}${outcome.hpDelta} PV</em>` : ""}
          ${outcome.conditionLabels.length > 0 ? `<small>${outcome.conditionLabels.map(escapeHtml).join(" · ")}</small>` : ""}
          ${outcome.applied ? "" : `<small>${escapeHtml(game.i18n!.localize("ETHERNUM.Unique.Pipping.ManualAdjustment"))}</small>`}
        </li>`).join("")}</ul>`
    : `<p>${escapeHtml(assisted
      ? game.i18n!.localize("ETHERNUM.Unique.Pipping.AssistedResolved")
      : game.i18n!.localize(action.descriptionKey))}</p>`;
  const expression = action.expression ?? "order";
  return `
    <div class="ethernum-unique-chat-card ethernum-pipping-chat-card expression-${expression}">
      <header>
        <img src="modules/ethernum-rpg-module/assets/unique/pipping/shadow-${expression}.png" alt="" />
        <div>
          <span>${escapeHtml(game.i18n!.localize(`ETHERNUM.Unique.Pipping.Expressions.${expression}`))}</span>
          <h3>${escapeHtml(game.i18n!.localize(action.nameKey))}</h3>
        </div>
      </header>
      ${rows}
    </div>`;
}

async function postOutcome(
  actor: Actor,
  action: PippingActionDefinition,
  outcomes: TargetOutcome[],
  assisted = false,
): Promise<void> {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: buildOutcomeCard(action, outcomes, assisted),
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

export async function executePippingAction(
  options: PippingActionExecutionOptions,
): Promise<PippingActionExecutionResult> {
  const { actor, action, state, tier, formula, dc } = options;
  if (action.id === "animated-shadow" || action.id === "mirrored-shadows") {
    try {
      const count = action.id === "animated-shadow" ? 1 : tier >= 5 ? 4 : tier >= 3 ? 3 : 2;
      const manifestations = await spawnPippingShadowManifestations(
        actor,
        state,
        count,
        action.id === "animated-shadow" ? "animated" : "mirrored",
      );
      await postOutcome(actor, action, [], false);
      return { completed: true, manifestations };
    } catch (error) {
      console.warn("Ethernum | Pipping shadow manifestation failed", error);
      ui.notifications?.error(game.i18n!.localize("ETHERNUM.Unique.Pipping.Errors.ShadowSpawnFailed"));
      return { completed: false };
    }
  }

  if (action.id === "shadow-form") {
    const confirmed = await confirmAssistedAction(action);
    if (!confirmed) return { completed: false };
    await postOutcome(actor, action, [], true);
    return { completed: true, assisted: true };
  }

  const spec = actionTargetSpec(action.id);
  const targets = await chooseTargets(actor, action, spec);
  if (targets === null) return { completed: false };
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
  for (const target of targets) {
    const save = target.allied && action.id === "forbidden-performance"
      ? undefined
      : await rollSave(
        target.actor,
        action,
        dc,
        state.livingNightActive
          && !target.allied
          && target.distance <= state.darkness.radius,
      );
    const result = mutationsForTarget(action, target, save, rolledTotal, tier);
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
    appliedResults = await applyPF2eMutations(actor, mutations, action.id);
  } catch (error) {
    console.warn("Ethernum | Pipping target mutations failed", error);
    ui.notifications?.error(game.i18n!.localize("ETHERNUM.Unique.Pipping.Errors.AutomationFailed"));
    return { completed: false };
  }
  const outcomes = pendingOutcomes.map((outcome, index) => ({
    ...outcome,
    applied: appliedResults[index]?.applied ?? mutations[index] === undefined,
  }));
  await postOutcome(actor, action, outcomes, action.automationMode === "assisted" && targets.length === 0);
  return { completed: true };
}
