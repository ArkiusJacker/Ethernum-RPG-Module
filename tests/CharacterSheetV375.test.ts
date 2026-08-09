import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCharacterSheetPresentation } from "../scripts/sheets/core/CharacterSheetPresentation.js";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const permissions = {
  owner: true,
  gm: true,
  observer: true,
  editable: true,
  canChooseSheet: true,
};

describe("Character Sheet v3.7.5 mechanical grimoire contract", () => {
  beforeEach(() => {
    vi.stubGlobal("game", { i18n: { localize: (key: string) => key } });
  });

  it("derives a bounded alchemical HP ratio and status from PF2e values", () => {
    const critical = buildCharacterSheetPresentation({
      vitals: { hp: { current: 25, max: 100, temp: 4 }, heroPoints: { current: 2, max: 3 } },
    }, permissions);
    const overflow = buildCharacterSheetPresentation({
      vitals: { hp: { current: 140, max: 100 }, heroPoints: { current: 0, max: 3 } },
    }, permissions);

    expect(critical).toMatchObject({
      vitals: { hp: { value: 25, max: 100, percentage: 25, ratio: 0.25, status: "critical", temp: 4 } },
    });
    expect(overflow).toMatchObject({
      vitals: { hp: { percentage: 100, ratio: 1, status: "full" } },
    });
  });

  it("exposes reusable material roles without replacing PF2e interactions", () => {
    const templates = [
      "templates/sheets/base/header.html",
      "templates/sheets/base/navigation.html",
      "templates/sheets/components/overview.html",
      "templates/sheets/components/combat.html",
      "templates/sheets/components/inventory.html",
      "templates/sheets/components/spellcasting.html",
      "templates/sheets/components/feats.html",
      "templates/sheets/components/unique.html",
    ].map(read).join("\n");

    for (const material of ["metal", "leather", "parchment", "glass", "arcane", "instrument"]) {
      expect(templates).toContain(`data-material="${material}"`);
    }
    expect(templates).toContain("ecs-hp-fluid");
    expect(templates).toContain("data-hp-status");
    expect(templates).toContain('data-action="roll-strike"');
    expect(templates).toContain('data-action="cast-spell"');
  });

  it("reports the Concordia theme and shared animation mode to GM diagnostics", () => {
    const service = read("scripts/sheets/core/CharacterSheetDiagnosticsService.ts");
    const template = read("templates/sheets/character-sheet-diagnostics.html");

    expect(service).toContain("Mechanical Grimoire");
    expect(service).toContain("animationMode");
    expect(template).toContain("sheet.theme");
    expect(template).toContain("sheet.animationMode");
  });

  it("ships the complete scoped palette, material rules and transform-based HP fluid", () => {
    const concordiaCss = [
      "shell.css",
      "header.css",
      "navigation.css",
      "overview.css",
      "combat.css",
      "arsenal.css",
      "spellcasting.css",
      "unique.css",
      "effects.css",
      "responsive.css",
    ].map(file => read(`styles/sheets/concordia/${file}`)).join("\n");

    for (const color of ["#121315", "#2b211c", "#b79b70", "#9a5f3a", "#b7924f", "#687176", "#49bfd0", "#8264c7", "#a8433f", "#69a77b"]) {
      expect(concordiaCss).toContain(color);
    }
    for (const material of ["metal", "leather", "parchment", "glass", "arcane", "instrument"]) {
      expect(concordiaCss).toContain(`[data-material="${material}"]`);
    }
    expect(concordiaCss).toContain("scaleX(var(--ecs-hp-ratio");
    expect(concordiaCss).toContain('[data-entry-category="ritual"]');
    expect(concordiaCss).toContain("prefers-reduced-motion: reduce");
    expect(concordiaCss).not.toContain("ethernum-company-sheet");
  });

  it("prepares eight independent sheet views without leaking HP presentation state", () => {
    const views = Array.from({ length: 8 }, (_entry, index) => buildCharacterSheetPresentation({
      vitals: { hp: { current: 20 + index * 10, max: 100 }, heroPoints: { current: index % 4, max: 3 } },
    }, permissions));

    expect(views).toHaveLength(8);
    expect(views.map(view => (view.vitals as { hp: { ratio: number } }).hp.ratio)).toEqual([
      0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
    ]);
  });
});
