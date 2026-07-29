import type { PippingExpression, PippingNightState, PippingTier } from "./state.js";
import type { PippingDegreeOfSuccess } from "./rules.js";
import {
  PIPPING_ACTION_FORMULAS,
  type PippingFormulaDamageType,
  type PippingFormulaDefinition,
  type PippingFormulaId,
  type PippingScalingValue,
} from "./actions.js";

export type PippingActionCategory =
  | "shadow"
  | "voice"
  | "vampiric"
  | "field"
  | "reaction"
  | "finisher";
export type PippingAutomationMode = "manual" | "assisted" | "automatic";
export type PippingActionType = "action" | "reaction" | "free" | "passive";
export interface PippingOptionalCost {
  id: string;
  pulseCost: number;
  labelKey: string;
}

export interface PippingAreaDefinition {
  type: "emanation" | "cone" | "burst" | "darkness";
  size: PippingScalingValue;
  origin: "self" | "shadow" | "point";
  duration?: string;
}

export interface PippingTargetDefinition {
  type: "self" | "ally" | "allies" | "enemy" | "enemies" | "creature" | "creatures";
  maximum?: number;
  range?: PippingScalingValue;
}

export interface PippingFrequencyDefinition {
  interval: "round" | "day";
  uses: number;
}

export interface PippingRequirement {
  id: string;
  value?: string | number | boolean;
  confirmation?: "player" | "gm";
}

export interface PippingSaveDefinition {
  type: "fortitude" | "reflex" | "will";
  basic: boolean;
  incapacitation?: boolean;
}

export interface PippingDamageDefinition {
  formulaId: PippingFormulaId;
  type?: PippingFormulaDamageType;
  persistent?: {
    failure: string;
    criticalFailure: string;
    sameType?: boolean;
  };
}

export interface PippingHealingDefinition {
  formulaId: PippingFormulaId;
  addsCharisma: boolean;
}

export interface PippingOutcomeDefinition {
  movementFeet?: number;
  conditions?: string[];
  duration?: string;
  commandedActions?: number;
  notes?: string[];
}

export interface PippingMechanicalEffect {
  id: string;
  automation: PippingAutomationMode;
  value?: number | string | PippingScalingValue;
  duration?: string;
  consumesOn?: string;
}

export interface PippingAnimationDefinition {
  id: string;
  fallbackClass: string;
  persistent?: boolean;
}

export interface PippingActionDefinition {
  id: string;
  nameKey: string;
  summaryKey: string;
  flavorKey: string;
  descriptionKey: string;
  detailKeys: string[];
  category: PippingActionCategory;
  actions: number | "reaction" | "free" | "passive";
  actionCost: 0 | 1 | 2 | 3;
  actionType: PippingActionType;
  requiredTier: PippingTier;
  requiredLevel: number;
  pulseCost: number;
  optionalPulseCosts: PippingOptionalCost[];
  expression?: PippingExpression;
  traits: string[];
  automationMode: PippingAutomationMode;
  defense?: "fortitude" | "reflex" | "will";
  basicSave?: boolean;
  frequency?: "round" | "daily";
  frequencyDefinition?: PippingFrequencyDefinition;
  formulaId?: PippingFormulaId;
  formula?: PippingFormulaDefinition;
  range?: PippingScalingValue;
  area?: PippingAreaDefinition;
  targets?: PippingTargetDefinition;
  requirements: PippingRequirement[];
  save?: PippingSaveDefinition;
  damage?: PippingDamageDefinition;
  healing?: PippingHealingDefinition;
  outcomes?: Partial<Record<PippingDegreeOfSuccess, PippingOutcomeDefinition>>;
  effects: PippingMechanicalEffect[];
  animation: PippingAnimationDefinition;
}

type PippingActionDefinitionInput = Omit<
  PippingActionDefinition,
  | "summaryKey"
  | "flavorKey"
  | "actionCost"
  | "actionType"
  | "optionalPulseCosts"
  | "requirements"
  | "effects"
  | "animation"
  | "save"
  | "formula"
  | "damage"
  | "healing"
  | "frequencyDefinition"
> & Partial<
  Pick<
    PippingActionDefinition,
    | "summaryKey"
    | "flavorKey"
    | "optionalPulseCosts"
    | "requirements"
    | "effects"
    | "animation"
    | "save"
    | "damage"
    | "healing"
    | "frequencyDefinition"
  >
>;

function definePippingAction(input: PippingActionDefinitionInput): PippingActionDefinition {
  const formula = input.formulaId
    ? PIPPING_ACTION_FORMULAS[input.formulaId] as PippingFormulaDefinition
    : undefined;
  const actionType: PippingActionType = typeof input.actions === "number"
    ? "action"
    : input.actions;
  const actionCost = typeof input.actions === "number" ? input.actions : 0;
  const frequencyDefinition = input.frequencyDefinition ?? (input.frequency
    ? {
      interval: input.frequency === "daily" ? "day" as const : "round" as const,
      uses: 1,
    }
    : undefined);
  const damage = input.damage ?? (formula?.purpose === "damage" && input.formulaId
    ? {
      formulaId: input.formulaId,
      ...(formula.damageType ? { type: formula.damageType } : {}),
    }
    : undefined);
  const healing = input.healing ?? (formula?.purpose === "healing" && input.formulaId
    ? {
      formulaId: input.formulaId,
      addsCharisma: Boolean("addCharisma" in formula && formula.addCharisma),
    }
    : undefined);

  return {
    ...input,
    summaryKey: input.summaryKey ?? input.descriptionKey,
    flavorKey: input.flavorKey ?? input.descriptionKey,
    actionCost: actionCost as PippingActionDefinition["actionCost"],
    actionType,
    optionalPulseCosts: input.optionalPulseCosts ?? [],
    frequencyDefinition,
    formula,
    requirements: input.requirements ?? [],
    save: input.save ?? (input.defense
      ? {
        type: input.defense,
        basic: Boolean(input.basicSave),
        ...(input.traits.includes("Incapacitation") ? { incapacitation: true } : {}),
      }
      : undefined),
    damage,
    healing,
    effects: input.effects ?? [],
    animation: input.animation ?? {
      id: input.id,
      fallbackClass: `ethernum-pipping-${input.id}`,
    },
  };
}

export interface PippingProgressionTier {
  id: `${PippingTier}`;
  tier: PippingTier;
  minLevel: number;
  nameKey: string;
  passiveKeys: string[];
  universalActionIds: string[];
  expressionActionIds: Record<PippingExpression, string>;
}

const PIPPING_ACTION_DEFINITIONS: PippingActionDefinitionInput[] = [
  {
    id: "animated-shadow",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.AnimatedShadow.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.AnimatedShadow.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.AnimatedShadow.Detail1", "ETHERNUM.Unique.Pipping.Actions.AnimatedShadow.Detail2"],
    category: "shadow", actions: "passive", requiredTier: 1, requiredLevel: 3, pulseCost: 0,
    traits: ["Veil", "Shadow"], automationMode: "assisted",
    range: { base: 10, baseLevel: 3, increase: 10, everyLevels: 1, maximum: 30, increaseLevels: [9, 17] },
    targets: { type: "self" },
    requirements: [{ id: "canvas-placement", confirmation: "player" }],
    effects: [
      { id: "animated-shadow-placement", automation: "assisted" },
      { id: "next-ally-strike-off-guard", automation: "assisted", consumesOn: "next-ally-strike" },
    ],
    animation: { id: "animated-shadow", fallbackClass: "ethernum-pipping-shadow", persistent: true },
  },
  {
    id: "mirrored-shadows",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.MirroredShadows.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.MirroredShadows.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.MirroredShadows.Detail1", "ETHERNUM.Unique.Pipping.Actions.MirroredShadows.Detail2"],
    category: "shadow", actions: 2, requiredTier: 1, requiredLevel: 3, pulseCost: 1,
    traits: ["Veil", "Void", "Illusion", "Occult"], automationMode: "automatic",
    targets: { type: "self" },
    requirements: [{ id: "attack-reaction", confirmation: "player" }],
    effects: [
      {
        id: "mirrored-shadow-images",
        automation: "automatic",
        value: { base: 2, baseLevel: 3, increase: 1, everyLevels: 1, maximum: 4, increaseLevels: [9, 17] },
      },
      { id: "simple-check-dc-5", automation: "assisted", value: 5 },
      { id: "retaliation-void-d6-per-tier", automation: "assisted" },
    ],
    animation: { id: "mirrored-shadows", fallbackClass: "ethernum-pipping-shadow", persistent: true },
  },
  {
    id: "dark-whisper",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.DarkWhisper.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.DarkWhisper.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.DarkWhisper.Detail1", "ETHERNUM.Unique.Pipping.Actions.DarkWhisper.Detail2"],
    category: "voice", actions: 1, requiredTier: 1, requiredLevel: 3, pulseCost: 1,
    traits: ["Veil", "Voice", "Auditory"], automationMode: "assisted",
    optionalPulseCosts: [{
      id: "intensify",
      pulseCost: 1,
      labelKey: "ETHERNUM.Unique.Pipping.Actions.DarkWhisper.Intensify",
    }],
    targets: { type: "ally", maximum: 1 },
    requirements: [{ id: "intensify-dim-light-or-darkness" }],
    effects: [{
      id: "next-attack-or-save",
      automation: "automatic",
      value: 1,
      duration: "start-of-pipping-next-turn",
      consumesOn: "first-attack-or-save",
    }],
  },
  {
    id: "void-echoes",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.VoidEchoes.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.VoidEchoes.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.VoidEchoes.Detail1"],
    category: "reaction", actions: "reaction", requiredTier: 1, requiredLevel: 3, pulseCost: 0,
    traits: ["Void", "Occult"], automationMode: "automatic", frequency: "round",
    targets: { type: "creature", maximum: 1, range: { base: 30, baseLevel: 3, increase: 0, everyLevels: 1 } },
    requirements: [
      { id: "failed-occult-or-unique-save" },
      { id: "trigger-message-id" },
    ],
    effects: [{ id: "recover-pulse", automation: "automatic", value: 1 }],
  },
  {
    id: "living-night-song",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.LivingNight.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.LivingNight.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.LivingNight.Detail1", "ETHERNUM.Unique.Pipping.Actions.LivingNight.Detail2"],
    category: "field", actions: 2, requiredTier: 1, requiredLevel: 3, pulseCost: 1,
    traits: ["Composition", "Veil", "Void", "Voice", "Auditory"], automationMode: "automatic",
    targets: { type: "self" },
    area: {
      type: "darkness",
      size: { base: 10, baseLevel: 3, increase: 5, everyLevels: 1, maximum: 15, increaseLevels: [9] },
      origin: "self",
      duration: "sustained",
    },
    requirements: [{ id: "sustain-each-round" }],
    effects: [
      { id: "enemy-save-penalty-against-pipping", automation: "automatic", value: -1 },
      { id: "ally-darkness-vision", automation: "assisted" },
    ],
    animation: { id: "living-night-song", fallbackClass: "ethernum-pipping-field", persistent: true },
  },
  {
    id: "ruin-note",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.RuinNote.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.RuinNote.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.RuinNote.Detail1"],
    category: "voice", actions: 2, requiredTier: 1, requiredLevel: 3, pulseCost: 1, expression: "destruction",
    traits: ["Void", "Voice", "Occult", "Mental"], automationMode: "assisted", defense: "will", basicSave: true, formulaId: "ruin-note",
    targets: { type: "enemy", maximum: 1 },
    outcomes: {
      criticalFailure: { conditions: ["frightened-1"] },
    },
    effects: [{ id: "basic-save-damage", automation: "automatic" }],
  },
  {
    id: "restoring-pulse",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.RestoringPulse.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.RestoringPulse.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.RestoringPulse.Detail1"],
    category: "vampiric", actions: 2, requiredTier: 1, requiredLevel: 3, pulseCost: 1, expression: "order",
    traits: ["Veil", "Healing", "Occult"], automationMode: "assisted", formulaId: "restoring-pulse",
    targets: { type: "ally", maximum: 1 },
    requirements: [{ id: "frightened-reduction-requires-dim-light-or-darkness" }],
    effects: [
      { id: "healing", automation: "automatic" },
      { id: "reduce-frightened", automation: "assisted", value: 1 },
    ],
  },
  {
    id: "broken-meter",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.BrokenMeter.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.BrokenMeter.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.BrokenMeter.Detail1"],
    category: "field", actions: 1, requiredTier: 1, requiredLevel: 3, pulseCost: 1, expression: "chaos",
    traits: ["Voice", "Mental", "Occult"], automationMode: "assisted", defense: "will",
    targets: { type: "enemy", maximum: 1 },
    requirements: [{ id: "forced-movement", confirmation: "gm" }],
    outcomes: {
      failure: {
        movementFeet: 5,
        conditions: ["off-guard"],
        duration: "start-of-pipping-next-turn",
      },
      criticalFailure: {
        movementFeet: 10,
        conditions: ["off-guard", "no-reactions"],
        duration: "start-of-pipping-next-turn",
      },
    },
  },
  {
    id: "shadow-form",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.ShadowForm.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.ShadowForm.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.ShadowForm.Detail1"],
    category: "shadow", actions: 2, requiredTier: 2, requiredLevel: 5, pulseCost: 1,
    traits: ["Veil", "Teleportation", "Occult"], automationMode: "assisted",
    targets: { type: "self" },
    requirements: [{ id: "valid-teleport-destination", confirmation: "player" }],
    effects: [{ id: "teleport", automation: "assisted" }],
  },
  {
    id: "void-touch",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.VoidTouch.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.VoidTouch.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.VoidTouch.Detail1"],
    category: "vampiric", actions: 2, requiredTier: 2, requiredLevel: 5, pulseCost: 2, expression: "destruction",
    traits: ["Void", "Shadow", "Occult"], automationMode: "assisted", defense: "fortitude", basicSave: true, formulaId: "void-touch",
    targets: { type: "enemy", maximum: 1 },
    damage: {
      formulaId: "void-touch",
      type: "void",
      persistent: {
        failure: "1d6",
        criticalFailure: "2d6",
        sameType: true,
      },
    },
    outcomes: {
      failure: { notes: ["persistent-void-1d6"] },
      criticalFailure: {
        conditions: ["enfeebled-1"],
        duration: "1-round",
        notes: ["persistent-void-2d6"],
      },
    },
  },
  {
    id: "black-order-mantle",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.BlackOrderMantle.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.BlackOrderMantle.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.BlackOrderMantle.Detail1"],
    category: "reaction", actions: "reaction", requiredTier: 2, requiredLevel: 5, pulseCost: 1, expression: "order",
    traits: ["Veil", "Shadow"], automationMode: "assisted", formulaId: "black-order-mantle",
    targets: { type: "ally", maximum: 1 },
    requirements: [{ id: "ally-would-take-damage" }],
    effects: [
      { id: "reduce-triggering-damage-instance", automation: "assisted", consumesOn: "triggering-damage" },
      { id: "temporary-hp-in-darkness", automation: "automatic", value: "tier" },
    ],
  },
  {
    id: "shadow-resonance",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.ShadowResonance.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.ShadowResonance.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.ShadowResonance.Detail1"],
    category: "reaction", actions: "reaction", requiredTier: 2, requiredLevel: 5, pulseCost: 1, expression: "chaos",
    traits: ["Voice", "Mental", "Fear"], automationMode: "assisted", defense: "will",
    targets: { type: "enemy", maximum: 1 },
    requirements: [{ id: "protected-ally-was-hit" }],
    outcomes: {
      failure: {
        conditions: ["frightened-1", "no-reactions"],
        duration: "start-of-pipping-next-turn",
      },
      criticalFailure: {
        conditions: ["frightened-2", "no-reactions"],
        duration: "start-of-pipping-next-turn",
      },
    },
  },
  {
    id: "night-emanation",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.NightEmanation.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.NightEmanation.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.NightEmanation.Detail1"],
    category: "field", actions: 2, requiredTier: 3, requiredLevel: 9, pulseCost: 3, expression: "destruction",
    traits: ["Void", "Cold", "Occult"], automationMode: "assisted", defense: "fortitude", basicSave: true, formulaId: "night-emanation",
    targets: { type: "enemies" },
    area: {
      type: "emanation",
      size: { base: 15, baseLevel: 9, increase: 0, everyLevels: 1 },
      origin: "self",
    },
    outcomes: {
      failure: { conditions: ["enfeebled-1"], duration: "1-round" },
      criticalFailure: { conditions: ["enfeebled-2"], duration: "1-round" },
    },
  },
  {
    id: "requiem-persist",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.RequiemPersist.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.RequiemPersist.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.RequiemPersist.Detail1"],
    category: "voice", actions: 2, requiredTier: 3, requiredLevel: 9, pulseCost: 2, expression: "order",
    traits: ["Voice", "Healing", "Composition"], automationMode: "assisted", formulaId: "requiem-persist",
    targets: { type: "ally", maximum: 3 },
    effects: [
      { id: "healing", automation: "automatic" },
      {
        id: "next-save-bonus",
        automation: "automatic",
        value: 1,
        duration: "start-of-pipping-next-turn",
        consumesOn: "first-save",
      },
    ],
  },
  {
    id: "shadow-king",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.ShadowKing.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.ShadowKing.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.ShadowKing.Detail1"],
    category: "field", actions: 2, requiredTier: 3, requiredLevel: 9, pulseCost: 2, expression: "chaos",
    traits: ["Veil", "Shadow", "Occult"], automationMode: "assisted", defense: "will",
    targets: { type: "creatures" },
    area: {
      type: "emanation",
      size: { base: 20, baseLevel: 9, increase: 0, everyLevels: 1 },
      origin: "shadow",
      duration: "persistent",
    },
    requirements: [{ id: "persistent-area-template", confirmation: "gm" }],
    outcomes: {
      failure: { conditions: ["off-guard"], duration: "1-round" },
      criticalFailure: { conditions: ["off-guard", "frightened-1"], duration: "1-round" },
    },
    effects: [{ id: "enemy-only-difficult-terrain", automation: "assisted" }],
    animation: { id: "shadow-king", fallbackClass: "ethernum-pipping-field", persistent: true },
  },
  {
    id: "ending-chorus",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.EndingChorus.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.EndingChorus.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.EndingChorus.Detail1"],
    category: "voice", actions: 3, requiredTier: 4, requiredLevel: 13, pulseCost: 4, expression: "destruction",
    traits: ["Void", "Voice", "Mental", "Fear"], automationMode: "assisted", defense: "will", basicSave: true, formulaId: "ending-chorus",
    targets: { type: "enemies" },
    area: {
      type: "cone",
      size: { base: 30, baseLevel: 13, increase: 0, everyLevels: 1 },
      origin: "self",
    },
    outcomes: {
      failure: { conditions: ["frightened-1"] },
      criticalFailure: { conditions: ["frightened-2", "stupefied-1"], duration: "1-round" },
    },
  },
  {
    id: "gentle-night-liturgy",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.GentleNightLiturgy.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.GentleNightLiturgy.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.GentleNightLiturgy.Detail1"],
    category: "voice", actions: 3, requiredTier: 4, requiredLevel: 13, pulseCost: 3, expression: "order",
    traits: ["Healing", "Voice", "Composition"], automationMode: "assisted", formulaId: "gentle-night-liturgy",
    targets: { type: "ally" },
    area: {
      type: "emanation",
      size: { base: 30, baseLevel: 13, increase: 0, everyLevels: 1 },
      origin: "self",
    },
    requirements: [{ id: "target-chooses-condition-reduction", confirmation: "player" }],
    effects: [
      { id: "healing", automation: "automatic" },
      { id: "reduce-chosen-condition", automation: "assisted", value: 1 },
    ],
  },
  {
    id: "abyss-voice",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.AbyssVoice.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.AbyssVoice.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.AbyssVoice.Detail1"],
    category: "voice", actions: 2, requiredTier: 4, requiredLevel: 13, pulseCost: 3, expression: "chaos",
    traits: ["Voice", "Mental", "Linguistic", "Incapacitation"], automationMode: "assisted", defense: "will",
    targets: { type: "enemy", maximum: 1 },
    requirements: [{ id: "command-text", confirmation: "gm" }],
    outcomes: {
      failure: { commandedActions: 1 },
      criticalFailure: { commandedActions: 2 },
    },
    effects: [{
      id: "commanded-actions-tracker",
      automation: "assisted",
      duration: "end-of-target-turn",
      consumesOn: "commanded-action",
    }],
  },
  {
    id: "beyond-form",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.BeyondForm.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.BeyondForm.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.BeyondForm.Detail1"],
    category: "finisher", actions: 3, requiredTier: 5, requiredLevel: 17, pulseCost: 5,
    traits: ["Void", "Shadow", "Polymorph"], automationMode: "assisted", frequency: "daily",
    targets: { type: "self" },
    requirements: [{ id: "object-passage-assisted", confirmation: "gm" }],
    effects: [
      { id: "fly-speed-equals-land-speed", automation: "automatic", duration: "start-of-pipping-next-turn" },
      { id: "move-through-creature-spaces", automation: "automatic", duration: "start-of-pipping-next-turn" },
      { id: "resistance-all-except-force-spirit", automation: "automatic", value: 15, duration: "start-of-pipping-next-turn" },
      { id: "object-passage", automation: "assisted", duration: "start-of-pipping-next-turn" },
    ],
  },
  {
    id: "dead-sun-epitaph",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.DeadSunEpitaph.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.DeadSunEpitaph.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.DeadSunEpitaph.Detail1"],
    category: "finisher", actions: 3, requiredTier: 5, requiredLevel: 17, pulseCost: 5, expression: "destruction",
    traits: ["Void", "Cold", "Darkness"], automationMode: "assisted", defense: "fortitude", basicSave: true, frequency: "daily", formulaId: "dead-sun-epitaph",
    targets: { type: "enemies" },
    area: {
      type: "burst",
      size: { base: 20, baseLevel: 17, increase: 0, everyLevels: 1 },
      origin: "point",
      duration: "1-minute",
    },
    damage: {
      formulaId: "dead-sun-epitaph",
      type: "void-or-cold",
      persistent: {
        failure: "2d6",
        criticalFailure: "4d6",
        sameType: true,
      },
    },
    outcomes: {
      failure: { notes: ["persistent-same-type-2d6"] },
      criticalFailure: {
        conditions: ["enfeebled-2"],
        duration: "1-round",
        notes: ["persistent-same-type-4d6"],
      },
    },
    effects: [{ id: "independent-magical-darkness", automation: "assisted", duration: "1-minute" }],
    animation: { id: "dead-sun-epitaph", fallbackClass: "ethernum-pipping-field", persistent: true },
  },
  {
    id: "night-refuses-end",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.NightRefusesEnd.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.NightRefusesEnd.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.NightRefusesEnd.Detail1"],
    category: "finisher", actions: "reaction", requiredTier: 5, requiredLevel: 17, pulseCost: 5, expression: "order",
    traits: ["Healing", "Fortune", "Veil"], automationMode: "assisted", frequency: "daily", formulaId: "night-refuses-end",
    targets: {
      type: "ally",
      maximum: 1,
      range: { base: 30, baseLevel: 17, increase: 0, everyLevels: 1 },
    },
    requirements: [
      { id: "target-would-reach-zero-hp-or-gain-death-effect" },
      { id: "valid-reaction-trigger", confirmation: "gm" },
    ],
    effects: [
      { id: "healing", automation: "automatic" },
      { id: "doomed", automation: "automatic", value: 1 },
      { id: "prevent-wounded-from-triggering-event", automation: "assisted" },
    ],
  },
  {
    id: "forbidden-performance",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.ForbiddenPerformance.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.ForbiddenPerformance.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.ForbiddenPerformance.Detail1"],
    category: "finisher", actions: 3, requiredTier: 5, requiredLevel: 17, pulseCost: 5, expression: "chaos",
    traits: ["Composition", "Voice", "Mental", "Incapacitation"], automationMode: "assisted", defense: "will", frequency: "daily",
    targets: { type: "creatures" },
    area: {
      type: "emanation",
      size: { base: 60, baseLevel: 17, increase: 0, everyLevels: 1 },
      origin: "self",
    },
    outcomes: {
      success: { conditions: ["off-guard"], duration: "start-of-pipping-next-turn" },
      failure: { conditions: ["slowed-1"], duration: "1-round" },
      criticalFailure: { conditions: ["slowed-2"], duration: "1-round" },
    },
    effects: [
      {
        id: "ally-quickened-limited-actions",
        automation: "assisted",
        value: "step-stride-strike-sustain",
        duration: "1-round",
      },
    ],
  },
];

export const PIPPING_ACTIONS: PippingActionDefinition[] =
  PIPPING_ACTION_DEFINITIONS.map(definePippingAction);

export const PIPPING_TIERS: PippingProgressionTier[] = [
  { id: "1", tier: 1, minLevel: 3, nameKey: "ETHERNUM.Unique.Pipping.Tiers.1", passiveKeys: ["ETHERNUM.Unique.Pipping.TierPassives.1"], universalActionIds: ["animated-shadow", "mirrored-shadows", "dark-whisper", "void-echoes", "living-night-song"], expressionActionIds: { destruction: "ruin-note", order: "restoring-pulse", chaos: "broken-meter" } },
  { id: "2", tier: 2, minLevel: 5, nameKey: "ETHERNUM.Unique.Pipping.Tiers.2", passiveKeys: ["ETHERNUM.Unique.Pipping.TierPassives.2"], universalActionIds: ["shadow-form"], expressionActionIds: { destruction: "void-touch", order: "black-order-mantle", chaos: "shadow-resonance" } },
  { id: "3", tier: 3, minLevel: 9, nameKey: "ETHERNUM.Unique.Pipping.Tiers.3", passiveKeys: ["ETHERNUM.Unique.Pipping.TierPassives.3"], universalActionIds: [], expressionActionIds: { destruction: "night-emanation", order: "requiem-persist", chaos: "shadow-king" } },
  { id: "4", tier: 4, minLevel: 13, nameKey: "ETHERNUM.Unique.Pipping.Tiers.4", passiveKeys: ["ETHERNUM.Unique.Pipping.TierPassives.4"], universalActionIds: [], expressionActionIds: { destruction: "ending-chorus", order: "gentle-night-liturgy", chaos: "abyss-voice" } },
  { id: "5", tier: 5, minLevel: 17, nameKey: "ETHERNUM.Unique.Pipping.Tiers.5", passiveKeys: ["ETHERNUM.Unique.Pipping.TierPassives.5"], universalActionIds: ["beyond-form"], expressionActionIds: { destruction: "dead-sun-epitaph", order: "night-refuses-end", chaos: "forbidden-performance" } },
];

export function pippingTierForLevel(level: number): PippingTier {
  if (level >= 17) return 5;
  if (level >= 13) return 4;
  if (level >= 9) return 3;
  if (level >= 5) return 2;
  return 1;
}

export interface PippingPulseMaximumResolution {
  current: number;
  charismaModifier: number;
  charismaValid: boolean;
  tier: PippingTier;
  nextIncrease: {
    tier: PippingTier;
    minimumLevel: number;
    value: number;
  } | null;
}

export function resolvePippingPulseMaximum(
  charismaModifier: number | null | undefined,
  tier: PippingTier,
): PippingPulseMaximumResolution {
  const charismaValid = typeof charismaModifier === "number" && Number.isFinite(charismaModifier);
  const resolvedCharisma = charismaValid ? Math.trunc(charismaModifier) : 0;
  const current = Math.max(1, 3 + resolvedCharisma + (tier - 1));
  const nextTier = tier < 5 ? (tier + 1) as PippingTier : null;
  const nextTierDefinition = nextTier === null
    ? null
    : PIPPING_TIERS.find(definition => definition.tier === nextTier) ?? null;
  return {
    current,
    charismaModifier: resolvedCharisma,
    charismaValid,
    tier,
    nextIncrease: nextTier && nextTierDefinition
      ? {
        tier: nextTier,
        minimumLevel: nextTierDefinition.minLevel,
        value: Math.max(1, 3 + resolvedCharisma + (nextTier - 1)),
      }
      : null,
  };
}

export function calculatePippingPulseMaximum(charismaModifier: number, tier: PippingTier): number {
  return resolvePippingPulseMaximum(charismaModifier, tier).current;
}

export function isPippingActionSelected(action: PippingActionDefinition, state: PippingNightState): boolean {
  if (!action.expression) return true;
  return state.expressionChoices[String(action.requiredTier) as `${PippingTier}`] === action.expression;
}

export type PippingActionBlockReason = "tier" | "expression" | "pulse" | "daily" | "";

export interface PippingActionAvailability {
  tierUnlocked: boolean;
  selected: boolean;
  canAfford: boolean;
  dailyAvailable: boolean;
  usable: boolean;
  reason: PippingActionBlockReason;
}

export function getPippingActionAvailability(
  action: PippingActionDefinition,
  state: PippingNightState,
  actorLevel: number,
  effectiveTier: PippingTier,
): PippingActionAvailability {
  const tierUnlocked = effectiveTier >= action.requiredTier && actorLevel >= action.requiredLevel;
  const selected = isPippingActionSelected(action, state);
  const canAfford = state.pulse >= action.pulseCost;
  const dailyAvailable = action.frequency !== "daily"
    || (action.id === "beyond-form"
      ? !state.daily.beyondFormUsed
      : !state.daily.tierFiveFinisherUsed);
  const reason: PippingActionBlockReason = !tierUnlocked
    ? "tier"
    : !selected
      ? "expression"
      : !canAfford
        ? "pulse"
        : !dailyAvailable
          ? "daily"
          : "";
  return {
    tierUnlocked,
    selected,
    canAfford,
    dailyAvailable,
    usable: reason === "",
    reason,
  };
}

export function getPippingAction(actionId: string): PippingActionDefinition | null {
  return PIPPING_ACTIONS.find(action => action.id === actionId) ?? null;
}
