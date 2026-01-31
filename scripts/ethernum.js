/**
 * Ethernum RPG Module - Sistema de Éter
 * Sistema de atributos separado para Pathfinder 2E
 */

// Module namespace
const ETHERNUM = {
  MODULE_NAME: "ethernum-rpg-module",
  TEMPLATE_PATH: "modules/ethernum-rpg-module/templates/"
};

/**
 * Sistema de Éter (S.E) - Ether System
 * Gerencia atributos de éter do personagem
 */
class EtherSystem {
  constructor() {
    this.attributes = {
      etherMax: 0,
      etherCurrent: 0,
      etherRegen: 0,
      etherPower: 0
    };
  }

  /**
   * Calcula o éter máximo baseado nos atributos do personagem
   */
  calculateMaxEther(actor) {
    if (!actor) return 0;
    
    // Fórmula base: Inteligência + Sabedoria + nível
    const abilities = actor.system?.abilities || {};
    const intelligence = abilities.int?.mod || 0;
    const wisdom = abilities.wis?.mod || 0;
    const level = actor.system?.details?.level?.value || 1;
    
    return 10 + (intelligence * 2) + wisdom + (level * 3);
  }

  /**
   * Calcula a regeneração de éter
   */
  calculateEtherRegen(actor) {
    if (!actor) return 0;
    
    const abilities = actor.system?.abilities || {};
    const wisdom = abilities.wis?.mod || 0;
    const constitution = abilities.con?.mod || 0;
    
    return Math.max(1, Math.floor((wisdom + constitution) / 2));
  }

  /**
   * Calcula o poder de éter (afeta rolagens)
   */
  calculateEtherPower(actor) {
    if (!actor) return 0;
    
    const abilities = actor.system?.abilities || {};
    const intelligence = abilities.int?.mod || 0;
    const charisma = abilities.cha?.mod || 0;
    
    return intelligence + charisma;
  }
}

/**
 * Sistema de Runas
 * Gerencia alocação de runas e seus custos
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
      type: rune.type || "ofensiva",
      etherCost: rune.etherCost || 1,
      power: rune.power || 0,
      description: rune.description || "",
      equipped: rune.equipped || false,
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
   * Calcula o custo total de éter das runas equipadas
   */
  getTotalEtherCost() {
    return this.runes
      .filter(r => r.equipped)
      .reduce((total, r) => total + (r.etherCost || 0), 0);
  }
}

/**
 * Calculadora de Dados com integração S.E
 * Combina dados do Pathfinder 2E com o sistema de éter
 */
class EthernumDiceCalculator {
  /**
   * Rola dados combinando Pathfinder 2E e sistema de éter
   */
  static async rollWithEther(actor, rollFormula, etherBonus = 0) {
    if (!actor) {
      ui.notifications.error(game.i18n.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }

    // Adiciona bônus de éter à rolagem
    let formula = rollFormula;
    if (etherBonus > 0) {
      formula += ` + ${etherBonus}`;
    }

    // Cria a rolagem
    const roll = new Roll(formula);
    await roll.evaluate({async: true});

    // Exibe a rolagem no chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: game.i18n.localize("ETHERNUM.DiceRoll.EtherEnhanced")
    });

    return roll;
  }

  /**
   * Rola uma runa específica
   */
  static async rollRune(actor, rune) {
    if (!actor || !rune) {
      ui.notifications.error(game.i18n.localize("ETHERNUM.Errors.InvalidRune"));
      return null;
    }

    // Verifica se tem éter suficiente
    const etherSystem = actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") || {};
    const currentEther = etherSystem.etherCurrent || 0;

    if (currentEther < rune.etherCost) {
      ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.NotEnoughEther"));
      return null;
    }

    // Consome o éter
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", currentEther - rune.etherCost);

    // Rola o dano da runa
    const formula = `${rune.power}d6`;
    const roll = new Roll(formula);
    await roll.evaluate({async: true});

    // Exibe a rolagem no chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: actor}),
      flavor: `${game.i18n.localize("ETHERNUM.Rune.Activated")}: ${rune.name} (${game.i18n.localize("ETHERNUM.EtherCost")}: ${rune.etherCost})`
    });

    return roll;
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
}

/**
 * Adiciona aba de Éter à ficha de personagem
 */
Hooks.on("renderActorSheet", async (app, html, data) => {
  if (app.actor.type !== "character") return;

  // Adiciona a aba de Éter
  const tabs = html.find('.sheet-navigation.tabs');
  if (tabs.length === 0) return;

  // Adiciona botão da aba
  tabs.append(`
    <a class="item" data-tab="ethernum">
      <i class="fas fa-magic"></i> ${game.i18n.localize("ETHERNUM.Tabs.EtherSystem")}
    </a>
  `);

  // Carrega o template da aba
  const actor = app.actor;
  
  // Inicializa o sistema de éter se não existir
  let etherSystem = actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem");
  if (!etherSystem) {
    const ether = new EtherSystem();
    etherSystem = {
      etherMax: ether.calculateMaxEther(actor),
      etherCurrent: ether.calculateMaxEther(actor),
      etherRegen: ether.calculateEtherRegen(actor),
      etherPower: ether.calculateEtherPower(actor)
    };
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem", etherSystem);
  }

  // Carrega as runas
  let runes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];

  const templateData = {
    actor: actor,
    etherSystem: etherSystem,
    runes: runes
  };

  const template = await renderTemplate(
    `${ETHERNUM.TEMPLATE_PATH}ether-tab.html`,
    templateData
  );

  // Adiciona o conteúdo da aba
  html.find('.sheet-body').append(`
    <div class="tab" data-tab="ethernum">
      ${template}
    </div>
  `);

  // Event listeners para a aba de éter
  html.find('.ethernum-recalculate').click(async (ev) => {
    ev.preventDefault();
    const ether = new EtherSystem();
    const newEtherSystem = {
      etherMax: ether.calculateMaxEther(actor),
      etherCurrent: etherSystem.etherCurrent,
      etherRegen: ether.calculateEtherRegen(actor),
      etherPower: ether.calculateEtherPower(actor)
    };
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem", newEtherSystem);
    app.render();
  });

  html.find('.ethernum-rest').click(async (ev) => {
    ev.preventDefault();
    const maxEther = etherSystem.etherMax || 0;
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", maxEther);
    ui.notifications.info(game.i18n.localize("ETHERNUM.Notifications.EtherRestored"));
    app.render();
  });

  html.find('.ethernum-ether-input').change(async (ev) => {
    const value = parseInt(ev.target.value) || 0;
    const max = etherSystem.etherMax || 0;
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", Math.min(value, max));
  });

  html.find('.ethernum-add-rune').click(async (ev) => {
    ev.preventDefault();
    const currentRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
    currentRunes.push({
      id: foundry.utils.randomID(),
      name: game.i18n.localize("ETHERNUM.Rune.NewRune"),
      type: "ofensiva",
      etherCost: 1,
      power: 1,
      description: "",
      equipped: false
    });
    await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", currentRunes);
    app.render();
  });

  html.find('.ethernum-delete-rune').click(async (ev) => {
    ev.preventDefault();
    const runeId = $(ev.currentTarget).data('rune-id');
    const currentRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
    const filtered = currentRunes.filter(r => r.id !== runeId);
    await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", filtered);
    app.render();
  });

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

  html.find('.ethernum-rune-input').change(async (ev) => {
    ev.preventDefault();
    const runeId = $(ev.currentTarget).data('rune-id');
    const field = $(ev.currentTarget).data('field');
    const value = ev.target.value;
    
    const currentRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
    const rune = currentRunes.find(r => r.id === runeId);
    if (rune) {
      if (field === 'etherCost' || field === 'power') {
        rune[field] = parseInt(value) || 0;
      } else {
        rune[field] = value;
      }
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", currentRunes);
    }
  });
});

/**
 * Inicialização do módulo
 */
Hooks.once("init", () => {
  console.log("Ethernum RPG Module | Inicializando Sistema de Éter...");
  
  // Registra helpers do Handlebars
  registerHandlebarsHelpers();

  // Registra configurações do módulo
  game.settings.register(ETHERNUM.MODULE_NAME, "etherRegenOnRest", {
    name: game.i18n.localize("ETHERNUM.Settings.EtherRegenOnRest.Name"),
    hint: game.i18n.localize("ETHERNUM.Settings.EtherRegenOnRest.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(ETHERNUM.MODULE_NAME, "showEtherInChat", {
    name: game.i18n.localize("ETHERNUM.Settings.ShowEtherInChat.Name"),
    hint: game.i18n.localize("ETHERNUM.Settings.ShowEtherInChat.Hint"),
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
