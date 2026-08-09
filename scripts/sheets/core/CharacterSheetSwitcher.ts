import { ETHERNUM } from "../../config.js";
import { CharacterSheetController } from "./CharacterSheetController.js";
import {
  CHARACTER_SHEET_MODES,
  normalizeCharacterSheetMode,
  type CharacterSheetMode,
} from "./CharacterSheetRegistry.js";

interface SheetRegistration {
  id: string;
  scope: string;
}

export interface CharacterSheetClassIds {
  ethernum: string | null;
  pf2e: string | null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function localize(key: string, fallback: string): string {
  const value = game.i18n?.localize(key);
  return value && value !== key ? value : fallback;
}

function sheetRegistrations(value: unknown): SheetRegistration[] {
  return Object.entries(record(value)).map(([key, registrationValue]) => {
    const registration = record(registrationValue);
    const id = String(registration.id ?? key);
    return {
      id,
      scope: String(registration.scope ?? registration.namespace ?? id.split(".")[0] ?? ""),
    };
  });
}

export function resolveCharacterSheetClassIds(value: unknown): CharacterSheetClassIds {
  const registrations = sheetRegistrations(value);
  const ethernum = registrations.find(registration =>
    registration.scope === ETHERNUM.MODULE_NAME
    || registration.id.startsWith(`${ETHERNUM.MODULE_NAME}.`),
  );
  const pf2e = registrations.find(registration =>
    registration.scope === "pf2e"
    || registration.id.startsWith("pf2e."),
  );
  return { ethernum: ethernum?.id ?? null, pf2e: pf2e?.id ?? null };
}

function registeredClassIds(): CharacterSheetClassIds {
  const actorConfig = record((CONFIG as unknown as Record<string, unknown>).Actor);
  const characterSheets = record(record(actorConfig.sheetClasses).character);
  return resolveCharacterSheetClassIds(characterSheets);
}

function selectedClassId(actor: Actor, mode: CharacterSheetMode): string | null {
  const ids = registeredClassIds();
  const activeCore = record(actor.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics")).activeCore;
  const resolvedMode = CharacterSheetController.registry.resolveMode({ override: mode, activeCore });
  return resolvedMode === "pf2e" ? ids.pf2e : ids.ethernum;
}

export async function changeCharacterSheet(actor: Actor, modeValue: unknown): Promise<void> {
  const mode = normalizeCharacterSheetMode(modeValue);
  const sheetClassId = selectedClassId(actor, mode);
  if (!sheetClassId) {
    const message = localize(
      "ETHERNUM.CharacterSheet.Errors.SheetClassUnavailable",
      "The selected character sheet is not registered.",
    );
    ui.notifications?.error(message);
    throw new Error(message);
  }

  await CharacterSheetController.setMode(actor, mode, { sheetClassId });
  ui.notifications?.info(localize("ETHERNUM.CharacterSheet.Switch.Success", "Character sheet changed."));
}

export function openCharacterSheetSwitcher(actor: Actor): void {
  if (!CharacterSheetController.permissions(actor).canChooseSheet) {
    ui.notifications?.warn(localize(
      "ETHERNUM.CharacterSheet.Errors.Permission",
      "You do not have permission to change this sheet.",
    ));
    return;
  }

  const current = CharacterSheetController.resolve(actor).configuredMode;
  const options = CHARACTER_SHEET_MODES.map(mode => {
    const label = localize(`ETHERNUM.CharacterSheet.Modes.${mode}`, mode);
    return `<option value="${mode}" ${mode === current ? "selected" : ""}>${label}</option>`;
  }).join("");

  new Dialog({
    title: localize("ETHERNUM.CharacterSheet.Switch.Title", "Change character sheet"),
    content: `<div class="form-group"><label>${localize("ETHERNUM.CharacterSheet.Configure.Mode", "Sheet mode")}</label><select name="mode">${options}</select></div>`,
    buttons: {
      save: {
        icon: '<i class="fas fa-arrows-rotate"></i>',
        label: localize("ETHERNUM.CharacterSheet.Switch.Apply", "Change sheet"),
        callback: html => {
          const mode = String(html.find<HTMLSelectElement>('[name="mode"]').val() ?? "auto");
          void changeCharacterSheet(actor, mode).catch(error => {
            console.error("Ethernum | Character sheet switch failed", actor, error);
          });
        },
      },
      reset: {
        icon: '<i class="fas fa-rotate-left"></i>',
        label: localize("ETHERNUM.CharacterSheet.Configure.ResetLayout", "Reset local layout"),
        callback: () => {
          CharacterSheetController.state(actor).reset();
          actor.sheet?.render(true);
        },
      },
    },
    default: "save",
  }).render(true);
}

function rootElement(
  app: Application,
  html: JQuery<HTMLElement> | HTMLElement,
): HTMLElement | null {
  const appElement = (app as Application & { element?: JQuery<HTMLElement> | HTMLElement }).element;
  const element = appElement instanceof HTMLElement
    ? appElement
    : appElement?.get?.(0) ?? (html instanceof HTMLElement ? html : html.get(0));
  return element?.closest<HTMLElement>(".app, .application") ?? element ?? null;
}

export function injectPF2eSheetSwitcher(
  app: Application & { actor?: Actor },
  html: JQuery<HTMLElement> | HTMLElement,
): void {
  const actor = app.actor;
  if (!actor || String(actor.type) !== "character") return;
  if (!CharacterSheetController.permissions(actor).canChooseSheet) return;

  const root = rootElement(app, html);
  const header = root?.querySelector<HTMLElement>(".window-header");
  if (!header || header.querySelector(".ethernum-sheet-switcher")) return;

  const button = document.createElement("button");
  const label = localize("ETHERNUM.CharacterSheet.Switch.Button", "Change sheet");
  button.type = "button";
  button.className = "ethernum-sheet-switcher";
  button.setAttribute("aria-label", label);
  button.setAttribute("data-tooltip", label);
  button.innerHTML = `<i class="fas fa-arrows-rotate" aria-hidden="true"></i><span>${label}</span>`;
  const activate = (event: Event) => {
    event.preventDefault();
    openCharacterSheetSwitcher(actor);
  };
  button.addEventListener("click", activate);

  const close = header.querySelector<HTMLElement>(".header-button.close, [data-action='close']");
  header.insertBefore(button, close ?? null);
}
