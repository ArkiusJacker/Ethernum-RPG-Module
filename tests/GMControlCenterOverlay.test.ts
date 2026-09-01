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
import {
  rectangleIntersectionArea,
  resolveNonOverlappingPosition,
} from "../scripts/ui/layout/NonOverlappingPlacement.js";

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

  it.each([
    [1280, 720],
    [1366, 768],
    [1600, 900],
    [1920, 1080],
  ])("finds a zero-intersection placement at %d×%d", (width, height) => {
    const obstacle = { left: 8, top: 40, width: 480, height: Math.min(600, height - 80) };
    const moving = { left: 220, top: 100, width: 560, height: Math.min(500, height - 100) };
    const result = resolveNonOverlappingPosition({
      movingRect: moving,
      obstacleRect: obstacle,
      viewport: { width, height },
      margin: 8,
      preferredOrder: ["right", "left", "above", "below"],
    });
    expect(result.intersectionArea).toBe(0);
    expect(result.compactRequired).toBe(false);
    expect(rectangleIntersectionArea(
      { ...moving, left: result.left, top: result.top },
      obstacle,
    )).toBe(0);
  });

  it("tries right, left, above, and below while preserving a valid user position", () => {
    const viewport = { width: 1366, height: 768 };
    const moving = { left: 300, top: 220, width: 460, height: 260 };
    const leftObstacle = { left: 8, top: 120, width: 480, height: 560 };
    expect(resolveNonOverlappingPosition({ movingRect: moving, obstacleRect: leftObstacle, viewport, margin: 8 }).strategy).toBe("right");

    const rightObstacle = { left: 878, top: 120, width: 480, height: 560 };
    expect(resolveNonOverlappingPosition({ movingRect: { ...moving, left: 700 }, obstacleRect: rightObstacle, viewport, margin: 8 }).strategy).toBe("left");

    const centeredObstacle = { left: 260, top: 300, width: 846, height: 300 };
    expect(resolveNonOverlappingPosition({ movingRect: { ...moving, left: 520, top: 320 }, obstacleRect: centeredObstacle, viewport, margin: 8 }).strategy).toBe("above");

    const valid = resolveNonOverlappingPosition({
      movingRect: { ...moving, left: 890, top: 8 },
      obstacleRect: leftObstacle,
      viewport,
      margin: 8,
    });
    expect(valid).toMatchObject({ strategy: "preserved", left: 890, top: 8, intersectionArea: 0 });
  });

  it("reports an explicit compact fallback when the viewport cannot fit both interfaces", () => {
    const result = resolveNonOverlappingPosition({
      movingRect: { left: 360, top: 40, width: 860, height: 650 },
      obstacleRect: { left: 8, top: 8, width: 520, height: 704 },
      viewport: { width: 1280, height: 720 },
      margin: 8,
    });
    expect(result.strategy).toBe("minimum-intersection");
    expect(result.compactRequired).toBe(true);
    expect(result.intersectionArea).toBeGreaterThan(0);
  });

  it.each([1.25, 1.5])("keeps a zero-intersection option at %d× browser zoom", zoom => {
    const width = Math.floor(1920 / zoom);
    const height = Math.floor(1080 / zoom);
    const moving = { left: 280, top: 120, width: 500, height: 360 };
    const obstacle = { left: 8, top: 60, width: 430, height: 600 };
    const result = resolveNonOverlappingPosition({ movingRect: moving, obstacleRect: obstacle, viewport: { width, height }, margin: 8 });
    expect(result.intersectionArea).toBe(0);
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
    expect(overlay).toContain("new MutationObserver");
    expect(overlay).toContain("observedCommunicator !== communicator");
    expect(overlay).toContain("this.observedCommunicator = null");
    expect(overlay).toContain("scheduleOverlapCheck");
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
