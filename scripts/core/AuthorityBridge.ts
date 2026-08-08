const DEFAULT_MODULE_ID = "ethernum-rpg-module";
const DEFAULT_REQUEST_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_APPROVAL_TTL_MS = 2 * 60_000;
const DEFAULT_EXPIRATION_INTERVAL_MS = 1_000;
const DEFAULT_REPLAY_TTL_MS = 10 * 60_000;
const DEFAULT_REPLAY_LIMIT = 500;
const DEFAULT_AUDIT_LIMIT = 500;
const DEFAULT_QUEUE_LIMIT = 250;

export const AUTHORITY_BRIDGE_PROTOCOL_VERSION = 2;

export const AUTHORITY_BRIDGE_SETTING_KEYS = Object.freeze({
  queue: "authorityBridgeQueue",
  audit: "authorityBridgeAudit",
  policies: "authorityBridgePolicies",
});

export type AuthorityPolicyMode = "auto" | "approval" | "deny" | "log";

export type AuthorityRequestCategory =
  | "actor-damage"
  | "actor-healing"
  | "condition"
  | "effect"
  | "canvas"
  | "multi-target"
  | "reaction"
  | "out-of-turn"
  | (string & {});

export type AuthorityResponseStatus =
  | "executed"
  | "rejected"
  | "failed"
  | "expired"
  | "cancelled";

export type AuthorityAuditStatus =
  | "queued"
  | "approved"
  | "rejected"
  | "executed"
  | "failed"
  | "expired"
  | "cancelled"
  | "duplicate";

export interface AuthorityUserLike {
  id: string;
  active: boolean;
  isGM: boolean;
  name?: string;
}

export interface AuthorityUserProvider {
  getCurrentUser(): AuthorityUserLike | null;
  getUsers(): Iterable<AuthorityUserLike>;
}

export interface AuthoritySocket {
  on(channel: string, callback: (message: AuthoritySocketMessage) => void): void;
  off?(channel: string, callback: (message: AuthoritySocketMessage) => void): void;
  emit(channel: string, message: AuthoritySocketMessage): void;
}

export interface AuthorityBridgeStorage {
  read<T>(key: string, fallback: T): Promise<T> | T;
  write<T>(key: string, value: T): Promise<void> | void;
}

export interface AuthorityPolicyConfiguration {
  default: AuthorityPolicyMode;
  categories?: Record<string, AuthorityPolicyMode>;
  profiles?: Record<string, AuthorityPolicyMode>;
  handlers?: Record<string, AuthorityPolicyMode>;
}

export interface AuthorityRequestEnvelope<TPayload = unknown> {
  protocolVersion: typeof AUTHORITY_BRIDGE_PROTOCOL_VERSION;
  requestId: string;
  idempotencyKey: string;
  requesterId: string;
  handlerId: string;
  category: AuthorityRequestCategory;
  profileId?: string;
  actionId?: string;
  executionId?: string;
  sourceActorUuid?: string;
  summary?: string;
  details?: string;
  payload: TPayload;
  createdAt: number;
  expiresAt: number;
}

export interface AuthorityResponse<TResult = unknown> {
  protocolVersion: typeof AUTHORITY_BRIDGE_PROTOCOL_VERSION;
  requestId: string;
  requesterId: string;
  responderId: string;
  handlerId: string;
  status: AuthorityResponseStatus;
  completedAt: number;
  result?: TResult;
  error?: string;
  errorCode?: string;
  duplicate?: boolean;
}

export interface AuthorityRequestMessage {
  type: "authority-bridge-request";
  request: AuthorityRequestEnvelope;
}

export interface AuthorityResponseMessage {
  type: "authority-bridge-response";
  response: AuthorityResponse;
}

export type AuthoritySocketMessage = AuthorityRequestMessage | AuthorityResponseMessage;

export interface AuthorityRequestInput<TPayload = unknown> {
  handlerId: string;
  category: AuthorityRequestCategory;
  payload: TPayload;
  profileId?: string;
  actionId?: string;
  executionId?: string;
  sourceActorUuid?: string;
  summary?: string;
  details?: string;
  requestId?: string;
  idempotencyKey?: string;
  approvalTtlMs?: number;
  timeoutMs?: number;
}

export interface AuthorityHandlerContext<TPayload = unknown> {
  request: AuthorityRequestEnvelope<TPayload>;
  requester: AuthorityUserLike;
  authority: AuthorityUserLike;
  phase: "initial" | "approval";
  now: number;
}

export type AuthorityValidationResult<TPayload> =
  | void
  | boolean
  | { payload?: TPayload };

export interface AuthorityHandler<TPayload = unknown, TResult = unknown> {
  validate(
    context: AuthorityHandlerContext<TPayload>,
  ): AuthorityValidationResult<TPayload> | Promise<AuthorityValidationResult<TPayload>>;
  execute(context: AuthorityHandlerContext<TPayload>): TResult | Promise<TResult>;
}

export interface AuthorityQueueAlias {
  requestId: string;
  requesterId: string;
}

export interface AuthorityQueueEntry {
  id: string;
  replayKey: string;
  signature: string;
  policy: AuthorityPolicyMode;
  request: AuthorityRequestEnvelope;
  aliases: AuthorityQueueAlias[];
  queuedAt: number;
  expiresAt: number;
}

export interface AuthorityAuditEntry {
  id: string;
  timestamp: number;
  requestId: string;
  idempotencyKey: string;
  requesterId: string;
  handlerId: string;
  category: AuthorityRequestCategory;
  profileId?: string;
  actionId?: string;
  executionId?: string;
  sourceActorUuid?: string;
  policy: AuthorityPolicyMode;
  status: AuthorityAuditStatus;
  summary?: string;
  error?: string;
  latencyMs?: number;
  duplicateOf?: string;
  result?: unknown;
}

export interface AuthorityDiagnostics {
  currentUserId: string | null;
  primaryGMId: string | null;
  isPrimaryGM: boolean;
  registeredHandlers: string[];
  pendingClientRequests: number;
  queuedRequests: number;
  replayCacheSize: number;
  auditEntries: number;
  receivedRequests: number;
  executedRequests: number;
  failedRequests: number;
  duplicateRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  expiredRequests: number;
  averageLatencyMs: number;
  lastRequestAt: number | null;
  lastResponseAt: number | null;
  lastError: string | null;
}

export interface AuthorityExport {
  protocolVersion: typeof AUTHORITY_BRIDGE_PROTOCOL_VERSION;
  exportedAt: number;
  policies: AuthorityPolicyConfiguration;
  queue: AuthorityQueueEntry[];
  audit: AuthorityAuditEntry[];
  diagnostics: AuthorityDiagnostics;
}

export interface AuthorityReconcileResult {
  kept: number;
  mergedDuplicates: number;
  expired: number;
  missingHandlers: string[];
}

export interface AuthorityBridgeEvent {
  type: "queue" | "audit" | "response" | "policies";
  requestId?: string;
}

export interface AuthorityBridgeOptions {
  moduleId?: string;
  channel?: string;
  socket?: AuthoritySocket;
  storage?: AuthorityBridgeStorage;
  users?: AuthorityUserProvider;
  settingKeys?: Partial<typeof AUTHORITY_BRIDGE_SETTING_KEYS>;
  requestTimeoutMs?: number;
  approvalTtlMs?: number;
  expirationIntervalMs?: number;
  replayTtlMs?: number;
  replayLimit?: number;
  auditLimit?: number;
  queueLimit?: number;
  now?: () => number;
  randomId?: () => string;
}

interface PendingClientRequest {
  promise: Promise<AuthorityResponse>;
  resolve(response: AuthorityResponse): void;
  reject(error: Error): void;
  timeout: ReturnType<typeof setTimeout>;
}

interface ReplayRecord {
  signature: string;
  policy: AuthorityPolicyMode;
  response: AuthorityResponse;
}

interface InFlightRequest {
  signature: string;
  request: AuthorityRequestEnvelope;
  aliases: Map<string, AuthorityQueueAlias>;
  policy?: AuthorityPolicyMode;
  queueId?: string;
}

interface AuthorityMetrics {
  received: number;
  executed: number;
  failed: number;
  duplicate: number;
  approved: number;
  rejected: number;
  expired: number;
  totalLatencyMs: number;
  lastRequestAt: number | null;
  lastResponseAt: number | null;
  lastError: string | null;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class BoundedReplayCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly limit = DEFAULT_REPLAY_LIMIT,
    private readonly ttlMs = DEFAULT_REPLAY_TTL_MS,
    private readonly now: () => number = Date.now,
  ) {}

  get size(): number {
    this.prune();
    return this.entries.size;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    this.prune();
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: this.now() + Math.max(1, this.ttlMs),
    });
    while (this.entries.size > Math.max(1, this.limit)) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  prune(): number {
    const now = this.now();
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt > now) continue;
      this.entries.delete(key);
      removed += 1;
    }
    return removed;
  }
}

export class MemoryAuthorityBridgeStorage implements AuthorityBridgeStorage {
  private readonly values = new Map<string, unknown>();

  read<T>(key: string, fallback: T): T {
    return (this.values.has(key) ? this.values.get(key) : fallback) as T;
  }

  write<T>(key: string, value: T): void {
    this.values.set(key, value);
  }
}

export class FoundryAuthorityBridgeStorage implements AuthorityBridgeStorage {
  constructor(private readonly moduleId = DEFAULT_MODULE_ID) {}

  async read<T>(key: string, fallback: T): Promise<T> {
    const settings = game.settings as unknown as {
      get(scope: string, setting: string): unknown;
    };
    const value = settings.get(this.moduleId, key);
    return (value ?? fallback) as T;
  }

  async write<T>(key: string, value: T): Promise<void> {
    const settings = game.settings as unknown as {
      set(scope: string, setting: string, next: unknown): Promise<unknown>;
    };
    await settings.set(this.moduleId, key, value);
  }
}

export class FoundryAuthoritySocket implements AuthoritySocket {
  on(channel: string, callback: (message: AuthoritySocketMessage) => void): void {
    const socket = game.socket as unknown as {
      on(name: string, listener: (message: AuthoritySocketMessage) => void): void;
    };
    socket.on(channel, callback);
  }

  off(channel: string, callback: (message: AuthoritySocketMessage) => void): void {
    const socket = game.socket as unknown as {
      off?: (name: string, listener: (message: AuthoritySocketMessage) => void) => void;
    };
    socket.off?.(channel, callback);
  }

  emit(channel: string, message: AuthoritySocketMessage): void {
    const socket = game.socket as unknown as {
      emit(name: string, payload: AuthoritySocketMessage): void;
    };
    socket.emit(channel, message);
  }
}

export class FoundryAuthorityUserProvider implements AuthorityUserProvider {
  getCurrentUser(): AuthorityUserLike | null {
    return toAuthorityUser(game.user);
  }

  getUsers(): Iterable<AuthorityUserLike> {
    const users = game.users ? [...game.users] : [];
    return users.map(toAuthorityUser).filter((user): user is AuthorityUserLike => Boolean(user));
  }
}

export class AuthorityBridgeError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: AuthorityResponseStatus,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "AuthorityBridgeError";
  }

  static fromResponse(response: AuthorityResponse): AuthorityBridgeError {
    return new AuthorityBridgeError(
      response.error ?? `Authority request ${response.status}.`,
      response.errorCode ?? response.status.toUpperCase(),
      response.status,
      response.requestId,
    );
  }
}

export function selectAuthorityPrimaryGM(
  users: Iterable<AuthorityUserLike>,
): AuthorityUserLike | null {
  return [...users]
    .filter(user => user.active && user.isGM && user.id.length > 0)
    .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)[0] ?? null;
}

export class AuthorityBridge {
  readonly moduleId: string;
  readonly channel: string;

  private readonly socket: AuthoritySocket;
  private readonly storage: AuthorityBridgeStorage;
  private readonly users: AuthorityUserProvider;
  private readonly settingKeys: typeof AUTHORITY_BRIDGE_SETTING_KEYS;
  private readonly requestTimeoutMs: number;
  private readonly approvalTtlMs: number;
  private readonly expirationIntervalMs: number;
  private readonly auditLimit: number;
  private readonly queueLimit: number;
  private readonly now: () => number;
  private readonly randomId: () => string;
  private readonly replay: BoundedReplayCache<ReplayRecord>;
  private readonly handlers = new Map<string, AuthorityHandler>();
  private readonly pendingClients = new Map<string, PendingClientRequest>();
  private readonly inFlight = new Map<string, InFlightRequest>();
  private readonly requestLocks = new Map<string, Promise<void>>();
  private readonly listeners = new Set<(event: AuthorityBridgeEvent) => void>();
  private storageTail: Promise<void> = Promise.resolve();
  private expirationTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private readonly metrics: AuthorityMetrics = {
    received: 0,
    executed: 0,
    failed: 0,
    duplicate: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    totalLatencyMs: 0,
    lastRequestAt: null,
    lastResponseAt: null,
    lastError: null,
  };

  private readonly socketListener = (message: AuthoritySocketMessage): void => {
    void this.handleSocketMessage(message);
  };

  constructor(options: AuthorityBridgeOptions = {}) {
    this.moduleId = options.moduleId ?? DEFAULT_MODULE_ID;
    this.channel = options.channel ?? `module.${this.moduleId}`;
    this.socket = options.socket ?? new FoundryAuthoritySocket();
    this.storage = options.storage ?? new FoundryAuthorityBridgeStorage(this.moduleId);
    this.users = options.users ?? new FoundryAuthorityUserProvider();
    this.settingKeys = {
      ...AUTHORITY_BRIDGE_SETTING_KEYS,
      ...options.settingKeys,
    };
    this.requestTimeoutMs = positive(options.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS);
    this.approvalTtlMs = positive(options.approvalTtlMs, DEFAULT_APPROVAL_TTL_MS);
    this.expirationIntervalMs = positive(
      options.expirationIntervalMs,
      DEFAULT_EXPIRATION_INTERVAL_MS,
    );
    this.auditLimit = positive(options.auditLimit, DEFAULT_AUDIT_LIMIT);
    this.queueLimit = positive(options.queueLimit, DEFAULT_QUEUE_LIMIT);
    this.now = options.now ?? Date.now;
    this.randomId = options.randomId ?? defaultRandomId;
    this.replay = new BoundedReplayCache(
      positive(options.replayLimit, DEFAULT_REPLAY_LIMIT),
      positive(options.replayTtlMs, DEFAULT_REPLAY_TTL_MS),
      this.now,
    );
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.socket.on(this.channel, this.socketListener);
    this.expirationTimer = setInterval(() => {
      if (!this.isPrimaryGM()) return;
      void this.expirePending().catch(error => this.recordInternalError(error));
    }, this.expirationIntervalMs);
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.socket.off?.(this.channel, this.socketListener);
    if (this.expirationTimer) clearInterval(this.expirationTimer);
    this.expirationTimer = null;
    for (const [requestId, pending] of this.pendingClients) {
      clearTimeout(pending.timeout);
      pending.reject(new AuthorityBridgeError(
        "Authority bridge stopped before the request completed.",
        "BRIDGE_STOPPED",
        "cancelled",
        requestId,
      ));
    }
    this.pendingClients.clear();
  }

  registerHandler<TPayload, TResult>(
    handlerId: string,
    handler: AuthorityHandler<TPayload, TResult>,
    options: { replace?: boolean } = {},
  ): () => void {
    if (!handlerId.trim()) throw new Error("Authority handler id cannot be empty.");
    if (this.handlers.has(handlerId) && !options.replace) {
      throw new Error(`Authority handler \"${handlerId}\" is already registered.`);
    }
    this.handlers.set(handlerId, handler as AuthorityHandler);
    return () => {
      if (this.handlers.get(handlerId) === handler) this.handlers.delete(handlerId);
    };
  }

  subscribe(listener: (event: AuthorityBridgeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getPrimaryGM(): AuthorityUserLike | null {
    return selectAuthorityPrimaryGM(this.users.getUsers());
  }

  isPrimaryGM(): boolean {
    const current = this.users.getCurrentUser();
    const primary = this.getPrimaryGM();
    return Boolean(current?.id && primary?.id === current.id);
  }

  async request<TPayload, TResult>(input: AuthorityRequestInput<TPayload>): Promise<TResult> {
    const response = await this.requestDetailed<TPayload, TResult>(input);
    if (response.status !== "executed") throw AuthorityBridgeError.fromResponse(response);
    return response.result as TResult;
  }

  async requestDetailed<TPayload, TResult>(
    input: AuthorityRequestInput<TPayload>,
  ): Promise<AuthorityResponse<TResult>> {
    this.start();
    const requester = this.users.getCurrentUser();
    if (!requester?.id) {
      throw new AuthorityBridgeError("No active requester is available.", "NO_REQUESTER");
    }
    const primary = this.getPrimaryGM();
    if (!primary) {
      throw new AuthorityBridgeError("No active primary GM is available.", "NO_PRIMARY_GM");
    }

    const requestId = input.requestId?.trim() || this.randomId();
    const existing = this.pendingClients.get(requestId);
    if (existing) return existing.promise as Promise<AuthorityResponse<TResult>>;

    const createdAt = this.now();
    const request: AuthorityRequestEnvelope<TPayload> = {
      protocolVersion: AUTHORITY_BRIDGE_PROTOCOL_VERSION,
      requestId,
      idempotencyKey: input.idempotencyKey?.trim() || requestId,
      requesterId: requester.id,
      handlerId: input.handlerId,
      category: input.category,
      profileId: input.profileId,
      actionId: input.actionId,
      executionId: input.executionId,
      sourceActorUuid: input.sourceActorUuid,
      summary: input.summary,
      details: input.details,
      payload: input.payload,
      createdAt,
      expiresAt: createdAt + positive(input.approvalTtlMs, this.approvalTtlMs),
    };

    let resolveResponse!: (response: AuthorityResponse) => void;
    let rejectResponse!: (error: Error) => void;
    const promise = new Promise<AuthorityResponse>((resolve, reject) => {
      resolveResponse = resolve;
      rejectResponse = reject;
    });
    const timeout = setTimeout(() => {
      this.pendingClients.delete(requestId);
      rejectResponse(new AuthorityBridgeError(
        "The primary GM did not complete the authority request in time.",
        "REQUEST_TIMEOUT",
        undefined,
        requestId,
      ));
    }, positive(input.timeoutMs, this.requestTimeoutMs));
    this.pendingClients.set(requestId, {
      promise,
      resolve: resolveResponse,
      reject: rejectResponse,
      timeout,
    });

    const message: AuthorityRequestMessage = { type: "authority-bridge-request", request };
    try {
      if (this.isPrimaryGM()) await this.handleRequest(request);
      else this.socket.emit(this.channel, message);
    } catch (error) {
      clearTimeout(timeout);
      this.pendingClients.delete(requestId);
      rejectResponse(asError(error));
    }
    return promise as Promise<AuthorityResponse<TResult>>;
  }

  async handleSocketMessage(message: AuthoritySocketMessage): Promise<void> {
    if (!message || typeof message !== "object") return;
    if (message.type === "authority-bridge-request") {
      if (this.isPrimaryGM()) await this.handleRequest(message.request);
      return;
    }
    if (message.type === "authority-bridge-response") this.handleResponse(message.response);
  }

  async getPolicyConfiguration(): Promise<AuthorityPolicyConfiguration> {
    const stored = await this.storage.read<AuthorityPolicyConfiguration>(
      this.settingKeys.policies,
      { default: "auto" },
    );
    return normalizePolicies(stored);
  }

  async setPolicyConfiguration(configuration: AuthorityPolicyConfiguration): Promise<void> {
    this.assertPrimaryGM();
    await this.storage.write(this.settingKeys.policies, normalizePolicies(configuration));
    this.emitEvent({ type: "policies" });
  }

  async getQueue(): Promise<AuthorityQueueEntry[]> {
    const queue = await this.storage.read<AuthorityQueueEntry[]>(this.settingKeys.queue, []);
    return Array.isArray(queue) ? queue : [];
  }

  async getAuditLog(): Promise<AuthorityAuditEntry[]> {
    const audit = await this.storage.read<AuthorityAuditEntry[]>(this.settingKeys.audit, []);
    return Array.isArray(audit) ? audit : [];
  }

  async approve(queueId: string): Promise<AuthorityResponse | null> {
    this.assertPrimaryGM();
    const entry = await this.claimQueueEntry(queueId);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      return this.completeQueueEntry(entry, "expired", undefined, {
        error: "The approval request expired.",
        errorCode: "APPROVAL_EXPIRED",
      });
    }

    const handler = this.handlers.get(entry.request.handlerId);
    if (!handler) {
      return this.completeQueueEntry(entry, "failed", undefined, {
        error: `Authority handler \"${entry.request.handlerId}\" is not registered.`,
        errorCode: "HANDLER_NOT_REGISTERED",
      });
    }

    try {
      const active = this.inFlight.get(entry.replayKey);
      if (active) entry.aliases = mergeAliases(entry.aliases, [...active.aliases.values()]);
      const request = await this.validateRequest(entry.request, handler, "approval");
      entry.request = request;
      this.metrics.approved += 1;
      await this.appendAuditSafely(this.auditEntry(entry, "approved"));
      return await this.execute(entry.request, handler, entry.policy, entry.aliases, entry.signature);
    } catch (error) {
      return this.completeQueueEntry(entry, "failed", undefined, {
        error: asError(error).message,
        errorCode: "APPROVAL_REVALIDATION_FAILED",
      });
    }
  }

  async reject(queueId: string, reason = "The primary GM rejected the request."): Promise<AuthorityResponse | null> {
    this.assertPrimaryGM();
    const entry = await this.claimQueueEntry(queueId);
    if (!entry) return null;
    this.metrics.rejected += 1;
    return this.completeQueueEntry(entry, "rejected", undefined, {
      error: reason,
      errorCode: "APPROVAL_REJECTED",
    });
  }

  async expirePending(at = this.now()): Promise<number> {
    this.assertPrimaryGM();
    const expired = await this.withStorageLock(async () => {
      const queue = await this.getQueue();
      const stale = queue.filter(entry => entry.expiresAt <= at);
      if (stale.length > 0) {
        const staleIds = new Set(stale.map(entry => entry.id));
        await this.storage.write(
          this.settingKeys.queue,
          queue.filter(entry => !staleIds.has(entry.id)),
        );
      }
      return stale;
    });
    if (expired.length > 0) this.emitEvent({ type: "queue" });
    for (const entry of expired) {
      await this.completeQueueEntry(entry, "expired", undefined, {
        error: "The approval request expired.",
        errorCode: "APPROVAL_EXPIRED",
      });
    }
    return expired.length;
  }

  async clearAuditLog(): Promise<void> {
    this.assertPrimaryGM();
    await this.storage.write(this.settingKeys.audit, []);
    this.emitEvent({ type: "audit" });
  }

  async clearQueue(reason = "The authority queue was cleared."): Promise<number> {
    this.assertPrimaryGM();
    const entries = await this.withStorageLock(async () => {
      const queue = await this.getQueue();
      await this.storage.write(this.settingKeys.queue, []);
      return queue;
    });
    if (entries.length > 0) this.emitEvent({ type: "queue" });
    for (const entry of entries) {
      await this.completeQueueEntry(entry, "cancelled", undefined, {
        error: reason,
        errorCode: "QUEUE_CLEARED",
      });
    }
    return entries.length;
  }

  clearReplayCache(): void {
    this.replay.clear();
  }

  async reconcile(): Promise<AuthorityReconcileResult> {
    this.assertPrimaryGM();
    const now = this.now();
    const expired: AuthorityQueueEntry[] = [];
    let mergedDuplicates = 0;
    const queue = await this.withStorageLock(async () => {
      const stored = await this.getQueue();
      const byReplay = new Map<string, AuthorityQueueEntry>();
      for (const entry of stored) {
        if (entry.expiresAt <= now) {
          expired.push(entry);
          continue;
        }
        const existing = byReplay.get(entry.replayKey);
        if (!existing) {
          byReplay.set(entry.replayKey, entry);
          continue;
        }
        mergedDuplicates += 1;
        existing.aliases = mergeAliases(existing.aliases, entry.aliases);
        existing.expiresAt = Math.max(existing.expiresAt, entry.expiresAt);
      }
      const reconciled = [...byReplay.values()].slice(-this.queueLimit);
      await this.storage.write(this.settingKeys.queue, reconciled);
      return reconciled;
    });

    for (const entry of expired) {
      await this.completeQueueEntry(entry, "expired", undefined, {
        error: "The approval request expired during reconciliation.",
        errorCode: "APPROVAL_EXPIRED",
      });
    }
    if (expired.length > 0 || mergedDuplicates > 0) this.emitEvent({ type: "queue" });
    return {
      kept: queue.length,
      mergedDuplicates,
      expired: expired.length,
      missingHandlers: [...new Set(queue
        .filter(entry => !this.handlers.has(entry.request.handlerId))
        .map(entry => entry.request.handlerId))],
    };
  }

  async getDiagnostics(): Promise<AuthorityDiagnostics> {
    const [queue, audit] = await Promise.all([this.getQueue(), this.getAuditLog()]);
    const primary = this.getPrimaryGM();
    const current = this.users.getCurrentUser();
    return {
      currentUserId: current?.id ?? null,
      primaryGMId: primary?.id ?? null,
      isPrimaryGM: Boolean(current?.id && current.id === primary?.id),
      registeredHandlers: [...this.handlers.keys()].sort(),
      pendingClientRequests: this.pendingClients.size,
      queuedRequests: queue.length,
      replayCacheSize: this.replay.size,
      auditEntries: audit.length,
      receivedRequests: this.metrics.received,
      executedRequests: this.metrics.executed,
      failedRequests: this.metrics.failed,
      duplicateRequests: this.metrics.duplicate,
      approvedRequests: this.metrics.approved,
      rejectedRequests: this.metrics.rejected,
      expiredRequests: this.metrics.expired,
      averageLatencyMs: this.metrics.executed > 0
        ? Math.round(this.metrics.totalLatencyMs / this.metrics.executed)
        : 0,
      lastRequestAt: this.metrics.lastRequestAt,
      lastResponseAt: this.metrics.lastResponseAt,
      lastError: this.metrics.lastError,
    };
  }

  async exportState(): Promise<AuthorityExport> {
    const [policies, queue, audit, diagnostics] = await Promise.all([
      this.getPolicyConfiguration(),
      this.getQueue(),
      this.getAuditLog(),
      this.getDiagnostics(),
    ]);
    return {
      protocolVersion: AUTHORITY_BRIDGE_PROTOCOL_VERSION,
      exportedAt: this.now(),
      policies,
      queue,
      audit,
      diagnostics,
    };
  }

  private async handleRequest(
    request: AuthorityRequestEnvelope,
    replayLocked = false,
  ): Promise<void> {
    if (!this.isPrimaryGM()) return;
    if (!isRequestEnvelope(request)) return;

    const replayKey = makeReplayKey(request);
    if (!replayLocked) {
      this.metrics.received += 1;
      this.metrics.lastRequestAt = this.now();
      return this.withRequestLock(replayKey, () => this.handleRequest(request, true));
    }

    if (request.expiresAt <= this.now()) {
      await this.completeRequest(
        request,
        "approval",
        [aliasFromRequest(request)],
        requestSignature(request),
        "expired",
        undefined,
        { error: "The authority request arrived after its expiry time.", errorCode: "REQUEST_EXPIRED" },
      );
      return;
    }

    const signature = requestSignature(request);
    const cached = this.replay.get(replayKey);
    if (cached) {
      if (cached.signature !== signature) {
        await this.completeConflict(request, "The idempotency key was reused with a different payload.");
        return;
      }
      this.metrics.duplicate += 1;
      await this.appendAuditSafely(this.auditEntryFromRequest(request, cached.policy, "duplicate", {
        duplicateOf: cached.response.requestId,
      }));
      this.deliverResponse({
        ...cached.response,
        requestId: request.requestId,
        requesterId: request.requesterId,
        completedAt: this.now(),
        duplicate: true,
      });
      return;
    }

    const terminalAudit = [...await this.getAuditLog()].reverse().find(entry => (
      entry.requesterId === request.requesterId
      && entry.idempotencyKey === request.idempotencyKey
      && ["executed", "failed", "rejected", "expired", "cancelled"].includes(entry.status)
    ));
    if (terminalAudit) {
      this.metrics.duplicate += 1;
      await this.appendAuditSafely(this.auditEntryFromRequest(request, terminalAudit.policy, "duplicate", {
        duplicateOf: terminalAudit.requestId,
      }));
      const canReplayResult = terminalAudit.status === "executed"
        && Object.prototype.hasOwnProperty.call(terminalAudit, "result");
      this.deliverResponse({
        protocolVersion: AUTHORITY_BRIDGE_PROTOCOL_VERSION,
        requestId: request.requestId,
        requesterId: request.requesterId,
        responderId: this.users.getCurrentUser()?.id ?? "",
        handlerId: request.handlerId,
        status: canReplayResult ? "executed" : "cancelled",
        completedAt: this.now(),
        ...(canReplayResult
          ? { result: terminalAudit.result }
          : {
            error: "The request was already processed by a previous primary GM.",
            errorCode: "PERSISTED_DUPLICATE",
          }),
        duplicate: true,
      });
      return;
    }

    const active = this.inFlight.get(replayKey);
    if (active) {
      if (active.signature !== signature) {
        await this.completeConflict(request, "The idempotency key is active with a different payload.");
        return;
      }
      await this.addDuplicateAlias(active, request);
      return;
    }

    const queued = (await this.getQueue()).find(entry => entry.replayKey === replayKey);
    if (queued) {
      if (queued.signature !== signature) {
        await this.completeConflict(request, "The idempotency key is queued with a different payload.");
        return;
      }
      const restored: InFlightRequest = {
        signature,
        request: queued.request,
        aliases: new Map(queued.aliases.map(alias => [alias.requestId, alias])),
        queueId: queued.id,
      };
      this.inFlight.set(replayKey, restored);
      await this.addDuplicateAlias(restored, request);
      return;
    }

    const flight: InFlightRequest = {
      signature,
      request,
      aliases: new Map([[request.requestId, aliasFromRequest(request)]]),
    };
    this.inFlight.set(replayKey, flight);

    const handler = this.handlers.get(request.handlerId);
    if (!handler) {
      await this.completeRequest(request, "auto", flight.aliases.values(), signature, "failed", undefined, {
        error: `Authority handler \"${request.handlerId}\" is not registered.`,
        errorCode: "HANDLER_NOT_REGISTERED",
      });
      return;
    }

    try {
      const validated = await this.validateRequest(request, handler, "initial");
      flight.request = validated;
      const policy = await this.resolvePolicy(validated);
      flight.policy = policy;
      if (policy === "deny") {
        this.metrics.rejected += 1;
        await this.completeRequest(
          validated,
          policy,
          flight.aliases.values(),
          signature,
          "rejected",
          undefined,
          { error: "Authority policy denied the request.", errorCode: "POLICY_DENIED" },
        );
        return;
      }
      if (policy === "approval") {
        await this.enqueue(flight, policy);
        return;
      }
      await this.execute(validated, handler, policy, [...flight.aliases.values()], signature);
    } catch (error) {
      await this.completeRequest(
        request,
        "auto",
        flight.aliases.values(),
        signature,
        "failed",
        undefined,
        { error: asError(error).message, errorCode: "VALIDATION_FAILED" },
      );
    }
  }

  private handleResponse(response: AuthorityResponse): void {
    const current = this.users.getCurrentUser();
    if (!current || response.requesterId !== current.id) return;
    const responder = this.findUser(response.responderId);
    const primary = this.getPrimaryGM();
    if (!responder?.active || !responder.isGM || responder.id !== primary?.id) return;
    const pending = this.pendingClients.get(response.requestId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pendingClients.delete(response.requestId);
    pending.resolve(response);
    this.emitEvent({ type: "response", requestId: response.requestId });
  }

  private async validateRequest(
    request: AuthorityRequestEnvelope,
    handler: AuthorityHandler,
    phase: "initial" | "approval",
  ): Promise<AuthorityRequestEnvelope> {
    const requester = this.findUser(request.requesterId);
    const authority = this.users.getCurrentUser();
    if (!requester?.active) throw new Error("The requester is not an active user.");
    if (!authority || !this.isPrimaryGM()) throw new Error("Only the primary GM can validate requests.");
    const validation = await handler.validate({
      request,
      requester,
      authority,
      phase,
      now: this.now(),
    });
    if (validation === false) throw new Error("The authority handler rejected the request.");
    if (validation && typeof validation === "object" && "payload" in validation) {
      return { ...request, payload: validation.payload ?? request.payload };
    }
    return request;
  }

  private async resolvePolicy(request: AuthorityRequestEnvelope): Promise<AuthorityPolicyMode> {
    const policies = await this.getPolicyConfiguration();
    return policies.handlers?.[request.handlerId]
      ?? (request.profileId ? policies.profiles?.[request.profileId] : undefined)
      ?? policies.categories?.[request.category]
      ?? policies.default;
  }

  private async enqueue(flight: InFlightRequest, policy: AuthorityPolicyMode): Promise<void> {
    const request = flight.request;
    const entry: AuthorityQueueEntry = {
      id: this.randomId(),
      replayKey: makeReplayKey(request),
      signature: flight.signature,
      policy,
      request,
      aliases: [...flight.aliases.values()],
      queuedAt: this.now(),
      expiresAt: request.expiresAt,
    };
    flight.queueId = entry.id;
    await this.withStorageLock(async () => {
      const queue = await this.getQueue();
      if (queue.length >= this.queueLimit) {
        throw new AuthorityBridgeError("The authority approval queue is full.", "QUEUE_FULL");
      }
      await this.storage.write(this.settingKeys.queue, [...queue, entry]);
    });
    await this.appendAuditSafely(this.auditEntry(entry, "queued"));
    this.emitEvent({ type: "queue", requestId: request.requestId });
  }

  private async execute(
    request: AuthorityRequestEnvelope,
    handler: AuthorityHandler,
    policy: AuthorityPolicyMode,
    aliases: Iterable<AuthorityQueueAlias>,
    signature: string,
  ): Promise<AuthorityResponse> {
    try {
      const requester = this.findUser(request.requesterId);
      const authority = this.users.getCurrentUser();
      if (!requester || !authority) throw new Error("Authority execution users are unavailable.");
      const result = await handler.execute({
        request,
        requester,
        authority,
        phase: policy === "approval" ? "approval" : "initial",
        now: this.now(),
      });
      return this.completeRequest(
        request,
        policy,
        aliases,
        signature,
        "executed",
        result,
      );
    } catch (error) {
      return this.completeRequest(
        request,
        policy,
        aliases,
        signature,
        "failed",
        undefined,
        { error: asError(error).message, errorCode: "EXECUTION_FAILED" },
      );
    }
  }

  private async completeQueueEntry(
    entry: AuthorityQueueEntry,
    status: AuthorityResponseStatus,
    result?: unknown,
    error?: { error: string; errorCode: string },
  ): Promise<AuthorityResponse> {
    return this.completeRequest(
      entry.request,
      entry.policy,
      entry.aliases,
      entry.signature,
      status,
      result,
      error,
    );
  }

  private async completeRequest(
    request: AuthorityRequestEnvelope,
    policy: AuthorityPolicyMode,
    aliases: Iterable<AuthorityQueueAlias>,
    signature: string,
    status: AuthorityResponseStatus,
    result?: unknown,
    error?: { error: string; errorCode: string },
  ): Promise<AuthorityResponse> {
    const authority = this.users.getCurrentUser();
    const completedAt = this.now();
    const response: AuthorityResponse = {
      protocolVersion: AUTHORITY_BRIDGE_PROTOCOL_VERSION,
      requestId: request.requestId,
      requesterId: request.requesterId,
      responderId: authority?.id ?? this.getPrimaryGM()?.id ?? "",
      handlerId: request.handlerId,
      status,
      completedAt,
      result,
      error: error?.error,
      errorCode: error?.errorCode,
    };
    const replayKey = makeReplayKey(request);
    this.replay.set(replayKey, { signature, policy, response });
    this.inFlight.delete(replayKey);
    this.metrics.lastResponseAt = completedAt;
    if (status === "executed") {
      const latency = Math.max(0, completedAt - request.createdAt);
      this.metrics.executed += 1;
      this.metrics.totalLatencyMs += latency;
    } else if (status === "expired") {
      this.metrics.expired += 1;
      this.metrics.lastError = error?.error ?? null;
    } else if (status === "rejected") {
      this.metrics.lastError = error?.error ?? null;
    } else {
      this.metrics.failed += 1;
      this.metrics.lastError = error?.error ?? null;
    }

    await this.appendAuditSafely(this.auditEntryFromRequest(request, policy, status, {
      error: error?.error,
      latencyMs: Math.max(0, completedAt - request.createdAt),
      ...(status === "executed" ? { result } : {}),
    }));
    const recipients = [...aliases];
    if (recipients.length === 0) recipients.push(aliasFromRequest(request));
    for (const alias of recipients) {
      this.deliverResponse({
        ...response,
        requestId: alias.requestId,
        requesterId: alias.requesterId,
      });
    }
    return response;
  }

  private async completeConflict(request: AuthorityRequestEnvelope, message: string): Promise<void> {
    const authority = this.users.getCurrentUser();
    const response: AuthorityResponse = {
      protocolVersion: AUTHORITY_BRIDGE_PROTOCOL_VERSION,
      requestId: request.requestId,
      requesterId: request.requesterId,
      responderId: authority?.id ?? "",
      handlerId: request.handlerId,
      status: "failed",
      completedAt: this.now(),
      error: message,
      errorCode: "IDEMPOTENCY_CONFLICT",
    };
    this.metrics.failed += 1;
    this.metrics.lastError = message;
    await this.appendAuditSafely(this.auditEntryFromRequest(request, "auto", "failed", { error: message }));
    this.deliverResponse(response);
  }

  private async addDuplicateAlias(
    flight: InFlightRequest,
    request: AuthorityRequestEnvelope,
  ): Promise<void> {
    if (!flight.aliases.has(request.requestId)) {
      flight.aliases.set(request.requestId, aliasFromRequest(request));
      if (flight.queueId) {
        try {
          await this.withStorageLock(async () => {
            const queue = await this.getQueue();
            const entry = queue.find(item => item.id === flight.queueId);
            if (entry) entry.aliases = mergeAliases(entry.aliases, [aliasFromRequest(request)]);
            await this.storage.write(this.settingKeys.queue, queue);
          });
        } catch (error) {
          this.recordInternalError(error);
        }
      }
    }
    this.metrics.duplicate += 1;
    await this.appendAuditSafely(this.auditEntryFromRequest(
      request,
      flight.policy ?? "approval",
      "duplicate",
      {
        duplicateOf: flight.request.requestId,
      },
    ));
  }

  private deliverResponse(response: AuthorityResponse): void {
    const current = this.users.getCurrentUser();
    if (current?.id === response.requesterId) this.handleResponse(response);
    if (current?.id !== response.requesterId) {
      this.socket.emit(this.channel, { type: "authority-bridge-response", response });
    }
  }

  private async claimQueueEntry(queueId: string): Promise<AuthorityQueueEntry | null> {
    const claimed = await this.withStorageLock(async () => {
      const queue = await this.getQueue();
      const index = queue.findIndex(entry => entry.id === queueId);
      if (index < 0) return null;
      const [entry] = queue.splice(index, 1);
      await this.storage.write(this.settingKeys.queue, queue);
      return entry ?? null;
    });
    if (claimed) this.emitEvent({ type: "queue", requestId: claimed.request.requestId });
    return claimed;
  }

  private async appendAudit(entry: AuthorityAuditEntry): Promise<void> {
    await this.withStorageLock(async () => {
      const audit = await this.getAuditLog();
      audit.push(entry);
      await this.storage.write(this.settingKeys.audit, audit.slice(-this.auditLimit));
    });
    this.emitEvent({ type: "audit", requestId: entry.requestId });
  }

  private async appendAuditSafely(entry: AuthorityAuditEntry): Promise<void> {
    try {
      await this.appendAudit(entry);
    } catch (error) {
      this.recordInternalError(error);
    }
  }

  private auditEntry(
    entry: AuthorityQueueEntry,
    status: AuthorityAuditStatus,
  ): AuthorityAuditEntry {
    return this.auditEntryFromRequest(entry.request, entry.policy, status);
  }

  private auditEntryFromRequest(
    request: AuthorityRequestEnvelope,
    policy: AuthorityPolicyMode,
    status: AuthorityAuditStatus,
    extra: Partial<AuthorityAuditEntry> = {},
  ): AuthorityAuditEntry {
    return {
      id: this.randomId(),
      timestamp: this.now(),
      requestId: request.requestId,
      idempotencyKey: request.idempotencyKey,
      requesterId: request.requesterId,
      handlerId: request.handlerId,
      category: request.category,
      profileId: request.profileId,
      actionId: request.actionId,
      executionId: request.executionId,
      sourceActorUuid: request.sourceActorUuid,
      policy,
      status,
      summary: request.summary,
      ...extra,
    };
  }

  private async withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.storageTail;
    let release!: () => void;
    this.storageTail = new Promise<void>(resolve => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async withRequestLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.requestLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>(resolve => {
      release = resolve;
    });
    this.requestLocks.set(key, current);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.requestLocks.get(key) === current) this.requestLocks.delete(key);
    }
  }

  private findUser(userId: string): AuthorityUserLike | null {
    return [...this.users.getUsers()].find(user => user.id === userId) ?? null;
  }

  private assertPrimaryGM(): void {
    if (!this.isPrimaryGM()) {
      throw new AuthorityBridgeError(
        "Only the primary GM can perform this authority operation.",
        "PRIMARY_GM_REQUIRED",
      );
    }
  }

  private emitEvent(event: AuthorityBridgeEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private recordInternalError(error: unknown): void {
    this.metrics.lastError = asError(error).message;
    console.error(`${this.moduleId} | AuthorityBridge`, error);
  }
}

function toAuthorityUser(user: User | null | undefined): AuthorityUserLike | null {
  const id = user?.id;
  if (!id) return null;
  return {
    id,
    active: Boolean(user.active),
    isGM: Boolean(user.isGM),
    name: user.name ?? undefined,
  };
}

function positive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : fallback;
}

function defaultRandomId(): string {
  const randomID = (globalThis as typeof globalThis & {
    foundry?: { utils?: { randomID?: () => string } };
  }).foundry?.utils?.randomID;
  if (randomID) return randomID();
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (randomUUID) return randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizePolicies(value: AuthorityPolicyConfiguration): AuthorityPolicyConfiguration {
  return {
    default: isPolicy(value?.default) ? value.default : "auto",
    categories: normalizePolicyRecord(value?.categories),
    profiles: normalizePolicyRecord(value?.profiles),
    handlers: normalizePolicyRecord(value?.handlers),
  };
}

function normalizePolicyRecord(
  value: Record<string, AuthorityPolicyMode> | undefined,
): Record<string, AuthorityPolicyMode> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, AuthorityPolicyMode] => (
    isPolicy(entry[1])
  )));
}

function isPolicy(value: unknown): value is AuthorityPolicyMode {
  return value === "auto" || value === "approval" || value === "deny" || value === "log";
}

function isRequestEnvelope(value: unknown): value is AuthorityRequestEnvelope {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<AuthorityRequestEnvelope>;
  return request.protocolVersion === AUTHORITY_BRIDGE_PROTOCOL_VERSION
    && typeof request.requestId === "string"
    && request.requestId.length > 0
    && typeof request.idempotencyKey === "string"
    && request.idempotencyKey.length > 0
    && typeof request.requesterId === "string"
    && request.requesterId.length > 0
    && typeof request.handlerId === "string"
    && request.handlerId.length > 0
    && typeof request.category === "string"
    && Number.isFinite(request.createdAt)
    && Number.isFinite(request.expiresAt);
}

function makeReplayKey(request: AuthorityRequestEnvelope): string {
  return `${request.requesterId}:${request.idempotencyKey}`;
}

function requestSignature(request: AuthorityRequestEnvelope): string {
  return stableStringify({
    handlerId: request.handlerId,
    category: request.category,
    profileId: request.profileId,
    actionId: request.actionId,
    executionId: request.executionId,
    sourceActorUuid: request.sourceActorUuid,
    payload: request.payload,
  });
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (current: unknown): unknown => {
    if (!current || typeof current !== "object") return current;
    if (seen.has(current)) throw new Error("Authority request payload cannot contain cycles.");
    seen.add(current);
    if (Array.isArray(current)) return current.map(normalize);
    return Object.fromEntries(
      Object.entries(current as Record<string, unknown>)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, item]) => [key, normalize(item)]),
    );
  };
  return JSON.stringify(normalize(value));
}

function aliasFromRequest(request: AuthorityRequestEnvelope): AuthorityQueueAlias {
  return { requestId: request.requestId, requesterId: request.requesterId };
}

function mergeAliases(
  left: AuthorityQueueAlias[],
  right: AuthorityQueueAlias[],
): AuthorityQueueAlias[] {
  const aliases = new Map<string, AuthorityQueueAlias>();
  for (const alias of [...left, ...right]) aliases.set(alias.requestId, alias);
  return [...aliases.values()];
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
