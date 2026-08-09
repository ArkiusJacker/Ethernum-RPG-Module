import { ETHERNUM } from "../config.js";
import type { RuneData } from "../systems.js";
import { EthernumDiceCalculator } from "../systems.js";
import { CombatMomentumSystem } from "../table/CombatMomentumSystem.js";
import { EtherTabManager } from "../ui/EtherTabManager.js";
import { UniqueMechanicActionService } from "../unique/services/UniqueMechanicActionService.js";
import { CharacterSheetController } from "./core/CharacterSheetController.js";
import { openCharacterSheetDiagnostics } from "./core/CharacterSheetDiagnosticsApp.js";
import {
  presentCharacterSheetError,
  type CharacterSheetSafeErrorPresentation,
} from "./core/CharacterSheetDiagnosticsService.js";
import { CharacterSheetImageService } from "./core/CharacterSheetImageService.js";
import { openOriginalPF2eCharacterSheet } from "./core/CharacterSheetLifecycle.js";
import { openCharacterSheetSwitcher } from "./core/CharacterSheetSwitcher.js";
import { CharacterSheetViewportService } from "./core/CharacterSheetViewportService.js";
import { PF2eCharacterActions } from "./core/PF2eCharacterActions.js";

function numeric(value: unknown, fallback = 0): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function data(element: HTMLElement, key: string): string {
  return element.dataset[key] ?? "";
}

function escapeMarkup(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showCharacterSheetActionError(actor: Actor, presentation: CharacterSheetSafeErrorPresentation): void {
  const technical = presentation.technical;
  const technicalContent = technical
    ? `<details class="ecs-error-technical"><summary>${escapeMarkup(game.i18n?.localize("ETHERNUM.CharacterSheet.Diagnostics.TechnicalDetails") ?? "Technical details")}</summary><dl><dt>Error</dt><dd>${escapeMarkup(technical.errorType)}: ${escapeMarkup(technical.message)}</dd><dt>Module</dt><dd>${escapeMarkup(technical.module)}</dd><dt>Capability</dt><dd>${escapeMarkup(technical.capability)}</dd><dt>PF2e</dt><dd>${escapeMarkup(technical.pf2eVersion)}</dd><dt>Foundry</dt><dd>${escapeMarkup(technical.foundryVersion)}</dd></dl></details>`
    : "";
  new Dialog({
    title: presentation.title,
    content: `<div class="ecs-error-dialog"><p>${escapeMarkup(presentation.message)}</p>${technicalContent}</div>`,
    buttons: {
      pf2e: {
        icon: '<i class="fas fa-up-right-from-square"></i>',
        label: presentation.action.label,
        callback: () => openOriginalPF2eCharacterSheet(actor),
      },
      close: {
        icon: '<i class="fas fa-xmark"></i>',
        label: game.i18n?.localize("ETHERNUM.Common.Close") ?? "Close",
      },
    },
    default: "pf2e",
  }).render(true);
}

function syncSheetTabFallback(html: JQuery<HTMLElement>, tabId: string): void {
  html.find<HTMLElement>("[data-sheet-tab]").each((_index, tab) => {
    const active = data(tab, "sheetTab") === tabId;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  html.find<HTMLElement>(".ecs-tab-panel[data-tab]").each((_index, panel) => {
    panel.hidden = data(panel, "tab") !== tabId;
  });
}

const ActorSheetBase = ((foundry as unknown as {
  appv1?: { sheets?: { ActorSheet?: typeof ActorSheet } };
}).appv1?.sheets?.ActorSheet ?? (globalThis as unknown as { ActorSheet: typeof ActorSheet }).ActorSheet);

export class BaseEthernumCharacterSheet extends ActorSheetBase {
  readonly #imageService = new CharacterSheetImageService();
  #viewport: CharacterSheetViewportService | null = null;

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
    this.#viewportService().capture(this.#sheetRoot());
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
      const presentation = presentCharacterSheetError(error, {
        isGM: Boolean(game.user?.isGM),
        module: "character-sheet",
        moduleLabel: game.i18n?.localize("ETHERNUM.CharacterSheet.Label") ?? "character sheet",
        foundryVersion: String((game as Game & { version?: string }).version ?? "unknown"),
        pf2eVersion: String(game.system?.version ?? "unknown"),
      });
      ui.notifications?.error(game.i18n?.localize("ETHERNUM.CharacterSheet.Errors.Render")
        ?? presentation.title);
      return {
        ...(await super.getData(options)),
        actor: this.actor,
        emergency: true,
        errorPresentation: presentation,
      };
    }
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    EtherTabManager.activateEmbeddedUniqueMechanic(this, html, this.actor);
    const root = this.#sheetRoot(html);
    const viewport = this.#viewportService();
    if (root) {
      viewport.bind(root);
      this.#imageService.bind(root);
    }

    const sheetTabs = html.find<HTMLElement>("[data-sheet-tab]");
    sheetTabs.on("click.ethernum-sheet-tabs", event => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget as HTMLElement;
      if (root) viewport.selectTab(root, data(target, "sheetTab"));
      else syncSheetTabFallback(html, data(target, "sheetTab"));
    });

    html.on("click.ethernum-sheet", "[data-action]", event => {
      const element = event.currentTarget as HTMLElement;
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) return;
      viewport.capture(root);
      event.preventDefault();
      void this.#handleAction(element).catch(error => {
        console.error("Ethernum | Character sheet action failed", data(element, "action"), error);
        const presentation = presentCharacterSheetError(error, {
          isGM: Boolean(game.user?.isGM),
          module: data(element, "action") || "character-sheet-action",
          foundryVersion: String((game as Game & { version?: string }).version ?? "unknown"),
          pf2eVersion: String(game.system?.version ?? "unknown"),
        });
        ui.notifications?.error(game.i18n?.localize("ETHERNUM.CharacterSheet.Errors.ActionFailed")
          ?? presentation.message);
        showCharacterSheetActionError(this.actor, presentation);
      });
    });

    html.find('[data-action="update-hp"]').on("change.ethernum-sheet", event => {
      viewport.capture(root);
      void PF2eCharacterActions.updateHP(this.actor, numeric((event.currentTarget as HTMLInputElement).value));
    });
    html.find<HTMLSelectElement>('select[data-action="change-carry-type"]').on("change.ethernum-sheet", event => {
      viewport.capture(root);
      const select = event.currentTarget;
      const [carryType, hands] = select.value.split(":");
      if (!["held", "worn", "stowed", "dropped"].includes(carryType)) return;
      void PF2eCharacterActions.changeCarryType(this.actor, data(select, "itemId"), {
        carryType: carryType as "held" | "worn" | "stowed" | "dropped",
        ...(carryType === "held" ? { handsHeld: numeric(hands, 1) } : {}),
      }).catch(error => {
        console.error("Ethernum | Carry type change failed", error);
        ui.notifications?.warn(game.i18n?.localize("ETHERNUM.CharacterSheet.Errors.ActionFailed")
          ?? "This action could not be completed. Open the original PF2e sheet to continue.");
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
      if (root) viewport.selectTab(root, data(target, "sheetTab"));
      else syncSheetTabFallback(html, data(target, "sheetTab"));
    });
    void viewport.restoreAfterRender(root).catch(error => {
      console.warn("Ethernum | Character sheet viewport restore failed", error);
    });
  }

  async #handleAction(element: HTMLElement): Promise<void> {
    const action = data(element, "action");
    const itemId = data(element, "itemId");
    if (action !== "toggle-sheet-menu") {
      const menu = element.closest<HTMLElement>(".ecs-sheet-menu")
        ?.querySelector<HTMLElement>(".ecs-sheet-menu__panel");
      if (menu) menu.hidden = true;
    }
    if (action === "toggle-sheet-menu") {
      const menu = element.closest<HTMLElement>(".ecs-sheet-menu")
        ?.querySelector<HTMLElement>(".ecs-sheet-menu__panel");
      if (!menu) return;
      menu.hidden = !menu.hidden;
      element.setAttribute("aria-expanded", String(!menu.hidden));
      if (!menu.hidden) menu.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
      return;
    }
    if (action === "open-pf2e-sheet" || action === "manage-actions" || action === "browse-effects"
      || action === "create-item" || action === "create-spellcasting-entry"
      || action === "manage-spell-preparation" || action === "open-crafting-pf2e") {
      openOriginalPF2eCharacterSheet(this.actor);
      return;
    }
    if (action === "open-gm-control" || action === "manage-combat-momentum") {
      if (game.user?.isGM) await game.ethernum?.ui.openGMControlCenter();
      return;
    }
    if (action === "open-sheet-diagnostics") {
      await openCharacterSheetDiagnostics(this.actor);
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
    if (action === "adjust-focus-points") {
      await PF2eCharacterActions.adjustResource(this.actor, "focus", numeric(data(element, "delta")));
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
    if (action === "toggle-stowed-items") {
      const showStowed = element.getAttribute("aria-pressed") !== "true";
      element.setAttribute("aria-pressed", String(showStowed));
      element.closest<HTMLElement>(".ecs-tab-panel")
        ?.querySelectorAll<HTMLElement>('.ecs-inventory-item[data-carry-type="stowed"]')
        .forEach(item => { item.hidden = !showStowed; });
      CharacterSheetController.state(this.actor).setCollapsed("inventory:stowed", !showStowed);
      return;
    }
    if (action === "toggle-inventory-category" || action === "toggle-spell-entry"
      || action === "toggle-skill-details" || action === "toggle-overview-section") {
      const container = element.closest<HTMLElement>("section, article, .ecs-section");
      const currentExpanded = element.getAttribute("aria-expanded") !== "false";
      const nextExpanded = !currentExpanded;
      const controls = element.getAttribute("aria-controls");
      const controlled = controls
        ? container?.querySelector<HTMLElement>(`[id="${CSS.escape(controls)}"]`) ?? null
        : null;
      element.setAttribute("aria-expanded", String(nextExpanded));
      if (controlled) controlled.hidden = !nextExpanded;
      container?.classList.toggle("is-collapsed", !nextExpanded);
      const sectionId = action === "toggle-inventory-category"
        ? `inventory:${data(element, "category")}`
        : action === "toggle-spell-entry"
          ? `spellcasting:${data(element, "entryId")}`
          : action === "toggle-overview-section"
            ? `overview:${data(element, "section")}`
            : "overview:skill-details";
      CharacterSheetController.state(this.actor).setCollapsed(sectionId, !nextExpanded);
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
    this.#viewportService().capture(this.#sheetRoot());
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

  #sheetRoot(html?: JQuery<HTMLElement>): HTMLElement | null {
    const applicationElement = (this as unknown as {
      element?: JQuery<HTMLElement> | HTMLElement;
    }).element;
    const candidate = html?.get(0)
      ?? (applicationElement as JQuery<HTMLElement> | undefined)?.get?.(0)
      ?? applicationElement as HTMLElement | undefined;
    if (!candidate || typeof candidate.querySelector !== "function") return null;
    return candidate.matches?.(".ethernum-character-sheet")
      ? candidate
      : candidate.querySelector<HTMLElement>(".ethernum-character-sheet") ?? candidate;
  }

  #viewportService(): CharacterSheetViewportService {
    if (this.#viewport) return this.#viewport;
    const resolution = CharacterSheetController.resolve(this.actor);
    this.#viewport = new CharacterSheetViewportService({
      actorId: String(this.actor.id ?? this.actor.uuid ?? this.actor.name ?? "actor"),
      sheetId: resolution.resolvedSheet,
      state: CharacterSheetController.state(this.actor, resolution.resolvedSheet),
    });
    return this.#viewport;
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
