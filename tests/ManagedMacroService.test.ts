import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureManagedMacros } from "../scripts/core/ManagedMacroService.js";

describe("ensureManagedMacros", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves a personal macro with the same name", async () => {
    const personal = {
      name: "Ethernum - Pipping: Painel",
      command: "console.log('personal')",
      img: "personal.webp",
      flags: {},
      update: vi.fn(),
    };
    const create = vi.fn(async (data: Record<string, unknown>) => ({
      ...data,
      update: vi.fn(),
    }));
    vi.stubGlobal("game", {
      user: { isGM: true },
      macros: [personal],
      i18n: { localize: (key: string) => key },
    });
    vi.stubGlobal("ui", { notifications: { warn: vi.fn() } });
    vi.stubGlobal("CONST", { DOCUMENT_OWNERSHIP_LEVELS: { OWNER: 3 } });
    vi.stubGlobal("Macro", { create });

    const report = await ensureManagedMacros([{
      id: "pipping-status",
      name: "Ethernum - Pipping: Painel",
      command: "await game.ethernum.macros.ethernumCompany.pipping.showStatus();",
      img: "managed.webp",
    }]);

    expect(personal.update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ethernum - Pipping: Painel (Ethernum)" }),
      { render: false },
    );
    expect(report.preservedPersonal).toContain("Ethernum - Pipping: Painel");
  });

  it("does not replace command or image when userModified is set", async () => {
    const managed = {
      name: "Managed",
      command: "custom command",
      img: "custom.webp",
      flags: {
        "ethernum-rpg-module": {
          managedMacro: "managed-id",
          userModified: true,
        },
      },
      update: vi.fn(async () => undefined),
    };
    vi.stubGlobal("game", {
      user: { isGM: true },
      macros: [managed],
      i18n: { localize: (key: string) => key },
    });
    vi.stubGlobal("ui", { notifications: { warn: vi.fn() } });
    vi.stubGlobal("CONST", { DOCUMENT_OWNERSHIP_LEVELS: { OWNER: 3 } });

    await ensureManagedMacros([{
      id: "managed-id",
      name: "Managed",
      command: "module command",
      img: "module.webp",
    }]);

    expect(managed.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ command: expect.anything(), img: expect.anything() }),
      { render: false },
    );
  });
});
