import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveCharacterSheetClassIds } from "../scripts/sheets/core/CharacterSheetSwitcher.js";

describe("Character Sheet v3.7.0.1 hotfix", () => {
  it("discovers PF2e and Ethernum sheet ids without hardcoding class names", () => {
    expect(resolveCharacterSheetClassIds({
      "pf2e.FutureCharacterSheet": { id: "pf2e.FutureCharacterSheet", cls: class FuturePF2eSheet {} },
      "ethernum-rpg-module.FutureSheet": { id: "ethernum-rpg-module.FutureSheet", cls: class FutureEthernumSheet {} },
    })).toEqual({
      ethernum: "ethernum-rpg-module.FutureSheet",
      pf2e: "pf2e.FutureCharacterSheet",
    });
  });

  it("keeps navigation tabs bounded and module overlays below Foundry windows", () => {
    const sheetCss = readFileSync(join(process.cwd(), "styles", "sheets", "character-sheet-base.css"), "utf8");
    const trackerCss = readFileSync(join(process.cwd(), "styles", "ethernum.css"), "utf8");
    const gmCss = readFileSync(join(process.cwd(), "styles", "ethernum-gm-control.css"), "utf8");
    expect(sheetCss).toContain("flex: 0 0 auto;");
    expect(sheetCss).toMatch(/\.ecs-navigation__tab \{[\s\S]*?width: auto;/);
    expect(trackerCss).toContain("z-index: calc(var(--z-index-ui, 60) + 1);");
    expect(gmCss).toContain("z-index: calc(var(--z-index-ui, 60) + 2);");
  });

  it("switches visible panels without racing full sheet renders", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts", "sheets", "BaseEthernumCharacterSheet.ts"),
      "utf8",
    );
    expect(source).toContain('"click.ethernum-sheet-tabs"');
    expect(source).toContain('panel.hidden = data(panel, "tab") !== tabId;');
    expect(source).toContain('tab.setAttribute("aria-selected", String(active));');
    expect(source).not.toMatch(/selectSheetTab[\s\S]*?this\.render\(true\)/);
    expect(source).toContain("foundry.applications.apps");
    expect(source).not.toContain("new ImagePopout(");
    const navigation = readFileSync(
      join(process.cwd(), "templates", "sheets", "base", "navigation.html"),
      "utf8",
    );
    expect(navigation).toContain('data-sheet-tab="{{this.id}}"');
    expect(navigation).toContain('role="tab"');
    expect(navigation).not.toContain('data-action="select-ethernum-tab"');
    expect(navigation).not.toContain('data-tab="{{this.id}}"');
  });
});
