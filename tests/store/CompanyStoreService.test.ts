import { afterEach, describe, expect, it, vi } from "vitest";
import { ETHERNUM } from "../../scripts/config.js";
import {
  AUTHORITY_BRIDGE_PROTOCOL_VERSION,
  type AuthorityHandler,
  type AuthorityHandlerContext,
  type AuthorityQueueEntry,
  type AuthorityRequestEnvelope,
  type AuthorityRequestInput,
  type AuthorityResponse,
  type AuthorityUserLike,
} from "../../scripts/core/AuthorityBridge.js";
import { createDefaultCompanyStoreData, coinsFromCopper } from "../../scripts/store/CompanyStoreModel.js";
import type {
  CompanyStoreProjectionFactory,
  CompanyStoreRepositoryLike,
  CompanyStoreRepositoryUser,
} from "../../scripts/store/CompanyStoreRepository.js";
import {
  COMPANY_STORE_APPROVAL_HANDLER,
  COMPANY_STORE_AUTOMATIC_HANDLER,
  COMPANY_STORE_REQUEST_FLAG,
  CompanyStoreService,
} from "../../scripts/store/CompanyStoreService.js";
import type {
  CompanyStoreCoins,
  CompanyStoreData,
  CompanyStoreEntry,
  CompanyStorePurchasePayload,
  CompanyStorePurchaseResult,
  CompanyStorePurchaseSubmission,
  CompanyStoreSnapshot,
  CompanyStoreTransactionMode,
} from "../../scripts/store/CompanyStoreTypes.js";
import type {
  PF2eStoreAdapter,
  StoreActorDocument,
  StoreItemDocument,
} from "../../scripts/store/PF2eStoreAdapter.js";

const NOW = 1_800_000_000_000;
const PLAYER_ID = "player-1";
const GM_ID = "gm-1";
const ACTOR_UUID = "Actor.hero";
const ITEM_UUID = "Item.night-blade";
const ENTRY_ID = "night-blade";

type FakeActor = StoreActorDocument & {
  storeBalance: CompanyStoreCoins;
};

type FakeItem = StoreItemDocument & {
  storePrice: CompanyStoreCoins;
};

type FakeUser = CompanyStoreRepositoryUser & AuthorityUserLike & {
  character: FakeActor | null;
};

type RegisteredHandler = AuthorityHandler<CompanyStorePurchasePayload, CompanyStorePurchaseResult>;

interface PendingApproval {
  entry: AuthorityQueueEntry;
  resolve: (response: AuthorityResponse<CompanyStorePurchaseResult>) => void;
}

class FakeRepository implements CompanyStoreRepositoryLike {
  data: CompanyStoreData;
  readonly projections = new Map<string, CompanyStoreSnapshot>();

  constructor(
    data: CompanyStoreData,
    private readonly users: FakeUser[],
  ) {
    this.data = structuredClone(data);
  }

  initialize = vi.fn(async () => this.data);
  readStore = vi.fn(async () => this.data);
  writeStore = vi.fn(async (data: unknown) => {
    this.data = structuredClone(data as CompanyStoreData);
    return this.data;
  });
  readProjection = vi.fn((user?: CompanyStoreRepositoryUser | User | null) => (
    user?.id ? this.projections.get(user.id) ?? null : null
  ));
  synchronizeProjections = vi.fn(async (factory: CompanyStoreProjectionFactory) => {
    for (const user of this.users) {
      this.projections.set(user.id, await factory(user, this.data));
    }
  });
  scheduleProjectionSync = vi.fn();
}

class FakeAdapter {
  readonly items = new Map<string, FakeItem>();
  readonly actors = new Map<string, FakeActor>();
  readonly transactionItems = new Map<string, string[]>();
  grantFailure: "none" | "after-create" = "none";
  deleteFailure = false;
  refundFailure = false;

  resolveItem = vi.fn(async (uuid: string) => this.items.get(uuid) ?? null);
  resolveActor = vi.fn(async (uuid: string) => this.actors.get(uuid) ?? null);
  isPhysicalItem = vi.fn((item: StoreItemDocument | null) => item?.type === "weapon");
  resolvePrice = vi.fn((item: StoreItemDocument) => (item as FakeItem).storePrice ?? null);
  balance = vi.fn((actor: StoreActorDocument | null) => {
    const coins = actor ? (actor as FakeActor).storeBalance : coinsFromCopper(0);
    return {
      ...coins,
      available: Boolean(actor),
      label: `${coins.copperValue} cp`,
      denominations: (["pp", "gp", "sp", "cp"] as const).map(id => ({
        id,
        label: id.toUpperCase(),
        value: coins[id],
      })),
    };
  });
  removeCoins = vi.fn(async (actor: StoreActorDocument, coins: CompanyStoreCoins) => {
    const target = actor as FakeActor;
    if (target.storeBalance.copperValue < coins.copperValue) return false;
    target.storeBalance = coinsFromCopper(target.storeBalance.copperValue - coins.copperValue);
    return true;
  });
  addCoins = vi.fn(async (actor: StoreActorDocument, coins: CompanyStoreCoins) => {
    if (this.refundFailure) throw new Error("refund failed");
    const target = actor as FakeActor;
    target.storeBalance = coinsFromCopper(target.storeBalance.copperValue + coins.copperValue);
  });
  grantItem = vi.fn(async (_actor: StoreActorDocument, _item: StoreItemDocument, transactionId: string) => {
    const itemIds = [`grant-${transactionId}`];
    this.transactionItems.set(transactionId, itemIds);
    if (this.grantFailure === "after-create") throw new Error("grant failed after create");
    return itemIds;
  });
  deleteGrantedItems = vi.fn(async (_actor: StoreActorDocument, itemIds: readonly string[]) => {
    if (this.deleteFailure) throw new Error("delete rollback failed");
    for (const [transactionId, storedIds] of this.transactionItems) {
      this.transactionItems.set(transactionId, storedIds.filter(id => !itemIds.includes(id)));
    }
  });
  transactionItemIds = vi.fn((_actor: StoreActorDocument, transactionId: string) => (
    [...(this.transactionItems.get(transactionId) ?? [])]
  ));
  itemPresentation = vi.fn((item: StoreItemDocument) => ({
    name: String(item.name ?? "Item PF2e"),
  }));
}

class FakeBridge {
  readonly handlers = new Map<string, RegisteredHandler>();
  readonly queue: AuthorityQueueEntry[] = [];
  readonly pendingApprovals = new Map<string, PendingApproval>();
  beforeDispatch?: (request: AuthorityRequestEnvelope<CompanyStorePurchasePayload>) => void;

  constructor(
    private readonly requester: FakeUser,
    private readonly authority: FakeUser,
  ) {}

  isPrimaryGM = vi.fn(() => true);
  registerHandler = vi.fn((handlerId: string, handler: RegisteredHandler) => {
    this.handlers.set(handlerId, handler);
    return () => this.handlers.delete(handlerId);
  });
  getQueue = vi.fn(async () => [...this.queue]);
  requestDetailed = vi.fn(<TPayload, TResult>(input: AuthorityRequestInput<TPayload>) => (
    this.dispatch(input as AuthorityRequestInput<CompanyStorePurchasePayload>) as Promise<AuthorityResponse<TResult>>
  ));

  async approveNext(): Promise<AuthorityResponse<CompanyStorePurchaseResult>> {
    const queued = this.queue.shift();
    if (!queued) throw new Error("No queued approval.");
    const pending = this.pendingApprovals.get(queued.id);
    if (!pending) throw new Error("Missing queued response.");
    this.pendingApprovals.delete(queued.id);
    const handler = this.handlers.get(queued.request.handlerId);
    if (!handler) throw new Error("Missing approval handler.");
    const response = await this.validateAndExecute(handler, queued.request as AuthorityRequestEnvelope<CompanyStorePurchasePayload>, "approval");
    pending.resolve(response);
    return response;
  }

  private async dispatch(
    input: AuthorityRequestInput<CompanyStorePurchasePayload>,
  ): Promise<AuthorityResponse<CompanyStorePurchaseResult>> {
    const createdAt = NOW;
    const request: AuthorityRequestEnvelope<CompanyStorePurchasePayload> = {
      protocolVersion: AUTHORITY_BRIDGE_PROTOCOL_VERSION,
      requestId: input.requestId ?? "request-1",
      idempotencyKey: input.idempotencyKey ?? input.requestId ?? "request-1",
      requesterId: this.requester.id,
      handlerId: input.handlerId,
      category: input.category,
      ...(input.profileId ? { profileId: input.profileId } : {}),
      ...(input.actionId ? { actionId: input.actionId } : {}),
      ...(input.executionId ? { executionId: input.executionId } : {}),
      ...(input.sourceActorUuid ? { sourceActorUuid: input.sourceActorUuid } : {}),
      ...(input.summary ? { summary: input.summary } : {}),
      ...(input.details ? { details: input.details } : {}),
      payload: structuredClone(input.payload),
      createdAt,
      expiresAt: createdAt + (input.approvalTtlMs ?? 120_000),
    };
    this.beforeDispatch?.(request);
    const handler = this.handlers.get(request.handlerId);
    if (!handler) return this.failed(request, "Handler not registered.");

    try {
      const validated = await handler.validate(this.context(request, "initial"));
      if (validated && typeof validated === "object" && "payload" in validated && validated.payload) {
        request.payload = validated.payload;
      }
      if (request.handlerId === COMPANY_STORE_APPROVAL_HANDLER) {
        const queueId = `queue-${this.queue.length + 1}`;
        const entry: AuthorityQueueEntry = {
          id: queueId,
          replayKey: request.idempotencyKey,
          signature: request.requestId,
          policy: "approval",
          request,
          aliases: [],
          queuedAt: NOW,
          expiresAt: request.expiresAt,
        };
        this.queue.push(entry);
        return await new Promise(resolve => this.pendingApprovals.set(queueId, { entry, resolve }));
      }
      return this.execute(handler, request, "initial");
    } catch (error) {
      return this.failed(request, error instanceof Error ? error.message : String(error));
    }
  }

  private async validateAndExecute(
    handler: RegisteredHandler,
    request: AuthorityRequestEnvelope<CompanyStorePurchasePayload>,
    phase: "initial" | "approval",
  ): Promise<AuthorityResponse<CompanyStorePurchaseResult>> {
    try {
      const validated = await handler.validate(this.context(request, phase));
      if (validated && typeof validated === "object" && "payload" in validated && validated.payload) {
        request.payload = validated.payload;
      }
      return this.execute(handler, request, phase);
    } catch (error) {
      return this.failed(request, error instanceof Error ? error.message : String(error));
    }
  }

  private async execute(
    handler: RegisteredHandler,
    request: AuthorityRequestEnvelope<CompanyStorePurchasePayload>,
    phase: "initial" | "approval",
  ): Promise<AuthorityResponse<CompanyStorePurchaseResult>> {
    try {
      const result = await handler.execute(this.context(request, phase));
      return {
        protocolVersion: AUTHORITY_BRIDGE_PROTOCOL_VERSION,
        requestId: request.requestId,
        requesterId: request.requesterId,
        responderId: this.authority.id,
        handlerId: request.handlerId,
        status: "executed",
        completedAt: NOW,
        result,
      };
    } catch (error) {
      return this.failed(request, error instanceof Error ? error.message : String(error));
    }
  }

  private context(
    request: AuthorityRequestEnvelope<CompanyStorePurchasePayload>,
    phase: "initial" | "approval",
  ): AuthorityHandlerContext<CompanyStorePurchasePayload> {
    return {
      request,
      requester: this.requester,
      authority: this.authority,
      phase,
      now: NOW,
    };
  }

  private failed(
    request: AuthorityRequestEnvelope<CompanyStorePurchasePayload>,
    error: string,
  ): AuthorityResponse<CompanyStorePurchaseResult> {
    return {
      protocolVersion: AUTHORITY_BRIDGE_PROTOCOL_VERSION,
      requestId: request.requestId,
      requesterId: request.requesterId,
      responderId: this.authority.id,
      handlerId: request.handlerId,
      status: "failed",
      completedAt: NOW,
      error,
    };
  }
}

interface HarnessOptions {
  balanceCopper?: number;
  price?: CompanyStoreCoins;
  stock?: number;
  mode?: CompanyStoreTransactionMode;
  itemExists?: boolean;
  ownsActor?: boolean;
  forgedMessageAuthor?: string;
}

interface Harness {
  actor: FakeActor;
  adapter: FakeAdapter;
  bridge: FakeBridge;
  chatCreate: ReturnType<typeof vi.fn>;
  player: FakeUser;
  repository: FakeRepository;
  service: CompanyStoreService;
}

function storeEntry(options: HarnessOptions): CompanyStoreEntry {
  return {
    version: 1,
    revision: 0,
    id: ENTRY_ID,
    itemUuid: ITEM_UUID,
    ...(options.stock === undefined ? {} : { stock: options.stock }),
    transactionMode: options.mode ?? "automatic",
    featured: false,
    enabled: true,
  };
}

async function createHarness(options: HarnessOptions = {}): Promise<Harness> {
  const price = options.price ?? coinsFromCopper(500);
  const actor: FakeActor = {
    id: "hero",
    uuid: ACTOR_UUID,
    name: "Pipping Black",
    type: "character",
    storeBalance: coinsFromCopper(options.balanceCopper ?? 5_000),
    testUserPermission: vi.fn((_user: User, level: string | number) => (
      level === "OWNER" ? options.ownsActor !== false : true
    )),
  };
  const item: FakeItem = {
    id: "night-blade",
    uuid: ITEM_UUID,
    name: "Lâmina da Noite",
    type: "weapon",
    visible: true,
    storePrice: price,
    testUserPermission: vi.fn(() => true),
  };
  const player: FakeUser = {
    id: PLAYER_ID,
    name: "Player",
    active: true,
    isGM: false,
    character: actor,
  };
  const gm: FakeUser = {
    id: GM_ID,
    name: "Game Master",
    active: true,
    isGM: true,
    character: null,
  };
  const data = createDefaultCompanyStoreData();
  data.entries.push(storeEntry(options));
  const repository = new FakeRepository(data, [player]);
  const adapter = new FakeAdapter();
  adapter.actors.set(ACTOR_UUID, actor);
  if (options.itemExists !== false) adapter.items.set(ITEM_UUID, item);
  const bridge = new FakeBridge(player, gm);
  const messages = new Map<string, Record<string, unknown>>();
  let messageIndex = 0;
  const chatCreate = vi.fn(async (source: Record<string, unknown>) => {
    messageIndex += 1;
    const id = `message-${messageIndex}`;
    const uuid = `ChatMessage.${id}`;
    const flags = source.flags as Record<string, unknown> | undefined;
    const moduleFlags = flags?.[ETHERNUM.MODULE_NAME] as Record<string, unknown> | undefined;
    const isPurchaseAttestation = Boolean(moduleFlags?.[COMPANY_STORE_REQUEST_FLAG]);
    const authorId = isPurchaseAttestation
      ? options.forgedMessageAuthor ?? PLAYER_ID
      : GM_ID;
    const message = {
      id,
      uuid,
      timestamp: NOW / 1_000,
      author: { id: authorId },
      flags: source.flags,
      getFlag: (scope: string, key: string) => (
        ((source.flags as Record<string, Record<string, unknown>> | undefined)?.[scope])?.[key]
      ),
    };
    messages.set(uuid, message);
    return message;
  });

  vi.stubGlobal("game", {
    user: player,
    users: [player, gm],
    items: options.itemExists === false ? [] : [item],
    i18n: { localize: (key: string) => key },
    settings: { get: vi.fn(() => "2") },
  });
  vi.stubGlobal("foundry", {
    utils: {
      deepClone: <T>(value: T): T => structuredClone(value),
      randomID: () => "unused-random-id",
    },
  });
  vi.stubGlobal("ChatMessage", {
    create: chatCreate,
    getSpeaker: vi.fn(() => ({ actor: actor.id })),
  });
  vi.stubGlobal("fromUuid", vi.fn(async (uuid: string) => messages.get(uuid) ?? null));

  let transactionIndex = 0;
  const service = new CompanyStoreService({
    bridge: bridge as unknown as ConstructorParameters<typeof CompanyStoreService>[0]["bridge"],
    repository,
    adapter: adapter as unknown as PF2eStoreAdapter,
    now: () => NOW,
    randomId: () => `transaction-${++transactionIndex}`,
  });
  service.registerHandlers();
  await service.synchronizeProjections();
  return { actor, adapter, bridge, chatCreate, player, repository, service };
}

function terminalTransaction(repository: FakeRepository) {
  return repository.data.transactions.at(-1);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CompanyStoreService", () => {
  it("permite que um GM secundário consulte a Loja sem conceder autoridade de escrita", async () => {
    const harness = await createHarness();
    (game as Game & { user: unknown }).user = { id: "gm-secondary", name: "Secondary GM", isGM: true };
    harness.bridge.isPrimaryGM.mockReturnValue(false);

    await expect(harness.service.getStore()).resolves.toMatchObject({ revision: 0 });
    expect(harness.repository.readStore).toHaveBeenCalled();
  });

  it.each([
    ["valor exato", coinsFromCopper(500), 500],
    ["moedas mistas", { pp: 1, gp: 2, sp: 3, cp: 4, copperValue: 1_234 }, 1_234],
  ])("conclui compra automática com %s", async (_label, price, balanceCopper) => {
    const harness = await createHarness({ price, balanceCopper });

    const submission = await harness.service.requestPurchase(ENTRY_ID);

    expect(submission.receipt.status).toBe("completed");
    expect(harness.adapter.removeCoins).toHaveBeenCalledOnce();
    expect(harness.adapter.removeCoins).toHaveBeenCalledWith(harness.actor, price);
    expect(harness.adapter.grantItem).toHaveBeenCalledOnce();
    expect(harness.actor.storeBalance.copperValue).toBe(0);
    expect(terminalTransaction(harness.repository)?.state).toBe("completed");
  });

  it.each([
    ["saldo insuficiente", 499],
    ["saldo zero", 0],
  ])("recusa compra com %s sem tentar debitar", async (_label, balanceCopper) => {
    const harness = await createHarness({ balanceCopper, price: coinsFromCopper(500) });

    await expect(harness.service.requestPurchase(ENTRY_ID)).rejects.toThrow("Saldo insuficiente");
    expect(harness.adapter.removeCoins).not.toHaveBeenCalled();
    expect(harness.adapter.grantItem).not.toHaveBeenCalled();
  });

  it("consome a última unidade e atualiza estoque e revisão", async () => {
    const harness = await createHarness({ stock: 1 });

    const submission = await harness.service.requestPurchase(ENTRY_ID);

    expect(submission.receipt.status).toBe("completed");
    expect(harness.repository.data.entries[0]).toMatchObject({ stock: 0, revision: 1 });
  });

  it("recusa estoque zero antes de debitar", async () => {
    const harness = await createHarness({ stock: 0 });

    await expect(harness.service.requestPurchase(ENTRY_ID)).rejects.toThrow("esgotado");
    expect(harness.adapter.removeCoins).not.toHaveBeenCalled();
  });

  it("deduplica double click concorrente em uma única transação", async () => {
    const harness = await createHarness();

    const first = harness.service.requestPurchase(ENTRY_ID);
    const second = harness.service.requestPurchase(ENTRY_ID);
    const [left, right] = await Promise.all([first, second]);

    expect(left.receipt.transactionId).toBe(right.receipt.transactionId);
    expect(harness.bridge.requestDetailed).toHaveBeenCalledOnce();
    expect(harness.adapter.removeCoins).toHaveBeenCalledOnce();
    expect(harness.adapter.grantItem).toHaveBeenCalledOnce();
    expect(harness.repository.data.transactions).toHaveLength(1);
  });

  it("recusa UUID de Item quebrada sem abrir transação", async () => {
    const harness = await createHarness({ itemExists: false });

    await expect(harness.service.requestPurchase(ENTRY_ID)).rejects.toThrow("Item indisponível");
    expect(harness.bridge.requestDetailed).not.toHaveBeenCalled();
    expect(harness.repository.data.transactions).toHaveLength(0);
  });

  it("recusa Actor sem permissão OWNER", async () => {
    const harness = await createHarness({ ownsActor: false });

    await expect(harness.service.requestPurchase(ENTRY_ID)).rejects.toThrow("não possui permissão");
    expect(harness.bridge.requestDetailed).not.toHaveBeenCalled();
  });

  it("enfileira aprovação e só executa após o aceite do GM", async () => {
    const harness = await createHarness({ mode: "approval" });

    const submission = await harness.service.requestPurchase(ENTRY_ID);

    expect(submission.receipt.status).toBe("queued");
    expect(submission.completion).toBeInstanceOf(Promise);
    await vi.waitFor(() => expect(harness.bridge.queue).toHaveLength(1));
    expect(harness.adapter.removeCoins).not.toHaveBeenCalled();

    await harness.bridge.approveNext();
    await expect(submission.completion).resolves.toMatchObject({ status: "completed", approval: true });
    expect(harness.adapter.removeCoins).toHaveBeenCalledOnce();
    expect(terminalTransaction(harness.repository)).toMatchObject({ state: "completed", approvedBy: GM_ID });
  });

  it("recusa cotação stale quando a revisão muda após a projeção", async () => {
    const harness = await createHarness();
    harness.bridge.beforeDispatch = () => {
      harness.repository.data.entries[0].revision += 1;
    };

    const submission = await harness.service.requestPurchase(ENTRY_ID);

    expect(submission.receipt).toMatchObject({ status: "failed" });
    expect(submission.receipt.message).toContain("oferta foi atualizada");
    expect(harness.adapter.removeCoins).not.toHaveBeenCalled();
  });

  it("recusa modo adulterado na rota de autoridade", async () => {
    const harness = await createHarness();
    harness.bridge.beforeDispatch = request => {
      request.actionId = "purchase-approval";
    };

    const submission = await harness.service.requestPurchase(ENTRY_ID);

    expect(submission.receipt).toMatchObject({ status: "failed" });
    expect(submission.receipt.message).toContain("rota de autoridade");
    expect(harness.adapter.removeCoins).not.toHaveBeenCalled();
  });

  it("recusa autoria forjada do ChatMessage de atestação", async () => {
    const harness = await createHarness({ forgedMessageAuthor: "attacker" });

    const submission = await harness.service.requestPurchase(ENTRY_ID);

    expect(submission.receipt).toMatchObject({ status: "failed" });
    expect(submission.receipt.message).toContain("autoria");
    expect(harness.adapter.removeCoins).not.toHaveBeenCalled();
  });

  it("faz rollback completo quando o grant falha após criar o Item", async () => {
    const harness = await createHarness({ balanceCopper: 500 });
    harness.adapter.grantFailure = "after-create";

    const submission = await harness.service.requestPurchase(ENTRY_ID);

    expect(submission.receipt.status).toBe("rolledBack");
    expect(harness.adapter.deleteGrantedItems).toHaveBeenCalledOnce();
    expect(harness.adapter.addCoins).toHaveBeenCalledOnce();
    expect(harness.actor.storeBalance.copperValue).toBe(500);
    expect(terminalTransaction(harness.repository)).toMatchObject({ state: "rolledBack", recoveryNotes: [] });
  });

  it("marca recoveryRequired quando o rollback do Item falha", async () => {
    const harness = await createHarness({ balanceCopper: 500 });
    harness.adapter.grantFailure = "after-create";
    harness.adapter.deleteFailure = true;

    const submission = await harness.service.requestPurchase(ENTRY_ID);

    expect(submission.receipt.status).toBe("recoveryRequired");
    expect(harness.adapter.addCoins).toHaveBeenCalledOnce();
    expect(harness.actor.storeBalance.copperValue).toBe(500);
    expect(terminalTransaction(harness.repository)).toMatchObject({ state: "recoveryRequired" });
    expect(terminalTransaction(harness.repository)?.recoveryNotes?.join(" ")).toContain("Remoção do Item");
    expect(harness.chatCreate).toHaveBeenCalledTimes(2);
  });
});
