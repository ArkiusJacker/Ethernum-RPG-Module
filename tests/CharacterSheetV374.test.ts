import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Character Sheet v3.7.4 visual contract", () => {
  it("keeps the Ethernum palette and visual rules scoped to its shell", () => {
    const css = read("styles/sheets/ethernum-company-sheet.css");

    for (const value of ["#101315", "#171b1e", "#242a2e", "#b99045", "#d4b56a", "#48c7d9", "#7ce8f2"]) {
      expect(css).toContain(value);
    }
    expect(css).toContain(".ethernum-character-sheet.ethernum-company-sheet");
    expect(css).not.toMatch(/^\s*\.concordia-character-sheet/m);
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain('data-ethernum-sheet-motion="off"');
  });

  it("adds semantic hooks without replacing Foundry or PF2e actions", () => {
    const header = read("templates/sheets/base/header.html");
    const navigation = read("templates/sheets/base/navigation.html");
    const overview = read("templates/sheets/components/overview.html");
    const combat = read("templates/sheets/components/combat.html");
    const spellcasting = read("templates/sheets/components/spellcasting.html");

    expect(header).toContain('data-ui-role="rank-seal"');
    expect(header).toContain('data-resource="hp"');
    expect(header).toContain('data-resource="hero-points"');
    expect(header).toContain("ecs-hp-trace");
    expect(navigation).toContain('data-ui-role="navigation-tab"');
    expect(overview).toContain("this.icon");
    expect(overview).toContain("ecs-resource-markers");
    expect(overview).toContain("this.markers");
    expect(combat).toContain('data-action="roll-strike"');
    expect(combat).toContain('data-ui-role="rollable"');
    expect(spellcasting).toContain('data-action="cast-spell"');
    expect(spellcasting).toContain('data-resource="focus"');
  });

  it("derives decorative resource markers from prepared PF2e values", () => {
    const presentation = read("scripts/sheets/core/CharacterSheetPresentation.ts");

    expect(presentation).toContain("markerKind");
    expect(presentation).toContain("markers:");
    expect(presentation).toContain("Math.min(10");
    expect(presentation).not.toContain("actor.update");
    expect(presentation).not.toContain("setFlag(");
  });

  it("registers a client-only movement preference with matching locales", () => {
    const settings = read("scripts/settings.ts");
    const declarations = read("scripts/foundry-module.d.ts");
    const en = read("lang/en.json");
    const pt = read("lang/pt-BR.json");

    expect(settings).toContain('"characterSheetAnimations"');
    expect(settings).toContain('scope: "client"');
    expect(settings).toContain("applyCharacterSheetMotionMode");
    expect(declarations).toContain('"ethernum-rpg-module.characterSheetAnimations"');
    expect(en).toContain('"CharacterSheetAnimations"');
    expect(pt).toContain('"CharacterSheetAnimations"');
  });

  it("connects transient feedback without writing presentation state to the Actor", () => {
    const sheet = read("scripts/sheets/BaseEthernumCharacterSheet.ts");
    const feedback = read("scripts/sheets/core/CharacterSheetInteractionFeedback.ts");

    expect(sheet).toContain("CharacterSheetInteractionFeedback");
    expect(sheet).toContain("this.#feedback.restore");
    expect(feedback).toContain("ecs-feedback-damage");
    expect(feedback).toContain("ecs-feedback-resource-recover");
    expect(feedback).not.toContain("setFlag(");
    expect(feedback).not.toContain("update(");
  });
});
