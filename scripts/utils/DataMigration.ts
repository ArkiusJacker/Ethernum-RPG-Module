import { ETHERNUM, type EtherAttribute, type Rank } from '../config.js';

const CURRENT_SCHEMA_VERSION = 1;

interface EtherSystem {
  etherMax: number;
  etherCurrent: number;
  etherPower: number;
}

interface FE {
  current: number;
  total: number;
}

interface Rune {
  id: string;
  name: string;
  runeClass: number;
  active?: boolean;
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

function validateEtherAttributes(attrs: unknown): attrs is Record<string, EtherAttribute> {
  if (!attrs || typeof attrs !== "object") return false;
  for (const key of Object.keys(ETHERNUM.DEFAULT_ETHER_ATTRIBUTES)) {
    const entry = (attrs as Record<string, EtherAttribute>)[key];
    if (!entry || typeof entry.value !== "number" || !ETHERNUM.RANKS.includes(entry.rank as Rank)) return false;
  }
  return true;
}

function validateTalents(talents: unknown): talents is Record<string, EtherAttribute> {
  if (!talents || typeof talents !== "object") return false;
  for (const key of Object.keys(ETHERNUM.DEFAULT_TALENTS)) {
    const entry = (talents as Record<string, EtherAttribute>)[key];
    if (!entry || typeof entry.value !== "number" || !ETHERNUM.RANKS.includes(entry.rank as Rank)) return false;
  }
  return true;
}

function validateEtherSystem(system: unknown): system is EtherSystem {
  if (!system || typeof system !== "object") return false;
  const s = system as EtherSystem;
  return typeof s.etherMax === "number"
    && typeof s.etherCurrent === "number"
    && typeof s.etherPower === "number";
}

function validateFE(fe: unknown): fe is FE {
  if (!fe || typeof fe !== "object") return false;
  const f = fe as FE;
  return typeof f.current === "number" && typeof f.total === "number";
}

function validateRunes(runes: unknown): runes is Rune[] {
  if (!Array.isArray(runes)) return false;
  return runes.every((r: Rune) =>
    r.id && typeof r.name === "string"
    && typeof r.runeClass === "number"
    && r.runeClass >= ETHERNUM.MIN_RUNE_CLASS
    && r.runeClass <= ETHERNUM.MAX_RUNE_CLASS
  );
}

export function validateActorFlags(actor: Actor): ValidationResult {
  const issues: string[] = [];
  const m = ETHERNUM.MODULE_NAME;

  if (!validateEtherAttributes(actor.getFlag(m, "etherAttributes"))) issues.push("etherAttributes");
  if (!validateTalents(actor.getFlag(m, "talents"))) issues.push("talents");
  if (!validateEtherSystem(actor.getFlag(m, "etherSystem"))) issues.push("etherSystem");
  if (!validateFE(actor.getFlag(m, "fe"))) issues.push("fe");
  if (!validateRunes(actor.getFlag(m, "runes") ?? [])) issues.push("runes");

  return { valid: issues.length === 0, issues };
}

export async function migrateActor(actor: Actor): Promise<void> {
  const m = ETHERNUM.MODULE_NAME;
  const schemaVersion = (actor.getFlag(m, "schemaVersion") as number | undefined) ?? 0;

  if (schemaVersion >= CURRENT_SCHEMA_VERSION) return;

  const updates: Record<string, unknown> = {};

  if (schemaVersion < 1) {
    const runes = actor.getFlag(m, "runes") as Rune[] | undefined;
    if (Array.isArray(runes)) {
      updates[`flags.${m}.runes`] = runes.map(r => ({ active: true, ...r }));
    }
    updates[`flags.${m}.schemaVersion`] = 1;
    console.log(`Ethernum | Migrado ator "${actor.name}" para schema v1`);
  }

  if (Object.keys(updates).length > 0) await actor.update(updates);
}

export async function migrateWorld(): Promise<void> {
  if (!game.user?.isGM) return;

  const worldVersion = (game.settings!.get(ETHERNUM.MODULE_NAME, "schemaVersion") as number | undefined) ?? 0;
  if (worldVersion >= CURRENT_SCHEMA_VERSION) return;

  console.log(`Ethernum | Iniciando migração do mundo (v${worldVersion} → v${CURRENT_SCHEMA_VERSION})`);
  for (const actor of (game.actors ?? []).filter((a: Actor) => (a.type as string) === "character")) {
    await migrateActor(actor);
  }

  await game.settings!.set(ETHERNUM.MODULE_NAME, "schemaVersion", CURRENT_SCHEMA_VERSION);
  console.log("Ethernum | Migração concluída");
}
