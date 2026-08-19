export const COMPANY_STORE_SCHEMA_VERSION = 1;
export const COMPANY_STORE_ENTRY_VERSION = 1;

export const COMPANY_STORE_TRANSACTION_MODES = ["automatic", "approval"] as const;
export type CompanyStoreTransactionMode = (typeof COMPANY_STORE_TRANSACTION_MODES)[number];

export const COMPANY_STORE_TRANSACTION_STATES = [
  "received",
  "debiting",
  "debited",
  "granting",
  "granted",
  "completing",
  "completed",
  "compensating",
  "rolledBack",
  "recoveryRequired",
] as const;
export type CompanyStoreTransactionState = (typeof COMPANY_STORE_TRANSACTION_STATES)[number];

export interface CompanyStoreCoins {
  pp: number;
  gp: number;
  sp: number;
  cp: number;
  copperValue: number;
}

export interface CompanyStoreEntry {
  version: number;
  revision: number;
  id: string;
  itemUuid: string;
  priceOverride?: string;
  stock?: number;
  minimumRank?: number;
  allowedRegions?: string[];
  requiredFlags?: string[];
  transactionMode: CompanyStoreTransactionMode;
  featured?: boolean;
  enabled: boolean;
  [key: string]: unknown;
}

export interface CompanyStorePrincipalAuthorization {
  actorUuid: string;
  rank?: number;
  region?: string;
  flags: string[];
  updatedAt: number;
}

export interface CompanyStoreTransactionRecord {
  id: string;
  fingerprint: string;
  requesterId: string;
  actorUuid: string;
  actorName: string;
  entryId: string;
  requestMessageUuid: string;
  itemUuid: string;
  itemName: string;
  transactionMode: CompanyStoreTransactionMode;
  state: CompanyStoreTransactionState;
  price: CompanyStoreCoins;
  priceLabel: string;
  stockBefore?: number;
  createdItemIds: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  approvedBy?: string;
  error?: string;
  recoveryNotes?: string[];
  [key: string]: unknown;
}

export interface CompanyStoreData {
  schemaVersion: number;
  revision: number;
  entries: CompanyStoreEntry[];
  transactions: CompanyStoreTransactionRecord[];
  authorizations: Record<string, CompanyStorePrincipalAuthorization>;
  migration?: {
    worldItemsImportedAt?: number;
    importedItemUuids?: string[];
    authorizationsImportedAt?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type CompanyStoreAuthorizationCode =
  | "authorized"
  | "approval"
  | "no-actor"
  | "currency-unavailable"
  | "rank"
  | "region"
  | "flag"
  | "permission"
  | "out-of-stock"
  | "insufficient-funds"
  | "broken-item"
  | "unsupported-item"
  | "recovery-required";

export interface CompanyStoreItemDTO {
  id: string;
  name: string;
  image?: string;
  description?: string;
  level?: number;
  rarity?: string;
  rarityLabel?: string;
  price: CompanyStoreCoins;
  priceLabel: string;
  stock?: number;
  stockLabel: string;
  transactionMode: CompanyStoreTransactionMode;
  actionLabel: string;
  authorizationCode: CompanyStoreAuthorizationCode;
  authorizationLabel: string;
  authorized: boolean;
  affordable: boolean;
  available: boolean;
  featured: boolean;
  quoteRevision: number;
  broken?: boolean;
}

export interface CompanyStoreBalanceDTO extends CompanyStoreCoins {
  available: boolean;
  label: string;
  denominations: Array<{ id: "pp" | "gp" | "sp" | "cp"; label: string; value: number }>;
}

export interface CompanyStorePurchaseReceipt {
  transactionId: string;
  shortId: string;
  status: "queued" | "completed" | "rejected" | "expired" | "failed" | "rolledBack" | "recoveryRequired";
  statusLabel: string;
  message: string;
  tone: "pending" | "success" | "danger" | "warning";
  icon: string;
  actorName: string;
  itemName: string;
  priceLabel: string;
  approval: boolean;
  completedAt?: number;
}

export interface CompanyStoreSnapshot {
  schemaVersion: number;
  revision: number;
  actorId?: string;
  actorUuid?: string;
  actorName?: string;
  balance: CompanyStoreBalanceDTO;
  items: CompanyStoreItemDTO[];
  selectedItem?: CompanyStoreItemDTO;
  state: {
    noActor: boolean;
    currencyUnavailable: boolean;
    empty: boolean;
  };
}

export interface CompanyStorePurchasePayload {
  transactionId: string;
  entryId: string;
  actorUuid: string;
  requestMessageUuid: string;
  quotedEntryRevision?: number;
  quotedPriceCopper?: number;
  quotedPriceLabel?: string;
  quotedItemName?: string;
}

export interface CompanyStorePurchaseResult {
  transactionId: string;
  actorName: string;
  itemName: string;
  priceLabel: string;
  state: "completed" | "rolledBack" | "recoveryRequired";
  completedAt: number;
  approval: boolean;
  createdItemIds: string[];
  stockRemaining?: number;
}

export interface CompanyStorePurchaseSubmission {
  receipt: CompanyStorePurchaseReceipt;
  completion?: Promise<CompanyStorePurchaseReceipt>;
}

export interface CompanyStoreMutationOptions {
  expectedRevision?: number;
}
