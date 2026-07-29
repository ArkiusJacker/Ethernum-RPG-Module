import type { UniqueMechanicProfile } from "../types.js";
import { asRecord, clampNumber, optionalString } from "../state.js";

export const GYRO_PROFILE_ID = "gyro-spin" as const;
export type GyroMainAttribute = "dex" | "wis";
export type GyroProficiencyRank = "trained" | "expert" | "master" | "legendary";
export type GyroExecutionMode = "stable" | "forced" | "corpse" | "perfect";

export interface GyroSpinState {
  currentSP: number;
  maxSPOverride?: number;
  mainAttribute: GyroMainAttribute;
  proficiencyRank: GyroProficiencyRank;
  sacredScars: number;
  corpsePartNumber: number;
  torsoBonus: boolean;
  heartRegen: boolean;
  absoluteReady: boolean;
  unlockedIkons: string[];
  activeDeviation?: string;
  activeDeviationCombatId?: string;
  proportionMarkTargetId?: string;
  spGainedThisRound?: number;
  lastSPRoundKey?: string;
  lastBallBreakerTurnKey?: string;
  [key: string]: unknown;
}

export const DEFAULT_GYRO_STATE: GyroSpinState = {
  currentSP: 0,
  mainAttribute: "dex",
  proficiencyRank: "trained",
  sacredScars: 0,
  corpsePartNumber: 1,
  torsoBonus: false,
  heartRegen: false,
  absoluteReady: false,
  unlockedIkons: [],
};

function normalizeProficiency(value: unknown): GyroProficiencyRank {
  if (value === "expert" || value === "master" || value === "legendary") return value;
  if (Number(value) >= 8) return "legendary";
  if (Number(value) >= 6) return "master";
  if (Number(value) >= 4) return "expert";
  return "trained";
}

export function normalizeGyroState(value: unknown): GyroSpinState {
  const state = asRecord(value);
  const maxSPOverride = state.maxSPOverride === undefined ? undefined : Number(state.maxSPOverride);
  return {
    ...DEFAULT_GYRO_STATE,
    ...state,
    currentSP: Number(state.currentSP ?? DEFAULT_GYRO_STATE.currentSP) || 0,
    maxSPOverride: Number.isFinite(maxSPOverride) ? maxSPOverride : undefined,
    mainAttribute: state.mainAttribute === "wis" ? "wis" : "dex",
    proficiencyRank: normalizeProficiency(state.proficiencyRank ?? state.proficiencyBonus),
    sacredScars: Number(state.sacredScars ?? 0) || 0,
    corpsePartNumber: clampNumber(state.corpsePartNumber, 1, 1, 9),
    torsoBonus: Boolean(state.torsoBonus),
    heartRegen: Boolean(state.heartRegen),
    absoluteReady: Boolean(state.absoluteReady),
    unlockedIkons: Array.isArray(state.unlockedIkons) ? state.unlockedIkons.map(String) : [],
    activeDeviation: optionalString(state.activeDeviation),
    activeDeviationCombatId: optionalString(state.activeDeviationCombatId),
    proportionMarkTargetId: optionalString(state.proportionMarkTargetId),
    spGainedThisRound: Number(state.spGainedThisRound ?? 0) || 0,
    lastSPRoundKey: optionalString(state.lastSPRoundKey),
    lastBallBreakerTurnKey: optionalString(state.lastBallBreakerTurnKey),
  };
}

export const gyroProfile: UniqueMechanicProfile<GyroSpinState> = {
  id: GYRO_PROFILE_ID,
  core: "ethernum-company",
  label: "Gyro Zeppeli - Via da Rotacao Sagrada",
  defaultState: DEFAULT_GYRO_STATE,
  normalizeState: normalizeGyroState,
};
