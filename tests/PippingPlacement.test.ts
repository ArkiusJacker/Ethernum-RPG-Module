import { describe, expect, it } from "vitest";
import {
  pippingCanvasDistance,
  pippingPlacementWithinRange,
  pippingShadowRangeForTier,
} from "../scripts/mechanics/pipping/placement.js";

describe("Pipping shadow placement", () => {
  it.each([
    [1, 10],
    [2, 10],
    [3, 20],
    [4, 20],
    [5, 30],
  ] as const)("resolves Tier %i range", (tier, range) => {
    expect(pippingShadowRangeForTier(tier)).toBe(range);
  });

  it("measures canvas distance using scene grid units", () => {
    expect(pippingCanvasDistance({ x: 50, y: 50 }, { x: 250, y: 50 }, 100, 5)).toBe(10);
  });

  it("accepts the boundary and rejects positions beyond it", () => {
    expect(pippingPlacementWithinRange(
      { x: 50, y: 50 },
      { x: 250, y: 50 },
      10,
      100,
      5,
    )).toBe(true);
    expect(pippingPlacementWithinRange(
      { x: 50, y: 50 },
      { x: 251, y: 50 },
      10,
      100,
      5,
    )).toBe(false);
  });
});
