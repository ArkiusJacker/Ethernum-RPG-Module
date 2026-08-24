import { describe, expect, it } from "vitest";
import { generateLootManifest } from "../../scripts/generators/loot/LootGenerator.js";
import type { LootCandidate, LootGenerationInput } from "../../scripts/generators/loot/LootGeneratorTypes.js";
import { lootCandidateFromDocument } from "../../scripts/generators/loot/PF2eLootSource.js";

const candidates: LootCandidate[] = [
  { uuid: "Compendium.pf2e.equipment-srd.a", name: "Minor Elixir", level: 2, rarity: "common", category: "consumable", type: "consumable", traits: ["elixir"], sourceId: "pf2e.equipment-srd", sourceLabel: "Equipment", priceCopper: 300 },
  { uuid: "Compendium.pf2e.equipment-srd.b", name: "Rune Blade", level: 4, rarity: "uncommon", category: "permanent", type: "weapon", traits: ["magical"], sourceId: "pf2e.equipment-srd", sourceLabel: "Equipment", priceCopper: 1_200 },
  { uuid: "Item.world-c", name: "Silver Idol", level: 3, rarity: "rare", category: "treasure", type: "treasure", traits: [], sourceId: "world", sourceLabel: "World", priceCopper: 500 },
  { uuid: "Compendium.other.d", name: "Filtered", level: 9, rarity: "unique", category: "permanent", type: "equipment", traits: [], sourceId: "other", sourceLabel: "Other", priceCopper: 100 },
];

const input: LootGenerationInput = {
  partyLevel: 3,
  partySize: 4,
  encounterLevel: 3,
  minimumItemLevel: 1,
  maximumItemLevel: 5,
  rarities: ["common", "uncommon", "rare"],
  categories: ["treasure", "consumable", "permanent"],
  types: [],
  traits: [],
  allowedSources: ["pf2e.equipment-srd", "world"],
  budgetCopper: 1_500,
  seed: "ethernum-test",
};

describe("deterministic PF2e loot generation", () => {
  it("repeats the same manifest for the same seed and inputs", () => {
    const first = generateLootManifest(input, candidates, 1_000);
    const second = generateLootManifest(input, candidates, 1_000);
    expect(second).toEqual(first);
    expect(first.items.map(item => item.uuid)).not.toContain("Compendium.other.d");
  });

  it("never exceeds the budget and preserves the exact remainder as currency", () => {
    const manifest = generateLootManifest(input, candidates, 1_000);
    expect(manifest.spentCopper + manifest.currencyCopper).toBe(input.budgetCopper);
    expect(manifest.items.every(item => item.level >= 1 && item.level <= 5)).toBe(true);
    expect(manifest.items.every(item => input.allowedSources.includes(item.sourceId))).toBe(true);
  });

  it("returns a safe empty preview instead of inventing an item", () => {
    const manifest = generateLootManifest({ ...input, maximumItemLevel: 1 }, candidates, 1_000);
    expect(manifest.items).toEqual([]);
    expect(manifest.currencyCopper).toBe(input.budgetCopper);
    expect(manifest.warnings[0]).toContain("Nenhum Item PF2e real");
  });

  it("accepts only physical PF2e items and reads nested index metadata", () => {
    expect(lootCandidateFromDocument({ name: "Spell", type: "spell", system: {} }, "pf2e.spells-srd", "Spells", "Compendium.pf2e.spells-srd.a")).toBeNull();
    expect(lootCandidateFromDocument({
      name: "Indexed Elixir", type: "consumable", img: "elixir.webp",
      system: { level: { value: 3 }, traits: { rarity: "uncommon", value: ["elixir", "healing"] }, price: { value: { gp: 3 } } },
    }, "pf2e.equipment-srd", "Equipment", "Compendium.pf2e.equipment-srd.elixir")).toMatchObject({
      level: 3, rarity: "uncommon", category: "consumable", priceCopper: 300, traits: ["elixir", "healing"],
    });
  });
});
