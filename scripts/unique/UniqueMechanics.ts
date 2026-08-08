import type { UniqueMechanicsRuntime } from "../mechanics/types.js";
import { UniqueMechanicsDispatcher } from "./core/UniqueMechanicsDispatcher.js";
import { UniqueMechanicsLegacy } from "./UniqueMechanicsLegacy.js";

export * from "./UniqueMechanicsLegacy.js";

const legacyRuntime = UniqueMechanicsLegacy as unknown as UniqueMechanicsRuntime;

/** Compatibility facade for game.ethernum, managed macros and older integrations. */
export class UniqueMechanicsSystem extends UniqueMechanicsLegacy {
  static override buildSheetData(actor: Actor, isGM: boolean): Record<string, unknown> {
    return UniqueMechanicsDispatcher.buildSheetData(actor, isGM, legacyRuntime);
  }

  static getActions(actor: Actor) {
    return UniqueMechanicsDispatcher.getActions(actor, legacyRuntime);
  }

  static getManagedMacros(actor: Actor) {
    return UniqueMechanicsDispatcher.getManagedMacros(actor, legacyRuntime);
  }

  static executeAction(
    actor: Actor,
    actionId: string,
    payload: Record<string, unknown> = {},
  ): Promise<unknown> {
    return UniqueMechanicsDispatcher.executeAction(actor, actionId, payload, legacyRuntime);
  }

  static override handleCombatTurnAdvance(combat: Combat): Promise<void> {
    return UniqueMechanicsDispatcher.onCombatUpdate(combat, legacyRuntime);
  }

  static override handleYuActorUpdate(actor: Actor, changed: unknown): Promise<void> {
    return UniqueMechanicsDispatcher.onActorUpdate(actor, changed, legacyRuntime);
  }

  static handleRest(actor: Actor, rest: "short" | "long"): Promise<void> {
    return UniqueMechanicsDispatcher.onRest(actor, rest, legacyRuntime);
  }
}
