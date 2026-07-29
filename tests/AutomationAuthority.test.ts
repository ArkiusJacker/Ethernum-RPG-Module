import { describe, expect, it } from "vitest";
import { selectPrimaryGM } from "../scripts/core/AutomationAuthority.js";

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
});
