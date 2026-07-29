import { describe, expect, it } from "vitest";
import {
  calculatePippingPulseMaximum,
  getPippingAction,
  getPippingActionAvailability,
  isPippingActionSelected,
  pippingTierForLevel,
} from "../scripts/mechanics/pipping/progression.js";
import { getPippingActionFormula } from "../scripts/mechanics/pipping/actions.js";
import { normalizePippingState } from "../scripts/mechanics/pipping/state.js";

describe("Pipping progression", () => {
  it.each([
    [3, 1],
    [4, 1],
    [5, 2],
    [8, 2],
    [9, 3],
    [12, 3],
    [13, 4],
    [16, 4],
    [17, 5],
    [20, 5],
  ])("maps level %i to Tier %i", (level, tier) => {
    expect(pippingTierForLevel(level)).toBe(tier);
  });

  it("scales maximum Pulse with Charisma and Tier", () => {
    expect(calculatePippingPulseMaximum(3, 1)).toBe(6);
    expect(calculatePippingPulseMaximum(3, 5)).toBe(10);
  });

  it("scales the Tier I damage and healing formulas", () => {
    expect(getPippingActionFormula("ruin-note", 3, 4, 1)).toBe("2d6");
    expect(getPippingActionFormula("ruin-note", 19, 4, 5)).toBe("10d6");
    expect(getPippingActionFormula("restoring-pulse", 5, 4, 2)).toBe("3d6 + 4");
  });

  it("only selects an expression action after that Tier choice", () => {
    const action = getPippingAction("void-touch");
    expect(action).not.toBeNull();
    const unselected = normalizePippingState({ tier: 2 });
    const selected = normalizePippingState({
      tier: 2,
      expressionChoices: { "2": "destruction" },
    });
    expect(isPippingActionSelected(action!, unselected)).toBe(false);
    expect(isPippingActionSelected(action!, selected)).toBe(true);
  });

  it("uses the same Tier, expression, Pulse, and daily locks as the sheet", () => {
    const action = getPippingAction("dead-sun-epitaph")!;
    const lockedTier = normalizePippingState({
      tier: 4,
      pulse: 5,
      expressionChoices: { "5": "destruction" },
    });
    expect(getPippingActionAvailability(action, lockedTier, 16, 4).reason).toBe("tier");

    const wrongExpression = normalizePippingState({
      tier: 5,
      pulse: 5,
      expressionChoices: { "5": "order" },
    });
    expect(getPippingActionAvailability(action, wrongExpression, 17, 5).reason).toBe("expression");

    const noPulse = normalizePippingState({
      tier: 5,
      pulse: 4,
      expressionChoices: { "5": "destruction" },
    });
    expect(getPippingActionAvailability(action, noPulse, 17, 5).reason).toBe("pulse");

    const used = normalizePippingState({
      tier: 5,
      pulse: 5,
      expressionChoices: { "5": "destruction" },
      daily: { tierFiveFinisherUsed: true },
    });
    expect(getPippingActionAvailability(action, used, 17, 5).reason).toBe("daily");
  });
});
