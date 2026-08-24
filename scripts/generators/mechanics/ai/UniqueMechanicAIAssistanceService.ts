import { deterministicId } from "../../shared/DeterministicRandom.js";
import type { GeneratedMechanicKind, GeneratedNPCMechanicDefinition, NPCMechanicAnalysis } from "../GeneratedNPCMechanicTypes.js";
import { editGeneratedNPCMechanic } from "../NPCMechanicGenerator.js";
import { validateGeneratedNPCMechanicDefinition } from "../GeneratedNPCMechanicValidator.js";
import {
  UNIQUE_MECHANIC_AI_DATA_FIELDS,
  UNIQUE_MECHANIC_AI_EXCLUDED_DATA,
  buildUniqueMechanicAISafeInput,
} from "./UniqueMechanicAIDataBoundary.js";
import { UniqueMechanicAIValidationError, validateUniqueMechanicAIDraft } from "./UniqueMechanicAIDraftValidator.js";
import type {
  UniqueMechanicAIAssistanceStatus,
  UniqueMechanicAIAuditRecord,
  UniqueMechanicAIOptions,
  UniqueMechanicAIProposal,
  UniqueMechanicAIProvider,
} from "./UniqueMechanicAITypes.js";

const AUDIT_LIMIT = 100;

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T;
}

function providerId(value: string): string {
  const normalized = String(value ?? "").trim();
  if (!/^[a-z0-9][a-z0-9._-]{2,80}$/i.test(normalized)) throw new Error("Identificador do provedor de IA é inválido.");
  return normalized;
}

function visibleAIName(value: string): string {
  const name = value.replace(/^\[TESTE(?:\s+—\s+AI)?\]\s*/i, "").trim();
  return `[TESTE — AI] ${name}`;
}

function componentEdit(value: { name: string; summary: string; trigger?: string; requirements?: string; effect: string } | undefined) {
  if (!value) return undefined;
  return {
    name: value.name.startsWith("[TESTE]") ? value.name : `[TESTE] ${value.name}`,
    summary: value.summary,
    ...(value.trigger ? { trigger: value.trigger } : {}),
    ...(value.requirements ? { requirements: value.requirements } : {}),
    effect: value.effect,
  };
}

export class UniqueMechanicAIError extends Error {
  constructor(message: string, readonly code: "GM_REQUIRED" | "AI_UNAVAILABLE" | "PROVIDER_ERROR" | "INVALID_JSON" | "SCHEMA_FAILURE" | "INVALID_BASE" | "INVALID_PROPOSAL") {
    super(message);
    this.name = "UniqueMechanicAIError";
  }
}

export class UniqueMechanicAIAssistanceService {
  private readonly providers = new Map<string, UniqueMechanicAIProvider>();
  private readonly proposals = new Map<string, UniqueMechanicAIProposal>();
  private readonly audit: UniqueMechanicAIAuditRecord[] = [];
  private activeProviderId?: string;

  constructor(private readonly now: () => number = Date.now) {}

  registerProvider(provider: UniqueMechanicAIProvider): void {
    const id = providerId(provider.id);
    if (provider.security?.transport !== "secure-server-proxy" || provider.security.exposesClientSecret !== false) {
      throw new Error("O provedor de IA não declarou um proxy de servidor seguro sem segredo no cliente.");
    }
    if (!String(provider.label ?? "").trim() || !String(provider.model ?? "").trim()) throw new Error("Provedor e modelo de IA devem ser identificáveis.");
    this.providers.set(id, provider);
    this.activeProviderId = id;
  }

  unregisterProvider(id: string): void {
    this.providers.delete(id);
    if (this.activeProviderId === id) this.activeProviderId = this.providers.keys().next().value as string | undefined;
  }

  status(): UniqueMechanicAIAssistanceStatus {
    const provider = this.activeProviderId ? this.providers.get(this.activeProviderId) : undefined;
    if (!provider) return {
      available: false,
      experimental: true,
      reason: "Nenhum backend/proxy seguro foi registrado. Nenhuma chave de API é aceita no cliente Foundry.",
      dataFields: [...UNIQUE_MECHANIC_AI_DATA_FIELDS],
      excludedData: [...UNIQUE_MECHANIC_AI_EXCLUDED_DATA],
    };
    try {
      const state = provider.status();
      return {
        available: state.available,
        experimental: true,
        providerId: provider.id,
        providerLabel: provider.label,
        model: provider.model,
        reason: state.available ? "Provedor seguro disponível para ação explícita do GM." : state.reason || "O proxy seguro está indisponível.",
        dataFields: [...UNIQUE_MECHANIC_AI_DATA_FIELDS],
        excludedData: [...UNIQUE_MECHANIC_AI_EXCLUDED_DATA],
      };
    } catch {
      return {
        available: false,
        experimental: true,
        providerId: provider.id,
        providerLabel: provider.label,
        model: provider.model,
        reason: "Não foi possível consultar o proxy seguro do provedor.",
        dataFields: [...UNIQUE_MECHANIC_AI_DATA_FIELDS],
        excludedData: [...UNIQUE_MECHANIC_AI_EXCLUDED_DATA],
      };
    }
  }

  listAudit(): UniqueMechanicAIAuditRecord[] {
    return this.audit.map(clone);
  }

  async assist(
    analysis: NPCMechanicAnalysis,
    baseDefinition: GeneratedNPCMechanicDefinition,
    options: UniqueMechanicAIOptions,
  ): Promise<UniqueMechanicAIProposal> {
    if (!game.user?.isGM) throw new UniqueMechanicAIError("Somente o Gamemaster pode solicitar assistência de IA.", "GM_REQUIRED");
    if (baseDefinition.source !== "deterministic" || baseDefinition.metadata.actorUuid !== analysis.actorUuid || baseDefinition.metadata.actorFingerprint !== analysis.fingerprint) {
      throw new UniqueMechanicAIError("A assistência exige a prévia determinística atual do mesmo NPC.", "INVALID_BASE");
    }
    const provider = this.activeProviderId ? this.providers.get(this.activeProviderId) : undefined;
    const status = this.status();
    if (!provider || !status.available) throw new UniqueMechanicAIError(status.reason, "AI_UNAVAILABLE");
    const requestedAt = this.now();
    const proposalId = deterministicId("ai-proposal", `${baseDefinition.id}:${provider.id}:${requestedAt}`);
    let raw: unknown;
    try {
      raw = await provider.generate(buildUniqueMechanicAISafeInput(analysis, baseDefinition, options), options);
    } catch (error) {
      this.record({ proposalId, providerId: provider.id, providerLabel: provider.label, model: provider.model, generatorVersion: baseDefinition.metadata.generatorVersion, mode: options.mode, requestedAt, completedAt: this.now(), status: "failed", errorCode: "PROVIDER_ERROR" });
      throw new UniqueMechanicAIError(`O provedor de IA falhou: ${error instanceof Error ? error.message : "erro desconhecido"}`, "PROVIDER_ERROR");
    }
    let draft;
    try {
      draft = validateUniqueMechanicAIDraft(raw);
    } catch (error) {
      const code = error instanceof UniqueMechanicAIValidationError ? error.code : "SCHEMA_FAILURE";
      this.record({ proposalId, providerId: provider.id, providerLabel: provider.label, model: provider.model, generatorVersion: baseDefinition.metadata.generatorVersion, mode: options.mode, requestedAt, completedAt: this.now(), status: "failed", errorCode: code });
      throw new UniqueMechanicAIError(error instanceof Error ? error.message : "Draft de IA inválido.", code);
    }
    const completedAt = this.now();
    const componentKinds: GeneratedMechanicKind[] = ["passive", "active", "reaction", "phase"];
    const unsupported = componentKinds.filter(kind => draft[kind] && !baseDefinition[kind]);
    if (unsupported.length > 0) {
      this.record({ proposalId, providerId: provider.id, providerLabel: provider.label, model: provider.model, generatorVersion: baseDefinition.metadata.generatorVersion, mode: options.mode, requestedAt, completedAt, status: "failed", errorCode: "SCHEMA_FAILURE" });
      throw new UniqueMechanicAIError(`A IA tentou criar componentes fora da estrutura determinística: ${unsupported.join(", ")}.`, "SCHEMA_FAILURE");
    }
    const components = Object.fromEntries(componentKinds.flatMap(kind => {
      const value = componentEdit(draft[kind]);
      return value ? [[kind, value]] : [];
    }));
    const edited = editGeneratedNPCMechanic(baseDefinition, { definitionName: visibleAIName(draft.name), components });
    const assistedDefinition = validateGeneratedNPCMechanicDefinition({
      ...edited,
      description: draft.concept,
      source: "ai-assisted",
      warnings: [...edited.warnings, ...(draft.warnings ?? []).map(warning => `AI: ${warning}`)],
      metadata: {
        ...edited.metadata,
        origin: "ai-adapter",
        ai: {
          providerId: provider.id,
          providerLabel: provider.label,
          model: provider.model,
          mode: options.mode,
          requestedAt,
          completedAt,
          decision: "pending",
          inputFields: [...UNIQUE_MECHANIC_AI_DATA_FIELDS],
          reasoningSummary: [...(draft.reasoningSummary ?? [])],
        },
      },
    });
    const proposal: UniqueMechanicAIProposal = {
      proposalId,
      baseDefinition: clone(baseDefinition),
      assistedDefinition,
      decision: "pending",
    };
    this.proposals.set(proposalId, proposal);
    this.record({ proposalId, providerId: provider.id, providerLabel: provider.label, model: provider.model, generatorVersion: baseDefinition.metadata.generatorVersion, mode: options.mode, requestedAt, completedAt, status: "pending" });
    return clone(proposal);
  }

  accept(proposalId: string): GeneratedNPCMechanicDefinition {
    return this.decide(proposalId, "accepted").assistedDefinition;
  }

  reject(proposalId: string): GeneratedNPCMechanicDefinition {
    return this.decide(proposalId, "rejected").baseDefinition;
  }

  updatePending(proposalId: string, definition: GeneratedNPCMechanicDefinition): GeneratedNPCMechanicDefinition {
    if (!game.user?.isGM) throw new UniqueMechanicAIError("Somente o Gamemaster pode editar uma assistência de IA.", "GM_REQUIRED");
    const proposal = this.proposals.get(proposalId);
    const validated = validateGeneratedNPCMechanicDefinition(definition);
    if (!proposal || proposal.decision !== "pending" || validated.id !== proposal.assistedDefinition.id || validated.source !== "ai-assisted" || validated.metadata.ai?.decision !== "pending") {
      throw new UniqueMechanicAIError("Proposta de IA pendente não encontrada para edição.", "INVALID_PROPOSAL");
    }
    proposal.assistedDefinition = clone(validated);
    return clone(validated);
  }

  private decide(proposalId: string, decision: "accepted" | "rejected"): UniqueMechanicAIProposal {
    if (!game.user?.isGM) throw new UniqueMechanicAIError("Somente o Gamemaster pode decidir uma assistência de IA.", "GM_REQUIRED");
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.decision !== "pending") throw new UniqueMechanicAIError("Proposta de IA pendente não encontrada.", "INVALID_PROPOSAL");
    proposal.decision = decision;
    const decidedAt = this.now();
    proposal.assistedDefinition = validateGeneratedNPCMechanicDefinition({
      ...proposal.assistedDefinition,
      metadata: {
        ...proposal.assistedDefinition.metadata,
        ai: { ...proposal.assistedDefinition.metadata.ai!, decision, decidedAt },
      },
    });
    const record = this.audit.find(entry => entry.proposalId === proposalId && entry.status === "pending");
    if (record) Object.assign(record, { status: decision, decidedAt });
    return clone(proposal);
  }

  private record(record: UniqueMechanicAIAuditRecord): void {
    this.audit.push(record);
    if (this.audit.length > AUDIT_LIMIT) this.audit.splice(0, this.audit.length - AUDIT_LIMIT);
  }
}

let service: UniqueMechanicAIAssistanceService | null = null;
export function getUniqueMechanicAIAssistanceService(): UniqueMechanicAIAssistanceService {
  return service ??= new UniqueMechanicAIAssistanceService();
}
