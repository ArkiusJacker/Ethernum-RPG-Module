import { describe, expect, it } from "vitest";
import {
  PIPPING_STATE_VERSION,
  normalizePippingState,
} from "../scripts/mechanics/pipping/state.js";

describe("normalizePippingState", () => {
  it("migrates the legacy state without changing its four legacy values", () => {
    const migrated = normalizePippingState({
      pulse: 5,
      tier: 4,
      livingNightActive: true,
      mirroredShadows: 3,
    });

    expect(migrated.version).toBe(PIPPING_STATE_VERSION);
    expect(migrated.pulse).toBe(5);
    expect(migrated.tier).toBe(4);
    expect(migrated.livingNightActive).toBe(true);
    expect(migrated.mirroredShadows).toBe(3);
    expect(migrated.darkness.active).toBe(true);
    expect(migrated.darkness.mode).toBe("manual");
  });

  it("preserves unknown root and nested fields", () => {
    const migrated = normalizePippingState({
      pulse: 2,
      customRoot: { keep: true },
      darkness: { mode: "random", customDarkness: "kept" },
      recovery: { customRecovery: 42 },
      daily: { customDaily: "kept" },
    });

    expect(migrated.customRoot).toEqual({ keep: true });
    expect(migrated.darkness.customDarkness).toBe("kept");
    expect(migrated.recovery.customRecovery).toBe(42);
    expect(migrated.daily.customDaily).toBe("kept");
  });

  it("accepts Tier V and rejects invalid expressions", () => {
    const migrated = normalizePippingState({
      tier: 5,
      expressionChoices: {
        "1": "destruction",
        "2": "invalid",
        "5": "chaos",
      },
    });

    expect(migrated.tier).toBe(5);
    expect(migrated.expressionChoices).toEqual({
      "1": "destruction",
      "5": "chaos",
    });
  });
});
