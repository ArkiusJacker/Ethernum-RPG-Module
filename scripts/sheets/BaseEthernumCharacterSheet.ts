import { ETHERNUM } from "../config.js";
import type { RuneData } from "../systems.js";
import { EthernumDiceCalculator } from "../systems.js";
import { CombatMomentumSystem } from "../table/CombatMomentumSystem.js";
import { EtherTabManager } from "../ui/EtherTabManager.js";
import { UniqueMechanicActionService } from "../unique/services/UniqueMechanicActionService.js";
import { CharacterSheetController } from "./core/CharacterSheetController.js";
import { openOriginalPF2eCharacterSheet } from "./core/CharacterSheetLifecycle.js";
import { openCharacterSheetSwitcher } from "./core/CharacterSheetSwitcher.js";
import { PF2eCharacterActions } from "./core/PF2eCharacterActions.js";

function numeric(value: unknown, fallback = 0): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function data(element: HTMLElement, key: string): string {
  return element.dataset[key] ?? "";
}

function selectSheetTab(actor: Actor, html: JQuery<HTMLElement>, tabId: string): void {
  if (!tabId) return;
  const state = CharacterSheetController.state(actor);
  const previousTab = state.load().activeTab;
  const workspace = html.find<HTMLElement>(".ecs-workspace").get(0);
  if (workspace) state.setScroll(previousTab, workspace.scrollTop);
  state.setActiveTab(tabId);

  html.find<HTMLElement>("[data-sheet-tab]").each((_index, tab) => {
    const active = data(tab, "sheetTab") === tabId;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  html.find<HTMLElement>(".ecs-tab-panel[data-tab]").each((_index, panel) => {
    panel.hidden = data(panel, "tab") !== tabId;
  });

  if (workspace) workspace.scrollTop = state.load().scroll[tabId] ?? 0;
}

const ActorSheetBase = ((foundry as unknown as {
  appv1?: { sheets?: { ActorSheet?: typeof ActorSheet } };
}).appv1?.sheets?.ActorSheet ?? (globalThis as unknown as { ActorSheet: typeof ActorSheet }).ActorSheet);

export class BaseEthernumCharacterSheet extends ActorSheetBase {
  static override get defaultOptions(): ActorSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ethernum-rpg-module", "ethernum-character-sheet-window"],
      template: `${ETHERNUM.TEMPLATE_PATH}sheets/character-sheet.html`,
      width: 1000,
      height: 760,
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: true,
      dragDrop: [{
        dragSelector: ".ecs-inventory-item, .ecs-action-row, .ecs-strike, .ecs-spell-row, .ecs-feat-row",
        dropSelector: ".ecs-workspace",
      }],
    });
  }

  override render(force = false, options: Application.RenderOptions = {}): this {
    if (CharacterSheetController.resolve(this.actor).resolvedSheet === "pf2e") {
      openOriginalPF2eCharacterSheet(this.actor);
      return this;
    }
    return super.render(force, options);
  }

  override async getData(options?: Partial<ActorSheet.Options>): Promise<Record<string, unknown>> {
    try {
      const context = await CharacterSheetController.build(this.actor);
      return { ...(await super.getData(options)), ...context };
    } catch (error) {
      console.error("Ethernum | Character sheet render failed", this.actor, error);
      ui.notifications?.error(game.i18n?.localize("ETHERNUM.CharacterSheet.Errors.Render")
        ?? "Ethernum could not render this character sheet.");
      return {
        ...(await super.getData(options)),
        actor: this.actor,
        emergency: true,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    EtherTabManager.activateEmbeddedUniqueMechanic(this, html, this.actor);

    const sheetTabs = html.find<HTMLElement>("[data-sheet-tab]");
    sheetTabs.on("click.ethernum-sheet-tabs", event => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget as HTMLElement;
      selectSheetTab(this.actor, html, data(target, "sheetTab"));
      target.focus();
    });

    html.on("click.ethernum-sheet", "[data-action]", event => {
      const element = event.currentTarget as HTMLElement;
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) return;
      event.preventDefault();
      void this.#handleAction(element).catch(error => {
        console.error("Ethernum | Character sheet action failed", data(element, "action"), error);
        ui.notifications?.error(error instanceof Error ? error.message : String(error));
      });
    });

    html.find('[data-action="update-hp"]').on("change.ethernum-sheet", event => {
      void PF2eCharacterActions.updateHP(this.actor, numeric((event.currentTarget as HTMLInputElement).value));
    });
    html.find<HTMLSelectElement>('select[data-action="change-carry-type"]').on("change.ethernum-sheet", event => {
      const select = event.currentTarget;
      const [carryType, hands] = select.value.split(":");
      if (!["held", "worn", "stowed", "dropped"].includes(carryType)) return;
      void PF2eCharacterActions.changeCarryType(this.actor, data(select, "itemId"), {
        carryType: carryType as "held" | "worn" | "stowed" | "dropped",
        ...(carryType === "held" ? { handsHeld: numeric(hands, 1) } : {}),
      }).catch(error => {
        console.error("Ethernum | Carry type change failed", error);
        ui.notifications?.warn(error instanceof Error ? error.message : String(error));
      });
    });
    html.on("input.ethernum-sheet", '[data-action="filter-inventory"], [data-action="filter-feats"]', event => {
      const input = event.currentTarget as HTMLInputElement;
      const query = input.value.trim().toLocaleLowerCase();
      const panel = input.closest<HTMLElement>(".ecs-tab-panel");
      panel?.querySelectorAll<HTMLElement>("article").forEach(row => {
        row.hidden = Boolean(query && !row.textContent?.toLocaleLowerCase().includes(query));
      });
    });
    sheetTabs.on("keydown.ethernum-sheet", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const tabs = sheetTabs.filter(":enabled");
      const index = tabs.index(event.currentTarget);
      const next = event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      const target = tabs.get(next);
      if (!target) return;
      selectSheetTab(this.actor, html, data(target, "sheetTab"));
      target.focus();
    });
    html.find<HTMLElement>(".ecs-workspace").on("scroll.ethernum-sheet", event => {
      const state = CharacterSheetController.state(this.actor);
      const activeTab = state.load().activeTab;
      state.setScroll(activeTab, (event.currentTarget as HTMLElement).scrollTop);
    });
    const state = CharacterSheetController.state(this.actor).load();
    const workspace = html.find<HTMLElement>(".ecs-workspace").get(0);
    if (workspace) workspace.scrollTop = state.scroll[state.activeTab] ?? 0;
  }

  async #handleAction(element: HTMLElement): Promise<void> {
    const action = data(element, "action");
    const itemId = data(element, "itemId");
    if (action === "open-pf2e-sheet" || action === "manage-actions" || action === "browse-effects"
      || action === "create-item" || action === "create-spellcasting-entry"
      || action === "manage-spell-preparation") {
      openOriginalPF2eCharacterSheet(this.actor);
      return;
    }
    if (action === "open-gm-control" || action === "manage-combat-momentum") {
      if (game.user?.isGM) await game.ethernum?.ui.openGMControlCenter();
      return;
    }
    if (action === "open-actor-image") {
      const ImagePopoutApp = (foundry.applications.apps as unknown as {
        ImagePopout: new (options: {
          src: string;
          uuid?: string;
          window: { title: string };
        }) => { render: (options: { force: boolean }) => unknown };
      }).ImagePopout;
      new ImagePopoutApp({
        src: this.actor.img ?? "icons/svg/mystery-man.svg",
        uuid: this.actor.uuid,
        window: { title: this.actor.name ?? "" },
      }).render({ force: true });
      return;
    }
    if (action === "toggle-compact") {
      const state = CharacterSheetController.state(this.actor);
      state.setCompact(!state.load().compact);
      this.render(false);
      return;
    }
    if (action === "change-sheet-class" || action === "configure-sheet") {
      openCharacterSheetSwitcher(this.actor);
      return;
    }
    if (action === "open-item") {
      PF2eCharacterActions.openItem(this.actor, itemId);
      return;
    }
    if (action === "use-action") {
      await PF2eCharacterActions.useAction(this.actor, data(element, "preparedActionId"), itemId);
      return;
    }
    if (action === "cast-spell") {
      await PF2eCharacterActions.castSpell(this.actor, {
        entryId: data(element, "entryId"),
        spellId: itemId,
        rank: numeric(data(element, "castRank") || data(element, "rank")),
        ...(data(element, "slotId") ? { slotId: numeric(data(element, "slotId")) } : {}),
      });
      return;
    }
    if (action === "use-item") {
      await PF2eCharacterActions.useItem(this.actor, itemId);
      return;
    }
    if (action === "roll-skill") return void await PF2eCharacterActions.rollSkill(this.actor, data(element, "skill"));
    if (action === "roll-save") return void await PF2eCharacterActions.rollSave(this.actor, data(element, "save") as "fortitude" | "reflex" | "will");
    if (action === "roll-perception") return void await PF2eCharacterActions.rollPerception(this.actor);
    if (action === "roll-initiative") return void await PF2eCharacterActions.rollInitiative(this.actor);
    if (action === "roll-strike") return void await PF2eCharacterActions.rollStrike(
      this.actor,
      data(element, "strikeId"),
      numeric(data(element, "variantIndex")),
    );
    if (action === "roll-strike-damage") return void await PF2eCharacterActions.rollStrikeDamage(this.actor, data(element, "strikeId"));
    if (action === "roll-strike-critical") return void await PF2eCharacterActions.rollStrikeCriticalDamage(this.actor, data(element, "strikeId"));
    if (action === "adjust-hero-points") {
      const context = await CharacterSheetController.build(this.actor);
      const current = numeric((context.vitals as { heroPoints?: { current?: number } }).heroPoints?.current);
      await PF2eCharacterActions.updateHeroPoints(this.actor, current + numeric(data(element, "delta")));
      return;
    }
    if (action === "adjust-item-quantity") {
      const item = this.actor.items.get(itemId) as Item & { system?: { quantity?: number } };
      await PF2eCharacterActions.setQuantity(this.actor, itemId, numeric(item?.system?.quantity) + numeric(data(element, "delta")));
      return;
    }
    if (action === "toggle-item-equipped") {
      await PF2eCharacterActions.toggleEquipped(this.actor, itemId, data(element, "equipped") !== "true");
      return;
    }
    if (action === "toggle-item-invested") {
      await PF2eCharacterActions.toggleInvested(this.actor, itemId, data(element, "invested") !== "true");
      return;
    }
    if (action === "adjust-condition") {
      const slug = data(element, "conditionSlug");
      if (numeric(data(element, "delta")) > 0) await PF2eCharacterActions.increaseCondition(this.actor, slug);
      else await PF2eCharacterActions.decreaseCondition(this.actor, slug);
      return;
    }
    if (action === "delete-item") {
      if (game.user?.isGM) await this.actor.items.get(itemId)?.delete();
      return;
    }
    if (action === "toggle-effect") {
      this.actor.items.get(itemId)?.sheet?.render(true);
      return;
    }
    if (action === "filter-actions" || action === "filter-feats" || action === "filter-inventory" || action === "filter-runes") {
      this.#filterRows(element);
      return;
    }
    if (action === "toggle-inventory-category" || action === "toggle-stowed-items" || action === "toggle-spell-entry" || action === "toggle-skill-details") {
      const container = element.closest<HTMLElement>("section, article, .ecs-section");
      container?.classList.toggle("is-collapsed");
      return;
    }
    if (action === "use-rune") {
      const runes = (this.actor.getFlag(ETHERNUM.MODULE_NAME, "runes") as RuneData[] | undefined) ?? [];
      const rune = runes.find(entry => entry.id === data(element, "runeId"));
      if (rune) await EthernumDiceCalculator.rollRune(this.actor, rune);
      return;
    }
    if (action === "adjust-ether") {
      const ether = (this.actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") as {
        etherCurrent?: number;
        etherMax?: number;
      } | undefined) ?? {};
      const current = numeric(ether.etherCurrent);
      const max = Math.max(0, numeric(ether.etherMax));
      await this.actor.setFlag(
        ETHERNUM.MODULE_NAME,
        "etherSystem.etherCurrent",
        Math.max(0, Math.min(max, current + numeric(data(element, "delta")))),
      );
      return;
    }
    if (action === "use-ether-talent") {
      await this.#chooseEtherAttribute(data(element, "talentId") || data(element, "talent"));
      return;
    }
    if (action === "use-momentum-fides") return void await CombatMomentumSystem.useMomentumFides(this.actor);
    if (action === "use-fulgor-negro") return void await CombatMomentumSystem.useFulgorNegro(this.actor);
    if (action === "unique-action") {
      await UniqueMechanicActionService.execute(this.actor, data(element, "uniqueAction"));
      return;
    }
    if (action === "configure-unique-mechanic" || action.startsWith("manage-") || action.startsWith("edit-") || action.startsWith("create-")) {
      openOriginalPF2eCharacterSheet(this.actor);
    }
  }

  protected override async _onDrop(event: DragEvent): Promise<unknown> {
    const target = event.target instanceof Element ? event.target : null;
    const spellEntry = target?.closest<HTMLElement>(".ecs-spell-entry[data-entry-id]");
    if (spellEntry) {
      try {
        const TextEditorApp = (foundry as unknown as {
          applications?: { ux?: { TextEditor?: { implementation?: { getDragEventData?: (event: DragEvent) => Record<string, unknown> } } } };
        }).applications?.ux?.TextEditor;
        const dragData = TextEditorApp?.implementation?.getDragEventData?.(event);
        if (dragData?.type === "Item") {
          const ItemClass = Item as unknown as {
            implementation?: { fromDropData?: (data: Record<string, unknown>) => Promise<Item | null> };
          };
          const spell = await ItemClass.implementation?.fromDropData?.(dragData) ?? null;
          if (spell && String(spell.type) === "spell") {
            const group = target?.closest<HTMLElement>("[data-rank]")?.dataset.rank;
            return PF2eCharacterActions.addSpell(
              this.actor,
              data(spellEntry, "entryId"),
              spell,
              group === undefined ? undefined : numeric(group),
            );
          }
        }
      } catch (error) {
        console.warn("Ethernum | PF2e spell drop fallback", error);
        ui.notifications?.warn(game.i18n?.localize("ETHERNUM.CharacterSheet.Errors.SpellDropUnavailable")
          ?? "Abra a ficha PF2e para adicionar esta magia.");
        openOriginalPF2eCharacterSheet(this.actor);
        return null;
      }
    }
    return super._onDrop(event);
  }

  #filterRows(element: HTMLElement): void {
    const filter = data(element, "filter");
    const panel = element.closest<HTMLElement>(".ecs-tab-panel");
    panel?.querySelectorAll<HTMLElement>("[data-action-type], [data-category], [data-rune-class]").forEach(row => {
      const value = row.dataset.actionType ?? row.dataset.category ?? row.dataset.runeClass ?? "";
      row.hidden = Boolean(filter && filter !== "all" && value !== filter);
    });
    element.parentElement?.querySelectorAll("button").forEach(button => {
      button.classList.toggle("is-active", button === element);
      button.setAttribute("aria-pressed", String(button === element));
    });
  }

  async #chooseEtherAttribute(talent: string): Promise<void> {
    if (!talent) return;
    const attribute = await new Promise<string | null>(resolve => {
      new Dialog({
        title: game.i18n?.localize("ETHERNUM.CharacterSheet.Ether.ChooseAttribute") ?? "Atributo de Éter",
        content: `<select name="attribute">${Object.keys(ETHERNUM.DEFAULT_ETHER_ATTRIBUTES)
          .map(slug => `<option value="${slug}">${game.i18n?.localize(`ETHERNUM.Attribute.${slug}`) ?? slug}</option>`)
          .join("")}</select>`,
        buttons: {
          roll: {
            icon: '<i class="fas fa-dice-d20"></i>',
            label: game.i18n?.localize("ETHERNUM.Buttons.Roll") ?? "Rolar",
            callback: html => resolve(String(html.find<HTMLSelectElement>('[name="attribute"]').val() ?? "")),
          },
          cancel: { label: game.i18n?.localize("Cancel") ?? "Cancelar", callback: () => resolve(null) },
        },
        close: () => resolve(null),
      }).render(true);
    });
    if (attribute) await EthernumDiceCalculator.rollWithTalent(this.actor, talent, attribute);
  }
}
