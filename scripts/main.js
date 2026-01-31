/**
 * Ethernum RPG Module - Arquivo Principal
 * Hooks, inicialização e manipulação da UI
 */

import { ETHERNUM } from './config.js';
import { registerSettings, getFECostForRank } from './settings.js';
import { EtherSystem, RuneSystem, FESystem, EthernumDiceCalculator } from './systems.js';

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

  Handlebars.registerHelper('ethernum-attrRankBonus', function(rank) {
    return ETHERNUM.ATTRIBUTE_RANK_BONUS[rank || "F"] || 2;
  });

  Handlebars.registerHelper('ethernum-talentRankBonus', function(rank) {
    return ETHERNUM.TALENT_RANK_BONUS[rank || "F"] || 3;
  });

  Handlebars.registerHelper('ethernum-ranks', function() {
    return ETHERNUM.RANKS;
  });

  Handlebars.registerHelper('ethernum-runeClasses', function() {
    return ETHERNUM.RUNE_CLASSES;
  });

  Handlebars.registerHelper('ethernum-runeTrinity', function() {
    return ETHERNUM.RUNE_TRINITY;
  });

  Handlebars.registerHelper('ethernum-verbTier', function(verb) {
    const trinity = ETHERNUM.RUNE_TRINITY;
    if (trinity.VERBS.tier1.includes(verb)) return 1;
    if (trinity.VERBS.tier2.includes(verb)) return 2;
    if (trinity.VERBS.tier3.includes(verb)) return 3;
    return 0;
  });

  Handlebars.registerHelper('ethernum-feCost', function(rank) {
    return getFECostForRank(rank);
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

  // Inicializa FE (Fichas de Éter) se não existir
  let fe = actor.getFlag(ETHERNUM.MODULE_NAME, "fe");
  if (!fe) {
    fe = {...ETHERNUM.DEFAULT_FE};
    await actor.setFlag(ETHERNUM.MODULE_NAME, "fe", fe);
  }

  // Inicializa classe máxima de runa (apenas GM pode alterar)
  let maxRuneClass = actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass");
  if (maxRuneClass === undefined) {
    maxRuneClass = 1;
    await actor.setFlag(ETHERNUM.MODULE_NAME, "maxRuneClass", maxRuneClass);
  }

  // Carrega as runas
  let runes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];

  // Carrega CDs customizados das classes de runa
  let runeClassDCs = {};
  try {
    runeClassDCs = game.settings?.get(ETHERNUM.MODULE_NAME, "runeClassDCs") || {};
  } catch (e) {
    runeClassDCs = {};
  }

  // Carrega custos de FE customizados
  let feCosts = {};
  try {
    feCosts = game.settings?.get(ETHERNUM.MODULE_NAME, "feCostsPerRank") || ETHERNUM.FE_COST_PER_LEVEL;
  } catch (e) {
    feCosts = ETHERNUM.FE_COST_PER_LEVEL;
  }

  // Dados para os templates
  const templateData = {
    actor: actor,
    etherSystem: etherSystem,
    etherAttributes: etherAttributes,
    talents: talents,
    fe: fe,
    feCosts: feCosts,
    runes: runes,
    maxRuneClass: maxRuneClass,
    isGM: isGM,
    ranks: ETHERNUM.RANKS,
    runeClasses: ETHERNUM.RUNE_CLASSES,
    runeTrinity: ETHERNUM.RUNE_TRINITY,
    runeClassDCs: runeClassDCs,
    attributeRankBonus: ETHERNUM.ATTRIBUTE_RANK_BONUS,
    talentRankBonus: ETHERNUM.TALENT_RANK_BONUS
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

  // ---- Sistema de FE (Fichas de Éter) ----

  // GM: Adicionar FE
  html.find('.ethernum-add-fe').click(async (ev) => {
    ev.preventDefault();
    if (!isGM) return;

    const amount = parseInt(html.find('.ethernum-fe-amount').val()) || 0;
    if (amount <= 0) {
      ui.notifications.warn(game.i18n.localize("ETHERNUM.FE.InvalidAmount"));
      return;
    }

    const result = await FESystem.addFE(actor, amount);
    if (result.success) {
      ui.notifications.info(game.i18n.format("ETHERNUM.FE.Added", { amount: amount, total: result.newCurrent }));
      app.render();
    }
  });

  // GM: Definir FE diretamente
  html.find('.ethernum-fe-current').change(async (ev) => {
    if (!isGM) return;
    const amount = parseInt(ev.target.value) || 0;
    await FESystem.setFE(actor, amount);
    app.render();
  });

  // Upgrade de atributo com FE
  html.find('.ethernum-upgrade-attr').click(async (ev) => {
    ev.preventDefault();
    const attrKey = $(ev.currentTarget).data('attr');
    const levels = parseInt(html.find(`.ethernum-upgrade-levels[data-attr="${attrKey}"]`).val()) || 1;

    const result = await FESystem.upgradeAttribute(actor, attrKey, levels);
    
    if (result.success) {
      ui.notifications.info(result.message);
      // Recalcula éter
      const ether = new EtherSystem();
      const newEtherSystem = {
        etherMax: ether.calculateMaxEther(actor),
        etherCurrent: Math.min(etherSystem.etherCurrent, ether.calculateMaxEther(actor)),
        etherPower: ether.calculateEtherPower(actor)
      };
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem", newEtherSystem);
      app.render();
    } else {
      ui.notifications.warn(result.message);
    }
  });

  // Upgrade de talento com FE
  html.find('.ethernum-upgrade-talent').click(async (ev) => {
    ev.preventDefault();
    const talentKey = $(ev.currentTarget).data('talent');
    const levels = parseInt(html.find(`.ethernum-upgrade-levels[data-talent="${talentKey}"]`).val()) || 1;

    const result = await FESystem.upgradeTalent(actor, talentKey, levels);
    
    if (result.success) {
      ui.notifications.info(result.message);
      app.render();
    } else {
      ui.notifications.warn(result.message);
    }
  });

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

  // Alterar atributo de éter (valor) - apenas GM pode alterar diretamente
  html.find('.ethernum-attr-value').change(async (ev) => {
    if (!isGM) {
      ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.GMOnly"));
      app.render();
      return;
    }
    
    const attrKey = $(ev.currentTarget).data('attr');
    const value = Math.max(ETHERNUM.MIN_LEVEL, Math.min(ETHERNUM.MAX_LEVEL, parseInt(ev.target.value) || ETHERNUM.MIN_LEVEL));
    
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

  // Alterar atributo de éter (rank) - apenas GM pode alterar diretamente
  html.find('.ethernum-attr-rank').change(async (ev) => {
    if (!isGM) {
      ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.GMOnly"));
      app.render();
      return;
    }
    
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

  // Alterar talento (valor) - apenas GM pode alterar diretamente
  html.find('.ethernum-talent-value').change(async (ev) => {
    if (!isGM) {
      ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.GMOnly"));
      app.render();
      return;
    }
    
    const talentKey = $(ev.currentTarget).data('talent');
    const value = Math.max(ETHERNUM.MIN_LEVEL, Math.min(ETHERNUM.MAX_LEVEL, parseInt(ev.target.value) || ETHERNUM.MIN_LEVEL));
    
    const currentTalents = actor.getFlag(ETHERNUM.MODULE_NAME, "talents") || {...ETHERNUM.DEFAULT_TALENTS};
    if (currentTalents[talentKey]) {
      currentTalents[talentKey].value = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "talents", currentTalents);
      app.render();
    }
  });

  // Alterar talento (rank) - apenas GM pode alterar diretamente
  html.find('.ethernum-talent-rank').change(async (ev) => {
    if (!isGM) {
      ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.GMOnly"));
      app.render();
      return;
    }
    
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

  // GM: Configurar CD de classe de runa
  html.find('.ethernum-dc-input').change(async (ev) => {
    if (!isGM) return;
    const runeClass = $(ev.currentTarget).data('class');
    const value = parseInt(ev.target.value) || ETHERNUM.RUNE_CLASSES[runeClass]?.defaultDC || 15;
    
    // Obtém as DCs atuais
    let currentDCs = {};
    try {
      currentDCs = game.settings.get(ETHERNUM.MODULE_NAME, "runeClassDCs") || {};
    } catch (e) {
      currentDCs = {};
    }
    
    // Atualiza a DC da classe específica
    currentDCs[runeClass] = value;
    await game.settings.set(ETHERNUM.MODULE_NAME, "runeClassDCs", currentDCs);
    app.render();
  });

  // Adicionar nova runa (com sistema de trindade)
  html.find('.ethernum-add-rune').click(async (ev) => {
    ev.preventDefault();
    const currentRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
    currentRunes.push({
      id: foundry.utils.randomID(),
      name: game.i18n.localize("ETHERNUM.Rune.NewRune"),
      runeClass: 1,
      // Sistema de Trindade (Verbo + Substantivo + Fonte)
      verb: "",
      noun: "",
      source: "",
      // Custo e descrição
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
  console.log("Ethernum RPG Module | Inicializando Sistema de Éter v3.1...");
  
  // Registra helpers do Handlebars
  registerHandlebarsHelpers();

  // Registra configurações do módulo
  registerSettings();

  // Torna disponível globalmente
  game.ethernum = {
    EtherSystem,
    RuneSystem,
    FESystem,
    EthernumDiceCalculator,
    ETHERNUM
  };
});

Hooks.once("ready", () => {
  console.log("Ethernum RPG Module | Sistema de Éter v3.1 pronto!");
  console.log("Ethernum RPG Module | Sistema de FE (Fichas de Éter) ativado");
  
  // Verifica se o sistema PF2E está ativo
  if (game.system.id !== "pf2e") {
    ui.notifications.warn(game.i18n.localize("ETHERNUM.Warnings.NotPF2E"));
  }
});
