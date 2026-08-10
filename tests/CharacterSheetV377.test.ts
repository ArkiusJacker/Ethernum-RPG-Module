import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ETHERNUM_UI_ASSET_DEFINITIONS,
  ETHERNUM_UI_ASSET_PACK_VERSION,
  resolveEthernumUIAsset,
} from "../scripts/ui/assets/EthernumUIAssetRegistry.js";
import {
  getEthernumUIAssetLoadReport,
  preloadEthernumUIAssets,
  resetEthernumUIAssetPreloader,
} from "../scripts/ui/assets/EthernumUIAssetPreloader.js";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Character Sheet v3.7.7 visual fidelity contract", () => {
  beforeEach(() => resetEthernumUIAssetPreloader());

  it("registers the complete canonical asset pack with unique distributable paths", () => {
    expect(ETHERNUM_UI_ASSET_PACK_VERSION).toBe(1);
    expect(ETHERNUM_UI_ASSET_DEFINITIONS).toHaveLength(14);
    expect(new Set(ETHERNUM_UI_ASSET_DEFINITIONS.map(asset => asset.id)).size).toBe(14);
    expect(new Set(ETHERNUM_UI_ASSET_DEFINITIONS.map(asset => asset.path)).size).toBe(14);
    expect(resolveEthernumUIAsset("ETH-UI-08")?.id).toBe("ETH-UI-08-A");

    for (const asset of ETHERNUM_UI_ASSET_DEFINITIONS) {
      expect(asset.path).toMatch(/^modules\/ethernum-rpg-module\/assets\/ui\/ethernum\//);
      expect(asset.path).toMatch(/\.webp$/);
      expect(asset.runtimeWidth).toBeGreaterThan(0);
      expect(asset.runtimeHeight).toBeGreaterThan(0);
      expect(existsSync(resolve(root, asset.path.replace("modules/ethernum-rpg-module/", "")))).toBe(true);
    }
  });

  it("preloads assets without throwing and records a missing fallback", async () => {
    const factory = () => {
      const image: Partial<HTMLImageElement> = {};
      Object.defineProperty(image, "src", {
        set(value: string) {
          queueMicrotask(() => value.includes("rank-ring") ? image.onerror?.(new Event("error")) : image.onload?.(new Event("load")));
        },
      });
      return image as HTMLImageElement;
    };
    await expect(preloadEthernumUIAssets(["ETH-UI-01", "ETH-UI-03"], factory)).resolves.toBeDefined();
    expect(getEthernumUIAssetLoadReport()).toMatchObject({
      loaded: ["ETH-UI-01"],
      missing: ["ETH-UI-03"],
    });
  });

  it("splits Ethernum visual composition while retaining shared mechanical components", () => {
    const entry = read("templates/sheets/character-sheet.html");
    const shell = read("templates/sheets/ethernum/shell.html");
    const header = read("templates/sheets/ethernum/header.html");
    const navigation = read("templates/sheets/ethernum/navigation.html");

    expect(entry).toContain('templates/sheets/ethernum/shell.html');
    expect(entry).toContain('templates/sheets/base/sheet-base.html');
    expect(shell).toContain('templates/sheets/components/overview.html');
    expect(shell).toContain('templates/sheets/components/unique.html');
    expect(shell).not.toContain("UniqueMechanicsKernel");
    expect(header).toContain('data-ui-asset="ETH-UI-03"');
    expect(header).toContain('data-ui-asset="ETH-UI-04"');
    expect(header).toContain('data-ui-asset="ETH-UI-05"');
    expect(header).toContain("eth-hp-ecg");
    expect(header).toContain("companyIdentity.rankLabel");
    expect(header).toContain("identity.level");
    expect(navigation).toContain('role="tab"');
    expect(navigation).toContain('aria-selected=');
    expect(navigation).toContain('data-sheet-tab=');
  });

  it("keeps canonical assets decorative, responsive and non-blocking", () => {
    const css = read("styles/sheets/ethernum-company-sheet.css");
    const template = read("templates/sheets/ethernum/shell.html");

    expect(css).toContain("pointer-events: none");
    expect(css).toContain("object-fit: contain");
    expect(css).toContain("@media (max-width: 1200px)");
    expect(css).toContain("@container ethernum-sheet (max-width: 1000px)");
    expect(css).toContain("@container ethernum-sheet (max-width: 800px)");
    expect(css).toContain("@container ethernum-sheet (max-width: 650px)");
    expect(css).toContain('data-high-contrast="true"');
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(template).toContain('aria-hidden="true"');
    expect(template).toContain("eth-reference-overlay");
    expect(template).toContain("data-reference-setting");
  });

  it("registers diagnostics and a GM-only reference overlay contract", () => {
    const settings = read("scripts/settings.ts");
    const diagnostics = read("scripts/sheets/core/CharacterSheetDiagnosticsService.ts");
    const reference = read("scripts/ui/assets/EthernumVisualReferenceService.ts");
    const sheet = read("scripts/sheets/BaseEthernumCharacterSheet.ts");

    expect(settings).toContain('"characterSheetVisualReference"');
    expect(settings).toContain('"characterSheetHighContrast"');
    expect(diagnostics).toContain("loadedUIAssets");
    expect(diagnostics).toContain("missingUIAssets");
    expect(diagnostics).toContain("Ethernum Fidelity");
    expect(reference).toContain("!game.user?.isGM");
    expect(settings).toContain("refreshCharacterSheetUI");
    expect(settings).toMatch(/"characterSheetVisualReference"[\s\S]*?onChange: refreshCharacterSheetUI/);
    expect(sheet).toContain('key === "characterSheetVisualReferencePath"');
  });
});
