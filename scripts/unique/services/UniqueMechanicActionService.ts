import type { UniqueMechanicAction } from "../../mechanics/types.js";
import { UniqueMechanicsDispatcher } from "../core/UniqueMechanicsDispatcher.js";
import { uniqueMechanicsCompatibilityRuntime } from "./runtime.js";

export const UniqueMechanicActionService = {
  getActions(actor: Actor): UniqueMechanicAction[] {
    return UniqueMechanicsDispatcher.getActions(actor, uniqueMechanicsCompatibilityRuntime);
  },

  execute(
    actor: Actor,
    actionId: string,
    payload: Record<string, unknown> = {},
  ): Promise<unknown> {
    return UniqueMechanicsDispatcher.executeAction(
      actor,
      actionId,
      payload,
      uniqueMechanicsCompatibilityRuntime,
    );
  },
};
