import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldCommunicatorService } from "../scripts/communicator/FieldCommunicatorService.js";
import { createDefaultFieldCommunicatorRegistry } from "../scripts/communicator/FieldCommunicatorRegistry.js";

function installGame(isGM: boolean) {
  const registry = createDefaultFieldCommunicatorRegistry();
  registry.apps.push({
    version: 1,
    id: "secret-link",
    source: "custom",
    label: "Secret link",
    description: "Restricted transport metadata",
    icon: "fa-solid fa-link",
    type: "external",
    targetUrl: "https://secret.example.test/path",
    unlock: { kind: "world-setting", key: "ethernum-rpg-module.secret", equals: true },
    order: 999,
    enabled: true,
  });
  const user = { id: isGM ? "gm" : "player", name: isGM ? "GM" : "Player", isGM, active: true, character: null };
  vi.stubGlobal("game", {
    user,
    users: [user],
    actors: [],
    scenes: [],
    items: [],
    journal: [],
    messages: [],
    world: { id: "test-world" },
    i18n: { lang: "pt-BR", localize: (key: string) => key },
    settings: {
      get: (_namespace: string, key: string) => {
        if (key === "fieldCommunicatorApps") return registry;
        if (key === "fieldCommunicatorMotion") return "off";
        if (key === "secret") return true;
        return false;
      },
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("FieldCommunicatorService permissions", () => {
  it("does not expose administrative registry data or restricted app targets to players", async () => {
    installGame(false);
    const snapshot = await new FieldCommunicatorService().buildSnapshot();
    const serialized = JSON.stringify(snapshot);

    expect(snapshot).not.toHaveProperty("adminApps");
    expect(snapshot).not.toHaveProperty("previewUsers");
    expect(snapshot).not.toHaveProperty("registryVersion");
    expect(snapshot.panels).not.toHaveProperty("administration");
    expect(serialized).not.toContain("secret.example.test");
    expect(serialized).not.toContain("world-setting");
  });

  it("keeps administration metadata and its panel available to a GM", async () => {
    installGame(true);
    const snapshot = await new FieldCommunicatorService().buildSnapshot();

    expect(snapshot).toHaveProperty("adminApps");
    expect(snapshot).toHaveProperty("previewUsers");
    expect(snapshot).toHaveProperty("registryVersion", 1);
    expect(snapshot.panels).toHaveProperty("administration");
  });
});
