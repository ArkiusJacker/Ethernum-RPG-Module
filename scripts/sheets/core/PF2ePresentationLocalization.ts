type Data = Record<string, unknown>;

export type PF2ePresentationCategory =
  | "language"
  | "sense"
  | "senseAcuity"
  | "weaponGroup"
  | "armorGroup"
  | "trait"
  | "tradition"
  | "preparation"
  | "damageType"
  | "actionType"
  | "movement";

const RANK_KEYS: Record<number, string[]> = {
  0: ["PF2E.ProficiencyLevel0", "PF2E.ProficiencyLevel.0"],
  1: ["PF2E.ProficiencyLevel1", "PF2E.ProficiencyLevel.1"],
  2: ["PF2E.ProficiencyLevel2", "PF2E.ProficiencyLevel.2"],
  3: ["PF2E.ProficiencyLevel3", "PF2E.ProficiencyLevel.3"],
  4: ["PF2E.ProficiencyLevel4", "PF2E.ProficiencyLevel.4"],
};

const RANK_FALLBACKS = ["Untrained", "Trained", "Expert", "Master", "Legendary"];

const CATEGORY_DICTIONARIES: Record<PF2ePresentationCategory, string[]> = {
  language: ["languages"],
  sense: ["senses", "senseTypes"],
  senseAcuity: ["senseAcuities"],
  weaponGroup: ["weaponGroups"],
  armorGroup: ["armorGroups"],
  trait: [
    "actionTraits", "ancestryTraits", "armorTraits", "classTraits", "creatureTraits",
    "equipmentTraits", "featTraits", "hazardTraits", "itemTraits", "npcAttackTraits",
    "spellTraits", "weaponTraits", "traits",
  ],
  tradition: ["magicTraditions", "traditions"],
  preparation: ["preparationTypes", "spellPreparationTypes"],
  damageType: ["damageTypes"],
  actionType: ["actionTypes", "actionCategories"],
  movement: ["movementTypes", "speedTypes"],
};

const CATEGORY_KEYS: Partial<Record<PF2ePresentationCategory, Record<string, string[]>>> = {
  senseAcuity: {
    precise: ["PF2E.Actor.Creature.Sense.Acuity.Precise"],
    imprecise: ["PF2E.Actor.Creature.Sense.Acuity.Imprecise"],
    vague: ["PF2E.Actor.Creature.Sense.Acuity.Vague"],
  },
  preparation: {
    prepared: ["PF2E.SpellPreparationTypePrepared"],
    spontaneous: ["PF2E.SpellPreparationTypeSpontaneous"],
    innate: ["PF2E.SpellPreparationTypeInnate"],
    focus: ["PF2E.SpellPreparationTypeFocus"],
    ritual: ["PF2E.SpellPreparationTypeRitual"],
    items: ["PF2E.SpellPreparationTypeItems"],
  },
  movement: {
    land: ["PF2E.SpeedTypesLand", "PF2E.Actor.Speed.Land"],
    fly: ["PF2E.SpeedTypesFly", "PF2E.Actor.Speed.Fly"],
    swim: ["PF2E.SpeedTypesSwim", "PF2E.Actor.Speed.Swim"],
    climb: ["PF2E.SpeedTypesClimb", "PF2E.Actor.Speed.Climb"],
    burrow: ["PF2E.SpeedTypesBurrow", "PF2E.Actor.Speed.Burrow"],
  },
};

function record(value: unknown): Data {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
}

function runtime(name: string): unknown {
  return (globalThis as unknown as Data)[name];
}

function pf2eConfig(): Data {
  return record(record(runtime("CONFIG")).PF2E);
}

function i18n(): Data {
  return record(record(runtime("game")).i18n);
}

function localized(key: string): string {
  if (!key) return "";
  const service = i18n();
  const localize = service.localize;
  if (typeof localize !== "function") return "";
  try {
    const result = String(localize.call(service, key) ?? "");
    return result && result !== key ? result : "";
  } catch {
    return "";
  }
}

function resolveLabelValue(value: unknown): string {
  if (typeof value === "string") return localized(value) || value;
  const data = record(value);
  const candidate = [data.label, data.name, data.value].find(entry => typeof entry === "string");
  return typeof candidate === "string" ? localized(candidate) || candidate : "";
}

function dictionaryValue(dictionary: unknown, slug: string): unknown {
  if (dictionary instanceof Map) return dictionary.get(slug);
  return record(dictionary)[slug];
}

function humanize(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function keysLabel(keys: readonly string[]): string {
  return keys.map(localized).find(Boolean) ?? "";
}

export function localizePF2eRank(rankValue: unknown): string {
  const rank = Math.max(0, Math.min(4, Math.trunc(Number(rankValue) || 0)));
  return keysLabel(RANK_KEYS[rank] ?? []) || RANK_FALLBACKS[rank] || String(rank);
}

export function localizePF2eValue(category: PF2ePresentationCategory, slugValue: unknown): string {
  const slug = String(slugValue ?? "").trim();
  if (!slug) return "";
  const config = pf2eConfig();
  for (const dictionaryName of CATEGORY_DICTIONARIES[category]) {
    const label = resolveLabelValue(dictionaryValue(config[dictionaryName], slug));
    if (label) return label;
  }
  const directLabel = keysLabel(CATEGORY_KEYS[category]?.[slug] ?? []);
  return directLabel || localized(slug) || humanize(slug);
}

export function localizePF2eValues(
  category: PF2ePresentationCategory,
  values: readonly unknown[],
): string[] {
  return Array.from(new Set(values.map(value => localizePF2eValue(category, value)).filter(Boolean)));
}

export const PF2ePresentationLocalization = {
  rank: localizePF2eRank,
  value: localizePF2eValue,
  values: localizePF2eValues,
  language: (slug: unknown) => localizePF2eValue("language", slug),
  sense: (slug: unknown) => localizePF2eValue("sense", slug),
  senseAcuity: (slug: unknown) => localizePF2eValue("senseAcuity", slug),
  weaponGroup: (slug: unknown) => localizePF2eValue("weaponGroup", slug),
  armorGroup: (slug: unknown) => localizePF2eValue("armorGroup", slug),
  trait: (slug: unknown) => localizePF2eValue("trait", slug),
  tradition: (slug: unknown) => localizePF2eValue("tradition", slug),
  preparation: (slug: unknown) => localizePF2eValue("preparation", slug),
  damageType: (slug: unknown) => localizePF2eValue("damageType", slug),
  actionType: (slug: unknown) => localizePF2eValue("actionType", slug),
  movement: (slug: unknown) => localizePF2eValue("movement", slug),
  distanceUnit: () => localized("PF2E.Foot.Abbreviation") || "ft",
} as const;
