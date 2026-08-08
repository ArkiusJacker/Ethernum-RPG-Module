import type {
  UniqueMechanicAction,
  UniqueMechanicVisualMetadata,
} from "../../mechanics/types.js";
import { UniqueMechanicsDispatcher } from "../core/UniqueMechanicsDispatcher.js";
import { uniqueMechanicsCompatibilityRuntime } from "./runtime.js";

export interface UniqueMechanicPresentation {
  hasProfile: boolean;
  profileId: string;
  label: string;
  visual: UniqueMechanicVisualMetadata;
  actions: UniqueMechanicAction[];
  data: Record<string, unknown>;
}

export const UniqueMechanicPresentationService = {
  build(actor: Actor, isGM: boolean): UniqueMechanicPresentation {
    const profile = UniqueMechanicsDispatcher.resolve(actor);
    if (!profile) {
      return {
        hasProfile: false,
        profileId: "",
        label: "",
        visual: {},
        actions: [],
        data: UniqueMechanicsDispatcher.buildSheetData(
          actor,
          isGM,
          uniqueMechanicsCompatibilityRuntime,
        ),
      };
    }
    return {
      hasProfile: true,
      profileId: profile.id,
      label: profile.label,
      visual: profile.visual ?? {},
      actions: UniqueMechanicsDispatcher.getActions(actor, uniqueMechanicsCompatibilityRuntime),
      data: UniqueMechanicsDispatcher.buildSheetData(
        actor,
        isGM,
        uniqueMechanicsCompatibilityRuntime,
      ),
    };
  },
};
