import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHARACTER_SHEET_CACHE_TTL_MS,
  CharacterSheetCache,
} from "../scripts/sheets/core/CharacterSheetCache.js";
import {
  initializeCharacterSheetLifecycle,
  resolveActorUpdateDirtyPaths,
  resolveItemDirtyPaths,
} from "../scripts/sheets/core/CharacterSheetLifecycle.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CharacterSheetCache safety", () => {
  beforeEach(() => {
    CharacterSheetCache.clear();
    vi.useRealTimers();
  });

  it("keeps a short default TTL and refreshes expired values", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    let builds = 0;
    const build = () => ++builds;

    expect(CHARACTER_SHEET_CACHE_TTL_MS).toBeLessThanOrEqual(500);
    expect(CharacterSheetCache.getOrCreate("actor", "vitals", build)).toBe(1);
    vi.advanceTimersByTime(CHARACTER_SHEET_CACHE_TTL_MS - 1);
    expect(CharacterSheetCache.getOrCreate("actor", "vitals", build)).toBe(1);
    vi.advanceTimersByTime(1);
    expect(CharacterSheetCache.getOrCreate("actor", "vitals", build)).toBe(2);
  });

  it("clears a rebuilt dirty region without disturbing another cached region", () => {
    CharacterSheetCache.getOrCreate("actor", "vitals", () => "old-vitals");
    CharacterSheetCache.getOrCreate("actor", "overview", () => "old-overview");

    CharacterSheetCache.invalidate("actor", "vitals");
    expect(CharacterSheetCache.getDirtyPaths("actor")).toEqual(["vitals"]);
    expect(CharacterSheetCache.getOrCreate("actor", "vitals", () => "new-vitals")).toBe("new-vitals");
    expect(CharacterSheetCache.getOrCreate("actor", "overview", () => "new-overview")).toBe("old-overview");
    expect(CharacterSheetCache.getDirtyPaths("actor")).toEqual([]);
  });

  it("does not leave invalidate all permanently dirty", () => {
    CharacterSheetCache.getOrCreate("actor", "vitals", () => "old-vitals");
    CharacterSheetCache.getOrCreate("actor", "overview", () => "old-overview");

    CharacterSheetCache.invalidate("actor", "all");
    expect(CharacterSheetCache.getDirtyPaths("actor")).toEqual(["all"]);
    expect(CharacterSheetCache.getOrCreate("actor", "vitals", () => "new-vitals")).toBe("new-vitals");
    expect(CharacterSheetCache.getDirtyPaths("actor")).toEqual([]);
    expect(CharacterSheetCache.getOrCreate("actor", "vitals", () => "unexpected")).toBe("new-vitals");
    expect(CharacterSheetCache.getOrCreate("actor", "overview", () => "new-overview")).toBe("new-overview");
  });
});

describe("character sheet lifecycle dependency maps", () => {
  it.each([
    ["HP", { system: { attributes: { hp: { value: 12 } } } }, ["vitals", "overview"]],
    ["hero points", { "system.resources.heroPoints.value": 2 }, ["vitals", "overview", "combat"]],
    ["unique mechanic", { flags: { "ethernum-rpg-module": { uniqueMechanics: { activeProfile: "pipping-night" } } } }, ["unique"]],
    ["Ether pool", { "flags.ethernum-rpg-module.etherSystem.etherCurrent": 3 }, ["ethernum"]],
    ["Ether attributes", { "flags.ethernum-rpg-module.etherAttributes.inteligencia.value": 4 }, ["ethernum"]],
    ["Ether talents", { "flags.ethernum-rpg-module.talents.alquimia.value": 2 }, ["ethernum"]],
    ["FE", { "flags.ethernum-rpg-module.fe.current": 1 }, ["ethernum"]],
    ["runes", { "flags.ethernum-rpg-module.runes": [] }, ["ethernum"]],
  ])("invalidates Actor regions for %s", (_label, changed, expected) => {
    expect(resolveActorUpdateDirtyPaths(changed)).toEqual(expected);
  });

  it.each([
    ["condition", ["effects", "vitals", "overview", "combat"]],
    ["feat", ["feats", "combat"]],
    ["weapon", ["inventory", "combat"]],
    ["armor", ["inventory", "vitals", "overview", "combat"]],
    ["spell", ["spellcasting"]],
    ["spellcastingEntry", ["spellcasting"]],
    ["class", ["identity", "overview"]],
    ["ancestry", ["identity", "overview"]],
  ])("invalidates Item regions for %s", (type, expected) => {
    expect(resolveItemDirtyPaths({ type } as Pick<Item, "type">)).toEqual(expected);
  });

  it("invalidates all regions for unknown Actor paths and Item types", () => {
    expect(resolveActorUpdateDirtyPaths({ system: { futurePF2eField: 1 } })).toEqual(["all"]);
    expect(resolveItemDirtyPaths({ type: "future-item" } as Pick<Item, "type">)).toEqual(["all"]);
  });

  it("routes Actor and embedded Item hooks through the dependency maps", () => {
    class MockActor {
      constructor(public id: string) {}
    }
    const callbacks = new Map<string, (...args: unknown[]) => void>();
    vi.stubGlobal("Actor", MockActor);
    vi.stubGlobal("Hooks", {
      on: vi.fn((hook: string, callback: (...args: unknown[]) => void) => callbacks.set(hook, callback)),
    });
    const invalidate = vi.spyOn(CharacterSheetCache, "invalidate");
    initializeCharacterSheetLifecycle();

    const actor = new MockActor("actor-1");
    callbacks.get("updateActor")?.(actor, { "system.attributes.hp.value": 8 });
    expect(invalidate).toHaveBeenLastCalledWith("actor-1", "vitals", "overview");

    for (const hook of ["createItem", "updateItem", "deleteItem"]) {
      callbacks.get(hook)?.({ type: "condition", parent: actor });
      expect(invalidate).toHaveBeenLastCalledWith("actor-1", "effects", "vitals", "overview", "combat");
    }
  });
});
