import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeCompanyIdentityData,
  normalizeCompanyIdentityRecord,
} from "../scripts/company/CompanyIdentityRepository.js";
import { EmergencyBroadcastService } from "../scripts/communicator/EmergencyBroadcastService.js";
import { normalizeCompanyRewardData } from "../scripts/rewards/CompanyRewardRepository.js";
import { CompanyRewardService } from "../scripts/rewards/CompanyRewardService.js";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("v3.8.3 administrative persistence", () => {
  it("normalizes authoritative company identities without accepting malformed records", () => {
    expect(normalizeCompanyIdentityRecord({
      actorUuid: " Actor.hero ",
      codename: "  Night   Agent ",
      rank: 3.9,
      squadIds: ["alpha", "alpha", "beta"],
      revision: -4,
    })).toEqual(expect.objectContaining({
      actorUuid: "Actor.hero",
      codename: "Night Agent",
      rank: 3,
      squadIds: ["alpha", "beta"],
      revision: 0,
    }));
    expect(normalizeCompanyIdentityData({ identities: { "": {}, valid: { actorUuid: "Actor.valid" } } }).identities)
      .toEqual({ "Actor.valid": expect.objectContaining({ actorUuid: "Actor.valid" }) });
  });

  it("normalizes the reward ledger and marks unknown transaction states for recovery", () => {
    const ledger = normalizeCompanyRewardData({
      revision: 2.8,
      rewards: [{ transactionId: "reward-1", actorUuid: "Actor.hero", state: "unknown", xpMetadata: 25.9 }],
    });
    expect(ledger.revision).toBe(2);
    expect(ledger.rewards[0]).toMatchObject({
      transactionId: "reward-1",
      state: "recoveryRequired",
      xpMetadata: 25,
    });
  });

  it("grants a reward once and replays the persistent transaction idempotently", async () => {
    vi.stubGlobal("game", { user: { id: "gm", name: "GM", isGM: true } });
    let ledger = normalizeCompanyRewardData({});
    const repository = {
      initialize: vi.fn(async () => ledger),
      read: vi.fn(async () => ledger),
      write: vi.fn(async value => (ledger = normalizeCompanyRewardData(value))),
    };
    const actor = { uuid: "Actor.hero", name: "Hero" };
    const item = { uuid: "Item.sword", name: "Sword" };
    const adapter = {
      resolveActor: vi.fn(async () => actor),
      resolveItem: vi.fn(async () => item),
      isPhysicalItem: vi.fn(() => true),
      grantItem: vi.fn(async () => ["created-item"]),
      addCoins: vi.fn(async () => true),
      deleteGrantedItems: vi.fn(async () => undefined),
      removeCoins: vi.fn(async () => true),
    };
    let tick = 1_000;
    const service = new CompanyRewardService(repository as never, adapter as never, () => ++tick);
    const reward = {
      transactionId: "reward-1",
      actorUuid: "Actor.hero",
      itemUuid: "Item.sword",
      currency: "2 gp",
      xpMetadata: 125,
      epMetadata: 2,
      commendation: "Servico exemplar",
    };

    await expect(service.grant(reward)).resolves.toMatchObject({ state: "completed", xpMetadata: 125 });
    await expect(service.grant(reward)).resolves.toMatchObject({ state: "completed", transactionId: "reward-1" });
    expect(adapter.grantItem).toHaveBeenCalledTimes(1);
    expect(adapter.addCoins).toHaveBeenCalledTimes(1);
    expect(ledger.rewards).toHaveLength(1);
    expect(ledger.rewards[0]).toMatchObject({ state: "completed", createdItemIds: ["created-item"] });
  });
});

describe("v3.8.3 command device integration", () => {
  it("persists and deduplicates GM emergency broadcasts", async () => {
    const messages: Array<Record<string, unknown>> = [];
    const gm = { id: "gm", name: "GM", isGM: true, active: true };
    vi.stubGlobal("game", {
      user: gm,
      users: [gm, { id: "player", name: "Player", isGM: false, active: true }],
      messages,
    });
    const create = vi.fn(async (source: Record<string, unknown>) => {
      messages.push({ ...source, timestamp: Date.now(), author: gm });
      return source;
    });
    vi.stubGlobal("ChatMessage", { create, getSpeaker: () => ({ alias: "GM" }) });
    const service = new EmergencyBroadcastService();
    const input = { broadcastId: "broadcast-1", severity: "critical" as const, title: "Alerta", message: "Evacuacao", recipientIds: ["player"] };

    await service.send(input);
    await service.send(input);

    expect(create).toHaveBeenCalledTimes(1);
    expect(service.list(10, "player", false)[0]).toMatchObject(input);
    expect(service.list(10, "outsider", false)).toHaveLength(0);
  });

  it("wires every administrative domain through the audited command facade", () => {
    const template = read("templates/ethernum-gm-control-tab.html");
    const service = read("scripts/administration/AdministrativeCommunicatorService.ts");
    const overlay = read("scripts/ui/FieldCommunicatorOverlay.ts");
    const main = read("scripts/main.ts");

    for (const action of ["contract-create", "squad-edit", "intelligence-adjust", "store-add", "reward-grant", "broadcast-send", "preview-player", "loot-generate", "loot-apply", "loot-chat", "encounter-analyze"]) {
      expect(template).toContain(`data-gm-domain-action="${action}"`);
    }
    expect(service).toContain("ADMINISTRATIVE_COMMAND_HANDLER");
    expect(service).toContain("this.bridge.request");
    expect(service).toContain("context.requester.isGM");
    expect(overlay).toContain("readOnlyActions");
    expect(overlay).toContain('app.type !== "internal"');
    expect(main).toContain("CompanyIdentityService.initialize()");
    expect(main).toContain("getAdministrativeCommunicatorService().initialize()");
    expect(main).toContain("function refreshCommunicatorScreens");
    expect(main).toContain("moduleFlags?.emergencyBroadcast");
    expect(main).toContain("GMControlCenterOverlay.refresh()");
  });
});
