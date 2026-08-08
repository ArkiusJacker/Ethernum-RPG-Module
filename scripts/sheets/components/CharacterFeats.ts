import { PF2eCharacterAdapter } from "../../core/PF2eCharacterAdapter.js";
import type { CharacterSheetModule } from "../core/CharacterSheetModuleRegistry.js";
import { CharacterSheetCache } from "../core/CharacterSheetCache.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "./types.js";

export const CharacterFeatsModule: CharacterSheetModule<CharacterSheetModuleContext, CharacterSheetModuleOutput> = {
  id: "feats",
  order: 60,
  build: ({ actor, actorId }) => ({
    feats: CharacterSheetCache.getOrCreate(actorId, "feats", () => PF2eCharacterAdapter.feats(actor)),
  }),
};
