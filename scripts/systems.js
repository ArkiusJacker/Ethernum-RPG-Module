/**
 * Ethernum RPG Module - Sistemas de Éter e Runas
 * Classes principais do sistema
 */

import { ETHERNUM } from './config.js';
import { getFECostForRank, getRuneClassDC } from './settings.js';

/**
 * Sistema de Éter (S.E) - Ether System
 * Gerencia atributos de éter do personagem
 * Utiliza sistema de descanso longo (não regeneração)
 */
export class EtherSystem {
  constructor() {
    this.attributes = {
      etherMax: 0,
      etherCurrent: 0,
      etherPower: 0
    };
  }

  /**
   * Calcula o éter máximo baseado nos atributos de éter do personagem
   */
  calculateMaxEther(actor) {
    if (!actor) return 0;
    
    const etherAttributes = actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") || ETHERNUM.DEFAULT_ETHER_ATTRIBUTES;
    
    // Fórmula base: INT + SAB + (soma dos ranks como valor numérico)
    const intValue = etherAttributes.inteligencia?.value || 1;
    const sabValue = etherAttributes.sabedoria?.value || 1;
    const conValue = etherAttributes.constituicao?.value || 1;
    
    const intRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.inteligencia?.rank || "F");
    const sabRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.sabedoria?.rank || "F");
    const conRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.constituicao?.rank || "F");
    
    return 10 + (intValue * 2) + sabValue + conValue + (intRankBonus + sabRankBonus + conRankBonus);
  }

  /**
   * Calcula o poder de éter (afeta rolagens de runas)
   * Baseado no estágio máximo de runa liberado pelo GM
   */
  calculateEtherPower(actor) {
    if (!actor) return 0;
    
    const etherAttributes = actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") || ETHERNUM.DEFAULT_ETHER_ATTRIBUTES;
    const maxRuneClass = actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") || 1;
    
    const intValue = etherAttributes.inteligencia?.value || 1;
    const carValue = etherAttributes.carisma?.value || 1;
    
    const intRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.inteligencia?.rank || "F");
    const carRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.carisma?.rank || "F");
    
    // Poder base + bônus de classe de runa liberada
    return intValue + carValue + intRankBonus + carRankBonus + (maxRuneClass * 2);
  }

  /**
   * Restaura todo o éter (descanso longo)
   */
  async longRest(actor) {
    if (!actor) return;
    
    const maxEther = this.calculateMaxEther(actor);
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", maxEther);
    
    return maxEther;
  }

  /**
   * Verifica se o personagem pode usar uma classe de runa específica
   */
  canUseRuneClass(actor, runeClass) {
    if (!actor) return false;
    const maxAllowed = actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") || 1;
    return runeClass <= maxAllowed;
  }
}

/**
 * Sistema de Runas com 5 Classes
 * Gerencia alocação de runas, custos e mecânica de Override
 */
export class RuneSystem {
  constructor() {
    this.runes = [];
  }

  /**
   * Adiciona uma runa
   */
  addRune(rune) {
    this.runes.push({
      id: foundry.utils.randomID(),
      name: rune.name || "Nova Runa",
      runeClass: rune.runeClass || 1,
      costType: rune.costType || "ether",
      costValue: rune.costValue || 0,
      effect: rune.effect || "",
      description: rune.description || "",
      equipped: rune.equipped || false,
      active: rune.active || true, // GM pode desativar
      ...rune
    });
  }

  /**
   * Remove uma runa
   */
  removeRune(runeId) {
    const index = this.runes.findIndex(r => r.id === runeId);
    if (index > -1) {
      this.runes.splice(index, 1);
    }
  }

  /**
   * Gets the base cost of a rune class
   * NOTE: The rune cost system will be expanded in future versions.
   * New factors will be added to determine the ether cost.
   */
  static getRuneClassCost(runeClass) {
    const costs = {
      1: { ether: 0, description: "Zero ou Mínimo (Passivo)" },
      2: { ether: 2, description: "Baixo (Requer resfriamento curto)" },
      3: { ether: 5, description: "Médio (Teste de Constituição)" },
      4: { ether: 10, description: "Alto (Dano na Vida Máxima ou Corrupção)" },
      5: { ether: 100, description: "Catastrófico (Vida ou Perda do Personagem)" }
    };
    return costs[runeClass] || costs[1];
  }

  /**
   * Gets the DC of a rune class
   * Can be configured by GM or use default value
   */
  static getRuneClassDC(runeClass, customDCs = null) {
    if (customDCs && customDCs[runeClass]) {
      return customDCs[runeClass];
    }
    return getRuneClassDC(runeClass);
  }

  /**
   * Tenta usar Override (usar runa de classe superior)
   * Retorna o resultado do override
   */
  static async attemptOverride(actor, targetRuneClass) {
    if (!actor) return null;
    
    const maxAllowed = actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") || 1;
    
    // Só precisa de override se a classe for maior que a permitida
    if (targetRuneClass <= maxAllowed) {
      return { success: true, override: false };
    }
    
    // Rolagem de teste de resistência (Constituição)
    const etherAttributes = actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") || ETHERNUM.DEFAULT_ETHER_ATTRIBUTES;
    const conValue = etherAttributes.constituicao?.value || 1;
    const conRankBonus = ETHERNUM.ATTRIBUTE_RANK_BONUS[etherAttributes.constituicao?.rank || "F"] || 2;
    
    // DC baseada na classe de runa (configurável pelo GM)
    const dc = this.getRuneClassDC(targetRuneClass);
    
    // Rola 1d20 + Constituição + Rank Bonus
    const totalBonus = conValue + conRankBonus;
    const roll = new Roll(`1d20 + ${totalBonus}`);
    await roll.evaluate({async: true});
    
    const success = roll.total >= dc;
    
    // Exibe a rolagem no chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: `${game.i18n.localize("ETHERNUM.Override.AttemptTitle")} (DC ${dc})<br>CON: ${conValue} + ${conRankBonus} (${etherAttributes.constituicao?.rank || "F"})`
    });
    
    return {
      success: success,
      override: true,
      roll: roll.total,
      dc: dc,
      consequences: success ? "exhaustion" : "catastrophic"
    };
  }
}

/**
 * Sistema de Fichas de Éter (FE)
 * Gerencia a moeda de upgrade para atributos e talentos
 */
export class FESystem {
  /**
   * Calcula o custo total para subir de um nível para outro
   * @param {string} rank - O rank atual
   * @param {number} currentLevel - Nível atual (1-10)
   * @param {number} targetLevel - Nível desejado (1-10)
   * @returns {number} - O custo total em FE
   */
  static calculateUpgradeCost(rank, currentLevel, targetLevel) {
    if (targetLevel <= currentLevel) return 0;
    if (targetLevel > ETHERNUM.MAX_LEVEL) targetLevel = ETHERNUM.MAX_LEVEL;
    
    const costPerLevel = getFECostForRank(rank);
    const levelsToUpgrade = targetLevel - currentLevel;
    
    return costPerLevel * levelsToUpgrade;
  }

  /**
   * Calcula o custo para subir de rank
   * Quando o nível chega a 10, pode subir de rank começando do nível 1
   * @param {string} currentRank - Rank atual
   * @returns {object} - { nextRank, cost, possible }
   */
  static calculateRankUpCost(currentRank) {
    const rankIndex = ETHERNUM.RANKS.indexOf(currentRank);
    
    // Já está no rank máximo
    if (rankIndex >= ETHERNUM.RANKS.length - 1) {
      return { nextRank: null, cost: 0, possible: false };
    }
    
    const nextRank = ETHERNUM.RANKS[rankIndex + 1];
    // O custo para subir de rank é o custo do primeiro nível do próximo rank
    const cost = getFECostForRank(nextRank);
    
    return { nextRank, cost, possible: true };
  }

  /**
   * Tenta fazer upgrade de um atributo
   * @param {Actor} actor - O ator
   * @param {string} attrKey - A chave do atributo (ex: "forca")
   * @param {number} levelsToGain - Quantidade de níveis para ganhar
   * @returns {object} - { success, message, newValue, newRank, feCost }
   */
  static async upgradeAttribute(actor, attrKey, levelsToGain = 1) {
    if (!actor || !attrKey || levelsToGain < 1) {
      return { success: false, message: game.i18n.localize("ETHERNUM.FE.InvalidParams") };
    }

    const fe = actor.getFlag(ETHERNUM.MODULE_NAME, "fe") || { ...ETHERNUM.DEFAULT_FE };
    const etherAttributes = actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") || { ...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES };
    
    if (!etherAttributes[attrKey]) {
      return { success: false, message: game.i18n.localize("ETHERNUM.FE.AttributeNotFound") };
    }

    const attr = etherAttributes[attrKey];
    let currentLevel = attr.value || 1;
    let currentRank = attr.rank || "F";
    let remainingLevels = levelsToGain;
    let totalCost = 0;

    // Simula os upgrades para calcular o custo total
    while (remainingLevels > 0) {
      const targetLevel = Math.min(currentLevel + remainingLevels, ETHERNUM.MAX_LEVEL);
      const cost = this.calculateUpgradeCost(currentRank, currentLevel, targetLevel);
      totalCost += cost;
      
      const levelsGained = targetLevel - currentLevel;
      remainingLevels -= levelsGained;
      currentLevel = targetLevel;

      // Se atingiu o nível máximo e ainda tem níveis para ganhar, tenta subir de rank
      if (currentLevel >= ETHERNUM.MAX_LEVEL && remainingLevels > 0) {
        const rankUpInfo = this.calculateRankUpCost(currentRank);
        if (!rankUpInfo.possible) {
          break; // Não pode subir mais de rank
        }
        totalCost += rankUpInfo.cost;
        currentRank = rankUpInfo.nextRank;
        currentLevel = 1;
        remainingLevels--; // O rank up conta como 1 nível
      }
    }

    // Verifica se tem FE suficiente
    if (fe.current < totalCost) {
      return { 
        success: false, 
        message: game.i18n.format("ETHERNUM.FE.NotEnough", { cost: totalCost, current: fe.current }),
        feCost: totalCost
      };
    }

    // Aplica o upgrade
    const newFE = {
      current: fe.current - totalCost,
      total: fe.total
    };

    etherAttributes[attrKey] = {
      value: currentLevel,
      rank: currentRank,
      points: attr.points || 0
    };

    await actor.setFlag(ETHERNUM.MODULE_NAME, "fe", newFE);
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherAttributes", etherAttributes);

    return {
      success: true,
      message: game.i18n.format("ETHERNUM.FE.UpgradeSuccess", { attr: attrKey }),
      newValue: currentLevel,
      newRank: currentRank,
      feCost: totalCost
    };
  }

  /**
   * Tenta fazer upgrade de um talento
   * @param {Actor} actor - O ator
   * @param {string} talentKey - A chave do talento
   * @param {number} levelsToGain - Quantidade de níveis para ganhar
   * @returns {object} - { success, message, newValue, newRank, feCost }
   */
  static async upgradeTalent(actor, talentKey, levelsToGain = 1) {
    if (!actor || !talentKey || levelsToGain < 1) {
      return { success: false, message: game.i18n.localize("ETHERNUM.FE.InvalidParams") };
    }

    const fe = actor.getFlag(ETHERNUM.MODULE_NAME, "fe") || { ...ETHERNUM.DEFAULT_FE };
    const talents = actor.getFlag(ETHERNUM.MODULE_NAME, "talents") || { ...ETHERNUM.DEFAULT_TALENTS };
    
    if (!talents[talentKey]) {
      return { success: false, message: game.i18n.localize("ETHERNUM.FE.TalentNotFound") };
    }

    const talent = talents[talentKey];
    let currentLevel = talent.value || 1;
    let currentRank = talent.rank || "F";
    let remainingLevels = levelsToGain;
    let totalCost = 0;

    // Simula os upgrades para calcular o custo total
    while (remainingLevels > 0) {
      const targetLevel = Math.min(currentLevel + remainingLevels, ETHERNUM.MAX_LEVEL);
      const cost = this.calculateUpgradeCost(currentRank, currentLevel, targetLevel);
      totalCost += cost;
      
      const levelsGained = targetLevel - currentLevel;
      remainingLevels -= levelsGained;
      currentLevel = targetLevel;

      // Se atingiu o nível máximo e ainda tem níveis para ganhar, tenta subir de rank
      if (currentLevel >= ETHERNUM.MAX_LEVEL && remainingLevels > 0) {
        const rankUpInfo = this.calculateRankUpCost(currentRank);
        if (!rankUpInfo.possible) {
          break;
        }
        totalCost += rankUpInfo.cost;
        currentRank = rankUpInfo.nextRank;
        currentLevel = 1;
        remainingLevels--;
      }
    }

    // Verifica se tem FE suficiente
    if (fe.current < totalCost) {
      return { 
        success: false, 
        message: game.i18n.format("ETHERNUM.FE.NotEnough", { cost: totalCost, current: fe.current }),
        feCost: totalCost
      };
    }

    // Aplica o upgrade
    const newFE = {
      current: fe.current - totalCost,
      total: fe.total
    };

    talents[talentKey] = {
      value: currentLevel,
      rank: currentRank,
      points: talent.points || 0
    };

    await actor.setFlag(ETHERNUM.MODULE_NAME, "fe", newFE);
    await actor.setFlag(ETHERNUM.MODULE_NAME, "talents", talents);

    return {
      success: true,
      message: game.i18n.format("ETHERNUM.FE.UpgradeSuccess", { attr: talentKey }),
      newValue: currentLevel,
      newRank: currentRank,
      feCost: totalCost
    };
  }

  /**
   * Adiciona FE ao jogador (apenas GM)
   * @param {Actor} actor - O ator
   * @param {number} amount - Quantidade de FE a adicionar
   */
  static async addFE(actor, amount) {
    if (!actor || amount <= 0) return { success: false };

    const fe = actor.getFlag(ETHERNUM.MODULE_NAME, "fe") || { ...ETHERNUM.DEFAULT_FE };
    
    const newFE = {
      current: fe.current + amount,
      total: fe.total + amount
    };

    await actor.setFlag(ETHERNUM.MODULE_NAME, "fe", newFE);

    return { success: true, newCurrent: newFE.current, newTotal: newFE.total };
  }

  /**
   * Define o FE do jogador (apenas GM)
   * @param {Actor} actor - O ator
   * @param {number} amount - Nova quantidade de FE
   */
  static async setFE(actor, amount) {
    if (!actor || amount < 0) return { success: false };

    const fe = actor.getFlag(ETHERNUM.MODULE_NAME, "fe") || { ...ETHERNUM.DEFAULT_FE };
    
    const newFE = {
      current: amount,
      total: Math.max(fe.total, amount)
    };

    await actor.setFlag(ETHERNUM.MODULE_NAME, "fe", newFE);

    return { success: true, newCurrent: newFE.current };
  }
}

/**
 * Calculadora de Dados com Sistema de Talentos e Ranks
 * Fórmula: Talento + Rank do Talento + Atributo + Rank do Atributo
 * Usando os bônus específicos: Atributo (F=2...K=20), Talento (F=3...K=25)
 */
export class EthernumDiceCalculator {
  /**
   * Converte rank de atributo para bônus numérico
   * F=+2, E=+4, D=+6, C=+8, B=+10, A=+12, S=+15, K=+20
   */
  static attributeRankToBonus(rank) {
    return ETHERNUM.ATTRIBUTE_RANK_BONUS[rank || "F"] || 2;
  }

  /**
   * Converte rank de talento para bônus numérico
   * F=+3, E=+6, D=+9, C=+12, B=+15, A=+18, S=+21, K=+25
   */
  static talentRankToBonus(rank) {
    return ETHERNUM.TALENT_RANK_BONUS[rank || "F"] || 3;
  }

  /**
   * Rola dados usando o sistema de talentos
   * Fórmula: 1d20 + Talento(valor) + RankTalento(bônus) + Atributo(valor) + RankAtributo(bônus)
   */
  static async rollWithTalent(actor, talentKey, attributeKey, options = {}) {
    if (!actor) {
      ui.notifications.error(game.i18n.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }

    const talents = actor.getFlag(ETHERNUM.MODULE_NAME, "talents") || ETHERNUM.DEFAULT_TALENTS;
    const etherAttributes = actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") || ETHERNUM.DEFAULT_ETHER_ATTRIBUTES;

    const talent = talents[talentKey] || { value: 1, rank: "F" };
    const attribute = etherAttributes[attributeKey] || { value: 1, rank: "F" };

    const talentValue = talent.value || 1;
    const talentRankBonus = this.talentRankToBonus(talent.rank);
    const attrValue = attribute.value || 1;
    const attrRankBonus = this.attributeRankToBonus(attribute.rank);

    // Fórmula: 1d20 + talento + rankTalento(bônus) + atributo + rankAtributo(bônus)
    const totalBonus = talentValue + talentRankBonus + attrValue + attrRankBonus;
    const formula = `1d20 + ${totalBonus}`;
    
    const roll = new Roll(formula);
    await roll.evaluate({async: true});

    // Monta o flavor text com detalhes
    const flavorParts = [
      game.i18n.localize("ETHERNUM.Calculator.TalentRoll"),
      `${game.i18n.localize("ETHERNUM.Talent." + talentKey) || talentKey}: ${talentValue} + ${talentRankBonus} (${talent.rank})`,
      `${game.i18n.localize("ETHERNUM.Attribute." + attributeKey) || attributeKey}: ${attrValue} + ${attrRankBonus} (${attribute.rank})`,
      `<strong>Total: 1d20 + ${totalBonus}</strong>`
    ];

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: flavorParts.join("<br>")
    });

    return roll;
  }

  /**
   * Rola uma runa específica com verificação de classe
   */
  static async rollRune(actor, rune) {
    if (!actor || !rune) {
      ui.notifications.error(game.i18n.localize("ETHERNUM.Errors.InvalidRune"));
      return null;
    }

    // Verifica se a runa está ativa (permitida pelo GM)
    if (!rune.active) {
      ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.RuneDisabled"));
      return null;
    }

    // Verifica se pode usar esta classe de runa
    const maxAllowed = actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") || 1;
    const runeClass = rune.runeClass || 1;

    // Se a classe da runa for maior que a permitida, tenta Override
    if (runeClass > maxAllowed) {
      const overrideResult = await RuneSystem.attemptOverride(actor, runeClass);
      
      if (!overrideResult.success) {
        // Override falhou - consequências catastróficas
        await this._handleOverrideFailure(actor, rune);
        return null;
      } else {
        // Override bem-sucedido - aplica consequências de exaustão
        await this._handleOverrideSuccess(actor, rune);
      }
    }

    // Verifica custo de éter
    const etherSystem = actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") || {};
    const currentEther = etherSystem.etherCurrent || 0;
    const etherCost = RuneSystem.getRuneClassCost(runeClass).ether + (rune.costValue || 0);

    if (currentEther < etherCost && etherCost > 0) {
      ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.NotEnoughEther"));
      return null;
    }

    // Consome o éter
    if (etherCost > 0) {
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", currentEther - etherCost);
    }

    // Calcula poder da runa baseado em atributos
    const etherPower = new EtherSystem().calculateEtherPower(actor);
    
    // Rola o efeito da runa
    const formula = `1d20 + ${etherPower}`;
    const roll = new Roll(formula);
    await roll.evaluate({async: true});

    // Constrói mensagem detalhada
    const runeClassInfo = ETHERNUM.RUNE_CLASSES[runeClass];
    const flavorParts = [
      `<strong>${game.i18n.localize("ETHERNUM.Rune.Activated")}: ${rune.name}</strong>`,
      `<em>${game.i18n.localize("ETHERNUM.Rune.Class")}: ${runeClassInfo?.name || runeClass}</em>`,
      `${game.i18n.localize("ETHERNUM.EtherCost")}: ${etherCost}`,
      rune.effect ? `<small>${rune.effect}</small>` : ""
    ].filter(Boolean);

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: flavorParts.join("<br>")
    });

    return roll;
  }

  /**
   * Lida com falha de Override
   */
  static async _handleOverrideFailure(actor, rune) {
    // Cria mensagem de falha catastrófica
    const content = `
      <div class="ethernum-override-failure">
        <h3>${game.i18n.localize("ETHERNUM.Override.FailureTitle")}</h3>
        <p>${game.i18n.localize("ETHERNUM.Override.FailureDescription")}</p>
        <ul>
          <li>${game.i18n.localize("ETHERNUM.Override.Consequence1")}</li>
          <li>${game.i18n.localize("ETHERNUM.Override.Consequence2")}</li>
        </ul>
      </div>
    `;
    
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });

    ui.notifications.error(game.i18n.localize("ETHERNUM.Override.FailureNotification"));
  }

  /**
   * Lida com sucesso de Override (com consequências)
   */
  static async _handleOverrideSuccess(actor, rune) {
    // Aplica Exaustão Nível 3 (ou equivalente)
    const content = `
      <div class="ethernum-override-success">
        <h3>${game.i18n.localize("ETHERNUM.Override.SuccessTitle")}</h3>
        <p>${game.i18n.localize("ETHERNUM.Override.SuccessDescription")}</p>
        <p><strong>${game.i18n.localize("ETHERNUM.Override.Exhaustion")}</strong></p>
      </div>
    `;
    
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });

    ui.notifications.warn(game.i18n.localize("ETHERNUM.Override.SuccessNotification"));
  }
}
