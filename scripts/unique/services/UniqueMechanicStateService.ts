import type { CampaignCoreId } from "../../config.js";
import { ETHERNUM } from "../../config.js";
import type { UniqueMechanicProfileId, UniqueMechanicsState } from "../../mechanics/types.js";
import { getUniqueMechanicProfile } from "../../mechanics/registry.js";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeCore(value: unknown): CampaignCoreId {
  return value === "concordia" ? "concordia" : "ethernum-company";
}

export const UniqueMechanicStateService = {
  getState(actor: Actor): UniqueMechanicsState {
    const source = record(actor.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics"));
    const activeProfile = String(source.activeProfile ?? "") as UniqueMechanicProfileId;
    return {
      activeCore: normalizeCore(source.activeCore),
      activeProfile: getUniqueMechanicProfile(activeProfile) ? activeProfile : "",
      profiles: record(source.profiles),
    };
  },

  getProfileState(actor: Actor): unknown {
    const state = this.getState(actor);
    return state.activeProfile ? state.profiles[state.activeProfile] : undefined;
  },

  hasActiveProfile(actor: Actor): boolean {
    return Boolean(this.getState(actor).activeProfile);
  },
};
