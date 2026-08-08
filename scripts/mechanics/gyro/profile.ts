import type { UniqueMechanicProfile } from "../types.js";
import { onGyroCombatUpdate } from "./hooks.js";
import { getGyroActions, getGyroManagedMacros } from "./macros.js";
import { executeGyroAction } from "./runtime.js";
import { buildGyroSheetData } from "./sheet-data.js";
import {
  DEFAULT_GYRO_STATE,
  GYRO_PROFILE_ID,
  normalizeGyroState,
  type GyroSpinState,
} from "./state.js";

export const gyroProfile: UniqueMechanicProfile<GyroSpinState> = {
  id: GYRO_PROFILE_ID,
  core: "ethernum-company",
  label: "Gyro Zeppeli - Via da Rotacao Sagrada",
  defaultState: DEFAULT_GYRO_STATE,
  normalizeState: normalizeGyroState,
  migrateState: normalizeGyroState,
  buildSheetData: ({ actor, isGM }) => buildGyroSheetData(actor, Boolean(isGM)),
  getActions: getGyroActions,
  executeAction: ({ actor }, actionId, payload = {}) => executeGyroAction(actor, actionId, payload),
  getManagedMacros: getGyroManagedMacros,
  onCombatUpdate: ({ combat }) => onGyroCombatUpdate(combat),
  onActorUpdate: async () => {},
  onRest: async () => {},
};

export * from "./state.js";
