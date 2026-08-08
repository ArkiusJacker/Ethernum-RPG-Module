import { UniqueMechanicPresentationService } from "../../unique/services/UniqueMechanicPresentationService.js";
import type { CharacterSheetModule } from "../core/CharacterSheetModuleRegistry.js";
import { CharacterSheetCache } from "../core/CharacterSheetCache.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "./types.js";

export const UniqueMechanicPanelModule: CharacterSheetModule<CharacterSheetModuleContext, CharacterSheetModuleOutput> = {
  id: "unique",
  order: 80,
  build: ({ actor, actorId, isGM }) => {
    const presentation = CharacterSheetCache.getOrCreate(
      actorId,
      "unique",
      () => UniqueMechanicPresentationService.build(actor, isGM),
    );
    return {
      uniqueMechanic: { ...presentation.data, ...presentation },
      uniqueMechanics: presentation.data,
    };
  },
};
