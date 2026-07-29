import { describe, expect, it } from "vitest";
import {
  PIPPING_SHADOW_ASSETS,
  selectPippingShadowVariant,
} from "../scripts/mechanics/pipping/assets.js";
import {
  basicSaveDamage,
  pippingTierGroupOpen,
  resolvePippingDegree,
} from "../scripts/mechanics/pipping/rules.js";

describe("Pipping shadow assets", () => {
  it("maps the three expressions to distinct local assets", () => {
    expect(new Set(Object.values(PIPPING_SHADOW_ASSETS)).size).toBe(3);
    expect(PIPPING_SHADOW_ASSETS.destruction).toContain("shadow-destruction.png");
    expect(PIPPING_SHADOW_ASSETS.order).toContain("shadow-order.png");
    expect(PIPPING_SHADOW_ASSETS.chaos).toContain("shadow-chaos.png");
  });

  it("selects all three variants with uniform RNG boundaries", () => {
    expect(selectPippingShadowVariant(() => 0).expression).toBe("destruction");
    expect(selectPippingShadowVariant(() => 0.34).expression).toBe("order");
    expect(selectPippingShadowVariant(() => 0.99).expression).toBe("chaos");
  });
});

describe("Pipping automatic save rules", () => {
  it("resolves PF2e degrees including natural 1 and 20 adjustments", () => {
    expect(resolvePippingDegree(25, 20, 10)).toBe("success");
    expect(resolvePippingDegree(25, 20, 20)).toBe("criticalSuccess");
    expect(resolvePippingDegree(15, 20, 1)).toBe("criticalFailure");
  });

  it("applies the basic-save damage ladder", () => {
    expect(basicSaveDamage(21, "criticalSuccess")).toBe(0);
    expect(basicSaveDamage(21, "success")).toBe(10);
    expect(basicSaveDamage(21, "failure")).toBe(21);
    expect(basicSaveDamage(21, "criticalFailure")).toBe(42);
  });

  it("opens the active tier by default", () => {
    expect(pippingTierGroupOpen(3, 3)).toBe(true);
    expect(pippingTierGroupOpen(2, 3)).toBe(false);
    expect(pippingTierGroupOpen(2, 3, true)).toBe(true);
  });
});
