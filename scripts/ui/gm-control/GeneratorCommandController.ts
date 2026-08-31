import { getOperationalGeneratorService } from "../../generators/OperationalGeneratorService.js";
import { parseCompanyStorePrice } from "../../store/CompanyStoreModel.js";
import {
  actorLevel,
  actors,
  csv,
  escapeHtml,
  field,
  formDialog,
  randomId,
  runCommand,
  type GMControlDomainCommandHandler,
} from "./GMCommandSupport.js";

const ACTIONS = new Set([
  "loot-generate",
  "loot-regenerate",
  "loot-chat",
  "loot-apply",
  "encounter-analyze",
  "mechanic-generate",
  "mechanic-regenerate",
  "mechanic-edit",
  "mechanic-ai-request",
  "mechanic-ai-accept",
  "mechanic-ai-reject",
  "mechanic-apply",
  "mechanic-revert",
]);

export const handleGeneratorCommand: GMControlDomainCommandHandler = async (action, payload) => {
  if (!ACTIONS.has(action)) return false;
  const generators = getOperationalGeneratorService();

  if (action === "loot-generate") {
    const characters = actors();
    const partyLevel = characters.length
      ? Math.round(characters.reduce((sum, actor) => sum + actorLevel(actor), 0) / characters.length)
      : 1;
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
    if (!data) return true;
    const budget = parseCompanyStorePrice(field(data, "budget"));
    if (!budget) throw new Error("Orçamento inválido. Use, por exemplo, 100 gp ou 2 pp 5 gp.");
    await generators.generateLoot({
      partyLevel: Number(field(data, "partyLevel")),
      partySize: Number(field(data, "partySize")),
      encounterLevel: Number(field(data, "encounterLevel")),
      minimumItemLevel: Number(field(data, "minimumItemLevel")),
      maximumItemLevel: Number(field(data, "maximumItemLevel")),
      rarities: data.getAll("rarities").map(String) as Array<"common" | "uncommon" | "rare" | "unique">,
      categories: data.getAll("categories").map(String) as Array<"treasure" | "consumable" | "permanent">,
      types: csv(field(data, "types")),
      traits: csv(field(data, "traits")),
      allowedSources: data.getAll("allowedSources").map(String),
      budgetCopper: budget.copperValue,
      seed: field(data, "seed"),
    });
    return true;
  }

  if (action === "loot-regenerate") {
    await generators.regenerateLoot(randomId("seed"));
    return true;
  }
  if (action === "loot-chat") {
    const manifest = generators.snapshot().lootPreview;
    if (!manifest) throw new Error("Gere um manifesto de loot primeiro.");
    await runCommand({ kind: "loot.chat", manifest });
    return true;
  }
  if (action === "loot-apply") {
    const snapshot = generators.snapshot();
    const manifest = snapshot.lootPreview;
    if (!manifest) throw new Error("Gere um manifesto de loot primeiro.");
    const options = snapshot.lootActors
      .map(actor => `<option value="${escapeHtml(actor.value)}">${escapeHtml(actor.label)}</option>`)
      .join("");
    if (!options) throw new Error("Crie um Actor PF2e do tipo Loot antes de entregar o manifesto.");
    const data = await formDialog(
      "Enviar para Actor de loot",
      `<label>Actor de destino<select name="actorUuid" required>${options}</select></label><p class="ethernum-command-dialog__notice"><i class="fas fa-triangle-exclamation"></i> Esta ação cria Items PF2e reais e adiciona a moeda restante. A transação é auditada e possui rollback.</p>`,
      "Confirmar entrega",
    );
    if (!data) return true;
    const actorUuid = field(data, "actorUuid");
    await runCommand({
      kind: "loot.apply",
      application: { applicationId: `${manifest.manifestId}:${actorUuid}`, actorUuid, manifest },
    });
    return true;
  }
  if (action === "encounter-analyze") {
    generators.analyzeCurrentEncounter();
    return true;
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
    if (!data) return true;
    await generators.generateNPCMechanic(
      field(data, "actorUuid"),
      field(data, "seed"),
      field(data, "complexity") as "auto" | "standard" | "elite" | "boss",
    );
    return true;
  }
  if (action === "mechanic-regenerate") {
    await generators.regenerateNPCMechanic(randomId("npc-seed"));
    return true;
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
    if (!data) return true;
    const componentEdits = Object.fromEntries(components.map(component => [component!.kind, {
      name: field(data, `${component!.kind}Name`),
      summary: field(data, `${component!.kind}Summary`),
      ...(component!.trigger !== undefined ? { trigger: field(data, `${component!.kind}Trigger`) || undefined } : {}),
      ...(component!.requirements !== undefined ? { requirements: field(data, `${component!.kind}Requirements`) || undefined } : {}),
      effect: field(data, `${component!.kind}Effect`),
    }]));
    generators.editNPCMechanic({ definitionName: field(data, "definitionName"), components: componentEdits });
    return true;
  }
  if (action === "mechanic-ai-request") {
    const snapshot = generators.snapshot();
    const status = snapshot.aiStatus;
    if (!status.available) throw new Error(status.reason);
    if (!snapshot.mechanicPreview || snapshot.mechanicPreview.source === "ai-assisted") {
      throw new Error("Gere uma prévia determinística antes da assistência de IA.");
    }
    const allowed = status.dataFields.map(entry => `<li>${escapeHtml(entry)}</li>`).join("");
    const excluded = status.excludedData.map(entry => `<li>${escapeHtml(entry)}</li>`).join("");
    const data = await formDialog("[TESTE — AI] Assistência opcional", `
      <p><strong>${escapeHtml(status.providerLabel)}</strong> · ${escapeHtml(status.model)}</p>
      <label>Modo<select name="mode"><option value="refine">Refinar mecânica determinística</option><option value="alternate">Criar apresentação alternativa</option><option value="name">Renomear conceito</option><option value="presentation">Apresentação narrativa</option><option value="trigger">Sugerir gatilho</option><option value="phase">Sugerir fase</option></select></label>
      <label>Tema opcional<input name="theme" maxlength="240" placeholder="Ex.: forja profana, tempestade, duelo ritual"></label>
      <div class="ethernum-command-dialog__notice"><strong>Dados permitidos</strong><ul>${allowed}</ul><strong>Dados excluídos</strong><ul>${excluded}</ul></div>
      <label><input type="checkbox" name="confirmBoundary"> Confirmo esta fronteira de dados e a chamada manual ao proxy seguro.</label>
    `, "Solicitar assistência");
    if (!data) return true;
    if (data.get("confirmBoundary") !== "on") {
      throw new Error("Confirme a fronteira de dados antes de solicitar assistência de IA.");
    }
    await generators.requestAIAssistance({
      mode: field(data, "mode") as "refine" | "alternate" | "name" | "presentation" | "trigger" | "phase",
      theme: field(data, "theme") || undefined,
      language: String((game.i18n as { lang?: string } | undefined)?.lang ?? "pt-BR"),
    });
    return true;
  }
  if (action === "mechanic-ai-accept") {
    const data = await formDialog("Aprovar assistência de IA", "<p>A prévia assistida continuará editável e poderá então ser aplicada manualmente ao NPC.</p>", "Aprovar");
    if (data) generators.acceptAIAssistance();
    return true;
  }
  if (action === "mechanic-ai-reject") {
    const data = await formDialog("Rejeitar assistência de IA", "<p>A proposta assistida será descartada e a prévia determinística anterior será restaurada.</p>", "Rejeitar");
    if (data) generators.rejectAIAssistance();
    return true;
  }
  if (action === "mechanic-apply") {
    const snapshot = generators.snapshot();
    const definition = snapshot.mechanicPreview;
    if (!definition) throw new Error("Gere uma mecânica NPC antes de aplicar.");
    if (definition.source === "ai-assisted" && definition.metadata.ai?.decision !== "accepted") {
      throw new Error("A assistência de IA deve ser aprovada explicitamente antes da aplicação.");
    }
    const actor = snapshot.npcActors.find(candidate => candidate.value === definition.metadata.actorUuid);
    if (!actor) throw new Error("O NPC da prévia não está mais disponível.");
    const data = await formDialog("Aplicar mecânica gerada", `
      <p>Serão criados Items PF2e nativos em <strong>${escapeHtml(actor.label)}</strong>. Items manuais e o perfil autoral de Mecânica Única não serão alterados.</p>
      ${actor.currentName ? `<p class="ethernum-command-dialog__notice"><i class="fas fa-clock-rotate-left"></i> A aplicação atual <strong>${escapeHtml(actor.currentName)}</strong> será preservada como snapshot reversível.</p>` : ""}
      ${actor.manualProtected ? '<label><input type="checkbox" name="replaceManual"> Confirmo a substituição do conteúdo manual protegido neste flag.</label>' : ""}
    `, "Aplicar");
    if (!data) return true;
    if (actor.manualProtected && data.get("replaceManual") !== "on") {
      throw new Error("Confirme explicitamente a substituição da mecânica manual protegida.");
    }
    const applicationId = `${definition.id}:${definition.metadata.generatedAt}`;
    await runCommand({
      kind: "npc-mechanic.apply",
      application: {
        applicationId,
        actorUuid: definition.metadata.actorUuid,
        definition,
        replaceManual: data.get("replaceManual") === "on",
      },
    });
    return true;
  }
  if (action === "mechanic-revert") {
    const actorUuid = payload.actorUuid;
    const applicationId = payload.applicationId;
    if (!actorUuid || !applicationId) throw new Error("Não existe aplicação gerada reversível para este NPC.");
    const data = await formDialog("Reverter mecânica gerada", "<p>Os Items desta aplicação serão removidos e o snapshot anterior será restaurado.</p>", "Reverter");
    if (!data) return true;
    await runCommand({
      kind: "npc-mechanic.revert",
      revert: { revertId: `${applicationId}:revert`, actorUuid, applicationId },
    });
    return true;
  }

  return true;
};
