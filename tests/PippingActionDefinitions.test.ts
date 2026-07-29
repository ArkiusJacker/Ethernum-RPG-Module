import { describe, expect, it } from "vitest";
import {
  getNextScalingIncrease,
  getPippingActionFormula,
  PIPPING_ACTION_FORMULAS,
  resolvePippingActionFormula,
  resolveScaling,
  resolveScalingProgression,
  type PippingFormulaId,
} from "../scripts/mechanics/pipping/actions.js";
import {
  PIPPING_ACTIONS,
  calculatePippingPulseMaximum,
  getPippingAction,
  pippingTierForLevel,
  resolvePippingPulseMaximum,
} from "../scripts/mechanics/pipping/progression.js";

const expectedDice = {
  "ruin-note": (level: number) => `${Math.min(10, 2 + Math.floor((Math.max(3, level) - 3) / 2))}d6`,
  "restoring-pulse": (level: number) =>
    `${Math.min(10, 2 + Math.floor((Math.max(3, level) - 3) / 2))}d6 + 4`,
  "void-touch": (level: number) => `${Math.min(11, 4 + Math.floor((Math.max(5, level) - 5) / 2))}d6`,
  "night-emanation": (level: number) => `${Math.min(11, 6 + Math.floor((Math.max(9, level) - 9) / 2))}d6`,
  "requiem-persist": (level: number) =>
    `${Math.min(5, 3 + Math.floor((Math.max(9, level) - 9) / 4))}d8 + 4`,
  "ending-chorus": (level: number) => `${Math.min(13, 10 + Math.floor((Math.max(13, level) - 13) / 2))}d6`,
  "gentle-night-liturgy": (level: number) => `${6 + Number(level >= 17) + Number(level >= 19)}d8 + 4`,
  "dead-sun-epitaph": (level: number) => `${level >= 19 ? 16 : 14}d6`,
  "night-refuses-end": () => "8d8 + 4",
} satisfies Partial<Record<PippingFormulaId, (level: number) => string>>;

describe("Pipping action definitions", () => {
  it("keeps one complete mechanical descriptor for every action", () => {
    expect(PIPPING_ACTIONS).toHaveLength(22);
    expect(new Set(PIPPING_ACTIONS.map(action => action.id)).size).toBe(PIPPING_ACTIONS.length);

    for (const action of PIPPING_ACTIONS) {
      expect(action.summaryKey).toBeTruthy();
      expect(action.flavorKey).toBeTruthy();
      expect(action.requirements).toBeInstanceOf(Array);
      expect(action.effects).toBeInstanceOf(Array);
      expect(action.animation.id).toBe(action.id);
      expect(action.animation.fallbackClass).toBeTruthy();
      expect(action.actionCost).toBe(typeof action.actions === "number" ? action.actions : 0);
      expect(action.actionType).toBe(typeof action.actions === "number" ? "action" : action.actions);
      if (action.defense) {
        expect(action.save).toEqual(expect.objectContaining({
          type: action.defense,
          basic: Boolean(action.basicSave),
        }));
      }
      if (action.formulaId) {
        expect(action.formula).toBe(PIPPING_ACTION_FORMULAS[action.formulaId]);
      }
    }
  });

  it("describes the intensified whisper without changing its base cost", () => {
    const whisper = getPippingAction("dark-whisper")!;
    expect(whisper.pulseCost).toBe(1);
    expect(whisper.optionalPulseCosts).toEqual([
      expect.objectContaining({ id: "intensify", pulseCost: 1 }),
    ]);
  });

  it("stores persistent damage, areas, triggers, and assisted effects as mechanics", () => {
    expect(getPippingAction("void-touch")?.damage?.persistent).toEqual({
      failure: "1d6",
      criticalFailure: "2d6",
      sameType: true,
    });
    expect(getPippingAction("dead-sun-epitaph")?.area).toEqual(
      expect.objectContaining({ type: "burst", duration: "1-minute" }),
    );
    expect(getPippingAction("night-refuses-end")?.requirements.map(item => item.id))
      .toContain("valid-reaction-trigger");
    expect(getPippingAction("black-order-mantle")?.effects.map(item => item.id))
      .toContain("reduce-triggering-damage-instance");
  });
});

describe("Pipping declarative scaling", () => {
  it.each(Array.from({ length: 20 }, (_, index) => index + 1))(
    "resolves every specified formula at level %i",
    level => {
      for (const [formulaId, expected] of Object.entries(expectedDice)) {
        expect(getPippingActionFormula(formulaId, level, 4, pippingTierForLevel(level)))
          .toBe(expected(level));
      }
      expect(getPippingActionFormula("black-order-mantle", level, 4, pippingTierForLevel(level)))
        .toBe(String(Math.ceil(level / 2) + 4));
    },
  );

  it("reports current, next increase, and maximum from the same formula", () => {
    expect(resolvePippingActionFormula("night-emanation", 10, 4, 3)).toEqual({
      formulaId: "night-emanation",
      current: "6d6",
      nextIncrease: { level: 11, formula: "7d6" },
      maximum: { level: 19, formula: "11d6" },
    });
    expect(resolvePippingActionFormula("night-emanation", 19, 4, 5)?.nextIncrease).toBeNull();
    expect(resolvePippingActionFormula("gentle-night-liturgy", 18, 4, 5)?.nextIncrease)
      .toEqual({ level: 19, formula: "8d8 + 4" });
  });

  it("supports regular, scheduled, capped, and fixed scaling values", () => {
    const regular = PIPPING_ACTION_FORMULAS["ruin-note"].scaling;
    expect(resolveScaling(regular, 3)).toBe(2);
    expect(getNextScalingIncrease(regular, 3)).toEqual({ level: 5, value: 3 });
    expect(resolveScalingProgression(regular, 19)).toEqual({
      current: 10,
      nextIncrease: null,
      maximum: 10,
      maximumLevel: 19,
    });

    const scheduled = PIPPING_ACTION_FORMULAS["gentle-night-liturgy"].scaling;
    expect(resolveScaling(scheduled, 16)).toBe(6);
    expect(getNextScalingIncrease(scheduled, 16)).toEqual({ level: 17, value: 7 });

    const fixed = PIPPING_ACTION_FORMULAS["night-refuses-end"].scaling;
    expect(resolveScaling(fixed, 20)).toBe(8);
    expect(getNextScalingIncrease(fixed, 17)).toBeNull();
    expect(resolveScalingProgression(fixed, 20).maximumLevel).toBe(17);
  });

  it("handles negative and missing Charisma without producing an invalid formula", () => {
    expect(getPippingActionFormula("restoring-pulse", 3, -2, 1)).toBe("2d6 - 2");
    expect(getPippingActionFormula("restoring-pulse", 3, Number.NaN, 1)).toBe("2d6 + 0");
    expect(getPippingActionFormula("black-order-mantle", 5, Number.NaN, 2)).toBe("3");
  });
});

describe("Pipping Tier and Pulse scaling", () => {
  it.each(Array.from({ length: 20 }, (_, index) => index + 1))(
    "maps every level from 1 to 20 (%i)",
    level => {
      const expectedTier = level >= 17 ? 5 : level >= 13 ? 4 : level >= 9 ? 3 : level >= 5 ? 2 : 1;
      expect(pippingTierForLevel(level)).toBe(expectedTier);
    },
  );

  it("reports Pulse details and the next Tier increase", () => {
    expect(resolvePippingPulseMaximum(3, 3)).toEqual({
      current: 8,
      charismaModifier: 3,
      charismaValid: true,
      tier: 3,
      nextIncrease: { tier: 4, minimumLevel: 13, value: 9 },
    });
    expect(resolvePippingPulseMaximum(undefined, 1)).toEqual({
      current: 3,
      charismaModifier: 0,
      charismaValid: false,
      tier: 1,
      nextIncrease: { tier: 2, minimumLevel: 5, value: 4 },
    });
    expect(calculatePippingPulseMaximum(-5, 1)).toBe(1);
  });
});
