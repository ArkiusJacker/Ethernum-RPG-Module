import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("Foundry 13 administrative dialogs", () => {
  const dialogService = readFileSync(resolve(root, "scripts/ui/gm-control/ModernDialogService.ts"), "utf8");
  const support = readFileSync(resolve(root, "scripts/ui/gm-control/GMCommandSupport.ts"), "utf8");
  const communicator = readFileSync(resolve(root, "scripts/ui/FieldCommunicatorOverlay.ts"), "utf8");
  const sheetSwitcher = readFileSync(resolve(root, "scripts/sheets/core/CharacterSheetSwitcher.ts"), "utf8");

  it("prefers DialogV2 while preserving the legacy Foundry fallback", () => {
    expect(dialogService).toContain("foundry?.applications?.api?.DialogV2");
    expect(dialogService).toContain("DialogV2.wait");
    expect(dialogService).toContain("new Dialog");
    expect(dialogService).toContain("rejectClose: false");
  });

  it("routes reusable forms and JSON reports through the compatibility service", () => {
    expect(support).toContain("showModernFormDialog");
    expect(support).toContain("showModernJsonDialog");
    expect(communicator).toContain("showModernFormDialog");
  expect(communicator).not.toContain("new Dialog(");
  expect(sheetSwitcher).not.toContain("new Dialog(");
  expect(sheetSwitcher).toContain("showModernFormDialog");
  });
});
