import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  showModernFormDialog,
  supportsModernDialogs,
} from "../scripts/ui/gm-control/ModernDialogService.js";

const root = resolve(import.meta.dirname, "..");

describe("Foundry 13 administrative dialogs", () => {
  const dialogService = readFileSync(resolve(root, "scripts/ui/gm-control/ModernDialogService.ts"), "utf8");
  const support = readFileSync(resolve(root, "scripts/ui/gm-control/GMCommandSupport.ts"), "utf8");
  const communicator = readFileSync(resolve(root, "scripts/ui/FieldCommunicatorOverlay.ts"), "utf8");
  const sheetSwitcher = readFileSync(resolve(root, "scripts/sheets/core/CharacterSheetSwitcher.ts"), "utf8");

  afterEach(() => vi.unstubAllGlobals());

  it("prefers DialogV2 and returns null when the modern dialog closes", async () => {
    const wait = vi.fn(async () => null);
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: { wait } } } });
    vi.stubGlobal("game", { i18n: { localize: (key: string) => key === "ETHERNUM.Buttons.Cancel" ? "Cancel" : key } });

    expect(supportsModernDialogs()).toBe(true);
    await expect(showModernFormDialog("Title", "<label>Body</label>", { confirmLabel: "Apply" })).resolves.toBeNull();
    expect(wait).toHaveBeenCalledOnce();
    expect(wait.mock.calls[0][0]).toMatchObject({
      window: { title: "Title" },
      rejectClose: false,
      buttons: [
        { action: "confirm", label: "Apply", default: true },
        { action: "cancel", label: "Cancel" },
      ],
    });
  });

  it("settles the legacy fallback exactly once on cancel", async () => {
    const render = vi.fn();
    class LegacyDialog {
      constructor(private readonly options: Record<string, any>) {}
      render(force: boolean): this {
        render(force);
        this.options.buttons.cancel.callback();
        this.options.close();
        return this;
      }
    }
    vi.stubGlobal("foundry", undefined);
    vi.stubGlobal("Dialog", LegacyDialog);
    vi.stubGlobal("game", { i18n: { localize: (key: string) => key } });

    expect(supportsModernDialogs()).toBe(false);
    await expect(showModernFormDialog("Legacy", "<p>Body</p>")).resolves.toBeNull();
    expect(render).toHaveBeenCalledOnce();
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
