import { AutomationAuthority } from "../core/AutomationAuthority.js";
import { parseCompanyStorePrice } from "../store/CompanyStoreModel.js";
import { PF2eStoreAdapter, type StoreActorDocument } from "../store/PF2eStoreAdapter.js";
import { CompanyRewardRepository } from "./CompanyRewardRepository.js";
import type { CompanyRewardData, CompanyRewardGrantInput, CompanyRewardRecord, CompanyRewardResult } from "./CompanyRewardTypes.js";

function text(value: unknown, maximum = 500): string { return typeof value === "string" ? value.trim().slice(0, maximum) : ""; }
function integer(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0; }

export class CompanyRewardService {
  private tail: Promise<void> = Promise.resolve();
  constructor(
    private readonly repository = new CompanyRewardRepository(),
    private readonly adapter = new PF2eStoreAdapter(),
    private readonly now: () => number = Date.now,
  ) {}

  initialize(): Promise<CompanyRewardData> {
    return AutomationAuthority.isPrimaryGM() ? this.repository.initialize() : this.repository.read();
  }
  getLedger(): Promise<CompanyRewardData> { return this.repository.read(); }

  grant(input: CompanyRewardGrantInput): Promise<CompanyRewardResult> {
    const operation = this.tail.then(() => this.execute(input), () => this.execute(input));
    this.tail = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async execute(input: CompanyRewardGrantInput): Promise<CompanyRewardResult> {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode distribuir recompensas.");
    const transactionId = text(input.transactionId, 160);
    const actorUuid = text(input.actorUuid, 300);
    if (!transactionId || !actorUuid) throw new Error("Recompensa inválida.");
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
    let currencyGranted = false;
    try {
      record = { ...record, state: "granting", updatedAt: this.now() };
      ledger = await this.save(ledger, record);
      if (item) record.createdItemIds = await this.adapter.grantItem(actor, item, `reward:${transactionId}`);
      if (coins?.copperValue) { await this.adapter.addCoins(actor, coins); currencyGranted = true; }
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
      try { if (currencyGranted && coins) await this.adapter.removeCoins(actor, coins); } catch (rollback) { recoveryNotes.push(`Moeda: ${String(rollback)}`); }
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
}

let service: CompanyRewardService | null = null;
export function getCompanyRewardService(): CompanyRewardService { return service ??= new CompanyRewardService(); }
