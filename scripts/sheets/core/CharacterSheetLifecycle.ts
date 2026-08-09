import { ETHERNUM } from "../../config.js";
import {
  CharacterSheetCache,
  type CharacterSheetDirtyPath,
} from "./CharacterSheetCache.js";

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

type CacheDependencyRule = Readonly<{
  path: string;
  invalidates: readonly CharacterSheetDirtyPath[];
}>;

const MODULE_FLAGS_PATH = `flags.${ETHERNUM.MODULE_NAME}`;

export const ACTOR_CACHE_DEPENDENCIES: readonly CacheDependencyRule[] = [
  { path: "system.attributes.hp", invalidates: ["vitals", "overview"] },
  { path: "system.attributes", invalidates: ["vitals", "overview", "combat"] },
  { path: "system.resources", invalidates: ["vitals", "overview", "combat"] },
  { path: "system.saves", invalidates: ["overview", "combat"] },
  { path: "system.skills", invalidates: ["overview"] },
  { path: "system.movement", invalidates: ["overview"] },
  { path: "system.details", invalidates: ["identity", "overview"] },
  { path: "system.proficiencies", invalidates: ["overview"] },
  { path: "system.perception", invalidates: ["overview"] },
  { path: "system.crafting", invalidates: ["overview"] },
  { path: "system.actions", invalidates: ["overview", "combat"] },
  { path: `${MODULE_FLAGS_PATH}.uniqueMechanics`, invalidates: ["unique"] },
  { path: `${MODULE_FLAGS_PATH}.combatMomentum`, invalidates: ["combat"] },
  { path: `${MODULE_FLAGS_PATH}.etherSystem`, invalidates: ["ethernum"] },
  { path: `${MODULE_FLAGS_PATH}.etherAttributes`, invalidates: ["ethernum"] },
  { path: `${MODULE_FLAGS_PATH}.talents`, invalidates: ["ethernum"] },
  { path: `${MODULE_FLAGS_PATH}.fe`, invalidates: ["ethernum"] },
  { path: `${MODULE_FLAGS_PATH}.runes`, invalidates: ["ethernum"] },
];

export const ITEM_CACHE_DEPENDENCIES: Readonly<Record<string, readonly CharacterSheetDirtyPath[]>> = {
  weapon: ["inventory", "combat"],
  armor: ["inventory", "vitals", "overview", "combat"],
  shield: ["inventory", "vitals", "overview", "combat"],
  feat: ["feats", "combat", "overview"],
  action: ["feats", "combat", "overview"],
  spell: ["spellcasting"],
  spellcastingentry: ["spellcasting"],
  condition: ["effects", "vitals", "overview", "combat"],
  effect: ["effects", "vitals", "overview", "combat"],
  ancestry: ["identity", "overview"],
  heritage: ["identity", "overview"],
  background: ["identity", "overview"],
  class: ["identity", "overview"],
};

function structuredUpdatePaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return prefix ? [prefix] : [];
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return prefix ? [prefix] : [];
  return entries.flatMap(([rawKey, child]) => {
    const normalizedKey = rawKey
      .split(".")
      .map(segment => segment.startsWith("-=") ? segment.slice(2) : segment)
      .filter(Boolean)
      .join(".");
    const path = prefix && normalizedKey ? `${prefix}.${normalizedKey}` : prefix || normalizedKey;
    return structuredUpdatePaths(child, path);
  });
}

function matchesDependency(path: string, dependency: string): boolean {
  return path === dependency || path.startsWith(`${dependency}.`);
}

function uniquePaths(paths: readonly CharacterSheetDirtyPath[]): CharacterSheetDirtyPath[] {
  return [...new Set(paths)];
}

export function resolveActorUpdateDirtyPaths(changed: unknown): CharacterSheetDirtyPath[] {
  const changedPaths = structuredUpdatePaths(changed);
  if (changedPaths.length === 0) return ["all"];

  const invalidates: CharacterSheetDirtyPath[] = [];
  for (const changedPath of changedPaths) {
    const dependency = ACTOR_CACHE_DEPENDENCIES.find(rule => matchesDependency(changedPath, rule.path));
    if (!dependency) return ["all"];
    invalidates.push(...dependency.invalidates);
  }
  return uniquePaths(invalidates);
}

export function resolveItemDirtyPaths(item: Pick<Item, "type">): CharacterSheetDirtyPath[] {
  const itemType = String(item.type ?? "").toLowerCase();
  return [...(ITEM_CACHE_DEPENDENCIES[itemType] ?? ["all"])] as CharacterSheetDirtyPath[];
}

export function initializeCharacterSheetLifecycle(): void {
  Hooks.on("updateActor", (actor: Actor, changed: Record<string, unknown>) => {
    const id = String(actor.id ?? "");
    if (!id) return;
    CharacterSheetCache.invalidate(id, ...resolveActorUpdateDirtyPaths(changed));
  });
  const invalidateItem = (item: Item) => {
    const actor = actorForItem(item);
    if (actor?.id) CharacterSheetCache.invalidate(actor.id, ...resolveItemDirtyPaths(item));
  };
  Hooks.on("createItem", invalidateItem);
  Hooks.on("updateItem", invalidateItem);
  Hooks.on("deleteItem", invalidateItem);
}
