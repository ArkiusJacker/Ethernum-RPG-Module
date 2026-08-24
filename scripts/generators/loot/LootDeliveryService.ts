import { ETHERNUM } from "../../config.js";
import { coinsFromCopper } from "../../store/CompanyStoreModel.js";
import { formatCompanyCoins, PF2eStoreAdapter, type StoreActorDocument, type StoreItemDocument } from "../../store/PF2eStoreAdapter.js";
import { LootApplicationRepository } from "./LootApplicationRepository.js";
import type {
  LootApplicationData,
  LootApplicationInput,
  LootApplicationRecord,
  LootApplicationResult,
  LootManifest,
} from "./LootGeneratorTypes.js";

function text(value: unknown, maximum = 500): string { return typeof value === "string" ? value.trim().slice(0, maximum) : ""; }
function integer(value: unknown, maximum = 100_000_000): number { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.min(maximum, Math.floor(parsed))) : 0; }
function escapeHtml(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function validateManifest(manifest: LootManifest): void {
  if (!text(manifest?.manifestId, 160) || !Array.isArray(manifest?.items) || manifest.items.length > 30) throw new Error("Manifesto de loot inválido.");
  const itemTotal = manifest.items.reduce((sum, item) => sum + integer(item.priceCopper) * integer(item.quantity, 20), 0);
  const currency = integer(manifest.currencyCopper);
  const budget = integer(manifest.totalCopper);
  if (itemTotal + currency !== budget) throw new Error("O orçamento do manifesto não fecha.");
  if (itemTotal !== integer(manifest.spentCopper) || budget !== integer(manifest.input?.budgetCopper)) throw new Error("Os totais do manifesto foram alterados.");
  for (const item of manifest.items) {
    if (!text(item.uuid, 300) || !text(item.name, 240) || integer(item.quantity, 20) < 1) throw new Error("Item de loot inválido.");
    if (integer(item.subtotalCopper) !== integer(item.priceCopper) * integer(item.quantity, 20)) throw new Error(`Subtotal inválido para ${item.name}.`);
  }
}

export class LootDeliveryService {
  private tail: Promise<void> = Promise.resolve();
  constructor(
    private readonly repository = new LootApplicationRepository(),
    private readonly adapter = new PF2eStoreAdapter(),
    private readonly now: () => number = Date.now,
  ) {}

  initialize(): Promise<LootApplicationData> { return this.repository.initialize(); }

  apply(input: LootApplicationInput): Promise<LootApplicationResult> {
    const operation = this.tail.then(() => this.execute(input), () => this.execute(input));
    this.tail = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async postToChat(manifest: LootManifest): Promise<string> {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode publicar loot.");
    validateManifest(manifest);
    const itemRows = manifest.items.length
      ? manifest.items.map(item => `<li><strong>${escapeHtml(item.quantity)}x ${escapeHtml(item.name)}</strong><span>Nível ${item.level} · ${escapeHtml(item.rarity)} · ${formatCompanyCoins(coinsFromCopper(item.subtotalCopper))}</span></li>`).join("")
      : "<li><strong>Nenhum item</strong><span>O orçamento foi preservado como moeda.</span></li>";
    const messageData = {
      content: `<section class="ethernum-chat-card ethernum-loot-card"><header><i class="fas fa-box-open"></i><div><strong>Manifesto de Loot</strong><span>Semente ${escapeHtml(manifest.seed)}</span></div></header><ul>${itemRows}</ul><footer><span>Moeda: ${formatCompanyCoins(coinsFromCopper(manifest.currencyCopper))}</span><strong>Total: ${formatCompanyCoins(coinsFromCopper(manifest.totalCopper))}</strong></footer></section>`,
      speaker: ChatMessage.getSpeaker({ alias: "Ethernum Command Device" }),
      flags: { [ETHERNUM.MODULE_NAME]: { lootManifestId: manifest.manifestId } },
    } as unknown as Parameters<typeof ChatMessage.create>[0];
    const source = await ChatMessage.create(messageData);
    return String((source as { id?: string | null })?.id ?? manifest.manifestId);
  }

  private async execute(input: LootApplicationInput): Promise<LootApplicationResult> {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode enviar loot.");
    const applicationId = text(input.applicationId, 160);
    const actorUuid = text(input.actorUuid, 300);
    if (!applicationId || !actorUuid) throw new Error("Aplicação de loot inválida.");
    validateManifest(input.manifest);
    let ledger = await this.repository.read();
    const previous = ledger.applications.find(entry => entry.applicationId === applicationId);
    if (previous?.state === "completed") return this.result(previous);
    if (previous && previous.state !== "rolledBack") throw new Error("Esta aplicação de loot requer reconciliação antes de uma nova tentativa.");
    const actor = await this.adapter.resolveLootActor(actorUuid);
    if (!actor) throw new Error("Selecione um Actor PF2e do tipo Loot.");
    const resolved: Array<{ item: StoreItemDocument; quantity: number }> = [];
    for (const entry of input.manifest.items) {
      const item = await this.adapter.resolveItem(entry.uuid);
      if (!item || !this.adapter.isPhysicalItem(item)) throw new Error(`Item PF2e indisponível: ${entry.name}.`);
      resolved.push({ item, quantity: integer(entry.quantity, 20) });
    }
    const now = this.now();
    let record: LootApplicationRecord = {
      ...input, applicationId, actorUuid, actorName: text(actor.name, 180) || actorUuid,
      state: "received", createdItemIds: [], currencyGranted: false, createdAt: now, updatedAt: now,
    };
    ledger = await this.save(ledger, record);
    try {
      record = { ...record, state: "granting", updatedAt: this.now() };
      ledger = await this.save(ledger, record);
      for (const [index, entry] of resolved.entries()) {
        for (let quantity = 0; quantity < entry.quantity; quantity += 1) {
          const ids = await this.adapter.grantItem(actor, entry.item, `loot:${applicationId}:${index}:${quantity}`);
          record.createdItemIds.push(...ids);
        }
      }
      if (input.manifest.currencyCopper > 0) {
        await this.adapter.addCoins(actor, coinsFromCopper(input.manifest.currencyCopper));
        record.currencyGranted = true;
      }
      record = { ...record, state: "completed", completedAt: this.now(), updatedAt: this.now() };
      await this.save(ledger, record);
      return this.result(record);
    } catch (error) {
      const recoveryNotes: string[] = [];
      record = { ...record, state: "compensating", error: error instanceof Error ? error.message : String(error), updatedAt: this.now() };
      ledger = await this.save(ledger, record);
      try { await this.adapter.deleteGrantedItems(actor, record.createdItemIds); } catch (rollback) { recoveryNotes.push(`Itens: ${String(rollback)}`); }
      try { if (record.currencyGranted) await this.adapter.removeCoins(actor, coinsFromCopper(input.manifest.currencyCopper)); } catch (rollback) { recoveryNotes.push(`Moeda: ${String(rollback)}`); }
      record = { ...record, state: recoveryNotes.length ? "recoveryRequired" : "rolledBack", recoveryNotes, updatedAt: this.now() };
      await this.save(ledger, record);
      return this.result(record);
    }
  }

  private async save(data: LootApplicationData, record: LootApplicationRecord): Promise<LootApplicationData> {
    return this.repository.write({ ...data, revision: data.revision + 1, applications: [...data.applications.filter(entry => entry.applicationId !== record.applicationId), record] });
  }
  private result(record: LootApplicationRecord): LootApplicationResult {
    return {
      applicationId: record.applicationId,
      actorName: record.actorName,
      itemCount: record.manifest.items.reduce((sum, item) => sum + integer(item.quantity, 20), 0),
      currencyCopper: integer(record.manifest.currencyCopper),
      state: record.state === "completed" ? "completed" : record.state === "rolledBack" ? "rolledBack" : "recoveryRequired",
    };
  }
}

let service: LootDeliveryService | null = null;
export function getLootDeliveryService(): LootDeliveryService { return service ??= new LootDeliveryService(); }
