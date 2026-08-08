import type { UniqueMechanicProfile } from "../types.js";
import { onCharlesCombatUpdate, onCharlesRest } from "./hooks.js";
import { getCharlesActions, getCharlesManagedMacros } from "./macros.js";
import { executeCharlesAction } from "./runtime.js";
import { buildCharlesSheetData } from "./sheet-data.js";
import {
  CHARLES_PROFILE_ID,
  DEFAULT_CHARLES_STATE,
  normalizeCharlesState,
  type CharlesState,
} from "./state.js";

export const charlesProfile: UniqueMechanicProfile<CharlesState> = {
  id: CHARLES_PROFILE_ID,
  core: "concordia",
  label: "Charles - Miranha em Acao",
  defaultState: DEFAULT_CHARLES_STATE,
  normalizeState: normalizeCharlesState,
  migrateState: normalizeCharlesState,
  buildSheetData: ({ actor, isGM }) => buildCharlesSheetData(actor, Boolean(isGM)),
  getActions: getCharlesActions,
  executeAction: ({ actor }, actionId, payload = {}) => executeCharlesAction(actor, actionId, payload),
  getManagedMacros: getCharlesManagedMacros,
  onCombatUpdate: ({ combat }) => onCharlesCombatUpdate(combat),
  onActorUpdate: async () => {},
  onRest: ({ actor, rest }) => onCharlesRest(actor, rest),
};

export * from "./state.js";
