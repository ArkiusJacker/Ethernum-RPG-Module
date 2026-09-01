import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldCommunicatorService } from "../scripts/communicator/FieldCommunicatorService.js";
import { createDefaultFieldCommunicatorRegistry } from "../scripts/communicator/FieldCommunicatorRegistry.js";

function installWorld() {
  const registry = createDefaultFieldCommunicatorRegistry();
  const actor = {
    id: "actor-a", uuid: "Actor.actor-a", name: "Agent A", type: "character", system: {},
    getFlag: () => undefined, testUserPermission: () => true,
  } as unknown as Actor;
  const user = { id: "player", name: "Player", isGM: false, active: true, character: actor };
  vi.stubGlobal("game", {
    user, users: [user], actors: [actor], scenes: [], items: [], journal: [], messages: [], world: { id: "test" },
    i18n: { lang: "pt-BR", localize: (key: string) => key },
    settings: { get: (_scope: string, key: string) => key === "fieldCommunicatorApps" ? registry : key === "fieldCommunicatorMotion" ? "off" : false },
  });
}

const archiveSnapshot = () => ({ schemaVersion: 1, revision: 0, contracts: [] });
const storeSnapshot = () => ({ items: [], balance: { label: "0 cp" }, state: {} });

afterEach(() => vi.unstubAllGlobals());

describe("Field Communicator panel error boundaries", () => {
  it("keeps Store failure local while Contracts and other applications remain usable", async () => {
    installWorld();
    const contracts = { getSnapshot: vi.fn(async () => archiveSnapshot()) };
    const store = { getSnapshot: vi.fn(async () => { throw new Error("secret store stack"); }) };
    const snapshot = await new FieldCommunicatorService(contracts as never, store as never).buildSnapshot();

    expect(snapshot.state).toMatchObject({ documentUnavailable: false });
    expect(snapshot.panels?.contracts).not.toHaveProperty("error");
    expect(snapshot.panels?.shop).toMatchObject({ error: { code: "PANEL_SNAPSHOT_UNAVAILABLE", panelId: "shop" } });
    expect(snapshot.panels?.sheet).toBeDefined();
    expect(JSON.stringify(snapshot)).not.toContain("secret store stack");
    expect(JSON.stringify(snapshot)).not.toContain("Arquivo indisponível");
  });

  it("keeps Contracts failure local while Store remains usable", async () => {
    installWorld();
    const contracts = { getSnapshot: vi.fn(async () => { throw new Error("contract transport failed"); }) };
    const store = { getSnapshot: vi.fn(async () => storeSnapshot()) };
    const snapshot = await new FieldCommunicatorService(contracts as never, store as never).buildSnapshot();

    expect(snapshot.state).toMatchObject({ documentUnavailable: false });
    expect(snapshot.panels?.contracts).toMatchObject({ error: { panelId: "contracts" } });
    expect(snapshot.panels?.shop).not.toHaveProperty("error");
    expect(snapshot.panels?.shop).toHaveProperty("store");
  });

  it("represents two failures independently and reserves documentUnavailable for the selected document", async () => {
    installWorld();
    const contracts = { getSnapshot: vi.fn(async () => { throw new Error("contracts failed"); }) };
    const store = { getSnapshot: vi.fn(async () => { throw new Error("store failed"); }) };
    const service = new FieldCommunicatorService(contracts as never, store as never);
    const failed = await service.buildSnapshot();
    expect(failed.panelErrors).toEqual(expect.objectContaining({
      contracts: expect.objectContaining({ panelId: "contracts" }),
      shop: expect.objectContaining({ panelId: "shop" }),
    }));
    expect(failed.state).toMatchObject({ documentUnavailable: false });

    const unavailable = await service.buildSnapshot(undefined, { documentViewer: {
      active: true, unavailable: true, isPdf: false, isImage: false, isText: false, isJournal: false, isDossier: false,
      page: 1, pageCount: 1, pageLabel: "1 / 1", zoom: 100, zoomLabel: "100%", fitMode: "width",
      canPrevious: false, canNext: false, canOpenExternal: false,
    } });
    expect(unavailable.state).toMatchObject({ documentUnavailable: true });
  });

  it("retries only the affected snapshot", async () => {
    installWorld();
    const contracts = { getSnapshot: vi.fn(async () => archiveSnapshot()) };
    const store = { getSnapshot: vi.fn(async () => storeSnapshot()) };
    const service = new FieldCommunicatorService(contracts as never, store as never);

    const shop = await service.retryPanel("shop");
    expect(shop).toMatchObject({ id: "shop", store: storeSnapshot() });
    expect(store.getSnapshot).toHaveBeenCalledOnce();
    expect(contracts.getSnapshot).not.toHaveBeenCalled();
  });
});
