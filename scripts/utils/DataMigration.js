import { ETHERNUM } from '../config.js';

const CURRENT_SCHEMA_VERSION = 1;

function validateEtherAttributes(attrs) {
  if (!attrs || typeof attrs !== "object") return false;
  for (const key of Object.keys(ETHERNUM.DEFAULT_ETHER_ATTRIBUTES)) {
    const entry = attrs[key];
    if (!entry || typeof entry.value !== "number" || !ETHERNUM.RANKS.includes(entry.rank)) return false;
  }
  return true;
}

function validateTalents(talents) {
  if (!talents || typeof talents !== "object") return false;
  for (const key of Object.keys(ETHERNUM.DEFAULT_TALENTS)) {
    const entry = talents[key];
    if (!entry || typeof entry.value !== "number" || !ETHERNUM.RANKS.includes(entry.rank)) return false;
  }
  return true;
}

function validateEtherSystem(system) {
  if (!system || typeof system !== "object") return false;
  return typeof system.etherMax === "number"
    && typeof system.etherCurrent === "number"
    && typeof system.etherPower === "number";
}

function validateFE(fe) {
  return fe && typeof fe.current === "number" && typeof fe.total === "number";
}

function validateRunes(runes) {
  if (!Array.isArray(runes)) return false;
  return runes.every(r =>
    r.id && typeof r.name === "string"
    && typeof r.runeClass === "number"
    && r.runeClass >= ETHERNUM.MIN_RUNE_CLASS
    && r.runeClass <= ETHERNUM.MAX_RUNE_CLASS
  );
}

export function validateActorFlags(actor) {
  const issues = [];
  const m = ETHERNUM.MODULE_NAME;

  if (!validateEtherAttributes(actor.getFlag(m, "etherAttributes"))) issues.push("etherAttributes");
  if (!validateTalents(actor.getFlag(m, "talents"))) issues.push("talents");
  if (!validateEtherSystem(actor.getFlag(m, "etherSystem"))) issues.push("etherSystem");
  if (!validateFE(actor.getFlag(m, "fe"))) issues.push("fe");
  if (!validateRunes(actor.getFlag(m, "runes") || [])) issues.push("runes");

  return { valid: issues.length === 0, issues };
}

export async function migrateActor(actor) {
  const m = ETHERNUM.MODULE_NAME;
  const schemaVersion = actor.getFlag(m, "schemaVersion") ?? 0;

  if (schemaVersion >= CURRENT_SCHEMA_VERSION) return;

  const updates = {};

  // v0 → v1: garante que runes têm o campo `active`
  if (schemaVersion < 1) {
    const runes = actor.getFlag(m, "runes");
    if (Array.isArray(runes)) {
      const migrated = runes.map(r => ({ active: true, ...r }));
      updates[`flags.${m}.runes`] = migrated;
    }
    updates[`flags.${m}.schemaVersion`] = 1;
    console.log(`Ethernum | Migrado ator "${actor.name}" para schema v1`);
  }

  if (Object.keys(updates).length > 0) await actor.update(updates);
}

export async function migrateWorld() {
  if (!game.user.isGM) return;

  const worldVersion = game.settings.get(ETHERNUM.MODULE_NAME, "schemaVersion") ?? 0;
  if (worldVersion >= CURRENT_SCHEMA_VERSION) return;

  console.log(`Ethernum | Iniciando migração do mundo (v${worldVersion} → v${CURRENT_SCHEMA_VERSION})`);
  for (const actor of game.actors.filter(a => a.type === "character")) {
    await migrateActor(actor);
  }

  await game.settings.set(ETHERNUM.MODULE_NAME, "schemaVersion", CURRENT_SCHEMA_VERSION);
  console.log("Ethernum | Migração concluída");
}
