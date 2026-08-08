import type { UniqueMechanicProfile } from "../types.js";
import { onYuActorUpdate, onYuCombatUpdate, onYuRest } from "./hooks.js";
import { getYuActions, getYuManagedMacros } from "./macros.js";
import { executeYuAction } from "./runtime.js";
import { buildYuSheetData } from "./sheet-data.js";
import {
  DEFAULT_YU_STATE,
  normalizeYuState,
  YU_JIU_JI_TAE_PROFILE_ID,
  type YuRageState,
} from "./state.js";

export const yuProfile: UniqueMechanicProfile<YuRageState> = {
  id: YU_JIU_JI_TAE_PROFILE_ID,
  core: "concordia",
  label: "Yu, Jiu Ji Tae - Rage in the Flesh",
  defaultState: DEFAULT_YU_STATE,
  normalizeState: normalizeYuState,
  migrateState: normalizeYuState,
  buildSheetData: ({ actor, isGM }) => buildYuSheetData(actor, Boolean(isGM)),
  getActions: getYuActions,
  executeAction: ({ actor }, actionId) => executeYuAction(actor, actionId),
  getManagedMacros: getYuManagedMacros,
  onCombatUpdate: ({ combat }) => onYuCombatUpdate(combat),
  onActorUpdate: ({ actor, changed }) => onYuActorUpdate(actor, changed),
  onRest: ({ actor, rest }) => onYuRest(actor, rest),
};

export * from "./state.js";
