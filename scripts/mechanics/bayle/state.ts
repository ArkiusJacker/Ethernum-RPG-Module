import { asRecord, clampNumber } from "../state.js";

export const BAYLE_PROFILE_ID = "bayle-dragon" as const;

export interface BayleDragonState {
  stage: number;
  ardor: number;
  rageActive: boolean;
  awakeningActive: boolean;
  lightningChargesUsed: number;
  breathUsed: boolean;
  roarUsed: boolean;
  lancesUsed: boolean;
  closureUsed: boolean;
  [key: string]: unknown;
}

export const DEFAULT_BAYLE_STATE: BayleDragonState = {
  stage: 1,
  ardor: 0,
  rageActive: false,
  awakeningActive: false,
  lightningChargesUsed: 0,
  breathUsed: false,
  roarUsed: false,
  lancesUsed: false,
  closureUsed: false,
};

export function normalizeBayleState(value: unknown): BayleDragonState {
  const state = asRecord(value);
  return {
    ...DEFAULT_BAYLE_STATE,
    ...state,
    stage: clampNumber(state.stage, 1, 1, 4),
    ardor: clampNumber(state.ardor, 0, 0, 3),
    rageActive: Boolean(state.rageActive),
    awakeningActive: Boolean(state.awakeningActive),
    lightningChargesUsed: clampNumber(state.lightningChargesUsed, 0, 0, 2),
    breathUsed: Boolean(state.breathUsed),
    roarUsed: Boolean(state.roarUsed),
    lancesUsed: Boolean(state.lancesUsed),
    closureUsed: Boolean(state.closureUsed),
  };
}
