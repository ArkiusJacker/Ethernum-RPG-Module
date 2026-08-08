import { UniqueMechanicsDispatcher } from "../core/UniqueMechanicsDispatcher.js";
import { uniqueMechanicsCompatibilityRuntime } from "./runtime.js";

export const UniqueMechanicRestService = {
  handle(actor: Actor, rest: "short" | "long"): Promise<void> {
    return UniqueMechanicsDispatcher.onRest(actor, rest, uniqueMechanicsCompatibilityRuntime);
  },
};
