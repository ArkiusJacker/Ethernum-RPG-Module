export const CONTRACT_ARCHIVE_SCHEMA_VERSION = 1;
export const CONTRACT_RECORD_VERSION = 1;
export const CONTRACT_REPORT_ATTACHMENT_ID = "__report__";

export const CONTRACT_STATUSES = [
  "available",
  "accepted",
  "active",
  "completed",
  "failed",
  "archived",
] as const;

export type EthernumContractStatus = (typeof CONTRACT_STATUSES)[number];
export type EthernumContractDocumentKind = "pdf" | "journal" | "image" | "dossier" | "text";
export type EthernumContractAttachmentCategory = "attachment" | "dossier" | "reward";
export type EthernumContractPrincipalKind = "user" | "agent" | "squad";
export type ContractDocumentStorage = "foundry-document" | "foundry-data" | "module-asset";

export interface ContractStoredDocument {
  storage: ContractDocumentStorage;
  uuid?: string;
  path?: string;
}

export type ContractDocumentAvailabilityStatus = "available" | "unavailable" | "unchecked";

export interface ContractDocumentAvailability {
  status: ContractDocumentAvailabilityStatus;
  code?: "DOCUMENT UNAVAILABLE";
  message?: string;
}

export interface EthernumContractPrincipal {
  kind: EthernumContractPrincipalKind;
  id: string;
}

export interface EthernumContractVisibility {
  mode: "all" | "restricted" | "gm";
  minimumRank?: number;
  allowedRanks?: number[];
  grants?: EthernumContractPrincipal[];
}

export interface EthernumContractAttachment {
  id: string;
  label: string;
  kind: EthernumContractDocumentKind;
  category: EthernumContractAttachmentCategory;
  description?: string;
  document?: ContractStoredDocument;
  uuid?: string;
  path?: string;
  content?: string;
  pageCount?: number;
  permissionUuid?: string;
  publicAsset?: boolean;
  visibility?: EthernumContractVisibility;
  informationRequired?: number;
  [key: string]: unknown;
}

export interface EthernumContractRecord {
  version: number;
  revision: number;
  id: string;
  number: number;
  title: string;
  status: EthernumContractStatus;
  location?: string;
  region?: string;
  difficulty?: string;
  grade?: string;
  supervisor?: string;
  coverImage?: string;
  reportDocument?: ContractStoredDocument;
  journalUuid?: string;
  pdfPath?: string;
  pdfPageCount?: number;
  publicAsset?: boolean;
  informationFound?: number;
  informationTotal?: number;
  attachments: EthernumContractAttachment[];
  rewards?: string[];
  visibility: EthernumContractVisibility;
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown;
}

export interface ContractArchiveData {
  schemaVersion: number;
  revision: number;
  contracts: EthernumContractRecord[];
  migration?: {
    legacyJournalImport?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ContractArchiveViewerContext {
  userId: string;
  isGM: boolean;
  actorId?: string;
  rank?: number;
  squadIds: readonly string[];
}

export interface ContractDocumentReference {
  id: string;
  label: string;
  kind: EthernumContractDocumentKind;
  category: EthernumContractAttachmentCategory | "report";
  description?: string;
  icon: string;
}

export interface EthernumContractDTO {
  id: string;
  number: number;
  title: string;
  status: EthernumContractStatus;
  statusLabel: string;
  location?: string;
  region?: string;
  difficulty?: string;
  grade?: string;
  supervisor?: string;
  coverImage?: string;
  informationFound?: number;
  informationTotal?: number;
  informationLabel?: string;
  report?: ContractDocumentReference;
  attachments: ContractDocumentReference[];
  dossiers: ContractDocumentReference[];
  rewards: string[];
}

export interface ContractArchiveSnapshot {
  schemaVersion: number;
  revision: number;
  contracts: EthernumContractDTO[];
}

export interface CommunicatorDocumentTarget {
  contractId: string;
  attachmentId: string;
  label: string;
  kind: EthernumContractDocumentKind;
  category: EthernumContractAttachmentCategory | "report";
  description?: string;
  document?: ContractStoredDocument;
  availability?: ContractDocumentAvailability;
  sourceUrl?: string;
  uuid?: string;
  content?: string;
  pageCount?: number;
}

export interface ContractArchiveMutationOptions {
  expectedRevision?: number;
}

export interface ContractArchiveCompleteOptions extends ContractArchiveMutationOptions {
  grade?: string;
}

export interface ContractDocumentMigrationRequest extends ContractArchiveMutationOptions {
  contractId: string;
  attachmentId?: string;
  selectedPath: string;
}
