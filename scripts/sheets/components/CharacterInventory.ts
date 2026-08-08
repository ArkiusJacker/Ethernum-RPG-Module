import { PF2eCharacterAdapter } from "../../core/PF2eCharacterAdapter.js";
import type { CharacterSheetModule } from "../core/CharacterSheetModuleRegistry.js";
import { CharacterSheetCache } from "../core/CharacterSheetCache.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "./types.js";

export const CharacterInventoryModule: CharacterSheetModule<CharacterSheetModuleContext, CharacterSheetModuleOutput> = {
  id: "inventory",
  order: 40,
  build: ({ actor, actorId }) => ({
    inventory: CharacterSheetCache.getOrCreate(actorId, "inventory", () => PF2eCharacterAdapter.inventory(actor)),
  }),
};
