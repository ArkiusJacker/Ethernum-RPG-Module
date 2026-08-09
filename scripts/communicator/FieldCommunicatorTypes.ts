export const FIELD_COMMUNICATOR_SCHEMA_VERSION = 1;
export const FIELD_COMMUNICATOR_APP_VERSION = 1;

export const OFFICIAL_FIELD_COMMUNICATOR_APP_IDS = [
  "sheet",
  "conversations",
  "group",
  "squad",
  "map",
  "manual",
  "dossiers",
  "contracts",
  "files",
  "shop",
  "settings",
] as const;

export type OfficialFieldCommunicatorAppId =
  (typeof OFFICIAL_FIELD_COMMUNICATOR_APP_IDS)[number];

export const FIELD_COMMUNICATOR_APP_TYPES = [
  "internal",
  "document",
  "scene",
  "compendium",
  "journal-folder",
  "external",
] as const;

export type FieldCommunicatorAppType =
  (typeof FIELD_COMMUNICATOR_APP_TYPES)[number];

export type FieldCommunicatorAppSource = "official" | "custom";
export type FieldCommunicatorBadge = "auto" | "none" | number | string;

export type FieldCommunicatorJsonPrimitive = string | number | boolean | null;
export type FieldCommunicatorJsonValue =
  | FieldCommunicatorJsonPrimitive
  | FieldCommunicatorJsonValue[]
  | { [key: string]: FieldCommunicatorJsonValue };

/** Declarative unlock data only. Consumers decide how to evaluate it. */
export interface FieldCommunicatorUnlockCondition {
  kind: "actor-flag" | "user-flag" | "world-setting" | "document-exists";
  key: string;
  equals?: FieldCommunicatorJsonPrimitive;
  [key: string]: unknown;
}

export interface FieldCommunicatorApp {
  version: number;
  id: string;
  source: FieldCommunicatorAppSource;
  label: string;
  description: string;
  icon: string;
  type: FieldCommunicatorAppType;
  order: number;
  enabled: boolean;
  accent?: string;
  badge?: FieldCommunicatorBadge;
  minimumRank?: number;
  allowedRanks?: number[];
  allowedAgents?: string[];
  allowedSquads?: string[];
  unlock?: FieldCommunicatorUnlockCondition;
  internalTarget?: string;
  targetUuid?: string;
  targetUrl?: string;
  [key: string]: unknown;
}

export interface FieldCommunicatorRegistryData {
  schemaVersion: number;
  apps: FieldCommunicatorApp[];
  [key: string]: unknown;
}

export interface FieldCommunicatorAccessContext {
  rank?: number;
  agentId?: string;
  squadIds?: readonly string[];
}

export interface FieldCommunicatorResetOptions {
  preserveCustomApps?: boolean;
}

export interface FieldCommunicatorImportResult {
  registry: FieldCommunicatorRegistryData;
  rejectedCount: number;
  warnings: string[];
}
