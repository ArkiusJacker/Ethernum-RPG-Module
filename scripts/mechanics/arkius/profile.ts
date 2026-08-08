import type { UniqueMechanicProfile } from "../types.js";
import { onArkiusCombatUpdate, onArkiusRest } from "./hooks.js";
import { getArkiusActions, getArkiusManagedMacros } from "./macros.js";
import { executeArkiusAction } from "./runtime.js";
import { buildArkiusSheetData } from "./sheet-data.js";
import {
  ARKIUS_JACKER_PROFILE_ID,
  DEFAULT_ARKIUS_STATE,
  normalizeArkiusState,
  type ArkiusJackerState,
} from "./state.js";

export const arkiusProfile: UniqueMechanicProfile<ArkiusJackerState> = {
  id: ARKIUS_JACKER_PROFILE_ID,
  core: "concordia",
  label: "Arkius Jacker - Concordia",
  defaultState: DEFAULT_ARKIUS_STATE,
  normalizeState: normalizeArkiusState,
  migrateState: normalizeArkiusState,
  buildSheetData: ({ actor, isGM }) => buildArkiusSheetData(actor, Boolean(isGM)),
  getActions: getArkiusActions,
  executeAction: ({ actor }, actionId, payload = {}) => executeArkiusAction(actor, actionId, payload),
  getManagedMacros: getArkiusManagedMacros,
  onCombatUpdate: ({ combat }) => onArkiusCombatUpdate(combat),
  onActorUpdate: async () => {},
  onRest: ({ actor, rest }) => onArkiusRest(actor, rest),
};

export * from "./state.js";
