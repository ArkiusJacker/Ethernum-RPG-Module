import { CharacterCombatModule } from "./CharacterCombat.js";
import { CharacterEffectsModule } from "./CharacterEffects.js";
import { CharacterFeatsModule } from "./CharacterFeats.js";
import { CharacterHeaderModule } from "./CharacterHeader.js";
import { CharacterInventoryModule } from "./CharacterInventory.js";
import { CharacterOverviewModule } from "./CharacterOverview.js";
import { CharacterSpellcastingModule } from "./CharacterSpellcasting.js";
import { EthernumSystemsModule } from "./EthernumSystems.js";
import { UniqueMechanicPanelModule } from "./UniqueMechanicPanel.js";

export const DEFAULT_CHARACTER_SHEET_MODULES = [
  CharacterHeaderModule,
  CharacterOverviewModule,
  CharacterCombatModule,
  CharacterInventoryModule,
  CharacterSpellcastingModule,
  CharacterFeatsModule,
  CharacterEffectsModule,
  UniqueMechanicPanelModule,
  EthernumSystemsModule,
];
