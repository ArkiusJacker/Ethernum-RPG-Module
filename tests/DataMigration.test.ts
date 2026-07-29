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
      version: 4,
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

  it("upgrades a schema 10 Pipping state to v4 without resetting resources", async () => {
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
    expect(flags.schemaVersion).toBe(12);
    expect(unique.profiles["pipping-night"]).toMatchObject({
      version: 4,
      pulse: 6,
      tier: 4,
      expressionChoices: { "4": "order" },
      recovery: { communeAvailable: true },
      customState: "kept",
    });
  });
});
