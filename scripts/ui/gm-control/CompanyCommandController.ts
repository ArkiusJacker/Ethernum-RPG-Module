import { CompanyIdentityService } from "../../company/CompanyIdentityService.js";
import {
  actors,
  collection,
  csv,
  escapeHtml,
  field,
  formDialog,
  randomId,
  runCommand,
  users,
  type GMControlDomainCommandHandler,
} from "./GMCommandSupport.js";

export const handleCompanyCommand: GMControlDomainCommandHandler = async (action, payload) => {
  if (action === "squad-edit") {
    const identities = await CompanyIdentityService.list();
    const actor = actors().find(candidate => candidate.uuid === payload.actorUuid);
    if (!actor) throw new Error("Personagem não encontrado.");
    const existing = identities.identities[payload.actorUuid] ?? CompanyIdentityService.resolve(actor);
    const data = await formDialog(`Identidade: ${escapeHtml(actor.name)}`, `
      <label>Codinome<input name="codename" value="${escapeHtml(existing.codename ?? "")}"></label>
      <label>Company Rank<input type="number" min="0" name="rank" value="${existing.rank ?? ""}"></label>
      <label>Esquadrão<input name="squad" value="${escapeHtml(existing.squad ?? "")}"></label>
      <label>IDs de esquadrão<input name="squadIds" value="${escapeHtml(existing.squadIds.join(", "))}"></label>
      <label>Departamento<input name="department" value="${escapeHtml(existing.department ?? "")}"></label>
      <label>Status operacional<input name="operationalStatus" value="${escapeHtml(existing.operationalStatus ?? "")}"></label>
      <p class="ethernum-command-dialog__revision">Revisão do diretório: ${identities.revision}</p>
    `, "Atualizar identidade");
    if (!data) return true;
    await runCommand({
      kind: "identity.update",
      actorUuid: payload.actorUuid,
      expectedRevision: identities.revision,
      identity: {
        codename: field(data, "codename"),
        rank: field(data, "rank") === "" ? undefined : Number(field(data, "rank")),
        squad: field(data, "squad"),
        squadIds: csv(field(data, "squadIds")),
        department: field(data, "department"),
        operationalStatus: field(data, "operationalStatus"),
      },
    });
    return true;
  }
  if (action === "reward-grant") {
    const actorOptions = actors().filter(actor => actor.uuid)
      .map(actor => `<option value="${escapeHtml(actor.uuid)}">${escapeHtml(actor.name)}</option>`).join("");
    const itemOptions = collection<{ uuid?: string | null; name?: string | null }>(
      (game as Game & { items?: Iterable<{ uuid?: string | null; name?: string | null }> }).items,
    ).filter(item => item.uuid && item.name)
      .map(item => `<option value="${escapeHtml(item.uuid)}">${escapeHtml(item.name)}</option>`).join("");
    const data = await formDialog("Distribuir recompensa", `
      <label>Destinatário<select name="actorUuid" required><option value="">Selecione</option>${actorOptions}</select></label>
      <label>Item PF2e (opcional)<select name="itemUuid"><option value="">Nenhum</option>${itemOptions}</select></label>
      <label>Moeda (opcional)<input name="currency" placeholder="10 gp 5 sp"></label>
      <label>XP (somente metadata)<input type="number" min="0" name="xpMetadata" value="0"></label>
      <label>EP (metadata)<input type="number" min="0" name="epMetadata" value="0"></label>
      <label>Comenda<input name="commendation"></label>
      <label>Contrato de origem<input name="contractId"></label>
      <label>Nota administrativa<textarea name="note"></textarea></label>
      <p class="ethernum-command-dialog__notice"><i class="fas fa-circle-info"></i> O valor de XP será registrado, mas não altera o XP PF2e automaticamente.</p>
    `, "Distribuir");
    if (!data) return true;
    await runCommand({
      kind: "reward.grant",
      reward: {
        transactionId: randomId("reward"),
        actorUuid: field(data, "actorUuid"),
        itemUuid: field(data, "itemUuid") || undefined,
        currency: field(data, "currency") || undefined,
        xpMetadata: Number(field(data, "xpMetadata")) || 0,
        epMetadata: Number(field(data, "epMetadata")) || 0,
        commendation: field(data, "commendation") || undefined,
        contractId: field(data, "contractId") || undefined,
        note: field(data, "note") || undefined,
      },
    });
    return true;
  }
  if (action === "broadcast-send") {
    const recipients = users().filter(user => !user.isGM && user.id)
      .map(user => `<label><input type="checkbox" name="recipients" value="${escapeHtml(user.id)}"> ${escapeHtml(user.name)}</label>`)
      .join("");
    const data = await formDialog("Comunicado de emergência", `
      <label>Severidade<select name="severity"><option value="info">INFO</option><option value="warning">WARNING</option><option value="critical">CRITICAL</option></select></label>
      <label>Título<input name="title" maxlength="180" required></label>
      <label>Mensagem<textarea name="message" maxlength="2000" required></textarea></label>
      <fieldset><legend>Destinatários</legend><p>Nenhuma seleção envia para todos.</p>${recipients}</fieldset>
    `, "Transmitir");
    if (!data) return true;
    await runCommand({
      kind: "broadcast.send",
      broadcast: {
        broadcastId: randomId("broadcast"),
        severity: field(data, "severity") as "info" | "warning" | "critical",
        title: field(data, "title"),
        message: field(data, "message"),
        recipientIds: data.getAll("recipients").map(String),
      },
    });
    return true;
  }
  return false;
};
