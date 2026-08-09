import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ConcordiaShell } from "../scripts/sheets/concordia/ConcordiaSheet.js";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Character Sheet v3.7.2 contract", () => {
  it("keeps Concordia focused on its own top-level modules", () => {
    expect(ConcordiaShell.tabs(false).map(tab => tab.id)).toEqual([
      "overview",
      "combat",
      "inventory",
      "feats",
      "unique",
      "effects",
    ]);
    expect(ConcordiaShell.tabs(true).map(tab => tab.id)).toEqual([
      "overview",
      "combat",
      "inventory",
      "spellcasting",
      "feats",
      "unique",
      "effects",
    ]);
    expect(ConcordiaShell.tabs(true).map(tab => tab.id)).not.toEqual(
      expect.arrayContaining(["ether", "runes"]),
    );
  });

  it("renders the Concordia defense rail, profile accents, and top navigation", () => {
    const sheet = read("templates/sheets/character-sheet.html");
    const header = read("templates/sheets/base/header.html");
    const navigation = read("templates/sheets/base/navigation.html");
    const baseStyles = read("styles/sheets/character-sheet-base.css");
    const styles = read("styles/sheets/concordia-sheet.css");

    expect(sheet).toContain('data-unique-profile="{{uniqueMechanic.activeProfile}}"');
    expect(header).toContain("ecs-concordia-defenses");
    expect(navigation).toContain('role="tablist"');
    expect(navigation).toContain('aria-selected="{{#if this.active}}true{{else}}false{{/if}}"');
    expect(styles).toContain('data-unique-profile="arkius-jacker"');
    expect(styles).toContain('data-unique-profile="charles"');
    expect(styles).toContain('data-unique-profile="atlas-sidarta"');
    expect(styles).toContain('data-unique-profile="yu-jiu-ji-tae"');
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(baseStyles).toContain(".ethernum-character-sheet .ecs-tab-panel.ethernum-content");
    expect(baseStyles).toContain("display: block");
  });

  it("exposes expanded PF2e details and isolated module fallbacks", () => {
    const overviewModule = read("scripts/sheets/components/CharacterOverview.ts");
    const overview = read("templates/sheets/components/overview.html");
    const spellcasting = read("templates/sheets/components/spellcasting.html");
    const controller = read("scripts/sheets/core/CharacterSheetController.ts");

    expect(overviewModule).toContain("PF2eCharacterAdapter.details(actor)");
    for (const panel of [
      "Biography",
      "Proficiencies",
      "ClassDC",
      "Senses",
      "Languages",
      "Exploration",
      "Downtime",
      "Crafting",
      "SpecialActions",
    ]) {
      expect(overview).toContain(`ETHERNUM.CharacterSheet.Details.${panel}`);
    }
    expect(spellcasting).toContain("spellcasting.focusPoints.current");
    expect(spellcasting).toContain("this.categoryLabel");
    expect(spellcasting).toContain('data-action="manage-spell-preparation"');
    expect(controller).toContain("moduleFailures");
    expect(controller).toContain("fallbacksUsed");
    expect(controller).toContain("detectPF2eCharacterCapabilities(actor)");
  });

  it("ships both chat presentations and matching locale keys", () => {
    const manifest = JSON.parse(read("module.json")) as { styles: string[] };
    const en = JSON.parse(read("lang/en.json")) as Record<string, unknown>;
    const pt = JSON.parse(read("lang/pt-BR.json")) as Record<string, unknown>;

    expect(manifest.styles).toContain("styles/chat-message-presentation.css");
    expect(read("scripts/main.ts")).toContain("initChatMessagePresentation()");
    expect(read("styles/chat-message-presentation.css")).toContain("ethernum-chat-presentation--concordia");
    expect(Object.keys(en).sort()).toEqual(Object.keys(pt).sort());
  });

  it("persists group and stowed visibility only in local sheet state", () => {
    const sheet = read("scripts/sheets/BaseEthernumCharacterSheet.ts");
    expect(sheet).toContain("controlled.hidden = !nextExpanded");
    expect(sheet).toContain('`inventory:${data(element, "category")}`');
    expect(sheet).toContain('`spellcasting:${data(element, "entryId")}`');
    expect(sheet).toContain("setCollapsed(sectionId, !nextExpanded)");
    expect(sheet).toContain('setCollapsed("inventory:stowed", !showStowed)');
    expect(sheet).not.toContain('actor.setFlag(MODULE_ID, "collapsed"');
  });
});
