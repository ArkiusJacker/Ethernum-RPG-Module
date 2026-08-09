export interface EthernumPF2eCharacterCondition {
  slug: string;
  name: string;
  value?: number;
}

export interface EthernumPF2eCharacterSnapshot {
  actorId: string;
  actorUuid: string;
  name: string;
  image: string;
  level: number;
  className: string;
  ancestryName: string;
  heritageName?: string;
  hp: {
    current: number;
    max: number;
    temp: number;
  };
  ac: number;
  perception: number;
  speed: number;
  saves: {
    fortitude: number;
    reflex: number;
    will: number;
  };
  heroPoints: number;
  conditions: EthernumPF2eCharacterCondition[];
}

export interface CharacterIdentitySnapshot {
  actorId: string;
  actorUuid: string;
  name: string;
  image: string;
  level: number;
  className: string;
  ancestryName: string;
  heritageName?: string;
  backgroundName?: string;
  playerName?: string;
}

export interface CharacterVitalsSnapshot {
  hp: {
    current: number;
    max: number;
    temp: number;
  };
  ac: number;
  perception: number;
  heroPoints: {
    current: number;
    max: number;
  };
  dying?: number;
  wounded?: number;
  doomed?: number;
}

export type CharacterAbilitySlug = "str" | "dex" | "con" | "int" | "wis" | "cha";

export interface CharacterAbilitySnapshot {
  slug: CharacterAbilitySlug;
  label: string;
  modifier: number;
}

export type CharacterAbilitiesSnapshot = CharacterAbilitySnapshot[];

export interface CharacterSkillSnapshot {
  slug: string;
  label: string;
  modifier: number;
  rank: number;
  rankLabel: string;
  rollable: boolean;
}

export type CharacterSkillsSnapshot = CharacterSkillSnapshot[];

export type CharacterSaveSlug = "fortitude" | "reflex" | "will";

export interface CharacterDefenseStatisticSnapshot {
  slug: CharacterSaveSlug | "perception";
  label: string;
  modifier: number;
  rollable: boolean;
}

export interface CharacterDefenseTraitSnapshot {
  type: string;
  label: string;
  value?: number;
}

export interface CharacterDefensesSnapshot {
  ac: number;
  perception: CharacterDefenseStatisticSnapshot;
  saves: Record<CharacterSaveSlug, CharacterDefenseStatisticSnapshot>;
  immunities: CharacterDefenseTraitSnapshot[];
  resistances: CharacterDefenseTraitSnapshot[];
  weaknesses: CharacterDefenseTraitSnapshot[];
}

export type CharacterMovementType = "land" | "fly" | "swim" | "climb" | "burrow";

export interface CharacterMovementSpeedSnapshot {
  type: CharacterMovementType;
  label: string;
  value: number;
}

export interface CharacterMovementSnapshot {
  land: number;
  fly?: number;
  swim?: number;
  climb?: number;
  burrow?: number;
  speeds: CharacterMovementSpeedSnapshot[];
}

export interface CharacterStrikeSnapshot {
  id: string;
  itemId?: string;
  label: string;
  image?: string;
  traits: string[];
  attackModifier: number;
  map: {
    first: number;
    second: number;
    third: number;
  };
  damage?: string;
  usable: boolean;
}

export interface CharacterActionSnapshot {
  id: string;
  itemId?: string;
  label: string;
  image?: string;
  actionType: string;
  actions?: number;
  traits: string[];
  usable: boolean;
}

export type CharacterInventoryCategory =
  | "weapons"
  | "armor"
  | "shields"
  | "consumables"
  | "equipment"
  | "treasure"
  | "containers"
  | "other";

export interface CharacterInventoryItemSnapshot {
  id: string;
  uuid: string;
  name: string;
  image: string;
  type: string;
  quantity: number;
  equipped?: boolean;
  invested?: boolean;
  carryType?: "held" | "worn" | "stowed" | "dropped" | string;
  handsHeld?: number;
  inSlot?: boolean;
  hands?: "0" | "1" | "1+" | "2" | string;
  isInvestable?: boolean;
  bulk?: string;
  price?: string;
}

export interface CharacterBulkSnapshot {
  value: number | null;
  max: number | null;
  encumberedAt?: number;
  percentage: number;
  encumbered: boolean;
  available: boolean;
}

export interface CharacterInventorySnapshot {
  weapons: CharacterInventoryItemSnapshot[];
  armor: CharacterInventoryItemSnapshot[];
  shields: CharacterInventoryItemSnapshot[];
  consumables: CharacterInventoryItemSnapshot[];
  equipment: CharacterInventoryItemSnapshot[];
  treasure: CharacterInventoryItemSnapshot[];
  containers: CharacterInventoryItemSnapshot[];
  other: CharacterInventoryItemSnapshot[];
  all: CharacterInventoryItemSnapshot[];
  bulk: CharacterBulkSnapshot;
}

export type CharacterFeatCategory =
  | "class"
  | "ancestry"
  | "skill"
  | "general"
  | "archetype"
  | "bonus"
  | "other";

export interface CharacterFeatSnapshot {
  id: string;
  uuid: string;
  name: string;
  image: string;
  category: CharacterFeatCategory;
  level: number;
  traits: string[];
}

export interface CharacterSpellSnapshot {
  id: string;
  uuid: string;
  name: string;
  image: string;
  rank: number;
  category: string;
  locationId?: string;
  traditions: string[];
  focus: boolean;
  castRank: number;
  slotId?: number;
  expended?: boolean;
  prepared?: boolean;
  signature?: boolean;
  uses?: {
    value: number;
    max: number;
  };
}

export interface CharacterSpellcastingGroupSnapshot {
  rank: number;
  slots?: {
    value: number;
    max: number;
  };
  spells: CharacterSpellSnapshot[];
}

export interface CharacterSpellcastingEntrySnapshot {
  id: string;
  name: string;
  image?: string;
  tradition: string;
  dc: number;
  spellAttack: number;
  preparation: string;
  focus: boolean;
  spells: CharacterSpellSnapshot[];
  groups: CharacterSpellcastingGroupSnapshot[];
}

export interface CharacterSpellcastingSnapshot {
  hasSpellcasting: boolean;
  entries: CharacterSpellcastingEntrySnapshot[];
  unassignedSpells: CharacterSpellSnapshot[];
  focusPoints: {
    current: number;
    max: number;
  };
}

export type CharacterEffectKind = "condition" | "effect" | "persistent-damage";

export interface CharacterEffectSnapshot {
  id: string;
  uuid: string;
  slug: string;
  name: string;
  image: string;
  kind: CharacterEffectKind;
  value?: number;
  duration?: string;
  active: boolean;
}

export interface CharacterNumericResourceSnapshot {
  current: number;
  max: number;
}

export interface CharacterResourceSnapshot {
  heroPoints: CharacterNumericResourceSnapshot;
  focusPoints: CharacterNumericResourceSnapshot;
  mythicPoints?: CharacterNumericResourceSnapshot;
  classResources: Record<string, CharacterNumericResourceSnapshot>;
}

export interface PF2eCharacterAdapterInterface {
  identity(actor: Actor): CharacterIdentitySnapshot;
  vitals(actor: Actor): CharacterVitalsSnapshot;
  abilities(actor: Actor): CharacterAbilitiesSnapshot;
  skills(actor: Actor): CharacterSkillsSnapshot;
  defenses(actor: Actor): CharacterDefensesSnapshot;
  movement(actor: Actor): CharacterMovementSnapshot;
  strikes(actor: Actor): CharacterStrikeSnapshot[];
  actions(actor: Actor): CharacterActionSnapshot[];
  inventory(actor: Actor): CharacterInventorySnapshot;
  feats(actor: Actor): CharacterFeatSnapshot[];
  spellcasting(actor: Actor): CharacterSpellcastingSnapshot;
  effects(actor: Actor): CharacterEffectSnapshot[];
  resources(actor: Actor): CharacterResourceSnapshot;
}

type UnknownRecord = Record<string, unknown>;

const ABILITY_SLUGS: CharacterAbilitySlug[] = ["str", "dex", "con", "int", "wis", "cha"];
const SAVE_SLUGS: CharacterSaveSlug[] = ["fortitude", "reflex", "will"];
const MOVEMENT_TYPES: CharacterMovementType[] = ["land", "fly", "swim", "climb", "burrow"];
const RANK_LABELS = ["Untrained", "Trained", "Expert", "Master", "Legendary"];

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function finite(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function integer(value: unknown, fallback = 0): number {
  return Math.trunc(finite(value, fallback));
}

function firstFinite(values: unknown[], fallback = 0): number {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

function optionalFinite(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function collectionValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const valuesMethod = (value as { values?: () => IterableIterator<unknown> }).values;
  if (typeof valuesMethod === "function") {
    try {
      return Array.from(valuesMethod.call(value));
    } catch {
      // Continue to the generic iterator fallback.
    }
  }

  const iterable = value as { [Symbol.iterator]?: () => Iterator<unknown> };
  if (typeof iterable[Symbol.iterator] === "function") {
    try {
      return Array.from(iterable as Iterable<unknown>);
    } catch {
      return [];
    }
  }
  return [];
}

function recordEntries(value: unknown): Array<[string, UnknownRecord]> {
  if (!value || typeof value !== "object") return [];
  if (value instanceof Map) {
    return Array.from(value.entries()).map(([key, entry]) => [String(key), record(entry)]);
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => {
      const data = record(entry);
      return [text(data.slug, text(data.id, String(index))), data];
    });
  }
  return Object.entries(record(value)).map(([key, entry]) => [key, record(entry)]);
}

function uniqueDocuments(collections: unknown[]): UnknownRecord[] {
  const seenObjects = new Set<object>();
  const seenIds = new Set<string>();
  const result: UnknownRecord[] = [];

  for (const collection of collections) {
    for (const value of collectionValues(collection)) {
      if (!value || typeof value !== "object") continue;
      if (seenObjects.has(value)) continue;
      seenObjects.add(value);

      const data = record(value);
      const documentId = text(data.uuid) || text(data.id) || text(data._id);
      if (documentId && seenIds.has(documentId)) continue;
      if (documentId) seenIds.add(documentId);
      result.push(data);
    }
  }
  return result;
}

function actorItems(actor: UnknownRecord): UnknownRecord[] {
  const typedItems = Object.entries(record(actor.itemTypes)).flatMap(([type, collection]) =>
    collectionValues(collection).map(value => {
      const item = record(value);
      return text(item.type) ? item : { ...item, type };
    }));
  return uniqueDocuments([actor.items, typedItems]);
}

function itemsOfType(actor: UnknownRecord, ...types: string[]): UnknownRecord[] {
  const accepted = new Set(types);
  return actorItems(actor).filter(item => accepted.has(text(item.type)));
}

function itemName(actor: UnknownRecord, type: string): string {
  const directName = text(record(actor[type]).name);
  if (directName) return directName;
  return text(itemsOfType(actor, type)[0]?.name);
}

function itemImage(item: UnknownRecord): string {
  return text(item.img, text(item.image));
}

function itemId(item: UnknownRecord): string {
  return text(item.id, text(item._id));
}

function preparedStatistic(actor: UnknownRecord, group: string, slug: string): UnknownRecord {
  const source = actor[group];
  if (source instanceof Map) return record(source.get(slug));
  return record(record(source)[slug]);
}

function statisticModifier(prepared: UnknownRecord, stored: UnknownRecord): number {
  return integer(firstFinite([
    prepared.mod,
    prepared.modifier,
    prepared.value,
    record(prepared.check).mod,
    record(prepared.check).modifier,
    stored.mod,
    stored.modifier,
    stored.value,
    stored.totalModifier,
    stored.total,
  ]));
}

function hasRollMethod(statistic: UnknownRecord): boolean {
  return typeof statistic.roll === "function" || typeof record(statistic.check).roll === "function";
}

function stringArray(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(record(value).value)
      ? record(value).value as unknown[]
      : collectionValues(value);
  return source.flatMap(entry => {
    if (typeof entry === "string" && entry.trim()) return [entry.trim()];
    const data = record(entry);
    const label = text(data.label, text(data.name, text(data.slug)));
    return label ? [label] : [];
  });
}

function conditionValue(item: UnknownRecord): number | undefined {
  const system = record(item.system);
  const value = firstFinite([
    record(system.value).value,
    system.value,
    record(item.value).value,
    item.value,
  ], Number.NaN);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined;
}

function resourceValue(value: unknown): CharacterNumericResourceSnapshot {
  const data = record(value);
  const current = Math.max(0, integer(firstFinite([data.value, data.current])));
  const maxCandidate = firstFinite([data.max, data.maximum], current);
  return { current, max: Math.max(current, integer(maxCandidate)) };
}

function resolvePlayerName(actor: UnknownRecord): string {
  const direct = text(actor.playerName)
    || text(record(actor.player).name)
    || text(record(actor.user).name)
    || text(record(actor.primaryUpdater).name);
  if (direct) return direct;

  const ownership = record(actor.ownership);
  const ownerId = Object.entries(ownership).find(([id, level]) => id !== "default" && finite(level) >= 3)?.[0];
  if (!ownerId) return "";

  const foundryGame = record((globalThis as unknown as UnknownRecord).game);
  const user = collectionValues(foundryGame.users).map(record).find(candidate => text(candidate.id) === ownerId);
  return text(user?.name);
}

export function readCharacterIdentity(actorValue: Actor | unknown): CharacterIdentitySnapshot {
  const actor = record(actorValue);
  const system = record(actor.system);
  const details = record(system.details);
  const level = record(details.level);
  const systemLevel = record(system.level);
  const heritageName = itemName(actor, "heritage");
  const backgroundName = itemName(actor, "background");
  const playerName = resolvePlayerName(actor);

  return {
    actorId: text(actor.id),
    actorUuid: text(actor.uuid),
    name: text(actor.name),
    image: text(actor.img, text(actor.image)),
    level: Math.max(0, integer(firstFinite([level.value, systemLevel.value, system.level, actor.level]))),
    className: itemName(actor, "class"),
    ancestryName: itemName(actor, "ancestry"),
    ...(heritageName ? { heritageName } : {}),
    ...(backgroundName ? { backgroundName } : {}),
    ...(playerName ? { playerName } : {}),
  };
}

export function readCharacterEffects(actorValue: Actor | unknown): CharacterEffectSnapshot[] {
  const actor = record(actorValue);
  const itemTypes = record(actor.itemTypes);
  const withImplicitType = (collection: unknown, type: "condition" | "effect") => collectionValues(collection).map(value => {
    const item = record(value);
    return text(item.type) ? item : { ...item, type };
  });
  const documents = uniqueDocuments([
    actor.items,
    withImplicitType(itemTypes.condition, "condition"),
    withImplicitType(itemTypes.effect, "effect"),
    withImplicitType(actor.effects, "effect"),
  ]);

  return documents.flatMap(item => {
    const type = text(item.type);
    if (type !== "condition" && type !== "effect") return [];
    const system = record(item.system);
    const slug = text(item.slug, text(system.slug, itemId(item)));
    const name = text(item.name, slug);
    const persistent = slug === "persistent-damage" || slug.startsWith("persistent-damage-");
    const durationData = record(system.duration);
    const remaining = firstFinite([durationData.remaining, durationData.value, system.remaining], Number.NaN);
    const unit = text(durationData.unit, text(durationData.units));
    const duration = text(system.duration)
      || (Number.isFinite(remaining) ? `${integer(remaining)}${unit ? ` ${unit}` : ""}` : "");
    const value = conditionValue(item);

    return [{
      id: itemId(item),
      uuid: text(item.uuid),
      slug,
      name,
      image: itemImage(item),
      kind: persistent ? "persistent-damage" : type,
      ...(value !== undefined ? { value } : {}),
      ...(duration ? { duration } : {}),
      active: item.active !== false && !system.expired,
    }];
  });
}

export function readCharacterVitals(actorValue: Actor | unknown): CharacterVitalsSnapshot {
  const actor = record(actorValue);
  const system = record(actor.system);
  const attributes = record(system.attributes);
  const hp = record(attributes.hp);
  const ac = record(attributes.ac);
  const perception = record(system.perception);
  const resources = record(system.resources);
  const heroPoints = resourceValue(resources.heroPoints);
  const effects = readCharacterEffects(actorValue);
  const condition = (slug: string) => effects.find(effect => effect.slug === slug)?.value;
  const preparedPerception = record(actor.perception);
  const preparedAC = record(actor.armorClass);
  const dying = condition("dying") ?? finite(record(attributes.dying).value, Number.NaN);
  const wounded = condition("wounded") ?? finite(record(attributes.wounded).value, Number.NaN);
  const doomed = condition("doomed") ?? finite(record(attributes.doomed).value, Number.NaN);

  return {
    hp: {
      current: Math.max(0, integer(hp.value)),
      max: Math.max(0, integer(hp.max)),
      temp: Math.max(0, integer(hp.temp)),
    },
    ac: integer(firstFinite([preparedAC.value, preparedAC.mod, ac.value, ac.mod])),
    perception: statisticModifier(preparedPerception, perception),
    heroPoints,
    ...(Number.isFinite(dying) && dying > 0 ? { dying: integer(dying) } : {}),
    ...(Number.isFinite(wounded) && wounded > 0 ? { wounded: integer(wounded) } : {}),
    ...(Number.isFinite(doomed) && doomed > 0 ? { doomed: integer(doomed) } : {}),
  };
}

export function readCharacterAbilities(actorValue: Actor | unknown): CharacterAbilitiesSnapshot {
  const actor = record(actorValue);
  const systemAbilities = record(record(actor.system).abilities);
  const preparedAbilities = record(actor.abilities);

  return ABILITY_SLUGS.map(slug => {
    const prepared = record(preparedAbilities[slug]);
    const stored = record(systemAbilities[slug]);
    return {
      slug,
      label: text(prepared.label, text(stored.label, slug.toUpperCase())),
      modifier: statisticModifier(prepared, stored),
    };
  });
}

export function readCharacterSkills(actorValue: Actor | unknown): CharacterSkillsSnapshot {
  const actor = record(actorValue);
  const preparedEntries = recordEntries(actor.skills);
  const storedEntries = recordEntries(record(actor.system).skills);
  const slugs = new Set([...preparedEntries.map(([slug]) => slug), ...storedEntries.map(([slug]) => slug)]);
  const preparedMap = new Map(preparedEntries);
  const storedMap = new Map(storedEntries);

  return Array.from(slugs).map(slug => {
    const prepared = preparedMap.get(slug) ?? {};
    const stored = storedMap.get(slug) ?? {};
    const rank = Math.max(0, Math.min(4, integer(firstFinite([
      prepared.rank,
      prepared.proficient,
      stored.rank,
      stored.proficient,
    ]))));
    return {
      slug,
      label: text(prepared.label, text(stored.label, slug)),
      modifier: statisticModifier(prepared, stored),
      rank,
      rankLabel: text(prepared.rankLabel, text(stored.rankLabel, RANK_LABELS[rank])),
      rollable: hasRollMethod(prepared),
    };
  }).sort((left, right) => left.label.localeCompare(right.label));
}

export function readCharacterDefenses(actorValue: Actor | unknown): CharacterDefensesSnapshot {
  const actor = record(actorValue);
  const system = record(actor.system);
  const storedSaves = record(system.saves);
  const preparedPerception = record(actor.perception);
  const storedPerception = record(system.perception);
  const preparedAC = record(actor.armorClass);
  const storedAC = record(record(system.attributes).ac);
  const attributes = record(system.attributes);
  const defenseTraits = (value: unknown): CharacterDefenseTraitSnapshot[] => {
    const source = collectionValues(value);
    const entries = source.length > 0 ? source : Object.values(record(value));
    return entries.flatMap(entryValue => {
      const entry = record(entryValue);
      const type = text(entry.type, text(entry.slug, text(entry.label, text(entry.name))));
      if (!type) return [];
      const label = text(entry.label, text(entry.name, type));
      const value = optionalFinite(entry.value);
      return [{ type, label, ...(value !== undefined ? { value } : {}) }];
    });
  };

  const saves = Object.fromEntries(SAVE_SLUGS.map(slug => {
    const prepared = preparedStatistic(actor, "saves", slug);
    const stored = record(storedSaves[slug]);
    return [slug, {
      slug,
      label: text(prepared.label, text(stored.label, slug[0].toUpperCase() + slug.slice(1))),
      modifier: statisticModifier(prepared, stored),
      rollable: hasRollMethod(prepared),
    } satisfies CharacterDefenseStatisticSnapshot];
  })) as Record<CharacterSaveSlug, CharacterDefenseStatisticSnapshot>;

  return {
    ac: integer(firstFinite([preparedAC.value, preparedAC.mod, storedAC.value, storedAC.mod])),
    perception: {
      slug: "perception",
      label: text(preparedPerception.label, text(storedPerception.label, "Perception")),
      modifier: statisticModifier(preparedPerception, storedPerception),
      rollable: hasRollMethod(preparedPerception),
    },
    saves,
    immunities: defenseTraits(attributes.immunities),
    resistances: defenseTraits(attributes.resistances),
    weaknesses: defenseTraits(attributes.weaknesses),
  };
}

function normalizeMovementType(value: unknown): CharacterMovementType | undefined {
  const slug = text(value).toLowerCase();
  if (slug === "land" || slug === "land-speed" || slug === "speed") return "land";
  return MOVEMENT_TYPES.includes(slug as CharacterMovementType) ? slug as CharacterMovementType : undefined;
}

export function readCharacterMovement(actorValue: Actor | unknown): CharacterMovementSnapshot {
  const actor = record(actorValue);
  const system = record(actor.system);
  const systemMovement = record(system.movement);
  const preparedSpeed = record(actor.speed);
  const preparedMovement = record(actor.movement);
  const hasModernMovement = Object.keys(systemMovement).length > 0 || Object.keys(preparedMovement).length > 0;
  const systemSpeed = hasModernMovement ? {} : record(record(system.attributes).speed);
  const movementEntries = (value: unknown): Array<[string, unknown]> => {
    if (Array.isArray(value)) {
      return value.map((entry, index) => {
        const data = record(entry);
        return [text(data.type, text(data.slug, String(index))), entry];
      });
    }
    if (value instanceof Map) return Array.from(value.entries()).map(([type, entry]) => [String(type), entry]);
    if (value instanceof Set) {
      return Array.from(value).map((entry, index) => {
        const data = record(entry);
        return [text(data.type, text(data.slug, String(index))), entry];
      });
    }
    return Object.entries(record(value));
  };
  const modernSpeeds = [
    ...movementEntries(preparedMovement.speeds),
    ...movementEntries(systemMovement.speeds),
  ];
  const modernLand = modernSpeeds.find(([type, speed]) =>
    normalizeMovementType(record(speed).type ?? record(speed).slug ?? type) === "land",
  )?.[1];
  const modernLandData = record(modernLand);
  const byType = new Map<CharacterMovementType, CharacterMovementSpeedSnapshot>();
  const add = (typeValue: unknown, valueCandidates: unknown[], labelValue?: unknown) => {
    const type = normalizeMovementType(typeValue);
    if (!type || byType.has(type)) return;
    const value = Math.max(0, integer(firstFinite(valueCandidates)));
    if (type !== "land" && value <= 0) return;
    byType.set(type, { type, label: text(labelValue, type[0].toUpperCase() + type.slice(1)), value });
  };

  const preparedLand = record(preparedMovement.land);
  const storedLand = record(systemMovement.land);
  add("land", [
    preparedSpeed.total,
    preparedSpeed.value,
    preparedLand.total,
    preparedLand.value,
    preparedMovement.land,
    storedLand.total,
    storedLand.value,
    systemMovement.land,
    modernLandData.total,
    modernLandData.value,
    modernLandData.speed,
    modernLand,
    systemSpeed.total,
    systemSpeed.value,
  ], "Land");
  for (const speed of [
    ...collectionValues(preparedSpeed.otherSpeeds),
    ...collectionValues(systemSpeed.otherSpeeds),
    ...modernSpeeds.map(([type, value]) => ({ type, value })),
  ]) {
    const data = record(speed);
    const nested = record(data.value);
    add(
      nested.type ?? nested.slug ?? data.type ?? data.slug,
      [nested.total, nested.value, nested.speed, data.total, data.value, data.speed],
      nested.label ?? data.label,
    );
  }
  for (const type of MOVEMENT_TYPES.slice(1)) {
    add(type, [
      record(preparedMovement[type]).total,
      record(preparedMovement[type]).value,
      preparedMovement[type],
      record(systemMovement[type]).total,
      record(systemMovement[type]).value,
      systemMovement[type],
    ]);
  }

  const speeds = MOVEMENT_TYPES.flatMap(type => byType.has(type) ? [byType.get(type)!] : []);
  const result: CharacterMovementSnapshot = { land: byType.get("land")?.value ?? 0, speeds };
  for (const type of MOVEMENT_TYPES.slice(1)) {
    const value = byType.get(type)?.value;
    if (value !== undefined) result[type] = value;
  }
  return result;
}

function preparedActions(actor: UnknownRecord): UnknownRecord[] {
  const system = record(actor.system);
  return uniqueDocuments([actor.actions, system.actions]);
}

function strikeTraits(action: UnknownRecord, item: UnknownRecord): string[] {
  const system = record(item.system);
  return Array.from(new Set([
    ...stringArray(action.traits),
    ...stringArray(record(system.traits).value),
  ]));
}

function strikeId(action: UnknownRecord, item: UnknownRecord): string {
  return text(action.id, text(action.slug, itemId(item)));
}

function isStrike(action: UnknownRecord): boolean {
  const item = record(action.item);
  const actionType = text(action.type, text(action.actionType)).toLowerCase();
  return actionType === "strike"
    || actionType === "melee"
    || ["weapon", "melee"].includes(text(item.type).toLowerCase())
    || Array.isArray(action.variants);
}

export function readCharacterStrikes(actorValue: Actor | unknown): CharacterStrikeSnapshot[] {
  const actor = record(actorValue);
  return preparedActions(actor).filter(isStrike).map(action => {
    const item = record(action.item);
    const variants = collectionValues(action.variants).map(record);
    const first = integer(firstFinite([variants[0]?.modifier, action.attackModifier, action.modifier, action.mod]));
    const second = integer(firstFinite([variants[1]?.modifier, record(action.map).second], first));
    const third = integer(firstFinite([variants[2]?.modifier, record(action.map).third], second));
    const damageData = record(action.damage);
    const itemDamage = record(record(item.system).damage);
    const damage = text(action.damage)
      || text(damageData.formula)
      || text(damageData.label)
      || text(itemDamage.formula)
      || text(itemDamage.die);
    const image = itemImage(item) || itemImage(action);

    return {
      id: strikeId(action, item),
      ...(itemId(item) ? { itemId: itemId(item) } : {}),
      label: text(action.label, text(action.name, text(item.name, "Strike"))),
      ...(image ? { image } : {}),
      traits: strikeTraits(action, item),
      attackModifier: first,
      map: { first, second, third },
      ...(damage ? { damage } : {}),
      usable: action.usable !== false && action.ready !== false && action.disabled !== true,
    };
  });
}

export function readCharacterActions(actorValue: Actor | unknown): CharacterActionSnapshot[] {
  const actor = record(actorValue);
  const prepared = preparedActions(actor).filter(action => !isStrike(action));
  const actionItems = itemsOfType(actor, "action");
  const documents = uniqueDocuments([prepared, actionItems]);

  return documents.map(action => {
    const embeddedItem = record(action.item);
    const hasEmbeddedItem = Object.keys(embeddedItem).length > 0;
    const item = hasEmbeddedItem ? embeddedItem : action;
    const system = record(item.system);
    const actionType = text(action.actionType, text(action.type, text(system.actionType, "action")));
    const actions = firstFinite([action.actions, record(system.actions).value, system.actions], Number.NaN);
    const image = itemImage(item) || itemImage(action);
    return {
      id: text(action.id, text(action.slug, itemId(item))),
      ...(hasEmbeddedItem && itemId(item) ? { itemId: itemId(item) } : {}),
      label: text(action.label, text(action.name, text(item.name, "Action"))),
      ...(image ? { image } : {}),
      actionType,
      ...(Number.isFinite(actions) ? { actions: Math.max(0, integer(actions)) } : {}),
      traits: Array.from(new Set([...stringArray(action.traits), ...stringArray(record(system.traits).value)])),
      usable: action.usable !== false && action.disabled !== true,
    };
  });
}

function formatStructuredValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return Object.entries(record(value))
    .filter(([, amount]) => finite(amount) !== 0)
    .map(([denomination, amount]) => `${finite(amount)} ${denomination}`)
    .join(", ");
}

function inventoryCategory(item: UnknownRecord): CharacterInventoryCategory {
  const type = text(item.type).toLowerCase();
  const system = record(item.system);
  if (type === "weapon" || type === "melee") return "weapons";
  if (type === "shield" || (type === "armor" && text(system.category).toLowerCase() === "shield")) return "shields";
  if (type === "armor") return "armor";
  if (type === "consumable") return "consumables";
  if (["equipment", "kit"].includes(type)) return "equipment";
  if (type === "treasure") return "treasure";
  if (["backpack", "container"].includes(type)) return "containers";
  return "other";
}

function inventoryItem(item: UnknownRecord): CharacterInventoryItemSnapshot {
  const system = record(item.system);
  const equipped = record(system.equipped);
  const invested = equipped.invested ?? system.invested;
  const carryType = text(equipped.carryType);
  const hands = text(item.hands, text(record(system.usage).value));
  const isInvestable = typeof item.isInvestable === "boolean" ? item.isInvestable : undefined;
  const isInvested = typeof item.isInvested === "boolean" ? item.isInvested : invested;
  const bulk = formatStructuredValue(record(system.bulk).value ?? system.bulk);
  const price = formatStructuredValue(record(system.price).value ?? system.price);
  const equippedValue = typeof equipped.value === "boolean"
    ? equipped.value
    : equipped.inSlot === true || ["held", "worn"].includes(carryType);

  return {
    id: itemId(item),
    uuid: text(item.uuid),
    name: text(item.name),
    image: itemImage(item),
    type: text(item.type),
    quantity: Math.max(0, integer(firstFinite([system.quantity, record(system.quantity).value], 1))),
    ...(Object.keys(equipped).length || typeof system.equipped === "boolean" ? { equipped: equippedValue } : {}),
    ...(typeof isInvested === "boolean" ? { invested: isInvested } : {}),
    ...(carryType ? { carryType } : {}),
    ...(Number.isFinite(Number(equipped.handsHeld)) ? { handsHeld: Math.max(0, integer(equipped.handsHeld)) } : {}),
    ...(typeof equipped.inSlot === "boolean" ? { inSlot: equipped.inSlot } : {}),
    ...(hands ? { hands } : {}),
    ...(isInvestable !== undefined ? { isInvestable } : {}),
    ...(bulk ? { bulk } : {}),
    ...(price ? { price } : {}),
  };
}

function preparedBulkData(actor: UnknownRecord): UnknownRecord {
  const candidates = [
    record(actor.inventory).bulk,
    record(record(actor.system).inventory).bulk,
    record(record(record(actor.system).attributes).bulk),
  ];
  return candidates.map(record).find(candidate => Object.keys(candidate).length > 0) ?? {};
}

function preparedBulkValue(bulk: UnknownRecord): number | undefined {
  const value = bulk.value;
  const valueData = record(value);
  const toLightUnits = (value as { toLightUnits?: () => unknown } | null)?.toLightUnits;

  if (typeof toLightUnits === "function") {
    try {
      const lightUnits = optionalFinite(toLightUnits.call(value));
      if (lightUnits !== undefined) return Math.max(0, lightUnits / 10);
    } catch {
      // Continue with the prepared scalar fields exposed by other PF2e versions.
    }
  }

  const normal = optionalFinite(valueData.normal);
  const light = optionalFinite(valueData.light);
  if (normal !== undefined || light !== undefined) {
    return Math.max(0, (normal ?? 0) + (light ?? 0) / 10);
  }

  const scalar = optionalFinite(bulk.bulk) ?? optionalFinite(value);
  return scalar === undefined ? undefined : Math.max(0, scalar);
}

export function readCharacterBulk(actorValue: Actor | unknown): CharacterBulkSnapshot {
  const bulk = preparedBulkData(record(actorValue));
  const value = preparedBulkValue(bulk);
  const max = optionalFinite(bulk.max);

  if (value === undefined || max === undefined || max <= 0) {
    return {
      value: null,
      max: null,
      percentage: 0,
      encumbered: false,
      available: false,
    };
  }

  const encumberedAt = optionalFinite(bulk.encumberedAt) ?? optionalFinite(bulk.encumberedAfter);
  const preparedPercentage = optionalFinite(bulk.maxPercentageInteger)
    ?? optionalFinite(bulk.maxPercentage)
    ?? optionalFinite(bulk.percentage);
  const percentage = Math.max(0, Math.min(100, preparedPercentage ?? (value / max) * 100));
  const preparedEncumbered = typeof bulk.isEncumbered === "boolean"
    ? bulk.isEncumbered
    : typeof bulk.encumbered === "boolean"
      ? bulk.encumbered
      : undefined;

  return {
    value,
    max,
    ...(encumberedAt !== undefined ? { encumberedAt } : {}),
    percentage,
    encumbered: preparedEncumbered ?? (encumberedAt !== undefined && value > encumberedAt),
    available: true,
  };
}

export function readCharacterInventory(actorValue: Actor | unknown): CharacterInventorySnapshot {
  const actor = record(actorValue);
  const excluded = new Set(["action", "ancestry", "background", "class", "condition", "effect", "feat", "heritage", "spell", "spellcastingEntry"]);
  const all = actorItems(actor).filter(item => !excluded.has(text(item.type))).map(inventoryItem);
  const result: CharacterInventorySnapshot = {
    weapons: [], armor: [], shields: [], consumables: [], equipment: [], treasure: [], containers: [], other: [], all,
    bulk: readCharacterBulk(actor),
  };
  actorItems(actor).filter(item => !excluded.has(text(item.type))).forEach((item, index) => {
    result[inventoryCategory(item)].push(all[index]);
  });
  return result;
}

function featCategory(value: unknown): CharacterFeatCategory {
  const slug = text(value).toLowerCase();
  if (["class", "ancestry", "skill", "general", "archetype", "bonus"].includes(slug)) {
    return slug as CharacterFeatCategory;
  }
  return "other";
}

export function readCharacterFeats(actorValue: Actor | unknown): CharacterFeatSnapshot[] {
  const actor = record(actorValue);
  return itemsOfType(actor, "feat").map(item => {
    const system = record(item.system);
    return {
      id: itemId(item),
      uuid: text(item.uuid),
      name: text(item.name),
      image: itemImage(item),
      category: featCategory(system.category ?? system.featType ?? system.group),
      level: Math.max(0, integer(record(system.level).value ?? system.level)),
      traits: stringArray(record(system.traits).value),
    };
  });
}

function spellSnapshot(
  item: UnknownRecord,
  overrides: Partial<CharacterSpellSnapshot> = {},
): CharacterSpellSnapshot {
  const system = record(item.system);
  const location = record(system.location);
  const traits = record(system.traits);
  const category = text(system.category, text(system.spellType, "spell"));
  const rank = Math.max(0, integer(firstFinite([item.rank, record(system.level).value, system.rank, system.level])));
  const uses = record(record(system.location).uses ?? system.uses ?? item.uses);
  const usesValue = optionalFinite(uses.value);
  const usesMax = optionalFinite(uses.max);
  return {
    id: itemId(item),
    uuid: text(item.uuid),
    name: text(item.name),
    image: itemImage(item),
    rank,
    category,
    ...(text(location.value, text(system.location)) ? { locationId: text(location.value, text(system.location)) } : {}),
    traditions: stringArray(traits.traditions ?? system.traditions),
    focus: category === "focus" || system.focus === true,
    castRank: rank,
    ...(typeof location.signature === "boolean" ? { signature: location.signature } : {}),
    ...(usesValue !== undefined && usesMax !== undefined ? { uses: { value: usesValue, max: usesMax } } : {}),
    ...overrides,
  };
}

function slotRank(key: string): number | null {
  const match = /^slot(\d+)$/.exec(key);
  return match ? Math.max(0, integer(match[1])) : null;
}

function collectionSpellGroups(
  entry: UnknownRecord,
  spells: CharacterSpellSnapshot[],
): CharacterSpellcastingGroupSnapshot[] {
  const slots = record(record(entry.system).slots);
  const preparation = text(record(record(entry.system).prepared).value).toLowerCase();
  const groups = new Map<number, CharacterSpellcastingGroupSnapshot>();

  for (const [key, slotValue] of Object.entries(slots)) {
    const rank = slotRank(key);
    if (rank === null) continue;
    const slot = record(slotValue);
    const preparedSlots = Array.isArray(slot.prepared) ? slot.prepared.map(record) : [];
    const max = Math.max(0, integer(firstFinite([slot.max, preparedSlots.length])));
    const preparedSpells = preparedSlots.flatMap((prepared, slotId) => {
      const spellId = text(prepared.id);
      const spell = spells.find(candidate => candidate.id === spellId);
      return spell ? [spellSnapshot(record(spell), {
        ...spell,
        rank,
        castRank: rank,
        slotId,
        prepared: true,
        expended: prepared.expended === true,
      })] : [];
    });
    const expended = preparedSlots.filter(prepared => prepared.expended === true).length;
    const value = Math.max(0, integer(firstFinite([slot.value, max - expended])));
    groups.set(rank, {
      rank,
      ...(max > 0 ? { slots: { value, max } } : {}),
      spells: preparation === "prepared" && preparedSlots.length > 0
        ? preparedSpells
        : spells.filter(spell => spell.rank === rank).map(spell => ({ ...spell, castRank: rank })),
    });
  }

  for (const spell of spells) {
    if (groups.has(spell.rank)) continue;
    groups.set(spell.rank, { rank: spell.rank, spells: [{ ...spell, castRank: spell.rank }] });
  }
  return [...groups.values()].sort((left, right) => left.rank - right.rank);
}

function preparedSpellcastingCollections(actor: UnknownRecord): UnknownRecord[] {
  return collectionValues(record(actor.spellcasting).collections).map(record);
}

function spellcastingEntries(actor: UnknownRecord): UnknownRecord[] {
  const spellcasting = record(actor.spellcasting);
  return uniqueDocuments([actorItems(actor), spellcasting.entries, spellcasting.contents])
    .filter(entry => text(entry.type) === "spellcastingEntry" || text(entry.documentName) === "SpellcastingEntry");
}

export function readCharacterSpellcasting(actorValue: Actor | unknown): CharacterSpellcastingSnapshot {
  const actor = record(actorValue);
  const spells = itemsOfType(actor, "spell").map(item => spellSnapshot(item));
  const collections = preparedSpellcastingCollections(actor);
  const preparedEntries = collections.map(collection => {
    const entry = record(collection.entry);
    const collectionSpells = collectionValues(collection).map(value => spellSnapshot(record(value)));
    return { entry, collectionSpells };
  }).filter(candidate => itemId(candidate.entry));
  const preparedEntryIds = new Set(preparedEntries.map(candidate => itemId(candidate.entry)));
  const entrySources = [
    ...preparedEntries,
    ...spellcastingEntries(actor)
      .filter(entry => !preparedEntryIds.has(itemId(entry)))
      .map(entry => ({ entry, collectionSpells: [] as CharacterSpellSnapshot[] })),
  ];
  const entries = entrySources.map(({ entry, collectionSpells }) => {
    const system = record(entry.system);
    const statistic = record(entry.statistic);
    const systemStatistic = record(system.statistic);
    const preparation = record(system.prepared);
    const id = itemId(entry);
    const entrySpells = spells.filter(spell => spell.locationId === id);
    const embeddedSpells = uniqueDocuments([entry.spells, record(entry.collection).spells])
      .map(item => spellSnapshot(item));
    const combinedSpells = uniqueDocuments([collectionSpells, entrySpells, embeddedSpells]).map(spell => {
      if ("rank" in spell) return spell as unknown as CharacterSpellSnapshot;
      return spellSnapshot(spell);
    });
    const tradition = text(system.tradition, text(record(system.tradition).value, text(entry.tradition)));
    const category = text(preparation.value, text(system.preparation, text(entry.category)));
    const image = itemImage(entry);
    return {
      id,
      name: text(entry.name, tradition || "Spellcasting"),
      ...(image ? { image } : {}),
      tradition,
      dc: integer(firstFinite([statistic.dc, record(statistic.dc).value, systemStatistic.dc, record(systemStatistic.dc).value, system.dc])),
      spellAttack: integer(firstFinite([statistic.mod, statistic.attack, systemStatistic.mod, system.attack])),
      preparation: category,
      focus: category === "focus" || system.focus === true,
      spells: combinedSpells,
      groups: collectionSpellGroups(entry, combinedSpells),
    };
  });
  const assigned = new Set(entries.flatMap(entry => entry.spells.map(spell => spell.id)));
  const unassignedSpells = spells.filter(spell => !assigned.has(spell.id) && !spell.locationId);
  const resources = readCharacterResources(actorValue);

  return {
    hasSpellcasting: entries.length > 0 || spells.length > 0,
    entries,
    unassignedSpells,
    focusPoints: resources.focusPoints,
  };
}

export function readCharacterResources(actorValue: Actor | unknown): CharacterResourceSnapshot {
  const actor = record(actorValue);
  const resources = record(record(actor.system).resources);
  const heroPoints = resourceValue(resources.heroPoints);
  const focusPoints = resourceValue(resources.focus ?? resources.focusPoints);
  const mythicSource = resources.mythicPoints ?? resources.mythic;
  const classResources: Record<string, CharacterNumericResourceSnapshot> = {};

  for (const [slug, value] of Object.entries(resources)) {
    if (["heroPoints", "focus", "focusPoints", "mythic", "mythicPoints"].includes(slug)) continue;
    const data = record(value);
    if ([data.value, data.current, data.max].some(candidate => Number.isFinite(Number(candidate)))) {
      classResources[slug] = resourceValue(value);
    }
  }

  return {
    heroPoints,
    focusPoints,
    ...(mythicSource !== undefined ? { mythicPoints: resourceValue(mythicSource) } : {}),
    classResources,
  };
}

export function createPF2eCharacterSnapshot(actorValue: Actor | unknown): EthernumPF2eCharacterSnapshot {
  const identity = readCharacterIdentity(actorValue);
  const vitals = readCharacterVitals(actorValue);
  const defenses = readCharacterDefenses(actorValue);
  const movement = readCharacterMovement(actorValue);
  const conditions = readCharacterEffects(actorValue)
    .filter(effect => effect.kind === "condition" || effect.kind === "persistent-damage")
    .map(effect => ({
      slug: effect.slug,
      name: effect.name,
      ...(effect.value !== undefined ? { value: effect.value } : {}),
    }));

  return {
    actorId: identity.actorId,
    actorUuid: identity.actorUuid,
    name: identity.name,
    image: identity.image,
    level: identity.level,
    className: identity.className,
    ancestryName: identity.ancestryName,
    ...(identity.heritageName ? { heritageName: identity.heritageName } : {}),
    hp: vitals.hp,
    ac: defenses.ac,
    perception: defenses.perception.modifier,
    speed: movement.land,
    saves: {
      fortitude: defenses.saves.fortitude.modifier,
      reflex: defenses.saves.reflex.modifier,
      will: defenses.saves.will.modifier,
    },
    heroPoints: vitals.heroPoints.current,
    conditions,
  };
}

export const PF2eCharacterAdapter = {
  identity: readCharacterIdentity,
  vitals: readCharacterVitals,
  abilities: readCharacterAbilities,
  skills: readCharacterSkills,
  defenses: readCharacterDefenses,
  movement: readCharacterMovement,
  strikes: readCharacterStrikes,
  actions: readCharacterActions,
  inventory: readCharacterInventory,
  feats: readCharacterFeats,
  spellcasting: readCharacterSpellcasting,
  effects: readCharacterEffects,
  resources: readCharacterResources,
  snapshot: createPF2eCharacterSnapshot,
} as const satisfies PF2eCharacterAdapterInterface & {
  snapshot(actor: Actor): EthernumPF2eCharacterSnapshot;
};
