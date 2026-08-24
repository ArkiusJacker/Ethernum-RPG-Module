export interface EncounterParticipant {
  id: string;
  name: string;
  level: number;
  disposition: "party" | "enemy";
}

export interface EncounterAnalysisInput {
  party: EncounterParticipant[];
  enemies: EncounterParticipant[];
  preparedXp?: number;
  encounterName?: string;
}

export interface EncounterContribution extends EncounterParticipant {
  relativeLevel: number;
  xp: number;
  warning?: string;
}

export interface EncounterBudgets {
  trivial: number;
  low: number;
  moderate: number;
  severe: number;
  extreme: number;
}

export interface EncounterAnalysis {
  encounterName: string;
  partySize: number;
  partyLevel: number;
  partyAdjustment: number;
  mixedPartyLevels: boolean;
  xp: number;
  xpSource: "prepared" | "calculated";
  difficulty: "trivial" | "low" | "moderate" | "severe" | "extreme" | "beyond-extreme";
  budgets: EncounterBudgets;
  contributions: EncounterContribution[];
  warnings: string[];
  analyzedAt: number;
}
