import { PF2eCharacterAdapter } from "../../core/PF2eCharacterAdapter.js";
import { CombatMomentumSystem } from "../../table/CombatMomentumSystem.js";
import type { CharacterSheetModule } from "../core/CharacterSheetModuleRegistry.js";
import { CharacterSheetCache } from "../core/CharacterSheetCache.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "./types.js";

export const CharacterCombatModule: CharacterSheetModule<CharacterSheetModuleContext, CharacterSheetModuleOutput> = {
  id: "combat",
  order: 30,
  build: ({ actor, actorId }) => CharacterSheetCache.getOrCreate(actorId, "combat", () => ({
    strikes: PF2eCharacterAdapter.strikes(actor),
    actions: PF2eCharacterAdapter.actions(actor),
    combatMomentum: CombatMomentumSystem.getState(actor),
  })),
};
