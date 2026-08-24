export type LootRarity = "common" | "uncommon" | "rare" | "unique";
export type LootCategory = "treasure" | "consumable" | "permanent";

export interface LootCandidate {
  uuid: string;
  name: string;
  image?: string;
  level: number;
  rarity: LootRarity;
  category: LootCategory;
  type: string;
  traits: string[];
  sourceId: string;
  sourceLabel: string;
  priceCopper: number;
}

export interface LootGenerationInput {
  partyLevel: number;
  partySize: number;
  encounterLevel: number;
  minimumItemLevel: number;
  maximumItemLevel: number;
  rarities: LootRarity[];
  categories: LootCategory[];
  types: string[];
  traits: string[];
  allowedSources: string[];
  budgetCopper: number;
  seed: string;
}

export interface LootManifestItem extends LootCandidate {
  quantity: number;
  subtotalCopper: number;
}

export interface LootManifest {
  manifestId: string;
  seed: string;
  input: LootGenerationInput;
  items: LootManifestItem[];
  specialCandidate?: LootCandidate;
  spentCopper: number;
  currencyCopper: number;
  totalCopper: number;
  candidateCount: number;
  warnings: string[];
  generatedAt: number;
}

export interface LootApplicationInput {
  applicationId: string;
  actorUuid: string;
  manifest: LootManifest;
}

export interface LootApplicationResult {
  applicationId: string;
  actorName: string;
  itemCount: number;
  currencyCopper: number;
  state: "completed" | "rolledBack" | "recoveryRequired";
}

export type LootApplicationState =
  | "received"
  | "granting"
  | "completed"
  | "compensating"
  | "rolledBack"
  | "recoveryRequired";

export interface LootApplicationRecord extends LootApplicationInput {
  actorName: string;
  state: LootApplicationState;
  createdItemIds: string[];
  currencyGranted: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
  recoveryNotes?: string[];
}

export interface LootApplicationData {
  schemaVersion: number;
  revision: number;
  applications: LootApplicationRecord[];
}
