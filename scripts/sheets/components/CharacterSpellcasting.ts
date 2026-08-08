import { PF2eCharacterAdapter } from "../../core/PF2eCharacterAdapter.js";
import type { CharacterSheetModule } from "../core/CharacterSheetModuleRegistry.js";
import { CharacterSheetCache } from "../core/CharacterSheetCache.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "./types.js";

export const CharacterSpellcastingModule: CharacterSheetModule<CharacterSheetModuleContext, CharacterSheetModuleOutput> = {
  id: "spellcasting",
  order: 50,
  build: ({ actor, actorId }) => ({
    spellcasting: CharacterSheetCache.getOrCreate(actorId, "spellcasting", () => PF2eCharacterAdapter.spellcasting(actor)),
  }),
};
