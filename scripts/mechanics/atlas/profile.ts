import type { UniqueMechanicProfile } from "../types.js";
import { onAtlasCombatUpdate, onAtlasRest } from "./hooks.js";
import { getAtlasActions, getAtlasManagedMacros } from "./macros.js";
import { executeAtlasAction } from "./runtime.js";
import { buildAtlasSheetData } from "./sheet-data.js";
import {
  ATLAS_SIDARTA_PROFILE_ID,
  DEFAULT_ATLAS_STATE,
  normalizeAtlasState,
  type AtlasState,
} from "./state.js";

export const atlasProfile: UniqueMechanicProfile<AtlasState> = {
  id: ATLAS_SIDARTA_PROFILE_ID,
  core: "concordia",
  label: "Atlas Sidarta - Olhar do Divino",
  defaultState: DEFAULT_ATLAS_STATE,
  normalizeState: normalizeAtlasState,
  migrateState: normalizeAtlasState,
  buildSheetData: ({ actor, isGM }) => buildAtlasSheetData(actor, Boolean(isGM)),
  getActions: getAtlasActions,
  executeAction: ({ actor }, actionId, payload = {}) => executeAtlasAction(actor, actionId, payload),
  getManagedMacros: getAtlasManagedMacros,
  onCombatUpdate: ({ combat }) => onAtlasCombatUpdate(combat),
  onActorUpdate: async () => {},
  onRest: ({ actor, rest }) => onAtlasRest(actor, rest),
};

export * from "./state.js";
