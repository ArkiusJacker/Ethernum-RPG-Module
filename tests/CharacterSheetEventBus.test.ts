import { describe, expect, it, vi } from "vitest";
import { CharacterSheetEventBus } from "../scripts/sheets/core/CharacterSheetEventBus.js";

interface SheetEvents {
  tabChanged: { tab: string };
  refreshed: number;
}

describe("CharacterSheetEventBus", () => {
  it("emits typed payloads and supports unsubscribe", () => {
    const bus = new CharacterSheetEventBus<SheetEvents>();
    const listener = vi.fn();
    const unsubscribe = bus.on("tabChanged", listener);

    bus.emit("tabChanged", { tab: "combat" });
    unsubscribe();
    bus.emit("tabChanged", { tab: "inventory" });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ tab: "combat" });
    expect(bus.listenerCount("tabChanged")).toBe(0);
  });

  it("supports once and clearing listeners", () => {
    const bus = new CharacterSheetEventBus<SheetEvents>();
    const once = vi.fn();
    const persistent = vi.fn();
    bus.once("refreshed", once);
    bus.on("refreshed", persistent);

    bus.emit("refreshed", 1);
    bus.emit("refreshed", 2);
    expect(once).toHaveBeenCalledOnce();
    expect(persistent).toHaveBeenCalledTimes(2);

    bus.clear("refreshed");
    expect(bus.listenerCount("refreshed")).toBe(0);
  });
});
