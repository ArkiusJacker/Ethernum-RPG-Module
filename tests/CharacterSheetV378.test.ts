import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ETHERNUM_UI_ASSET_DEFINITIONS,
  resolveEthernumUIAsset,
} from "../scripts/ui/assets/EthernumUIAssetRegistry.js";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Character Sheet v3.7.8 visual calibration contract", () => {
  it("records optical sizing metadata for every canonical asset", () => {
    for (const asset of ETHERNUM_UI_ASSET_DEFINITIONS) {
      expect(asset.visual).toBeDefined();
      expect(asset.visual.preferredWidth).toBeGreaterThan(0);
      expect(asset.visual.preferredHeight).toBeGreaterThan(0);
      expect(asset.visual.fit).toMatch(/^(contain|cover|fill)$/);
      expect(asset.visual.opacity).toBeGreaterThan(0);
    }

    expect(resolveEthernumUIAsset("ETH-UI-03")?.visual.preferredWidth).toBe(124);
    expect(resolveEthernumUIAsset("ETH-UI-05")?.visual).toMatchObject({
      preferredWidth: 150,
      preferredHeight: 172,
    });
    expect(resolveEthernumUIAsset("ETH-UI-09")?.visual.minWidth).toBeGreaterThanOrEqual(20);
    expect(resolveEthernumUIAsset("ETH-UI-09")?.visual.preferredWidth).toBeGreaterThanOrEqual(28);
    expect(resolveEthernumUIAsset("ETH-UI-08-A")?.visual.opacity).toBeGreaterThanOrEqual(0.09);
  });

  it("publishes calibrated asset values to the Ethernum shell", () => {
    const shell = read("templates/sheets/ethernum/shell.html");

    expect(shell).toContain("--eth-portrait-width");
    expect(shell).toContain("--eth-rank-size");
    expect(shell).toContain("--eth-resource-gem-size");
    expect(shell).toContain("--eth-rune-opacity-a");
    expect(shell).toContain("uiAssets.visual");
  });

  it("keeps actions in a dedicated row and renders the full tab instruments", () => {
    const css = read("styles/sheets/ethernum-company-sheet.css");
    const navigation = read("templates/sheets/ethernum/navigation.html");

    expect(css).toMatch(/\.eth-fidelity-header\s*\{[\s\S]*?grid-template-rows:\s*42px minmax\(var\(--eth-portrait-height, 172px\), auto\)/);
    expect(css).toMatch(/\.eth-header-actions\s*\{[\s\S]*?grid-row:\s*1/);
    expect(css).toContain("@container ethernum-sheet (max-width: 1120px)");
    expect(css).toMatch(/\.eth-portrait-instrument\s*\{[\s\S]*?width:\s*var\(--eth-portrait-width, 150px\)/);
    expect(css).toMatch(/\.eth-vitals-instrument\s*\{\s*display:\s*contents;/);
    expect(css).toContain(".eth-tab-frame--active");
    expect(css).toContain("object-fit: fill");
    expect(css).toContain("background: transparent !important");
    expect(navigation).toContain('data-ui-asset="ETH-UI-06"');
    expect(navigation).toContain('data-ui-asset="ETH-UI-07"');
    expect(css).not.toMatch(/\.eth-resource-gems img\s*\{[^}]*?(?:width|inline-size):\s*1[0-9]px/s);
  });
});
