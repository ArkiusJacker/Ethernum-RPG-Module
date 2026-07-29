import type { UniqueMechanicProfile } from "../types.js";
import { asRecord, clampNumber, optionalString } from "../state.js";

export const YU_JIU_JI_TAE_PROFILE_ID = "yu-jiu-ji-tae" as const;

export interface YuRageState {
  active: boolean;
  usesSpent: number;
  maxUses: number;
  remainingRounds: number;
  combatId?: string;
  lastCombatTurnKey?: string;
  emergencyTriggered: boolean;
  collapseDrainedActive: boolean;
  collapseEnfeebledActive: boolean;
  [key: string]: unknown;
}

export const DEFAULT_YU_STATE: YuRageState = {
  active: false,
  usesSpent: 0,
  maxUses: 1,
  remainingRounds: 0,
  emergencyTriggered: false,
  collapseDrainedActive: false,
  collapseEnfeebledActive: false,
};

export function normalizeYuState(value: unknown): YuRageState {
  const state = asRecord(value);
  const maxUses = clampNumber(state.maxUses, 1, 1, 3);
  return {
    ...DEFAULT_YU_STATE,
    ...state,
    active: Boolean(state.active),
    usesSpent: clampNumber(state.usesSpent, 0, 0, maxUses),
    maxUses,
    remainingRounds: clampNumber(state.remainingRounds, 0, 0, 10),
    combatId: optionalString(state.combatId),
    lastCombatTurnKey: optionalString(state.lastCombatTurnKey),
    emergencyTriggered: Boolean(state.emergencyTriggered),
    collapseDrainedActive: Boolean(state.collapseDrainedActive),
    collapseEnfeebledActive: Boolean(state.collapseEnfeebledActive),
  };
}

export const yuProfile: UniqueMechanicProfile<YuRageState> = {
  id: YU_JIU_JI_TAE_PROFILE_ID,
  core: "concordia",
  label: "Yu, Jiu Ji Tae - Rage in the Flesh",
  defaultState: DEFAULT_YU_STATE,
  normalizeState: normalizeYuState,
};
