import { describe, expect, it } from "vitest";
import {
  affectedDarknessCandidates,
  resolveDarknessTarget,
} from "../scripts/mechanics/pipping/automation.js";

const candidates = [
  { id: "ally", allied: true, distance: 5 },
  { id: "enemy-near", allied: false, distance: 8 },
  { id: "enemy-far", allied: false, distance: 30 },
];

describe("Pipping darkness resolution", () => {
  it("keeps only enemies inside the radius", () => {
    expect(affectedDarknessCandidates(candidates, 10).map(candidate => candidate.id))
      .toEqual(["enemy-near"]);
  });

  it("resolves random targets deterministically with an injected RNG", () => {
    const enemies = affectedDarknessCandidates(candidates, 40);
    expect(resolveDarknessTarget(enemies, "random", () => 0)?.id).toBe("enemy-near");
    expect(resolveDarknessTarget(enemies, "random", () => 0.99)?.id).toBe("enemy-far");
  });

  it.each(["manual", "scatter", "area"] as const)("does not select a token in %s mode", mode => {
    expect(resolveDarknessTarget(candidates, mode)).toBeNull();
  });
});
