import { beforeEach, describe, expect, it, vi } from "vitest";
import { PF2eCharacterAdapter } from "../scripts/core/PF2eCharacterAdapter.js";
import { auditPF2eCharacterParity } from "../scripts/sheets/core/PF2eCharacterParityAudit.js";
import { buildCharacterSheetPresentation } from "../scripts/sheets/core/CharacterSheetPresentation.js";

function fixture() {
  const actor = {
    id: "parity-hero",
    uuid: "Actor.parity-hero",
    name: "Parity Hero",
    armorClass: { value: 24 },
    perception: { mod: 13 },
    saves: {
      fortitude: { label: "Fortitude", mod: 15 },
      reflex: { label: "Reflex", mod: 14 },
      will: { label: "Will", mod: 12 },
    },
    skills: new Map([
      ["acrobatics", { label: "Acrobatics", mod: 14, rank: 2 }],
      ["athletics", { label: "Athletics", mod: 15, rank: 2 }],
    ]),
    inventory: {
      coins: { pp: 1, gp: 22, sp: 7, cp: 4 },
      bulk: { value: 3, max: 8, encumberedAt: 6, isEncumbered: false },
    },
    system: {
      attributes: { hp: { value: 41, max: 48, temp: 5 } },
      resources: { heroPoints: { value: 2, max: 3 }, focus: { value: 1, max: 2 } },
      actions: [{
        id: "agile-claw",
        type: "strike",
        label: "Agile Claw",
        item: { id: "claw", type: "weapon", name: "Claw", system: { traits: { value: ["agile"] } } },
        variants: [{ modifier: 16 }, { modifier: 12 }, { modifier: 8 }],
      }],
    },
    items: [
      {
        id: "pack",
        uuid: "Actor.parity-hero.Item.pack",
        type: "backpack",
        name: "Field Pack",
        system: { quantity: 1, equipped: { carryType: "worn" } },
      },
      {
        id: "tool",
        uuid: "Actor.parity-hero.Item.tool",
        type: "equipment",
        name: "Repair Tool",
        system: {
          quantity: 2,
          containerId: "pack",
          equipped: { carryType: "stowed", invested: true },
        },
      },
      {
        id: "entry-arcane",
        type: "spellcastingEntry",
        name: "Arcane Prepared Spells",
        system: {
          tradition: { value: "arcane" },
          prepared: { value: "prepared" },
          statistic: { dc: { value: 25 }, mod: 15 },
        },
      },
      {
        id: "entry-focus",
        type: "spellcastingEntry",
        name: "Focus Spells",
        system: {
          tradition: { value: "occult" },
          prepared: { value: "focus" },
          statistic: { dc: { value: 24 }, mod: 14 },
        },
      },
      {
        id: "frightened",
        uuid: "Actor.parity-hero.Item.frightened",
        type: "condition",
        name: "Frightened 1",
        slug: "frightened",
        system: { value: { value: 1 } },
      },
    ],
  };
  const moduleData = {
    vitals: PF2eCharacterAdapter.vitals(actor as never),
    skills: PF2eCharacterAdapter.skills(actor as never),
    defenses: PF2eCharacterAdapter.defenses(actor as never),
    resources: PF2eCharacterAdapter.resources(actor as never),
    strikes: PF2eCharacterAdapter.strikes(actor as never),
    inventory: PF2eCharacterAdapter.inventory(actor as never),
    spellcasting: PF2eCharacterAdapter.spellcasting(actor as never),
    effects: PF2eCharacterAdapter.effects(actor as never),
  };
  const presentation = buildCharacterSheetPresentation(moduleData, {
    owner: true,
    gm: true,
    observer: true,
    editable: true,
    canChooseSheet: true,
  });
  return { actor, presentation };
}

describe("PF2eCharacterParityAudit", () => {
  beforeEach(() => {
    vi.stubGlobal("game", { i18n: { localize: (key: string) => key } });
  });

  it("matches normalized PF2e mechanics against the Ethernum presentation", () => {
    const { actor, presentation } = fixture();
    const report = auditPF2eCharacterParity(actor as never, presentation, 1234);

    expect(report.categories.flatMap(category => category.mismatches.map(entry => ({
      category: category.id,
      key: entry.key,
      pf2e: entry.pf2e,
      ethernum: entry.ethernum,
    })))).toEqual([]);
    expect(report).toMatchObject({
      actorId: "parity-hero",
      generatedAt: 1234,
      status: "match",
    });
    expect(report.checked).toBeGreaterThan(20);
    expect(report.matched).toBe(report.checked);
    expect(report.mismatchCount).toBe(0);
    expect(report.categories.find(category => category.id === "strikes")).toMatchObject({
      status: "match",
      matched: 3,
    });
    expect(report.categories.find(category => category.id === "currency")?.matched).toBe(4);
    expect(report.categories.find(category => category.id === "spellcasting")?.status).toBe("match");
  });

  it("reports expandable mechanical mismatch detail without mutating the actor", () => {
    const { actor, presentation } = fixture();
    const strikes = presentation.strikes as Array<Record<string, unknown>>;
    const variants = strikes[0].attackVariants as Array<Record<string, unknown>>;
    variants[1].modifier = 11;
    const currency = (presentation.inventory as Record<string, unknown>).currency as Record<string, unknown>;
    currency.gp = 999;

    const report = auditPF2eCharacterParity(actor as never, presentation);
    expect(report.status).toBe("mismatch");
    expect(report.categories.find(category => category.id === "strikes")?.mismatches[0]).toMatchObject({
      key: "agile-claw:map-1",
      pf2e: 12,
      ethernum: 11,
    });
    expect(report.categories.find(category => category.id === "currency")?.mismatches[0]).toMatchObject({
      key: "gp",
      pf2e: 22,
      ethernum: 999,
    });
    expect(actor.system.attributes.hp.value).toBe(41);
    expect(actor.items[1].system.quantity).toBe(2);
    expect(report.mismatchCount).toBe(2);
  });

  it("ignores empty PF2e spell ranks while retaining occupied rank and slot parity", () => {
    const { actor, presentation } = fixture();
    const spellcasting = PF2eCharacterAdapter.spellcasting(actor as never);
    const entry = spellcasting.entries[0];
    entry.groups = [
      { rank: 0, spells: [] },
      { rank: 1, spells: [] },
      { rank: 2, spells: [{ id: "spell-2" } as never] },
      { rank: 3, slots: { value: 0, max: 0 }, spells: [] },
    ];
    vi.spyOn(PF2eCharacterAdapter, "spellcasting").mockReturnValue(spellcasting);

    const presentedSpellcasting = presentation.spellcasting as Record<string, unknown>;
    const entries = presentedSpellcasting.entries as Array<Record<string, unknown>>;
    entries[0].groups = [{ rank: 2, spells: [{ id: "spell-2" }] }];

    const report = auditPF2eCharacterParity(actor as never, presentation);
    expect(report.categories.find(category => category.id === "spellcasting")?.mismatches).toEqual([]);
  });
});
