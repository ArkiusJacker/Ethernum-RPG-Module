import { analyzeEncounter } from "./encounter/EncounterAnalyzer.js";
import { PF2eEncounterSource } from "./encounter/PF2eEncounterSource.js";
import type { EncounterAnalysis } from "./encounter/EncounterAnalyzerTypes.js";
import { generateLootManifest } from "./loot/LootGenerator.js";
import { PF2eLootSource, type LootSourceOption } from "./loot/PF2eLootSource.js";
import type { LootGenerationInput, LootManifest } from "./loot/LootGeneratorTypes.js";

export interface OperationalGeneratorSnapshot {
  lootPreview?: LootManifest;
  encounterAnalysis?: EncounterAnalysis;
  lootSources: LootSourceOption[];
  lootActors: Array<{ value: string; label: string }>;
  busy: boolean;
}

function collection<T>(value: unknown): T[] {
  return value && typeof (value as Iterable<T>)[Symbol.iterator] === "function" ? Array.from(value as Iterable<T>) : [];
}

export class OperationalGeneratorService {
  private lootPreview?: LootManifest;
  private encounterAnalysis?: EncounterAnalysis;
  private busy = false;
  constructor(
    private readonly lootSource = new PF2eLootSource(),
    private readonly encounterSource = new PF2eEncounterSource(),
  ) {}

  snapshot(): OperationalGeneratorSnapshot {
    return {
      ...(this.lootPreview ? { lootPreview: this.lootPreview } : {}),
      ...(this.encounterAnalysis ? { encounterAnalysis: this.encounterAnalysis } : {}),
      lootSources: this.lootSource.sourceOptions(),
      lootActors: collection<Actor>(game.actors).filter(actor => (actor.type as string) === "loot" && actor.uuid)
        .map(actor => ({ value: actor.uuid!, label: actor.name })),
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
}

let service: OperationalGeneratorService | null = null;
export function getOperationalGeneratorService(): OperationalGeneratorService { return service ??= new OperationalGeneratorService(); }
