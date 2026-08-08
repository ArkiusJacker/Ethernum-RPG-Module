import { describe, expect, it } from "vitest";
import {
  CharacterSheetState,
  createCharacterSheetStateKey,
  type CharacterSheetStorage,
} from "../scripts/sheets/core/CharacterSheetState.js";

const SCOPE = { worldId: "world", userId: "user", actorId: "actor", sheetId: "ethernum" };

class MemoryStorage implements CharacterSheetStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe("CharacterSheetState", () => {
  it("scopes storage by world, user, actor and sheet", () => {
    const key = createCharacterSheetStateKey(SCOPE);
    expect(key).toContain(":world:user:actor:ethernum");
    expect(createCharacterSheetStateKey({ ...SCOPE, actorId: "another" })).not.toBe(key);
  });

  it("persists all supported view state fields", () => {
    const storage = new MemoryStorage();
    const state = new CharacterSheetState(SCOPE, storage);
    state.setActiveTab("combat");
    state.setCollapsed("defenses", true);
    state.setScroll("main", 240);
    state.setCompact(true);

    expect(new CharacterSheetState(SCOPE, storage).load()).toEqual({
      activeTab: "combat",
      collapsed: { defenses: true },
      scroll: { main: 240 },
      compact: true,
    });
  });

  it("normalizes corrupt or unsupported persisted values", () => {
    const storage = new MemoryStorage();
    const state = new CharacterSheetState({ ...SCOPE, actorId: "corrupt" }, storage);
    storage.setItem(state.key, JSON.stringify({
      activeTab: 4,
      collapsed: { valid: false, invalid: "yes" },
      scroll: { valid: 10, invalid: "10" },
      compact: "yes",
    }));

    expect(state.load()).toEqual({
      activeTab: "",
      collapsed: { valid: false },
      scroll: { valid: 10 },
      compact: false,
    });
  });

  it("falls back to shared memory when storage throws", () => {
    const blocked: CharacterSheetStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    const scope = { ...SCOPE, actorId: "memory-fallback" };
    new CharacterSheetState(scope, blocked).setActiveTab("inventory");
    expect(new CharacterSheetState(scope, blocked).load().activeTab).toBe("inventory");
  });
});
