import { afterEach, describe, expect, it, vi } from "vitest";
import { rollSave } from "../scripts/core/PF2eAdapter.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PF2eAdapter rollSave", () => {
  it("uses the actor PF2e save API and preserves roll context", async () => {
    const nativeRoll = vi.fn().mockResolvedValue({
      total: 34,
      degreeOfSuccess: 3,
      dice: [{
        faces: 20,
        results: [{ result: 18, active: true }],
      }],
    });
    const actor = {
      saves: {
        will: {
          check: {
            mod: 16,
            roll: nativeRoll,
          },
        },
      },
      system: {},
    } as unknown as Actor;
    const origin = { id: "pipping" } as unknown as Actor;
    const modifiers = [{ slug: "living-night", modifier: -1 }];

    const result = await rollSave({
      actor,
      save: "will",
      dc: 24,
      traits: ["mental", "occult"],
      origin,
      options: {
        rollOptions: ["action:shadow-king"],
        extraRollOptions: ["ethernum:pipping"],
        modifiers,
        skipDialog: true,
      },
    });

    expect(nativeRoll).toHaveBeenCalledOnce();
    expect(nativeRoll).toHaveBeenCalledWith({
      modifiers,
      skipDialog: true,
      extraRollOptions: ["action:shadow-king", "ethernum:pipping"],
      dc: { value: 24 },
      traits: ["mental", "occult"],
      origin,
    });
    expect(result).toEqual({
      degree: "criticalSuccess",
      natural: 18,
      total: 34,
      fallback: false,
      source: "pf2e-api",
    });
  });

  it("marks and resolves the simplified manual fallback when the API is unavailable", async () => {
    const rollConstructor = vi.fn();
    class TestRoll {
      total = 22;
      dice = [{
        faces: 20,
        results: [{ result: 12, active: true }],
      }];

      constructor(formula: string, data: Record<string, unknown>) {
        rollConstructor(formula, data);
      }

      async evaluate(): Promise<this> {
        return this;
      }
    }
    vi.stubGlobal("Roll", TestRoll);
    const actor = {
      system: {
        saves: {
          fortitude: {
            mod: 8,
          },
        },
      },
    } as unknown as Actor;

    const result = await rollSave({
      actor,
      save: "fortitude",
      dc: 22,
      options: {
        rollOptions: ["damaging-effect"],
        modifiers: [{ modifier: 2, enabled: true }],
      },
    });

    expect(rollConstructor).toHaveBeenCalledWith(
      "1d20 + @modifier",
      { modifier: 10 },
    );
    expect(result).toEqual({
      degree: "success",
      natural: 12,
      total: 22,
      fallback: true,
      source: "manual-fallback",
    });
  });
});
