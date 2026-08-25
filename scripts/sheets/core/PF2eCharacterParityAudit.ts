import { PF2eCharacterAdapter } from "../../core/PF2eCharacterAdapter.js";

type Data = Record<string, unknown>;

export type PF2eParityStatus = "match" | "mismatch" | "unavailable" | "unsupported";

export interface PF2eParityResult {
  category: string;
  key: string;
  label: string;
  status: PF2eParityStatus;
  pf2e?: unknown;
  ethernum?: unknown;
  pf2eDisplay: string;
  ethernumDisplay: string;
  message?: string;
}

export interface PF2eParityCategory {
  id: string;
  label: string;
  status: PF2eParityStatus;
  matched: number;
  checked: number;
  mismatchCount: number;
  results: PF2eParityResult[];
  mismatches: PF2eParityResult[];
}

export interface PF2eCharacterParityReport {
  actorId: string;
  generatedAt: number;
  status: "match" | "mismatch" | "partial";
  matched: number;
  checked: number;
  mismatchCount: number;
  categories: PF2eParityCategory[];
}

const CATEGORY_LABELS: Record<string, string> = {
  hp: "HP / Temporary HP",
  ac: "AC",
  perception: "Perception",
  saves: "Saves",
  skills: "Skills",
  strikes: "Strikes / MAP",
  inventory: "Inventory",
  currency: "Currency",
  bulk: "Bulk",
  conditions: "Conditions",
  heroPoints: "Hero Points",
  focus: "Focus",
  spellcasting: "Spellcasting",
};

function record(value: unknown): Data {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function finite(value: unknown): number | null {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function boolean(value: unknown): boolean {
  return value === true;
}

function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Data)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, normalized(entry)]));
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalized(left)) === JSON.stringify(normalized(right));
}

function display(value: unknown): string {
  if (value === undefined) return "Unavailable";
  if (typeof value === "string") return value || "Empty";
  const serialized = JSON.stringify(normalized(value));
  return serialized === undefined ? String(value) : serialized;
}

function result(
  category: string,
  key: string,
  label: string,
  pf2e: unknown,
  ethernum: unknown,
  options: { unavailableWhenBothMissing?: boolean; unsupported?: string } = {},
): PF2eParityResult {
  if (options.unsupported) {
    return {
      category,
      key,
      label,
      status: "unsupported",
      pf2eDisplay: display(pf2e),
      ethernumDisplay: display(ethernum),
      message: options.unsupported,
    };
  }
  const bothMissing = pf2e === undefined && ethernum === undefined;
  const status: PF2eParityStatus = bothMissing && options.unavailableWhenBothMissing
    ? "unavailable"
    : equal(pf2e, ethernum)
      ? "match"
      : "mismatch";
  return {
    category,
    key,
    label,
    status,
    ...(pf2e === undefined ? {} : { pf2e }),
    ...(ethernum === undefined ? {} : { ethernum }),
    pf2eDisplay: display(pf2e),
    ethernumDisplay: display(ethernum),
    ...(status === "mismatch" ? { message: "Prepared PF2e and Ethernum presentation values differ." } : {}),
  };
}

function itemKey(value: unknown): string {
  const item = record(value);
  return text(item.id) || text(item.itemId) || text(item.uuid) || text(item.slug) || text(item.name) || text(item.label);
}

function byKey(values: unknown[]): Map<string, Data> {
  const entries: Array<[string, Data]> = [];
  for (const value of values) {
    const key = itemKey(value);
    if (key) entries.push([key, record(value)]);
  }
  return new Map(entries);
}

function normalizedInventoryItem(value: unknown): Data {
  const item = record(value);
  return {
    quantity: finite(item.quantity) ?? 0,
    carryType: text(item.carryType),
    handsHeld: finite(item.handsHeld),
    invested: boolean(item.invested),
    containerId: text(item.containerId),
  };
}

function normalizedCondition(value: unknown): Data {
  const condition = record(value);
  return {
    slug: text(condition.slug),
    value: finite(condition.value),
    active: condition.active !== false && condition.enabled !== false,
  };
}

function normalizedSpellEntry(value: unknown): Data {
  const entry = record(value);
  const groups = list(entry.groups).flatMap(groupValue => {
    const group = record(groupValue);
    const slots = record(group.slots);
    const spells = list(group.spells);
    const slotValue = finite(slots.value);
    const slotMax = finite(slots.max);
    const hasSlots = Object.keys(slots).length > 0 && ((slotValue ?? 0) > 0 || (slotMax ?? 0) > 0);
    if (!hasSlots && spells.length === 0) return [];
    return [{
      rank: finite(group.rank) ?? 0,
      slots: hasSlots ? { value: slotValue, max: slotMax } : null,
    }];
  }).sort((left, right) => Number(left.rank) - Number(right.rank));
  return {
    tradition: text(entry.traditionSlug ?? entry.tradition),
    preparation: text(entry.preparation || entry.category),
    focus: boolean(entry.focus || entry.isFocus),
    dc: finite(entry.dc),
    spellAttack: finite(entry.spellAttack ?? entry.attack),
    groups,
  };
}

function presentationConditions(presentation: Data): unknown[] {
  const effects = presentation.effects;
  if (Array.isArray(effects)) return effects;
  const grouped = record(effects);
  return [...list(grouped.conditions), ...list(grouped.temporary), ...list(grouped.persistent)];
}

function categoryStatus(results: PF2eParityResult[]): PF2eParityStatus {
  if (results.some(entry => entry.status === "mismatch")) return "mismatch";
  if (results.some(entry => entry.status === "match")) return "match";
  if (results.some(entry => entry.status === "unavailable")) return "unavailable";
  return "unsupported";
}

export function auditPF2eCharacterParity(
  actor: Actor,
  presentationValue: unknown,
  generatedAt = Date.now(),
): PF2eCharacterParityReport {
  const presentation = record(presentationValue);
  const results: PF2eParityResult[] = [];
  const add = (...args: Parameters<typeof result>) => results.push(result(...args));

  const vitals = PF2eCharacterAdapter.vitals(actor);
  const presentedVitals = record(presentation.vitals);
  const presentedHP = record(presentedVitals.hp);
  add("hp", "hp", "Hit Points", { current: vitals.hp.current, max: vitals.hp.max }, {
    current: finite(presentedHP.current ?? presentedHP.value),
    max: finite(presentedHP.max),
  });
  add("hp", "temporary-hp", "Temporary HP", vitals.hp.temp, finite(presentedHP.temp) ?? 0);

  const defenses = PF2eCharacterAdapter.defenses(actor);
  const presentedDefenses = record(presentation.defenses);
  add("ac", "ac", "Armor Class", defenses.ac, finite(record(presentedDefenses.ac).value ?? presentedDefenses.ac));
  add("perception", "perception", "Perception", defenses.perception.modifier, finite(record(presentedDefenses.perception).modifier));
  const presentedSaves = record(presentedDefenses.saves);
  for (const save of ["fortitude", "reflex", "will"] as const) {
    add("saves", save, defenses.saves[save].label || save, defenses.saves[save].modifier, finite(record(presentedSaves[save]).modifier));
  }

  const skills = PF2eCharacterAdapter.skills(actor);
  const presentedSkills = byKey(list(presentation.skills));
  for (const skill of skills) {
    const counterpart = presentedSkills.get(skill.slug);
    add("skills", skill.slug, skill.label, { modifier: skill.modifier, rank: skill.rank }, counterpart
      ? { modifier: finite(counterpart.modifier), rank: finite(counterpart.rank) }
      : undefined);
  }

  const strikes = PF2eCharacterAdapter.strikes(actor);
  const presentedStrikes = byKey(list(presentation.strikes));
  for (const strike of strikes) {
    const counterpart = presentedStrikes.get(strike.id) ?? presentedStrikes.get(strike.itemId ?? "");
    const variants = byKey(list(counterpart?.attackVariants ?? counterpart?.variants).map((variant, index) => ({
      ...record(variant),
      id: text(record(variant).mapStage ?? record(variant).index ?? index),
    })));
    for (const variant of strike.variants) {
      const prepared = variants.get(String(variant.mapStage)) ?? variants.get(String(variant.index));
      add("strikes", `${strike.id}:map-${variant.mapStage}`, `${strike.label} MAP ${variant.mapStage}`,
        variant.modifier, prepared ? finite(prepared.modifier) : undefined);
    }
  }

  const inventory = PF2eCharacterAdapter.inventory(actor);
  const presentedInventory = record(presentation.inventory);
  const presentedItems = byKey(list(presentedInventory.all));
  for (const item of inventory.all) {
    const counterpart = presentedItems.get(item.id) ?? presentedItems.get(item.uuid);
    add("inventory", item.id || item.uuid, item.name, normalizedInventoryItem(item),
      counterpart ? normalizedInventoryItem(counterpart) : undefined);
  }
  add("inventory", "item-count", "Physical item count", inventory.all.length, presentedItems.size);

  const presentedCurrency = record(presentedInventory.currency);
  for (const denomination of ["pp", "gp", "sp", "cp"] as const) {
    add("currency", denomination, denomination.toUpperCase(), inventory.currency[denomination], finite(presentedCurrency[denomination]) ?? 0);
  }

  const presentedBulk = record(presentedInventory.bulk);
  add("bulk", "bulk", "Carried bulk", {
    value: inventory.bulk.value,
    max: inventory.bulk.max,
    encumbered: inventory.bulk.encumbered,
    available: inventory.bulk.available,
  }, {
    value: finite(presentedBulk.value),
    max: finite(presentedBulk.max),
    encumbered: boolean(presentedBulk.encumbered),
    available: boolean(presentedBulk.available),
  });

  const conditions = PF2eCharacterAdapter.effects(actor);
  const presentedConditions = byKey(presentationConditions(presentation));
  for (const condition of conditions) {
    const counterpart = presentedConditions.get(condition.id) ?? presentedConditions.get(condition.slug);
    add("conditions", condition.id || condition.slug, condition.name, normalizedCondition(condition),
      counterpart ? normalizedCondition(counterpart) : undefined);
  }
  add("conditions", "condition-count", "Condition and effect count", conditions.length, presentedConditions.size);

  const heroPoints = record(presentedVitals.heroPoints);
  add("heroPoints", "hero-points", "Hero Points", vitals.heroPoints, {
    current: finite(heroPoints.current ?? heroPoints.value) ?? 0,
    max: finite(heroPoints.max) ?? 0,
  });

  const spellcasting = PF2eCharacterAdapter.spellcasting(actor);
  const presentedSpellcasting = record(presentation.spellcasting);
  const presentedFocus = record(presentedSpellcasting.focusPoints);
  add("focus", "focus-points", "Focus Points", spellcasting.focusPoints, {
    current: finite(presentedFocus.current) ?? 0,
    max: finite(presentedFocus.max) ?? 0,
  });
  add("spellcasting", "available", "Spellcasting available", spellcasting.hasSpellcasting,
    boolean(presentedSpellcasting.hasSpellcasting));
  const presentedEntries = byKey(list(presentedSpellcasting.entries));
  for (const entry of spellcasting.entries) {
    const counterpart = presentedEntries.get(entry.id);
    add("spellcasting", entry.id, entry.name, normalizedSpellEntry(entry),
      counterpart ? normalizedSpellEntry(counterpart) : undefined);
  }
  add("spellcasting", "entry-count", "Spellcasting entry count", spellcasting.entries.length, presentedEntries.size);

  const categories = Object.entries(CATEGORY_LABELS).map(([id, label]) => {
    const categoryResults = results.filter(entry => entry.category === id);
    const checked = categoryResults.filter(entry => ["match", "mismatch"].includes(entry.status)).length;
    return {
      id,
      label,
      status: categoryStatus(categoryResults),
      matched: categoryResults.filter(entry => entry.status === "match").length,
      checked,
      mismatchCount: categoryResults.filter(entry => entry.status === "mismatch").length,
      results: categoryResults,
      mismatches: categoryResults.filter(entry => entry.status === "mismatch"),
    } satisfies PF2eParityCategory;
  });
  const checked = categories.reduce((sum, category) => sum + category.checked, 0);
  const matched = categories.reduce((sum, category) => sum + category.matched, 0);
  const mismatchCount = categories.reduce((sum, category) => sum + category.mismatchCount, 0);
  const mismatches = categories.some(category => category.status === "mismatch");
  const partial = categories.some(category => ["unavailable", "unsupported"].includes(category.status));
  return {
    actorId: text(actor.id ?? actor.uuid ?? actor.name ?? "actor"),
    generatedAt,
    status: mismatches ? "mismatch" : partial ? "partial" : "match",
    matched,
    checked,
    mismatchCount,
    categories,
  };
}

export const PF2eCharacterParityAudit = Object.freeze({ audit: auditPF2eCharacterParity });
