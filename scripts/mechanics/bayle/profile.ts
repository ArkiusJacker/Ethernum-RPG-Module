import type { UniqueMechanicProfile } from "../types.js";
import { onBayleCombatUpdate } from "./hooks.js";
import { getBayleActions, getBayleManagedMacros } from "./macros.js";
import { executeBayleAction } from "./runtime.js";
import { buildBayleSheetData } from "./sheet-data.js";
import {
  BAYLE_PROFILE_ID,
  DEFAULT_BAYLE_STATE,
  normalizeBayleState,
  type BayleDragonState,
} from "./state.js";

export const bayleProfile: UniqueMechanicProfile<BayleDragonState> = {
  id: BAYLE_PROFILE_ID,
  core: "ethernum-company",
  label: "Bayle, o Horror - Corpo Draconico",
  defaultState: DEFAULT_BAYLE_STATE,
  normalizeState: normalizeBayleState,
  migrateState: normalizeBayleState,
  buildSheetData: ({ actor, isGM }) => buildBayleSheetData(actor, Boolean(isGM)),
  getActions: getBayleActions,
  executeAction: ({ actor }, actionId) => executeBayleAction(actor, actionId),
  getManagedMacros: getBayleManagedMacros,
  onCombatUpdate: ({ combat }) => onBayleCombatUpdate(combat),
  onActorUpdate: async () => {},
  onRest: async () => {},
};

export * from "./state.js";
