import { describe, expect, it, vi } from "vitest";
import { createGMControlCommandDispatcher } from "../scripts/ui/gm-control/GMControlCommandDispatcher.js";

describe("GMControlCommandDispatcher", () => {
  it("routes to the first controller that accepts the command", async () => {
    const first = vi.fn(async () => false);
    const second = vi.fn(async () => true);
    const third = vi.fn(async () => true);
    const dispatch = createGMControlCommandDispatcher([first, second, third]);

    await expect(dispatch("store-edit", { id: "entry" })).resolves.toBe(true);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(third).not.toHaveBeenCalled();
  });

  it("rejects unknown commands instead of silently ignoring them", async () => {
    const dispatch = createGMControlCommandDispatcher([async () => false]);
    await expect(dispatch("unknown", {})).rejects.toThrow("Ação administrativa não reconhecida");
  });
});
