import { describe, expect, it, vi } from "vitest";
import {
  applyCharacterHitPointsPreview,
  buildCharacterHitPointsPreview,
} from "../scripts/sheets/core/CharacterHitPointsService.js";

describe("CharacterHitPointsService", () => {
  it.each([
    [38, 38, 1, "full"],
    [30, 38, 30 / 38, "stable"],
    [20, 38, 20 / 38, "stable"],
    [9, 38, 9 / 38, "critical"],
    [0, 38, 0, "defeated"],
  ] as const)("normalizes %s/%s into the expected visual state", (value, max, ratio, status) => {
    expect(buildCharacterHitPointsPreview(value, max)).toEqual({ value, max, ratio, status });
  });

  it("clamps optimistic values before they are sent to PF2e", () => {
    expect(buildCharacterHitPointsPreview(99, 38).value).toBe(38);
    expect(buildCharacterHitPointsPreview(-5, 38).value).toBe(0);
  });

  it("updates the independent HP track immediately", () => {
    const setProperty = vi.fn();
    const setAttribute = vi.fn();
    const monitor = {
      dataset: {},
      querySelector: vi.fn().mockReturnValue({
        setAttribute,
        querySelector: vi.fn().mockReturnValue({ style: { setProperty } }),
      }),
    };
    const root = { querySelector: vi.fn().mockReturnValue(monitor) } as unknown as HTMLElement;

    expect(applyCharacterHitPointsPreview(root, 10, 40)).toMatchObject({ ratio: 0.25, status: "critical" });
    expect(setProperty).toHaveBeenCalledWith("--ecs-hp-ratio", "0.25");
    expect(setAttribute).toHaveBeenCalledWith("aria-valuenow", "10");
    expect(monitor.dataset).toEqual({ hpStatus: "critical" });
  });
});
