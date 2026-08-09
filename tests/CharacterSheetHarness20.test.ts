import { describe, expect, it } from "vitest";
import { PF2eCharacterAdapter } from "../scripts/core/PF2eCharacterAdapter.js";
import { PF2ePreparedDataService } from "../scripts/sheets/core/PF2ePreparedDataService.js";
import {
  PF2E_CHARACTER_FIXTURE_FACTORIES,
  createAlchemistFixture,
  createKineticistFixture,
  createSorcererFixture,
  createWizardFixture,
} from "./fixtures/pf2e-character-fixtures.js";

describe("Character Sheet Test Harness 2.0", () => {
  it.each(Object.entries(PF2E_CHARACTER_FIXTURE_FACTORIES))(
    "reads a stable %s prepared-data profile through every adapter surface",
    (className, createFixture) => {
      const actor = createFixture();
      const identity = PF2eCharacterAdapter.identity(actor as Actor);

      expect(identity).toMatchObject({ className, level: 7, ancestryName: "Human" });
      expect(PF2eCharacterAdapter.vitals(actor as Actor).hp.max).toBeGreaterThan(0);
      expect(PF2eCharacterAdapter.abilities(actor as Actor)).toHaveLength(6);
      expect(PF2eCharacterAdapter.skills(actor as Actor).length).toBeGreaterThan(0);
      expect(PF2eCharacterAdapter.defenses(actor as Actor).ac).toBe(25);
      expect(PF2eCharacterAdapter.movement(actor as Actor)).toMatchObject({ land: 25, climb: 10 });
      expect(() => PF2eCharacterAdapter.strikes(actor as Actor)).not.toThrow();
      expect(() => PF2eCharacterAdapter.actions(actor as Actor)).not.toThrow();
      expect(PF2eCharacterAdapter.inventory(actor as Actor).all.length).toBeGreaterThan(0);
      expect(PF2eCharacterAdapter.feats(actor as Actor).length).toBeGreaterThan(0);
      expect(() => PF2eCharacterAdapter.spellcasting(actor as Actor)).not.toThrow();
      expect(() => PF2eCharacterAdapter.effects(actor as Actor)).not.toThrow();
      expect(() => PF2eCharacterAdapter.resources(actor as Actor)).not.toThrow();
      expect(() => PF2eCharacterAdapter.details(actor as Actor)).not.toThrow();
    },
  );

  it("models Wizard prepared cantrips, slots, expenditure, heightening, and focus", async () => {
    const actor = createWizardFixture();
    const adapter = PF2eCharacterAdapter.spellcasting(actor as Actor);
    const prepared = await PF2ePreparedDataService.spellcasting(actor, {
      spellcastingSheetOptions: { editable: false },
    });
    const entry = adapter.entries[0];

    expect(adapter.focusPoints).toEqual({ current: 1, max: 2 });
    expect(entry).toMatchObject({ preparation: "prepared", tradition: "arcane" });
    expect(entry?.groups.find(group => group.rank === 0)?.spells[0]).toMatchObject({
      id: "telekinetic-projectile",
      category: "cantrip",
      prepared: true,
      expended: false,
    });
    expect(entry?.groups.find(group => group.rank === 1)).toMatchObject({
      slots: { value: 1, max: 2 },
      spells: [
        expect.objectContaining({ id: "force-barrage", slotId: 0, expended: false }),
        expect.objectContaining({ id: "force-barrage", slotId: 1, expended: true }),
      ],
    });
    expect(entry?.groups.find(group => group.rank === 2)?.spells[0]).toMatchObject({
      id: "wizard-fear",
      rank: 2,
      castRank: 2,
      expended: true,
    });
    expect(entry?.spells.find(spell => spell.id === "protective-wards")?.focus).toBe(true);
    expect(prepared).toMatchObject({ source: "prepared", openPF2eSheet: false, diagnostics: [] });
    expect(prepared.entries[0]?.sheetData).toMatchObject({
      preparation: "prepared",
      groups: expect.arrayContaining([
        expect.objectContaining({ rank: 0, cantrips: true }),
        expect.objectContaining({ rank: 2, spells: [expect.objectContaining({ baseRank: 1, castRank: 2 })] }),
      ]),
      focus: { value: 1, max: 2 },
      options: { editable: false },
      receivedSpellCollection: true,
    });
    expect(prepared.snapshot).toMatchObject({
      hasSpellcasting: true,
      focusPoints: { current: 1, max: 2 },
      entries: [expect.objectContaining({
        id: "wizard-arcane",
        preparation: "prepared",
        groups: expect.arrayContaining([
          expect.objectContaining({ rank: 0, spells: [expect.objectContaining({ id: "telekinetic-projectile" })] }),
          expect.objectContaining({ rank: 2, spells: [expect.objectContaining({ id: "wizard-fear", castRank: 2 })] }),
        ]),
      })],
    });
  });

  it("models Sorcerer spontaneous slots, signature spells, and heightened casting", async () => {
    const actor = createSorcererFixture();
    const adapter = PF2eCharacterAdapter.spellcasting(actor as Actor);
    const prepared = await PF2ePreparedDataService.spellcasting(actor, {
      spellcastingSheetOptions: { editable: true },
    });
    const entry = adapter.entries[0];

    expect(entry).toMatchObject({ preparation: "spontaneous", tradition: "arcane" });
    expect(entry?.spells.find(spell => spell.id === "sorcerer-force-barrage")).toMatchObject({
      signature: true,
      rank: 1,
    });
    expect(entry?.groups.find(group => group.rank === 1)?.slots).toEqual({ value: 2, max: 3 });
    expect(entry?.groups.find(group => group.rank === 3)?.slots).toEqual({ value: 1, max: 2 });
    expect(prepared.entries[0]?.sheetData).toMatchObject({
      preparation: "spontaneous",
      groups: expect.arrayContaining([
        expect.objectContaining({
          rank: 3,
          spells: expect.arrayContaining([
            expect.objectContaining({ id: "sorcerer-force-barrage", signature: true, baseRank: 1, castRank: 3 }),
          ]),
        }),
      ]),
      options: { editable: true },
      receivedSpellCollection: true,
    });
    expect(prepared.snapshot.entries[0]).toMatchObject({
      preparation: "spontaneous",
      groups: expect.arrayContaining([
        expect.objectContaining({
          rank: 3,
          spells: expect.arrayContaining([
            expect.objectContaining({ id: "sorcerer-force-barrage", signature: true, castRank: 3 }),
          ]),
        }),
      ]),
    });
  });

  it("keeps Kineticist Elemental Blast and impulses unique across combat and special actions", () => {
    const actor = createKineticistFixture();
    const combatActions = PF2eCharacterAdapter.actions(actor as Actor);
    const specialActions = PF2eCharacterAdapter.details(actor as Actor).specialActions;
    const deduplicated = PF2ePreparedDataService.deduplicateSpecialActions(specialActions, combatActions);

    expect(combatActions.map(action => action.id)).toEqual(["elemental-blast", "aerial-boomerang"]);
    expect(specialActions.map(action => action.id)).toEqual([
      "elemental-blast",
      "aerial-boomerang",
      "channel-elements",
    ]);
    expect(deduplicated.map(action => action.id)).toEqual(["channel-elements"]);
  });

  it("models Alchemist formulas, daily preparation, alchemy resources, and prepared batches", async () => {
    const actor = createAlchemistFixture();
    const details = PF2eCharacterAdapter.details(actor as Actor);
    const resources = PF2eCharacterAdapter.resources(actor as Actor);
    const prepared = await PF2ePreparedDataService.crafting(actor, {
      craftingSheetOptions: { editable: false },
    });

    expect(resources.classResources.infusedReagents).toEqual({ current: 5, max: 7 });
    expect(details.crafting).toMatchObject({
      available: true,
      knownFormulas: expect.arrayContaining([
        expect.objectContaining({ name: "Minor Elixir of Life" }),
        expect.objectContaining({ name: "Lesser Alchemist's Fire" }),
      ]),
      abilities: [expect.objectContaining({
        slug: "advanced-alchemy",
        isPrepared: true,
        isDailyPrep: true,
        isAlchemical: true,
        maxSlots: 6,
        maxItemLevel: 7,
        resource: "infusedReagents",
        prepared: expect.arrayContaining([
          expect.objectContaining({ name: "Minor Elixir of Life", quantity: 2, expended: false }),
          expect.objectContaining({ name: "Lesser Alchemist's Fire", quantity: 1, expended: true, signature: true }),
        ]),
      })],
    });
    expect(prepared).toMatchObject({
      source: "prepared",
      openPF2eSheet: false,
      diagnostics: [],
      knownFormulas: expect.arrayContaining([
        expect.objectContaining({ name: "Minor Elixir of Life" }),
      ]),
      abilities: [expect.objectContaining({
        slug: "advanced-alchemy",
        sheetData: expect.objectContaining({
          dailyPrep: true,
          alchemical: true,
          batchSize: 2,
          maxItemLevel: 7,
          resource: { slug: "infusedReagents", value: 5, max: 7 },
          options: { editable: false },
        }),
      })],
    });
    expect(prepared.snapshot).toMatchObject({
      available: true,
      knownFormulas: expect.arrayContaining([
        expect.objectContaining({ name: "Minor Elixir of Life" }),
      ]),
      abilities: [expect.objectContaining({
        slug: "advanced-alchemy",
        isPrepared: true,
        isDailyPrep: true,
        isAlchemical: true,
        batchSize: 2,
        maxItemLevel: 7,
        resource: "infusedReagents",
        resourceValue: 5,
        resourceMax: 7,
        prepared: expect.arrayContaining([
          expect.objectContaining({ name: "Minor Elixir of Life", quantity: 2, expended: false }),
          expect.objectContaining({ name: "Lesser Alchemist's Fire", quantity: 1, expended: true, signature: true }),
        ]),
      })],
    });
  });
});
