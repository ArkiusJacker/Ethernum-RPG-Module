import type { UniqueMechanicProfile } from "../types.js";
import {
  DEFAULT_PIPPING_STATE,
  normalizePippingState,
  type PippingNightState,
} from "./state.js";

export const PIPPING_PROFILE_ID = "pipping-night" as const;

export const pippingProfile: UniqueMechanicProfile<PippingNightState> = {
  id: PIPPING_PROFILE_ID,
  core: "ethernum-company",
  label: "Pipping Baldwin Black - Expressao da Noite",
  defaultState: DEFAULT_PIPPING_STATE,
  normalizeState: normalizePippingState,
};

export * from "./state.js";
export * from "./progression.js";
export * from "./actions.js";
export * from "./automation.js";
