export const GENERATED_NPC_MECHANIC_SCHEMA_VERSION = 1;
export const GENERATED_NPC_MECHANIC_VERSION = "3.8.6";

export type GeneratedNPCMechanicSource = "deterministic" | "ai-assisted" | "manual";
export type NPCMechanicRole =
  | "brute"
  | "skirmisher"
  | "controller"
  | "artillery"
  | "defender"
  | "support"
  | "caster"
  | "boss"
  | "hybrid";
export type NPCMechanicComplexity = "standard" | "elite" | "boss";
export type GeneratedMechanicKind = "passive" | "active" | "reaction" | "phase";
export type GeneratedMechanicActionCost = "passive" | "free" | "reaction" | 1 | 2 | 3;
export type GeneratedMechanicSave = "fortitude" | "reflex" | "will";

export interface NPCMechanicRoleWeight {
  role: NPCMechanicRole;
  weight: number;
  reasons: string[];
}

export interface NPCMechanicStrike {
  name: string;
  attackBonus: number;
  ranged: boolean;
  reach: number;
  damageFormula: string;
  damageTypes: string[];
  traits: string[];
}

export interface NPCMechanicResistance {
  type: string;
  value: number;
}

export interface NPCMechanicAnalysis {
  actorUuid: string;
  actorName: string;
  level: number;
  traits: string[];
  size: string;
  speeds: Array<{ type: string; value: number }>;
  strikes: NPCMechanicStrike[];
  attackTypes: string[];
  damageTypes: string[];
  spellcasting: boolean;
  resistances: NPCMechanicResistance[];
  weaknesses: NPCMechanicResistance[];
  immunities: string[];
  actions: string[];
  reactions: string[];
  hp: number;
  ac: number;
  saves: { fortitude: number; reflex: number; will: number };
  roles: NPCMechanicRoleWeight[];
  fingerprint: string;
}

export interface GeneratedMechanicOperation {
  save?: { type: GeneratedMechanicSave; dc: number; basic: boolean };
  damage?: { formula: string; type: string };
  condition?: { slug: string; value: number; durationRounds: number };
  movement?: { distance: number; mode: "stride" | "step" | "reposition" };
  resource?: { name: string; maximum: number; spend: number };
}

export interface GeneratedMechanicComponent {
  id: string;
  templateId: string;
  experimental: true;
  kind: GeneratedMechanicKind;
  name: string;
  summary: string;
  trigger?: string;
  requirements?: string;
  effect: string;
  actionCost: GeneratedMechanicActionCost;
  cooldownRounds?: number;
  limitedUses?: number;
  traits: string[];
  powerCost: number;
  operation?: GeneratedMechanicOperation;
}

export interface GeneratedNPCMechanicDefinition {
  id: string;
  schemaVersion: typeof GENERATED_NPC_MECHANIC_SCHEMA_VERSION;
  name: string;
  description?: string;
  source: GeneratedNPCMechanicSource;
  complexity: NPCMechanicComplexity;
  roles: NPCMechanicRoleWeight[];
  passive?: GeneratedMechanicComponent;
  active?: GeneratedMechanicComponent;
  reaction?: GeneratedMechanicComponent;
  phase?: GeneratedMechanicComponent;
  warnings: string[];
  metadata: {
    origin: "deterministic-generator" | "ai-adapter" | "manual";
    generatedAt: number;
    generatorVersion: string;
    seed: string;
    actorUuid: string;
    actorFingerprint: string;
    templateIds: string[];
    powerBudget: number;
    powerSpent: number;
    ai?: {
      providerId: string;
      providerLabel: string;
      model: string;
      mode: "refine" | "alternate" | "name" | "presentation" | "trigger" | "phase";
      requestedAt: number;
      completedAt: number;
      decision: "pending" | "accepted" | "rejected";
      decidedAt?: number;
      inputFields: string[];
      reasoningSummary: string[];
    };
  };
}

export interface NPCMechanicGenerationInput {
  analysis: NPCMechanicAnalysis;
  seed: string;
  complexity?: NPCMechanicComplexity | "auto";
}

export interface GeneratedNPCMechanicApplicationInput {
  applicationId: string;
  actorUuid: string;
  definition: GeneratedNPCMechanicDefinition;
  replaceManual?: boolean;
}

export interface GeneratedNPCMechanicRevertInput {
  revertId: string;
  actorUuid: string;
  applicationId: string;
}

export interface GeneratedNPCMechanicAppliedState {
  applicationId: string;
  appliedAt: number;
  definition: GeneratedNPCMechanicDefinition;
  itemIds: string[];
}

export interface GeneratedNPCMechanicRollbackState {
  capturedAt: number;
  previous?: GeneratedNPCMechanicAppliedState;
  itemSources: Record<string, unknown>[];
  rawState?: unknown;
}

export interface GeneratedNPCMechanicActorState {
  schemaVersion: typeof GENERATED_NPC_MECHANIC_SCHEMA_VERSION;
  current?: GeneratedNPCMechanicAppliedState;
  rollback?: GeneratedNPCMechanicRollbackState;
  lastRevertedApplicationId?: string;
}

export interface GeneratedNPCMechanicApplicationResult {
  applicationId: string;
  actorUuid: string;
  actorName: string;
  state: "completed" | "duplicate" | "reverted";
  itemIds: string[];
}

export interface GeneratedNPCMechanicActorOption {
  value: string;
  label: string;
  level: number;
  currentName?: string;
  currentApplicationId?: string;
  canRevert: boolean;
  manualProtected: boolean;
}
