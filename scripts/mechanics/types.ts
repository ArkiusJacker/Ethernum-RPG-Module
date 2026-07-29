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

export interface UniqueMechanicProfile<TState extends object = Record<string, unknown>> {
  id: Exclude<UniqueMechanicProfileId, "">;
  core: CampaignCoreId;
  label: string;
  defaultState: TState;
  normalizeState: (value: unknown) => TState;
}

export interface UniqueMechanicProfileOption {
  id: UniqueMechanicProfileId;
  label: string;
  core: CampaignCoreId;
  placeholder?: boolean;
}
