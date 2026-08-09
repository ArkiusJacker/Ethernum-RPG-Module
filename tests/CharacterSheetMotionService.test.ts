import { describe, expect, it, vi } from "vitest";
import {
  CHARACTER_SHEET_MOTION_MODES,
  CharacterSheetMotionService,
  normalizeCharacterSheetMotionMode,
  resolveCharacterSheetMotion,
} from "../scripts/sheets/core/CharacterSheetMotionService.js";

describe("CharacterSheetMotionService", () => {
  it("exposes the supported modes as a stable public contract", () => {
    expect(CHARACTER_SHEET_MOTION_MODES).toEqual(["full", "reduced", "off"]);
  });

  it.each([
    ["full", "full"],
    [" reduced ", "reduced"],
    ["OFF", "off"],
    ["unknown", "full"],
    [null, "full"],
  ])("normalizes %j to %s", (input, expected) => {
    expect(normalizeCharacterSheetMotionMode(input)).toBe(expected);
  });

  it("uses the supplied fallback for an invalid persisted value", () => {
    expect(normalizeCharacterSheetMotionMode("legacy-value", "reduced")).toBe("reduced");
  });

  it.each([
    ["full", false, "full", false],
    ["full", true, "reduced", true],
    ["reduced", false, "reduced", false],
    ["reduced", true, "reduced", false],
    ["off", false, "off", false],
    ["off", true, "off", false],
  ] as const)(
    "resolves preference %s with system reduction %s to %s",
    (preference, systemReduced, expected, systemPreferenceApplied) => {
      expect(resolveCharacterSheetMotion(preference, systemReduced)).toEqual({
        requested: preference,
        resolved: expected,
        systemPrefersReducedMotion: systemReduced,
        systemPreferenceApplied,
      });
    },
  );

  it("reads module and system preferences lazily without browser globals", () => {
    let preference: unknown = "full";
    let systemReduced = false;
    const service = new CharacterSheetMotionService({
      readPreference: () => preference,
      readSystemPrefersReducedMotion: () => systemReduced,
    });

    expect(service.mode).toBe("full");
    preference = "reduced";
    expect(service.mode).toBe("reduced");
    preference = "full";
    systemReduced = true;
    expect(service.mode).toBe("reduced");
  });

  it("allows an explicit value to override the persisted module preference", () => {
    const readPreference = vi.fn(() => "full");
    const service = new CharacterSheetMotionService({ readPreference });

    expect(service.resolve("off").resolved).toBe("off");
    expect(readPreference).not.toHaveBeenCalled();
  });

  it("falls back safely when preference readers fail", () => {
    const service = new CharacterSheetMotionService({
      defaultMode: "reduced",
      readPreference: () => {
        throw new Error("settings unavailable");
      },
      readSystemPrefersReducedMotion: () => {
        throw new Error("matchMedia unavailable");
      },
    });

    expect(service.resolve()).toEqual({
      requested: "reduced",
      resolved: "reduced",
      systemPrefersReducedMotion: false,
      systemPreferenceApplied: false,
    });
  });

  it("uses a safe default when no readers are configured", () => {
    expect(new CharacterSheetMotionService().mode).toBe("full");
  });
});
