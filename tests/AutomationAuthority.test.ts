import { afterEach, describe, expect, it, vi } from "vitest";
import { AutomationAuthority, selectPrimaryGM } from "../scripts/core/AutomationAuthority.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("selectPrimaryGM", () => {
  it("selects the first active GM ordered by id", () => {
    const selected = selectPrimaryGM([
      { id: "gm-z", active: true, isGM: true },
      { id: "player", active: true, isGM: false },
      { id: "gm-a", active: true, isGM: true },
    ]);
    expect(selected?.id).toBe("gm-a");
  });

  it("ignores inactive GMs", () => {
    const selected = selectPrimaryGM([
      { id: "gm-a", active: false, isGM: true },
      { id: "gm-b", active: true, isGM: true },
    ]);
    expect(selected?.id).toBe("gm-b");
  });

  it("returns null when no active GM exists", () => {
    expect(selectPrimaryGM([{ id: "player", active: true, isGM: false }])).toBeNull();
  });

  it("uses deterministic code-point ordering without locale-dependent comparison", () => {
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(() => {
      throw new Error("locale comparison must not be used");
    });
    const selected = selectPrimaryGM([
      { id: "gm-2", active: true, isGM: true },
      { id: "gm-10", active: true, isGM: true },
    ]);

    expect(selected?.id).toBe("gm-10");
    expect(localeCompare).not.toHaveBeenCalled();
  });

  it("ignores GMs without a usable id", () => {
    const selected = selectPrimaryGM([
      { id: "", active: true, isGM: true },
      { id: null, active: true, isGM: true },
      { id: "gm-b", active: true, isGM: true },
    ]);
    expect(selected?.id).toBe("gm-b");
  });

  it("updates mutation authority when the deterministic primary GM changes", () => {
    const users = [
      { id: "gm-a", active: true, isGM: true },
      { id: "gm-b", active: true, isGM: true },
    ];
    vi.stubGlobal("game", { user: users[0], users });
    expect(AutomationAuthority.isPrimaryGM()).toBe(true);

    users[0].active = false;
    expect(AutomationAuthority.isPrimaryGM()).toBe(false);
    (game as Game).user = users[1] as User;
    expect(AutomationAuthority.isPrimaryGM()).toBe(true);
  });
});
