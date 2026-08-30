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

function installOperationalGame(active: boolean, notifications: "all" | "priority" | "off" = "all") {
  const registry = createDefaultFieldCommunicatorRegistry();
  const flags: Record<string, unknown> = {};
  const actor = {
    id: "agent-a",
    uuid: "Actor.agent-a",
    name: "Agent A",
    type: "character",
    system: {},
    getFlag: (_scope: string, key: string) => key === "fieldCommunicator" ? { rank: 3 } : undefined,
    testUserPermission: () => true,
  } as unknown as Actor;
  const user = {
    id: "player-a",
    name: "Player A",
    isGM: false,
    active,
    character: actor,
    getFlag: (_scope: string, key: string) => flags[key],
    setFlag: vi.fn(async (_scope: string, key: string, value: unknown) => { flags[key] = value; }),
  };
  const messages = [{
    id: "group-1",
    timestamp: 100,
    content: "<p>Mensagem de campo</p>",
    speaker: { alias: "Command" },
    flags: { "ethernum-rpg-module": { fieldCommunicator: { channel: "group" } } },
  }];
  vi.stubGlobal("game", {
    user,
    users: [user],
    actors: [actor],
    scenes: [],
    items: [],
    journal: [],
    messages,
    world: { id: "test-world" },
    i18n: { lang: "pt-BR", localize: (key: string) => key },
    settings: {
      get: (_namespace: string, key: string) => {
        if (key === "fieldCommunicatorApps") return registry;
        if (key === "fieldCommunicatorMotion") return "off";
        if (key === "fieldCommunicatorNotifications") return notifications;
        if (key === "fieldCommunicatorGroupHistoryLimit") return 100;
        return false;
      },
    },
  });
  const contractArchive = { getSnapshot: vi.fn(async () => ({ schemaVersion: 1, revision: 0, contracts: [] })) };
  const store = { getSnapshot: vi.fn(async () => ({ items: [], balance: {}, state: {} })) };
  return { actor, user, service: new FieldCommunicatorService(contractArchive as never, store as never), flags };
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

  it("derives presence from the associated Foundry user and exposes only truthful static telemetry", async () => {
    const onlineWorld = installOperationalGame(true);
    const online = await onlineWorld.service.buildSnapshot();
    expect(online.agent).toMatchObject({ online: true });
    expect(online.signal).toEqual({ label: "Canal local protegido", static: true });
    expect(online.sync).toEqual({ pending: false, label: "DADOS LOCAIS PRONTOS" });

    vi.unstubAllGlobals();
    const offlineWorld = installOperationalGame(false);
    const offline = await offlineWorld.service.buildSnapshot();
    expect(offline.agent).toMatchObject({ online: false });
    expect(offline.homeMessage).toContain("offline");
  });

  it("counts reliable unread notifications, applies filters and persists reads on the current user", async () => {
    const world = installOperationalGame(true, "all");
    const snapshot = await world.service.buildSnapshot();
    const panel = snapshot.panels?.notifications as { notifications: Array<{ id: string; read: boolean }> };
    expect(snapshot.notificationCount).toBe(1);
    expect(panel.notifications).toEqual([expect.objectContaining({ id: "group:group-1", read: false })]);

    await world.service.markNotificationsRead(["group:group-1"]);
    const refreshed = await world.service.buildSnapshot();
    expect(refreshed.notificationCount).toBe(0);
    expect((refreshed.panels?.notifications as typeof panel).notifications[0]).toMatchObject({ read: true });
    expect(world.user.setFlag).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
    const filtered = installOperationalGame(true, "priority");
    expect((await filtered.service.buildSnapshot()).notificationCount).toBe(0);
  });
});
