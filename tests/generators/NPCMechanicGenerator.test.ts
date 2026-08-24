import { describe, expect, it } from "vitest";
import type { NPCMechanicAnalysis } from "../../scripts/generators/mechanics/GeneratedNPCMechanicTypes.js";
import { generateNPCMechanic } from "../../scripts/generators/mechanics/NPCMechanicGenerator.js";
import { classifyNPCRoles } from "../../scripts/generators/mechanics/NPCMechanicRoleClassifier.js";
import { analyzePF2eNPC } from "../../scripts/generators/mechanics/PF2eNPCMechanicSource.js";
import { NPC_MECHANIC_TEMPLATES } from "../../scripts/generators/mechanics/NPCMechanicTemplates.js";
import { validateGeneratedNPCMechanicDefinition } from "../../scripts/generators/mechanics/GeneratedNPCMechanicValidator.js";

function analysis(overrides: Partial<NPCMechanicAnalysis> = {}): NPCMechanicAnalysis {
  const base: NPCMechanicAnalysis = {
    actorUuid: "Actor.dragon",
    actorName: "Ember Tyrant",
    level: 10,
    traits: ["dragon", "fire", "unique"],
    size: "huge",
    speeds: [{ type: "land", value: 30 }, { type: "fly", value: 60 }],
    strikes: [{ name: "Jaws", attackBonus: 23, ranged: false, reach: 15, damageFormula: "2d12+12", damageTypes: ["piercing", "fire"], traits: ["reach-15"] }],
    attackTypes: ["melee"],
    damageTypes: ["piercing", "fire"],
    spellcasting: false,
    resistances: [{ type: "fire", value: 15 }],
    weaknesses: [{ type: "cold", value: 10 }],
    immunities: ["paralyzed", "sleep"],
    actions: ["Breath Weapon", "Draconic Frenzy", "Wing Buffet"],
    reactions: ["Tail Lash"],
    hp: 240,
    ac: 30,
    saves: { fortitude: 24, reflex: 19, will: 21 },
    roles: [],
    fingerprint: "npc-dragon",
  };
  const merged = { ...base, ...overrides };
  const { roles: _roles, ...roleInput } = merged;
  return { ...merged, roles: overrides.roles ?? classifyNPCRoles(roleInput) };
}

describe("deterministic NPC unique mechanic generator", () => {
  it("classifies multiple roles from PF2e statistics and traits", () => {
    const roles = analysis().roles;
    expect(roles[0]?.role).toBe("boss");
    expect(roles.find(role => role.role === "brute")?.reasons).toContain("PV elevado para o nível");
    expect(roles.find(role => role.role === "skirmisher")?.reasons).toContain("deslocamento acima de 25 pés");
  });

  it("repeats templates and content for the same seed and timestamp", () => {
    const input = { analysis: analysis(), seed: "ember-seed", complexity: "boss" as const };
    const generated = generateNPCMechanic(input, 1_000);
    expect(generated).toEqual(generateNPCMechanic(input, 1_000));
    expect(generated.metadata.origin).toBe("deterministic-generator");
  });

  it("ships every experimental template family requested for v3.8.5", () => {
    expect(NPC_MECHANIC_TEMPLATES.map(template => template.id).sort()).toEqual([
      "aura-template", "charge-template", "counter-template", "escalation-template",
      "finisher-template", "hazard-template", "mark-template", "movement-template",
      "phase-template", "reaction-template", "resource-template", "summon-template",
      "zone-template",
    ]);
  });

  it("respects standard, elite and boss component counts and budgets", () => {
    const npc = analysis({ traits: ["dragon", "fire"] });
    const standard = generateNPCMechanic({ analysis: npc, seed: "standard", complexity: "standard" }, 1_000);
    const elite = generateNPCMechanic({ analysis: npc, seed: "elite", complexity: "elite" }, 1_000);
    const boss = generateNPCMechanic({ analysis: npc, seed: "boss", complexity: "boss" }, 1_000);
    expect([standard.passive, standard.active, standard.reaction, standard.phase].filter(Boolean)).toHaveLength(2);
    expect([elite.passive, elite.active, elite.reaction, elite.phase].filter(Boolean)).toHaveLength(3);
    expect([boss.passive, boss.active, boss.reaction, boss.phase].filter(Boolean)).toHaveLength(4);
    for (const result of [standard, elite, boss]) {
      expect(result.metadata.powerSpent).toBeLessThanOrEqual(result.metadata.powerBudget);
      expect(result.metadata.templateIds).toHaveLength([result.passive, result.active, result.reaction, result.phase].filter(Boolean).length);
    }
  });

  it("keeps every experimental component marked and rejects free passive damage", () => {
    const result = generateNPCMechanic({ analysis: analysis(), seed: "validation", complexity: "boss" }, 1_000);
    expect([result.passive, result.active, result.reaction, result.phase].filter(Boolean).every(component => component!.name.startsWith("[TESTE]"))).toBe(true);
    const tampered = structuredClone(result);
    tampered.passive!.operation = { damage: { formula: "99d20", type: "fire" } };
    expect(() => validateGeneratedNPCMechanicDefinition(tampered)).toThrow(/Fórmula|Dano gratuito/);
  });

  it("reads prepared PF2e movement without touching the deprecated speed getter", () => {
    const attributes = {
      hp: { value: 30, max: 30 },
      ac: { value: 18 },
      resistances: [],
      weaknesses: [],
      immunities: [],
      get speed(): never {
        throw new Error("deprecated speed getter accessed");
      },
    };
    const actor = {
      id: "modern-movement",
      uuid: "Actor.modern-movement",
      name: "Modern Runner",
      type: "npc",
      items: [],
      system: {
        details: { level: { value: 4 } },
        traits: { value: ["humanoid"], size: { value: "medium" } },
        attributes,
        movement: {
          speeds: {
            land: { value: 35, label: "PF2E.Actor.Speed.Land" },
            fly: { value: 50, label: "PF2E.Actor.Speed.Fly" },
            travel: { value: 4 },
          },
        },
        saves: {},
      },
    } as unknown as Actor;

    expect(analyzePF2eNPC(actor).speeds).toEqual([
      { type: "land", value: 35 },
      { type: "fly", value: 50 },
    ]);
  });
});
