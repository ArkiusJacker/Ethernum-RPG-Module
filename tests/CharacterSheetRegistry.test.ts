import { describe, expect, it } from "vitest";
import {
  CharacterSheetRegistry,
  normalizeCharacterSheetMode,
  resolveCharacterSheetMode,
} from "../scripts/sheets/core/CharacterSheetRegistry.js";

describe("CharacterSheetRegistry", () => {
  it.each([
    [" AUTO ", "auto"],
    ["Ethernum", "ethernum"],
    ["CONCORDIA", "concordia"],
    ["pf2e", "pf2e"],
    ["unknown", "auto"],
    [null, "auto"],
  ])("normalizes %p to %s", (input, expected) => {
    expect(normalizeCharacterSheetMode(input)).toBe(expected);
  });

  it("resolves override before the active campaign core", () => {
    expect(resolveCharacterSheetMode({ override: "pf2e", activeCore: "concordia" })).toBe("pf2e");
    expect(resolveCharacterSheetMode({ override: "ethernum", activeCore: "concordia" })).toBe("ethernum");
  });

  it("maps known cores and falls back to PF2e", () => {
    expect(resolveCharacterSheetMode({ override: "auto", activeCore: "ethernum-company" })).toBe("ethernum");
    expect(resolveCharacterSheetMode({ activeCore: "concordia" })).toBe("concordia");
    expect(resolveCharacterSheetMode({ activeCore: "future-core" })).toBe("pf2e");
  });

  it("registers and resolves concrete sheet values", () => {
    const registry = new CharacterSheetRegistry<string>()
      .register("ethernum", "EthernumSheet")
      .register("pf2e", "PF2eSheet");

    expect(registry.resolve({ activeCore: "ethernum-company" })).toEqual({
      mode: "ethernum",
      value: "EthernumSheet",
    });
    expect(registry.resolve({ activeCore: "concordia" })).toBeUndefined();
  });
});
