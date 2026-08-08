import { getUniqueMechanicProfile } from "../../mechanics/registry.js";
import { ETHERNUM } from "../../config.js";
import type {
  UniqueMechanicAction,
  UniqueMechanicProfile,
  UniqueMechanicsRuntime,
} from "../../mechanics/types.js";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function activeProfileId(actor: Actor): string {
  const state = record(actor.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics"));
  return String(state.activeProfile ?? "");
}

function activeCombatActor(combat: Combat): Actor | null {
  const combatant = (combat as Combat & { combatant?: { actor?: Actor | null } }).combatant;
  return combatant?.actor ?? null;
}

export class UniqueMechanicsDispatcher {
  static resolve(actor: Actor): UniqueMechanicProfile | null {
    return getUniqueMechanicProfile(activeProfileId(actor));
  }

  static buildSheetData(
    actor: Actor,
    isGM: boolean,
    runtime: UniqueMechanicsRuntime,
  ): Record<string, unknown> {
    const profile = this.resolve(actor);
    if (!profile) return runtime.buildSheetData(actor, isGM);
    try {
      return profile.buildSheetData({ actor, isGM, runtime });
    } catch (error) {
      console.error(`Ethernum | ${profile.id} sheet dispatcher failed`, error);
      return runtime.buildSheetData(actor, isGM);
    }
  }

  static getActions(actor: Actor, runtime: UniqueMechanicsRuntime): UniqueMechanicAction[] {
    return this.resolve(actor)?.getActions({ actor, runtime }) ?? [];
  }

  static getManagedMacros(actor: Actor, runtime: UniqueMechanicsRuntime): UniqueMechanicAction[] {
    return this.resolve(actor)?.getManagedMacros({ actor, runtime }) ?? [];
  }

  static async executeAction(
    actor: Actor,
    actionId: string,
    payload: Record<string, unknown>,
    runtime: UniqueMechanicsRuntime,
  ): Promise<unknown> {
    const profile = this.resolve(actor);
    if (!profile) throw new Error("The actor has no active unique mechanic profile.");
    try {
      return await profile.executeAction({ actor, runtime }, actionId, payload);
    } catch (error) {
      console.error(`Ethernum | ${profile.id}/${actionId} dispatcher failed`, error);
      throw error;
    }
  }

  static async onCombatUpdate(combat: Combat, runtime: UniqueMechanicsRuntime): Promise<void> {
    const actor = activeCombatActor(combat);
    const profile = actor ? this.resolve(actor) : null;
    if (profile) await profile.onCombatUpdate({ combat, runtime });
    else {
      const fallback = runtime.handleCombatTurnAdvance;
      if (typeof fallback === "function") await fallback.call(runtime, combat);
    }
  }

  static async onActorUpdate(
    actor: Actor,
    changed: unknown,
    runtime: UniqueMechanicsRuntime,
  ): Promise<void> {
    await this.resolve(actor)?.onActorUpdate({ actor, changed, runtime });
  }

  static async onRest(
    actor: Actor,
    rest: "short" | "long",
    runtime: UniqueMechanicsRuntime,
  ): Promise<void> {
    await this.resolve(actor)?.onRest({ actor, rest, runtime });
  }

  static migrateState(profileId: string, value: unknown): unknown {
    return getUniqueMechanicProfile(profileId)?.migrateState(value) ?? value;
  }
}
