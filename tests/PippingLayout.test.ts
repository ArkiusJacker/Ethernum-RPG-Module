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
    expect(template).toContain("this.summaryEntries");
    expect(template).toContain("this.header.pulseCost");
    expect(template).toContain("this.header.traits");
    expect(template).toContain("this.details");
    expect(template).toContain("this.entries");
    expect(template).toContain('data-pipping-action="{{this.id}}"');
    expect(template).toContain('tabindex="0"');
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
    expect(css).toContain(".ethernum-pipping-ability.expression-order");
    expect(css).toContain(".ethernum-pipping-ability.expression-chaos");
    expect(css).toContain(".ethernum-pipping-chat-card.expression-order");
    expect(css).toContain("ethernum-pipping-hover-destruction");
    expect(css).toContain("ethernum-pipping-hover-order");
    expect(css).toContain("ethernum-pipping-hover-chaos");
    expect(css).toContain(":focus-within");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
