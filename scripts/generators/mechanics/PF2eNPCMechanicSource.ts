import { deterministicId } from "../shared/DeterministicRandom.js";
import type {
  NPCMechanicAnalysis,
  NPCMechanicResistance,
  NPCMechanicStrike,
} from "./GeneratedNPCMechanicTypes.js";
import { classifyNPCRoles } from "./NPCMechanicRoleClassifier.js";

type Data = Record<string, unknown>;

function record(value: unknown): Data {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof (value as Iterable<unknown>)[Symbol.iterator] === "function") return Array.from(value as Iterable<unknown>);
  return [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return value.split(/[;,]/).map(entry => entry.trim().toLowerCase()).filter(Boolean);
  return list(value).flatMap(entry => {
    if (typeof entry === "string") return [entry.trim().toLowerCase()].filter(Boolean);
    const source = record(entry);
    const slug = text(source.slug, text(source.type, text(source.value))).toLowerCase();
    return slug ? [slug] : [];
  });
}

function nestedNumber(source: Data, paths: string[][], fallback = 0): number {
  for (const path of paths) {
    let cursor: unknown = source;
    for (const key of path) cursor = record(cursor)[key];
    const parsed = Number(record(cursor).value ?? cursor);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function damageEntries(system: Data): Array<{ formula: string; type: string }> {
  const damageRolls = record(system.damageRolls);
  const entries = Object.values(damageRolls).map(record);
  if (entries.length === 0) entries.push(...list(system.damage).map(record));
  return entries.flatMap(entry => {
    const formula = text(entry.damage, text(entry.formula, text(entry.value)));
    const type = text(entry.damageType, text(entry.type, "untyped")).toLowerCase();
    return formula ? [{ formula, type }] : [];
  });
}

function strikeFromItem(itemValue: unknown): NPCMechanicStrike | null {
  const item = record(itemValue);
  const type = text(item.type).toLowerCase();
  if (!new Set(["melee", "weapon"]).has(type)) return null;
  const system = record(item.system);
  const traits = strings(record(system.traits).value ?? system.traits);
  const damage = damageEntries(system);
  const range = text(system.range, text(record(system.range).value)).toLowerCase();
  const ranged = type === "weapon" && Boolean(range) || range.includes("increment") || range.includes("feet") || range.includes("ft");
  const reachTrait = traits.find(trait => trait.startsWith("reach-"));
  return {
    name: text(item.name, "Strike"),
    attackBonus: number(record(system.bonus).value ?? system.bonus),
    ranged,
    reach: reachTrait ? number(reachTrait.replace("reach-", ""), 5) : 5,
    damageFormula: damage.map(entry => entry.formula).join(" + ") || "1d6",
    damageTypes: Array.from(new Set(damage.map(entry => entry.type))),
    traits,
  };
}

function resistanceEntries(value: unknown): NPCMechanicResistance[] {
  return list(value).flatMap(entryValue => {
    const entry = record(entryValue);
    const type = text(entry.type, text(entry.slug)).toLowerCase();
    const amount = number(entry.value, number(record(entry.value).value));
    return type ? [{ type, value: Math.max(0, Math.floor(amount)) }] : [];
  });
}

function actorItems(actor: Actor): Data[] {
  return list((actor as Actor & { items?: Iterable<unknown> }).items).map(record).filter(item => {
    const moduleFlags = record(record(item.flags)["ethernum-rpg-module"]);
    return !moduleFlags.generatedNPCMechanic;
  });
}

function actorUuid(actor: Actor): string {
  return String(actor.uuid ?? (actor.id ? `Actor.${actor.id}` : ""));
}

function movementEntries(actor: Actor, system: Data): Array<{ type: string; value: number }> {
  const preparedSpeeds = record(record(system.movement).speeds);
  const current = Object.entries(preparedSpeeds).flatMap(([type, value]) => {
    if (type === "travel") return [];
    const speed = number(record(value).value ?? value);
    return speed > 0 ? [{ type: type.toLowerCase(), value: speed }] : [];
  });
  if (current.length > 0) return current;

  // PF2e keeps the old persisted shape in _source while exposing prepared speeds at system.movement.
  const rawActor = record((actor as Actor & { _source?: unknown })._source);
  const legacy = record(record(record(rawActor.system).attributes).speed);
  return [
    { type: "land", value: number(legacy.value) },
    ...list(legacy.otherSpeeds).map(entryValue => {
      const entry = record(entryValue);
      return { type: text(entry.type, "other").toLowerCase(), value: number(entry.value) };
    }),
  ].filter(entry => entry.value > 0);
}

export function analyzePF2eNPC(actor: Actor): NPCMechanicAnalysis {
  if ((actor.type as string) !== "npc") throw new Error("O gerador aceita somente Actors PF2e do tipo NPC.");
  const system = record(actor.system);
  const details = record(system.details);
  const attributes = record(system.attributes);
  const traitsData = record(system.traits);
  const items = actorItems(actor);
  const traits = Array.from(new Set(strings(traitsData.value ?? traitsData.traits)));
  const level = Math.max(0, Math.min(30, Math.floor(number(record(details.level).value ?? details.level))));
  const speeds = movementEntries(actor, system);
  const strikes = items.map(strikeFromItem).filter((entry): entry is NPCMechanicStrike => Boolean(entry));
  const actionItems = items.filter(item => text(item.type).toLowerCase() === "action");
  const actions: string[] = [];
  const reactions: string[] = [];
  for (const item of actionItems) {
    const systemData = record(item.system);
    const actionType = text(record(systemData.actionType).value ?? systemData.actionType).toLowerCase();
    const name = text(item.name, "Action");
    if (actionType === "reaction") reactions.push(name);
    else actions.push(name);
  }
  const resistances = resistanceEntries(attributes.resistances);
  const weaknesses = resistanceEntries(attributes.weaknesses);
  const immunities = strings(attributes.immunities);
  const saves = record(system.saves);
  const spellcasting = items.some(item => ["spell", "spellcastingentry", "spellcasting-entry"].includes(text(item.type).toLowerCase()))
    || Object.keys(record(system.spellcasting)).length > 0;
  const uuid = actorUuid(actor);
  const base = {
    actorUuid: uuid,
    actorName: actor.name,
    level,
    traits,
    size: text(record(traitsData.size).value ?? traitsData.size, "medium").toLowerCase(),
    speeds,
    strikes,
    attackTypes: Array.from(new Set(strikes.map(strike => strike.ranged ? "ranged" : "melee"))),
    damageTypes: Array.from(new Set(strikes.flatMap(strike => strike.damageTypes))),
    spellcasting,
    resistances,
    weaknesses,
    immunities,
    actions,
    reactions,
    hp: Math.max(0, Math.floor(nestedNumber(attributes, [["hp", "max"], ["hp", "value"]]))),
    ac: Math.max(0, Math.floor(nestedNumber(attributes, [["ac", "value"], ["ac"]]))),
    saves: {
      fortitude: Math.floor(nestedNumber(saves, [["fortitude", "value"], ["fortitude", "mod"], ["fortitude"]])),
      reflex: Math.floor(nestedNumber(saves, [["reflex", "value"], ["reflex", "mod"], ["reflex"]])),
      will: Math.floor(nestedNumber(saves, [["will", "value"], ["will", "mod"], ["will"]])),
    },
  };
  const signature = JSON.stringify({
    level: base.level,
    traits: base.traits,
    size: base.size,
    speeds: base.speeds,
    strikes: base.strikes,
    spellcasting: base.spellcasting,
    resistances: base.resistances,
    weaknesses: base.weaknesses,
    immunities: base.immunities,
    actions: base.actions,
    reactions: base.reactions,
    hp: base.hp,
    ac: base.ac,
    saves: base.saves,
  });
  const withFingerprint = { ...base, fingerprint: deterministicId("npc", signature) };
  return { ...withFingerprint, roles: classifyNPCRoles(withFingerprint) };
}

export class PF2eNPCMechanicSource {
  listActors(): Actor[] {
    const actors = (game as Game & { actors?: Iterable<Actor> }).actors;
    return list(actors).filter((actor): actor is Actor => actor instanceof Actor && (actor.type as string) === "npc");
  }

  async resolve(actorUuidValue: string): Promise<Actor> {
    const direct = this.listActors().find(actor => actor.uuid === actorUuidValue || actor.id === actorUuidValue);
    const document = direct ?? (typeof fromUuid === "function"
      ? await (fromUuid as unknown as (uuid: string) => Promise<unknown>)(actorUuidValue)
      : null);
    if (!(document instanceof Actor) || (document.type as string) !== "npc") throw new Error("NPC PF2e não encontrado.");
    return document;
  }

  async analyze(actorUuidValue: string): Promise<NPCMechanicAnalysis> {
    return analyzePF2eNPC(await this.resolve(actorUuidValue));
  }
}
