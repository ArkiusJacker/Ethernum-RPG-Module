import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("Pipping sheet layout", () => {
  it("renders collapsible Tier groups from grouped sheet data", () => {
    const template = readFileSync(
      resolve(root, "templates/unique-mechanics-tab.html"),
      "utf8",
    );
    expect(template).toContain("uniqueMechanics.pipping.tierGroups");
    expect(template).toContain('class="ethernum-pipping-tier"');
    expect(template).toContain("expression-{{this.visualExpression}}");
    expect(template).toContain('src="{{this.visualAsset}}"');
    expect(template).toContain("this.scaling.next");
    expect(template).toContain("this.automationLabel");
    expect(template).toContain("state.animatedShadow.tileId");
  });

  it("ships every expression asset referenced by the module", () => {
    for (const filename of [
      "shadow-destruction.png",
      "shadow-order.png",
      "shadow-chaos.png",
    ]) {
      expect(existsSync(resolve(root, "assets/unique/pipping", filename))).toBe(true);
    }
  });

  it("keeps expression colors distinct in the sheet stylesheet", () => {
    const css = readFileSync(resolve(root, "styles/ethernum.css"), "utf8");
    expect(css).toContain(".ethernum-pipping-ability.expression-destruction");
    expect(css).toContain(".ethernum-pipping-ability.expression-chaos");
    expect(css).toContain(".ethernum-pipping-chat-card.expression-order");
  });
});
