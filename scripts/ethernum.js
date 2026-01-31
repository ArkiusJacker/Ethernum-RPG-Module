/**
 * Ethernum RPG Module - Sistema de Éter
 * Sistema de atributos separado para Pathfinder 2E
 * Inclui sistema de Classes de Runa (5 níveis) e atributos de éter com ranks
 */

// Module namespace
const ETHERNUM = {
  MODULE_NAME: "ethernum-rpg-module",
  TEMPLATE_PATH: "modules/ethernum-rpg-module/templates/",
  
  // Rank progression system: F -> E -> D -> C -> B -> A -> S -> K
  RANKS: ["F", "E", "D", "C", "B", "A", "S", "K"],
  
  // Rune Classes
  RUNE_CLASSES: {
    1: {
      name: "Ancoragem",
      nameEn: "Anchoring",
      cost: "zero",
      focus: "Defesa Pessoal, Buff de Atributo, Dano ao Toque",
      visual: "Tatuagens/runas brilham levemente na pele"
    },
    2: {
      name: "Projeção",
      nameEn: "Projection",
      cost: "baixo",
      focus: "Ataques à Distância (Alvo Único), Utilitário de Curto Alcance",
      visual: "Éter sai do corpo (fumaça, luz, som)"
    },
    3: {
      name: "Manifestação",
      nameEn: "Manifestation",
      cost: "médio",
      focus: "Área de Efeito (AoE), Controle de Multidão, Alteração de Terreno",
      visual: "Ambiente reage: chão treme, ar muda temperatura, luzes estouram"
    },
    4: {
      name: "Disrupção",
      nameEn: "Disruption",
      cost: "alto",
      focus: "Efeitos Permanentes, Invulnerabilidade Temporária, Criação de Matéria",
      visual: "Dano direto na Vida Máxima ou Corrupção garantida"
    },
    5: {
      name: "Horizonte de Eventos",
      nameEn: "Event Horizon",
      cost: "catastrófico",
      focus: "Reescrever a Narrativa/Realidade",
      visual: "Fim de Jogo - vida do usuário ou perda do personagem"
    }
  },
  
  // Min and max rune class constants
  MIN_RUNE_CLASS: 1,
  MAX_RUNE_CLASS: 5,
  
  // Default ether attributes
  DEFAULT_ETHER_ATTRIBUTES: {
    forca: { value: 1, rank: "F", points: 0 },
    destreza: { value: 1, rank: "F", points: 0 },
    constituicao: { value: 1, rank: "F", points: 0 },
    inteligencia: { value: 1, rank: "F", points: 0 },
    sabedoria: { value: 1, rank: "F", points: 0 },
    carisma: { value: 1, rank: "F", points: 0 }
  },
  
  // Default talents
  DEFAULT_TALENTS: {
    investigacao: { value: 1, rank: "F", points: 0 },
    percepcao: { value: 1, rank: "F", points: 0 },
    furtividade: { value: 1, rank: "F", points: 0 },
    atletismo: { value: 1, rank: "F", points: 0 },
    acrobacia: { value: 1, rank: "F", points: 0 },
    intimidacao: { value: 1, rank: "F", points: 0 },
    persuasao: { value: 1, rank: "F", points: 0 },
    enganacao: { value: 1, rank: "F", points: 0 },
    medicina: { value: 1, rank: "F", points: 0 },
    sobrevivencia: { value: 1, rank: "F", points: 0 },
    arcanismo: { value: 1, rank: "F", points: 0 },
    religiao: { value: 1, rank: "F", points: 0 },
    natureza: { value: 1, rank: "F", points: 0 },
    sociedade: { value: 1, rank: "F", points: 0 },
    ocultismo: { value: 1, rank: "F", points: 0 }
  }
};

/**
 * Sistema de Éter (S.E) - Ether System
 * Gerencia atributos de éter do personagem
 * Utiliza sistema de descanso longo (não regeneração)
 */
class EtherSystem {
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
class RuneSystem {
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
   * Obtém o custo base de uma classe de runa
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
    const conRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.constituicao?.rank || "F");
    
    // DC baseada na classe de runa
    const dc = 10 + (targetRuneClass * 5);
    
    // Rola 1d20 + Constituição + Rank
    const roll = new Roll(`1d20 + ${conValue} + ${conRankBonus}`);
    await roll.evaluate({async: true});
    
    const success = roll.total >= dc;
    
    // Exibe a rolagem no chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: `${game.i18n.localize("ETHERNUM.Override.AttemptTitle")} (DC ${dc})`
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
 * Calculadora de Dados com Sistema de Talentos e Ranks
 * Fórmula: Talento + Rank do Talento + Atributo + Rank do Atributo
 */
class EthernumDiceCalculator {
  /**
   * Converte rank para valor numérico
   */
  static rankToValue(rank) {
    return ETHERNUM.RANKS.indexOf(rank || "F");
  }

  /**
   * Rola dados usando o sistema de talentos
   * Fórmula: 1d20 + Talento + RankTalento + Atributo + RankAtributo
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
    const talentRank = this.rankToValue(talent.rank);
    const attrValue = attribute.value || 1;
    const attrRank = this.rankToValue(attribute.rank);

    // Fórmula: 1d20 + talento + rankTalento + atributo + rankAtributo
    const formula = `1d20 + ${talentValue} + ${talentRank} + ${attrValue} + ${attrRank}`;
    
    const roll = new Roll(formula);
    await roll.evaluate({async: true});

    // Monta o flavor text com detalhes
    const flavorParts = [
      game.i18n.localize("ETHERNUM.Calculator.TalentRoll"),
      `${game.i18n.localize("ETHERNUM.Talent." + talentKey) || talentKey}: ${talentValue} (${talent.rank})`,
      `${game.i18n.localize("ETHERNUM.Attribute." + attributeKey) || attributeKey}: ${attrValue} (${attribute.rank})`
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

/**
 * Registro de Handlebars Helpers
 */
function registerHandlebarsHelpers() {
  Handlebars.registerHelper('ethernum-concat', function(...args) {
    args.pop(); // Remove o objeto de opções do Handlebars
    return args.join('');
  });

  Handlebars.registerHelper('ethernum-eq', function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper('ethernum-gt', function(a, b) {
    return a > b;
  });

  Handlebars.registerHelper('ethernum-lte', function(a, b) {
    return a <= b;
  });

  Handlebars.registerHelper('ethernum-rankIndex', function(rank) {
    return ETHERNUM.RANKS.indexOf(rank || "F");
  });

  Handlebars.registerHelper('ethernum-ranks', function() {
    return ETHERNUM.RANKS;
  });

  Handlebars.registerHelper('ethernum-runeClasses', function() {
    return ETHERNUM.RUNE_CLASSES;
  });
}

/**
 * Adiciona abas de Éter (Atributos e Runas) à ficha de personagem
 */
Hooks.on("renderActorSheet", async (app, html, data) => {
  if (app.actor.type !== "character") return;

  // Adiciona as abas de Éter
  const tabs = html.find('.sheet-navigation.tabs');
  if (tabs.length === 0) return;

  const actor = app.actor;
  const isGM = game.user.isGM;

  // Adiciona botões das abas (Atributos de Éter e Runas)
  tabs.append(`
    <a class="item" data-tab="ethernum-attributes">
      <i class="fas fa-user-shield"></i> ${game.i18n.localize("ETHERNUM.Tabs.EtherAttributes")}
    </a>
    <a class="item" data-tab="ethernum-runes">
      <i class="fas fa-gem"></i> ${game.i18n.localize("ETHERNUM.Tabs.RuneSystem")}
    </a>
  `);

  // Inicializa o sistema de éter se não existir
  let etherSystem = actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem");
  if (!etherSystem) {
    const ether = new EtherSystem();
    etherSystem = {
      etherMax: ether.calculateMaxEther(actor),
      etherCurrent: ether.calculateMaxEther(actor),
      etherPower: ether.calculateEtherPower(actor)
    };
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem", etherSystem);
  }

  // Inicializa atributos de éter se não existir
  let etherAttributes = actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes");
  if (!etherAttributes) {
    etherAttributes = {...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES};
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherAttributes", etherAttributes);
  }

  // Inicializa talentos se não existir
  let talents = actor.getFlag(ETHERNUM.MODULE_NAME, "talents");
  if (!talents) {
    talents = {...ETHERNUM.DEFAULT_TALENTS};
    await actor.setFlag(ETHERNUM.MODULE_NAME, "talents", talents);
  }

  // Inicializa classe máxima de runa (apenas GM pode alterar)
  let maxRuneClass = actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass");
  if (maxRuneClass === undefined) {
    maxRuneClass = 1;
    await actor.setFlag(ETHERNUM.MODULE_NAME, "maxRuneClass", maxRuneClass);
  }

  // Carrega as runas
  let runes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];

  // Dados para os templates
  const templateData = {
    actor: actor,
    etherSystem: etherSystem,
    etherAttributes: etherAttributes,
    talents: talents,
    runes: runes,
    maxRuneClass: maxRuneClass,
    isGM: isGM,
    ranks: ETHERNUM.RANKS,
    runeClasses: ETHERNUM.RUNE_CLASSES
  };

  // Renderiza os templates
  const attributesTemplate = await renderTemplate(
    `${ETHERNUM.TEMPLATE_PATH}ether-attributes-tab.html`,
    templateData
  );

  const runesTemplate = await renderTemplate(
    `${ETHERNUM.TEMPLATE_PATH}ether-runes-tab.html`,
    templateData
  );

  // Adiciona o conteúdo das abas
  html.find('.sheet-body').append(`
    <div class="tab" data-tab="ethernum-attributes">
      ${attributesTemplate}
    </div>
    <div class="tab" data-tab="ethernum-runes">
      ${runesTemplate}
    </div>
  `);

  // ===== EVENT LISTENERS =====

  // ---- Aba de Atributos ----

  // Recalcular éter
  html.find('.ethernum-recalculate').click(async (ev) => {
    ev.preventDefault();
    const ether = new EtherSystem();
    const newEtherSystem = {
      etherMax: ether.calculateMaxEther(actor),
      etherCurrent: Math.min(etherSystem.etherCurrent, ether.calculateMaxEther(actor)),
      etherPower: ether.calculateEtherPower(actor)
    };
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem", newEtherSystem);
    app.render();
  });

  // Descanso longo (restaura todo o éter)
  html.find('.ethernum-long-rest').click(async (ev) => {
    ev.preventDefault();
    const ether = new EtherSystem();
    const maxEther = ether.calculateMaxEther(actor);
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", maxEther);
    ui.notifications.info(game.i18n.localize("ETHERNUM.Notifications.LongRestComplete"));
    app.render();
  });

  // Alterar éter atual
  html.find('.ethernum-ether-input').change(async (ev) => {
    const value = parseInt(ev.target.value) || 0;
    const max = etherSystem.etherMax || 0;
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", Math.min(Math.max(0, value), max));
    app.render();
  });

  // Alterar atributo de éter (valor)
  html.find('.ethernum-attr-value').change(async (ev) => {
    const attrKey = $(ev.currentTarget).data('attr');
    const value = Math.max(1, Math.min(10, parseInt(ev.target.value) || 1));
    
    const currentAttrs = actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") || {...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES};
    if (currentAttrs[attrKey]) {
      currentAttrs[attrKey].value = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherAttributes", currentAttrs);
      
      // Recalcula éter automaticamente
      const ether = new EtherSystem();
      const newEtherSystem = {
        etherMax: ether.calculateMaxEther(actor),
        etherCurrent: Math.min(etherSystem.etherCurrent, ether.calculateMaxEther(actor)),
        etherPower: ether.calculateEtherPower(actor)
      };
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem", newEtherSystem);
      app.render();
    }
  });

  // Alterar atributo de éter (rank)
  html.find('.ethernum-attr-rank').change(async (ev) => {
    const attrKey = $(ev.currentTarget).data('attr');
    const rank = ev.target.value;
    
    const currentAttrs = actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") || {...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES};
    if (currentAttrs[attrKey]) {
      currentAttrs[attrKey].rank = rank;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherAttributes", currentAttrs);
      
      // Recalcula éter automaticamente
      const ether = new EtherSystem();
      const newEtherSystem = {
        etherMax: ether.calculateMaxEther(actor),
        etherCurrent: Math.min(etherSystem.etherCurrent, ether.calculateMaxEther(actor)),
        etherPower: ether.calculateEtherPower(actor)
      };
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem", newEtherSystem);
      app.render();
    }
  });

  // Alterar talento (valor)
  html.find('.ethernum-talent-value').change(async (ev) => {
    const talentKey = $(ev.currentTarget).data('talent');
    const value = Math.max(1, Math.min(10, parseInt(ev.target.value) || 1));
    
    const currentTalents = actor.getFlag(ETHERNUM.MODULE_NAME, "talents") || {...ETHERNUM.DEFAULT_TALENTS};
    if (currentTalents[talentKey]) {
      currentTalents[talentKey].value = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "talents", currentTalents);
      app.render();
    }
  });

  // Alterar talento (rank)
  html.find('.ethernum-talent-rank').change(async (ev) => {
    const talentKey = $(ev.currentTarget).data('talent');
    const rank = ev.target.value;
    
    const currentTalents = actor.getFlag(ETHERNUM.MODULE_NAME, "talents") || {...ETHERNUM.DEFAULT_TALENTS};
    if (currentTalents[talentKey]) {
      currentTalents[talentKey].rank = rank;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "talents", currentTalents);
      app.render();
    }
  });

  // Rolar talento
  html.find('.ethernum-roll-talent').click(async (ev) => {
    ev.preventDefault();
    const talentKey = $(ev.currentTarget).data('talent');
    const attrKey = $(ev.currentTarget).data('attr');
    await EthernumDiceCalculator.rollWithTalent(actor, talentKey, attrKey);
  });

  // ---- Aba de Runas ----

  // GM: Alterar classe máxima de runa permitida
  html.find('.ethernum-max-rune-class').change(async (ev) => {
    if (!isGM) return;
    const value = Math.max(ETHERNUM.MIN_RUNE_CLASS, Math.min(ETHERNUM.MAX_RUNE_CLASS, parseInt(ev.target.value) || ETHERNUM.MIN_RUNE_CLASS));
    await actor.setFlag(ETHERNUM.MODULE_NAME, "maxRuneClass", value);
    
    // Recalcula poder de éter
    const ether = new EtherSystem();
    const currentEther = actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") || {};
    const newEtherSystem = {
      ...currentEther,
      etherPower: ether.calculateEtherPower(actor)
    };
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem", newEtherSystem);
    app.render();
  });

  // Adicionar nova runa
  html.find('.ethernum-add-rune').click(async (ev) => {
    ev.preventDefault();
    const currentRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
    currentRunes.push({
      id: foundry.utils.randomID(),
      name: game.i18n.localize("ETHERNUM.Rune.NewRune"),
      runeClass: 1,
      costType: "ether",
      costValue: 0,
      effect: "",
      description: "",
      equipped: false,
      active: true
    });
    await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", currentRunes);
    app.render();
  });

  // Excluir runa
  html.find('.ethernum-delete-rune').click(async (ev) => {
    ev.preventDefault();
    const runeId = $(ev.currentTarget).data('rune-id');
    const currentRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
    const filtered = currentRunes.filter(r => r.id !== runeId);
    await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", filtered);
    app.render();
  });

  // Equipar/Desequipar runa
  html.find('.ethernum-equip-rune').click(async (ev) => {
    ev.preventDefault();
    const runeId = $(ev.currentTarget).data('rune-id');
    const currentRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
    const rune = currentRunes.find(r => r.id === runeId);
    if (rune) {
      rune.equipped = !rune.equipped;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", currentRunes);
      app.render();
    }
  });

  // GM: Ativar/Desativar runa (bloqueio)
  html.find('.ethernum-toggle-rune-active').click(async (ev) => {
    ev.preventDefault();
    if (!isGM) return;
    
    const runeId = $(ev.currentTarget).data('rune-id');
    const currentRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
    const rune = currentRunes.find(r => r.id === runeId);
    if (rune) {
      rune.active = !rune.active;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", currentRunes);
      app.render();
    }
  });

  // Ativar/Rolar runa
  html.find('.ethernum-roll-rune').click(async (ev) => {
    ev.preventDefault();
    const runeId = $(ev.currentTarget).data('rune-id');
    const currentRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
    const rune = currentRunes.find(r => r.id === runeId);
    if (rune) {
      await EthernumDiceCalculator.rollRune(actor, rune);
      app.render();
    }
  });

  // Alterar campos da runa
  html.find('.ethernum-rune-input').change(async (ev) => {
    ev.preventDefault();
    const runeId = $(ev.currentTarget).data('rune-id');
    const field = $(ev.currentTarget).data('field');
    let value = ev.target.value;
    
    const currentRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
    const rune = currentRunes.find(r => r.id === runeId);
    if (rune) {
      if (field === 'costValue' || field === 'runeClass') {
        value = parseInt(value) || 0;
        if (field === 'runeClass') {
          value = Math.max(ETHERNUM.MIN_RUNE_CLASS, Math.min(ETHERNUM.MAX_RUNE_CLASS, value));
        }
      }
      rune[field] = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", currentRunes);
    }
  });
});

/**
 * Inicialização do módulo
 */
Hooks.once("init", () => {
  console.log("Ethernum RPG Module | Inicializando Sistema de Éter v2.0...");
  
  // Registra helpers do Handlebars
  registerHandlebarsHelpers();

  // Registra configurações do módulo
  game.settings.register(ETHERNUM.MODULE_NAME, "longRestFullRestore", {
    name: "ETHERNUM.Settings.LongRestFullRestore.Name",
    hint: "ETHERNUM.Settings.LongRestFullRestore.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(ETHERNUM.MODULE_NAME, "showEtherInChat", {
    name: "ETHERNUM.Settings.ShowEtherInChat.Name",
    hint: "ETHERNUM.Settings.ShowEtherInChat.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(ETHERNUM.MODULE_NAME, "allowOverride", {
    name: "ETHERNUM.Settings.AllowOverride.Name",
    hint: "ETHERNUM.Settings.AllowOverride.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Torna disponível globalmente
  game.ethernum = {
    EtherSystem,
    RuneSystem,
    EthernumDiceCalculator,
    ETHERNUM
  };
});

Hooks.once("ready", () => {
  console.log("Ethernum RPG Module | Sistema de Éter pronto!");
  
  // Verifica se o sistema PF2E está ativo
  if (game.system.id !== "pf2e") {
    ui.notifications.warn(game.i18n.localize("ETHERNUM.Warnings.NotPF2E"));
  }
});
