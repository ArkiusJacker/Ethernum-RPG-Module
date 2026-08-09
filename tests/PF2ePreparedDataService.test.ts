import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deduplicateSpecialActions,
  preparePF2eCrafting,
  preparePF2eSpellcasting,
  specialActionIdentityKeys,
} from "../scripts/sheets/core/PF2ePreparedDataService.js";

afterEach(() => vi.restoreAllMocks());

describe("PF2ePreparedDataService", () => {
  it("reads asynchronous prepared spellcasting collections without changing PF2e state", async () => {
    const getSheetData = vi.fn().mockResolvedValue({
      groups: [{ rank: 1, slots: { value: 1, max: 2 }, spells: [{ id: "force-barrage", name: "Force Barrage", rank: 1 }] }],
      flexible: true,
    });
    const collection = {
      id: "collection-arcane",
      entry: {
        id: "entry-arcane",
        name: "Arcane Prepared Spells",
        getSheetData,
        system: { prepared: { value: "prepared" }, tradition: { value: "arcane" } },
      },
    };
    const actor = {
      spellcasting: { collections: new Map([["entry-arcane", collection]]) },
      system: { resources: { focus: { value: 1, max: 2 } } },
    };

    const snapshot = await preparePF2eSpellcasting(actor, { spellcastingSheetOptions: { editable: false } });

    expect(snapshot.source).toBe("prepared");
    expect(snapshot.openPF2eSheet).toBe(false);
    expect(snapshot.entries).toEqual([expect.objectContaining({
      id: "entry-arcane",
      preparation: "prepared",
      tradition: "arcane",
      sheetData: {
        groups: [{ rank: 1, slots: { value: 1, max: 2 }, spells: [{ id: "force-barrage", name: "Force Barrage", rank: 1 }] }],
        flexible: true,
      },
      collection,
    })]);
    expect(snapshot.snapshot).toMatchObject({
      hasSpellcasting: true,
      entries: [expect.objectContaining({
        id: "entry-arcane",
        preparation: "prepared",
        tradition: "arcane",
        groups: [expect.objectContaining({
          rank: 1,
          slots: { value: 1, max: 2 },
          spells: [expect.objectContaining({ id: "force-barrage", castRank: 1 })],
        })],
      })],
    });
    expect(getSheetData).toHaveBeenCalledOnce();
    expect(getSheetData).toHaveBeenCalledWith({ spells: collection, editable: false });
  });

  it("isolates failed spell collections and keeps the synchronous adapter fallback", async () => {
    const actor = {
      spellcasting: {
        collections: new Map([
          ["broken", { entry: { id: "broken", getSheetData: vi.fn().mockRejectedValue(new Error("PF2e failure")) } }],
          ["focus", { entry: { id: "focus", name: "Focus", getSheetData: vi.fn().mockResolvedValue({ groups: [] }) } }],
        ]),
      },
      system: { resources: { focus: { value: 1, max: 1 } } },
    };

    const snapshot = await preparePF2eSpellcasting(actor);

    expect(snapshot.source).toBe("prepared");
    expect(snapshot.entries.map(entry => entry.id)).toEqual(["focus"]);
    expect(snapshot.fallback).not.toBeNull();
    expect(snapshot.snapshot.entries.map(entry => entry.id)).toEqual(["broken", "focus"]);
    expect(snapshot.diagnostics).toEqual([
      { scope: "spellcasting.collection.broken", message: "PF2e failure" },
    ]);
  });

  it("passes through every PF2e preparation model instead of hardcoding spell rules", async () => {
    const preparationTypes = ["prepared", "spontaneous", "innate", "focus", "ritual", "items"];
    const collections = new Map(preparationTypes.map(preparation => [
      preparation,
      {
        entry: {
          id: preparation,
          category: preparation,
          system: { prepared: { value: preparation } },
          getSheetData: vi.fn().mockResolvedValue({ preparation }),
        },
      },
    ]));

    const snapshot = await preparePF2eSpellcasting({ spellcasting: { collections } });

    expect(snapshot.entries.map(entry => entry.preparation)).toEqual(preparationTypes);
    expect(snapshot.entries.map(entry => entry.sheetData)).toEqual(
      preparationTypes.map(preparation => ({ preparation })),
    );
    expect(snapshot.snapshot.entries.map(entry => entry.preparation)).toEqual(preparationTypes);
  });

  it("uses prepared crafting formulas and abilities with partial-failure diagnostics", async () => {
    const getFormulas = vi.fn().mockResolvedValue(new Set([{ uuid: "Compendium.test.formula" }]));
    const alchemy = {
      slug: "advanced-alchemy",
      label: "Advanced Alchemy",
      getSheetData: vi.fn().mockResolvedValue({ resource: { value: 3 }, batchSize: 2, maxItemLevel: 7 }),
    };
    const actor = {
      crafting: {
        getFormulas,
        abilities: new Map([
          ["advanced-alchemy", alchemy],
          ["broken", { getSheetData: vi.fn().mockRejectedValue(new Error("Ability unavailable")) }],
        ]),
      },
    };

    const snapshot = await preparePF2eCrafting(actor);

    expect(snapshot.source).toBe("prepared");
    expect(snapshot.knownFormulas).toEqual([{ uuid: "Compendium.test.formula" }]);
    expect(snapshot.abilities).toEqual([{
      slug: "advanced-alchemy",
      label: "Advanced Alchemy",
      sheetData: { resource: { value: 3 }, batchSize: 2, maxItemLevel: 7 },
    }]);
    expect(snapshot.snapshot).toMatchObject({
      available: true,
      knownFormulas: [{ uuid: "Compendium.test.formula", quantity: 1, expended: false, signature: false }],
      abilities: expect.arrayContaining([
        expect.objectContaining({
          slug: "advanced-alchemy",
          batchSize: 2,
          maxItemLevel: 7,
          resourceValue: 3,
        }),
        expect.objectContaining({ slug: "broken" }),
      ]),
    });
    expect(snapshot.diagnostics).toEqual([
      { scope: "crafting.ability.broken", message: "Ability unavailable" },
    ]);
  });

  it("falls back to adapter snapshots when prepared APIs are absent", async () => {
    const spellcasting = await preparePF2eSpellcasting({ system: { resources: {} } });
    const crafting = await preparePF2eCrafting({ system: { crafting: { formulas: [{ uuid: "Formula.one" }] } } });

    expect(spellcasting).toMatchObject({ source: "adapter", entries: [], openPF2eSheet: false });
    expect(spellcasting.fallback).toMatchObject({ entries: [], unassignedSpells: [] });
    expect(spellcasting.snapshot).toEqual(spellcasting.fallback);
    expect(crafting).toMatchObject({ source: "adapter", openPF2eSheet: false });
    expect(crafting.fallback?.knownFormulas).toEqual([expect.objectContaining({ uuid: "Formula.one" })]);
    expect(crafting.snapshot).toEqual(crafting.fallback);
  });
});

describe("special action deduplication", () => {
  it("normalizes all supported identifiers and removes Combat collisions across fields", () => {
    const combat = [{ id: "strike", itemId: "ITEM-1" }, { uuid: "Actor.a.Item.b" }];
    const special = [
      { id: "elemental-blast", itemId: "item-1", label: "Duplicate through itemId" },
      { id: "synthetic", source: { uuid: "Actor.a.Item.b" }, label: "Duplicate through source" },
      { id: "subsystem", slug: "kinetic-aura", source: "kineticist", label: "Unique" },
      { id: "subsystem-copy", source: { slug: "kinetic-aura" }, label: "Internal duplicate" },
      { id: "strike", allowDuplicateInSpecial: true, specialActionPurpose: "stance summary", label: "Explicit" },
    ];

    expect(specialActionIdentityKeys(special[2])).toEqual(["subsystem", "kinetic-aura"]);
    expect(deduplicateSpecialActions(special, combat).map(action => action.label)).toEqual(["Unique", "Explicit"]);
  });

  it("uses a bare source as identity but does not merge distinct actions from one subsystem", () => {
    expect(specialActionIdentityKeys({ source: "elemental-blast" })).toEqual(["elemental-blast"]);
    expect(deduplicateSpecialActions([
      { id: "fire", source: "kineticist" },
      { id: "water", source: "kineticist" },
    ])).toHaveLength(2);
  });

  it("preserves unidentified synthetic actions instead of guessing identity", () => {
    const first = { label: "Synthetic One" };
    const second = { label: "Synthetic Two" };
    expect(deduplicateSpecialActions([first, second])).toEqual([first, second]);
  });
});
