import { ETHERNUM, type Rank, type RuneClassKey, type EtherAttribute } from '../config.js';
import { EtherSystem, FESystem, EthernumDiceCalculator, type RuneData } from '../systems.js';

// Persiste qual aba Ethernum estava ativa por ator entre re-renders.
// actor.setFlag() no PF2E v8 (ApplicationV2) dispara re-render automático;
// sem esse mapa, a aba reseta para o estado nativo a cada interação.
const _activeEthernumTab = new Map<string, string>();

// Estado de UI: grupos colapsados e runas minimizadas — não persistem no banco.
const _collapsedGroups  = new Map<string, Set<string>>();
const _minimizedRunes   = new Map<string, Set<string>>();
const _scrollPositions  = new Map<string, Record<string, number>>();
const _gmDrawerOpen     = new Map<string, boolean>();
const _sectionCollapsed = new Map<string, Set<string>>();

interface EtherSystemState {
  etherMax: number;
  etherCurrent: number;
  etherPower: number;
}

interface CustomWords {
  verbs: string[];
  nouns: string[];
  sources: string[];
}

interface RuneGroupData {
  noun: string;
  label: string;
  count: number;
  collapsed: boolean;
  runes: Array<RuneData & { minimized: boolean; effectiveCostValue: number }>;
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

    // Restore scroll positions before showing tab
    const savedScrolls = _scrollPositions.get(actor.id!) ?? {};
    $html.find('.ethernum-content').each((_, el) => {
      const tab = el.getAttribute('data-ethernum-tab') ?? '';
      if (savedScrolls[tab] != null) el.scrollTop = savedScrolls[tab];
    });

    // Save scroll continuously
    $html.find('.ethernum-content').on('scroll.ethernum', (ev) => {
      const el = ev.currentTarget as HTMLElement;
      const tab = el.getAttribute('data-ethernum-tab') ?? '';
      if (!_scrollPositions.has(actor.id!)) _scrollPositions.set(actor.id!, {});
      _scrollPositions.get(actor.id!)![tab] = el.scrollTop;
    });

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
    let defaultRuneCostPerClass: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    try { runeClassDCs = (game.settings!.get(ETHERNUM.MODULE_NAME, "runeClassDCs") as Record<number, number>) ?? {}; } catch { /* no-op */ }
    try { feCosts = (game.settings!.get(ETHERNUM.MODULE_NAME, "feCostsPerRank") as Record<Rank, number>) ?? feCosts; } catch { /* no-op */ }
    try { defaultRuneCostPerClass = (game.settings!.get(ETHERNUM.MODULE_NAME, "defaultRuneCostPerClass") as Record<number, number>) ?? defaultRuneCostPerClass; } catch { /* no-op */ }

    const customWords: CustomWords = (actor.getFlag(ETHERNUM.MODULE_NAME, "customWords") as CustomWords | undefined) ?? { verbs: [], nouns: [], sources: [] };

    const actorId = actor.id!;
    const collapsedSet = _collapsedGroups.get(actorId) ?? new Set<string>();
    const minimizedSet = _minimizedRunes.get(actorId) ?? new Set<string>();

    const rawRunes = (actor.getFlag(ETHERNUM.MODULE_NAME, "runes") as RuneData[] | undefined) ?? [];
    const runeGroups = this._buildRuneGroups(rawRunes, collapsedSet, minimizedSet, defaultRuneCostPerClass);

    return {
      actor,
      etherSystem,
      etherAttributes: (actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") as Record<string, EtherAttribute> | undefined) ?? { ...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES },
      talents:         (actor.getFlag(ETHERNUM.MODULE_NAME, "talents") as Record<string, EtherAttribute> | undefined) ?? { ...ETHERNUM.DEFAULT_TALENTS },
      fe:              (actor.getFlag(ETHERNUM.MODULE_NAME, "fe") as { current: number; total: number } | undefined) ?? { ...ETHERNUM.DEFAULT_FE },
      feCosts,
      runeGroups,
      maxRuneClass:    (actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") as number | undefined) ?? 1,
      isGM,
      gmDrawerOpen: _gmDrawerOpen.get(actor.id!) ?? false,
      sectionCollapsed: Object.fromEntries(
        ['classes', 'fe', 'attributes', 'talents'].map(k => [
          k, (_sectionCollapsed.get(actor.id!) ?? new Set(['classes'])).has(k)
        ])
      ),
      ranks:               ETHERNUM.RANKS,
      runeClasses:         ETHERNUM.RUNE_CLASSES,
      runeTrinity:         ETHERNUM.RUNE_TRINITY,
      runeClassDCs,
      defaultRuneCostPerClass,
      customWords,
      attributeRankBonus:  ETHERNUM.ATTRIBUTE_RANK_BONUS,
      talentRankBonus:     ETHERNUM.TALENT_RANK_BONUS,
    };
  }

  static _buildRuneGroups(
    rawRunes: RuneData[],
    collapsedSet: Set<string>,
    minimizedSet: Set<string>,
    defaultRuneCostPerClass: Record<number, number>
  ): RuneGroupData[] {
    const groupMap = new Map<string, RuneData[]>();
    for (const rune of rawRunes) {
      const noun = rune.noun ?? "";
      if (!groupMap.has(noun)) groupMap.set(noun, []);
      groupMap.get(noun)!.push(rune);
    }

    const sortedEntries = [...groupMap.entries()].sort(([nounA, runesA], [nounB, runesB]) => {
      if (nounA === "" && nounB !== "") return 1;
      if (nounB === "" && nounA !== "") return -1;
      return runesB.length - runesA.length;
    });

    return sortedEntries.map(([noun, groupRunes]) => ({
      noun,
      label: noun || game.i18n!.localize("ETHERNUM.Rune.NoNounGroup"),
      count: groupRunes.length,
      collapsed: collapsedSet.has(noun),
      runes: groupRunes.map(rune => ({
        ...rune,
        minimized: minimizedSet.has(rune.id),
        effectiveCostValue: rune.usesDefaultCost
          ? (defaultRuneCostPerClass[rune.runeClass] ?? 0)
          : (rune.costValue ?? 0),
      })),
    }));
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

    // Runa: custo padrão por classe (GM, world setting)
    html.find('.ethernum-default-cost-input').on('change', async (ev) => {
      if (!isGM) return;
      const runeClass = $(ev.currentTarget).data('class') as number;
      const value     = parseInt((ev.target as HTMLInputElement).value) || 0;
      let costs: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      try { costs = (game.settings!.get(ETHERNUM.MODULE_NAME, "defaultRuneCostPerClass") as Record<number, number>) ?? costs; } catch { /* no-op */ }
      costs[runeClass] = value;
      await game.settings!.set(ETHERNUM.MODULE_NAME, "defaultRuneCostPerClass", costs);
      app.render();
    });

    // Runa: grupo — colapsar/expandir (UI only, sem persist)
    html.find('.ethernum-toggle-group').on('click', (ev) => {
      ev.preventDefault();
      const noun    = String($(ev.currentTarget).data('noun') ?? "");
      const actorId = actor.id!;
      if (!_collapsedGroups.has(actorId)) _collapsedGroups.set(actorId, new Set());
      const set = _collapsedGroups.get(actorId)!;
      if (set.has(noun)) set.delete(noun);
      else set.add(noun);
      app.render();
    });

    // Runa: minimizar/expandir (UI only, sem persist)
    html.find('.ethernum-toggle-rune-minimize').on('click', (ev) => {
      ev.preventDefault();
      const runeId  = $(ev.currentTarget).data('rune-id') as string;
      const actorId = actor.id!;
      if (!_minimizedRunes.has(actorId)) _minimizedRunes.set(actorId, new Set());
      const set = _minimizedRunes.get(actorId)!;
      if (set.has(runeId)) set.delete(runeId);
      else set.add(runeId);
      app.render();
    });

    // Runa: toggle usar custo padrão da classe
    html.find('.ethernum-toggle-uses-default-cost').on('change', async (ev) => {
      const runeId  = $(ev.currentTarget).data('rune-id') as string;
      const checked = (ev.target as HTMLInputElement).checked;
      const runes   = (actor.getFlag(ETHERNUM.MODULE_NAME, "runes") as RuneData[] | undefined) ?? [];
      const rune    = runes.find(r => r.id === runeId);
      if (!rune) return;
      rune.usesDefaultCost = checked;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
      app.render();
    });

    // Palavras customizadas: adicionar (GM)
    html.find('.ethernum-add-custom-word').on('click', async (ev) => {
      ev.preventDefault();
      if (!isGM) return;
      const wordType = $(ev.currentTarget).data('word-type') as keyof CustomWords;
      const input    = html.find(`.ethernum-custom-word-input[data-word-type="${wordType}"]`);
      const word     = (input.val() as string).trim();
      if (!word) return;
      const customWords: CustomWords = (actor.getFlag(ETHERNUM.MODULE_NAME, "customWords") as CustomWords | undefined) ?? { verbs: [], nouns: [], sources: [] };
      if (!customWords[wordType].includes(word)) customWords[wordType].push(word);
      await actor.setFlag(ETHERNUM.MODULE_NAME, "customWords", customWords);
      app.render();
    });

    // Palavras customizadas: remover (GM)
    html.find('.ethernum-remove-custom-word').on('click', async (ev) => {
      ev.preventDefault();
      if (!isGM) return;
      const wordType = $(ev.currentTarget).data('word-type') as keyof CustomWords;
      const word     = $(ev.currentTarget).data('word') as string;
      const customWords: CustomWords = (actor.getFlag(ETHERNUM.MODULE_NAME, "customWords") as CustomWords | undefined) ?? { verbs: [], nouns: [], sources: [] };
      customWords[wordType] = customWords[wordType].filter(w => w !== word);
      await actor.setFlag(ETHERNUM.MODULE_NAME, "customWords", customWords);
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
        usesDefaultCost: true,
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
        if (field === 'costValue') rune.usesDefaultCost = false;
      }
      (rune as Record<string, unknown>)[field] = value;
      await actor.setFlag(ETHERNUM.MODULE_NAME, "runes", runes);
      if (field === 'costValue' || field === 'runeClass') app.render();
    });

    // GM drawer: abrir/fechar sem re-render
    html.find('.ethernum-toggle-gm-drawer').on('click', (ev) => {
      ev.preventDefault();
      const actorId = actor.id!;
      const isOpen  = !(_gmDrawerOpen.get(actorId) ?? false);
      _gmDrawerOpen.set(actorId, isOpen);
      html.find('.ethernum-gm-drawer').toggleClass('open', isOpen);
      html.find('.ethernum-toggle-gm-drawer').toggleClass('active', isOpen);
    });

    // Accordion de seções: colapsar/expandir sem re-render
    html.find('.ethernum-accordion-toggle').on('click', (ev) => {
      ev.preventDefault();
      const section = $(ev.currentTarget).data('section') as string;
      const actorId = actor.id!;
      if (!_sectionCollapsed.has(actorId)) _sectionCollapsed.set(actorId, new Set(['classes']));
      const set = _sectionCollapsed.get(actorId)!;
      if (set.has(section)) set.delete(section); else set.add(section);
      $(ev.currentTarget).closest('.ethernum-section--accordion').toggleClass('collapsed', set.has(section));
    });

    // Trinity chips: click abre o select
    html.find('.ethernum-trinity-chip').on('click', (ev) => {
      ev.preventDefault();
      const $chip   = $(ev.currentTarget);
      const $group  = $chip.closest('.ethernum-trinity-chip-group');
      const $select = $group.find('.ethernum-trinity-select-hidden');
      $chip.hide();
      $select.show().trigger('focus');
    });

    // Trinity select change: atualiza chip no DOM (setFlag já é tratado pelo listener .ethernum-rune-input)
    html.find('.ethernum-trinity-select-hidden').on('change', (ev) => {
      const $select  = $(ev.currentTarget);
      const $group   = $select.closest('.ethernum-trinity-chip-group');
      const $chip    = $group.find('.ethernum-trinity-chip');
      const val      = (ev.target as HTMLSelectElement).value;
      const $content = $chip.find('.ethernum-chip-val, .ethernum-chip-empty');
      if (val) {
        $content.replaceWith(`<span class="ethernum-chip-val">${val}</span>`);
      } else {
        const placeholder = $select.find('option:first').text();
        $content.replaceWith(`<span class="ethernum-chip-empty">${placeholder}</span>`);
      }
      $select.hide();
      $chip.show();
    });

    // Trinity select blur sem mudança: restaura chip
    html.find('.ethernum-trinity-select-hidden').on('blur', (ev) => {
      const $select = $(ev.currentTarget);
      if ($select.is(':visible')) {
        $select.closest('.ethernum-trinity-chip-group').find('.ethernum-trinity-chip').show();
        $select.hide();
      }
    });
  }
}
