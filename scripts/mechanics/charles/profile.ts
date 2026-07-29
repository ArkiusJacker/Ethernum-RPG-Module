import type { UniqueMechanicProfile } from "../types.js";
import { asRecord, asStringRecord, clampNumber, optionalString } from "../state.js";

export const CHARLES_PROFILE_ID = "charles" as const;

export interface CharlesState {
  chargesSpent: number;
  maxCharges: number;
  deviceBroken: boolean;
  acLeakStacks: number;
  net: {
    active: boolean;
    overloaded: boolean;
    remainingRounds: number;
    radius: number;
    templateId?: string;
    combatId?: string;
    lastCombatTurnKey?: string;
    appliedTurnKeys: Record<string, string>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const DEFAULT_CHARLES_STATE: CharlesState = {
  chargesSpent: 0,
  maxCharges: 3,
  deviceBroken: false,
  acLeakStacks: 0,
  net: {
    active: false,
    overloaded: false,
    remainingRounds: 0,
    radius: 10,
    appliedTurnKeys: {},
  },
};

export function normalizeCharlesState(value: unknown): CharlesState {
  const state = asRecord(value);
  const net = asRecord(state.net);
  const maxCharges = clampNumber(state.maxCharges, 3, 1, 9);
  return {
    ...DEFAULT_CHARLES_STATE,
    ...state,
    chargesSpent: clampNumber(state.chargesSpent, 0, 0, maxCharges),
    maxCharges,
    deviceBroken: Boolean(state.deviceBroken),
    acLeakStacks: clampNumber(state.acLeakStacks, 0, 0, 3),
    net: {
      ...DEFAULT_CHARLES_STATE.net,
      ...net,
      active: Boolean(net.active),
      overloaded: Boolean(net.overloaded),
      remainingRounds: clampNumber(net.remainingRounds, 0, 0, 3),
      radius: clampNumber(net.radius, 10, 10, 15),
      templateId: optionalString(net.templateId),
      combatId: optionalString(net.combatId),
      lastCombatTurnKey: optionalString(net.lastCombatTurnKey),
      appliedTurnKeys: asStringRecord(net.appliedTurnKeys),
    },
  };
}

export const charlesProfile: UniqueMechanicProfile<CharlesState> = {
  id: CHARLES_PROFILE_ID,
  core: "concordia",
  label: "Charles - Miranha em Acao",
  defaultState: DEFAULT_CHARLES_STATE,
  normalizeState: normalizeCharlesState,
};
