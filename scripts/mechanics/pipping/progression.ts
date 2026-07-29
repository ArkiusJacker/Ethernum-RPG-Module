import type { PippingExpression, PippingNightState, PippingTier } from "./state.js";

export type PippingActionCategory =
  | "shadow"
  | "voice"
  | "vampiric"
  | "field"
  | "reaction"
  | "finisher";
export type PippingAutomationMode = "manual" | "assisted" | "automatic";

export interface PippingActionDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  detailKeys: string[];
  category: PippingActionCategory;
  actions: number | "reaction" | "free" | "passive";
  requiredTier: PippingTier;
  requiredLevel: number;
  pulseCost: number;
  expression?: PippingExpression;
  traits: string[];
  automationMode: PippingAutomationMode;
  defense?: "fortitude" | "reflex" | "will";
  basicSave?: boolean;
  frequency?: "round" | "daily";
  formulaId?: string;
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

export const PIPPING_ACTIONS: PippingActionDefinition[] = [
  {
    id: "animated-shadow",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.AnimatedShadow.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.AnimatedShadow.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.AnimatedShadow.Detail1", "ETHERNUM.Unique.Pipping.Actions.AnimatedShadow.Detail2"],
    category: "shadow", actions: "passive", requiredTier: 1, requiredLevel: 3, pulseCost: 0,
    traits: ["Veil", "Shadow"], automationMode: "assisted",
  },
  {
    id: "mirrored-shadows",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.MirroredShadows.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.MirroredShadows.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.MirroredShadows.Detail1", "ETHERNUM.Unique.Pipping.Actions.MirroredShadows.Detail2"],
    category: "shadow", actions: 2, requiredTier: 1, requiredLevel: 3, pulseCost: 1,
    traits: ["Veil", "Void", "Illusion", "Occult"], automationMode: "automatic",
  },
  {
    id: "dark-whisper",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.DarkWhisper.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.DarkWhisper.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.DarkWhisper.Detail1", "ETHERNUM.Unique.Pipping.Actions.DarkWhisper.Detail2"],
    category: "voice", actions: 1, requiredTier: 1, requiredLevel: 3, pulseCost: 1,
    traits: ["Veil", "Voice", "Auditory"], automationMode: "assisted",
  },
  {
    id: "void-echoes",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.VoidEchoes.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.VoidEchoes.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.VoidEchoes.Detail1"],
    category: "reaction", actions: "reaction", requiredTier: 1, requiredLevel: 3, pulseCost: 0,
    traits: ["Void", "Occult"], automationMode: "automatic", frequency: "round",
  },
  {
    id: "living-night-song",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.LivingNight.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.LivingNight.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.LivingNight.Detail1", "ETHERNUM.Unique.Pipping.Actions.LivingNight.Detail2"],
    category: "field", actions: 2, requiredTier: 1, requiredLevel: 3, pulseCost: 1,
    traits: ["Composition", "Veil", "Void", "Voice", "Auditory"], automationMode: "automatic",
  },
  {
    id: "ruin-note",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.RuinNote.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.RuinNote.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.RuinNote.Detail1"],
    category: "voice", actions: 2, requiredTier: 1, requiredLevel: 3, pulseCost: 1, expression: "destruction",
    traits: ["Void", "Voice", "Occult", "Mental"], automationMode: "assisted", defense: "will", basicSave: true, formulaId: "ruin-note",
  },
  {
    id: "restoring-pulse",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.RestoringPulse.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.RestoringPulse.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.RestoringPulse.Detail1"],
    category: "vampiric", actions: 2, requiredTier: 1, requiredLevel: 3, pulseCost: 1, expression: "order",
    traits: ["Veil", "Healing", "Occult"], automationMode: "assisted", formulaId: "restoring-pulse",
  },
  {
    id: "broken-meter",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.BrokenMeter.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.BrokenMeter.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.BrokenMeter.Detail1"],
    category: "field", actions: 1, requiredTier: 1, requiredLevel: 3, pulseCost: 1, expression: "chaos",
    traits: ["Voice", "Mental", "Occult"], automationMode: "assisted", defense: "will",
  },
  {
    id: "shadow-form",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.ShadowForm.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.ShadowForm.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.ShadowForm.Detail1"],
    category: "shadow", actions: 2, requiredTier: 2, requiredLevel: 5, pulseCost: 1,
    traits: ["Veil", "Teleportation", "Occult"], automationMode: "assisted",
  },
  {
    id: "void-touch",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.VoidTouch.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.VoidTouch.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.VoidTouch.Detail1"],
    category: "vampiric", actions: 2, requiredTier: 2, requiredLevel: 5, pulseCost: 2, expression: "destruction",
    traits: ["Void", "Shadow", "Occult"], automationMode: "assisted", defense: "fortitude", basicSave: true, formulaId: "void-touch",
  },
  {
    id: "black-order-mantle",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.BlackOrderMantle.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.BlackOrderMantle.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.BlackOrderMantle.Detail1"],
    category: "reaction", actions: "reaction", requiredTier: 2, requiredLevel: 5, pulseCost: 1, expression: "order",
    traits: ["Veil", "Shadow"], automationMode: "assisted", formulaId: "black-order-mantle",
  },
  {
    id: "shadow-resonance",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.ShadowResonance.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.ShadowResonance.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.ShadowResonance.Detail1"],
    category: "reaction", actions: "reaction", requiredTier: 2, requiredLevel: 5, pulseCost: 1, expression: "chaos",
    traits: ["Voice", "Mental", "Fear"], automationMode: "assisted", defense: "will",
  },
  {
    id: "night-emanation",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.NightEmanation.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.NightEmanation.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.NightEmanation.Detail1"],
    category: "field", actions: 2, requiredTier: 3, requiredLevel: 9, pulseCost: 3, expression: "destruction",
    traits: ["Void", "Cold", "Occult"], automationMode: "assisted", defense: "fortitude", basicSave: true, formulaId: "night-emanation",
  },
  {
    id: "requiem-persist",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.RequiemPersist.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.RequiemPersist.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.RequiemPersist.Detail1"],
    category: "voice", actions: 2, requiredTier: 3, requiredLevel: 9, pulseCost: 2, expression: "order",
    traits: ["Voice", "Healing", "Composition"], automationMode: "assisted", formulaId: "requiem-persist",
  },
  {
    id: "shadow-king",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.ShadowKing.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.ShadowKing.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.ShadowKing.Detail1"],
    category: "field", actions: 2, requiredTier: 3, requiredLevel: 9, pulseCost: 2, expression: "chaos",
    traits: ["Veil", "Shadow", "Occult"], automationMode: "assisted", defense: "will",
  },
  {
    id: "ending-chorus",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.EndingChorus.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.EndingChorus.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.EndingChorus.Detail1"],
    category: "voice", actions: 3, requiredTier: 4, requiredLevel: 13, pulseCost: 4, expression: "destruction",
    traits: ["Void", "Voice", "Mental", "Fear"], automationMode: "assisted", defense: "will", basicSave: true, formulaId: "ending-chorus",
  },
  {
    id: "gentle-night-liturgy",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.GentleNightLiturgy.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.GentleNightLiturgy.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.GentleNightLiturgy.Detail1"],
    category: "voice", actions: 3, requiredTier: 4, requiredLevel: 13, pulseCost: 3, expression: "order",
    traits: ["Healing", "Voice", "Composition"], automationMode: "assisted", formulaId: "gentle-night-liturgy",
  },
  {
    id: "abyss-voice",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.AbyssVoice.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.AbyssVoice.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.AbyssVoice.Detail1"],
    category: "voice", actions: 2, requiredTier: 4, requiredLevel: 13, pulseCost: 3, expression: "chaos",
    traits: ["Voice", "Mental", "Linguistic", "Incapacitation"], automationMode: "assisted", defense: "will",
  },
  {
    id: "beyond-form",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.BeyondForm.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.BeyondForm.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.BeyondForm.Detail1"],
    category: "finisher", actions: 3, requiredTier: 5, requiredLevel: 17, pulseCost: 5,
    traits: ["Void", "Shadow", "Polymorph"], automationMode: "assisted", frequency: "daily",
  },
  {
    id: "dead-sun-epitaph",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.DeadSunEpitaph.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.DeadSunEpitaph.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.DeadSunEpitaph.Detail1"],
    category: "finisher", actions: 3, requiredTier: 5, requiredLevel: 17, pulseCost: 5, expression: "destruction",
    traits: ["Void", "Cold", "Darkness"], automationMode: "assisted", defense: "fortitude", basicSave: true, frequency: "daily", formulaId: "dead-sun-epitaph",
  },
  {
    id: "night-refuses-end",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.NightRefusesEnd.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.NightRefusesEnd.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.NightRefusesEnd.Detail1"],
    category: "finisher", actions: "reaction", requiredTier: 5, requiredLevel: 17, pulseCost: 5, expression: "order",
    traits: ["Healing", "Fortune", "Veil"], automationMode: "assisted", frequency: "daily", formulaId: "night-refuses-end",
  },
  {
    id: "forbidden-performance",
    nameKey: "ETHERNUM.Unique.Pipping.Actions.ForbiddenPerformance.Name",
    descriptionKey: "ETHERNUM.Unique.Pipping.Actions.ForbiddenPerformance.Description",
    detailKeys: ["ETHERNUM.Unique.Pipping.Actions.ForbiddenPerformance.Detail1"],
    category: "finisher", actions: 3, requiredTier: 5, requiredLevel: 17, pulseCost: 5, expression: "chaos",
    traits: ["Composition", "Voice", "Mental", "Incapacitation"], automationMode: "assisted", defense: "will", frequency: "daily",
  },
];

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

export function calculatePippingPulseMaximum(charismaModifier: number, tier: PippingTier): number {
  return Math.max(1, 3 + charismaModifier + (tier - 1));
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
