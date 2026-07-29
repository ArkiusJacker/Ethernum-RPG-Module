import { describe, expect, it } from "vitest";
import { shouldShowTimerAdministration } from "../scripts/ui/CombatMomentumTracker.js";

describe("combat tracker timer visibility", () => {
  it("keeps administrative controls exclusive to the GM view", () => {
    expect(shouldShowTimerAdministration(true, "gm")).toBe(true);
    expect(shouldShowTimerAdministration(true, "player")).toBe(false);
    expect(shouldShowTimerAdministration(false, "gm")).toBe(false);
    expect(shouldShowTimerAdministration(false, "player")).toBe(false);
  });
});
