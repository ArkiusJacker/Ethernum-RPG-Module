import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PF2E_BRIDGE_TELEMETRY_LIMIT,
  PF2eBridgeTelemetryBuffer,
  recordPF2eBridgeResultTelemetry,
  sanitizePF2eTelemetryMessage,
} from "../scripts/sheets/core/PF2eBridgeTelemetry.js";

describe("PF2eBridgeTelemetryBuffer", () => {
  it("keeps only the latest 50 local operations", () => {
    let timestamp = 1_000;
    const telemetry = new PF2eBridgeTelemetryBuffer(PF2E_BRIDGE_TELEMETRY_LIMIT, () => timestamp++);

    for (let index = 0; index < 55; index += 1) {
      telemetry.record({
        actorId: "actor-one",
        operation: `operation-${index}`,
        capability: "resources",
        source: "pf2e-prepared",
        status: "success",
      });
    }

    const entries = telemetry.list();
    expect(entries).toHaveLength(50);
    expect(entries[0]?.operation).toBe("operation-5");
    expect(entries.at(-1)?.operation).toBe("operation-54");
  });

  it("filters by actor and returns defensive copies", () => {
    const telemetry = new PF2eBridgeTelemetryBuffer();
    telemetry.record({
      actorId: "actor-one",
      operation: "carry-type",
      capability: "carryType",
      source: "pf2e-prepared",
      status: "success",
    });
    telemetry.record({
      actorId: "actor-two",
      operation: "cast-spell",
      capability: "spellCast",
      source: "pf2e-prepared",
      status: "fallback",
    });

    const entries = telemetry.list({ actorId: "actor-one" });
    expect(entries).toHaveLength(1);
    entries[0]!.operation = "mutated";
    expect(telemetry.list({ actorId: "actor-one" })[0]?.operation).toBe("carry-type");

    telemetry.clear("actor-one");
    expect(telemetry.list()).toHaveLength(1);
    expect(telemetry.list()[0]?.actorId).toBe("actor-two");
  });

  it("sanitizes technical messages and never stores arbitrary objects", () => {
    expect(sanitizePF2eTelemetryMessage(
      "token=abc123; biography: private campaign text | C:\\Users\\Titan\\secret.txt",
    )).toBe("token=[redacted]; biography=[redacted]| [local-path]");
    expect(sanitizePF2eTelemetryMessage({ chat: "secret" })).toBeUndefined();

    const telemetry = new PF2eBridgeTelemetryBuffer();
    const entry = telemetry.record({
      actorId: "actor-one",
      operation: "build",
      capability: "adapter",
      source: "adapter",
      status: "failed",
      durationMs: -4,
      message: "password=hunter2; failed",
    });
    expect(entry).toMatchObject({ durationMs: 0, message: "password=[redacted]; failed" });
    expect(entry).not.toHaveProperty("actor");
    expect(entry).not.toHaveProperty("error");
  });

  it("measures success, fallback, and failure without swallowing errors", async () => {
    let time = 10;
    const telemetry = new PF2eBridgeTelemetryBuffer(50, () => {
      time += 5;
      return time;
    });

    await expect(telemetry.measure({
      actorId: "actor-one",
      operation: "cast-spell",
      capability: "spellCast",
      source: "pf2e-prepared",
    }, async () => "cast")).resolves.toBe("cast");

    await expect(telemetry.measure({
      actorId: "actor-one",
      operation: "open-pf2e",
      capability: "craftingPreparedData",
      source: "pf2e-sheet",
      successStatus: "fallback",
      fallbackMessage: "Prepared API unavailable",
    }, () => true)).resolves.toBe(true);

    const failure = new TypeError("private actor payload");
    await expect(telemetry.measure({
      actorId: "actor-one",
      operation: "prepare-spell",
      capability: "spellPreparation",
      source: "pf2e-prepared",
    }, () => Promise.reject(failure))).rejects.toBe(failure);

    expect(telemetry.list().map(entry => entry.status)).toEqual(["success", "fallback", "failed"]);
    expect(telemetry.list().at(-1)?.message).toBe("TypeError");
    expect(telemetry.list().every(entry => entry.durationMs === 5)).toBe(true);
  });

  it("validates custom buffer capacities", () => {
    expect(() => new PF2eBridgeTelemetryBuffer(0)).toThrow(/positive integer/);
    expect(() => new PF2eBridgeTelemetryBuffer(1.5)).toThrow(/positive integer/);
  });

  it("has no world, settings, socket, or browser-storage persistence path", () => {
    const source = readFileSync(join(
      process.cwd(),
      "scripts",
      "sheets",
      "core",
      "PF2eBridgeTelemetry.ts",
    ), "utf8");
    expect(source).not.toMatch(/setFlag|game\.settings|localStorage|sessionStorage|socket\.(?:emit|on)/);
    expect(source).not.toMatch(/chatContent|biographyContent|rawActor|actorDump/);
  });

  it("maps result-style bridge outcomes without retaining result payloads", () => {
    const telemetry = new PF2eBridgeTelemetryBuffer();
    recordPF2eBridgeResultTelemetry({
      actorId: "actor-one",
      operation: "cast-spell",
      capability: "spellCast",
      durationMs: 3,
    }, { ok: true, source: "pf2e-prepared" }, telemetry);
    recordPF2eBridgeResultTelemetry({
      actorId: "actor-one",
      operation: "prepare-spell",
      capability: "spellPreparation",
    }, { ok: false, capability: "spellPreparation", reason: "unsupported", fallback: "open-pf2e-sheet" }, telemetry);
    recordPF2eBridgeResultTelemetry({
      actorId: "actor-one",
      operation: "carry-type",
      capability: "carryType",
    }, { ok: false, reason: "operation-failed" }, telemetry);

    expect(telemetry.list()).toEqual([
      expect.objectContaining({ status: "success", source: "pf2e-prepared" }),
      expect.objectContaining({ status: "fallback", source: "pf2e-sheet", message: "unsupported" }),
      expect.objectContaining({ status: "failed", source: "adapter", message: "operation-failed" }),
    ]);
    expect(telemetry.list().some(entry => "fallback" in entry)).toBe(false);
  });
});
