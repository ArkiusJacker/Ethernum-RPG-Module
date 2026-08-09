import { ETHERNUM } from "../../config.js";
import { CharacterSheetCache } from "./CharacterSheetCache.js";

type ActorSheetConstructor = new (actor: Actor, options?: Partial<ActorSheet.Options>) => ActorSheet;

let originalPF2eSheet: ActorSheetConstructor | null = null;
const transientSheets = new Map<string, ActorSheet>();

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function captureOriginalPF2eCharacterSheet(): ActorSheetConstructor | null {
  if (originalPF2eSheet) return originalPF2eSheet;
  const actorConfig = record((CONFIG as unknown as Record<string, unknown>).Actor);
  const characterSheets = record(record(actorConfig.sheetClasses).character);
  for (const [id, registrationValue] of Object.entries(characterSheets)) {
    const registration = record(registrationValue);
    const sheetClass = registration.cls ?? registration.sheetClass;
    const scope = String(registration.scope ?? registration.namespace ?? id);
    if (typeof sheetClass === "function" && scope.toLowerCase().includes("pf2e")) {
      originalPF2eSheet = sheetClass as ActorSheetConstructor;
      return originalPF2eSheet;
    }
  }
  return null;
}

export function openOriginalPF2eCharacterSheet(actor: Actor): ActorSheet | null {
  const SheetClass = captureOriginalPF2eCharacterSheet();
  if (!SheetClass) {
    console.error("Ethernum | PF2e original character sheet class was not found.", actor);
    ui.notifications?.error(game.i18n?.localize("ETHERNUM.CharacterSheet.Errors.PF2eUnavailable")
      ?? "The original PF2e character sheet is unavailable.");
    return null;
  }
  const id = String(actor.id ?? actor.uuid ?? actor.name ?? "actor");
  const existing = transientSheets.get(id);
  if (existing) {
    existing.render(true);
    return existing;
  }
  const sheet = new SheetClass(actor, { editable: Boolean(game.user?.isGM || (actor as Actor & { isOwner?: boolean }).isOwner) });
  transientSheets.set(id, sheet);
  const originalClose = sheet.close.bind(sheet);
  sheet.close = async options => {
    transientSheets.delete(id);
    return originalClose(options);
  };
  sheet.render(true);
  return sheet;
}

export function registerEthernumCharacterSheet(sheetClass: ActorSheetConstructor): void {
  captureOriginalPF2eCharacterSheet();
  const actors = (foundry as unknown as {
    documents?: { collections?: { Actors?: { registerSheet?: (...args: unknown[]) => unknown } } };
  }).documents?.collections?.Actors;
  if (typeof actors?.registerSheet !== "function") {
    throw new Error("Ethernum | Foundry actor sheet registration API is unavailable.");
  }
  actors.registerSheet(ETHERNUM.MODULE_NAME, sheetClass as unknown as ActorSheet.AnyConstructor, {
    types: ["character"],
    makeDefault: true,
    label: "ETHERNUM.CharacterSheet.Label",
  });
}

function actorForItem(item: Item): Actor | null {
  const parent = item.parent;
  return parent instanceof Actor ? parent : null;
}

export function initializeCharacterSheetLifecycle(): void {
  Hooks.on("updateActor", (actor: Actor, changed: Record<string, unknown>) => {
    const id = String(actor.id ?? "");
    if (!id) return;
    const serialized = JSON.stringify(changed);
    if (serialized.includes("attributes") || serialized.includes("resources")) {
      CharacterSheetCache.invalidate(id, "vitals", "combat");
    } else if (serialized.includes("uniqueMechanics")) {
      CharacterSheetCache.invalidate(id, "unique");
    } else {
      CharacterSheetCache.invalidate(id, "identity", "overview", "ethernum");
    }
  });
  const invalidateItem = (item: Item) => {
    const actor = actorForItem(item);
    if (actor?.id) CharacterSheetCache.invalidate(actor.id, "combat", "inventory", "spellcasting", "effects");
  };
  Hooks.on("createItem", invalidateItem);
  Hooks.on("updateItem", invalidateItem);
  Hooks.on("deleteItem", invalidateItem);
}
