import { PF2eCharacterAdapter } from "../../core/PF2eCharacterAdapter.js";
import type { CharacterSheetModule } from "../core/CharacterSheetModuleRegistry.js";
import { CharacterSheetCache } from "../core/CharacterSheetCache.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "./types.js";

export const CharacterHeaderModule: CharacterSheetModule<CharacterSheetModuleContext, CharacterSheetModuleOutput> = {
  id: "header",
  order: 10,
  build: ({ actor, actorId }) => ({
    identity: CharacterSheetCache.getOrCreate(actorId, "identity", () => PF2eCharacterAdapter.identity(actor)),
    vitals: CharacterSheetCache.getOrCreate(actorId, "vitals", () => PF2eCharacterAdapter.vitals(actor)),
  }),
};
