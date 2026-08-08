import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthorityBridge,
  type AuthorityBridgeStorage,
  type AuthorityPolicyMode,
  type AuthoritySocket,
  type AuthoritySocketMessage,
  type AuthorityUserLike,
  type AuthorityUserProvider,
  MemoryAuthorityBridgeStorage,
} from "../scripts/core/AuthorityBridge.js";

class TestSocket implements AuthoritySocket {
  private readonly listeners = new Map<string, Set<(message: AuthoritySocketMessage) => void>>();

  on(channel: string, callback: (message: AuthoritySocketMessage) => void): void {
    const listeners = this.listeners.get(channel) ?? new Set();
    listeners.add(callback);
    this.listeners.set(channel, listeners);
  }

  off(channel: string, callback: (message: AuthoritySocketMessage) => void): void {
    this.listeners.get(channel)?.delete(callback);
  }

  emit(channel: string, message: AuthoritySocketMessage): void {
    for (const callback of this.listeners.get(channel) ?? []) {
      queueMicrotask(() => callback(message));
    }
  }
}

class TestUserProvider implements AuthorityUserProvider {
  constructor(
    private readonly current: AuthorityUserLike,
    private readonly users: AuthorityUserLike[],
  ) {}

  getCurrentUser(): AuthorityUserLike {
    return this.current;
  }

  getUsers(): Iterable<AuthorityUserLike> {
    return this.users;
  }
}

interface Harness {
  gm: AuthorityBridge;
  player: AuthorityBridge;
  storage: AuthorityBridgeStorage;
  now: { value: number };
}

const activeBridges: AuthorityBridge[] = [];

afterEach(() => {
  for (const bridge of activeBridges.splice(0)) bridge.stop();
  vi.restoreAllMocks();
});

async function createHarness(policy: AuthorityPolicyMode): Promise<Harness> {
  const socket = new TestSocket();
  const storage = new MemoryAuthorityBridgeStorage();
  const now = { value: 10_000 };
  const users: AuthorityUserLike[] = [
    { id: "gm-a", active: true, isGM: true, name: "GM" },
    { id: "player-a", active: true, isGM: false, name: "Player" },
  ];
  let gmId = 0;
  let playerId = 0;
  const common = {
    channel: "module.ethernum-authority-test",
    socket,
    storage,
    now: () => now.value,
    expirationIntervalMs: 60_000,
    requestTimeoutMs: 60_000,
    approvalTtlMs: 1_000,
    replayTtlMs: 10_000,
    replayLimit: 10,
    auditLimit: 20,
  };
  const gm = new AuthorityBridge({
    ...common,
    users: new TestUserProvider(users[0], users),
    randomId: () => `gm-${++gmId}`,
  });
  const player = new AuthorityBridge({
    ...common,
    users: new TestUserProvider(users[1], users),
    randomId: () => `player-${++playerId}`,
  });
  activeBridges.push(gm, player);
  gm.start();
  player.start();
  await gm.setPolicyConfiguration({ default: policy });
  return { gm, player, storage, now };
}

async function waitForQueue(bridge: AuthorityBridge, length = 1) {
  await vi.waitFor(async () => {
    expect(await bridge.getQueue()).toHaveLength(length);
  });
  return bridge.getQueue();
}

describe("AuthorityBridge", () => {
  it("replays a completed idempotent request without executing it twice", async () => {
    const { gm, player } = await createHarness("auto");
    const execute = vi.fn(async ({ request }) => ({
      doubled: Number((request.payload as { value: number }).value) * 2,
    }));
    gm.registerHandler("double", { validate: () => true, execute });

    const request = () => player.request<{ value: number }, { doubled: number }>({
      handlerId: "double",
      category: "effect",
      payload: { value: 4 },
      idempotencyKey: "same-operation",
    });
    const [first, concurrent] = await Promise.all([request(), request()]);
    const replayed = await player.request<{ value: number }, { doubled: number }>({
      handlerId: "double",
      category: "effect",
      payload: { value: 4 },
      idempotencyKey: "same-operation",
    });

    expect(first).toEqual({ doubled: 8 });
    expect(concurrent).toEqual({ doubled: 8 });
    expect(replayed).toEqual({ doubled: 8 });
    expect(execute).toHaveBeenCalledTimes(1);
    expect((await gm.getAuditLog()).map(entry => entry.status)).toEqual([
      "executed",
      "duplicate",
      "duplicate",
    ]);
    expect((await gm.getDiagnostics()).replayCacheSize).toBe(1);
  });

  it("blocks a persisted replay after the primary GM changes", async () => {
    const socket = new TestSocket();
    const storage = new MemoryAuthorityBridgeStorage();
    const users: AuthorityUserLike[] = [
      { id: "gm-a", active: true, isGM: true },
      { id: "gm-b", active: false, isGM: true },
      { id: "player-a", active: true, isGM: false },
    ];
    const options = {
      channel: "module.ethernum-authority-handoff",
      socket,
      storage,
      expirationIntervalMs: 60_000,
      requestTimeoutMs: 60_000,
    };
    const gmA = new AuthorityBridge({ ...options, users: new TestUserProvider(users[0], users) });
    const gmB = new AuthorityBridge({ ...options, users: new TestUserProvider(users[1], users) });
    const player = new AuthorityBridge({ ...options, users: new TestUserProvider(users[2], users) });
    activeBridges.push(gmA, gmB, player);
    gmA.start();
    player.start();
    const firstExecute = vi.fn(() => ({ applied: true }));
    gmA.registerHandler("handoff", { validate: () => true, execute: firstExecute });

    await player.request({
      handlerId: "handoff",
      category: "effect",
      payload: { actor: "Actor.a" },
      idempotencyKey: "handoff-operation",
    });
    expect(firstExecute).toHaveBeenCalledOnce();

    gmA.stop();
    users[0].active = false;
    users[1].active = true;
    const secondExecute = vi.fn(() => ({ applied: true }));
    gmB.registerHandler("handoff", { validate: () => true, execute: secondExecute });
    gmB.start();

    await expect(player.requestDetailed({
      handlerId: "handoff",
      category: "effect",
      payload: { actor: "Actor.a" },
      idempotencyKey: "handoff-operation",
    })).resolves.toMatchObject({
      status: "executed",
      duplicate: true,
      result: { applied: true },
    });
    expect(secondExecute).not.toHaveBeenCalled();
    expect((await gmB.getAuditLog()).at(-1)?.status).toBe("duplicate");
  });

  it("persists approval requests and revalidates immediately before execution", async () => {
    const { gm, player } = await createHarness("approval");
    const validate = vi.fn(() => true);
    const execute = vi.fn(({ request }) => ({ accepted: request.actionId }));
    gm.registerHandler("approve-me", { validate, execute });

    const pending = player.requestDetailed({
      handlerId: "approve-me",
      category: "canvas",
      actionId: "place-template",
      payload: { x: 100, y: 200 },
    });
    const [entry] = await waitForQueue(gm);
    const approved = await gm.approve(entry.id);
    const response = await pending;

    expect(approved?.status).toBe("executed");
    expect(response).toMatchObject({
      status: "executed",
      result: { accepted: "place-template" },
    });
    expect(validate.mock.calls.map(([context]) => context.phase)).toEqual([
      "initial",
      "approval",
    ]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(await gm.getQueue()).toEqual([]);
    expect((await gm.getAuditLog()).map(entry => entry.status)).toEqual([
      "queued",
      "approved",
      "executed",
    ]);
  });

  it("returns a terminal rejection when the primary GM rejects a queued request", async () => {
    const { gm, player } = await createHarness("approval");
    const execute = vi.fn();
    gm.registerHandler("reject-me", { validate: () => true, execute });

    const pending = player.requestDetailed({
      handlerId: "reject-me",
      category: "multi-target",
      payload: { targets: ["Actor.a", "Actor.b"] },
    });
    const [entry] = await waitForQueue(gm);
    await gm.reject(entry.id, "Denied by the GM.");
    const response = await pending;

    expect(response).toMatchObject({
      status: "rejected",
      error: "Denied by the GM.",
      errorCode: "APPROVAL_REJECTED",
    });
    expect(execute).not.toHaveBeenCalled();
    expect((await gm.getAuditLog()).map(item => item.status)).toEqual([
      "queued",
      "rejected",
    ]);
  });

  it("expires persisted approval requests and answers the original requester", async () => {
    const { gm, player, now } = await createHarness("approval");
    const execute = vi.fn();
    gm.registerHandler("expire-me", { validate: () => true, execute });

    const pending = player.requestDetailed({
      handlerId: "expire-me",
      category: "reaction",
      payload: { reaction: "late" },
      approvalTtlMs: 250,
    });
    await waitForQueue(gm);
    now.value += 251;

    expect(await gm.expirePending()).toBe(1);
    await expect(pending).resolves.toMatchObject({
      status: "expired",
      errorCode: "APPROVAL_EXPIRED",
    });
    expect(execute).not.toHaveBeenCalled();
    expect(await gm.getQueue()).toEqual([]);
    expect((await gm.getAuditLog()).map(item => item.status)).toEqual([
      "queued",
      "expired",
    ]);
  });

  it("supports deny and log policy modes without delegating policy choice to the client", async () => {
    const { gm, player } = await createHarness("deny");
    const execute = vi.fn(() => "done");
    gm.registerHandler("policy-test", { validate: () => true, execute });

    await expect(player.requestDetailed({
      handlerId: "policy-test",
      category: "condition",
      payload: {},
    })).resolves.toMatchObject({ status: "rejected", errorCode: "POLICY_DENIED" });
    expect(execute).not.toHaveBeenCalled();

    await gm.setPolicyConfiguration({ default: "log" });
    await expect(player.request({
      handlerId: "policy-test",
      category: "condition",
      payload: {},
    })).resolves.toBe("done");
    expect(execute).toHaveBeenCalledTimes(1);
    expect((await gm.getAuditLog()).at(-1)).toMatchObject({
      policy: "log",
      status: "executed",
    });
  });
});
