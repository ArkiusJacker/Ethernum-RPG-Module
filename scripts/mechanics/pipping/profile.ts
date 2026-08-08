import type { UniqueMechanicProfile } from "../types.js";
import { legacyProfileAdapter } from "../profile-runtime.js";
import {
  DEFAULT_PIPPING_STATE,
  normalizePippingState,
  type PippingNightState,
} from "./state.js";
import { PIPPING_ACTIONS } from "./progression.js";

export const PIPPING_PROFILE_ID = "pipping-night" as const;

export const pippingProfile: UniqueMechanicProfile<PippingNightState> = {
  ...legacyProfileAdapter({
    actions: PIPPING_ACTIONS.map(action => ({ id: action.id })),
    wildcardHandler: "usePippingAction",
    passActionId: true,
    combatHook: "handleCombatTurnAdvance",
    longRestHandler: "pippingDailyPreparations",
  }),
  id: PIPPING_PROFILE_ID,
  core: "ethernum-company",
  label: "Pipping Baldwin Black - Expressao da Noite",
  defaultState: DEFAULT_PIPPING_STATE,
  normalizeState: normalizePippingState,
  migrateState: normalizePippingState,
};

export * from "./state.js";
export * from "./progression.js";
export * from "./actions.js";
export * from "./automation.js";
export * from "./assets.js";
export * from "./rules.js";
