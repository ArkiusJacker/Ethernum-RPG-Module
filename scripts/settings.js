/**
 * Ethernum RPG Module - Configurações do Foundry VTT
 * Registro de settings e configurações do módulo
 */

import { ETHERNUM } from './config.js';

/**
 * Registra todas as configurações do módulo
 */
export function registerSettings() {
  // Descanso longo restaura todo o éter
  game.settings.register(ETHERNUM.MODULE_NAME, "longRestFullRestore", {
    name: "ETHERNUM.Settings.LongRestFullRestore.Name",
    hint: "ETHERNUM.Settings.LongRestFullRestore.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Mostrar éter no chat
  game.settings.register(ETHERNUM.MODULE_NAME, "showEtherInChat", {
    name: "ETHERNUM.Settings.ShowEtherInChat.Name",
    hint: "ETHERNUM.Settings.ShowEtherInChat.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Permitir Override (usar runas de classe superior)
  game.settings.register(ETHERNUM.MODULE_NAME, "allowOverride", {
    name: "ETHERNUM.Settings.AllowOverride.Name",
    hint: "ETHERNUM.Settings.AllowOverride.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // CDs configuráveis por classe de runa
  game.settings.register(ETHERNUM.MODULE_NAME, "runeClassDCs", {
    name: "ETHERNUM.Settings.RuneClassDCs.Name",
    hint: "ETHERNUM.Settings.RuneClassDCs.Hint",
    scope: "world",
    config: false, // Configurado via UI própria
    type: Object,
    default: {
      1: 15,
      2: 20,
      3: 30,
      4: 40,
      5: 50
    }
  });

  // Custos de FE por rank (personalizáveis pelo GM)
  game.settings.register(ETHERNUM.MODULE_NAME, "feCostsPerRank", {
    name: "ETHERNUM.Settings.FECostsPerRank.Name",
    hint: "ETHERNUM.Settings.FECostsPerRank.Hint",
    scope: "world",
    config: false, // Configurado via UI própria
    type: Object,
    default: {
      "F": 100,
      "E": 200,
      "D": 400,
      "C": 800,
      "B": 1600,
      "A": 3200,
      "S": 6400,
      "K": 12800
    }
  });

  console.log("Ethernum RPG Module | Settings registradas");
}

/**
 * Obtém o custo de FE para um nível específico em um rank
 * @param {string} rank - O rank atual (F, E, D, etc.)
 * @returns {number} - O custo em FE por nível
 */
export function getFECostForRank(rank) {
  try {
    const customCosts = game.settings.get(ETHERNUM.MODULE_NAME, "feCostsPerRank");
    return customCosts[rank] || ETHERNUM.FE_COST_PER_LEVEL[rank] || 100;
  } catch (e) {
    return ETHERNUM.FE_COST_PER_LEVEL[rank] || 100;
  }
}

/**
 * Obtém a DC de uma classe de runa
 * @param {number} runeClass - A classe da runa (1-5)
 * @returns {number} - O CD de dificuldade
 */
export function getRuneClassDC(runeClass) {
  try {
    const customDCs = game.settings.get(ETHERNUM.MODULE_NAME, "runeClassDCs");
    return customDCs[runeClass] || ETHERNUM.RUNE_CLASSES[runeClass]?.defaultDC || 15;
  } catch (e) {
    return ETHERNUM.RUNE_CLASSES[runeClass]?.defaultDC || 15;
  }
}
