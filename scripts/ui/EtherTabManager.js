import { ETHERNUM } from '../config.js';
import { EtherSystem, FESystem, EthernumDiceCalculator } from '../systems.js';

export class EtherTabManager {
  static async render(app, html) {
    if (app.actor?.type !== "character") return;

    // ApplicationV2 (PF2E v8) passes HTMLElement; Application passes jQuery
    const $html = html instanceof jQuery ? html : $(html);

    const nav = $html.find('.sheet-navigation');
    if (nav.length === 0) return;
    if (nav.find('[data-tab="ethernum-attributes"]').length > 0) return;

    const actor = app.actor;
    const isGM = game.user.isGM;

    nav.append(`
      <a class="item" data-tab="ethernum-attributes" data-tooltip="${game.i18n.localize("ETHERNUM.Tabs.EtherAttributes")}">
        <i class="fas fa-user-shield"></i>
      </a>
      <a class="item" data-tab="ethernum-runes" data-tooltip="${game.i18n.localize("ETHERNUM.Tabs.RuneSystem")}">
        <i class="fas fa-gem"></i>
      </a>
    `);

    const templateData = this._buildTemplateData(actor, isGM);

    const renderTpl = foundry.applications?.handlebars?.renderTemplate ?? renderTemplate;
    const [attributesTemplate, runesTemplate] = await Promise.all([
      renderTpl(`${ETHERNUM.TEMPLATE_PATH}ether-attributes-tab.html`, templateData),
      renderTpl(`${ETHERNUM.TEMPLATE_PATH}ether-runes-tab.html`, templateData),
    ]);

    $html.find('.sheet-body').append(`
      <div class="ethernum-content" data-ethernum-tab="ethernum-attributes">${attributesTemplate}</div>
      <div class="ethernum-content" data-ethernum-tab="ethernum-runes">${runesTemplate}</div>
    `);

    this._activateTabSwitching($html);
    this._activateListeners(app, $html, actor, isGM);
  }

  static _buildTemplateData(actor, isGM) {
    const ether = new EtherSystem();
    const etherSystem = actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") ?? {
      etherMax: ether.calculateMaxEther(actor),
      etherCurrent: ether.calculateMaxEther(actor),
      etherPower: ether.calculateEtherPower(actor),
    };

    let runeClassDCs = {};
    let feCosts = ETHERNUM.FE_COST_PER_LEVEL;
    try { runeClassDCs = game.settings.get(ETHERNUM.MODULE_NAME, "runeClassDCs") || {}; } catch {}
    try { feCosts = game.settings.get(ETHERNUM.MODULE_NAME, "feCostsPerRank") || feCosts; } catch {}

    return {
      actor,
      etherSystem,
      etherAttributes: actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") ?? {...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES},
      talents: actor.getFlag(ETHERNUM.MODULE_NAME, "talents") ?? {...ETHERNUM.DEFAULT_TALENTS},
      fe: actor.getFlag(ETHERNUM.MODULE_NAME, "fe") ?? {...ETHERNUM.DEFAULT_FE},
      feCosts,
      runes: actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [],
      maxRuneClass: actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") ?? 1,
      isGM,
      ranks: ETHERNUM.RANKS,
      runeClasses: ETHERNUM.RUNE_CLASSES,
      runeTrinity: ETHERNUM.RUNE_TRINITY,
      runeClassDCs,
      attributeRankBonus: ETHERNUM.ATTRIBUTE_RANK_BONUS,
      talentRankBonus: ETHERNUM.TALENT_RANK_BONUS,
    };
  }

  static async _recalculateEther(actor) {
    const ether = new EtherSystem();
    const current = actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") || {};
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem", {
      etherMax: ether.calculateMaxEther(actor),
      etherCurrent: Math.min(current.etherCurrent ?? 0, ether.calculateMaxEther(actor)),
      etherPower: ether.calculateEtherPower(actor),
    });
  }

  static _activateTabSwitching($html) {
    const $body = $html.find('.sheet-body');
    const $sheetContent = $body.find('.sheet-content');

    $html.find('.sheet-navigation [data-tab^="ethernum"]').on('click.ethernum', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const tab = $(ev.currentTarget).data('tab');

      $html.find('.sheet-navigation .item').removeClass('active').attr('aria-selected', 'false');
      $(ev.currentTarget).addClass('active').attr('aria-selected', 'true');

      $sheetContent.hide();
      $body.find('.ethernum-content').hide();
      $body.find(`.ethernum-content[data-ethernum-tab="${tab}"]`).show();
    });

    $html.find('.sheet-navigation .item:not([data-tab^="ethernum"])').on('click.ethernum', () => {
      $sheetContent.show();
      $body.find('.ethernum-content').hide();
      $html.find('.sheet-navigation [data-tab^="ethernum"]').removeClass('active').attr('aria-selected', 'false');
    });
  }

  static _activateListeners(app, html, actor, isGM) {
    // FE: adicionar (GM)
    html.find('.ethernum-add-fe').click(async (ev) => {
      ev.preventDefault();
      if (!isGM) return;
      const amount = parseInt(html.find('.ethernum-fe-amount').val()) || 0;
      if (amount <= 0) { ui.notifications.warn(game.i18n.localize("ETHERNUM.FE.InvalidAmount")); return; }
      const result = await FESystem.addFE(actor, amount);
      if (result.success) {
        ui.notifications.info(game.i18n.format("ETHERNUM.FE.Added", { amount, total: result.newCurrent }));
        app.render();
      }
    });

    // FE: definir diretamente (GM)
    html.find('.ethernum-fe-current').change(async (ev) => {
      if (!isGM) return;
      await FESystem.setFE(actor, parseInt(ev.target.value) || 0);
      app.render();
    });

    // FE: upgrade de atributo
    html.find('.ethernum-upgrade-attr').click(async (ev) => {
      ev.preventDefault();
      const attrKey = $(ev.currentTarget).data('attr');
      const levels = parseInt(html.find(`.ethernum-upgrade-levels[data-attr="${attrKey}"]`).val()) || 1;
      const result = await FESystem.upgradeAttribute(actor, attrKey, levels);
      if (result.success) {
        ui.notifications.info(result.message);
        await this._recalculateEther(actor);
        app.render();
      } else {
        ui.notifications.warn(result.message);
      }
    });

    // FE: upgrade de talento
    html.find('.ethernum-upgrade-talent').click(async (ev) => {
      ev.preventDefault();
      const talentKey = $(ev.currentTarget).data('talent');
      const levels = parseInt(html.find(`.ethernum-upgrade-levels[data-talent="${talentKey}"]`).val()) || 1;
      const result = await FESystem.upgradeTalent(actor, talentKey, levels);
      if (result.success) { ui.notifications.info(result.message); app.render(); }
      else { ui.notifications.warn(result.message); }
    });

    // Éter: recalcular
    html.find('.ethernum-recalculate').click(async (ev) => {
      ev.preventDefault();
      await this._recalculateEther(actor);
      app.render();
    });

    // Éter: descanso longo
    html.find('.ethernum-long-rest').click(async (ev) => {
      ev.preventDefault();
      const maxEther = new EtherSystem().calculateMaxEther(actor);
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", maxEther);
      ui.notifications.info(game.i18n.localize("ETHERNUM.Notifications.LongRestComplete"));
      app.render();
    });

    // Éter: alterar valor atual
    html.find('.ethernum-ether-input').change(async (ev) => {
      const max = (actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") || {}).etherMax || 0;
      const value = Math.min(Math.max(0, parseInt(ev.target.value) || 0), max);
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", value);
      app.render();
    });

    // Atributo: alterar valor (GM)
    html.find('.ethernum-attr-value').change(async (ev) => {
      if (!isGM) { ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.GMOnly")); app.render(); return; }
      const attrKey = $(ev.currentTarget).data('attr');
      const value = Math.max(ETHERNUM.MIN_LEVEL, Math.min(ETHERNUM.MAX_LEVEL, parseInt(ev.target.value) || ETHERNUM.MIN_LEVEL));
      const attrs = actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") || {...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES};
      if (!attrs[attrKey]) return;
      attrs[attrKey].value = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherAttributes", attrs);
      await this._recalculateEther(actor);
      app.render();
    });

    // Atributo: alterar rank (GM)
    html.find('.ethernum-attr-rank').change(async (ev) => {
      if (!isGM) { ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.GMOnly")); app.render(); return; }
      const attrKey = $(ev.currentTarget).data('attr');
      const attrs = actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") || {...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES};
      if (!attrs[attrKey]) return;
      attrs[attrKey].rank = ev.target.value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherAttributes", attrs);
      await this._recalculateEther(actor);
      app.render();
    });

    // Talento: alterar valor (GM)
    html.find('.ethernum-talent-value').change(async (ev) => {
      if (!isGM) { ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.GMOnly")); app.render(); return; }
      const talentKey = $(ev.currentTarget).data('talent');
      const value = Math.max(ETHERNUM.MIN_LEVEL, Math.min(ETHERNUM.MAX_LEVEL, parseInt(ev.target.value) || ETHERNUM.MIN_LEVEL));
      const talents = actor.getFlag(ETHERNUM.MODULE_NAME, "talents") || {...ETHERNUM.DEFAULT_TALENTS};
      if (!talents[talentKey]) return;
      talents[talentKey].value = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "talents", talents);
      app.render();
    });

    // Talento: alterar rank (GM)
    html.find('.ethernum-talent-rank').change(async (ev) => {
      if (!isGM) { ui.notifications.warn(game.i18n.localize("ETHERNUM.Errors.GMOnly")); app.render(); return; }
      const talentKey = $(ev.currentTarget).data('talent');
      const talents = actor.getFlag(ETHERNUM.MODULE_NAME, "talents") || {...ETHERNUM.DEFAULT_TALENTS};
      if (!talents[talentKey]) return;
      talents[talentKey].rank = ev.target.value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "talents", talents);
      app.render();
    });

    // Talento: rolar
    html.find('.ethernum-roll-talent').click(async (ev) => {
      ev.preventDefault();
      await EthernumDiceCalculator.rollWithTalent(actor, $(ev.currentTarget).data('talent'), $(ev.currentTarget).data('attr'));
    });

    // Runa: classe máxima (GM)
    html.find('.ethernum-max-rune-class').change(async (ev) => {
      if (!isGM) return;
      const value = Math.max(ETHERNUM.MIN_RUNE_CLASS, Math.min(ETHERNUM.MAX_RUNE_CLASS, parseInt(ev.target.value) || ETHERNUM.MIN_RUNE_CLASS));
      await actor.setFlag(ETHERNUM.MODULE_NAME, "maxRuneClass", value);
      await this._recalculateEther(actor);
      app.render();
    });

    // Runa: CD por classe (GM)
    html.find('.ethernum-dc-input').change(async (ev) => {
      if (!isGM) return;
      const runeClass = $(ev.currentTarget).data('class');
      const value = parseInt(ev.target.value) || ETHERNUM.RUNE_CLASSES[runeClass]?.defaultDC || 15;
      let dcs = {};
      try { dcs = game.settings.get(ETHERNUM.MODULE_NAME, "runeClassDCs") || {}; } catch {}
      dcs[runeClass] = value;
      await game.settings.set(ETHERNUM.MODULE_NAME, "runeClassDCs", dcs);
      app.render();
    });

    // Runa: adicionar
    html.find('.ethernum-add-rune').click(async (ev) => {
      ev.preventDefault();
      const runes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
      runes.push({
        id: foundry.utils.randomID(),
        name: game.i18n.localize("ETHERNUM.Rune.NewRune"),
        runeClass: 1, verb: "", noun: "", source: "",
        costType: "ether", costValue: 0,
        effect: "", description: "", equipped: false, active: true,
      });
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
      app.render();
    });

    // Runa: excluir
    html.find('.ethernum-delete-rune').click(async (ev) => {
      ev.preventDefault();
      const runeId = $(ev.currentTarget).data('rune-id');
      const runes = (actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || []).filter(r => r.id !== runeId);
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
      app.render();
    });

    // Runa: equipar/desequipar
    html.find('.ethernum-equip-rune').click(async (ev) => {
      ev.preventDefault();
      const runeId = $(ev.currentTarget).data('rune-id');
      const runes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
      const rune = runes.find(r => r.id === runeId);
      if (!rune) return;
      rune.equipped = !rune.equipped;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
      app.render();
    });

    // Runa: ativar/desativar (GM)
    html.find('.ethernum-toggle-rune-active').click(async (ev) => {
      ev.preventDefault();
      if (!isGM) return;
      const runeId = $(ev.currentTarget).data('rune-id');
      const runes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
      const rune = runes.find(r => r.id === runeId);
      if (!rune) return;
      rune.active = !rune.active;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
      app.render();
    });

    // Runa: rolar
    html.find('.ethernum-roll-rune').click(async (ev) => {
      ev.preventDefault();
      const runeId = $(ev.currentTarget).data('rune-id');
      const rune = (actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || []).find(r => r.id === runeId);
      if (!rune) return;
      await EthernumDiceCalculator.rollRune(actor, rune);
      app.render();
    });

    // Runa: editar campos
    html.find('.ethernum-rune-input').change(async (ev) => {
      ev.preventDefault();
      const runeId = $(ev.currentTarget).data('rune-id');
      const field = $(ev.currentTarget).data('field');
      const runes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes") || [];
      const rune = runes.find(r => r.id === runeId);
      if (!rune) return;
      let value = ev.target.value;
      if (field === 'costValue' || field === 'runeClass') {
        value = parseInt(value) || 0;
        if (field === 'runeClass') value = Math.max(ETHERNUM.MIN_RUNE_CLASS, Math.min(ETHERNUM.MAX_RUNE_CLASS, value));
      }
      rune[field] = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
    });
  }
}
