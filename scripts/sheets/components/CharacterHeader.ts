import { PF2eCharacterAdapter } from "../../core/PF2eCharacterAdapter.js";
import { CompanyIdentityService } from "../../company/CompanyIdentityService.js";
import type { CharacterSheetModule } from "../core/CharacterSheetModuleRegistry.js";
import { CharacterSheetCache } from "../core/CharacterSheetCache.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "./types.js";

export const CharacterHeaderModule: CharacterSheetModule<CharacterSheetModuleContext, CharacterSheetModuleOutput> = {
  id: "header",
  order: 10,
  build: ({ actor, actorId }) => ({
    identity: CharacterSheetCache.getOrCreate(actorId, "identity", () => PF2eCharacterAdapter.identity(actor)),
    companyIdentity: CharacterSheetCache.getOrCreate(
      actorId,
      "company-identity",
      () => CompanyIdentityService.resolve(actor),
    ),
    vitals: CharacterSheetCache.getOrCreate(actorId, "vitals", () => PF2eCharacterAdapter.vitals(actor)),
  }),
};
