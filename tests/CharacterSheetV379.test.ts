import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ETHERNUM_UI_ASSET_DEFINITIONS } from "../scripts/ui/assets/EthernumUIAssetRegistry.js";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Character sheet v3.7.9 hardening", () => {
  it("anchors an independent HP track without the oversized-width workaround", () => {
    const header = read("templates/sheets/ethernum/header.html");
    const css = read("styles/sheets/ethernum-company-sheet.css");
    expect(header).toContain("eth-hp-track ecs-meter");
    expect(css).not.toContain("width: 303%");
    expect(css).toContain("transform: scaleX(var(--ecs-hp-ratio))");
    expect(css).toContain("eth-hp-heartbeat");
    expect(css).toContain('data-hp-status="defeated"');
  });

  it("preserves the proportions of both ornamental divider assets", () => {
    const dividerIds = new Set(["ETH-UI-02", "ETH-UI-13"]);
    const dividers = ETHERNUM_UI_ASSET_DEFINITIONS.filter(asset => dividerIds.has(asset.id));
    expect(dividers).toHaveLength(2);
    expect(dividers.every(asset => asset.visual.fit === "contain")).toBe(true);
    expect(read("styles/sheets/ethernum-company-sheet.css")).not.toContain("var(--eth-ui-divider) center / 100% 100%");
  });

  it("renders currency outside ordinary inventory categories", () => {
    const template = read("templates/sheets/components/inventory.html");
    expect(template).toContain('data-panel-kind="currency"');
    expect(template).toContain("inventory.currency.denominations");
  });
});
