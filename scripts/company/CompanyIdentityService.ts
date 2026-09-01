import { ETHERNUM } from "../config.js";
import { AutomationAuthority } from "../core/AutomationAuthority.js";
import {
  CompanyIdentityRepository,
  normalizeCompanyIdentityRecord,
  projectCompanySquadMembers,
} from "./CompanyIdentityRepository.js";
import type {
  CompanyIdentityData,
  CompanyIdentityMutationOptions,
  CompanyIdentityRecord,
  CompanySquadMemberProjection,
} from "./CompanyIdentityTypes.js";
import { createProjectionSyncScheduler } from "./ProjectionSyncScheduler.js";

export interface CompanyIdentitySnapshot {
  codename?: string;
  rank?: number;
  squad?: string;
  squadIds: string[];
  department?: string;
  operationalStatus?: string;
}

const repository = new CompanyIdentityRepository();
const authoritative = new Map<string, CompanyIdentityRecord>();
let mutationTail: Promise<void> = Promise.resolve();

async function withIdentityMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = mutationTail;
  let release!: () => void;
  mutationTail = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try { return await operation(); } finally { release(); }
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
  const actorUuid = text(actor?.uuid);
  const secure = actorUuid ? authoritative.get(actorUuid) ?? repository.readProjection(actorUuid) : null;
  if (secure) {
    return {
      ...(secure.codename ? { codename: secure.codename } : {}),
      ...(secure.rank === undefined ? {} : { rank: secure.rank }),
      ...(secure.squad ? { squad: secure.squad } : {}),
      squadIds: [...secure.squadIds],
      ...(secure.department ? { department: secure.department } : {}),
      ...(secure.operationalStatus ? { operationalStatus: secure.operationalStatus } : {}),
    };
  }
  if (actorUuid && !game.user?.isGM) return { squadIds: [] };
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

function cache(data: CompanyIdentityData): void {
  authoritative.clear();
  for (const identity of Object.values(data.identities)) authoritative.set(identity.actorUuid, identity);
}

async function initializeCompanyIdentityService(): Promise<void> {
  if (!AutomationAuthority.isPrimaryGM()) return;
  let data = await repository.initialize();
  if (!data.migration?.actorFlagsImportedAt) {
    const identities = { ...data.identities };
    for (const actor of Array.from(game.actors ?? []) as Actor[]) {
      if ((actor.type as string) !== "character" || !actor.uuid || identities[actor.uuid]) continue;
      const legacy = resolveCompanyIdentity(actor);
      const normalized = normalizeCompanyIdentityRecord({ ...legacy, actorUuid: actor.uuid, revision: 1, updatedAt: Date.now() });
      if (normalized) identities[actor.uuid] = normalized;
    }
    data = await repository.write({
      ...data,
      revision: data.revision + 1,
      identities,
      migration: { ...data.migration, actorFlagsImportedAt: Date.now() },
    });
  }
  cache(data);
  await repository.synchronizeProjections(data);
}

const projectionSyncScheduler = createProjectionSyncScheduler({
  isAuthoritative: () => AutomationAuthority.isPrimaryGM(),
  synchronize: () => repository.read().then(data => {
      cache(data);
      return repository.synchronizeProjections(data);
    }),
  onError: error => console.error(`${ETHERNUM.MODULE_NAME} | Company identity projection sync`, error),
});

function scheduleCompanyIdentityProjectionSync(delayMs = 150): void {
  projectionSyncScheduler.schedule(delayMs);
}

async function updateCompanyIdentity(
  actorUuid: string,
  input: Partial<CompanyIdentitySnapshot>,
  options: CompanyIdentityMutationOptions = {},
): Promise<CompanyIdentityRecord> {
  if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode atualizar identidades da Companhia.");
  return withIdentityMutationLock(async () => {
    const data = await repository.read();
    if (options.expectedRevision !== undefined && options.expectedRevision !== data.revision) {
      throw new Error("As identidades foram atualizadas por outro mestre. Recarregue antes de tentar novamente.");
    }
    const previous = data.identities[actorUuid];
    const normalized = normalizeCompanyIdentityRecord({
      ...previous,
      ...input,
      actorUuid,
      revision: (previous?.revision ?? 0) + 1,
      updatedAt: Date.now(),
    });
    if (!normalized) throw new Error("Identidade da Companhia inválida.");
    const next = await repository.write({
      ...data,
      revision: data.revision + 1,
      identities: { ...data.identities, [actorUuid]: normalized },
    });
    cache(next);
    await repository.synchronizeProjections(next);
    const actor = await fromUuid(actorUuid as Parameters<typeof fromUuid>[0]) as Actor | null;
    await actor?.setFlag?.(ETHERNUM.MODULE_NAME, "companyIdentity", {
      schemaVersion: 1,
      codename: normalized.codename,
      rank: normalized.rank,
      squad: normalized.squad,
      squadIds: normalized.squadIds,
      department: normalized.department,
      operationalStatus: normalized.operationalStatus,
    });
    return normalized;
  });
}

async function listCompanyIdentities(): Promise<CompanyIdentityData> {
  if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode consultar identidades administrativas.");
  const data = await repository.read();
  cache(data);
  return data;
}

async function listCompanySquadMembers(actor: Actor | null): Promise<CompanySquadMemberProjection[]> {
  const actorUuid = text(actor?.uuid);
  if (!actorUuid) return [];
  if (!game.user?.isGM) return repository.readSquadProjection();
  const data = await repository.read();
  cache(data);
  return projectCompanySquadMembers(data, Array.from(game.users ?? []), actorUuid);
}

export const CompanyIdentityService = Object.freeze({
  initialize: initializeCompanyIdentityService,
  scheduleProjectionSync: scheduleCompanyIdentityProjectionSync,
  resolve: resolveCompanyIdentity,
  update: updateCompanyIdentity,
  list: listCompanyIdentities,
  squadMembers: listCompanySquadMembers,
});
