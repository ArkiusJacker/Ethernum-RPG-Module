export const COMPANY_REWARD_SCHEMA_VERSION = 1;

export type CompanyRewardState =
  | "received"
  | "granting"
  | "granted"
  | "completed"
  | "compensating"
  | "rolledBack"
  | "recoveryRequired";

export interface CompanyRewardGrantInput {
  transactionId: string;
  actorUuid: string;
  contractId?: string;
  itemUuid?: string;
  currency?: string;
  xpMetadata?: number;
  epMetadata?: number;
  commendation?: string;
  note?: string;
}

export interface CompanyRewardRecord extends CompanyRewardGrantInput {
  state: CompanyRewardState;
  actorName?: string;
  itemName?: string;
  createdItemIds: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
  recoveryNotes?: string[];
}

export interface CompanyRewardData {
  schemaVersion: number;
  revision: number;
  rewards: CompanyRewardRecord[];
}

export interface CompanyRewardResult {
  transactionId: string;
  actorName: string;
  itemName?: string;
  currency?: string;
  xpMetadata: number;
  epMetadata: number;
  commendation?: string;
  state: "completed" | "rolledBack" | "recoveryRequired";
}
