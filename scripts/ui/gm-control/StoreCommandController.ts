import { storeEntryIdFromUuid } from "../../store/CompanyStoreModel.js";
import { getCompanyStoreService } from "../../store/CompanyStoreService.js";
import {
  collection,
  csv,
  escapeHtml,
  field,
  formDialog,
  runCommand,
  type GMControlDomainCommandHandler,
} from "./GMCommandSupport.js";

const ACTIONS = new Set([
  "store-recovery-retry",
  "store-recovery-compensate",
  "store-recovery-resolve",
  "store-recovery-copy",
  "store-add",
  "store-edit",
  "store-toggle",
  "store-remove",
]);

export const handleStoreCommand: GMControlDomainCommandHandler = async (action, payload) => {
  if (!ACTIONS.has(action)) return false;
  const store = getCompanyStoreService();

  if (action === "store-recovery-retry") {
    const result = await store.retryRecoveryStep(payload.transactionId);
    ui.notifications?.info(result.message);
    return true;
  }
  if (action === "store-recovery-compensate") {
    const data = await formDialog("Compensar transação", `
      <p>Somente efeitos comprovados serão revertidos. A operação será interrompida se qualquer etapa se tornar ambígua.</p>
      <label><input type="checkbox" name="confirm"> Confirmo a compensação segura da transação <code>${escapeHtml(payload.transactionId)}</code>.</label>
    `, "Compensar");
    if (!data) return true;
    if (data.get("confirm") !== "on") throw new Error("Confirme a compensação antes de continuar.");
    const result = await store.compensateRecovery(payload.transactionId);
    ui.notifications?.info(result.message);
    return true;
  }
  if (action === "store-recovery-resolve") {
    const data = await formDialog("Registrar reconciliação manual", `
      <p class="ethernum-command-dialog__notice"><i class="fas fa-triangle-exclamation"></i> Esta ação não cria Item nem estorna moedas. Confira Actor, inventário, saldo e estoque manualmente antes de encerrar.</p>
      <label>Resultado reconciliado<select name="outcome"><option value="rolledBack">Compensada / cancelada</option><option value="completed">Compra concluída</option></select></label>
      <label>Nota da reconciliação<textarea name="note" minlength="8" maxlength="1000" required></textarea></label>
      <label><input type="checkbox" name="confirm"> Confirmo que reconciliei o estado no PF2e.</label>
    `, "Marcar resolvida");
    if (!data) return true;
    if (data.get("confirm") !== "on") throw new Error("Confirme a reconciliação manual antes de encerrar.");
    const outcome = field(data, "outcome") === "completed" ? "completed" : "rolledBack";
    const result = await store.markRecoveryResolved(payload.transactionId, outcome, field(data, "note"));
    ui.notifications?.info(result.message);
    return true;
  }
  if (action === "store-recovery-copy") {
    await globalThis.navigator?.clipboard?.writeText(await store.recoveryDiagnostic(payload.transactionId));
    ui.notifications?.info("Diagnóstico da transação copiado.");
    return true;
  }
  if (action === "store-add" || action === "store-edit") {
    const repository = await store.getStore();
    const existing = repository.entries.find(entry => entry.id === payload.entryId);
    const worldItems = collection<{ uuid?: string | null; name?: string | null }>(
      (game as Game & { items?: Iterable<{ uuid?: string | null; name?: string | null }> }).items,
    );
    const options = worldItems.filter(item => item.uuid && item.name)
      .map(item => `<option value="${escapeHtml(item.uuid)}"${existing?.itemUuid === item.uuid ? " selected" : ""}>${escapeHtml(item.name)}</option>`)
      .join("");
    const data = await formDialog(existing ? "Editar oferta" : "Adicionar Item PF2e", `
      <label>Item PF2e<select name="itemUuid" required><option value="">Selecione</option>${options}</select></label>
      <label>Preço substituto<input name="priceOverride" placeholder="2 gp 5 sp" value="${escapeHtml(existing?.priceOverride ?? "")}"></label>
      <label>Estoque<input type="number" min="0" name="stock" placeholder="Ilimitado" value="${existing?.stock ?? ""}"></label>
      <label>Rank mínimo<input type="number" min="0" name="minimumRank" value="${existing?.minimumRank ?? ""}"></label>
      <label>Regiões autorizadas<input name="allowedRegions" value="${escapeHtml((existing?.allowedRegions ?? []).join(", "))}"></label>
      <label>Processamento<select name="transactionMode"><option value="approval"${existing?.transactionMode === "approval" ? " selected" : ""}>Aprovação</option><option value="automatic"${existing?.transactionMode === "automatic" ? " selected" : ""}>Automática</option></select></label>
      <label><input type="checkbox" name="featured"${existing?.featured ? " checked" : ""}> Destaque</label>
      <label><input type="checkbox" name="enabled"${existing?.enabled === false ? "" : " checked"}> Oferta ativa</label>
      <p class="ethernum-command-dialog__revision">Revisão da Loja: ${repository.revision}</p>
    `, existing ? "Salvar oferta" : "Adicionar");
    if (!data) return true;
    const itemUuid = field(data, "itemUuid");
    await runCommand({
      kind: "store.upsert",
      expectedRevision: repository.revision,
      entry: {
        ...existing,
        id: existing?.id ?? storeEntryIdFromUuid(itemUuid),
        itemUuid,
        priceOverride: field(data, "priceOverride") || undefined,
        stock: field(data, "stock") === "" ? undefined : Number(field(data, "stock")),
        minimumRank: field(data, "minimumRank") === "" ? undefined : Number(field(data, "minimumRank")),
        allowedRegions: csv(field(data, "allowedRegions")),
        transactionMode: field(data, "transactionMode") as "automatic" | "approval",
        featured: data.get("featured") === "on",
        enabled: data.get("enabled") === "on",
      },
    });
    return true;
  }
  if (action === "store-toggle") {
    const repository = await store.getStore();
    await runCommand({
      kind: "store.toggle",
      entryId: payload.entryId,
      enabled: payload.enabled === "true",
      expectedRevision: repository.revision,
    });
    return true;
  }
  if (action === "store-remove") {
    const repository = await store.getStore();
    const data = await formDialog("Remover oferta", "<p>O Item PF2e será preservado. Somente a oferta da Loja será removida.</p>", "Remover");
    if (!data) return true;
    await runCommand({ kind: "store.remove", entryId: payload.entryId, expectedRevision: repository.revision });
    return true;
  }
  return true;
};
