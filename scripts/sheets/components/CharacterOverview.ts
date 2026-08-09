import { PF2eCharacterAdapter } from "../../core/PF2eCharacterAdapter.js";
import type { CharacterSheetModule } from "../core/CharacterSheetModuleRegistry.js";
import { CharacterSheetCache } from "../core/CharacterSheetCache.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "./types.js";

export const CharacterOverviewModule: CharacterSheetModule<CharacterSheetModuleContext, CharacterSheetModuleOutput> = {
  id: "overview",
  order: 20,
  build: ({ actor, actorId }) => CharacterSheetCache.getOrCreate(actorId, "overview", () => ({
    abilities: PF2eCharacterAdapter.abilities(actor),
    skills: PF2eCharacterAdapter.skills(actor),
    defenses: PF2eCharacterAdapter.defenses(actor),
    movement: PF2eCharacterAdapter.movement(actor),
    resources: PF2eCharacterAdapter.resources(actor),
    details: PF2eCharacterAdapter.details(actor),
  })),
};
