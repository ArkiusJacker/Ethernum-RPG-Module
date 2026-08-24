import { ETHERNUM } from "../config.js";
import { getEthernumAuthorityBridge, setAuthorityPolicy } from "../core/EthernumAuthority.js";
import { UNIQUE_MECHANIC_PROFILES } from "../mechanics/registry.js";
import { reconcileUniqueExecutions } from "../unique/core/UniqueExecutionManager.js";
import { UniqueMechanicsSystem } from "../unique/UniqueMechanics.js";
import { CombatMomentumSystem } from "../table/CombatMomentumSystem.js";
import { getAdministrativeCommunicatorService } from "../administration/AdministrativeCommunicatorService.js";
import type { AdministrativeCommand } from "../administration/AdministrativeCommunicatorTypes.js";
import { getContractArchiveService } from "../contracts/ContractArchiveService.js";
import { getCompanyStoreService } from "../store/CompanyStoreService.js";
import { storeEntryIdFromUuid } from "../store/CompanyStoreModel.js";
import { parseCompanyStorePrice } from "../store/CompanyStoreModel.js";
import { getOperationalGeneratorService } from "../generators/OperationalGeneratorService.js";
import { CompanyIdentityService } from "../company/CompanyIdentityService.js";
import { FieldCommunicatorOverlay } from "./FieldCommunicatorOverlay.js";
import { GMControlCenter, type GMControlCenterMountResult } from "./GMControlCenter.js";
import {
  GM_CONTROL_POLICY_CATEGORIES,
  type GMControlAuditEntry,
  type GMControlCenterCallbacks,
  type GMControlCenterSnapshot,
  type GMControlQueueItem,
} from "./GMControlCenterData.js";

const mountedControllers = new WeakMap<HTMLElement, {
  controller: GMControlCenter;
  unsubscribe: () => void;
}>();

function actors(): Actor[] {
  return (Array.from(game.actors ?? []) as Actor[])
    .filter(actor => (actor.type as string) === "character");
}

function allActors(): Actor[] {
  return Array.from(game.actors ?? []) as Actor[];
}

function users(): User[] {
  return Array.from(game.users ?? []) as User[];
}

function collection<T>(value: unknown): T[] {
  if (!value || typeof (value as Iterable<T>)[Symbol.iterator] !== "function") return [];
  return Array.from(value as Iterable<T>);
}

function actorByUuid(uuid: string | undefined): Actor | undefined {
  return uuid ? allActors().find(actor => actor.uuid === uuid) : undefined;
}

function userName(id: string | undefined): string {
  return users().find(user => user.id === id)?.name ?? id ?? "";
}

function profileName(id: string | undefined): string {
  return (id ? UNIQUE_MECHANIC_PROFILES.get(id)?.label : undefined) ?? id ?? "";
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showJson(title: string, value: unknown): void {
  new Dialog({
    title,
    content: `<pre class="ethernum-gm-json">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`,
    buttons: { close: { label: game.i18n!.localize("ETHERNUM.Buttons.Close") } },
  }).render(true);
}

function formDialog(title: string, body: string, confirmLabel = "Confirmar"): Promise<FormData | null> {
  return new Promise(resolve => {
    new Dialog({
      title,
      content: `<form class="ethernum-command-dialog">${body}</form>`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: confirmLabel,
          callback: html => resolve(new FormData(html.find("form")[0] as HTMLFormElement)),
        },
        cancel: { icon: '<i class="fas fa-xmark"></i>', label: "Cancelar", callback: () => resolve(null) },
      },
      close: () => resolve(null),
      default: "confirm",
    }).render(true);
  });
}

function field(data: FormData, name: string): string { return String(data.get(name) ?? "").trim(); }
function csv(value: string): string[] { return value.split(",").map(item => item.trim()).filter(Boolean); }
function informationUnlocks(value: string): Map<string, number> {
  return new Map(csv(value).flatMap(entry => {
    const [id, raw] = entry.split(":").map(part => part.trim());
    const level = Math.max(0, Math.min(5, Math.floor(Number(raw))));
    return id && Number.isFinite(level) ? [[id, level] as const] : [];
  }));
}
function randomId(prefix: string): string { return `${prefix}-${foundry.utils.randomID(24)}`; }

function actorLevel(actor: Actor): number {
  const source = actor as Actor & { level?: number; system?: Record<string, unknown> };
  const system = source.system ?? {};
  const details = system.details && typeof system.details === "object" ? system.details as Record<string, unknown> : {};
  const levelData = details.level && typeof details.level === "object" ? details.level as Record<string, unknown> : {};
  const parsed = Number(source.level ?? levelData.value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

async function runCommand(command: AdministrativeCommand): Promise<void> {
  const result = await getAdministrativeCommunicatorService().command(command);
  ui.notifications?.info(result.message);
}

async function handleDomainAction(action: string, payload: Readonly<Record<string, string>>): Promise<void> {
  const contracts = getContractArchiveService();
  const store = getCompanyStoreService();
  const generators = getOperationalGeneratorService();
  if (action === "loot-generate") {
    const characters = actors();
    const partyLevel = characters.length ? Math.round(characters.reduce((sum, actor) => sum + actorLevel(actor), 0) / characters.length) : 1;
    const sourceOptions = generators.snapshot().lootSources.map(source => {
      const selected = source.id === "world" || source.id === "pf2e.equipment-srd";
      return `<option value="${escapeHtml(source.id)}"${selected ? " selected" : ""}>${escapeHtml(source.label)}</option>`;
    }).join("");
    const data = await formDialog("Gerador determinístico de loot", `
      <label>Nível do grupo<input type="number" min="0" max="30" name="partyLevel" value="${partyLevel}"></label>
      <label>Tamanho do grupo<input type="number" min="1" max="12" name="partySize" value="${Math.max(1, characters.length || 4)}"></label>
      <label>Nível do encontro<input type="number" min="0" max="30" name="encounterLevel" value="${partyLevel}"></label>
      <label>Nível mínimo do item<input type="number" min="0" max="30" name="minimumItemLevel" value="${Math.max(0, partyLevel - 2)}"></label>
      <label>Nível máximo do item<input type="number" min="0" max="30" name="maximumItemLevel" value="${Math.min(30, partyLevel + 1)}"></label>
      <label>Orçamento<input name="budget" value="100 gp" placeholder="100 gp"></label>
      <label>Semente<input name="seed" value="${Date.now().toString(36)}" maxlength="160"></label>
      <label>Tipos PF2e<input name="types" placeholder="weapon, armor, consumable"></label>
      <label>Traits obrigatórios<input name="traits" placeholder="magical, invested"></label>
      <fieldset><legend>Raridade</legend><label><input type="checkbox" name="rarities" value="common" checked> Comum</label><label><input type="checkbox" name="rarities" value="uncommon" checked> Incomum</label><label><input type="checkbox" name="rarities" value="rare"> Raro</label><label><input type="checkbox" name="rarities" value="unique"> Único</label></fieldset>
      <fieldset><legend>Categoria</legend><label><input type="checkbox" name="categories" value="treasure" checked> Tesouro</label><label><input type="checkbox" name="categories" value="consumable" checked> Consumível</label><label><input type="checkbox" name="categories" value="permanent" checked> Permanente</label></fieldset>
      <label>Fontes permitidas<select name="allowedSources" multiple size="8">${sourceOptions}</select></label>
      <p class="ethernum-command-dialog__notice"><i class="fas fa-circle-info"></i> A geração apenas cria uma prévia. Nenhum Actor será alterado.</p>
    `, "Gerar prévia");
    if (!data) return;
    const budget = parseCompanyStorePrice(field(data, "budget"));
    if (!budget) throw new Error("Orçamento inválido. Use, por exemplo, 100 gp ou 2 pp 5 gp.");
    await generators.generateLoot({
      partyLevel: Number(field(data, "partyLevel")), partySize: Number(field(data, "partySize")), encounterLevel: Number(field(data, "encounterLevel")),
      minimumItemLevel: Number(field(data, "minimumItemLevel")), maximumItemLevel: Number(field(data, "maximumItemLevel")),
      rarities: data.getAll("rarities").map(String) as Array<"common" | "uncommon" | "rare" | "unique">,
      categories: data.getAll("categories").map(String) as Array<"treasure" | "consumable" | "permanent">,
      types: csv(field(data, "types")), traits: csv(field(data, "traits")),
      allowedSources: data.getAll("allowedSources").map(String), budgetCopper: budget.copperValue, seed: field(data, "seed"),
    });
    return;
  }
  if (action === "loot-regenerate") {
    await generators.regenerateLoot(randomId("seed"));
    return;
  }
  if (action === "loot-chat") {
    const manifest = generators.snapshot().lootPreview;
    if (!manifest) throw new Error("Gere um manifesto de loot primeiro.");
    await runCommand({ kind: "loot.chat", manifest });
    return;
  }
  if (action === "loot-apply") {
    const snapshot = generators.snapshot();
    const manifest = snapshot.lootPreview;
    if (!manifest) throw new Error("Gere um manifesto de loot primeiro.");
    const options = snapshot.lootActors.map(actor => `<option value="${escapeHtml(actor.value)}">${escapeHtml(actor.label)}</option>`).join("");
    if (!options) throw new Error("Crie um Actor PF2e do tipo Loot antes de entregar o manifesto.");
    const data = await formDialog("Enviar para Actor de loot", `<label>Actor de destino<select name="actorUuid" required>${options}</select></label><p class="ethernum-command-dialog__notice"><i class="fas fa-triangle-exclamation"></i> Esta ação cria Items PF2e reais e adiciona a moeda restante. A transação é auditada e possui rollback.</p>`, "Confirmar entrega");
    if (!data) return;
    const actorUuid = field(data, "actorUuid");
    await runCommand({ kind: "loot.apply", application: { applicationId: `${manifest.manifestId}:${actorUuid}`, actorUuid, manifest } });
    return;
  }
  if (action === "encounter-analyze") {
    generators.analyzeCurrentEncounter();
    return;
  }
  if (action === "mechanic-generate") {
    const snapshot = generators.snapshot();
    const options = snapshot.npcActors.map(actor => `<option value="${escapeHtml(actor.value)}">${escapeHtml(actor.label)} · nível ${actor.level}${actor.currentName ? ` · ${escapeHtml(actor.currentName)}` : ""}</option>`).join("");
    if (!options) throw new Error("Nenhum NPC PF2e está disponível para análise.");
    const data = await formDialog("Gerador determinístico de mecânica NPC", `
      <label>NPC<select name="actorUuid" required>${options}</select></label>
      <label>Complexidade<select name="complexity"><option value="auto">Automática</option><option value="standard">Padrão</option><option value="elite">Elite</option><option value="boss">Chefe</option></select></label>
      <label>Semente<input name="seed" maxlength="160" value="${escapeHtml(randomId("npc-seed"))}" required></label>
      <p class="ethernum-command-dialog__notice"><i class="fas fa-flask"></i> Todos os templates desta versão são experimentais e permanecem marcados como [TESTE]. A geração não altera o Actor.</p>
    `, "Gerar prévia");
    if (!data) return;
    await generators.generateNPCMechanic(
      field(data, "actorUuid"),
      field(data, "seed"),
      field(data, "complexity") as "auto" | "standard" | "elite" | "boss",
    );
    return;
  }
  if (action === "mechanic-regenerate") {
    await generators.regenerateNPCMechanic(randomId("npc-seed"));
    return;
  }
  if (action === "mechanic-edit") {
    const definition = generators.snapshot().mechanicPreview;
    if (!definition) throw new Error("Gere uma mecânica NPC antes de editar.");
    const components = [definition.passive, definition.active, definition.reaction, definition.phase].filter(Boolean);
    const componentFields = components.map(component => `
      <fieldset><legend>${escapeHtml(component!.kind)} · ${escapeHtml(component!.templateId)}</legend>
        <label>Nome<input name="${component!.kind}Name" maxlength="160" value="${escapeHtml(component!.name)}" required></label>
        <label>Resumo<textarea name="${component!.kind}Summary" maxlength="500" required>${escapeHtml(component!.summary)}</textarea></label>
        ${component!.trigger !== undefined ? `<label>Gatilho<textarea name="${component!.kind}Trigger" maxlength="700">${escapeHtml(component!.trigger)}</textarea></label>` : ""}
        ${component!.requirements !== undefined ? `<label>Requisitos<textarea name="${component!.kind}Requirements" maxlength="700">${escapeHtml(component!.requirements)}</textarea></label>` : ""}
        <label>Efeito<textarea name="${component!.kind}Effect" maxlength="2500" required>${escapeHtml(component!.effect)}</textarea></label>
      </fieldset>`).join("");
    const data = await formDialog("Editar prévia da mecânica NPC", `
      <label>Nome da mecânica<input name="definitionName" maxlength="180" value="${escapeHtml(definition.name)}" required></label>
      ${componentFields}
      <p class="ethernum-command-dialog__notice"><i class="fas fa-shield-halved"></i> A edição altera somente textos. Custos, operações e limites declarativos permanecem protegidos.</p>
    `, "Atualizar prévia");
    if (!data) return;
    const componentEdits = Object.fromEntries(components.map(component => [component!.kind, {
      name: field(data, `${component!.kind}Name`),
      summary: field(data, `${component!.kind}Summary`),
      ...(component!.trigger !== undefined ? { trigger: field(data, `${component!.kind}Trigger`) || undefined } : {}),
      ...(component!.requirements !== undefined ? { requirements: field(data, `${component!.kind}Requirements`) || undefined } : {}),
      effect: field(data, `${component!.kind}Effect`),
    }]));
    generators.editNPCMechanic({ definitionName: field(data, "definitionName"), components: componentEdits });
    return;
  }
  if (action === "mechanic-apply") {
    const snapshot = generators.snapshot();
    const definition = snapshot.mechanicPreview;
    if (!definition) throw new Error("Gere uma mecânica NPC antes de aplicar.");
    const actor = snapshot.npcActors.find(candidate => candidate.value === definition.metadata.actorUuid);
    if (!actor) throw new Error("O NPC da prévia não está mais disponível.");
    const data = await formDialog("Aplicar mecânica gerada", `
      <p>Serão criados Items PF2e nativos em <strong>${escapeHtml(actor.label)}</strong>. Items manuais e o perfil autoral de Mecânica Única não serão alterados.</p>
      ${actor.currentName ? `<p class="ethernum-command-dialog__notice"><i class="fas fa-clock-rotate-left"></i> A aplicação atual <strong>${escapeHtml(actor.currentName)}</strong> será preservada como snapshot reversível.</p>` : ""}
      ${actor.manualProtected ? '<label><input type="checkbox" name="replaceManual"> Confirmo a substituição do conteúdo manual protegido neste flag.</label>' : ""}
    `, "Aplicar");
    if (!data) return;
    if (actor.manualProtected && data.get("replaceManual") !== "on") throw new Error("Confirme explicitamente a substituição da mecânica manual protegida.");
    const applicationId = `${definition.id}:${definition.metadata.generatedAt}`;
    await runCommand({ kind: "npc-mechanic.apply", application: {
      applicationId,
      actorUuid: definition.metadata.actorUuid,
      definition,
      replaceManual: data.get("replaceManual") === "on",
    } });
    return;
  }
  if (action === "mechanic-revert") {
    const actorUuid = payload.actorUuid;
    const applicationId = payload.applicationId;
    if (!actorUuid || !applicationId) throw new Error("Não existe aplicação gerada reversível para este NPC.");
    const data = await formDialog("Reverter mecânica gerada", "<p>Os Items desta aplicação serão removidos e o snapshot anterior será restaurado.</p>", "Reverter");
    if (!data) return;
    await runCommand({ kind: "npc-mechanic.revert", revert: {
      revertId: `${applicationId}:revert`, actorUuid, applicationId,
    } });
    return;
  }
  if (action === "preview-player") {
    if (!payload.userId) throw new Error("Selecione um jogador para a pré-visualização.");
    await FieldCommunicatorOverlay.openPreview(payload.userId);
    return;
  }
  if (action === "open-document") {
    const document = payload.uuid ? await fromUuid(payload.uuid as Parameters<typeof fromUuid>[0]) as { sheet?: { render?: (force?: boolean) => unknown } } | null : null;
    if (!document?.sheet?.render) throw new Error("Documento indisponível.");
    document.sheet.render(true);
    return;
  }
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
    if (!data) return;
    await runCommand({
      kind: "contract.publish",
      expectedRevision: archive.revision,
      data: {
        ...existing,
        id: field(data, "id"), number: Number(field(data, "number")), title: field(data, "title"),
        location: field(data, "location"), region: field(data, "region"), difficulty: field(data, "difficulty"),
        supervisor: field(data, "supervisor"), status: field(data, "status"), journalUuid: field(data, "journalUuid"),
        pdfPath: field(data, "pdfPath"), publicAsset: Boolean(field(data, "pdfPath")),
        rewards: field(data, "rewards").split(/\r?\n/).map(value => value.trim()).filter(Boolean),
        visibility: { ...existing?.visibility, mode: field(data, "visibility") },
        attachments: (existing?.attachments ?? []).map(attachment => {
          const required = informationUnlocks(field(data, "informationUnlocks")).get(attachment.id);
          return required === undefined ? attachment : { ...attachment, informationRequired: required };
        }),
      },
    });
    return;
  }
  if (action === "contract-status") {
    const archive = await contracts.getArchive();
    const status = payload.status as "available" | "accepted" | "active" | "completed" | "failed" | "archived";
    const data = status === "completed" ? await formDialog("Concluir contrato", '<label>Graduação final<input name="grade" maxlength="40"></label>', "Concluir") : new FormData();
    if (!data) return;
    await runCommand({ kind: "contract.status", contractId: payload.contractId, status, grade: field(data, "grade"), expectedRevision: archive.revision });
    return;
  }
  if (action === "contract-access") {
    const archive = await contracts.getArchive();
    const playerOptions = users().filter(user => !user.isGM && user.id).map(user => `<option value="user:${user.id}">${escapeHtml(user.name)}</option>`).join("");
    const data = await formDialog("Acesso ao contrato", `
      <label>Principal<select name="principal"><option value="">Selecione</option>${playerOptions}</select></label>
      <label>Operação<select name="grant"><option value="true">Conceder</option><option value="false">Revogar</option></select></label>
      <label>ID de anexo (opcional)<input name="attachmentId"></label>
    `);
    if (!data) return;
    const [kind, id] = field(data, "principal").split(":");
    if (!kind || !id) throw new Error("Principal inválido.");
    await runCommand({ kind: "contract.access", contractId: payload.contractId, principal: { kind: kind as "user", id }, grant: field(data, "grant") === "true", attachmentId: field(data, "attachmentId") || undefined, expectedRevision: archive.revision });
    return;
  }
  if (action === "intelligence-adjust") {
    const archive = await contracts.getArchive();
    const contract = archive.contracts.find(candidate => candidate.id === payload.contractId);
    if (!contract) throw new Error("Contrato não encontrado.");
    const total = Math.max(0, Number(payload.total) || contract.informationTotal || 5);
    const found = Math.max(0, Math.min(total, (contract.informationFound ?? 0) + Number(payload.amount || 0)));
    await runCommand({ kind: "contract.intelligence", contractId: contract.id, found, total, expectedRevision: archive.revision });
    return;
  }
  if (action === "store-add" || action === "store-edit") {
    const repository = await store.getStore();
    const existing = repository.entries.find(entry => entry.id === payload.entryId);
    const worldItems = collection<{ uuid?: string | null; name?: string | null }>((game as Game & { items?: Iterable<{ uuid?: string | null; name?: string | null }> }).items);
    const options = worldItems.filter(item => item.uuid && item.name).map(item => `<option value="${escapeHtml(item.uuid)}"${existing?.itemUuid === item.uuid ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
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
    if (!data) return;
    const itemUuid = field(data, "itemUuid");
    await runCommand({ kind: "store.upsert", expectedRevision: repository.revision, entry: {
      ...existing,
      id: existing?.id ?? storeEntryIdFromUuid(itemUuid), itemUuid,
      priceOverride: field(data, "priceOverride") || undefined,
      stock: field(data, "stock") === "" ? undefined : Number(field(data, "stock")),
      minimumRank: field(data, "minimumRank") === "" ? undefined : Number(field(data, "minimumRank")),
      allowedRegions: csv(field(data, "allowedRegions")), transactionMode: field(data, "transactionMode") as "automatic" | "approval",
      featured: data.get("featured") === "on", enabled: data.get("enabled") === "on",
    } });
    return;
  }
  if (action === "store-toggle") {
    const repository = await store.getStore();
    await runCommand({ kind: "store.toggle", entryId: payload.entryId, enabled: payload.enabled !== "true", expectedRevision: repository.revision });
    return;
  }
  if (action === "store-remove") {
    const repository = await store.getStore();
    const data = await formDialog("Remover oferta", '<p>O Item PF2e será preservado. Somente a oferta da Loja será removida.</p>', "Remover");
    if (!data) return;
    await runCommand({ kind: "store.remove", entryId: payload.entryId, expectedRevision: repository.revision });
    return;
  }
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
    if (!data) return;
    await runCommand({ kind: "identity.update", actorUuid: payload.actorUuid, expectedRevision: identities.revision, identity: {
      codename: field(data, "codename"), rank: field(data, "rank") === "" ? undefined : Number(field(data, "rank")), squad: field(data, "squad"), squadIds: csv(field(data, "squadIds")), department: field(data, "department"), operationalStatus: field(data, "operationalStatus"),
    } });
    return;
  }
  if (action === "reward-grant") {
    const actorOptions = actors().filter(actor => actor.uuid).map(actor => `<option value="${escapeHtml(actor.uuid)}">${escapeHtml(actor.name)}</option>`).join("");
    const itemOptions = collection<{ uuid?: string | null; name?: string | null }>((game as Game & { items?: Iterable<{ uuid?: string | null; name?: string | null }> }).items).filter(item => item.uuid && item.name).map(item => `<option value="${escapeHtml(item.uuid)}">${escapeHtml(item.name)}</option>`).join("");
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
    if (!data) return;
    await runCommand({ kind: "reward.grant", reward: {
      transactionId: randomId("reward"), actorUuid: field(data, "actorUuid"), itemUuid: field(data, "itemUuid") || undefined,
      currency: field(data, "currency") || undefined, xpMetadata: Number(field(data, "xpMetadata")) || 0,
      epMetadata: Number(field(data, "epMetadata")) || 0, commendation: field(data, "commendation") || undefined,
      contractId: field(data, "contractId") || undefined, note: field(data, "note") || undefined,
    } });
    return;
  }
  if (action === "broadcast-send") {
    const recipients = users().filter(user => !user.isGM && user.id).map(user => `<label><input type="checkbox" name="recipients" value="${escapeHtml(user.id)}"> ${escapeHtml(user.name)}</label>`).join("");
    const data = await formDialog("Comunicado de emergência", `
      <label>Severidade<select name="severity"><option value="info">INFO</option><option value="warning">WARNING</option><option value="critical">CRITICAL</option></select></label>
      <label>Título<input name="title" maxlength="180" required></label>
      <label>Mensagem<textarea name="message" maxlength="2000" required></textarea></label>
      <fieldset><legend>Destinatários</legend><p>Nenhuma seleção envia para todos.</p>${recipients}</fieldset>
    `, "Transmitir");
    if (!data) return;
    await runCommand({ kind: "broadcast.send", broadcast: {
      broadcastId: randomId("broadcast"), severity: field(data, "severity") as "info" | "warning" | "critical",
      title: field(data, "title"), message: field(data, "message"), recipientIds: data.getAll("recipients").map(String),
    } });
  }
}

export async function buildAuthorityControlSnapshot(): Promise<GMControlCenterSnapshot> {
  const bridge = getEthernumAuthorityBridge();
  const [queue, audit, policies, diagnostics] = await Promise.all([
    bridge.getQueue(),
    bridge.getAuditLog(),
    bridge.getPolicyConfiguration(),
    bridge.getDiagnostics(),
  ]);
  const queueRows: GMControlQueueItem[] = queue.map(entry => {
    const source = actorByUuid(entry.request.sourceActorUuid);
    return {
      id: entry.id,
      requestId: entry.request.requestId,
      status: "queued",
      createdAt: entry.queuedAt,
      expiresAt: entry.expiresAt,
      userId: entry.request.requesterId,
      userName: userName(entry.request.requesterId),
      actorId: source?.id ?? undefined,
      actorName: source?.name ?? entry.request.sourceActorUuid,
      profileId: entry.request.profileId,
      profileName: profileName(entry.request.profileId),
      actionType: entry.request.category,
      actionName: entry.request.actionId ?? entry.request.handlerId,
      summary: entry.request.summary ?? entry.request.details,
      payload: entry.request.payload,
      trustEligible: entry.request.handlerId !== "company-store.purchase.approval",
      approvable: true,
    };
  });
  const auditRows: GMControlAuditEntry[] = audit.map(entry => {
    const source = actorByUuid(entry.sourceActorUuid);
    return {
      id: entry.id,
      requestId: entry.requestId,
      status: entry.status,
      timestamp: entry.timestamp,
      userId: entry.requesterId,
      userName: userName(entry.requesterId),
      actorId: source?.id ?? undefined,
      actorName: source?.name ?? entry.sourceActorUuid,
      profileId: entry.profileId,
      profileName: profileName(entry.profileId),
      actionType: entry.category,
      actionName: entry.actionId ?? entry.handlerId,
      message: entry.error ?? entry.summary,
      durationMs: entry.latencyMs,
      payload: entry,
    };
  });
  const profileRows = [...UNIQUE_MECHANIC_PROFILES.values()].map(profile => ({
    id: `profile:${profile.id}`,
    category: "effect" as const,
    mode: policies.profiles?.[profile.id] ?? policies.default,
    profileId: profile.id,
    profileName: profile.label,
    inherited: policies.profiles?.[profile.id] === undefined,
  }));
  const auditStatusCount = (status: GMControlAuditEntry["status"]): number =>
    auditRows.filter(entry => entry.status === status).length;

  const snapshot: GMControlCenterSnapshot = {
    summary: {
      pending: queueRows.length,
      approved: auditStatusCount("approved"),
      rejected: auditStatusCount("rejected"),
      failures: auditStatusCount("failed"),
      onlineGMs: users().filter(user => user.active && user.isGM).length,
      averageLatencyMs: diagnostics.averageLatencyMs,
    },
    queue: queueRows,
    audit: auditRows,
    policies: [
      ...GM_CONTROL_POLICY_CATEGORIES.map(category => ({
        id: `category:${category}`,
        category,
        mode: policies.categories?.[category] ?? policies.default,
        inherited: policies.categories?.[category] === undefined,
      })),
      ...profileRows,
    ],
    diagnostics: [
      { id: "primary", labelKey: "ETHERNUM.GMControl.Diagnostics.PrimaryGM", value: userName(diagnostics.primaryGMId ?? undefined), tone: diagnostics.primaryGMId ? "success" : "danger" },
      { id: "current", labelKey: "ETHERNUM.GMControl.Diagnostics.CurrentGM", value: userName(diagnostics.currentUserId ?? undefined) },
      { id: "users", labelKey: "ETHERNUM.GMControl.Diagnostics.OnlineUsers", value: users().filter(user => user.active).length },
      { id: "pending", labelKey: "ETHERNUM.GMControl.Diagnostics.Pending", value: diagnostics.queuedRequests, tone: diagnostics.queuedRequests ? "warning" : "neutral" },
      { id: "processed", labelKey: "ETHERNUM.GMControl.Diagnostics.Processed", value: diagnostics.executedRequests },
      { id: "failures", labelKey: "ETHERNUM.GMControl.Diagnostics.Failures", value: diagnostics.failedRequests, tone: diagnostics.failedRequests ? "danger" : "neutral" },
      { id: "last", labelKey: "ETHERNUM.GMControl.Diagnostics.LastRequest", value: diagnostics.lastRequestAt ? new Date(diagnostics.lastRequestAt).toLocaleTimeString() : "-" },
      { id: "latency", labelKey: "ETHERNUM.GMControl.Diagnostics.Latency", value: `${diagnostics.averageLatencyMs} ms` },
    ],
    actors: actors().map(actor => ({ id: actor.id!, name: actor.name })),
    userOptions: users().map(user => ({ value: user.id!, label: user.name })),
    profileOptions: [...UNIQUE_MECHANIC_PROFILES.values()].map(profile => ({ value: profile.id, label: profile.label })),
    actionTypeOptions: [...new Set(auditRows.map(entry => entry.actionType).filter(Boolean))]
      .map(value => ({ value: value!, label: value! })),
    actorOptions: actors().map(actor => ({ value: actor.id!, label: actor.name })),
    updatedAt: Date.now(),
  };
  return getAdministrativeCommunicatorService().buildSnapshot(snapshot);
}

export function createAuthorityControlCallbacks(): GMControlCenterCallbacks {
  const bridge = getEthernumAuthorityBridge();
  return {
    onQueueAction: async (action, item) => {
      if (action === "approve") await bridge.approve(item.id);
      else if (action === "reject") await bridge.reject(item.id);
      else if (action === "approve-trust") {
        if (!item.trustEligible) throw new Error("Esta requisição não permite alterar a política de confiança.");
        const queued = (await bridge.getQueue()).find(entry => entry.id === item.id);
        if (queued) await setAuthorityPolicy(queued.request.category, "auto", queued.request.profileId);
        await bridge.approve(item.id);
      } else if (action === "payload") showJson(item.actionName ?? item.requestId, item.payload);
      else if (action === "details") showJson(item.actionName ?? item.requestId, item);
    },
    onAuditAction: async (action, context) => {
      if (action === "clear") await bridge.clearAuditLog();
      else if (action === "export") downloadJson("ethernum-audit-log.json", await bridge.exportState());
      else if (context.entry) showJson(context.entry.actionName ?? context.entry.id, context.entry);
    },
    onPolicyChange: change => setAuthorityPolicy(change.category, change.mode, change.profileId),
    onDiagnosticsAction: async action => {
      if (action === "clear-expired") await bridge.expirePending();
      if (action === "reconcile") await bridge.reconcile();
    },
    onAdminAction: async (action, payload) => {
      if (action === "grant-fulgor") {
        const actor = game.actors?.get(payload.actorId ?? "") as Actor | undefined;
        if (actor) await CombatMomentumSystem.grantFulgor(actor);
      } else if (action === "cleanup-expired") await bridge.expirePending();
      else if (action === "clear-audit") await bridge.clearAuditLog();
      else if (action === "export-data") downloadJson("ethernum-authority-export.json", await bridge.exportState());
      else if (action === "reconcile-orphans") {
        await bridge.reconcile();
        await Promise.all(actors().map(async actor => {
          if (UniqueMechanicsSystem.getState(actor).activeProfile !== "pipping-night") return;
          const state = UniqueMechanicsSystem.getPippingState(actor);
          await UniqueMechanicsSystem.updatePippingState(actor, {
            executions: reconcileUniqueExecutions(state.executions, 10 * 60_000),
          });
        }));
      } else if (action === "cancel-stuck") {
        await Promise.all(actors().map(async actor => {
          if (UniqueMechanicsSystem.getState(actor).activeProfile !== "pipping-night") return;
          const state = UniqueMechanicsSystem.getPippingState(actor);
          await UniqueMechanicsSystem.updatePippingState(actor, {
            executions: reconcileUniqueExecutions(state.executions, 0, Date.now() + 1),
            pendingAction: undefined,
          });
        }));
      }
    },
    onDomainAction: handleDomainAction,
  };
}

export async function mountAuthorityControlCenter(
  host: HTMLElement,
  options: { reactive?: boolean; callbacks?: Partial<GMControlCenterCallbacks> } = {},
): Promise<GMControlCenterMountResult> {
  const previous = mountedControllers.get(host);
  previous?.unsubscribe();
  previous?.controller.destroy();
  const result = await GMControlCenter.mount(host, {
    dataSource: buildAuthorityControlSnapshot,
    callbacks: { ...createAuthorityControlCallbacks(), ...options.callbacks },
    isGM: () => Boolean(game.user?.isGM),
  });
  if (result.controller) {
    const unsubscribe = options.reactive === false
      ? () => undefined
      : getEthernumAuthorityBridge().subscribe(() => {
          void result.controller?.refresh();
        });
    mountedControllers.set(host, { controller: result.controller, unsubscribe });
  }
  return result;
}

export function unmountAuthorityControlCenter(host: HTMLElement): void {
  const mounted = mountedControllers.get(host);
  mounted?.unsubscribe();
  mounted?.controller.destroy();
  mountedControllers.delete(host);
}
