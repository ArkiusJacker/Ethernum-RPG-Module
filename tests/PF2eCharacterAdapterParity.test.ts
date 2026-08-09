import { describe, expect, it, vi } from "vitest";
import { PF2eCharacterAdapter } from "../scripts/core/PF2eCharacterAdapter.js";

describe("PF2eCharacterAdapter.details", () => {
  it("reads prepared PF2e parity data without recalculating rules", () => {
    const primaryClassDC = {
      slug: "inventor",
      label: "Inventor DC",
      rank: 3,
      dc: { value: 31 },
    };
    const secondaryClassDC = {
      slug: "wizard",
      label: "Wizard DC",
      rank: 2,
      dc: { value: 27 },
    };
    const actor = {
      classDC: primaryClassDC,
      classDCs: new Map([
        ["inventor", primaryClassDC],
        ["wizard", secondaryClassDC],
      ]),
      proficiencies: {
        attacks: new Map([
          ["martial", { label: "Martial Weapons", rank: 2, value: 18, visible: true }],
          ["hidden", { label: "Hidden", rank: 4, value: 24, visible: false }],
        ]),
      },
      perception: {
        senses: new Map([
          ["darkvision", { type: "darkvision", label: "Darkvision", acuity: "precise", range: Infinity }],
          ["scent", { type: "scent", label: "Scent (Imprecise) 30 feet", acuity: "imprecise", range: 30 }],
        ]),
      },
      languages: [{ slug: "common", label: "Common" }],
      system: {
        details: {
          biography: {
            appearance: "<p>Forge-burned coat.</p>",
            backstory: "<p>Raised among inventors.</p>",
            campaignNotes: "<p>Repair the engine.</p>",
            allies: "<p>The Company.</p>",
            enemies: "<p>The saboteur.</p>",
            organizations: "<p>Forge Union.</p>",
          },
          languages: { value: ["common", "dwarven"], details: "Understands old forge cant." },
        },
        perception: {
          senses: [
            { type: "darkvision", label: "Stored Darkvision", acuity: "precise" },
            { type: "tremorsense", label: "Tremorsense 20 feet", acuity: "imprecise", range: 20 },
          ],
        },
        proficiencies: {
          attacks: {
            martial: { label: "Stored Martial", rank: 1, value: 12, visible: true },
          },
          defenses: {
            medium: { label: "Medium Armor", rank: 2, value: 17, visible: true },
          },
          classDCs: {
            inventor: { slug: "inventor", label: "Stored Inventor DC", rank: 3, value: 30, primary: true },
            wizard: { slug: "wizard", label: "Stored Wizard DC", rank: 2, value: 26, primary: false },
          },
        },
        exploration: ["scout"],
        crafting: {
          formulas: [{ uuid: "Compendium.pf2e.equipment-srd.Item.formula" }],
          entries: {},
        },
      },
      items: [
        {
          id: "scout",
          type: "action",
          name: "Scout",
          img: "scout.webp",
          system: {
            actionType: { value: "action" },
            actions: { value: 1 },
            traits: { value: ["exploration"] },
          },
        },
        {
          id: "search",
          type: "action",
          name: "Search",
          system: { actionType: { value: "action" }, traits: { value: ["exploration"] } },
        },
        {
          id: "earn-income",
          type: "action",
          name: "Earn Income",
          system: { actionType: { value: "action" }, traits: { value: ["downtime"] } },
        },
      ],
      actions: [
        { id: "weapon-strike", type: "strike", item: { id: "sword", type: "weapon", name: "Sword" } },
        { id: "prepared-blast", label: "Prepared Blast", variants: [{ modifier: 18 }], traits: ["impulse"] },
      ],
      crafting: {
        abilities: new Map([
          ["advanced-alchemy", {
            slug: "advanced-alchemy",
            label: "Advanced Alchemy",
            isPrepared: true,
            isDailyPrep: true,
            isAlchemical: true,
            maxSlots: 4,
            maxItemLevel: 7,
            resource: "infused-reagents",
            preparedFormulaData: [{
              uuid: "Compendium.pf2e.equipment-srd.Item.elixir",
              quantity: 2,
              expended: true,
              isSignatureItem: true,
            }],
            getPreparedCraftingFormulas: vi.fn(() => {
              throw new Error("details() must stay synchronous and readonly");
            }),
          }],
        ]),
      },
    };

    const details = PF2eCharacterAdapter.details(actor as never);

    expect(details.biography).toEqual({
      appearance: "<p>Forge-burned coat.</p>",
      backstory: "<p>Raised among inventors.</p>",
      campaignNotes: "<p>Repair the engine.</p>",
      allies: "<p>The Company.</p>",
      enemies: "<p>The saboteur.</p>",
      organizations: "<p>Forge Union.</p>",
    });
    expect(details.proficiencies).toEqual({
      weapons: [{ slug: "martial", label: "Martial Weapons", rank: 2, rankLabel: "Expert", modifier: 18 }],
      armor: [{ slug: "medium", label: "Medium Armor", rank: 2, rankLabel: "Expert", modifier: 17 }],
    });
    expect(details.classDCs).toEqual({
      primary: {
        slug: "inventor",
        label: "Inventor DC",
        dc: 31,
        rank: 3,
        rankLabel: "Master",
        primary: true,
      },
      secondary: [{
        slug: "wizard",
        label: "Wizard DC",
        dc: 27,
        rank: 2,
        rankLabel: "Expert",
        primary: false,
      }],
    });
    expect(details.senses).toEqual([
      { slug: "darkvision", label: "Darkvision", acuity: "precise" },
      { slug: "scent", label: "Scent (Imprecise) 30 feet", acuity: "imprecise", range: 30 },
      { slug: "tremorsense", label: "Tremorsense 20 feet", acuity: "imprecise", range: 20 },
    ]);
    expect(details.languages).toEqual({
      values: [
        { slug: "common", label: "Common" },
        { slug: "dwarven", label: "dwarven" },
      ],
      details: "Understands old forge cant.",
    });
    expect(details.exploration.active).toEqual([
      expect.objectContaining({ id: "scout", itemId: "scout", label: "Scout", traits: ["exploration"] }),
    ]);
    expect(details.exploration.other).toEqual([
      expect.objectContaining({ id: "search", itemId: "search", label: "Search", traits: ["exploration"] }),
    ]);
    expect(details.downtime).toEqual([
      expect.objectContaining({ id: "earn-income", label: "Earn Income", traits: ["downtime"] }),
    ]);
    expect(details.specialActions).toEqual([
      expect.objectContaining({ id: "prepared-blast", label: "Prepared Blast", traits: ["impulse"] }),
    ]);
    expect(details.crafting).toEqual({
      available: true,
      knownFormulas: [{
        uuid: "Compendium.pf2e.equipment-srd.Item.formula",
        quantity: 1,
        expended: false,
        signature: false,
      }],
      abilities: [{
        slug: "advanced-alchemy",
        label: "Advanced Alchemy",
        isPrepared: true,
        isDailyPrep: true,
        isAlchemical: true,
        maxSlots: 4,
        maxItemLevel: 7,
        resource: "infused-reagents",
        prepared: [{
          uuid: "Compendium.pf2e.equipment-srd.Item.elixir",
          quantity: 2,
          expended: true,
          signature: true,
        }],
      }],
    });
    expect(actor.crafting.abilities.get("advanced-alchemy")?.getPreparedCraftingFormulas).not.toHaveBeenCalled();
  });

  it("keeps unavailable values empty and never derives a class DC from a modifier", () => {
    const actor = {
      classDC: { slug: "psychic", label: "Psychic DC", rank: 2, mod: 17 },
      classDCs: {
        psychic: { slug: "psychic", label: "Psychic DC", rank: 2, mod: 17 },
      },
    };

    expect(PF2eCharacterAdapter.details(actor as never).classDCs).toEqual({
      primary: {
        slug: "psychic",
        label: "Psychic DC",
        dc: null,
        rank: 2,
        rankLabel: "Expert",
        primary: true,
      },
      secondary: [],
    });
  });

  it("uses source-data fallbacks and returns stable defaults for partial actors", () => {
    expect(PF2eCharacterAdapter.details({} as never)).toEqual({
      biography: {
        appearance: "",
        backstory: "",
        campaignNotes: "",
        allies: "",
        enemies: "",
        organizations: "",
      },
      proficiencies: { weapons: [], armor: [] },
      classDCs: { secondary: [] },
      senses: [],
      languages: { values: [], details: "" },
      exploration: { active: [], other: [] },
      downtime: [],
      crafting: { available: false, knownFormulas: [], abilities: [] },
      specialActions: [],
    });

    const sourceFallback = PF2eCharacterAdapter.details({
      _source: {
        system: {
          details: {
            biography: { appearance: "Source appearance", organizations: "Source organization" },
            languages: { value: ["common"], details: "Source language note" },
          },
          perception: { senses: [{ type: "low-light-vision", label: "Low-Light Vision" }] },
          proficiencies: {
            attacks: { simple: { label: "Simple Weapons", rank: 1, value: 9, visible: true } },
            defenses: {},
            classDCs: {},
          },
          crafting: { formulas: [{ uuid: "Compendium.test.Item.formula" }], entries: {} },
        },
      },
    } as never);

    expect(sourceFallback.biography).toMatchObject({
      appearance: "Source appearance",
      organizations: "Source organization",
    });
    expect(sourceFallback.proficiencies.weapons).toEqual([
      { slug: "simple", label: "Simple Weapons", rank: 1, rankLabel: "Trained", modifier: 9 },
    ]);
    expect(sourceFallback.senses).toEqual([
      { slug: "low-light-vision", label: "Low-Light Vision" },
    ]);
    expect(sourceFallback.languages).toEqual({
      values: [{ slug: "common", label: "common" }],
      details: "Source language note",
    });
    expect(sourceFallback.crafting).toMatchObject({ available: true });
  });
});
