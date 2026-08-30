import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTHORITY_BRIDGE_PROTOCOL_VERSION,
  AUTHORITY_BRIDGE_SETTING_KEYS,
  AuthorityBridge,
  type AuthorityBridgeStorage,
  type AuthorityPolicyMode,
  type AuthorityRequestEnvelope,
  type AuthorityResponse,
  type AuthoritySocket,
  type AuthoritySocketMessage,
  type AuthorityUserLike,
  type AuthorityUserProvider,
  MemoryAuthorityBridgeStorage,
  selectAuthorityPrimaryGM,
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

class PersistedTestUserProvider implements AuthorityUserProvider {
  constructor(
    private readonly current: AuthorityUserLike,
    private readonly users: AuthorityUserLike[],
    private readonly persisted: Map<string, AuthorityRequestEnvelope>,
    private readonly responses?: Map<string, AuthorityResponse>,
  ) {}

  getCurrentUser(): AuthorityUserLike { return this.current; }
  getUsers(): Iterable<AuthorityUserLike> { return this.users; }

  async attestRequest(request: AuthorityRequestEnvelope): Promise<string> {
    const nonce = `nonce-${request.requestId}`;
    this.persisted.set(request.requestId, { ...request, attestation: nonce });
    return nonce;
  }

  verifyRequestAttestation(request: AuthorityRequestEnvelope): boolean {
    return this.persisted.get(request.requestId)?.attestation === request.attestation
      && request.requesterId === this.persisted.get(request.requestId)?.requesterId;
  }

  getPersistedRequests(): Iterable<AuthorityRequestEnvelope> {
    return this.persisted.values();
  }

  releasePersistedRequest(requestId: string): void { this.persisted.delete(requestId); }
  persistResponse(response: AuthorityResponse): void { this.responses?.set(response.requestId, response); }
  getPersistedResponses(): Iterable<AuthorityResponse> { return this.responses?.values() ?? []; }
  releasePersistedResponse(requestId: string): void { this.responses?.delete(requestId); }
}

class DroppingAuthoritySocket extends TestSocket {
  override emit(channel: string, message: AuthoritySocketMessage): void {
    void channel;
    void message;
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
  it("recovers request and response from persistent state when socket delivery is lost", async () => {
    const socket = new DroppingAuthoritySocket();
    const storage = new MemoryAuthorityBridgeStorage();
    const persisted = new Map<string, AuthorityRequestEnvelope>();
    const users: AuthorityUserLike[] = [
      { id: "gm-a", active: true, isGM: true, name: "Primary" },
      { id: "gm-b", active: true, isGM: true, name: "Secondary" },
    ];
    const common = { socket, storage, expirationIntervalMs: 60_000, requestTimeoutMs: 5_000 };
    const primary = new AuthorityBridge({
      ...common,
      users: new PersistedTestUserProvider(users[0], users, persisted),
    });
    const secondary = new AuthorityBridge({
      ...common,
      users: new PersistedTestUserProvider(users[1], users, persisted),
    });
    activeBridges.push(primary, secondary);
    primary.start();
    secondary.start();
    await primary.setPolicyConfiguration({ default: "auto" });
    const execute = vi.fn(() => ({ saved: true }));
    primary.registerHandler("persisted-admin", { validate: () => true, execute });

    const pending = secondary.request({
      handlerId: "persisted-admin",
      category: "administration",
      payload: { operation: "store.upsert" },
    });
    await vi.waitFor(() => expect(persisted.size).toBe(1));
    expect(await primary.recoverPersistedRequests()).toBe(1);
    expect(await secondary.recoverPersistedResponses()).toBe(0);
    expect(await secondary.recoverAuditResponses()).toBe(1);

    await expect(pending).resolves.toEqual({ saved: true });
    expect(execute).toHaveBeenCalledOnce();
    expect(await primary.recoverPersistedRequests()).toBe(0);
  });

  it("elects the active GM with the smallest id and hands authority off deterministically", async () => {
    const socket = new TestSocket();
    const storage = new MemoryAuthorityBridgeStorage();
    const users: AuthorityUserLike[] = [
      { id: "gm-b", active: true, isGM: true, name: "Secondary" },
      { id: "gm-a", active: true, isGM: true, name: "Primary" },
      { id: "player-a", active: true, isGM: false, name: "Player" },
    ];
    const gmA = new AuthorityBridge({
      socket,
      storage,
      users: new TestUserProvider(users[1], users),
      expirationIntervalMs: 60_000,
    });
    const gmB = new AuthorityBridge({
      socket,
      storage,
      users: new TestUserProvider(users[0], users),
      expirationIntervalMs: 60_000,
    });
    activeBridges.push(gmA, gmB);

    expect(selectAuthorityPrimaryGM(users)?.id).toBe("gm-a");
    expect(gmA.isPrimaryGM()).toBe(true);
    expect(gmB.isPrimaryGM()).toBe(false);
    await expect(gmB.setPolicyConfiguration({ default: "deny" }))
      .rejects.toMatchObject({ code: "PRIMARY_GM_REQUIRED" });

    users[1].active = false;
    expect(selectAuthorityPrimaryGM(users)?.id).toBe("gm-b");
    expect(gmB.isPrimaryGM()).toBe(true);
    await expect(gmB.setPolicyConfiguration({ default: "log" })).resolves.toBeUndefined();
    await expect(gmA.setPolicyConfiguration({ default: "auto" }))
      .rejects.toMatchObject({ code: "PRIMARY_GM_REQUIRED" });
  });

  it("filters queue and audit projections for Players while GMs can read the full settings", async () => {
    const storage = new MemoryAuthorityBridgeStorage();
    const users: AuthorityUserLike[] = [
      { id: "gm-a", active: true, isGM: true },
      { id: "player-a", active: true, isGM: false },
      { id: "player-b", active: true, isGM: false },
    ];
    const request = (requesterId: string, suffix: string) => ({
      protocolVersion: AUTHORITY_BRIDGE_PROTOCOL_VERSION,
      requestId: `request-${suffix}`,
      idempotencyKey: `operation-${suffix}`,
      requesterId,
      handlerId: "test",
      category: "effect" as const,
      payload: {},
      createdAt: 1,
      expiresAt: 10_000,
    });
    await storage.write(AUTHORITY_BRIDGE_SETTING_KEYS.queue, [
      { id: "queue-a", replayKey: "a", signature: "a", policy: "approval", request: request("player-a", "a"), aliases: [], queuedAt: 1, expiresAt: 10_000 },
      { id: "queue-b", replayKey: "b", signature: "b", policy: "approval", request: request("player-b", "b"), aliases: [], queuedAt: 1, expiresAt: 10_000 },
    ]);
    await storage.write(AUTHORITY_BRIDGE_SETTING_KEYS.audit, [
      { id: "audit-a", timestamp: 1, requestId: "request-a", idempotencyKey: "operation-a", requesterId: "player-a", handlerId: "test", category: "effect", policy: "approval", status: "queued" },
      { id: "audit-b", timestamp: 1, requestId: "request-b", idempotencyKey: "operation-b", requesterId: "player-b", handlerId: "test", category: "effect", policy: "approval", status: "queued" },
    ]);
    const player = new AuthorityBridge({ storage, users: new TestUserProvider(users[1], users), expirationIntervalMs: 60_000 });
    const gm = new AuthorityBridge({ storage, users: new TestUserProvider(users[0], users), expirationIntervalMs: 60_000 });
    activeBridges.push(player, gm);

    expect((await player.getQueue()).map(entry => entry.id)).toEqual(["queue-a"]);
    expect((await player.getAuditLog()).map(entry => entry.id)).toEqual(["audit-a"]);
    expect(await gm.getQueue()).toHaveLength(2);
    expect(await gm.getAuditLog()).toHaveLength(2);
  });

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
