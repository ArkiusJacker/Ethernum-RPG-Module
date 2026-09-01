import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_SCHEMA_VERSION, migrateActor, migrateWorld } from "../scripts/utils/DataMigration.js";
import { createDefaultCombatMomentumState } from "../scripts/table/CombatMomentumSystem.js";

const MODULE_ID = "ethernum-rpg-module";

class FakeActor {
  id: string;
  name: string;
  type = "character";
  flags: Record<string, unknown>;
  failUpdate: boolean;

  constructor(id: string, flags: Record<string, unknown>, failUpdate = false) {
    this.id = id;
    this.name = id;
    this.flags = flags;
    this.failUpdate = failUpdate;
  }

  getFlag(_scope: string, key: string): unknown {
    return this.flags[key];
  }

  async update(updates: Record<string, unknown>): Promise<void> {
    if (this.failUpdate) throw new Error("synthetic actor failure");
    for (const [path, value] of Object.entries(updates)) {
      this.flags[path.split(".").at(-1)!] = value;
    }
  }
}

function legacyPippingActor(id: string, failUpdate = false): FakeActor {
  return new FakeActor(id, {
    schemaVersion: 9,
    uniqueMechanics: {
      activeCore: "ethernum-company",
      activeProfile: "pipping-night",
      customRoot: "preserve-me",
      profiles: {
        "pipping-night": {
          pulse: 4,
          tier: 2,
          livingNightActive: true,
          mirroredShadows: 3,
          customPipping: "preserve-me-too",
        },
      },
    },
    combatMomentum: createDefaultCombatMomentumState(),
  }, failUpdate);
}

describe("DataMigration", () => {
  beforeEach(() => {
    vi.stubGlobal("ui", {
      notifications: {
        error: vi.fn(),
        info: vi.fn(),
      },
    });
  });

  it("migrates legacy Pipping without changing selection or unknown fields", async () => {
    const actor = legacyPippingActor("pipping") as unknown as Actor;
    await migrateActor(actor);

    const flags = (actor as unknown as FakeActor).flags;
    const unique = flags.uniqueMechanics as {
      activeCore: string;
      activeProfile: string;
      customRoot: string;
      profiles: Record<string, Record<string, unknown>>;
    };
    expect(flags.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(unique).toMatchObject({
      activeCore: "ethernum-company",
      activeProfile: "pipping-night",
      customRoot: "preserve-me",
    });
    expect(unique.profiles["pipping-night"]).toMatchObject({
      version: 5,
      pulse: 4,
      tier: 2,
      livingNightActive: true,
      mirroredShadows: 3,
      customPipping: "preserve-me-too",
    });
  });

  it("continues other actors and preserves the world schema when one actor fails", async () => {
    const failed = legacyPippingActor("failed", true);
    const migrated = legacyPippingActor("migrated");
    const settingsSet = vi.fn();
    vi.stubGlobal("game", {
      user: { id: "gm-a", isGM: true },
      users: [{ id: "gm-a", active: true, isGM: true }],
      actors: [failed, migrated],
      settings: {
        get: vi.fn((scope: string, key: string) => scope === MODULE_ID && key === "schemaVersion" ? 9 : undefined),
        set: settingsSet,
      },
      i18n: {
        format: (key: string) => key,
      },
    });

    await migrateWorld();

    expect(migrated.flags.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(failed.flags.schemaVersion).toBe(9);
    expect(settingsSet).not.toHaveBeenCalled();
  });

  it("repeats an interrupted world migration without duplicating or losing rune data", async () => {
    const interrupted = legacyPippingActor("interrupted", true);
    interrupted.flags.schemaVersion = 14;
    interrupted.flags.runes = [
      { id: "r1", name: "Kept", runeClass: 2, verb: "CRIAR", noun: "Fogo", source: "Sangue", dc: 30 },
    ];
    let worldSchema = 14;
    const settingsSet = vi.fn(async (_scope: string, _key: string, value: number) => { worldSchema = value; });
    vi.stubGlobal("game", {
      user: { id: "gm-a", isGM: true },
      users: [{ id: "gm-a", active: true, isGM: true }],
      actors: [interrupted],
      settings: {
        get: vi.fn(() => worldSchema),
        set: settingsSet,
      },
      i18n: { format: (key: string) => key },
    });

    await migrateWorld();
    expect(worldSchema).toBe(14);
    interrupted.failUpdate = false;
    await migrateWorld();
    const firstSuccess = structuredClone(interrupted.flags);
    await migrateWorld();

    expect(worldSchema).toBe(CURRENT_SCHEMA_VERSION);
    expect(interrupted.flags).toEqual(firstSuccess);
    expect(interrupted.flags.runes).toEqual([
      { id: "r1", name: "Kept", runeClass: 2, verb: "criar", noun: "fogo", source: "sangue", dc: 30 },
    ]);
    expect(settingsSet).toHaveBeenCalledOnce();
  });

  it("upgrades a schema 10 Pipping state to v5 without resetting resources", async () => {
    const actor = new FakeActor("schema-10", {
      schemaVersion: 10,
      uniqueMechanics: {
        activeCore: "ethernum-company",
        activeProfile: "pipping-night",
        profiles: {
          "pipping-night": {
            version: 2,
            pulse: 6,
            tier: 4,
            expressionChoices: { "4": "order" },
            recovery: { communeAvailable: true },
            customState: "kept",
          },
        },
      },
    }) as unknown as Actor;

    await migrateActor(actor);

    const flags = (actor as unknown as FakeActor).flags;
    const unique = flags.uniqueMechanics as {
      profiles: Record<string, Record<string, unknown>>;
    };
    expect(flags.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(flags.characterSheetMode).toBe("auto");
    expect(unique.profiles["pipping-night"]).toMatchObject({
      version: 5,
      pulse: 6,
      tier: 4,
      expressionChoices: { "4": "order" },
      recovery: { communeAvailable: true },
      customState: "kept",
    });
  });

  it("adds automatic sheet mode only when the flag is absent", async () => {
    const absent = new FakeActor("absent", { schemaVersion: 13 }) as unknown as Actor;
    const existing = new FakeActor("existing", {
      schemaVersion: 13,
      characterSheetMode: "pf2e",
    }) as unknown as Actor;

    await migrateActor(absent);
    await migrateActor(existing);

    expect((absent as unknown as FakeActor).flags.characterSheetMode).toBe("auto");
    expect((existing as unknown as FakeActor).flags.characterSheetMode).toBe("pf2e");
  });

  it("migrates rune strings to catalog ids without changing classes, DCs, costs, effects, or unknown data", async () => {
    const actor = new FakeActor("runes", {
      schemaVersion: 14,
      customWords: { verbs: ["SONDAR"], nouns: ["Portais"], sources: ["Esperança"] },
      runes: [
        { id: "r1", name: "Canonical", runeClass: 3, verb: "CRIAR", noun: "Fogo", source: "Sangue", dc: 37, costValue: 12, effect: { damage: "3d6" } },
        { id: "r2", name: "Legacy", runeClass: 4, verb: "TRAVAR", noun: "Gelo", source: "Éter", dc: 42, costValue: 6, legacyExtra: "keep" },
        { id: "r3", name: "Custom", runeClass: 5, verb: "SONDAR", noun: "Portais", source: "Esperança", unknownRoot: { keep: true } },
        { id: "r4", name: "Unknown", runeClass: 1, verb: "???", noun: "void", source: "mystery" },
      ],
    }) as unknown as Actor;

    await migrateActor(actor);

    const flags = (actor as unknown as FakeActor).flags;
    expect(flags.catalogSchemaVersion).toBe(2);
    expect(flags.runes).toEqual([
      { id: "r1", name: "Canonical", runeClass: 3, verb: "criar", noun: "fogo", source: "sangue", dc: 37, costValue: 12, effect: { damage: "3d6" } },
      { id: "r2", name: "Legacy", runeClass: 4, verb: "TRAVAR", noun: "Gelo", source: "Éter", dc: 42, costValue: 6, legacyExtra: "keep" },
      { id: "r3", name: "Custom", runeClass: 5, verb: "SONDAR", noun: "Portais", source: "Esperança", unknownRoot: { keep: true } },
      { id: "r4", name: "Unknown", runeClass: 1, verb: "???", noun: "void", source: "mystery" },
    ]);
    expect(flags.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

    const afterFirstRun = structuredClone(flags);
    await migrateActor(actor);
    expect((actor as unknown as FakeActor).flags).toEqual(afterFirstRun);
  });

  it("marks an empty rune world with catalog schema v2 without creating synthetic runes", async () => {
    const actor = new FakeActor("empty-runes", { schemaVersion: 14 }) as unknown as Actor;
    await migrateActor(actor);
    expect((actor as unknown as FakeActor).flags).toMatchObject({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      catalogSchemaVersion: 2,
    });
    expect((actor as unknown as FakeActor).flags.runes).toBeUndefined();
  });
});
