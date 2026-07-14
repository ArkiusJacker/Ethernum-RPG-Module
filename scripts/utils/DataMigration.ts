import { ETHERNUM, type EtherAttribute, type Rank } from '../config.js';

const CURRENT_SCHEMA_VERSION = 7;

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
  core?: string;
  [key: string]: unknown;
}

interface UniqueMechanics {
  activeCore?: string;
  activeProfile: string;
  profiles: Record<string, unknown>;
}

const DEFAULT_ARKIUS_STATE = {
  nucleoEmBrasas: {
    active: false,
    usesSpent: 0,
    maxUses: 2,
    remainingRounds: 0,
    attunement: "none",
    pendingFluxoReduction: false,
    pendingBrasasDamage: false,
    selectedSolarArea: "emanation",
    firstFireMetalProcUsed: false,
    endedPenaltyActive: false,
    fireMetalImpulsesLocked: false,
    exaurirUsed: false,
  },
  kineticAura: {
    active: false,
    radius: 10,
  },
  thermalNimbus: {
    active: false,
    fireAuraJunction: false,
    appliedTurnKeys: {},
  },
  concordiaAspect: "chains",
  bracoEvolutivo: {
    chargesSpent: 0,
    maxCharges: 2,
    resistanceFormula: "2d6 + 5",
    level13Unlocked: false,
    level17Unlocked: false,
  },
};

const DEFAULT_YU_STATE = {
  active: false,
  usesSpent: 0,
  maxUses: 1,
  remainingRounds: 0,
  emergencyTriggered: false,
  collapseDrainedActive: false,
  collapseEnfeebledActive: false,
};

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

function validateUniqueMechanics(value: unknown): value is UniqueMechanics {
  if (!value || typeof value !== "object") return false;
  const state = value as UniqueMechanics;
  return typeof state.activeProfile === "string"
    && !!state.profiles
    && typeof state.profiles === "object";
}

export function validateActorFlags(actor: Actor): ValidationResult {
  const issues: string[] = [];
  const m = ETHERNUM.MODULE_NAME;

  if (!validateEtherAttributes(actor.getFlag(m, "etherAttributes"))) issues.push("etherAttributes");
  if (!validateTalents(actor.getFlag(m, "talents"))) issues.push("talents");
  if (!validateEtherSystem(actor.getFlag(m, "etherSystem"))) issues.push("etherSystem");
  if (!validateFE(actor.getFlag(m, "fe"))) issues.push("fe");
  if (!validateRunes(actor.getFlag(m, "runes") ?? [])) issues.push("runes");
  if (!validateUniqueMechanics(actor.getFlag(m, "uniqueMechanics"))) issues.push("uniqueMechanics");

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
    console.log(`Ethernum | Migrado ator "${actor.name}" para schema v1`);
  }

  if (schemaVersion < 2) {
    if (!actor.getFlag(m, "uniqueMechanics")) {
      updates[`flags.${m}.uniqueMechanics`] = { activeProfile: "", profiles: {} };
    }
    console.log(`Ethernum | Migrado ator "${actor.name}" para schema v2`);
  }

  if (schemaVersion < 3) {
    const runes = (updates[`flags.${m}.runes`] as Rune[] | undefined) ?? actor.getFlag(m, "runes") as Rune[] | undefined;
    if (Array.isArray(runes)) {
      updates[`flags.${m}.runes`] = runes.map(rune => ({
        core: "ethernum-company",
        ...rune,
      }));
    }

    const existingUnique = (updates[`flags.${m}.uniqueMechanics`] as UniqueMechanics | undefined)
      ?? actor.getFlag(m, "uniqueMechanics") as UniqueMechanics | undefined
      ?? { activeProfile: "", profiles: {} };
    const profiles = {
      ...(existingUnique.profiles ?? {}),
      "arkius-jacker": (existingUnique.profiles ?? {})["arkius-jacker"] ?? DEFAULT_ARKIUS_STATE,
    };
    updates[`flags.${m}.uniqueMechanics`] = {
      activeCore: existingUnique.activeCore === "concordia" ? "concordia" : "ethernum-company",
      activeProfile: typeof existingUnique.activeProfile === "string" ? existingUnique.activeProfile : "",
      profiles,
    };
    console.log(`Ethernum | Migrado ator "${actor.name}" para schema v3`);
  }

  if (schemaVersion < 4) {
    const existingUnique = (updates[`flags.${m}.uniqueMechanics`] as UniqueMechanics | undefined)
      ?? actor.getFlag(m, "uniqueMechanics") as UniqueMechanics | undefined
      ?? { activeProfile: "", profiles: {} };
    const existingProfiles = existingUnique.profiles ?? {};
    const existingArkius = (existingProfiles["arkius-jacker"] ?? {}) as {
      nucleoEmBrasas?: Record<string, unknown>;
      bracoEvolutivo?: Record<string, unknown>;
      [key: string]: unknown;
    };

    updates[`flags.${m}.uniqueMechanics`] = {
      ...existingUnique,
      activeCore: existingUnique.activeCore === "concordia" ? "concordia" : "ethernum-company",
      profiles: {
        ...existingProfiles,
        "arkius-jacker": {
          ...DEFAULT_ARKIUS_STATE,
          ...existingArkius,
          nucleoEmBrasas: {
            ...DEFAULT_ARKIUS_STATE.nucleoEmBrasas,
            ...(existingArkius.nucleoEmBrasas ?? {}),
          },
          bracoEvolutivo: {
            ...DEFAULT_ARKIUS_STATE.bracoEvolutivo,
            ...(existingArkius.bracoEvolutivo ?? {}),
          },
        },
      },
    };
    console.log(`Ethernum | Migrado ator "${actor.name}" para schema v4`);
  }

  if (schemaVersion < 5) {
    const existingUnique = (updates[`flags.${m}.uniqueMechanics`] as UniqueMechanics | undefined)
      ?? actor.getFlag(m, "uniqueMechanics") as UniqueMechanics | undefined
      ?? { activeProfile: "", profiles: {} };
    const existingProfiles = existingUnique.profiles ?? {};
    const existingArkius = (existingProfiles["arkius-jacker"] ?? {}) as {
      nucleoEmBrasas?: Record<string, unknown>;
      kineticAura?: Record<string, unknown>;
      thermalNimbus?: Record<string, unknown>;
      bracoEvolutivo?: Record<string, unknown>;
      [key: string]: unknown;
    };

    updates[`flags.${m}.uniqueMechanics`] = {
      ...existingUnique,
      activeCore: existingUnique.activeCore === "concordia" ? "concordia" : "ethernum-company",
      profiles: {
        ...existingProfiles,
        "arkius-jacker": {
          ...DEFAULT_ARKIUS_STATE,
          ...existingArkius,
          nucleoEmBrasas: {
            ...DEFAULT_ARKIUS_STATE.nucleoEmBrasas,
            ...(existingArkius.nucleoEmBrasas ?? {}),
          },
          kineticAura: {
            ...DEFAULT_ARKIUS_STATE.kineticAura,
            ...(existingArkius.kineticAura ?? {}),
          },
          thermalNimbus: {
            ...DEFAULT_ARKIUS_STATE.thermalNimbus,
            ...(existingArkius.thermalNimbus ?? {}),
          },
          concordiaAspect: typeof existingArkius.concordiaAspect === "string" ? existingArkius.concordiaAspect : DEFAULT_ARKIUS_STATE.concordiaAspect,
          bracoEvolutivo: {
            ...DEFAULT_ARKIUS_STATE.bracoEvolutivo,
            ...(existingArkius.bracoEvolutivo ?? {}),
          },
        },
      },
    };
    console.log(`Ethernum | Migrado ator "${actor.name}" para schema v5`);
  }

  if (schemaVersion < 6) {
    const existingUnique = (updates[`flags.${m}.uniqueMechanics`] as UniqueMechanics | undefined)
      ?? actor.getFlag(m, "uniqueMechanics") as UniqueMechanics | undefined
      ?? { activeProfile: "", profiles: {} };
    const existingProfiles = existingUnique.profiles ?? {};
    const existingArkius = (existingProfiles["arkius-jacker"] ?? {}) as {
      thermalNimbus?: Record<string, unknown>;
      [key: string]: unknown;
    };

    updates[`flags.${m}.uniqueMechanics`] = {
      ...existingUnique,
      activeCore: existingUnique.activeCore === "concordia" ? "concordia" : "ethernum-company",
      profiles: {
        ...existingProfiles,
        "arkius-jacker": {
          ...DEFAULT_ARKIUS_STATE,
          ...existingArkius,
          thermalNimbus: {
            ...DEFAULT_ARKIUS_STATE.thermalNimbus,
            ...(existingArkius.thermalNimbus ?? {}),
          },
        },
      },
    };
    console.log(`Ethernum | Migrado ator "${actor.name}" para schema v6`);
  }

  if (schemaVersion < 7) {
    const existingUnique = (updates[`flags.${m}.uniqueMechanics`] as UniqueMechanics | undefined)
      ?? actor.getFlag(m, "uniqueMechanics") as UniqueMechanics | undefined
      ?? { activeProfile: "", profiles: {} };
    const existingProfiles = existingUnique.profiles ?? {};
    const existingYu = (existingProfiles["yu-jiu-ji-tae"] ?? {}) as Record<string, unknown>;

    updates[`flags.${m}.uniqueMechanics`] = {
      ...existingUnique,
      activeCore: existingUnique.activeCore === "concordia" ? "concordia" : "ethernum-company",
      activeProfile: existingUnique.activeProfile === "yu-jiu-ji-tae" ? "yu-jiu-ji-tae" : existingUnique.activeProfile,
      profiles: {
        ...existingProfiles,
        "yu-jiu-ji-tae": {
          ...DEFAULT_YU_STATE,
          ...existingYu,
        },
      },
    };
    console.log(`Ethernum | Migrado ator "${actor.name}" para schema v7`);
  }

  updates[`flags.${m}.schemaVersion`] = CURRENT_SCHEMA_VERSION;

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
