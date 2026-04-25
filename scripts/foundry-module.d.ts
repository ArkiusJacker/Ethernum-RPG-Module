import type { EtherAttribute } from './config.js';

/**
 * Augmenta as interfaces globais do foundry-vtt-types com as flags e settings
 * específicas do módulo Ethernum.
 */
declare global {
  // Registra as settings do módulo — necessário para game.settings.register/get/set
  interface SettingConfig {
    "ethernum-rpg-module.longRestFullRestore": boolean;
    "ethernum-rpg-module.showEtherInChat": boolean;
    "ethernum-rpg-module.allowOverride": boolean;
    "ethernum-rpg-module.runeClassDCs": Record<number, number>;
    "ethernum-rpg-module.feCostsPerRank": Record<string, number>;
    "ethernum-rpg-module.schemaVersion": number;
  }

  // Registra as flags do módulo — necessário para actor.getFlag/setFlag
  interface FlagConfig {
    Actor: {
      "ethernum-rpg-module": {
        etherAttributes?: Record<string, EtherAttribute>;
        talents?: Record<string, EtherAttribute>;
        fe?: { current: number; total: number };
        etherSystem?: { etherMax: number; etherCurrent: number; etherPower: number };
        runes?: Array<Record<string, unknown>>;
        maxRuneClass?: number;
        schemaVersion?: number;
        [key: string]: unknown;
      };
    };
  }
}
