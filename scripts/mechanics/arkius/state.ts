import { asRecord, asStringRecord, clampNumber, optionalString } from "../state.js";

export const ARKIUS_JACKER_PROFILE_ID = "arkius-jacker" as const;
export type ArkiusAttunement = "none" | "fluxo" | "brasas";
export type ArkiusSolarAreaId = "emanation" | "cone" | "line";
export type ArkiusConcordiaAspect = "chains" | "ruby" | "convergence";

export interface ArkiusJackerState {
  nucleoEmBrasas: {
    active: boolean;
    usesSpent: number;
    maxUses: number;
    startedRound?: number;
    startedTurn?: number;
    combatId?: string;
    remainingRounds: number;
    attunement: ArkiusAttunement;
    pendingFluxoReduction: boolean;
    pendingBrasasDamage: boolean;
    selectedSolarArea: ArkiusSolarAreaId;
    fluxoUsedTurnKey?: string;
    brasasUsedTurnKey?: string;
    lastCombatTurnKey?: string;
    firstFireMetalProcUsed: boolean;
    endedPenaltyActive: boolean;
    fireMetalImpulsesLocked: boolean;
    exaurirUsed: boolean;
    [key: string]: unknown;
  };
  kineticAura: {
    active: boolean;
    radius: number;
    templateId?: string;
    [key: string]: unknown;
  };
  thermalNimbus: {
    active: boolean;
    fireAuraJunction: boolean;
    appliedTurnKeys: Record<string, string>;
    [key: string]: unknown;
  };
  concordiaAspect: ArkiusConcordiaAspect;
  bracoEvolutivo: {
    chargesSpent: number;
    maxCharges: number;
    resistanceFormula: string;
    level13Unlocked: boolean;
    level17Unlocked: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const DEFAULT_ARKIUS_STATE: ArkiusJackerState = {
  nucleoEmBrasas: {
    active: false,
    usesSpent: 0,
    maxUses: 2,
    remainingRounds: 0,
    attunement: "none",
    pendingFluxoReduction: false,
    pendingBrasasDamage: false,
    selectedSolarArea: "emanation",
    firstFireMetalProcUsed: false,
    endedPenaltyActive: false,
    fireMetalImpulsesLocked: false,
    exaurirUsed: false,
  },
  kineticAura: { active: false, radius: 10 },
  thermalNimbus: { active: false, fireAuraJunction: false, appliedTurnKeys: {} },
  concordiaAspect: "chains",
  bracoEvolutivo: {
    chargesSpent: 0,
    maxCharges: 2,
    resistanceFormula: "2d6 + 5",
    level13Unlocked: false,
    level17Unlocked: false,
  },
};

function normalizeAttunement(value: unknown): ArkiusAttunement {
  return value === "fluxo" || value === "brasas" ? value : "none";
}

function normalizeArea(value: unknown): ArkiusSolarAreaId {
  return value === "cone" || value === "line" ? value : "emanation";
}

function normalizeAspect(value: unknown): ArkiusConcordiaAspect {
  return value === "ruby" || value === "convergence" ? value : "chains";
}

export function normalizeArkiusState(value: unknown): ArkiusJackerState {
  const state = asRecord(value);
  const nucleo = asRecord(state.nucleoEmBrasas);
  const kineticAura = asRecord(state.kineticAura);
  const thermalNimbus = asRecord(state.thermalNimbus);
  const braco = asRecord(state.bracoEvolutivo);
  const maxUses = clampNumber(nucleo.maxUses, 2, 1, 9);
  const maxCharges = clampNumber(braco.maxCharges, 2, 1, 9);
  const startedRound = Number(nucleo.startedRound);
  const startedTurn = Number(nucleo.startedTurn);
  return {
    ...DEFAULT_ARKIUS_STATE,
    ...state,
    nucleoEmBrasas: {
      ...DEFAULT_ARKIUS_STATE.nucleoEmBrasas,
      ...nucleo,
      active: Boolean(nucleo.active),
      usesSpent: clampNumber(nucleo.usesSpent, 0, 0, maxUses),
      maxUses,
      startedRound: Number.isFinite(startedRound) ? startedRound : undefined,
      startedTurn: Number.isFinite(startedTurn) ? startedTurn : undefined,
      combatId: optionalString(nucleo.combatId),
      remainingRounds: clampNumber(nucleo.remainingRounds, 0, 0, 10),
      attunement: normalizeAttunement(nucleo.attunement),
      pendingFluxoReduction: Boolean(nucleo.pendingFluxoReduction),
      pendingBrasasDamage: Boolean(nucleo.pendingBrasasDamage),
      selectedSolarArea: normalizeArea(nucleo.selectedSolarArea),
      fluxoUsedTurnKey: optionalString(nucleo.fluxoUsedTurnKey),
      brasasUsedTurnKey: optionalString(nucleo.brasasUsedTurnKey),
      lastCombatTurnKey: optionalString(nucleo.lastCombatTurnKey),
      firstFireMetalProcUsed: Boolean(nucleo.firstFireMetalProcUsed),
      endedPenaltyActive: Boolean(nucleo.endedPenaltyActive),
      fireMetalImpulsesLocked: Boolean(nucleo.fireMetalImpulsesLocked),
      exaurirUsed: Boolean(nucleo.exaurirUsed),
    },
    kineticAura: {
      ...DEFAULT_ARKIUS_STATE.kineticAura,
      ...kineticAura,
      active: Boolean(kineticAura.active),
      radius: clampNumber(kineticAura.radius, 10, 5, 60),
      templateId: optionalString(kineticAura.templateId),
    },
    thermalNimbus: {
      ...DEFAULT_ARKIUS_STATE.thermalNimbus,
      ...thermalNimbus,
      active: Boolean(thermalNimbus.active),
      fireAuraJunction: Boolean(thermalNimbus.fireAuraJunction),
      appliedTurnKeys: asStringRecord(thermalNimbus.appliedTurnKeys),
    },
    concordiaAspect: normalizeAspect(state.concordiaAspect),
    bracoEvolutivo: {
      ...DEFAULT_ARKIUS_STATE.bracoEvolutivo,
      ...braco,
      chargesSpent: clampNumber(braco.chargesSpent, 0, 0, maxCharges),
      maxCharges,
      resistanceFormula: typeof braco.resistanceFormula === "string"
        ? braco.resistanceFormula
        : DEFAULT_ARKIUS_STATE.bracoEvolutivo.resistanceFormula,
      level13Unlocked: Boolean(braco.level13Unlocked),
      level17Unlocked: Boolean(braco.level17Unlocked),
    },
  };
}

export function hasActiveArkiusKineticAura(state: ArkiusJackerState): boolean {
  return state.kineticAura.active;
}
