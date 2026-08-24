import type {
  GeneratedMechanicKind,
  GeneratedNPCMechanicDefinition,
  NPCMechanicComplexity,
  NPCMechanicRoleWeight,
} from "../GeneratedNPCMechanicTypes.js";

export const UNIQUE_MECHANIC_AI_SCHEMA_VERSION = 1;
export const UNIQUE_MECHANIC_AI_MODES = [
  "refine",
  "alternate",
  "name",
  "presentation",
  "trigger",
  "phase",
] as const;

export type UniqueMechanicAIMode = typeof UNIQUE_MECHANIC_AI_MODES[number];
export type UniqueMechanicAIDecision = "pending" | "accepted" | "rejected";
export type UniqueMechanicAIAuditStatus = UniqueMechanicAIDecision | "failed";

export interface UniqueMechanicAIDraftComponent {
  name: string;
  summary: string;
  trigger?: string;
  requirements?: string;
  effect: string;
}

export interface UniqueMechanicAIDraft {
  schemaVersion: typeof UNIQUE_MECHANIC_AI_SCHEMA_VERSION;
  name: string;
  concept: string;
  passive?: UniqueMechanicAIDraftComponent;
  active?: UniqueMechanicAIDraftComponent;
  reaction?: UniqueMechanicAIDraftComponent;
  phase?: UniqueMechanicAIDraftComponent;
  reasoningSummary?: string[];
  warnings?: string[];
}

export interface UniqueMechanicAISafeInput {
  schemaVersion: typeof UNIQUE_MECHANIC_AI_SCHEMA_VERSION;
  mode: UniqueMechanicAIMode;
  context: {
    npc: {
      name: string;
      level: number;
      traits: string[];
      size: string;
      movement: Array<{ type: string; value: number }>;
      attacks: Array<{
        name: string;
        ranged: boolean;
        reach: number;
        damageFormula: string;
        damageTypes: string[];
        traits: string[];
      }>;
      damageTypes: string[];
      spellcasting: boolean;
      actions: string[];
      reactions: string[];
      roles: NPCMechanicRoleWeight[];
    };
    request: {
      complexity: NPCMechanicComplexity;
      theme?: string;
      language: string;
    };
    deterministicDraft: {
      name: string;
      description?: string;
      components: Partial<Record<GeneratedMechanicKind, UniqueMechanicAIDraftComponent>>;
    };
  };
}

export interface UniqueMechanicAIOptions {
  mode: UniqueMechanicAIMode;
  theme?: string;
  language?: string;
}

export interface UniqueMechanicAIProviderStatus {
  available: boolean;
  reason?: string;
}

export interface UniqueMechanicAIProvider {
  readonly id: string;
  readonly label: string;
  readonly model: string;
  readonly security: {
    transport: "secure-server-proxy";
    exposesClientSecret: false;
  };
  status(): UniqueMechanicAIProviderStatus;
  generate(input: UniqueMechanicAISafeInput, options?: UniqueMechanicAIOptions): Promise<unknown>;
}

export interface UniqueMechanicAIAssistanceStatus {
  available: boolean;
  experimental: true;
  providerId?: string;
  providerLabel?: string;
  model?: string;
  reason: string;
  dataFields: string[];
  excludedData: string[];
}

export interface UniqueMechanicAIProposal {
  proposalId: string;
  baseDefinition: GeneratedNPCMechanicDefinition;
  assistedDefinition: GeneratedNPCMechanicDefinition;
  decision: UniqueMechanicAIDecision;
}

export interface UniqueMechanicAIAuditRecord {
  proposalId: string;
  providerId: string;
  providerLabel: string;
  model: string;
  generatorVersion: string;
  mode: UniqueMechanicAIMode;
  requestedAt: number;
  completedAt: number;
  status: UniqueMechanicAIAuditStatus;
  decidedAt?: number;
  errorCode?: string;
}
