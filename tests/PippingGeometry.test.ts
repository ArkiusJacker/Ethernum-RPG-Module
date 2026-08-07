import { describe, expect, it } from "vitest";
import {
  createPippingCone30,
  pippingDistanceToPixels,
  pippingPixelsToDistance,
  pippingPointDistance,
  pippingPointInArea,
  pippingTokenIntersectsArea,
  resolvePippingAreaCandidates,
  resolvePippingAreaOrigin,
  type PippingAreaOrigin,
  type PippingGeometryToken,
  type PippingSceneGeometry,
} from "../scripts/mechanics/pipping/geometry.js";

const squareScene: PippingSceneGeometry = {
  type: "square",
  gridSize: 100,
  gridDistance: 5,
};

const gridlessScene: PippingSceneGeometry = {
  type: "gridless",
  pixelsPerDistance: 10,
};

function origin(
  kind: PippingAreaOrigin["kind"],
  x = 0,
  y = 0,
  overrides: Partial<PippingAreaOrigin> = {},
): PippingAreaOrigin {
  return {
    kind,
    point: { x, y },
    ...overrides,
  };
}

function token(
  id: string,
  x: number,
  y: number,
  overrides: Partial<PippingGeometryToken> = {},
): PippingGeometryToken {
  return {
    id,
    center: { x, y },
    disposition: -1,
    width: 100,
    height: 100,
    dimensionUnit: "pixels",
    ...overrides,
  };
}

describe("Pipping pure area geometry", () => {
  it("converts square-grid pixels and scene distance in both directions", () => {
    expect(pippingDistanceToPixels(15, squareScene)).toBe(300);
    expect(pippingPixelsToDistance(250, squareScene)).toBe(12.5);
    expect(pippingPointDistance({ x: 50, y: 50 }, { x: 250, y: 50 }, squareScene))
      .toBe(10);
  });

  it("uses an explicit scale for gridless scenes", () => {
    expect(pippingDistanceToPixels(12, gridlessScene)).toBe(120);
    expect(pippingPixelsToDistance(75, gridlessScene)).toBe(7.5);

    const area = {
      type: "circle" as const,
      origin: origin("point", 100, 100),
      radius: 10,
    };
    expect(pippingTokenIntersectsArea(
      token("gridless-inside", 225, 100, {
        width: 5,
        height: 5,
        dimensionUnit: "distance",
      }),
      area,
      gridlessScene,
    )).toBe(true);
  });

  it("accepts rendered token bounds in pixels on gridless scenes", () => {
    const emanation = {
      type: "emanation" as const,
      origin: origin("self", 100, 100, {
        width: 80,
        height: 80,
        dimensionUnit: "pixels",
      }),
      radius: 10,
    };

    expect(pippingTokenIntersectsArea(
      token("gridless-rendered-token", 260, 100, {
        width: 40,
        height: 40,
        dimensionUnit: "pixels",
      }),
      emanation,
      gridlessScene,
    )).toBe(true);
  });

  it("resolves self, shadow, and selected-point origins without Foundry globals", () => {
    const origins = [
      origin("self", 50, 50),
      origin("shadow", 500, 250),
      origin("point", 900, 700),
    ];

    expect(origins.map(value => resolvePippingAreaOrigin(value, squareScene)))
      .toEqual([
        expect.objectContaining({ kind: "self", point: { x: 50, y: 50 } }),
        expect.objectContaining({ kind: "shadow", point: { x: 500, y: 250 } }),
        expect.objectContaining({ kind: "point", point: { x: 900, y: 700 } }),
      ]);
  });

  it("keeps points inside or outside an oriented 30-foot cone", () => {
    const cone = createPippingCone30(origin("self"), 0);

    expect(pippingPointInArea({ x: 400, y: 100 }, cone, squareScene)).toBe(true);
    expect(pippingPointInArea({ x: 0, y: 400 }, cone, squareScene)).toBe(false);
    expect(pippingPointInArea({ x: 601, y: 0 }, cone, squareScene)).toBe(false);
  });

  it("detects a token whose edge partially intersects the cone", () => {
    const cone = createPippingCone30(origin("self"), 0);
    const partial = token("partial-cone", 625, 0);
    const outside = token("outside-cone", 651, 0);

    expect(pippingPointInArea(partial.center, cone, squareScene)).toBe(false);
    expect(pippingTokenIntersectsArea(partial, cone, squareScene)).toBe(true);
    expect(pippingTokenIntersectsArea(outside, cone, squareScene)).toBe(false);
  });

  it("measures an emanation from the edges of a sized self origin", () => {
    const emanation = {
      type: "emanation" as const,
      origin: origin("self", 50, 50, {
        width: 1,
        height: 1,
        dimensionUnit: "grid",
      }),
      radius: 10,
    };
    const touching = token("emanation-touching", 325, 50, {
      width: 50,
      height: 50,
    });
    const outside = token("emanation-outside", 326, 50, {
      width: 50,
      height: 50,
    });

    expect(pippingPointInArea(touching.center, emanation, squareScene)).toBe(false);
    expect(pippingTokenIntersectsArea(touching, emanation, squareScene)).toBe(true);
    expect(pippingTokenIntersectsArea(outside, emanation, squareScene)).toBe(false);
  });

  it("uses the animated shadow as the center of a shadow area", () => {
    const shadowArea = {
      type: "circle" as const,
      origin: origin("shadow", 800, 400),
      radius: 10,
    };

    expect(pippingTokenIntersectsArea(
      token("near-shadow", 950, 400),
      shadowArea,
      squareScene,
    )).toBe(true);
    expect(pippingTokenIntersectsArea(
      token("near-self-only", 0, 0),
      shadowArea,
      squareScene,
    )).toBe(false);
  });

  it("centers a burst on the chosen point and includes partial intersections", () => {
    const burst = {
      type: "burst" as const,
      origin: origin("point", 1_000, 1_000),
      radius: 20,
    };
    const partial = token("partial-burst", 1_450, 1_000, {
      width: 120,
      height: 120,
    });
    const outside = token("outside-burst", 1_461, 1_000, {
      width: 120,
      height: 120,
    });

    expect(pippingPointInArea(partial.center, burst, squareScene)).toBe(false);
    expect(pippingTokenIntersectsArea(partial, burst, squareScene)).toBe(true);
    expect(pippingTokenIntersectsArea(outside, burst, squareScene)).toBe(false);
  });

  it("detects partial intersections with a plain circle", () => {
    const circle = {
      type: "circle" as const,
      origin: origin("point"),
      radius: 10,
    };
    const partial = token("partial-circle", 250, 0);

    expect(pippingPointInArea(partial.center, circle, squareScene)).toBe(false);
    expect(pippingTokenIntersectsArea(partial, circle, squareScene)).toBe(true);
  });

  it("filters candidates by geometry, disposition, and explicit exclusions", () => {
    const area = {
      type: "circle" as const,
      origin: origin("self"),
      radius: 20,
    };
    const candidates = [
      token("ally", 100, 0, { disposition: 1 }),
      token("enemy", 200, 0, { disposition: -1 }),
      token("neutral", 100, 100, { disposition: 0 }),
      token("excluded-enemy", 150, 0, { disposition: -1 }),
      token("distant-enemy", 1_000, 0, { disposition: -1 }),
    ];

    expect(resolvePippingAreaCandidates({
      area,
      scene: squareScene,
      candidates,
      disposition: { mode: "enemies", sourceDisposition: 1 },
      excludeIds: ["excluded-enemy"],
    }).map(candidate => candidate.id)).toEqual(["enemy"]);
  });

  it("applies elevation tolerance only when both elevations are available", () => {
    const area = {
      type: "circle" as const,
      origin: origin("self", 0, 0, { elevation: 10 }),
      radius: 20,
    };
    const candidates = [
      token("within-height", 100, 0, { elevation: 15 }),
      token("above-height", 100, 0, { elevation: 16 }),
      token("unknown-height", 100, 0, { elevation: undefined }),
    ];

    expect(resolvePippingAreaCandidates({
      area,
      scene: squareScene,
      candidates,
      elevationTolerance: 5,
    }).map(candidate => candidate.id)).toEqual([
      "within-height",
      "unknown-height",
    ]);

    expect(resolvePippingAreaCandidates({
      area,
      scene: squareScene,
      candidates,
    })).toHaveLength(3);
  });
});
