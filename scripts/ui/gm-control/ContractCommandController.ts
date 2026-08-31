import { getContractArchiveService } from "../../contracts/ContractArchiveService.js";
import {
  contractDocumentMigrationDialog,
  escapeHtml,
  field,
  formDialog,
  informationUnlocks,
  randomId,
  runCommand,
  users,
  type GMControlDomainCommandHandler,
} from "./GMCommandSupport.js";

const ACTIONS = new Set([
  "contract-create",
  "contract-edit",
  "contract-status",
  "contract-access",
  "contract-document-migrate",
  "intelligence-adjust",
]);

export const handleContractCommand: GMControlDomainCommandHandler = async (action, payload) => {
  if (!ACTIONS.has(action)) return false;
  const contracts = getContractArchiveService();

  if (action === "contract-create" || action === "contract-edit") {
    const archive = await contracts.getArchive();
    const existing = archive.contracts.find(contract => contract.id === payload.contractId);
    const data = await formDialog(existing ? "Editar contrato" : "Publicar contrato", `
      <label>ID operacional<input name="id" value="${escapeHtml(existing?.id ?? randomId("contract"))}" required></label>
      <label>Número<input type="number" min="0" name="number" value="${existing?.number ?? archive.contracts.length + 1}" required></label>
      <label>Título<input name="title" value="${escapeHtml(existing?.title ?? "")}" required></label>
      <label>Local<input name="location" value="${escapeHtml(existing?.location ?? "")}"></label>
      <label>Região<input name="region" value="${escapeHtml(existing?.region ?? "")}"></label>
      <label>Dificuldade<input name="difficulty" value="${escapeHtml(existing?.difficulty ?? "")}"></label>
      <label>Supervisor<input name="supervisor" value="${escapeHtml(existing?.supervisor ?? "")}"></label>
      <label>Status<select name="status">${["available", "accepted", "active", "completed", "failed", "archived"].map(status => `<option value="${status}"${existing?.status === status ? " selected" : ""}>${status}</option>`).join("")}</select></label>
      <label>Journal UUID<input name="journalUuid" value="${escapeHtml(existing?.journalUuid ?? "")}"></label>
      <label>PDF público do módulo<input name="pdfPath" value="${escapeHtml(existing?.pdfPath ?? "")}"></label>
      <label>Visibilidade<select name="visibility"><option value="all"${existing?.visibility.mode === "all" ? " selected" : ""}>Todos</option><option value="restricted"${existing?.visibility.mode === "restricted" ? " selected" : ""}>Restrita</option><option value="gm"${existing?.visibility.mode === "gm" ? " selected" : ""}>Somente GM</option></select></label>
      <label>Recompensas públicas<textarea name="rewards">${escapeHtml((existing?.rewards ?? []).join("\n"))}</textarea></label>
      <label>Desbloqueios de anexos (id:nivel)<input name="informationUnlocks" value="${escapeHtml((existing?.attachments ?? []).filter(item => item.informationRequired !== undefined).map(item => `${item.id}:${item.informationRequired}`).join(", "))}"></label>
      <p class="ethernum-command-dialog__revision">Revisão do arquivo: ${archive.revision}</p>
    `, existing ? "Salvar contrato" : "Publicar");
    if (!data) return true;
    await runCommand({
      kind: "contract.publish",
      expectedRevision: archive.revision,
      data: {
        ...existing,
        id: field(data, "id"),
        number: Number(field(data, "number")),
        title: field(data, "title"),
        location: field(data, "location"),
        region: field(data, "region"),
        difficulty: field(data, "difficulty"),
        supervisor: field(data, "supervisor"),
        status: field(data, "status"),
        journalUuid: field(data, "journalUuid"),
        pdfPath: field(data, "pdfPath"),
        publicAsset: Boolean(field(data, "pdfPath")),
        rewards: field(data, "rewards").split(/\r?\n/).map(value => value.trim()).filter(Boolean),
        visibility: { ...existing?.visibility, mode: field(data, "visibility") },
        attachments: (existing?.attachments ?? []).map(attachment => {
          const required = informationUnlocks(field(data, "informationUnlocks")).get(attachment.id);
          return required === undefined ? attachment : { ...attachment, informationRequired: required };
        }),
      },
    });
    return true;
  }
  if (action === "contract-status") {
    const archive = await contracts.getArchive();
    const status = payload.status as "available" | "accepted" | "active" | "completed" | "failed" | "archived";
    const data = status === "completed"
      ? await formDialog("Concluir contrato", '<label>Graduação final<input name="grade" maxlength="40"></label>', "Concluir")
      : new FormData();
    if (!data) return true;
    await runCommand({
      kind: "contract.status",
      contractId: payload.contractId,
      status,
      grade: field(data, "grade"),
      expectedRevision: archive.revision,
    });
    return true;
  }
  if (action === "contract-access") {
    const archive = await contracts.getArchive();
    const playerOptions = users().filter(user => !user.isGM && user.id)
      .map(user => `<option value="user:${user.id}">${escapeHtml(user.name)}</option>`).join("");
    const data = await formDialog("Acesso ao contrato", `
      <label>Principal<select name="principal"><option value="">Selecione</option>${playerOptions}</select></label>
      <label>Operação<select name="grant"><option value="true">Conceder</option><option value="false">Revogar</option></select></label>
      <label>ID de anexo (opcional)<input name="attachmentId"></label>
    `);
    if (!data) return true;
    const [kind, id] = field(data, "principal").split(":");
    if (!kind || !id) throw new Error("Principal inválido.");
    await runCommand({
      kind: "contract.access",
      contractId: payload.contractId,
      principal: { kind: kind as "user", id },
      grant: field(data, "grant") === "true",
      attachmentId: field(data, "attachmentId") || undefined,
      expectedRevision: archive.revision,
    });
    return true;
  }
  if (action === "contract-document-migrate") {
    const archive = await contracts.getArchive();
    const contract = archive.contracts.find(candidate => candidate.id === payload.contractId);
    const source = contract?.reportDocument;
    if (!contract || source?.storage !== "module-asset" || !source.path) {
      throw new Error("Este contrato não possui relatório legado do módulo para migrar.");
    }
    const filename = source.path.split("/").at(-1) ?? `${contract.id}.pdf`;
    const worldId = String((game as Game & { world?: { id?: string } }).world?.id ?? "ethernum")
      .replace(/[^a-zA-Z0-9_-]/g, "-");
    const initialPath = `worlds/${worldId}/contracts/${contract.id}/${filename}`;
    const data = await contractDocumentMigrationDialog(initialPath, filename);
    if (!data) return true;
    if (data.get("confirm") !== "on") throw new Error("Confirme a migração antes de continuar.");
    await runCommand({
      kind: "contract.document-migrate",
      contractId: contract.id,
      selectedPath: field(data, "selectedPath"),
      expectedRevision: archive.revision,
    });
    return true;
  }
  if (action === "intelligence-adjust") {
    const archive = await contracts.getArchive();
    const contract = archive.contracts.find(candidate => candidate.id === payload.contractId);
    if (!contract) throw new Error("Contrato não encontrado.");
    const total = Math.max(0, Number(payload.total) || contract.informationTotal || 5);
    const found = Math.max(0, Math.min(total, (contract.informationFound ?? 0) + Number(payload.amount || 0)));
    await runCommand({
      kind: "contract.intelligence",
      contractId: contract.id,
      found,
      total,
      expectedRevision: archive.revision,
    });
    return true;
  }
  return true;
};
