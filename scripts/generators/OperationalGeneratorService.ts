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
import { getGeneratedNPCMechanicService } from "../unique/services/GeneratedNPCMechanicService.js";

export interface OperationalGeneratorSnapshot {
  lootPreview?: LootManifest;
  encounterAnalysis?: EncounterAnalysis;
  mechanicPreview?: GeneratedNPCMechanicDefinition;
  mechanicAnalysis?: NPCMechanicAnalysis;
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
  private busy = false;
  constructor(
    private readonly lootSource = new PF2eLootSource(),
    private readonly encounterSource = new PF2eEncounterSource(),
    private readonly mechanicSource = new PF2eNPCMechanicSource(),
  ) {}

  snapshot(): OperationalGeneratorSnapshot {
    return {
      ...(this.lootPreview ? { lootPreview: this.lootPreview } : {}),
      ...(this.encounterAnalysis ? { encounterAnalysis: this.encounterAnalysis } : {}),
      ...(this.mechanicPreview ? { mechanicPreview: this.mechanicPreview } : {}),
      ...(this.mechanicAnalysis ? { mechanicAnalysis: this.mechanicAnalysis } : {}),
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
      const candidates = await this.lootSource.listCandidates(input.allowedSources);
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
    this.encounterAnalysis = analyzeEncounter(this.encounterSource.current());
    return this.encounterAnalysis;
  }

  async generateNPCMechanic(actorUuid: string, seed: string, complexity: NPCMechanicComplexity | "auto" = "auto"): Promise<GeneratedNPCMechanicDefinition> {
    if (this.busy) throw new Error("Uma geração operacional já está em andamento.");
    this.busy = true;
    try {
      this.mechanicAnalysis = await this.mechanicSource.analyze(actorUuid);
      this.mechanicPreview = generateNPCMechanic({ analysis: this.mechanicAnalysis, seed, complexity });
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
    return this.mechanicPreview;
  }
}

let service: OperationalGeneratorService | null = null;
export function getOperationalGeneratorService(): OperationalGeneratorService { return service ??= new OperationalGeneratorService(); }
