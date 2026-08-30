import type { AuthorityBridge, AuthorityHandlerContext } from "../core/AuthorityBridge.js";
import { getEthernumAuthorityBridge } from "../core/EthernumAuthority.js";
import { parseCompanyStorePrice } from "../store/CompanyStoreModel.js";
import { PF2eStoreAdapter, type StoreActorDocument } from "../store/PF2eStoreAdapter.js";
import { CompanyRewardRepository, normalizeCompanyRewardData } from "./CompanyRewardRepository.js";
import type { CompanyRewardData, CompanyRewardGrantInput, CompanyRewardRecord, CompanyRewardResult } from "./CompanyRewardTypes.js";

function text(value: unknown, maximum = 500): string { return typeof value === "string" ? value.trim().slice(0, maximum) : ""; }
function integer(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0; }

export const COMPANY_REWARD_AUTHORITY_HANDLER = "company-reward-grant";
export type CompanyRewardAuthority = Pick<AuthorityBridge, "isPrimaryGM" | "registerHandler" | "request">;

export class CompanyRewardService {
  private tail: Promise<void> = Promise.resolve();
  private authorityHandlerRegistered = false;
  constructor(
    private readonly repository = new CompanyRewardRepository(),
    private readonly adapter = new PF2eStoreAdapter(),
    private readonly now: () => number = Date.now,
    private readonly authority: CompanyRewardAuthority = getEthernumAuthorityBridge(),
  ) {}

  async initialize(): Promise<CompanyRewardData> {
    if (!game.user?.isGM) return normalizeCompanyRewardData({});
    this.registerAuthorityHandler();
    return this.authority.isPrimaryGM()
      ? this.repository.initialize()
      : this.repository.read();
  }
  getLedger(): Promise<CompanyRewardData> { return this.repository.read(); }

  async grant(input: CompanyRewardGrantInput): Promise<CompanyRewardResult> {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode distribuir recompensas.");
    const reward = this.normalizeInput(input);
    this.registerAuthorityHandler();
    if (!this.authority.isPrimaryGM()) {
      return this.authority.request<CompanyRewardGrantInput, CompanyRewardResult>({
        handlerId: COMPANY_REWARD_AUTHORITY_HANDLER,
        category: "reward",
        actionId: "grant",
        sourceActorUuid: reward.actorUuid,
        summary: "Distribuir recompensa administrativa",
        idempotencyKey: `company-reward:${reward.transactionId}`,
        payload: reward,
      });
    }
    return this.enqueue(reward);
  }

  private enqueue(input: CompanyRewardGrantInput): Promise<CompanyRewardResult> {
    const operation = this.tail.then(() => this.execute(input), () => this.execute(input));
    this.tail = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async execute(input: CompanyRewardGrantInput): Promise<CompanyRewardResult> {
    if (!game.user?.isGM || !this.authority.isPrimaryGM()) {
      throw new Error("Somente o Gamemaster primário pode aplicar recompensas.");
    }
    const transactionId = input.transactionId;
    const actorUuid = input.actorUuid;
    let ledger = await this.repository.read();
    const previous = ledger.rewards.find(entry => entry.transactionId === transactionId);
    if (previous?.state === "completed") return this.result(previous);
    if (previous && !["rolledBack", "recoveryRequired"].includes(previous.state)) throw new Error("Esta recompensa já está em processamento.");

    const actor = await this.adapter.resolveActor(actorUuid);
    if (!actor) throw new Error("Personagem PF2e não encontrado.");
    const item = input.itemUuid ? await this.adapter.resolveItem(text(input.itemUuid, 300)) : null;
    if (input.itemUuid && (!item || !this.adapter.isPhysicalItem(item))) throw new Error("Item PF2e físico inválido.");
    const coins = input.currency ? parseCompanyStorePrice(input.currency) : null;
    if (input.currency && !coins) throw new Error("Valor monetário inválido.");
    const now = this.now();
    let record: CompanyRewardRecord = {
      ...input,
      transactionId,
      actorUuid,
      actorName: text(actor.name, 180),
      ...(item ? { itemName: text(item.name, 240) } : {}),
      xpMetadata: integer(input.xpMetadata),
      epMetadata: integer(input.epMetadata),
      state: "received",
      createdItemIds: [],
      createdAt: now,
      updatedAt: now,
    };
    ledger = await this.save(ledger, record);
    let itemGrantAttempted = false;
    let itemGrantConfirmed = false;
    let currencyGrantAttempted = false;
    let currencyGrantConfirmed = false;
    try {
      record = { ...record, state: "granting", updatedAt: this.now() };
      ledger = await this.save(ledger, record);
      if (item) {
        itemGrantAttempted = true;
        record.createdItemIds = await this.adapter.grantItem(actor, item, `reward:${transactionId}`);
        itemGrantConfirmed = true;
      }
      if (coins?.copperValue) {
        currencyGrantAttempted = true;
        await this.adapter.addCoins(actor, coins);
        currencyGrantConfirmed = true;
      }
      record = { ...record, state: "granted", updatedAt: this.now() };
      ledger = await this.save(ledger, record);
      record = { ...record, state: "completed", completedAt: this.now(), updatedAt: this.now() };
      await this.save(ledger, record);
      return this.result(record);
    } catch (error) {
      const recoveryNotes: string[] = [];
      record = { ...record, state: "compensating", error: error instanceof Error ? error.message : String(error), updatedAt: this.now() };
      ledger = await this.save(ledger, record);
      try { if (record.createdItemIds.length) await this.adapter.deleteGrantedItems(actor, record.createdItemIds); } catch (rollback) { recoveryNotes.push(`Item: ${String(rollback)}`); }
      if (itemGrantAttempted && !itemGrantConfirmed) recoveryNotes.push("Item: resultado da concessão não confirmado.");
      try { if (currencyGrantConfirmed && coins) await this.adapter.removeCoins(actor, coins); } catch (rollback) { recoveryNotes.push(`Moeda: ${String(rollback)}`); }
      if (currencyGrantAttempted && !currencyGrantConfirmed) recoveryNotes.push("Moeda: resultado da concessão não confirmado.");
      record = {
        ...record,
        state: recoveryNotes.length ? "recoveryRequired" : "rolledBack",
        recoveryNotes,
        updatedAt: this.now(),
      };
      await this.save(ledger, record);
      return this.result(record);
    }
  }

  private async save(data: CompanyRewardData, record: CompanyRewardRecord): Promise<CompanyRewardData> {
    const rewards = [...data.rewards.filter(entry => entry.transactionId !== record.transactionId), record];
    return this.repository.write({ ...data, revision: data.revision + 1, rewards });
  }

  private result(record: CompanyRewardRecord): CompanyRewardResult {
    return {
      transactionId: record.transactionId,
      actorName: record.actorName ?? record.actorUuid,
      ...(record.itemName ? { itemName: record.itemName } : {}),
      ...(record.currency ? { currency: record.currency } : {}),
      xpMetadata: integer(record.xpMetadata),
      epMetadata: integer(record.epMetadata),
      ...(record.commendation ? { commendation: record.commendation } : {}),
      state: record.state === "completed" ? "completed" : record.state === "rolledBack" ? "rolledBack" : "recoveryRequired",
    };
  }

  private registerAuthorityHandler(): void {
    if (this.authorityHandlerRegistered || !game.user?.isGM) return;
    this.authority.registerHandler<CompanyRewardGrantInput, CompanyRewardResult>(COMPANY_REWARD_AUTHORITY_HANDLER, {
      validate: context => this.validateAuthorityRequest(context),
      execute: context => this.enqueue(context.request.payload),
    }, { replace: true });
    this.authorityHandlerRegistered = true;
  }

  private validateAuthorityRequest(
    context: AuthorityHandlerContext<CompanyRewardGrantInput>,
  ): { payload: CompanyRewardGrantInput } {
    if (!context.requester.isGM || !context.authority.isGM) {
      throw new Error("Recompensa administrativa sem autoria GM verificável.");
    }
    return { payload: this.normalizeInput(context.request.payload) };
  }

  private normalizeInput(input: CompanyRewardGrantInput): CompanyRewardGrantInput {
    const transactionId = text(input?.transactionId, 160);
    const actorUuid = text(input?.actorUuid, 300);
    if (!transactionId || !actorUuid) throw new Error("Recompensa inválida.");
    const contractId = text(input.contractId, 160);
    const itemUuid = text(input.itemUuid, 300);
    const currency = text(input.currency, 80);
    const commendation = text(input.commendation, 240);
    const note = text(input.note, 1_000);
    return {
      transactionId,
      actorUuid,
      ...(contractId ? { contractId } : {}),
      ...(itemUuid ? { itemUuid } : {}),
      ...(currency ? { currency } : {}),
      ...(input.xpMetadata === undefined ? {} : { xpMetadata: integer(input.xpMetadata) }),
      ...(input.epMetadata === undefined ? {} : { epMetadata: integer(input.epMetadata) }),
      ...(commendation ? { commendation } : {}),
      ...(note ? { note } : {}),
    };
  }
}

let service: CompanyRewardService | null = null;
export function getCompanyRewardService(): CompanyRewardService { return service ??= new CompanyRewardService(); }
