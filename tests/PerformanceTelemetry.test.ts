import { beforeEach, describe, expect, it } from "vitest";
import { PerformanceTelemetry } from "../scripts/core/PerformanceTelemetry.js";

describe("PerformanceTelemetry", () => {
  beforeEach(() => PerformanceTelemetry.reset());

  it("aggregates bounded timing samples without logging production noise", () => {
    PerformanceTelemetry.record("sheet", 12);
    PerformanceTelemetry.record("sheet", 18);

    expect(PerformanceTelemetry.snapshot()).toEqual([expect.objectContaining({
      id: "sheet",
      count: 2,
      totalMs: 30,
      averageMs: 15,
      minimumMs: 12,
      maximumMs: 18,
      lastMs: 18,
    })]);
  });

  it("records asynchronous operations even when they fail", async () => {
    await expect(PerformanceTelemetry.measure("failure", async () => {
      throw new Error("expected");
    })).rejects.toThrow("expected");

    expect(PerformanceTelemetry.snapshot()[0]).toMatchObject({ id: "failure", count: 1 });
  });

  it("stops a measurement only once", () => {
    const stop = PerformanceTelemetry.start("once");
    stop();
    stop();
    expect(PerformanceTelemetry.snapshot()[0]).toMatchObject({ id: "once", count: 1 });
  });
});
