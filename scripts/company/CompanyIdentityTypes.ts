export const COMPANY_IDENTITY_SCHEMA_VERSION = 1;

export interface CompanyIdentityRecord {
  actorUuid: string;
  codename?: string;
  rank?: number;
  squad?: string;
  squadIds: string[];
  department?: string;
  operationalStatus?: string;
  revision: number;
  updatedAt: number;
}

export interface CompanyIdentityData {
  schemaVersion: number;
  revision: number;
  identities: Record<string, CompanyIdentityRecord>;
  migration?: { actorFlagsImportedAt?: number };
}

export interface CompanyIdentityMutationOptions {
  expectedRevision?: number;
}
