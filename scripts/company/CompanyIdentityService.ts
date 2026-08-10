import { ETHERNUM } from "../config.js";

export interface CompanyIdentitySnapshot {
  codename?: string;
  rank?: number;
  squad?: string;
  squadIds: string[];
  department?: string;
  operationalStatus?: string;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function rank(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value === "" || value === null || value === undefined) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
  }
  return undefined;
}

function moduleFlag(actor: Actor | null, key: string): unknown {
  if (!actor) return undefined;
  try {
    return actor.getFlag(ETHERNUM.MODULE_NAME, key);
  } catch {
    return record(record(actor).flags)[ETHERNUM.MODULE_NAME]
      ? record(record(record(actor).flags)[ETHERNUM.MODULE_NAME])[key]
      : undefined;
  }
}

function stringList(...values: unknown[]): string[] {
  const flattened = values.flatMap(value => Array.isArray(value) ? value : [value]);
  return Array.from(new Set(flattened.flatMap(value => text(value) ? [text(value)!] : [])));
}

export function resolveCompanyIdentity(actor: Actor | null): CompanyIdentitySnapshot {
  const identity = record(moduleFlag(actor, "companyIdentity"));
  const communicator = record(moduleFlag(actor, "fieldCommunicator"));
  const profile = record(moduleFlag(actor, "companyProfile"));
  const company = record(moduleFlag(actor, "company"));
  const squadProfile = record(moduleFlag(actor, "squad"));
  const squadIds = stringList(
    identity.squadIds,
    identity.squadId,
    communicator.squadIds,
    communicator.squadId,
    profile.squadIds,
    profile.squadId,
  );
  const squad = text(identity.squad, communicator.squad, profile.squad, squadProfile.name, squadIds.join(", "));
  const companyRank = rank(
    identity.rank,
    moduleFlag(actor, "companyRank"),
    communicator.rank,
    profile.rank,
    company.rank,
    squadProfile.rank,
    moduleFlag(actor, "squadRank"),
  );
  return {
    codename: text(identity.codename, communicator.codename, profile.codename, moduleFlag(actor, "codename")),
    ...(companyRank === undefined ? {} : { rank: companyRank }),
    ...(squad ? { squad } : {}),
    squadIds,
    department: text(identity.department, communicator.department, profile.department),
    operationalStatus: text(
      identity.operationalStatus,
      identity.status,
      communicator.operationalStatus,
      profile.operationalStatus,
    ),
  };
}

export const CompanyIdentityService = Object.freeze({ resolve: resolveCompanyIdentity });
