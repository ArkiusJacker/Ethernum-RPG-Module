import { describe, expect, it, vi } from "vitest";
import { CharacterSheetModuleRegistry } from "../scripts/sheets/core/CharacterSheetModuleRegistry.js";

describe("CharacterSheetModuleRegistry", () => {
  it("builds only visible modules in stable order", async () => {
    const calls: string[] = [];
    const registry = new CharacterSheetModuleRegistry<{ allowed: boolean }, string>();
    registry
      .register({ id: "late", order: 20, build: () => { calls.push("late"); return "L"; } })
      .register({ id: "first", order: 10, build: () => { calls.push("first"); return "F"; } })
      .register({ id: "same-order", order: 10, build: () => { calls.push("same-order"); return "S"; } })
      .register({ id: "hidden", order: 5, isVisible: context => context.allowed, build: () => "H" });

    const report = await registry.buildVisible({ allowed: false });
    expect(calls).toEqual(["first", "same-order", "late"]);
    expect(report.modules.map(module => module.id)).toEqual(["first", "same-order", "late"]);
    expect(report.metrics.find(metric => metric.id === "hidden")?.status).toBe("hidden");
  });

  it("isolates visibility and build failures while recording metrics", async () => {
    const healthyBuild = vi.fn(() => "ready");
    let tick = 0;
    const registry = new CharacterSheetModuleRegistry<Record<string, never>, string>(() => tick++);
    registry
      .register({ id: "visibility-error", isVisible: () => { throw new Error("visibility"); }, build: () => "no" })
      .register({ id: "build-error", build: () => { throw new Error("build"); } })
      .register({ id: "healthy", build: healthyBuild });

    const report = await registry.build({});
    expect(report.modules).toEqual([{ id: "healthy", order: 0, output: "ready" }]);
    expect(healthyBuild).toHaveBeenCalledOnce();
    expect(report.metrics.map(metric => [metric.id, metric.status, metric.phase])).toEqual([
      ["visibility-error", "failed", "visibility"],
      ["build-error", "failed", "build"],
      ["healthy", "built", "build"],
    ]);
    expect(report.metrics.every(metric => metric.durationMs >= 0)).toBe(true);
  });

  it("rejects duplicate module ids", () => {
    const registry = new CharacterSheetModuleRegistry<object>();
    registry.register({ id: "overview", build: () => ({}) });
    expect(() => registry.register({ id: "overview", build: () => ({}) })).toThrow(/already registered/);
  });
});
