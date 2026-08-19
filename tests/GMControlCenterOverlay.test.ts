import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clampGMControlPosition,
  clampGMControlSize,
  gmControlOverlayStorageKey,
  resolveGMControlLauncherState,
  shouldMountGMControlCenter,
} from "../scripts/ui/GMControlCenterOverlay.js";

const root = resolve(import.meta.dirname, "..");

describe("standalone GM Control Center layout", () => {
  it("is available only to GMs", () => {
    expect(shouldMountGMControlCenter(true)).toBe(true);
    expect(shouldMountGMControlCenter(false)).toBe(false);
  });

  it("isolates persisted layout by world and user", () => {
    expect(gmControlOverlayStorageKey("world-a", "gm-a")).not.toBe(
      gmControlOverlayStorageKey("world-a", "gm-b"),
    );
    expect(gmControlOverlayStorageKey("world-a", "gm-a")).not.toBe(
      gmControlOverlayStorageKey("world-b", "gm-a"),
    );
  });

  it("enforces resize limits and keeps the panel inside the viewport", () => {
    expect(clampGMControlSize(100, 100, { width: 1920, height: 1080 })).toEqual({
      width: 460,
      height: 380,
    });
    expect(clampGMControlSize(4000, 4000, { width: 1000, height: 800 })).toEqual({
      width: 900,
      height: 720,
    });
    expect(clampGMControlPosition(9999, -100, { width: 460, height: 380 }, { width: 1000, height: 800 }))
      .toEqual({ left: 532, top: 8 });
  });

  it("derives compact launcher status without relying on color alone", () => {
    expect(resolveGMControlLauncherState(0, { primaryGMId: "gm", lastError: null })).toBe("normal");
    expect(resolveGMControlLauncherState(2, { primaryGMId: "gm", lastError: null })).toBe("pending");
    expect(resolveGMControlLauncherState(0, { primaryGMId: null, lastError: null })).toBe("warning");
    expect(resolveGMControlLauncherState(0, { primaryGMId: "gm", lastError: "socket" })).toBe("error");
  });
});

describe("standalone GM Control Center integration", () => {
  const overlay = readFileSync(resolve(root, "scripts/ui/GMControlCenterOverlay.ts"), "utf8");
  const sheets = readFileSync(resolve(root, "scripts/ui/EtherTabManager.ts"), "utf8");
  const combatTracker = readFileSync(resolve(root, "scripts/ui/CombatMomentumTracker.ts"), "utf8");
  const main = readFileSync(resolve(root, "scripts/main.ts"), "utf8");
  const styles = readFileSync(resolve(root, "styles/ethernum-gm-control.css"), "utf8");

  it("removes the global control center from character sheets", () => {
    expect(sheets).not.toContain("ethernum-gm-control-host");
    expect(sheets).not.toContain('data-tab="ethernum-gm-control"');
  });

  it("exposes the launcher, pointer drag, resize, persistence, and cleanup", () => {
    expect(overlay).toContain("document.body.appendChild(root)");
    expect(overlay).toContain('root.addEventListener("click", event =>');
    expect(overlay).toContain('closest<HTMLElement>("[data-gm-overlay-action]")');
    expect(overlay).toContain("pointerdown");
    expect(overlay).toContain("[data-gm-overlay-resize]");
    expect(overlay).toContain("button, input, select, textarea, a, summary, [data-no-drag]");
    expect(overlay).toContain("localStorage");
    expect(overlay).toContain("const DEFAULT_RIGHT = 84");
    expect(overlay).toContain("this.lifecycle.abort()");
    expect(styles).toContain(".ethernum-gm-control-launcher");
    expect(overlay).toContain("avoidFieldCommunicatorOverlap()");
    expect(overlay).toContain('document.getElementById("ethernum-field-communicator-overlay")');
    expect(styles).toContain(".state-error");
  });

  it("provides the public API and a GM tracker launcher", () => {
    for (const name of [
      "openGMControlCenter",
      "closeGMControlCenter",
      "toggleGMControlCenter",
      "minimizeGMControlCenter",
      "restoreGMControlCenterPosition",
    ]) expect(main).toContain(name);
    expect(combatTracker).toContain('data-global-action="gm-control"');
    expect(combatTracker).toContain("openGMControlCenter");
  });
});
