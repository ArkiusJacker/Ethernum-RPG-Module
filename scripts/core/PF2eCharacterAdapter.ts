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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
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

function collectionValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const iterable = value as { [Symbol.iterator]?: () => Iterator<unknown> };
  if (typeof iterable[Symbol.iterator] === "function") return Array.from(iterable as Iterable<unknown>);
  const values = (value as { values?: () => IterableIterator<unknown> }).values;
  return typeof values === "function" ? Array.from(values.call(value)) : [];
}

function itemName(actor: Record<string, unknown>, type: string): string {
  const direct = record(actor[type]).name;
  if (typeof direct === "string") return direct;
  const itemTypes = record(actor.itemTypes);
  const typedItems = itemTypes[type];
  if (Array.isArray(typedItems)) {
    const name = record(typedItems[0]).name;
    if (typeof name === "string") return name;
  }
  const items = collectionValues(actor.items);
  const item = items.find(entry => record(entry).type === type);
  const name = record(item).name;
  return typeof name === "string" ? name : "";
}

function preparedStatistic(actor: Record<string, unknown>, group: string, slug: string): Record<string, unknown> {
  return record(record(actor[group])[slug]);
}

function readConditions(actor: Record<string, unknown>): EthernumPF2eCharacterCondition[] {
  const itemTypes = record(actor.itemTypes);
  const typedConditions = Array.isArray(itemTypes.condition) ? itemTypes.condition : [];
  const items = collectionValues(actor.items);
  const source = typedConditions.length > 0
    ? typedConditions
    : items.filter(item => record(item).type === "condition");
  return source.flatMap(item => {
    const data = record(item);
    const system = record(data.system);
    const slug = String(data.slug ?? system.slug ?? "").trim();
    if (!slug) return [];
    const name = String(data.name ?? slug);
    const valueData = record(system.value);
    const rawValue = valueData.value ?? system.value;
    const value = Number(rawValue);
    return [{
      slug,
      name,
      ...(Number.isFinite(value) && value > 0 ? { value: Math.trunc(value) } : {}),
    }];
  });
}

export function createPF2eCharacterSnapshot(actorValue: Actor | unknown): EthernumPF2eCharacterSnapshot {
  const actor = record(actorValue);
  const system = record(actor.system);
  const details = record(system.details);
  const attributes = record(system.attributes);
  const hp = record(attributes.hp);
  const ac = record(attributes.ac);
  const speed = record(attributes.speed);
  const perception = record(system.perception);
  const resources = record(system.resources);
  const heroPoints = record(resources.heroPoints);
  const saves = record(system.saves);
  const preparedPerception = record(actor.perception);
  const preparedSpeed = record(actor.speed);
  const preparedAC = record(actor.armorClass);
  const level = record(details.level);
  const systemLevel = record(system.level);

  const save = (slug: "fortitude" | "reflex" | "will") => {
    const prepared = preparedStatistic(actor, "saves", slug);
    const stored = record(saves[slug]);
    return integer(firstFinite([
      prepared.mod,
      record(prepared.check).mod,
      stored.mod,
      stored.value,
      stored.totalModifier,
      stored.total,
    ]));
  };

  const heritageName = itemName(actor, "heritage");
  return {
    actorId: String(actor.id ?? ""),
    actorUuid: String(actor.uuid ?? ""),
    name: String(actor.name ?? ""),
    image: String(actor.img ?? ""),
    level: Math.max(0, integer(firstFinite([level.value, systemLevel.value, system.level, actor.level]))),
    className: itemName(actor, "class"),
    ancestryName: itemName(actor, "ancestry"),
    ...(heritageName ? { heritageName } : {}),
    hp: {
      current: Math.max(0, integer(hp.value)),
      max: Math.max(0, integer(hp.max)),
      temp: Math.max(0, integer(hp.temp)),
    },
    ac: integer(firstFinite([preparedAC.value, preparedAC.mod, ac.value, ac.mod])),
    perception: integer(firstFinite([
      preparedPerception.mod,
      record(preparedPerception.check).mod,
      perception.mod,
      perception.value,
    ])),
    speed: Math.max(0, integer(firstFinite([
      preparedSpeed.total,
      preparedSpeed.value,
      speed.total,
      speed.value,
    ]))),
    saves: {
      fortitude: save("fortitude"),
      reflex: save("reflex"),
      will: save("will"),
    },
    heroPoints: Math.max(0, integer(heroPoints.value)),
    conditions: readConditions(actor),
  };
}

export const PF2eCharacterAdapter = {
  snapshot: createPF2eCharacterSnapshot,
} as const;
