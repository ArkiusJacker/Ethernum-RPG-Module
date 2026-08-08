import { PF2eCharacterAdapter } from "../../core/PF2eCharacterAdapter.js";
import type { CharacterSheetModule } from "../core/CharacterSheetModuleRegistry.js";
import { CharacterSheetCache } from "../core/CharacterSheetCache.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "./types.js";

export const CharacterEffectsModule: CharacterSheetModule<CharacterSheetModuleContext, CharacterSheetModuleOutput> = {
  id: "effects",
  order: 70,
  build: ({ actor, actorId }) => ({
    effects: CharacterSheetCache.getOrCreate(actorId, "effects", () => PF2eCharacterAdapter.effects(actor)),
  }),
};
