import { analyzeEncounter } from "./encounter/EncounterAnalyzer.js";
import { PF2eEncounterSource } from "./encounter/PF2eEncounterSource.js";
import type { EncounterAnalysis } from "./encounter/EncounterAnalyzerTypes.js";
import { generateLootManifest } from "./loot/LootGenerator.js";
import { PF2eLootSource, type LootSourceOption } from "./loot/PF2eLootSource.js";
import type { LootGenerationInput, LootManifest } from "./loot/LootGeneratorTypes.js";
import type {
  GeneratedNPCMechanicActorOption,
  GeneratedNPCMechanicDefinition,
  NPCMechanicAnalysis,
  NPCMechanicComplexity,
} from "./mechanics/GeneratedNPCMechanicTypes.js";
import { editGeneratedNPCMechanic, generateNPCMechanic, type GeneratedNPCMechanicTextEdit } from "./mechanics/NPCMechanicGenerator.js";
import { PF2eNPCMechanicSource } from "./mechanics/PF2eNPCMechanicSource.js";
import { getUniqueMechanicAIAssistanceService, type UniqueMechanicAIAssistanceService } from "./mechanics/ai/UniqueMechanicAIAssistanceService.js";
import type { UniqueMechanicAIAssistanceStatus, UniqueMechanicAIOptions } from "./mechanics/ai/UniqueMechanicAITypes.js";
import { getGeneratedNPCMechanicService } from "../unique/services/GeneratedNPCMechanicService.js";
import { PerformanceTelemetry } from "../core/PerformanceTelemetry.js";

export interface OperationalGeneratorSnapshot {
  lootPreview?: LootManifest;
  encounterAnalysis?: EncounterAnalysis;
  mechanicPreview?: GeneratedNPCMechanicDefinition;
  mechanicAnalysis?: NPCMechanicAnalysis;
  aiStatus: UniqueMechanicAIAssistanceStatus;
  aiProposal?: { proposalId: string; decision: "pending" | "accepted" | "rejected" };
  aiAuditCount: number;
  lootSources: LootSourceOption[];
  lootActors: Array<{ value: string; label: string }>;
  npcActors: GeneratedNPCMechanicActorOption[];
  busy: boolean;
}

function collection<T>(value: unknown): T[] {
  return value && typeof (value as Iterable<T>)[Symbol.iterator] === "function" ? Array.from(value as Iterable<T>) : [];
}

export class OperationalGeneratorService {
  private lootPreview?: LootManifest;
  private encounterAnalysis?: EncounterAnalysis;
  private mechanicPreview?: GeneratedNPCMechanicDefinition;
  private mechanicAnalysis?: NPCMechanicAnalysis;
  private aiProposal?: { proposalId: string; decision: "pending" | "accepted" | "rejected" };
  private busy = false;
  constructor(
    private readonly lootSource = new PF2eLootSource(),
    private readonly encounterSource = new PF2eEncounterSource(),
    private readonly mechanicSource = new PF2eNPCMechanicSource(),
    private readonly ai: UniqueMechanicAIAssistanceService = getUniqueMechanicAIAssistanceService(),
  ) {}

  snapshot(): OperationalGeneratorSnapshot {
    return {
      ...(this.lootPreview ? { lootPreview: this.lootPreview } : {}),
      ...(this.encounterAnalysis ? { encounterAnalysis: this.encounterAnalysis } : {}),
      ...(this.mechanicPreview ? { mechanicPreview: this.mechanicPreview } : {}),
      ...(this.mechanicAnalysis ? { mechanicAnalysis: this.mechanicAnalysis } : {}),
      aiStatus: this.ai.status(),
      ...(this.aiProposal ? { aiProposal: { ...this.aiProposal } } : {}),
      aiAuditCount: this.ai.listAudit().length,
      lootSources: this.lootSource.sourceOptions(),
      lootActors: collection<Actor>(game.actors).filter(actor => (actor.type as string) === "loot" && actor.uuid)
        .map(actor => ({ value: actor.uuid!, label: actor.name })),
      npcActors: this.mechanicSource.listActors().filter(actor => actor.uuid).map(actor => {
        const service = getGeneratedNPCMechanicService();
        const state = service.getState(actor);
        return {
          value: actor.uuid!,
          label: actor.name,
          level: Number((actor as Actor & { level?: number }).level ?? 0) || 0,
          ...(state.current?.definition.name ? { currentName: state.current.definition.name } : {}),
          ...(state.current?.applicationId ? { currentApplicationId: state.current.applicationId } : {}),
          canRevert: Boolean(state.current && state.rollback),
          manualProtected: service.hasManualProtection(actor),
        };
      }),
      busy: this.busy,
    };
  }

  async generateLoot(input: LootGenerationInput): Promise<LootManifest> {
    if (this.busy) throw new Error("Uma geração operacional já está em andamento.");
    this.busy = true;
    try {
      const candidates = await PerformanceTelemetry.measure(
        "generator.loot-index",
        () => this.lootSource.listCandidates(input.allowedSources),
      );
      this.lootPreview = generateLootManifest(input, candidates);
      return this.lootPreview;
    } finally {
      this.busy = false;
    }
  }

  async regenerateLoot(seed: string): Promise<LootManifest> {
    if (!this.lootPreview) throw new Error("Gere um manifesto antes de solicitar outra semente.");
    return this.generateLoot({ ...this.lootPreview.input, seed });
  }

  analyzeCurrentEncounter(): EncounterAnalysis {
    const stopMeasurement = PerformanceTelemetry.start("generator.encounter-analysis");
    this.encounterAnalysis = analyzeEncounter(this.encounterSource.current());
    stopMeasurement();
    return this.encounterAnalysis;
  }

  async generateNPCMechanic(actorUuid: string, seed: string, complexity: NPCMechanicComplexity | "auto" = "auto"): Promise<GeneratedNPCMechanicDefinition> {
    if (this.busy) throw new Error("Uma geração operacional já está em andamento.");
    this.busy = true;
    try {
      this.mechanicAnalysis = await PerformanceTelemetry.measure(
        "generator.npc-analysis",
        () => this.mechanicSource.analyze(actorUuid),
      );
      this.mechanicPreview = generateNPCMechanic({ analysis: this.mechanicAnalysis, seed, complexity });
      this.aiProposal = undefined;
      return this.mechanicPreview;
    } finally {
      this.busy = false;
    }
  }

  async regenerateNPCMechanic(seed: string): Promise<GeneratedNPCMechanicDefinition> {
    if (!this.mechanicPreview) throw new Error("Gere uma mecânica NPC antes de solicitar outra semente.");
    return this.generateNPCMechanic(this.mechanicPreview.metadata.actorUuid, seed, this.mechanicPreview.complexity);
  }

  editNPCMechanic(edit: GeneratedNPCMechanicTextEdit): GeneratedNPCMechanicDefinition {
    if (!this.mechanicPreview) throw new Error("Gere uma mecânica NPC antes de editar.");
    this.mechanicPreview = editGeneratedNPCMechanic(this.mechanicPreview, edit);
    if (this.aiProposal?.decision === "pending") this.mechanicPreview = this.ai.updatePending(this.aiProposal.proposalId, this.mechanicPreview);
    return this.mechanicPreview;
  }

  async requestAIAssistance(options: UniqueMechanicAIOptions): Promise<GeneratedNPCMechanicDefinition> {
    if (this.busy) throw new Error("Uma geração operacional já está em andamento.");
    if (!this.mechanicPreview || !this.mechanicAnalysis) throw new Error("Gere uma mecânica determinística antes de solicitar assistência de IA.");
    this.busy = true;
    try {
      const proposal = await this.ai.assist(this.mechanicAnalysis, this.mechanicPreview, options);
      this.aiProposal = { proposalId: proposal.proposalId, decision: proposal.decision };
      this.mechanicPreview = proposal.assistedDefinition;
      return this.mechanicPreview;
    } finally {
      this.busy = false;
    }
  }

  acceptAIAssistance(): GeneratedNPCMechanicDefinition {
    if (!this.aiProposal || this.aiProposal.decision !== "pending") throw new Error("Não existe assistência de IA pendente para aprovação.");
    this.mechanicPreview = this.ai.accept(this.aiProposal.proposalId);
    this.aiProposal = { ...this.aiProposal, decision: "accepted" };
    return this.mechanicPreview;
  }

  rejectAIAssistance(): GeneratedNPCMechanicDefinition {
    if (!this.aiProposal || this.aiProposal.decision !== "pending") throw new Error("Não existe assistência de IA pendente para rejeição.");
    this.mechanicPreview = this.ai.reject(this.aiProposal.proposalId);
    this.aiProposal = { ...this.aiProposal, decision: "rejected" };
    return this.mechanicPreview;
  }
}

let service: OperationalGeneratorService | null = null;
export function getOperationalGeneratorService(): OperationalGeneratorService { return service ??= new OperationalGeneratorService(); }
