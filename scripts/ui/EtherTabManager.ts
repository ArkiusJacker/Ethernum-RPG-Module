import { ETHERNUM, type Rank, type RuneClassKey, type EtherAttribute } from '../config.js';
import { EtherSystem, FESystem, EthernumDiceCalculator, type RuneData } from '../systems.js';

// Persiste qual aba Ethernum estava ativa por ator entre re-renders.
// actor.setFlag() no PF2E v8 (ApplicationV2) dispara re-render automático;
// sem esse mapa, a aba reseta para o estado nativo a cada interação.
const _activeEthernumTab = new Map<string, string>();

interface EtherSystemState {
  etherMax: number;
  etherCurrent: number;
  etherPower: number;
}

export class EtherTabManager {
  static async render(app: Application & { actor?: Actor }, html: JQuery<HTMLElement>): Promise<void> {
    if (!app.actor || (app.actor.type as string) !== "character") return;

    const $html = html;
    const nav = $html.find('.sheet-navigation');
    if (nav.length === 0) return;
    if (nav.find('[data-tab="ethernum-attributes"]').length > 0) return;

    const actor: Actor = app.actor;
    const isGM = game.user?.isGM ?? false;

    nav.append(`
      <a class="item" data-tab="ethernum-attributes" data-tooltip="${game.i18n!.localize("ETHERNUM.Tabs.EtherAttributes")}">
        <i class="fas fa-user-shield"></i>
      </a>
      <a class="item" data-tab="ethernum-runes" data-tooltip="${game.i18n!.localize("ETHERNUM.Tabs.RuneSystem")}">
        <i class="fas fa-gem"></i>
      </a>
    `);

    const templateData = this._buildTemplateData(actor, isGM);

    const renderTpl = (foundry.applications as Record<string, unknown> & { handlebars?: { renderTemplate?: typeof renderTemplate } })
      ?.handlebars?.renderTemplate ?? renderTemplate;

    const [attributesTemplate, runesTemplate] = await Promise.all([
      renderTpl(`${ETHERNUM.TEMPLATE_PATH}ether-attributes-tab.html`, templateData),
      renderTpl(`${ETHERNUM.TEMPLATE_PATH}ether-runes-tab.html`, templateData),
    ]);

    $html.find('.sheet-body').append(`
      <div class="ethernum-content" data-ethernum-tab="ethernum-attributes">${attributesTemplate}</div>
      <div class="ethernum-content" data-ethernum-tab="ethernum-runes">${runesTemplate}</div>
    `);

    this._activateTabSwitching($html, actor.id!);

    const savedTab = _activeEthernumTab.get(actor.id!);
    if (savedTab) this._showTab($html, savedTab);

    this._activateListeners(app, $html, actor, isGM);
  }

  static _showTab($html: JQuery, tab: string): void {
    const $body = $html.find('.sheet-body');
    $html.find('.sheet-navigation .item').removeClass('active').attr('aria-selected', 'false');
    $html.find(`.sheet-navigation [data-tab="${tab}"]`).addClass('active').attr('aria-selected', 'true');
    $body.find('.sheet-content').hide();
    $body.find('.ethernum-content').hide();
    $body.find(`.ethernum-content[data-ethernum-tab="${tab}"]`).show();
  }

  static _buildTemplateData(actor: Actor, isGM: boolean): Record<string, unknown> {
    const ether = new EtherSystem();
    const etherSystem = (actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") as EtherSystemState | undefined) ?? {
      etherMax:     ether.calculateMaxEther(actor),
      etherCurrent: ether.calculateMaxEther(actor),
      etherPower:   ether.calculateEtherPower(actor),
    };

    let runeClassDCs: Record<number, number> = {};
    let feCosts: Record<Rank, number> = ETHERNUM.FE_COST_PER_LEVEL;
    try { runeClassDCs = (game.settings!.get(ETHERNUM.MODULE_NAME, "runeClassDCs") as Record<number, number>) ?? {}; } catch { /* no-op */ }
    try { feCosts = (game.settings!.get(ETHERNUM.MODULE_NAME, "feCostsPerRank") as Record<Rank, number>) ?? feCosts; } catch { /* no-op */ }

    return {
      actor,
      etherSystem,
      etherAttributes: (actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") as Record<string, EtherAttribute> | undefined) ?? { ...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES },
      talents:         (actor.getFlag(ETHERNUM.MODULE_NAME, "talents") as Record<string, EtherAttribute> | undefined) ?? { ...ETHERNUM.DEFAULT_TALENTS },
      fe:              (actor.getFlag(ETHERNUM.MODULE_NAME, "fe") as { current: number; total: number } | undefined) ?? { ...ETHERNUM.DEFAULT_FE },
      feCosts,
      runes:           (actor.getFlag(ETHERNUM.MODULE_NAME, "runes") as RuneData[] | undefined) ?? [],
      maxRuneClass:    (actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") as number | undefined) ?? 1,
      isGM,
      ranks:               ETHERNUM.RANKS,
      runeClasses:         ETHERNUM.RUNE_CLASSES,
      runeTrinity:         ETHERNUM.RUNE_TRINITY,
      runeClassDCs,
      attributeRankBonus:  ETHERNUM.ATTRIBUTE_RANK_BONUS,
      talentRankBonus:     ETHERNUM.TALENT_RANK_BONUS,
    };
  }

  static async _recalculateEther(actor: Actor): Promise<void> {
    const ether   = new EtherSystem();
    const current = (actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") as Partial<EtherSystemState> | undefined) ?? {};
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem", {
      etherMax:     ether.calculateMaxEther(actor),
      etherCurrent: Math.min(current.etherCurrent ?? 0, ether.calculateMaxEther(actor)),
      etherPower:   ether.calculateEtherPower(actor),
    });
  }

  static _activateTabSwitching($html: JQuery, actorId: string): void {
    const $body         = $html.find('.sheet-body');
    const $sheetContent = $body.find('.sheet-content');

    $html.find('.sheet-navigation [data-tab^="ethernum"]').on('click.ethernum', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const tab = $(ev.currentTarget).data('tab') as string;
      _activeEthernumTab.set(actorId, tab);
      this._showTab($html, tab);
    });

    $html.find('.sheet-navigation .item:not([data-tab^="ethernum"])').on('click.ethernum', () => {
      _activeEthernumTab.delete(actorId);
      $sheetContent.show();
      $body.find('.ethernum-content').hide();
      $html.find('.sheet-navigation [data-tab^="ethernum"]').removeClass('active').attr('aria-selected', 'false');
    });
  }

  static _activateListeners(
    app: Application & { render(): void },
    html: JQuery,
    actor: Actor,
    isGM: boolean
  ): void {
    // FE: adicionar (GM)
    html.find('.ethernum-add-fe').on('click', async (ev) => {
      ev.preventDefault();
      if (!isGM) return;
      const amount = parseInt(String(html.find('.ethernum-fe-amount').val())) || 0;
      if (amount <= 0) { ui.notifications?.warn(game.i18n!.localize("ETHERNUM.FE.InvalidAmount")); return; }
      const result = await FESystem.addFE(actor, amount);
      if (result.success) {
        ui.notifications?.info(game.i18n!.format("ETHERNUM.FE.Added", { amount, total: result.newCurrent }));
        app.render();
      }
    });

    // FE: definir diretamente (GM)
    html.find('.ethernum-fe-current').on('change', async (ev) => {
      if (!isGM) return;
      await FESystem.setFE(actor, parseInt((ev.target as HTMLInputElement).value) || 0);
      app.render();
    });

    // FE: upgrade de atributo
    html.find('.ethernum-upgrade-attr').on('click', async (ev) => {
      ev.preventDefault();
      const attrKey = $(ev.currentTarget).data('attr') as string;
      const levels  = parseInt(String(html.find(`.ethernum-upgrade-levels[data-attr="${attrKey}"]`).val())) || 1;
      const result  = await FESystem.upgradeAttribute(actor, attrKey, levels);
      if (result.success) {
        ui.notifications?.info(result.message);
        await this._recalculateEther(actor);
        app.render();
      } else {
        ui.notifications?.warn(result.message);
      }
    });

    // FE: upgrade de talento
    html.find('.ethernum-upgrade-talent').on('click', async (ev) => {
      ev.preventDefault();
      const talentKey = $(ev.currentTarget).data('talent') as string;
      const levels    = parseInt(String(html.find(`.ethernum-upgrade-levels[data-talent="${talentKey}"]`).val())) || 1;
      const result    = await FESystem.upgradeTalent(actor, talentKey, levels);
      if (result.success) { ui.notifications?.info(result.message); app.render(); }
      else { ui.notifications?.warn(result.message); }
    });

    // Éter: recalcular
    html.find('.ethernum-recalculate').on('click', async (ev) => {
      ev.preventDefault();
      await this._recalculateEther(actor);
      app.render();
    });

    // Éter: descanso longo
    html.find('.ethernum-long-rest').on('click', async (ev) => {
      ev.preventDefault();
      const maxEther = new EtherSystem().calculateMaxEther(actor);
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", maxEther);
      ui.notifications?.info(game.i18n!.localize("ETHERNUM.Notifications.LongRestComplete"));
      app.render();
    });

    // Éter: alterar valor atual
    html.find('.ethernum-ether-input').on('change', async (ev) => {
      const etherSystem = (actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") as Partial<EtherSystemState> | undefined) ?? {};
      const max   = etherSystem.etherMax ?? 0;
      const value = Math.min(Math.max(0, parseInt((ev.target as HTMLInputElement).value) || 0), max);
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", value);
      app.render();
    });

    // Atributo: alterar valor (GM)
    html.find('.ethernum-attr-value').on('change', async (ev) => {
      if (!isGM) { ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.GMOnly")); app.render(); return; }
      const attrKey = $(ev.currentTarget).data('attr') as string;
      const value   = Math.max(ETHERNUM.MIN_LEVEL, Math.min(ETHERNUM.MAX_LEVEL, parseInt((ev.target as HTMLInputElement).value) || ETHERNUM.MIN_LEVEL));
      const attrs   = (actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") as Record<string, EtherAttribute> | undefined) ?? { ...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES };
      if (!attrs[attrKey]) return;
      attrs[attrKey].value = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherAttributes", attrs);
      await this._recalculateEther(actor);
      app.render();
    });

    // Atributo: alterar rank (GM)
    html.find('.ethernum-attr-rank').on('change', async (ev) => {
      if (!isGM) { ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.GMOnly")); app.render(); return; }
      const attrKey = $(ev.currentTarget).data('attr') as string;
      const attrs   = (actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") as Record<string, EtherAttribute> | undefined) ?? { ...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES };
      if (!attrs[attrKey]) return;
      attrs[attrKey].rank = (ev.target as HTMLInputElement).value as Rank;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherAttributes", attrs);
      await this._recalculateEther(actor);
      app.render();
    });

    // Talento: alterar valor (GM)
    html.find('.ethernum-talent-value').on('change', async (ev) => {
      if (!isGM) { ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.GMOnly")); app.render(); return; }
      const talentKey = $(ev.currentTarget).data('talent') as string;
      const value     = Math.max(ETHERNUM.MIN_LEVEL, Math.min(ETHERNUM.MAX_LEVEL, parseInt((ev.target as HTMLInputElement).value) || ETHERNUM.MIN_LEVEL));
      const talents   = (actor.getFlag(ETHERNUM.MODULE_NAME, "talents") as Record<string, EtherAttribute> | undefined) ?? { ...ETHERNUM.DEFAULT_TALENTS };
      if (!talents[talentKey]) return;
      talents[talentKey].value = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "talents", talents);
      app.render();
    });

    // Talento: alterar rank (GM)
    html.find('.ethernum-talent-rank').on('change', async (ev) => {
      if (!isGM) { ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.GMOnly")); app.render(); return; }
      const talentKey = $(ev.currentTarget).data('talent') as string;
      const talents   = (actor.getFlag(ETHERNUM.MODULE_NAME, "talents") as Record<string, EtherAttribute> | undefined) ?? { ...ETHERNUM.DEFAULT_TALENTS };
      if (!talents[talentKey]) return;
      talents[talentKey].rank = (ev.target as HTMLInputElement).value as Rank;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "talents", talents);
      app.render();
    });

    // Talento: rolar
    html.find('.ethernum-roll-talent').on('click', async (ev) => {
      ev.preventDefault();
      await EthernumDiceCalculator.rollWithTalent(
        actor,
        $(ev.currentTarget).data('talent') as string,
        $(ev.currentTarget).data('attr') as string
      );
    });

    // Runa: classe máxima (GM)
    html.find('.ethernum-max-rune-class').on('change', async (ev) => {
      if (!isGM) return;
      const value = Math.max(ETHERNUM.MIN_RUNE_CLASS, Math.min(ETHERNUM.MAX_RUNE_CLASS, parseInt((ev.target as HTMLInputElement).value) || ETHERNUM.MIN_RUNE_CLASS));
      await actor.setFlag(ETHERNUM.MODULE_NAME, "maxRuneClass", value);
      await this._recalculateEther(actor);
      app.render();
    });

    // Runa: CD por classe (GM)
    html.find('.ethernum-dc-input').on('change', async (ev) => {
      if (!isGM) return;
      const runeClass = $(ev.currentTarget).data('class') as number;
      const value     = parseInt((ev.target as HTMLInputElement).value) || (ETHERNUM.RUNE_CLASSES[runeClass as RuneClassKey]?.defaultDC ?? 15);
      let dcs: Record<number, number> = {};
      try { dcs = (game.settings!.get(ETHERNUM.MODULE_NAME, "runeClassDCs") as Record<number, number>) ?? {}; } catch { /* no-op */ }
      dcs[runeClass] = value;
      await game.settings!.set(ETHERNUM.MODULE_NAME, "runeClassDCs", dcs);
      app.render();
    });

    // Runa: adicionar
    html.find('.ethernum-add-rune').on('click', async (ev) => {
      ev.preventDefault();
      const runes = ((actor.getFlag(ETHERNUM.MODULE_NAME, "runes") as RuneData[] | undefined) ?? []);
      runes.push({
        id: foundry.utils.randomID(),
        name: game.i18n!.localize("ETHERNUM.Rune.NewRune"),
        runeClass: 1, verb: "", noun: "", source: "",
        costType: "ether", costValue: 0,
        effect: "", description: "", equipped: false, active: true,
      });
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
      app.render();
    });

    // Runa: excluir
    html.find('.ethernum-delete-rune').on('click', async (ev) => {
      ev.preventDefault();
      const runeId = $(ev.currentTarget).data('rune-id') as string;
      const runes  = ((actor.getFlag(ETHERNUM.MODULE_NAME, "runes") as RuneData[] | undefined) ?? []).filter(r => r.id !== runeId);
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
      app.render();
    });

    // Runa: equipar/desequipar
    html.find('.ethernum-equip-rune').on('click', async (ev) => {
      ev.preventDefault();
      const runeId = $(ev.currentTarget).data('rune-id') as string;
      const runes  = (actor.getFlag(ETHERNUM.MODULE_NAME, "runes") as RuneData[] | undefined) ?? [];
      const rune   = runes.find(r => r.id === runeId);
      if (!rune) return;
      rune.equipped = !rune.equipped;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
      app.render();
    });

    // Runa: ativar/desativar (GM)
    html.find('.ethernum-toggle-rune-active').on('click', async (ev) => {
      ev.preventDefault();
      if (!isGM) return;
      const runeId = $(ev.currentTarget).data('rune-id') as string;
      const runes  = (actor.getFlag(ETHERNUM.MODULE_NAME, "runes") as RuneData[] | undefined) ?? [];
      const rune   = runes.find(r => r.id === runeId);
      if (!rune) return;
      rune.active = !rune.active;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
      app.render();
    });

    // Runa: rolar
    html.find('.ethernum-roll-rune').on('click', async (ev) => {
      ev.preventDefault();
      const runeId = $(ev.currentTarget).data('rune-id') as string;
      const rune   = ((actor.getFlag(ETHERNUM.MODULE_NAME, "runes") as RuneData[] | undefined) ?? []).find(r => r.id === runeId);
      if (!rune) return;
      await EthernumDiceCalculator.rollRune(actor, rune);
      app.render();
    });

    // Runa: editar campos
    html.find('.ethernum-rune-input').on('change', async (ev) => {
      ev.preventDefault();
      const runeId = $(ev.currentTarget).data('rune-id') as string;
      const field  = $(ev.currentTarget).data('field') as string;
      const runes  = (actor.getFlag(ETHERNUM.MODULE_NAME, "runes") as RuneData[] | undefined) ?? [];
      const rune   = runes.find(r => r.id === runeId);
      if (!rune) return;
      let value: string | number = (ev.target as HTMLInputElement).value;
      if (field === 'costValue' || field === 'runeClass') {
        value = parseInt(value) || 0;
        if (field === 'runeClass') value = Math.max(ETHERNUM.MIN_RUNE_CLASS, Math.min(ETHERNUM.MAX_RUNE_CLASS, value));
      }
      (rune as Record<string, unknown>)[field] = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
    });
  }
}
