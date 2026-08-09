import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  copyCharacterSheetDiagnostics,
  CHARACTER_SHEET_DIAGNOSTICS_STYLESHEET,
  CHARACTER_SHEET_DIAGNOSTICS_TEMPLATE,
  createCharacterSheetDiagnostics,
  createCharacterSheetDiagnosticsFromController,
  logCharacterSheetTechnicalError,
  presentCharacterSheetError,
  serializeCharacterSheetDiagnostics,
} from "../scripts/sheets/core/CharacterSheetDiagnosticsService.js";
import type { CharacterSheetDiagnosticsInput } from "../scripts/sheets/core/CharacterSheetDiagnosticsService.js";

function input(overrides: Partial<CharacterSheetDiagnosticsInput> = {}): CharacterSheetDiagnosticsInput {
  return {
    isGM: true,
    actorId: "actor-pipping",
    actorName: "Pipping Black",
    shell: "ethernum",
    configuredMode: "auto",
    activeCore: "ethernum-company",
    uniqueProfile: "pipping-baldwin-black",
    foundryVersion: "13.351",
    pf2eVersion: "7.8.0",
    ethernumVersion: "3.7.3",
    capabilities: {
      carryType: true,
      resources: true,
      conditions: true,
      spellCollections: true,
      spellCast: true,
      spellPreparation: false,
      dragDrop: true,
      richText: true,
      craftingPreparedData: false,
    },
    capabilityStatus: { spellPreparation: "fallback", craftingPreparedData: "fallback" },
    moduleMetrics: [
      { id: "header", order: 10, status: "built", phase: "build", durationMs: 2 },
      { id: "overview", order: 20, status: "built", phase: "build", durationMs: 4 },
      {
        id: "spellcasting",
        order: 50,
        status: "failed",
        phase: "build",
        durationMs: 8,
        error: new TypeError("token=private; C:\\Users\\Titan\\actor.json"),
      },
      { id: "ethernum-systems", order: 90, status: "built", phase: "build", durationMs: 3 },
    ],
    moduleStatus: { spellcasting: "partial" },
    telemetry: [{
      timestamp: Date.UTC(2026, 7, 9, 10, 42, 31),
      actorId: "actor-pipping",
      operation: "Cast Spell",
      capability: "spellCast",
      source: "pf2e-prepared",
      status: "success",
      durationMs: 12,
    }, {
      timestamp: Date.UTC(2026, 7, 9, 10, 43, 8),
      actorId: "other-actor",
      operation: "Carry Type",
      capability: "carryType",
      source: "pf2e-prepared",
      status: "success",
    }],
    renderTimeMs: 19,
    dirtyPaths: ["inventory", "effects"],
    ...overrides,
  };
}

describe("CharacterSheetDiagnosticsService", () => {
  it("does not produce technical diagnostics for players", () => {
    expect(createCharacterSheetDiagnostics(input({ isGM: false }))).toBeNull();
  });

  it("composes GM status, capability, module, operation and performance data", () => {
    const snapshot = createCharacterSheetDiagnostics(input());
    expect(snapshot).not.toBeNull();
    expect(snapshot?.access).toBe("gm");
    expect(snapshot?.status).toBe("partial");
    expect(snapshot?.capabilities.find(entry => entry.id === "carryType")?.status).toBe("supported");
    expect(snapshot?.capabilities.find(entry => entry.id === "spellPreparation")?.status).toBe("fallback");
    expect(snapshot?.modules.find(entry => entry.id === "identity")?.status).toBe("ok");
    expect(snapshot?.modules.find(entry => entry.id === "spellcasting")).toMatchObject({
      status: "partial",
      durationMs: 8,
      technical: { errorType: "TypeError", module: "spellcasting" },
    });
    expect(snapshot?.modules.find(entry => entry.id === "combat")?.status).toBe("not-applicable");
    expect(snapshot?.operations).toHaveLength(1);
    expect(snapshot?.operations[0]).toMatchObject({ operation: "Cast Spell", sourceLabel: "PF2e Prepared" });
    expect(snapshot?.performance).toMatchObject({
      lastRenderMs: 19,
      slowestModule: { id: "spellcasting", durationMs: 8 },
      dirtyPaths: ["inventory", "effects"],
    });
  });

  it("adapts the existing controller diagnostic contract in one call", () => {
    const snapshot = createCharacterSheetDiagnosticsFromController({
      isGM: true,
      ethernumVersion: "3.7.3",
      diagnostics: {
        actorId: "actor-arkius",
        actorName: "Arkius Jacker",
        configuredMode: "auto",
        resolvedSheet: "concordia",
        activeCore: "concordia",
        adapterStatus: "partial",
        profile: "arkius-jacker",
        foundryVersion: "13.351",
        pf2eVersion: "7.8.0",
        capabilities: { carryType: true, resources: true },
        moduleMetrics: [{
          id: "inventory",
          order: 40,
          status: "failed",
          phase: "build",
          durationMs: 6,
          error: new Error("inventory adapter failed"),
        }],
        dirtyPaths: ["inventory"],
        renderTimeMs: 11,
      },
    });

    expect(snapshot).toMatchObject({
      status: "failed",
      sheet: { shell: "concordia", configuredMode: "auto", activeCore: "concordia" },
      versions: { ethernum: "3.7.3" },
    });
    expect(snapshot?.modules.find(module => module.id === "inventory")?.status).toBe("failed");
  });

  it("serializes a compact report and copies it when a clipboard is available", async () => {
    const snapshot = createCharacterSheetDiagnostics(input())!;
    const report = serializeCharacterSheetDiagnostics(snapshot);
    expect(report).toContain("Ethernum Character Sheet Diagnostic");
    expect(report).toContain("Spell Preparation: FALLBACK");
    expect(report).toContain("Cast Spell | PF2e Prepared | SUCCESS 12ms");
    expect(report).not.toContain("private");
    expect(report).not.toContain("actor.json");

    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(copyCharacterSheetDiagnostics(snapshot, { writeText })).resolves.toEqual({
      copied: true,
      text: report,
    });
    expect(writeText).toHaveBeenCalledWith(report);
    await expect(copyCharacterSheetDiagnostics(snapshot, undefined)).resolves.toEqual({
      copied: false,
      text: report,
    });
  });

  it("separates player-safe errors from GM technical details", () => {
    const error = new TypeError("token=abc; C:\\Users\\Titan\\world.json");
    const player = presentCharacterSheetError(error, {
      isGM: false,
      module: "spellcasting",
      moduleLabel: "Magic",
    });
    expect(player).toEqual({
      title: "Could not load Magic.",
      message: "Open the PF2e sheet to continue this operation.",
      action: { id: "open-pf2e-sheet", label: "Open PF2e Sheet" },
      technical: null,
    });

    const gm = presentCharacterSheetError(error, {
      isGM: true,
      module: "spellcasting",
      capability: "spellPreparation",
      pf2eVersion: "7.8.0",
      foundryVersion: "13.351",
    });
    expect(gm.technical).toMatchObject({
      errorType: "TypeError",
      module: "spellcasting",
      capability: "spellPreparation",
    });
    expect(gm.technical?.message).toContain("token=[redacted]");
    expect(gm.technical?.message).not.toContain("world.json");
  });

  it("keeps complete errors confined to an explicit console logger", () => {
    const logger = { error: vi.fn() };
    const error = new Error("complete stack remains on the error object");
    logCharacterSheetTechnicalError(error, {
      module: "inventory",
      capability: "carryType",
      pf2eVersion: "7.8.0",
      foundryVersion: "13.351",
    }, logger);
    expect(logger.error).toHaveBeenCalledWith(
      "Ethernum character sheet operation failed",
      expect.objectContaining({ module: "inventory", capability: "carryType" }),
      error,
    );
  });

  it("ships an isolated GM diagnostics template and scoped responsive CSS", () => {
    const template = readFileSync(join(process.cwd(), "templates", "sheets", "character-sheet-diagnostics.html"), "utf8");
    const css = readFileSync(join(process.cwd(), "styles", "sheets", "character-sheet-diagnostics.css"), "utf8");
    expect(template).toContain('data-access="{{access}}"');
    expect(template).toContain('data-action="copy-sheet-diagnostics"');
    expect(template).toContain("ETHERNUM.CharacterSheet.Diagnostics.TechnicalDetails");
    expect(template).toContain("performance.moduleBuildTimes");
    expect(css).toContain(".ethernum-sheet-diagnostics");
    expect(css).toContain("@media (max-width: 620px)");
    expect(CHARACTER_SHEET_DIAGNOSTICS_TEMPLATE).toContain("character-sheet-diagnostics.html");
    expect(CHARACTER_SHEET_DIAGNOSTICS_STYLESHEET).toContain("character-sheet-diagnostics.css");
  });
});
