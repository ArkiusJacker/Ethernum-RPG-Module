import { ETHERNUM } from "../config.js";
import { CompanyIdentityService } from "../company/CompanyIdentityService.js";
import { AutomationAuthority } from "../core/AutomationAuthority.js";
import {
  type AuthorityBridge,
  type AuthorityHandlerContext,
  type AuthorityRequestEnvelope,
  type AuthorityResponse,
  type AuthorityUserLike,
} from "../core/AuthorityBridge.js";
import { getAuthorityApprovalTimeoutMs, getEthernumAuthorityBridge } from "../core/EthernumAuthority.js";
import {
  mergeWorldItems,
  normalizeCompanyStoreData,
  normalizeCompanyStoreEntry,
  normalizeRequiredFlag,
  transactionFingerprint,
} from "./CompanyStoreModel.js";
import {
  CompanyStoreRepository,
  type CompanyStoreRepositoryLike,
  type CompanyStoreRepositoryUser,
} from "./CompanyStoreRepository.js";
import {
  PF2eStoreAdapter,
  canOwnStoreActor,
  formatCompanyCoins,
  type StoreActorDocument,
  type StoreItemDocument,
} from "./PF2eStoreAdapter.js";
import {
  COMPANY_STORE_SCHEMA_VERSION,
  type CompanyStoreAuthorizationCode,
  type CompanyStoreCoins,
  type CompanyStoreData,
  type CompanyStoreEntry,
  type CompanyStoreItemDTO,
  type CompanyStoreMutationOptions,
  type CompanyStorePrincipalAuthorization,
  type CompanyStoreRecoveryActionResult,
  type CompanyStoreRecoveryCaseDTO,
  type CompanyStoreRecoveryEvidence,
  type CompanyStoreRecoveryStatusDTO,
  type CompanyStorePurchasePayload,
  type CompanyStorePurchaseReceipt,
  type CompanyStorePurchaseResult,
  type CompanyStorePurchaseSubmission,
  type CompanyStoreSnapshot,
  type CompanyStoreTransactionMode,
  type CompanyStoreTransactionRecord,
} from "./CompanyStoreTypes.js";

export const COMPANY_STORE_AUTOMATIC_HANDLER = "company-store.purchase.automatic";
export const COMPANY_STORE_APPROVAL_HANDLER = "company-store.purchase.approval";
export const COMPANY_STORE_REQUEST_FLAG = "companyStoreRequest";
export const COMPANY_STORE_CATEGORY = "company-store";

const MAX_ATTESTATION_AGE_MS = 10 * 60_000;
const MAX_TRANSACTIONS = 500;

interface StoreUser {
  id?: string | null;
  name?: string | null;
  isGM?: boolean;
  active?: boolean;
  character?: Actor | StoreActorDocument | null;
}

interface StoreMessage {
  id?: string | null;
  uuid?: string | null;
  timestamp?: number;
  author?: { id?: string | null } | null;
  user?: { id?: string | null } | null;
  getFlag?: (scope: string, key: string) => unknown;
  flags?: Record<string, unknown>;
}

interface CompanyStoreAttestation {
  transactionId: string;
  entryId: string;
  actorUuid: string;
  requestedMode: CompanyStoreTransactionMode;
  quotedEntryRevision: number;
  quotedPriceCopper: number;
  createdAt: number;
}

export interface CompanyStoreServiceOptions {
  bridge?: AuthorityBridge;
  repository?: CompanyStoreRepositoryLike;
  adapter?: PF2eStoreAdapter;
  now?: () => number;
  randomId?: () => string;
}

interface ValidatedPurchase {
  data: CompanyStoreData;
  entry: CompanyStoreEntry;
  actor: StoreActorDocument;
  item: StoreItemDocument;
  price: CompanyStoreCoins;
  user: StoreUser;
}

interface RecoveryInspection {
  data: CompanyStoreData;
  transaction: CompanyStoreTransactionRecord;
  actor: StoreActorDocument | null;
  item: StoreItemDocument | null;
  entry: CompanyStoreEntry | undefined;
  itemIds: string[];
  recoveryCase: CompanyStoreRecoveryCaseDTO;
}

function collection<T>(value: unknown): T[] {
  if (!value || typeof (value as Iterable<T>)[Symbol.iterator] !== "function") return [];
  return Array.from(value as Iterable<T>);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, maximum = 300): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function integer(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] ?? character));
}

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase() || id.slice(-8).toUpperCase();
}

function messageTimestamp(message: StoreMessage): number {
  const value = Number(message.timestamp);
  if (!Number.isFinite(value)) return 0;
  return value < 1_000_000_000_000 ? value * 1_000 : value;
}

function userById(id: string): StoreUser | null {
  return collection<StoreUser>(game.users).find(user => user.id === id) ?? null;
}

function moduleFlag(document: unknown, key: string): unknown {
  const target = document as { getFlag?: (scope: string, key: string) => unknown; flags?: Record<string, unknown> } | null;
  try {
    return target?.getFlag?.(ETHERNUM.MODULE_NAME, key)
      ?? record(record(target?.flags)[ETHERNUM.MODULE_NAME])[key];
  } catch {
    return undefined;
  }
}

function itemCollection(): StoreItemDocument[] {
  return collection<StoreItemDocument>(game.items);
}

function emptySnapshot(): CompanyStoreSnapshot {
  return {
    schemaVersion: COMPANY_STORE_SCHEMA_VERSION,
    revision: 0,
    balance: {
      pp: 0, gp: 0, sp: 0, cp: 0, copperValue: 0,
      available: false,
      label: "Saldo indisponível",
      denominations: [],
    },
    items: [],
    state: { noActor: true, currencyUnavailable: true, empty: true },
  };
}

function sameCoins(left: CompanyStoreCoins, copper: number): boolean {
  return left.copperValue === Math.max(0, Math.floor(copper));
}

function recoveryStatus(
  state: CompanyStoreRecoveryStatusDTO["state"],
  label: string,
  tone: CompanyStoreRecoveryStatusDTO["tone"],
): CompanyStoreRecoveryStatusDTO {
  return { state, label, tone };
}

function receiptFromResult(result: CompanyStorePurchaseResult): CompanyStorePurchaseReceipt {
  if (result.state === "completed") {
    return {
      transactionId: result.transactionId,
      shortId: shortId(result.transactionId),
      status: "completed",
      statusLabel: "Compra concluída",
      message: `${result.itemName} foi adicionado à ficha de ${result.actorName}.`,
      tone: "success",
      icon: "fa-solid fa-circle-check",
      actorName: result.actorName,
      itemName: result.itemName,
      priceLabel: result.priceLabel,
      approval: result.approval,
      completedAt: result.completedAt,
    };
  }
  const recovery = result.state === "recoveryRequired";
  return {
    transactionId: result.transactionId,
    shortId: shortId(result.transactionId),
    status: result.state,
    statusLabel: recovery ? "Verificação do mestre necessária" : "Compra não concluída",
    message: recovery
      ? `A transação requer verificação do mestre. Código: ${shortId(result.transactionId)}.`
      : "A compra não foi concluída. Seus recursos foram restaurados.",
    tone: recovery ? "warning" : "danger",
    icon: recovery ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-rotate-left",
    actorName: result.actorName,
    itemName: result.itemName,
    priceLabel: result.priceLabel,
    approval: result.approval,
    completedAt: result.completedAt,
  };
}

function receiptFromResponse(
  response: AuthorityResponse<CompanyStorePurchaseResult>,
  payload: CompanyStorePurchasePayload,
  approval: boolean,
): CompanyStorePurchaseReceipt {
  if (response.status === "executed" && response.result) return receiptFromResult(response.result);
  const status = response.status === "expired" ? "expired" : response.status === "rejected" ? "rejected" : "failed";
  const labels = {
    expired: "Requisição expirada",
    rejected: "Requisição recusada",
    failed: "Compra não concluída",
  } as const;
  return {
    transactionId: payload.transactionId,
    shortId: shortId(payload.transactionId),
    status,
    statusLabel: labels[status],
    message: response.error || (status === "rejected" ? "O mestre recusou esta requisição." : "Não foi possível concluir a operação."),
    tone: "danger",
    icon: "fa-solid fa-circle-xmark",
    actorName: "",
    itemName: payload.quotedItemName ?? "Item",
    priceLabel: payload.quotedPriceLabel ?? "",
    approval,
    completedAt: response.completedAt,
  };
}

function queuedReceipt(payload: CompanyStorePurchasePayload): CompanyStorePurchaseReceipt {
  return {
    transactionId: payload.transactionId,
    shortId: shortId(payload.transactionId),
    status: "queued",
    statusLabel: "Aguardando aprovação",
    message: "A requisição foi enviada ao mestre. Nenhum valor foi removido.",
    tone: "pending",
    icon: "fa-solid fa-hourglass-half",
    actorName: "",
    itemName: payload.quotedItemName ?? "Item",
    priceLabel: payload.quotedPriceLabel ?? "",
    approval: true,
  };
}

export class CompanyStoreService {
  private readonly bridge: AuthorityBridge;
  private readonly repository: CompanyStoreRepositoryLike;
  private readonly adapter: PF2eStoreAdapter;
  private readonly now: () => number;
  private readonly randomId: () => string;
  private registered = false;
  private transactionTail: Promise<void> = Promise.resolve();
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pendingSubmissions = new Map<string, Promise<CompanyStorePurchaseSubmission>>();
  private readonly pendingRecoveryActions = new Map<string, Promise<CompanyStoreRecoveryActionResult>>();

  constructor(options: CompanyStoreServiceOptions = {}) {
    this.bridge = options.bridge ?? getEthernumAuthorityBridge();
    this.repository = options.repository ?? new CompanyStoreRepository();
    this.adapter = options.adapter ?? new PF2eStoreAdapter();
    this.now = options.now ?? Date.now;
    this.randomId = options.randomId ?? (() => foundry.utils.randomID(24));
  }

  async initialize(): Promise<void> {
    this.registerHandlers();
    if (!this.bridge.isPrimaryGM()) return;
    await this.repository.initialize();
    let data = await this.repository.readStore();
    data = await this.migrate(data);
    data = await this.reconcile(data);
    await this.repository.writeStore(data);
    await this.enforceHandlerPolicies();
    await this.synchronizeProjections();
  }

  registerHandlers(): void {
    if (this.registered) return;
    const handler = (mode: CompanyStoreTransactionMode) => ({
      validate: (context: AuthorityHandlerContext<CompanyStorePurchasePayload>) => this.validateAuthorityRequest(context, mode),
      execute: (context: AuthorityHandlerContext<CompanyStorePurchasePayload>) => this.executeAuthorityRequest(context, mode),
    });
    this.bridge.registerHandler(COMPANY_STORE_AUTOMATIC_HANDLER, handler("automatic"), { replace: true });
    this.bridge.registerHandler(COMPANY_STORE_APPROVAL_HANDLER, handler("approval"), { replace: true });
    this.registered = true;
  }

  async getSnapshot(previewUserId?: string | null, selectedEntryId?: string | null): Promise<CompanyStoreSnapshot> {
    const current = game.user as unknown as StoreUser | null;
    const preview = previewUserId && current?.isGM ? userById(previewUserId) : null;
    if (!current) return emptySnapshot();
    if (!current.isGM) {
      const projected = this.repository.readProjection(current as unknown as CompanyStoreRepositoryUser) ?? emptySnapshot();
      return this.withSelected(projected, selectedEntryId);
    }
    const target = preview ?? current;
    const data = await this.repository.readStore();
    const snapshot = await this.buildSnapshotForUser(target, data, Boolean(preview));
    return this.withSelected(snapshot, selectedEntryId);
  }

  async requestPurchase(entryId: string): Promise<CompanyStorePurchaseSubmission> {
    const user = game.user as unknown as StoreUser | null;
    const actor = user?.character as unknown as StoreActorDocument | null;
    const key = `${user?.id ?? ""}\u001f${actor?.uuid ?? ""}\u001f${entryId}`;
    const existing = this.pendingSubmissions.get(key);
    if (existing) return existing;
    const pending = this.submitPurchase(entryId, user, actor);
    this.pendingSubmissions.set(key, pending);
    void pending.then(submission => {
      const end = submission.completion ?? Promise.resolve(submission.receipt);
      return end.finally(() => this.pendingSubmissions.delete(key));
    }, () => this.pendingSubmissions.delete(key));
    return pending;
  }

  scheduleProjectionSync(delayMs = 100): void {
    if (!AutomationAuthority.isPrimaryGM()) return;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      void this.synchronizeProjections().catch(error => console.error(`${ETHERNUM.MODULE_NAME} | Company Store projection sync`, error));
    }, Math.max(0, delayMs));
  }

  async synchronizeProjections(): Promise<void> {
    if (!this.bridge.isPrimaryGM()) return;
    const data = await this.repository.readStore();
    const factory = (user: CompanyStoreRepositoryUser) => this.buildSnapshotForUser(user as StoreUser, data, false);
    await this.repository.synchronizeProjections(factory);
  }

  async getStore(): Promise<CompanyStoreData> {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode consultar a Loja da Companhia.");
    return this.repository.readStore();
  }

  async getRecoveryCases(): Promise<CompanyStoreRecoveryCaseDTO[]> {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode consultar a recuperação da Loja.");
    const data = await this.repository.readStore();
    const cases = await Promise.all(data.transactions
      .filter(transaction => transaction.state === "recoveryRequired")
      .map(transaction => this.inspectRecovery(data, transaction)));
    return cases.map(entry => entry.recoveryCase).sort((left, right) => right.updatedAt - left.updatedAt);
  }

  retryRecoveryStep(transactionId: string): Promise<CompanyStoreRecoveryActionResult> {
    return this.coalesceRecoveryAction("retry", transactionId, () => this.retryRecoveryStepNow(transactionId));
  }

  compensateRecovery(transactionId: string): Promise<CompanyStoreRecoveryActionResult> {
    return this.coalesceRecoveryAction("compensate", transactionId, () => this.compensateRecoveryNow(transactionId));
  }

  markRecoveryResolved(
    transactionId: string,
    outcome: "completed" | "rolledBack",
    note: string,
  ): Promise<CompanyStoreRecoveryActionResult> {
    const normalizedNote = text(note, 1_000);
    if (normalizedNote.length < 8) throw new Error("Registre uma nota de reconciliação com pelo menos 8 caracteres.");
    return this.coalesceRecoveryAction(`resolve:${outcome}:${normalizedNote}`, transactionId, () => (
      this.markRecoveryResolvedNow(transactionId, outcome, normalizedNote)
    ));
  }

  async recoveryDiagnostic(transactionId: string): Promise<string> {
    const recoveryCase = (await this.getRecoveryCases()).find(entry => entry.transactionId === transactionId);
    if (!recoveryCase) throw new Error("Transação de recuperação não encontrada.");
    return recoveryCase.diagnostic;
  }

  async upsertEntry(input: unknown, options: CompanyStoreMutationOptions = {}): Promise<CompanyStoreData> {
    const normalized = normalizeCompanyStoreEntry(input);
    if (!normalized) throw new Error("Entrada da Loja inválida.");
    const item = await this.adapter.resolveItem(normalized.itemUuid);
    if (!item || !this.adapter.isPhysicalItem(item)) throw new Error("Selecione um Item físico PF2e válido.");
    if (!this.adapter.resolvePrice(item, normalized.priceOverride)) throw new Error("O preço do Item não pôde ser validado.");
    return this.mutateStore(options, data => {
      const index = data.entries.findIndex(entry => entry.id === normalized.id);
      const previous = index >= 0 ? data.entries[index] : undefined;
      const next = { ...normalized, revision: (previous?.revision ?? -1) + 1 };
      if (index >= 0) data.entries[index] = next;
      else data.entries.push(next);
    });
  }

  async removeEntry(entryId: string, options: CompanyStoreMutationOptions = {}): Promise<CompanyStoreData> {
    return this.mutateStore(options, data => {
      const length = data.entries.length;
      data.entries = data.entries.filter(entry => entry.id !== entryId);
      if (data.entries.length === length) throw new Error("Entrada da Loja não encontrada.");
    });
  }

  async setStock(entryId: string, stock: number | null, options: CompanyStoreMutationOptions = {}): Promise<CompanyStoreData> {
    return this.mutateStore(options, data => {
      const entry = data.entries.find(candidate => candidate.id === entryId);
      if (!entry) throw new Error("Entrada da Loja não encontrada.");
      if (stock === null) delete entry.stock;
      else entry.stock = integer(stock);
      entry.revision += 1;
    });
  }

  async setAuthorization(
    actorUuid: string,
    input: Partial<CompanyStorePrincipalAuthorization>,
    options: CompanyStoreMutationOptions = {},
  ): Promise<CompanyStoreData> {
    return this.mutateStore(options, data => {
      const uuid = text(actorUuid);
      if (!uuid) throw new Error("Actor inválido.");
      const flags = Array.from(new Set((input.flags ?? []).map(normalizeRequiredFlag).filter((flag): flag is string => Boolean(flag))));
      const region = text(input.region, 120).toLocaleLowerCase();
      data.authorizations[uuid] = {
        actorUuid: uuid,
        ...(input.rank === undefined ? {} : { rank: integer(input.rank) }),
        ...(region ? { region } : {}),
        flags,
        updatedAt: this.now(),
      };
    });
  }

  async reconcileTransactions(): Promise<CompanyStoreData> {
    this.assertPrimaryGM();
    const data = await this.reconcile(await this.repository.readStore());
    await this.repository.writeStore(data);
    await this.synchronizeProjections();
    return data;
  }

  private async submitPurchase(
    entryId: string,
    user: StoreUser | null,
    actor: StoreActorDocument | null,
  ): Promise<CompanyStorePurchaseSubmission> {
    if (!user?.id || !actor?.uuid || user.character !== actor) throw new Error("Vincule um personagem PF2e antes de comprar.");
    if (!canOwnStoreActor(actor, user as unknown as User)) throw new Error("Você não possui permissão para comprar com este personagem.");
    const snapshot = await this.getSnapshot(null, entryId);
    const item = snapshot.selectedItem;
    if (!item || !item.available) throw new Error(item?.authorizationLabel || "Item indisponível.");
    const handlerId = item.transactionMode === "approval" ? COMPANY_STORE_APPROVAL_HANDLER : COMPANY_STORE_AUTOMATIC_HANDLER;
    if (item.transactionMode === "approval") {
      const duplicate = (await this.bridge.getQueue()).some(queue => {
        const payload = queue.request.payload as Partial<CompanyStorePurchasePayload>;
        return queue.request.requesterId === user.id && payload.actorUuid === actor.uuid && payload.entryId === item.id;
      });
      if (duplicate) throw new Error("Já existe uma requisição pendente para este item.");
    }
    const transactionId = `store-${this.randomId()}`;
    const createdAt = this.now();
    const attestation: CompanyStoreAttestation = {
      transactionId,
      entryId: item.id,
      actorUuid: actor.uuid,
      requestedMode: item.transactionMode,
      quotedEntryRevision: item.quoteRevision,
      quotedPriceCopper: item.price.copperValue,
      createdAt,
    };
    const gmIds = collection<StoreUser>(game.users).filter(candidate => candidate.isGM).flatMap(candidate => candidate.id ? [candidate.id] : []);
    const whisper = Array.from(new Set([...gmIds, user.id]));
    const message = await ChatMessage.create({
      content: `<p><strong>${escapeHtml(actor.name ?? user.name)}</strong> ${item.transactionMode === "approval" ? "solicita" : "confirma"} a compra de <strong>${escapeHtml(item.name)}</strong> por ${escapeHtml(item.priceLabel)}.</p>`,
      speaker: ChatMessage.getSpeaker({ actor: actor as unknown as Actor }),
      whisper,
      flags: { [ETHERNUM.MODULE_NAME]: { [COMPANY_STORE_REQUEST_FLAG]: attestation } },
    } as never) as unknown as StoreMessage | null;
    const requestMessageUuid = text(message?.uuid) || (message?.id ? `ChatMessage.${message.id}` : "");
    if (!requestMessageUuid) throw new Error("O Foundry não confirmou a identidade da requisição.");
    const payload: CompanyStorePurchasePayload = {
      transactionId,
      entryId: item.id,
      actorUuid: actor.uuid,
      requestMessageUuid,
      quotedEntryRevision: item.quoteRevision,
      quotedPriceCopper: item.price.copperValue,
      quotedPriceLabel: item.priceLabel,
      quotedItemName: item.name,
    };
    const responsePromise = this.bridge.requestDetailed<CompanyStorePurchasePayload, CompanyStorePurchaseResult>({
      handlerId,
      category: COMPANY_STORE_CATEGORY,
      actionId: `purchase-${item.transactionMode}`,
      executionId: transactionId,
      sourceActorUuid: actor.uuid,
      summary: `${actor.name ?? user.name}: ${item.name}`,
      details: `${item.priceLabel} · ${item.transactionMode}`,
      requestId: transactionId,
      idempotencyKey: transactionId,
      approvalTtlMs: getAuthorityApprovalTimeoutMs(),
      payload,
    });
    if (item.transactionMode === "approval") {
      return {
        receipt: queuedReceipt(payload),
        completion: responsePromise.then(response => receiptFromResponse(response, payload, true)),
      };
    }
    return { receipt: receiptFromResponse(await responsePromise, payload, false) };
  }

  private async validateAuthorityRequest(
    context: AuthorityHandlerContext<CompanyStorePurchasePayload>,
    expectedMode: CompanyStoreTransactionMode,
  ): Promise<{ payload: CompanyStorePurchasePayload }> {
    this.assertAuthorityEnvelope(context.request, expectedMode);
    const payload = this.normalizePayload(context.request.payload);
    await this.validateAttestation(payload, context.requester, expectedMode, context.now);
    await this.validatePurchase(payload, context.requester, expectedMode);
    return { payload };
  }

  private async executeAuthorityRequest(
    context: AuthorityHandlerContext<CompanyStorePurchasePayload>,
    expectedMode: CompanyStoreTransactionMode,
  ): Promise<CompanyStorePurchaseResult> {
    this.assertAuthorityEnvelope(context.request, expectedMode);
    return this.withTransactionLock(() => this.transact(
      this.normalizePayload(context.request.payload),
      context.requester,
      expectedMode,
      context.authority.id,
    ));
  }

  private assertAuthorityEnvelope(
    request: AuthorityRequestEnvelope<CompanyStorePurchasePayload>,
    mode: CompanyStoreTransactionMode,
  ): void {
    const handler = mode === "approval" ? COMPANY_STORE_APPROVAL_HANDLER : COMPANY_STORE_AUTOMATIC_HANDLER;
    if (request.handlerId !== handler || request.category !== COMPANY_STORE_CATEGORY || request.actionId !== `purchase-${mode}`) {
      throw new Error("A rota de autoridade da Loja é inválida.");
    }
    const transactionId = text(request.payload?.transactionId, 140);
    if (!transactionId || request.requestId !== transactionId || request.idempotencyKey !== transactionId
      || request.executionId !== transactionId || request.sourceActorUuid !== request.payload?.actorUuid) {
      throw new Error("A identidade transacional da Loja é inválida.");
    }
  }

  private normalizePayload(value: unknown): CompanyStorePurchasePayload {
    const input = record(value);
    const payload: CompanyStorePurchasePayload = {
      transactionId: text(input.transactionId, 140),
      entryId: text(input.entryId, 100),
      actorUuid: text(input.actorUuid),
      requestMessageUuid: text(input.requestMessageUuid),
      quotedEntryRevision: integer(input.quotedEntryRevision),
      quotedPriceCopper: integer(input.quotedPriceCopper),
      quotedPriceLabel: text(input.quotedPriceLabel, 120),
      quotedItemName: text(input.quotedItemName, 240),
    };
    if (!payload.transactionId || !payload.entryId || !payload.actorUuid || !payload.requestMessageUuid) {
      throw new Error("A requisição da Loja está incompleta.");
    }
    return payload;
  }

  private async validateAttestation(
    payload: CompanyStorePurchasePayload,
    requester: AuthorityUserLike,
    mode: CompanyStoreTransactionMode,
    now: number,
  ): Promise<void> {
    let message: StoreMessage | null = null;
    for (let attempt = 0; attempt < 4 && !message; attempt += 1) {
      message = await this.resolveUuid<StoreMessage>(payload.requestMessageUuid);
      if (!message && attempt < 3) await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!message) throw new Error("A mensagem de autenticação da compra não existe.");
    const authorId = text(message.author?.id ?? message.user?.id, 140);
    if (!authorId || authorId !== requester.id) throw new Error("A autoria da requisição da Loja não confere.");
    const raw = moduleFlag(message, COMPANY_STORE_REQUEST_FLAG);
    const attestation = record(raw);
    const createdAt = integer(attestation.createdAt);
    if (!createdAt || createdAt > now + 5_000 || now - createdAt > MAX_ATTESTATION_AGE_MS) {
      throw new Error("A autenticação da compra expirou.");
    }
    const stampedAt = messageTimestamp(message);
    if (stampedAt && Math.abs(stampedAt - createdAt) > 60_000) throw new Error("A data da autenticação da compra não confere.");
    if (attestation.transactionId !== payload.transactionId || attestation.entryId !== payload.entryId
      || attestation.actorUuid !== payload.actorUuid || attestation.requestedMode !== mode
      || integer(attestation.quotedEntryRevision) !== payload.quotedEntryRevision
      || integer(attestation.quotedPriceCopper) !== payload.quotedPriceCopper) {
      throw new Error("Os dados autenticados da compra foram alterados.");
    }
  }

  private async validatePurchase(
    payload: CompanyStorePurchasePayload,
    requester: AuthorityUserLike,
    mode: CompanyStoreTransactionMode,
  ): Promise<ValidatedPurchase> {
    const user = userById(requester.id);
    if (!user?.active) throw new Error("O jogador solicitante não está ativo.");
    const actor = await this.adapter.resolveActor(payload.actorUuid);
    if (!actor || user.character?.uuid !== actor.uuid || !canOwnStoreActor(actor, user as unknown as User)) {
      throw new Error("O personagem não pertence ao jogador solicitante.");
    }
    const data = await this.repository.readStore();
    const entry = data.entries.find(candidate => candidate.id === payload.entryId && candidate.enabled);
    if (!entry || entry.transactionMode !== mode) throw new Error("A entrada ou o modo da Loja foi alterado.");
    if (entry.revision !== payload.quotedEntryRevision) throw new Error("A oferta foi atualizada. Abra o item novamente.");
    const item = await this.adapter.resolveItem(entry.itemUuid);
    if (!item) throw new Error("O Item PF2e da oferta não existe.");
    if (!this.adapter.isPhysicalItem(item)) throw new Error("A oferta não referencia um Item físico PF2e.");
    const price = this.adapter.resolvePrice(item, entry.priceOverride);
    if (!price || !sameCoins(price, payload.quotedPriceCopper ?? -1)) throw new Error("O preço da oferta foi atualizado.");
    const authorization = data.authorizations[actor.uuid ?? ""];
    const denial = this.authorizationDenial(entry, authorization);
    if (denial) throw new Error(denial.label);
    if (entry.stock !== undefined && entry.stock <= 0) throw new Error("Este item está esgotado.");
    const balance = this.adapter.balance(actor);
    if (!balance.available) throw new Error("O saldo PF2e do personagem está indisponível.");
    if (balance.copperValue < price.copperValue) throw new Error("Saldo insuficiente para esta compra.");
    if (data.transactions.some(transaction => transaction.actorUuid === actor.uuid && transaction.state === "recoveryRequired")) {
      throw new Error("Há uma transação deste personagem aguardando verificação do mestre.");
    }
    return { data, entry, actor, item, price, user };
  }

  private async transact(
    payload: CompanyStorePurchasePayload,
    requester: AuthorityUserLike,
    mode: CompanyStoreTransactionMode,
    approvedBy: string,
  ): Promise<CompanyStorePurchaseResult> {
    this.assertPrimaryGM();
    const fingerprint = transactionFingerprint({ requesterId: requester.id, actorUuid: payload.actorUuid, entryId: payload.entryId });
    const existingData = await this.repository.readStore();
    const existing = existingData.transactions.find(transaction => transaction.id === payload.transactionId);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new Error("O ID da transação já pertence a outra compra.");
      if (["completed", "rolledBack", "recoveryRequired"].includes(existing.state)) return this.resultFromRecord(existing);
      throw new Error("A transação já está em processamento.");
    }
    const validated = await this.validatePurchase(payload, requester, mode);
    let data = validated.data;
    let entry = validated.entry;
    const now = this.now();
    const transaction: CompanyStoreTransactionRecord = {
      id: payload.transactionId,
      fingerprint,
      requesterId: requester.id,
      actorUuid: payload.actorUuid,
      actorName: text(validated.actor.name, 180),
      entryId: entry.id,
      requestMessageUuid: payload.requestMessageUuid,
      itemUuid: entry.itemUuid,
      itemName: text(validated.item.name, 240),
      transactionMode: mode,
      state: "received",
      price: validated.price,
      priceLabel: formatCompanyCoins(validated.price),
      ...(entry.stock === undefined ? {} : { stockBefore: entry.stock }),
      createdItemIds: [],
      recovery: {
        debit: "notStarted",
        delivery: "notStarted",
        stock: entry.stock === undefined ? "notApplicable" : "unchanged",
      },
      createdAt: now,
      updatedAt: now,
      ...(mode === "approval" ? { approvedBy } : {}),
    };
    data.transactions.push(transaction);
    data.transactions = data.transactions.slice(-MAX_TRANSACTIONS);
    await this.persist(data);
    let debitConfirmed = false;
    let debitAmbiguous = false;
    try {
      transaction.recovery!.debit = "pending";
      await this.stage(data, transaction, "debiting");
      this.assertPrimaryGM();
      try {
        debitConfirmed = await this.adapter.removeCoins(validated.actor, validated.price);
      } catch (error) {
        debitAmbiguous = true;
        throw error;
      }
      if (!debitConfirmed) throw new Error("O PF2e recusou a remoção das moedas.");
      transaction.recovery!.debit = "confirmed";
      await this.stage(data, transaction, "debited");
      transaction.recovery!.delivery = "pending";
      await this.stage(data, transaction, "granting");
      this.assertPrimaryGM();
      transaction.createdItemIds = await this.adapter.grantItem(validated.actor, validated.item, transaction.id);
      transaction.recovery!.delivery = "confirmed";
      await this.stage(data, transaction, "granted");
      if (entry.stock !== undefined) transaction.recovery!.stock = "pending";
      await this.stage(data, transaction, "completing");
      this.assertPrimaryGM();
      entry = data.entries.find(candidate => candidate.id === entry.id) ?? entry;
      if (entry.stock !== undefined) {
        if (entry.stock <= 0) throw new Error("O estoque foi alterado durante a compra.");
        entry.stock -= 1;
        entry.revision += 1;
        transaction.recovery!.stock = "decremented";
      }
      transaction.state = "completed";
      transaction.updatedAt = this.now();
      transaction.completedAt = transaction.updatedAt;
      await this.persist(data);
      await this.synchronizeProjections();
      return this.resultFromRecord(transaction, entry.stock);
    } catch (error) {
      transaction.error = error instanceof Error ? error.message : String(error);
      const recoveryNotes: string[] = [];
      let recoveryRequired = debitAmbiguous;
      if (debitAmbiguous) transaction.recovery!.debit = "ambiguous";
      else if (!debitConfirmed) transaction.recovery!.debit = "notStarted";
      transaction.state = "compensating";
      transaction.updatedAt = this.now();
      try { await this.persist(data); } catch (persistError) {
        recoveryRequired = true;
        recoveryNotes.push(`Registro de compensação: ${persistError instanceof Error ? persistError.message : String(persistError)}`);
      }
      const grantedIds = Array.from(new Set([
        ...transaction.createdItemIds,
        ...this.adapter.transactionItemIds(validated.actor, transaction.id),
      ]));
      if (grantedIds.length) {
        try {
          await this.adapter.deleteGrantedItems(validated.actor, grantedIds);
          transaction.recovery!.delivery = "removed";
        }
        catch (rollbackError) {
          recoveryRequired = true;
          transaction.recovery!.delivery = "ambiguous";
          recoveryNotes.push(`Remoção do Item: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
        }
      }
      if (debitConfirmed) {
        try {
          await this.adapter.addCoins(validated.actor, validated.price);
          transaction.recovery!.debit = "refunded";
        }
        catch (rollbackError) {
          recoveryRequired = true;
          transaction.recovery!.debit = "ambiguous";
          recoveryNotes.push(`Estorno de moedas: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
        }
      }
      if (transaction.stockBefore !== undefined) {
        const currentEntry = data.entries.find(candidate => candidate.id === transaction.entryId);
        if (currentEntry) currentEntry.stock = transaction.stockBefore;
        transaction.recovery!.stock = "restored";
      }
      transaction.recoveryNotes = recoveryNotes;
      transaction.state = recoveryRequired ? "recoveryRequired" : "rolledBack";
      transaction.updatedAt = this.now();
      transaction.completedAt = transaction.updatedAt;
      try { await this.persist(data); } catch (persistError) {
        transaction.state = "recoveryRequired";
        transaction.recoveryNotes = [...recoveryNotes, `Persistência final: ${persistError instanceof Error ? persistError.message : String(persistError)}`];
      }
      if (transaction.state === "recoveryRequired") await this.alertRecovery(transaction);
      await this.synchronizeProjections().catch(() => undefined);
      return this.resultFromRecord(transaction, data.entries.find(candidate => candidate.id === entry.id)?.stock);
    }
  }

  private async stage(
    data: CompanyStoreData,
    transaction: CompanyStoreTransactionRecord,
    state: CompanyStoreTransactionRecord["state"],
  ): Promise<void> {
    this.assertPrimaryGM();
    transaction.state = state;
    transaction.updatedAt = this.now();
    await this.persist(data);
  }

  private async persist(data: CompanyStoreData): Promise<CompanyStoreData> {
    this.assertPrimaryGM();
    data.revision += 1;
    return this.repository.writeStore(data);
  }

  private resultFromRecord(transaction: CompanyStoreTransactionRecord, stockRemaining?: number): CompanyStorePurchaseResult {
    const state = transaction.state === "completed" ? "completed"
      : transaction.state === "recoveryRequired" ? "recoveryRequired" : "rolledBack";
    return {
      transactionId: transaction.id,
      actorName: transaction.actorName,
      itemName: transaction.itemName,
      priceLabel: transaction.priceLabel,
      state,
      completedAt: transaction.completedAt ?? transaction.updatedAt,
      approval: transaction.transactionMode === "approval",
      createdItemIds: [...transaction.createdItemIds],
      ...(stockRemaining === undefined ? {} : { stockRemaining }),
    };
  }

  private async buildSnapshotForUser(
    user: StoreUser,
    data: Readonly<CompanyStoreData>,
    readOnly: boolean,
  ): Promise<CompanyStoreSnapshot> {
    const actor = user.character as unknown as StoreActorDocument | null;
    const exactActor = actor?.type === "character" ? actor : null;
    const balance = this.adapter.balance(exactActor);
    const authorization = exactActor?.uuid ? data.authorizations[exactActor.uuid] : undefined;
    const recovery = exactActor?.uuid
      ? data.transactions.some(transaction => transaction.actorUuid === exactActor.uuid && transaction.state === "recoveryRequired")
      : false;
    const items: CompanyStoreItemDTO[] = [];
    for (const entry of data.entries.filter(candidate => candidate.enabled)) {
      const item = await this.adapter.resolveItem(entry.itemUuid);
      const broken = !item || !this.adapter.isPhysicalItem(item);
      if (broken && !user.isGM) continue;
      const price = item ? this.adapter.resolvePrice(item, entry.priceOverride) : null;
      const presentation = item ? this.adapter.itemPresentation(item) : { name: "Item PF2e indisponível" };
      const denial = !exactActor
        ? { code: "no-actor" as const, label: "Vincule um personagem para comprar." }
        : readOnly
          ? { code: "permission" as const, label: "Pré-visualização do mestre: compra desativada." }
          : !canOwnStoreActor(exactActor, user as unknown as User)
            ? { code: "permission" as const, label: "Sem permissão sobre o personagem." }
            : broken
              ? { code: "broken-item" as const, label: "O item não pôde ser carregado. Informe o mestre." }
              : !price
                ? { code: "broken-item" as const, label: "O preço PF2e está indisponível." }
                : recovery
                  ? { code: "recovery-required" as const, label: "Uma transação requer verificação do mestre." }
                  : !balance.available
                    ? { code: "currency-unavailable" as const, label: "Saldo PF2e indisponível." }
                    : this.authorizationDenial(entry, authorization)
                      ?? (entry.stock !== undefined && entry.stock <= 0
                        ? { code: "out-of-stock" as const, label: "Este item está esgotado." }
                        : balance.copperValue < price.copperValue
                          ? { code: "insufficient-funds" as const, label: "Saldo insuficiente." }
                          : null);
      const coins = price ?? { pp: 0, gp: 0, sp: 0, cp: 0, copperValue: 0 };
      const stockLabel = entry.stock === undefined ? "Disponível"
        : entry.stock === 0 ? "Esgotado"
          : entry.stock === 1 ? "Última unidade" : `${entry.stock} restantes`;
      const authorizationCode: CompanyStoreAuthorizationCode = denial?.code
        ?? (entry.transactionMode === "approval" ? "approval" : "authorized");
      items.push({
        id: entry.id,
        ...presentation,
        price: coins,
        priceLabel: price ? formatCompanyCoins(price) : "Preço indisponível",
        ...(entry.stock === undefined ? {} : { stock: entry.stock }),
        stockLabel,
        transactionMode: entry.transactionMode,
        actionLabel: denial?.label ?? (entry.transactionMode === "approval" ? "Solicitar compra" : "Comprar"),
        authorizationCode,
        authorizationLabel: denial?.label ?? (entry.transactionMode === "approval" ? "Requer aprovação" : "Autorizado"),
        authorized: !denial,
        affordable: Boolean(price && balance.available && balance.copperValue >= price.copperValue),
        available: !denial,
        featured: entry.featured === true,
        quoteRevision: entry.revision,
        ...(broken ? { broken: true } : {}),
      });
    }
    items.sort((left, right) => Number(right.featured) - Number(left.featured) || left.name.localeCompare(right.name, "pt-BR"));
    return {
      schemaVersion: COMPANY_STORE_SCHEMA_VERSION,
      revision: data.revision,
      ...(exactActor?.id ? { actorId: exactActor.id } : {}),
      ...(exactActor?.uuid ? { actorUuid: exactActor.uuid } : {}),
      ...(exactActor?.name ? { actorName: exactActor.name } : {}),
      balance,
      items,
      state: {
        noActor: !exactActor,
        currencyUnavailable: !balance.available,
        empty: items.length === 0,
      },
    };
  }

  private authorizationDenial(
    entry: CompanyStoreEntry,
    authorization: CompanyStorePrincipalAuthorization | undefined,
  ): { code: "rank" | "region" | "flag"; label: string } | null {
    if (entry.minimumRank !== undefined && (authorization?.rank ?? -1) < entry.minimumRank) {
      return { code: "rank", label: "Seu rank não autoriza esta compra." };
    }
    if (entry.allowedRegions?.length && !entry.allowedRegions.includes(authorization?.region ?? "")) {
      return { code: "region", label: "Este item não está disponível na região atual." };
    }
    if (entry.requiredFlags?.some(flag => !authorization?.flags.includes(flag))) {
      return { code: "flag", label: "Este personagem não possui a autorização necessária." };
    }
    return null;
  }

  private withSelected(snapshot: CompanyStoreSnapshot, selectedEntryId?: string | null): CompanyStoreSnapshot {
    const selectedItem = selectedEntryId ? snapshot.items.find(item => item.id === selectedEntryId) : undefined;
    return { ...snapshot, items: [...snapshot.items], ...(selectedItem ? { selectedItem } : {}) };
  }

  private async migrate(input: CompanyStoreData): Promise<CompanyStoreData> {
    let data = normalizeCompanyStoreData(input);
    if (!data.migration?.worldItemsImportedAt) {
      const itemUuids = itemCollection().filter(item => this.adapter.isPhysicalItem(item)).flatMap(item => item.uuid ? [item.uuid] : []);
      data = mergeWorldItems(data, itemUuids, this.now());
    }
    if (!data.migration?.authorizationsImportedAt) {
      const authorizations = { ...data.authorizations };
      for (const user of collection<StoreUser>(game.users)) {
        const actor = user.character;
        if (!actor?.uuid || authorizations[actor.uuid]) continue;
        const identity = CompanyIdentityService.resolve(actor as Actor);
        const identityFlag = record(moduleFlag(actor, "companyIdentity"));
        const profileFlag = record(moduleFlag(actor, "companyProfile"));
        const communicatorFlag = record(moduleFlag(actor, "fieldCommunicator"));
        const region = text(identityFlag.region ?? profileFlag.region ?? communicatorFlag.region, 120).toLocaleLowerCase();
        const flags = Array.from(new Set([
          ...collection<unknown>(identityFlag.storeFlags),
          ...collection<unknown>(profileFlag.storeFlags),
          ...collection<unknown>(communicatorFlag.storeFlags),
        ].map(normalizeRequiredFlag).filter((flag): flag is string => Boolean(flag))));
        authorizations[actor.uuid] = {
          actorUuid: actor.uuid,
          ...(identity.rank === undefined ? {} : { rank: identity.rank }),
          ...(region ? { region } : {}),
          flags,
          updatedAt: this.now(),
        };
      }
      data = normalizeCompanyStoreData({
        ...data,
        revision: data.revision + 1,
        authorizations,
        migration: { ...data.migration, authorizationsImportedAt: this.now() },
      });
    }
    return data;
  }

  private async inspectRecovery(
    data: CompanyStoreData,
    transaction: CompanyStoreTransactionRecord,
  ): Promise<RecoveryInspection> {
    const [actor, item] = await Promise.all([
      this.adapter.resolveActor(transaction.actorUuid),
      this.adapter.resolveItem(transaction.itemUuid),
    ]);
    const entry = data.entries.find(candidate => candidate.id === transaction.entryId);
    const itemIds = actor
      ? Array.from(new Set(this.adapter.transactionItemIds(actor, transaction.id))).filter(Boolean)
      : [];
    const evidence = transaction.recovery;
    const debit = evidence?.debit === "confirmed"
      ? recoveryStatus("confirmed", "Débito confirmado", "warning")
      : evidence?.debit === "refunded"
        ? recoveryStatus("refunded", "Estornado", "success")
        : evidence?.debit === "notStarted"
          ? recoveryStatus("notStarted", "Não debitado", "success")
          : recoveryStatus(evidence?.debit ?? "unknown", "Ambíguo", "danger");
    const delivery = !actor
      ? recoveryStatus("unknown", "Actor indisponível", "danger")
      : itemIds.length
        ? recoveryStatus("present", `${itemIds.length} Item(s) presente(s)`, "warning")
        : recoveryStatus("absent", "Nenhum Item da transação", "success");
    const stock = transaction.stockBefore === undefined
      ? recoveryStatus("notApplicable", "Ilimitado", "neutral")
      : !entry || entry.stock === undefined
        ? recoveryStatus("unknown", "Oferta/estoque indisponível", "danger")
        : entry.stock === transaction.stockBefore
          ? recoveryStatus("unchanged", `Inalterado (${entry.stock})`, "success")
          : entry.stock === Math.max(0, transaction.stockBefore - 1)
            ? recoveryStatus("decremented", `Decrementado (${entry.stock})`, "warning")
            : recoveryStatus("unknown", `Divergente (${entry.stock}; esperado ${transaction.stockBefore})`, "danger");
    const ambiguous = debit.state === "unknown" || debit.state === "pending" || debit.state === "ambiguous"
      || delivery.state === "unknown" || stock.state === "unknown";
    const primary = this.bridge.isPrimaryGM();
    const retryNeedsSourceItem = delivery.state === "absent";
    const retryEnabled = primary && !ambiguous && debit.state === "confirmed"
      && Boolean(actor && entry && (!retryNeedsSourceItem || item));
    const compensateEnabled = primary && !ambiguous && Boolean(actor)
      && ["confirmed", "refunded", "notStarted"].includes(debit.state);
    const reason = [transaction.error, ...(transaction.recoveryNotes ?? [])].filter(Boolean).join(" | ")
      || "A transação foi interrompida e requer reconciliação.";
    const diagnosticData = {
      transactionId: transaction.id,
      actor: { name: transaction.actorName, uuid: transaction.actorUuid, available: Boolean(actor) },
      item: { name: transaction.itemName, uuid: transaction.itemUuid, sourceAvailable: Boolean(item), transactionItemIds: itemIds },
      price: transaction.price,
      state: transaction.state,
      debit: debit.state,
      delivery: delivery.state,
      stock: stock.state,
      stockBefore: transaction.stockBefore,
      currentStock: entry?.stock,
      reason,
      recoveryEvidence: evidence ?? null,
      requiresGMReconciliation: ambiguous,
      updatedAt: transaction.updatedAt,
    };
    const recoveryCase: CompanyStoreRecoveryCaseDTO = {
      transactionId: transaction.id,
      shortId: shortId(transaction.id),
      actorName: transaction.actorName || transaction.actorUuid,
      actorUuid: transaction.actorUuid,
      itemName: transaction.itemName || transaction.itemUuid,
      itemUuid: transaction.itemUuid,
      priceLabel: transaction.priceLabel,
      reason,
      updatedAt: transaction.updatedAt,
      ambiguous,
      requiresGMReconciliation: ambiguous,
      debit,
      delivery,
      stock,
      actions: {
        retrySafeStep: {
          enabled: retryEnabled,
          reason: retryEnabled ? "A próxima etapa possui evidência persistida e pré-condições exatas."
            : ambiguous ? "Estado ambíguo: reconciliação manual obrigatória."
              : !primary ? "Somente o Gamemaster primário pode executar a recuperação."
                : "Não há uma próxima etapa automática segura.",
        },
        compensate: {
          enabled: compensateEnabled,
          reason: compensateEnabled ? "A compensação pode operar apenas sobre efeitos comprovados."
            : ambiguous ? "Estado ambíguo: nenhum Item será removido e nenhum valor será estornado automaticamente."
              : !primary ? "Somente o Gamemaster primário pode compensar."
                : "A compensação não possui evidência suficiente.",
        },
        markResolved: {
          enabled: primary,
          reason: primary ? "Exige resultado e nota da reconciliação manual do GM."
            : "Somente o Gamemaster primário pode encerrar a ocorrência.",
        },
        copyDiagnostic: { enabled: true, reason: "Copia somente o diagnóstico desta transação." },
      },
      diagnostic: JSON.stringify(diagnosticData, null, 2),
    };
    return { data, transaction, actor, item, entry, itemIds, recoveryCase };
  }

  private async retryRecoveryStepNow(transactionId: string): Promise<CompanyStoreRecoveryActionResult> {
    this.assertPrimaryGM();
    return this.withTransactionLock(async () => {
      const data = await this.repository.readStore();
      const transaction = data.transactions.find(candidate => candidate.id === transactionId);
      if (!transaction) throw new Error("Transação de recuperação não encontrada.");
      if (transaction.state !== "recoveryRequired") {
        return { transactionId, state: transaction.state, changed: false, message: "A transação já foi encerrada." };
      }
      const inspected = await this.inspectRecovery(data, transaction);
      if (!inspected.recoveryCase.actions.retrySafeStep.enabled || !transaction.recovery) {
        throw new Error(inspected.recoveryCase.actions.retrySafeStep.reason);
      }
      if (inspected.recoveryCase.delivery.state === "absent") {
        transaction.recovery.delivery = "pending";
        await this.persist(data);
        try {
          transaction.createdItemIds = await this.adapter.grantItem(inspected.actor!, inspected.item!, transaction.id);
          transaction.recovery.delivery = "confirmed";
          await this.persist(data);
          await this.synchronizeProjections();
          return { transactionId, state: transaction.state, changed: true, message: "Entrega refeita com segurança; revise a próxima etapa." };
        } catch (error) {
          transaction.recovery.delivery = "ambiguous";
          transaction.error = error instanceof Error ? error.message : String(error);
          await this.persist(data);
          throw error;
        }
      }
      if (transaction.stockBefore !== undefined && inspected.recoveryCase.stock.state === "unchanged") {
        inspected.entry!.stock = Math.max(0, transaction.stockBefore - 1);
        inspected.entry!.revision += 1;
        transaction.recovery.stock = "decremented";
        await this.persist(data);
        await this.synchronizeProjections();
        return { transactionId, state: transaction.state, changed: true, message: "Estoque decrementado com segurança; revise a conclusão." };
      }
      transaction.state = "completed";
      transaction.completedAt = transaction.updatedAt = this.now();
      transaction.recoveryResolution = {
        outcome: "completed", note: "Concluída por RETRY SAFE STEP.", resolvedAt: transaction.updatedAt,
        resolvedBy: String(game.user?.id ?? "primary-gm"),
      };
      await this.persist(data);
      await this.synchronizeProjections();
      return { transactionId, state: "completed", changed: true, message: "Transação concluída com evidência consistente." };
    });
  }

  private async compensateRecoveryNow(transactionId: string): Promise<CompanyStoreRecoveryActionResult> {
    this.assertPrimaryGM();
    return this.withTransactionLock(async () => {
      const data = await this.repository.readStore();
      const transaction = data.transactions.find(candidate => candidate.id === transactionId);
      if (!transaction) throw new Error("Transação de recuperação não encontrada.");
      if (transaction.state !== "recoveryRequired") {
        return { transactionId, state: transaction.state, changed: false, message: "A transação já foi encerrada." };
      }
      let inspected = await this.inspectRecovery(data, transaction);
      if (!inspected.recoveryCase.actions.compensate.enabled || !transaction.recovery) {
        throw new Error(inspected.recoveryCase.actions.compensate.reason);
      }
      if (inspected.itemIds.length) {
        transaction.recovery.delivery = "pending";
        await this.persist(data);
        try {
          await this.adapter.deleteGrantedItems(inspected.actor!, inspected.itemIds);
          transaction.recovery.delivery = "removed";
          await this.persist(data);
        } catch (error) {
          transaction.recovery.delivery = "ambiguous";
          transaction.error = error instanceof Error ? error.message : String(error);
          await this.persist(data);
          throw error;
        }
      }
      inspected = await this.inspectRecovery(data, transaction);
      if (transaction.stockBefore !== undefined && inspected.recoveryCase.stock.state === "decremented") {
        inspected.entry!.stock = transaction.stockBefore;
        inspected.entry!.revision += 1;
        transaction.recovery.stock = "restored";
        await this.persist(data);
      }
      if (transaction.recovery.debit === "confirmed") {
        transaction.recovery.debit = "pending";
        await this.persist(data);
        try {
          await this.adapter.addCoins(inspected.actor!, transaction.price);
          transaction.recovery.debit = "refunded";
          await this.persist(data);
        } catch (error) {
          transaction.recovery.debit = "ambiguous";
          transaction.error = error instanceof Error ? error.message : String(error);
          await this.persist(data);
          throw error;
        }
      }
      transaction.state = "rolledBack";
      transaction.completedAt = transaction.updatedAt = this.now();
      transaction.recoveryResolution = {
        outcome: "rolledBack", note: "Compensação segura concluída pelo Recovery Center.",
        resolvedAt: transaction.updatedAt, resolvedBy: String(game.user?.id ?? "primary-gm"),
      };
      await this.persist(data);
      await this.synchronizeProjections();
      return { transactionId, state: "rolledBack", changed: true, message: "Compensação concluída sem inferir estado ambíguo." };
    });
  }

  private async markRecoveryResolvedNow(
    transactionId: string,
    outcome: "completed" | "rolledBack",
    note: string,
  ): Promise<CompanyStoreRecoveryActionResult> {
    this.assertPrimaryGM();
    return this.withTransactionLock(async () => {
      const data = await this.repository.readStore();
      const transaction = data.transactions.find(candidate => candidate.id === transactionId);
      if (!transaction) throw new Error("Transação de recuperação não encontrada.");
      if (transaction.state !== "recoveryRequired") {
        const sameResolution = transaction.recoveryResolution?.outcome === outcome
          && transaction.recoveryResolution.note === note;
        if (!sameResolution) throw new Error("A transação já foi encerrada com outro resultado.");
        return { transactionId, state: transaction.state, changed: false, message: "A reconciliação já estava registrada." };
      }
      transaction.state = outcome;
      transaction.completedAt = transaction.updatedAt = this.now();
      transaction.recoveryResolution = {
        outcome, note, resolvedAt: transaction.updatedAt, resolvedBy: String(game.user?.id ?? "primary-gm"),
      };
      await this.persist(data);
      await this.synchronizeProjections();
      return { transactionId, state: outcome, changed: true, message: "Reconciliação manual registrada." };
    });
  }

  private async reconcile(input: CompanyStoreData): Promise<CompanyStoreData> {
    const data = normalizeCompanyStoreData(input);
    for (const transaction of data.transactions) {
      if (["completed", "rolledBack", "recoveryRequired"].includes(transaction.state)) continue;
      if (transaction.state === "received") {
        transaction.state = "rolledBack";
        transaction.updatedAt = this.now();
        transaction.completedAt = transaction.updatedAt;
        continue;
      }
      const interruptedState = transaction.state;
      const recovery: CompanyStoreRecoveryEvidence = transaction.recovery ?? {
        debit: interruptedState === "debiting" || interruptedState === "compensating" ? "ambiguous" : "confirmed",
        delivery: interruptedState === "compensating" ? "ambiguous"
          : interruptedState === "debited" ? "notStarted"
          : interruptedState === "granting" ? "ambiguous" : "confirmed",
        stock: transaction.stockBefore === undefined ? "notApplicable"
          : interruptedState === "completing" || interruptedState === "compensating" ? "ambiguous" : "unchanged",
      };
      transaction.state = "recoveryRequired";
      transaction.recovery = recovery;
      transaction.error = `A etapa ${interruptedState} foi interrompida após troca de autoridade; nenhuma mutação automática foi aplicada.`;
      transaction.updatedAt = this.now();
      transaction.completedAt = transaction.updatedAt;
      await this.alertRecovery(transaction);
    }
    return data;
  }

  private async enforceHandlerPolicies(): Promise<void> {
    this.assertPrimaryGM();
    const policies = await this.bridge.getPolicyConfiguration();
    const handlers = {
      ...policies.handlers,
      [COMPANY_STORE_AUTOMATIC_HANDLER]: "auto" as const,
      [COMPANY_STORE_APPROVAL_HANDLER]: "approval" as const,
    };
    if (policies.handlers?.[COMPANY_STORE_AUTOMATIC_HANDLER] === "auto"
      && policies.handlers?.[COMPANY_STORE_APPROVAL_HANDLER] === "approval") return;
    await this.bridge.setPolicyConfiguration({ ...policies, handlers });
  }

  private async mutateStore(
    options: CompanyStoreMutationOptions,
    updater: (data: CompanyStoreData) => void,
  ): Promise<CompanyStoreData> {
    this.assertPrimaryGM();
    return this.withTransactionLock(async () => {
      const data = await this.repository.readStore();
      if (options.expectedRevision !== undefined && options.expectedRevision !== data.revision) {
        throw new Error("A Loja foi atualizada por outro mestre. Recarregue antes de tentar novamente.");
      }
      updater(data);
      data.revision += 1;
      const written = await this.repository.writeStore(data);
      await this.synchronizeProjections();
      return written;
    });
  }

  private async alertRecovery(transaction: CompanyStoreTransactionRecord): Promise<void> {
    console.error(`${ETHERNUM.MODULE_NAME} | Company Store recovery required`, transaction);
    const gmIds = collection<StoreUser>(game.users).filter(user => user.isGM).flatMap(user => user.id ? [user.id] : []);
    if (!gmIds.length) return;
    await ChatMessage.create({
      content: `<p><strong>Loja da Companhia:</strong> a transação <code>${escapeHtml(shortId(transaction.id))}</code> requer verificação manual.</p>`,
      whisper: gmIds,
      flags: { [ETHERNUM.MODULE_NAME]: { companyStoreRecovery: { transactionId: transaction.id } } },
    } as never).catch(() => undefined);
  }

  private assertPrimaryGM(): void {
    if (!this.bridge.isPrimaryGM()) throw new Error("Somente o Gamemaster primário pode alterar a Loja da Companhia.");
  }

  private coalesceRecoveryAction(
    action: string,
    transactionId: string,
    operation: () => Promise<CompanyStoreRecoveryActionResult>,
  ): Promise<CompanyStoreRecoveryActionResult> {
    const id = text(transactionId, 140);
    if (!id) return Promise.reject(new Error("Transaction ID inválido."));
    const key = `${action}\u001f${id}`;
    const existing = this.pendingRecoveryActions.get(key);
    if (existing) return existing;
    const pending = operation().finally(() => this.pendingRecoveryActions.delete(key));
    this.pendingRecoveryActions.set(key, pending);
    return pending;
  }

  private async withTransactionLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try { return await operation(); }
    finally { release(); }
  }

  private async resolveUuid<T>(uuid: string): Promise<T | null> {
    try { return await fromUuid(uuid as Parameters<typeof fromUuid>[0]) as T | null; }
    catch { return null; }
  }
}

let companyStoreService: CompanyStoreService | null = null;

export function getCompanyStoreService(): CompanyStoreService {
  companyStoreService ??= new CompanyStoreService();
  return companyStoreService;
}

export async function initializeCompanyStoreService(): Promise<CompanyStoreService> {
  const service = getCompanyStoreService();
  await service.initialize();
  return service;
}
