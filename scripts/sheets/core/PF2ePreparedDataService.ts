import {
  PF2eCharacterAdapter,
  type CharacterActionSnapshot,
  type CharacterCraftingAbilitySnapshot,
  type CharacterCraftingFormulaSnapshot,
  type CharacterCraftingSnapshot,
  type CharacterSpellcastingEntrySnapshot,
  type CharacterSpellcastingGroupSnapshot,
  type CharacterSpellcastingSnapshot,
  type CharacterSpellSnapshot,
} from "../../core/PF2eCharacterAdapter.js";

type Data = Record<string, unknown>;

export type PF2ePreparedDataSource = "prepared" | "adapter" | "pf2e-sheet";

export interface PF2ePreparedDataDiagnostic {
  scope: string;
  message: string;
}

export interface PF2ePreparedSpellcastingEntry {
  id: string;
  collectionId: string;
  entryId: string;
  name: string;
  preparation: string;
  tradition: string;
  sheetData: unknown;
  collection: unknown;
}

export interface PF2ePreparedSpellcastingSnapshot {
  source: PF2ePreparedDataSource;
  entries: PF2ePreparedSpellcastingEntry[];
  snapshot: CharacterSpellcastingSnapshot;
  fallback: CharacterSpellcastingSnapshot | null;
  diagnostics: PF2ePreparedDataDiagnostic[];
  openPF2eSheet: boolean;
}

export interface PF2ePreparedCraftingAbility {
  slug: string;
  label: string;
  sheetData: unknown;
}

export interface PF2eMaterializedCraftingAbility extends CharacterCraftingAbilitySnapshot {
  batchSize?: number;
  resourceValue?: number;
  resourceMax?: number;
}

export interface PF2eMaterializedCraftingSnapshot extends CharacterCraftingSnapshot {
  abilities: PF2eMaterializedCraftingAbility[];
}

export interface PF2ePreparedCraftingSnapshot {
  source: PF2ePreparedDataSource;
  knownFormulas: unknown[];
  abilities: PF2ePreparedCraftingAbility[];
  snapshot: PF2eMaterializedCraftingSnapshot;
  fallback: CharacterCraftingSnapshot | null;
  diagnostics: PF2ePreparedDataDiagnostic[];
  openPF2eSheet: boolean;
}

export interface PF2ePreparedDataOptions {
  spellcastingSheetOptions?: Data;
  craftingSheetOptions?: Data;
}

export interface SpecialActionIdentity {
  id?: unknown;
  uuid?: unknown;
  itemId?: unknown;
  slug?: unknown;
  source?: unknown;
  allowDuplicateInSpecial?: unknown;
  specialActionPurpose?: unknown;
}

function record(value: unknown): Data {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(...candidates: unknown[]): number | undefined {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function nonNegativeInteger(...candidates: unknown[]): number | undefined {
  const value = optionalNumber(...candidates);
  return value === undefined ? undefined : Math.max(0, Math.trunc(value));
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  return values(value).map(text).filter(Boolean);
}

function hasOwn(value: Data, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function values(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value instanceof Map || value instanceof Set) return [...value.values()];
  const data = record(value);
  if (Array.isArray(data.contents)) return data.contents;
  const valuesMethod = data.values;
  if (typeof valuesMethod === "function") {
    try {
      return [...(valuesMethod.call(value) as Iterable<unknown>)];
    } catch {
      return [];
    }
  }
  return Object.values(data);
}

function entries(value: unknown): Array<[string, unknown]> {
  if (value instanceof Map) return [...value.entries()].map(([key, entry]) => [String(key), entry]);
  const data = record(value);
  if (Array.isArray(value) || value instanceof Set || Array.isArray(data.contents)) {
    return values(value).map((entry, index) => [identity(record(entry), String(index)), entry]);
  }
  const entriesMethod = data.entries;
  if (typeof entriesMethod === "function") {
    try {
      return [...(entriesMethod.call(value) as Iterable<[unknown, unknown]>)]
        .map(([key, entry]) => [String(key), entry]);
    } catch {
      return [];
    }
  }
  return Object.entries(data);
}

function identity(value: Data, fallback = ""): string {
  return text(value.id) || text(value.uuid) || text(value.slug) || text(value.name) || fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function diagnostic(scope: string, error: unknown): PF2ePreparedDataDiagnostic {
  return { scope, message: errorMessage(error) };
}

function adapterSpellcasting(actor: unknown, diagnostics: PF2ePreparedDataDiagnostic[]): CharacterSpellcastingSnapshot | null {
  try {
    return PF2eCharacterAdapter.spellcasting(actor as Actor);
  } catch (error) {
    diagnostics.push(diagnostic("spellcasting.adapter", error));
    return null;
  }
}

function adapterCrafting(actor: unknown, diagnostics: PF2ePreparedDataDiagnostic[]): CharacterCraftingSnapshot | null {
  try {
    return PF2eCharacterAdapter.details(actor as Actor).crafting;
  } catch (error) {
    diagnostics.push(diagnostic("crafting.adapter", error));
    return null;
  }
}

async function preparedSpellcastingEntry(
  collectionKey: string,
  collectionValue: unknown,
  options: PF2ePreparedDataOptions,
): Promise<PF2ePreparedSpellcastingEntry> {
  const collection = record(collectionValue);
  const entry = record(collection.entry);
  if (Object.keys(entry).length === 0) throw new Error("Spellcasting collection has no prepared entry");
  const entryId = identity(entry, collectionKey);
  const getSheetData = entry.getSheetData;
  const existingSheetData = collection.sheetData ?? entry.sheetData;
  const sheetData = typeof getSheetData === "function"
    ? await getSheetData.call(collection.entry, {
      spells: collectionValue,
      ...(options.spellcastingSheetOptions ?? {}),
    })
    : existingSheetData ?? collectionValue;
  const system = record(entry.system);
  const prepared = record(system.prepared);
  const tradition = record(system.tradition);

  return {
    id: entryId || collectionKey,
    collectionId: identity(collection, collectionKey),
    entryId,
    name: text(entry.name) || text(collection.name) || "Spellcasting",
    preparation: text(prepared.value) || text(system.preparation) || text(entry.category),
    tradition: text(tradition.value) || text(system.tradition) || text(entry.tradition),
    sheetData,
    collection: collectionValue,
  };
}

function materializedSpell(
  value: unknown,
  fallback?: CharacterSpellSnapshot,
  defaults: Partial<CharacterSpellSnapshot> = {},
): CharacterSpellSnapshot | null {
  const wrapper = record(value);
  const source = [wrapper.spell, wrapper.item, wrapper.document]
    .map(record)
    .find(candidate => Object.keys(candidate).length > 0) ?? wrapper;
  const system = record(source.system);
  const location = record(system.location);
  const traits = record(system.traits);
  const uses = record(wrapper.uses ?? location.uses ?? system.uses);
  const id = identity(source, identity(wrapper, fallback?.id ?? ""));
  if (!id) return null;
  const rank = nonNegativeInteger(
    wrapper.rank,
    wrapper.baseRank,
    source.rank,
    record(system.level).value,
    system.rank,
    system.level,
    fallback?.rank,
    defaults.rank,
  ) ?? 0;
  const castRank = nonNegativeInteger(wrapper.castRank, wrapper.rank, fallback?.castRank, defaults.castRank, rank) ?? rank;
  const usesValue = nonNegativeInteger(uses.value, uses.current, fallback?.uses?.value);
  const usesMax = nonNegativeInteger(uses.max, fallback?.uses?.max);
  const traditions = stringValues(traits.traditions ?? system.traditions);
  const category = text(wrapper.category)
    || text(system.category)
    || text(system.spellType)
    || fallback?.category
    || defaults.category
    || "spell";
  const image = text(source.img) || text(source.image) || fallback?.image || defaults.image || "";
  const uuid = text(source.uuid) || text(wrapper.uuid) || fallback?.uuid || defaults.uuid || "";
  const locationId = text(wrapper.locationId)
    || text(location.value)
    || text(system.location)
    || fallback?.locationId
    || defaults.locationId;
  const slotId = nonNegativeInteger(wrapper.slotId, wrapper.slot, fallback?.slotId, defaults.slotId);

  return {
    id,
    uuid,
    name: text(source.name) || text(wrapper.name) || fallback?.name || defaults.name || id,
    image,
    rank,
    category,
    ...(locationId ? { locationId } : {}),
    traditions: traditions.length > 0 ? traditions : fallback?.traditions ?? defaults.traditions ?? [],
    focus: wrapper.focus === true || system.focus === true || category === "focus" || fallback?.focus === true,
    castRank,
    ...(slotId !== undefined ? { slotId } : {}),
    ...(typeof wrapper.expended === "boolean" ? { expended: wrapper.expended } : fallback?.expended !== undefined ? { expended: fallback.expended } : {}),
    ...(typeof wrapper.prepared === "boolean" ? { prepared: wrapper.prepared } : fallback?.prepared !== undefined ? { prepared: fallback.prepared } : {}),
    ...(typeof wrapper.signature === "boolean" ? { signature: wrapper.signature } : typeof location.signature === "boolean" ? { signature: location.signature } : fallback?.signature !== undefined ? { signature: fallback.signature } : {}),
    ...(usesValue !== undefined && usesMax !== undefined ? { uses: { value: usesValue, max: usesMax } } : {}),
  };
}

function materializedSpellGroup(
  value: unknown,
  fallback?: CharacterSpellcastingGroupSnapshot,
  entryDefaults: Partial<CharacterSpellSnapshot> = {},
): CharacterSpellcastingGroupSnapshot | null {
  const data = record(value);
  const rank = nonNegativeInteger(data.rank, data.level, data.castRank, fallback?.rank);
  if (rank === undefined) return null;
  const rawSpells = hasOwn(data, "spells")
    ? values(data.spells)
    : hasOwn(data, "active")
      ? values(data.active)
      : hasOwn(data, "prepared")
        ? values(data.prepared)
        : null;
  const fallbackById = new Map((fallback?.spells ?? []).map(spell => [spell.id, spell]));
  const spells = rawSpells === null
    ? fallback?.spells ?? []
    : rawSpells.flatMap(rawSpell => {
      const rawId = identity(record(record(rawSpell).spell), identity(record(rawSpell)));
      const spell = materializedSpell(rawSpell, fallbackById.get(rawId), { ...entryDefaults, castRank: rank });
      return spell ? [spell] : [];
    });
  const slotData = record(data.slots ?? data.uses);
  const max = nonNegativeInteger(slotData.max, data.maxSlots, data.max, fallback?.slots?.max);
  const current = nonNegativeInteger(slotData.value, slotData.current, data.value, fallback?.slots?.value);

  return {
    rank,
    ...(max !== undefined ? { slots: { value: current ?? max, max } } : {}),
    spells,
  };
}

function materializedSpellcastingEntry(
  prepared: PF2ePreparedSpellcastingEntry,
  fallback?: CharacterSpellcastingEntrySnapshot,
): CharacterSpellcastingEntrySnapshot {
  const sheetData = record(prepared.sheetData);
  const sheetEntry = record(sheetData.entry);
  const statistic = record(sheetData.statistic ?? sheetEntry.statistic);
  const fallbackGroups = new Map((fallback?.groups ?? []).map(group => [group.rank, group]));
  const groupSource = sheetData.groups ?? sheetData.spellGroups ?? sheetData.ranks;
  const hasPreparedGroups = groupSource !== undefined;
  const groups = hasPreparedGroups
    ? values(groupSource).flatMap(rawGroup => {
      const rank = nonNegativeInteger(record(rawGroup).rank, record(rawGroup).level, record(rawGroup).castRank);
      const group = materializedSpellGroup(rawGroup, rank === undefined ? undefined : fallbackGroups.get(rank), {
        locationId: prepared.entryId,
        traditions: prepared.tradition ? [prepared.tradition] : [],
        focus: prepared.preparation === "focus",
      });
      return group ? [group] : [];
    })
    : fallback?.groups ?? [];
  const groupedSpells = groups.flatMap(group => group.spells);
  const rawEntrySpells = sheetData.spells === undefined ? [] : values(sheetData.spells);
  const fallbackById = new Map((fallback?.spells ?? []).map(spell => [spell.id, spell]));
  const entrySpells = rawEntrySpells.flatMap(rawSpell => {
    const rawId = identity(record(record(rawSpell).spell), identity(record(rawSpell)));
    const spell = materializedSpell(rawSpell, fallbackById.get(rawId), {
      locationId: prepared.entryId,
      traditions: prepared.tradition ? [prepared.tradition] : [],
      focus: prepared.preparation === "focus",
    });
    return spell ? [spell] : [];
  });
  const spellMap = new Map<string, CharacterSpellSnapshot>();
  for (const spell of [...groupedSpells, ...entrySpells, ...(groupedSpells.length === 0 && rawEntrySpells.length === 0 ? fallback?.spells ?? [] : [])]) {
    const key = `${spell.id}:${spell.castRank}:${spell.slotId ?? ""}`;
    spellMap.set(key, spell);
  }
  const image = text(sheetData.img) || text(sheetData.image) || text(sheetEntry.img) || fallback?.image;
  const preparation = text(sheetData.preparation) || prepared.preparation || fallback?.preparation || "";
  const focusData = record(sheetData.focus);

  return {
    id: prepared.entryId || prepared.id,
    name: text(sheetData.name) || prepared.name || fallback?.name || "Spellcasting",
    ...(image ? { image } : {}),
    tradition: text(sheetData.tradition) || prepared.tradition || fallback?.tradition || "",
    dc: nonNegativeInteger(statistic.dc, record(statistic.dc).value, sheetData.dc, fallback?.dc) ?? 0,
    spellAttack: nonNegativeInteger(statistic.mod, statistic.attack, sheetData.spellAttack, fallback?.spellAttack) ?? 0,
    preparation,
    focus: sheetData.isFocus === true || preparation === "focus" || fallback?.focus === true || Object.keys(focusData).length > 0,
    spells: [...spellMap.values()],
    groups,
  };
}

export function materializePF2eSpellcastingSnapshot(
  preparedEntries: readonly PF2ePreparedSpellcastingEntry[],
  fallback: CharacterSpellcastingSnapshot | null,
): CharacterSpellcastingSnapshot {
  const preparedById = new Map(preparedEntries.map(entry => [entry.entryId || entry.id, entry]));
  const consumed = new Set<string>();
  const entries = (fallback?.entries ?? []).map(fallbackEntry => {
    const prepared = preparedById.get(fallbackEntry.id);
    if (!prepared) return fallbackEntry;
    consumed.add(prepared.entryId || prepared.id);
    return materializedSpellcastingEntry(prepared, fallbackEntry);
  });
  for (const prepared of preparedEntries) {
    const id = prepared.entryId || prepared.id;
    if (!consumed.has(id)) entries.push(materializedSpellcastingEntry(prepared));
  }
  const preparedFocus = preparedEntries
    .map(entry => record(record(entry.sheetData).focus))
    .find(focus => optionalNumber(focus.value, focus.current, focus.max) !== undefined);
  const focusCurrent = nonNegativeInteger(preparedFocus?.value, preparedFocus?.current, fallback?.focusPoints.current) ?? 0;
  const focusMax = nonNegativeInteger(preparedFocus?.max, fallback?.focusPoints.max) ?? 0;

  return {
    hasSpellcasting: entries.length > 0 || Boolean(fallback?.hasSpellcasting),
    entries,
    unassignedSpells: fallback?.unassignedSpells ?? [],
    focusPoints: { current: focusCurrent, max: focusMax },
  };
}

export async function preparePF2eSpellcasting(
  actor: Actor | unknown,
  options: PF2ePreparedDataOptions = {},
): Promise<PF2ePreparedSpellcastingSnapshot> {
  const diagnostics: PF2ePreparedDataDiagnostic[] = [];
  const actorData = record(actor);
  const collections = entries(record(actorData.spellcasting).collections);
  const settled = await Promise.allSettled(
    collections.map(([key, collection]) => preparedSpellcastingEntry(key, collection, options)),
  );
  const preparedEntries = settled.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    diagnostics.push(diagnostic(`spellcasting.collection.${collections[index]?.[0] ?? index}`, result.reason));
    return [];
  });
  const fallback = adapterSpellcasting(actor, diagnostics);
  const snapshot = materializePF2eSpellcastingSnapshot(preparedEntries, fallback);

  if (preparedEntries.length > 0) {
    return {
      source: "prepared",
      entries: preparedEntries,
      snapshot,
      fallback,
      diagnostics,
      openPF2eSheet: false,
    };
  }

  return {
    source: fallback ? "adapter" : "pf2e-sheet",
    entries: [],
    snapshot,
    fallback,
    diagnostics,
    openPF2eSheet: fallback === null,
  };
}

async function preparedCraftingAbility(
  key: string,
  value: unknown,
  options: PF2ePreparedDataOptions,
): Promise<PF2ePreparedCraftingAbility> {
  const ability = record(value);
  const getSheetData = ability.getSheetData;
  const sheetData = typeof getSheetData === "function"
    ? await getSheetData.call(value, options.craftingSheetOptions ?? {})
    : ability.sheetData ?? value;
  return {
    slug: text(ability.slug) || key,
    label: text(ability.label) || text(ability.name) || text(ability.slug) || key,
    sheetData,
  };
}

function materializedCraftingFormula(
  value: unknown,
  fallback?: CharacterCraftingFormulaSnapshot,
): CharacterCraftingFormulaSnapshot | null {
  const formula = record(value);
  const item = record(formula.item);
  const uuid = text(formula.uuid) || text(item.uuid) || fallback?.uuid || "";
  if (!uuid) return null;
  const name = text(formula.name) || text(item.name) || fallback?.name;
  return {
    uuid,
    ...(name ? { name } : {}),
    quantity: nonNegativeInteger(formula.quantity, fallback?.quantity, 1) ?? 1,
    expended: typeof formula.expended === "boolean" ? formula.expended : fallback?.expended ?? false,
    signature: formula.isSignatureItem === true || formula.signature === true || fallback?.signature === true,
  };
}

function materializedCraftingAbility(
  prepared: PF2ePreparedCraftingAbility,
  fallback?: CharacterCraftingAbilitySnapshot,
): PF2eMaterializedCraftingAbility {
  const data = record(prepared.sheetData);
  const preparedSource = data.prepared ?? data.preparedFormulas ?? data.preparedFormulaData;
  const fallbackByUuid = new Map((fallback?.prepared ?? []).map(formula => [formula.uuid, formula]));
  const preparedFormulas = preparedSource === undefined
    ? fallback?.prepared ?? []
    : values(preparedSource).flatMap(rawFormula => {
      const formulaData = record(rawFormula);
      const item = record(formulaData.item);
      const uuid = text(formulaData.uuid) || text(item.uuid);
      const formula = materializedCraftingFormula(rawFormula, fallbackByUuid.get(uuid));
      return formula ? [formula] : [];
    });
  const resourceData = record(data.resource);
  const resource = text(data.resource) || text(resourceData.slug) || text(resourceData.name) || fallback?.resource;
  const maxSlots = nonNegativeInteger(data.maxSlots, record(data.slots).max, fallback?.maxSlots);
  const maxItemLevel = nonNegativeInteger(data.maxItemLevel, data.maxLevel, fallback?.maxItemLevel);
  const batchSize = nonNegativeInteger(data.batchSize, data.batch, data.quantityPerBatch);
  const resourceValue = nonNegativeInteger(resourceData.value, resourceData.current);
  const resourceMax = nonNegativeInteger(resourceData.max);

  return {
    slug: prepared.slug,
    label: prepared.label || fallback?.label || prepared.slug,
    isPrepared: typeof data.isPrepared === "boolean" ? data.isPrepared : typeof data.prepared === "boolean" ? data.prepared : fallback?.isPrepared ?? preparedSource !== undefined,
    isDailyPrep: typeof data.isDailyPrep === "boolean" ? data.isDailyPrep : typeof data.dailyPrep === "boolean" ? data.dailyPrep : fallback?.isDailyPrep ?? false,
    isAlchemical: typeof data.isAlchemical === "boolean" ? data.isAlchemical : typeof data.alchemical === "boolean" ? data.alchemical : fallback?.isAlchemical ?? false,
    ...(maxSlots !== undefined ? { maxSlots } : {}),
    ...(maxItemLevel !== undefined ? { maxItemLevel } : {}),
    ...(resource ? { resource } : {}),
    prepared: preparedFormulas,
    ...(batchSize !== undefined ? { batchSize } : {}),
    ...(resourceValue !== undefined ? { resourceValue } : {}),
    ...(resourceMax !== undefined ? { resourceMax } : {}),
  };
}

export function materializePF2eCraftingSnapshot(
  knownFormulas: readonly unknown[],
  preparedAbilities: readonly PF2ePreparedCraftingAbility[],
  fallback: CharacterCraftingSnapshot | null,
  formulasResolved = true,
): PF2eMaterializedCraftingSnapshot {
  const fallbackFormulas = new Map((fallback?.knownFormulas ?? []).map(formula => [formula.uuid, formula]));
  const materializedFormulas = formulasResolved
    ? knownFormulas.flatMap(rawFormula => {
      const formulaData = record(rawFormula);
      const item = record(formulaData.item);
      const uuid = text(formulaData.uuid) || text(item.uuid);
      const formula = materializedCraftingFormula(rawFormula, fallbackFormulas.get(uuid));
      return formula ? [formula] : [];
    })
    : fallback?.knownFormulas ?? [];
  const preparedBySlug = new Map(preparedAbilities.map(ability => [ability.slug, ability]));
  const consumed = new Set<string>();
  const abilities = (fallback?.abilities ?? []).map(fallbackAbility => {
    const prepared = preparedBySlug.get(fallbackAbility.slug);
    if (!prepared) return fallbackAbility;
    consumed.add(prepared.slug);
    return materializedCraftingAbility(prepared, fallbackAbility);
  });
  for (const prepared of preparedAbilities) {
    if (!consumed.has(prepared.slug)) abilities.push(materializedCraftingAbility(prepared));
  }

  return {
    available: formulasResolved || preparedAbilities.length > 0 || Boolean(fallback?.available),
    knownFormulas: materializedFormulas,
    abilities,
  };
}

export async function preparePF2eCrafting(
  actor: Actor | unknown,
  options: PF2ePreparedDataOptions = {},
): Promise<PF2ePreparedCraftingSnapshot> {
  const diagnostics: PF2ePreparedDataDiagnostic[] = [];
  const crafting = record(record(actor).crafting);
  const getFormulas = crafting.getFormulas;
  let formulasResolved = false;
  let knownFormulas: unknown[] = [];

  if (typeof getFormulas === "function") {
    try {
      knownFormulas = values(await getFormulas.call(record(actor).crafting));
      formulasResolved = true;
    } catch (error) {
      diagnostics.push(diagnostic("crafting.formulas", error));
    }
  }

  const abilityEntries = entries(crafting.abilities);
  const settled = await Promise.allSettled(
    abilityEntries.map(([key, ability]) => preparedCraftingAbility(key, ability, options)),
  );
  const abilities = settled.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    diagnostics.push(diagnostic(`crafting.ability.${abilityEntries[index]?.[0] ?? index}`, result.reason));
    return [];
  });
  const fallback = adapterCrafting(actor, diagnostics);
  const hasPreparedData = formulasResolved || abilities.length > 0;
  const snapshot = materializePF2eCraftingSnapshot(knownFormulas, abilities, fallback, formulasResolved);

  return {
    source: hasPreparedData ? "prepared" : fallback ? "adapter" : "pf2e-sheet",
    knownFormulas,
    abilities,
    snapshot,
    fallback,
    diagnostics,
    openPF2eSheet: !hasPreparedData && fallback === null,
  };
}

function sourceIdentityValues(source: unknown): string[] {
  if (typeof source === "string") return [source];
  const sourceData = record(source);
  return [sourceData.id, sourceData.uuid, sourceData.itemId, sourceData.slug, sourceData.source]
    .map(text)
    .filter(Boolean);
}

export function specialActionIdentityKeys(action: SpecialActionIdentity): string[] {
  const primary = [
    action.id,
    action.uuid,
    action.itemId,
    action.slug,
  ].map(text).filter(Boolean);
  const source = typeof action.source === "string" && primary.length > 0
    ? []
    : sourceIdentityValues(action.source);
  return Array.from(new Set([...primary, ...source].map(value => value.toLocaleLowerCase())));
}

function explicitlyAllowsDuplicate(action: SpecialActionIdentity): boolean {
  return action.allowDuplicateInSpecial === true || text(action.specialActionPurpose) !== "";
}

export function deduplicateSpecialActions<T extends SpecialActionIdentity>(
  specialActions: readonly T[],
  combatActions: readonly SpecialActionIdentity[] = [],
): T[] {
  const combatKeys = new Set(combatActions.flatMap(specialActionIdentityKeys));
  const seen = new Set<string>();

  return specialActions.filter(action => {
    const keys = specialActionIdentityKeys(action);
    if (!explicitlyAllowsDuplicate(action) && keys.some(key => combatKeys.has(key))) return false;
    if (keys.length === 0) return true;
    if (keys.some(key => seen.has(key))) return false;
    keys.forEach(key => seen.add(key));
    return true;
  });
}

export function deduplicateCharacterSpecialActions(
  specialActions: readonly CharacterActionSnapshot[],
  combatActions: readonly CharacterActionSnapshot[],
): CharacterActionSnapshot[] {
  return deduplicateSpecialActions(specialActions, combatActions);
}

export const PF2ePreparedDataService = {
  spellcasting: preparePF2eSpellcasting,
  crafting: preparePF2eCrafting,
  materializeSpellcasting: materializePF2eSpellcastingSnapshot,
  materializeCrafting: materializePF2eCraftingSnapshot,
  deduplicateSpecialActions,
} as const;
