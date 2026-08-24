import { describe, expect, it } from "vitest";
import { analyzeEncounter, encounterBudgets } from "../../scripts/generators/encounter/EncounterAnalyzer.js";

describe("PF2e encounter analyzer", () => {
  it("uses the official relative-level XP table and adjusted party budgets", () => {
    const analysis = analyzeEncounter({
      party: Array.from({ length: 4 }, (_, index) => ({ id: `pc-${index}`, name: `PC ${index}`, level: 5, disposition: "party" as const })),
      enemies: [
        { id: "enemy-1", name: "Equal foe", level: 5, disposition: "enemy" },
        { id: "enemy-2", name: "Elite foe", level: 7, disposition: "enemy" },
      ],
    }, 1_000);
    expect(analysis.contributions.map(entry => entry.xp)).toEqual([40, 80]);
    expect(analysis.xp).toBe(120);
    expect(analysis.difficulty).toBe("severe");
    expect(analysis.budgets).toEqual(encounterBudgets(4));
  });

  it("warns about mixed-level parties and prefers native prepared XP", () => {
    const analysis = analyzeEncounter({
      party: [
        { id: "pc-1", name: "One", level: 4, disposition: "party" },
        { id: "pc-2", name: "Two", level: 6, disposition: "party" },
      ],
      enemies: [{ id: "enemy", name: "Threat", level: 6, disposition: "enemy" }],
      preparedXp: 99,
    }, 1_000);
    expect(analysis.partyLevel).toBe(5);
    expect(analysis.xp).toBe(99);
    expect(analysis.xpSource).toBe("prepared");
    expect(analysis.warnings.join(" ")).toContain("níveis mistos");
    expect(analysis.warnings.join(" ")).toContain("difere");
  });

  it("flags encounters above the supported +4 range without mutating participants", () => {
    const enemy = { id: "boss", name: "Boss", level: 12, disposition: "enemy" as const };
    const analysis = analyzeEncounter({ party: [{ id: "pc", name: "PC", level: 5, disposition: "party" }], enemies: [enemy] }, 1_000);
    expect(analysis.contributions[0]).toMatchObject({ relativeLevel: 7, xp: 160 });
    expect(analysis.warnings.join(" ")).toContain("potencialmente desproporcional");
    expect(enemy).toEqual({ id: "boss", name: "Boss", level: 12, disposition: "enemy" });
  });
});
