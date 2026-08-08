import type { CampaignCoreId } from "../config.js";

export type UniqueMechanicProfileId = ""
  | "gyro-spin"
  | "bayle-dragon"
  | "pipping-night"
  | "kaitake"
  | "cinerio"
  | "ailan"
  | "arkius-jacker"
  | "atlas-sidarta"
  | "charles"
  | "morgana"
  | "yu-jiu-ji-tae"
  | "unluck";

export interface UniqueMechanicsState {
  activeCore: CampaignCoreId;
  activeProfile: UniqueMechanicProfileId;
  profiles: Record<string, unknown>;
}

export interface UniqueMechanicAction {
  id: string;
  label?: string;
  macroName?: string;
}

export interface UniqueMechanicsRuntime {
  [key: string]: unknown;
  buildSheetData: (actor: Actor, isGM: boolean) => Record<string, unknown>;
}

export interface UniqueProfileContext {
  actor: Actor;
  runtime: UniqueMechanicsRuntime;
  isGM?: boolean;
}

export interface UniqueCombatHookContext {
  combat: Combat;
  changed?: Record<string, unknown>;
  runtime: UniqueMechanicsRuntime;
}

export interface UniqueActorHookContext extends UniqueProfileContext {
  changed: unknown;
}

export interface UniqueRestContext extends UniqueProfileContext {
  rest: "short" | "long";
}

export interface UniqueMechanicProfile<TState extends object = Record<string, unknown>> {
  id: Exclude<UniqueMechanicProfileId, "">;
  core: CampaignCoreId;
  label: string;
  defaultState: TState;
  normalizeState: (value: unknown) => TState;
  buildSheetData: (context: UniqueProfileContext) => Record<string, unknown>;
  getActions: (context: UniqueProfileContext) => UniqueMechanicAction[];
  executeAction: (
    context: UniqueProfileContext,
    actionId: string,
    payload?: Record<string, unknown>,
  ) => Promise<unknown>;
  getManagedMacros: (context: UniqueProfileContext) => UniqueMechanicAction[];
  onCombatUpdate: (context: UniqueCombatHookContext) => Promise<void>;
  onActorUpdate: (context: UniqueActorHookContext) => Promise<void>;
  onRest: (context: UniqueRestContext) => Promise<void>;
  migrateState: (value: unknown) => TState;
}

export interface UniqueMechanicProfileOption {
  id: UniqueMechanicProfileId;
  label: string;
  core: CampaignCoreId;
  placeholder?: boolean;
}
