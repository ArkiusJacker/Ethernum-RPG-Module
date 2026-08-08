import type { CampaignCoreId } from "../../config.js";
import type { ResolvedCharacterSheetMode } from "../core/CharacterSheetRegistry.js";

export interface CharacterSheetModuleContext {
  actor: Actor;
  actorId: string;
  core: CampaignCoreId;
  sheetId: ResolvedCharacterSheetMode;
  isGM: boolean;
}

export type CharacterSheetModuleOutput = Record<string, unknown>;
