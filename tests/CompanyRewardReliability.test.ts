import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeCompanyRewardData } from "../scripts/rewards/CompanyRewardRepository.js";
import {
  COMPANY_REWARD_AUTHORITY_HANDLER,
  CompanyRewardService,
} from "../scripts/rewards/CompanyRewardService.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function authority(primary: boolean) {
  return {
    primary,
    isPrimaryGM: vi.fn(function (this: { primary: boolean }) { return this.primary; }),
    registerHandler: vi.fn(),
    request: vi.fn(),
  };
}

function repository(initial: unknown = {}) {
  let ledger = normalizeCompanyRewardData(initial);
  return {
    initialize: vi.fn(async () => ledger),
    read: vi.fn(async () => ledger),
    write: vi.fn(async value => (ledger = normalizeCompanyRewardData(value))),
    ledger: () => ledger,
  };
}

function adapter(overrides: Record<string, unknown> = {}) {
  return {
    resolveActor: vi.fn(async () => ({ uuid: "Actor.hero", name: "Hero" })),
    resolveItem: vi.fn(async () => ({ uuid: "Item.sword", name: "Sword" })),
    isPhysicalItem: vi.fn(() => true),
    grantItem: vi.fn(async () => ["created-item"]),
    addCoins: vi.fn(async () => true),
    deleteGrantedItems: vi.fn(async () => undefined),
    removeCoins: vi.fn(async () => true),
    ...overrides,
  };
}

describe("CompanyRewardService authority reliability", () => {
  it("initializes silently on a Player without reading the administrative ledger", async () => {
    vi.stubGlobal("game", { user: { id: "player", isGM: false } });
    const store = repository();
    const bridge = authority(false);
    const service = new CompanyRewardService(store as never, adapter() as never, Date.now, bridge as never);

    await expect(service.initialize()).resolves.toEqual({ schemaVersion: 1, revision: 0, rewards: [] });
    expect(store.initialize).not.toHaveBeenCalled();
    expect(store.read).not.toHaveBeenCalled();
    expect(bridge.registerHandler).not.toHaveBeenCalled();
    expect(bridge.request).not.toHaveBeenCalled();
  });

  it("lets a secondary GM read but delegates normalized mutations to the primary GM", async () => {
    vi.stubGlobal("game", { user: { id: "gm-b", isGM: true } });
    const store = repository({ revision: 4 });
    const bridge = authority(false);
    bridge.request.mockResolvedValue({
      transactionId: "reward-2",
      actorName: "Hero",
      xpMetadata: 10,
      epMetadata: 0,
      state: "completed",
    });
    const rewards = adapter();
    const service = new CompanyRewardService(store as never, rewards as never, Date.now, bridge as never);

    await expect(service.initialize()).resolves.toMatchObject({ revision: 4 });
    await expect(service.grant({
      transactionId: " reward-2 ",
      actorUuid: " Actor.hero ",
      xpMetadata: 10.9,
    })).resolves.toMatchObject({ transactionId: "reward-2", state: "completed" });

    expect(store.initialize).not.toHaveBeenCalled();
    expect(store.read).toHaveBeenCalledOnce();
    expect(store.write).not.toHaveBeenCalled();
    expect(rewards.resolveActor).not.toHaveBeenCalled();
    expect(bridge.registerHandler).toHaveBeenCalledWith(
      COMPANY_REWARD_AUTHORITY_HANDLER,
      expect.any(Object),
      { replace: true },
    );
    expect(bridge.request).toHaveBeenCalledWith(expect.objectContaining({
      handlerId: COMPANY_REWARD_AUTHORITY_HANDLER,
      category: "reward",
      idempotencyKey: "company-reward:reward-2",
      payload: expect.objectContaining({ transactionId: "reward-2", actorUuid: "Actor.hero", xpMetadata: 10 }),
    }));
  });

  it("applies locally after the secondary GM becomes primary without reinitializing", async () => {
    vi.stubGlobal("game", { user: { id: "gm-b", isGM: true } });
    const store = repository();
    const bridge = authority(false);
    const rewards = adapter();
    const service = new CompanyRewardService(store as never, rewards as never, () => 1_000, bridge as never);
    await service.initialize();

    bridge.primary = true;
    await expect(service.grant({ transactionId: "reward-handoff", actorUuid: "Actor.hero" }))
      .resolves.toMatchObject({ transactionId: "reward-handoff", state: "completed" });

    expect(bridge.request).not.toHaveBeenCalled();
    expect(rewards.resolveActor).toHaveBeenCalledOnce();
    expect(store.ledger().rewards[0]).toMatchObject({ transactionId: "reward-handoff", state: "completed" });
  });

  it("marks an uncertain PF2e currency failure for recovery instead of guessing rollback", async () => {
    vi.stubGlobal("game", { user: { id: "gm-a", isGM: true } });
    const store = repository();
    const bridge = authority(true);
    const rewards = adapter({ addCoins: vi.fn(async () => { throw new Error("socket interrupted"); }) });
    const service = new CompanyRewardService(store as never, rewards as never, () => 2_000, bridge as never);

    await expect(service.grant({
      transactionId: "reward-uncertain",
      actorUuid: "Actor.hero",
      itemUuid: "Item.sword",
      currency: "2 gp",
    })).resolves.toMatchObject({ state: "recoveryRequired" });

    expect(rewards.deleteGrantedItems).toHaveBeenCalledWith(expect.any(Object), ["created-item"]);
    expect(rewards.removeCoins).not.toHaveBeenCalled();
    expect(store.ledger().rewards[0]).toMatchObject({
      state: "recoveryRequired",
      recoveryNotes: ["Moeda: resultado da concessão não confirmado."],
    });
  });

  it("keeps Player mutation attempts denied without contacting the bridge", async () => {
    vi.stubGlobal("game", { user: { id: "player", isGM: false } });
    const bridge = authority(false);
    const service = new CompanyRewardService(repository() as never, adapter() as never, Date.now, bridge as never);

    await expect(service.grant({ transactionId: "forged", actorUuid: "Actor.hero" }))
      .rejects.toThrow(/Somente o Gamemaster/i);
    expect(bridge.request).not.toHaveBeenCalled();
  });

  it("rejects a forged Player request when the primary handler revalidates authorship", async () => {
    vi.stubGlobal("game", { user: { id: "gm-a", isGM: true } });
    const bridge = authority(true);
    const service = new CompanyRewardService(repository() as never, adapter() as never, Date.now, bridge as never);
    await service.initialize();
    const handler = bridge.registerHandler.mock.calls[0]?.[1] as {
      validate(context: unknown): unknown;
    };

    expect(() => handler.validate({
      request: { payload: { transactionId: "forged", actorUuid: "Actor.hero" } },
      requester: { id: "player", active: true, isGM: false },
      authority: { id: "gm-a", active: true, isGM: true },
      phase: "initial",
      now: 1,
    })).toThrow(/autoria GM verificável/i);
  });
});
