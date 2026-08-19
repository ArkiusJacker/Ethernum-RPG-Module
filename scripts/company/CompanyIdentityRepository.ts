import { ETHERNUM } from "../config.js";
import {
  COMPANY_IDENTITY_SCHEMA_VERSION,
  type CompanyIdentityData,
  type CompanyIdentityRecord,
} from "./CompanyIdentityTypes.js";

export const COMPANY_IDENTITY_ADMIN_FLAG = "companyIdentityRepository";
export const COMPANY_IDENTITY_DATA_FLAG = "companyIdentityData";
export const COMPANY_IDENTITY_PROJECTION_FLAG = "companyIdentityProjection";
export const COMPANY_IDENTITY_ADMIN_NAME = "[Ethernum] Identidades Administrativas da Companhia";
const NONE_PERMISSION = 0;
const OBSERVER_PERMISSION = 2;

interface IdentityUser { id?: string | null; name?: string | null; isGM?: boolean; character?: Actor | null }
interface IdentityJournal {
  id?: string | null;
  name?: string | null;
  ownership?: Record<string, number>;
  getFlag?: (scope: string, key: string) => unknown;
  update?: (changes: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  delete?: (options?: Record<string, unknown>) => Promise<unknown>;
}

export interface CompanyIdentityRepositoryDependencies {
  currentUser: () => IdentityUser | null;
  users: () => Iterable<IdentityUser>;
  journals: () => Iterable<IdentityJournal>;
  createJournal: (data: Record<string, unknown>, options?: Record<string, unknown>) => Promise<IdentityJournal | null>;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, maximum = 180): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maximum) : undefined;
}

function integer(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : undefined;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.flatMap(entry => text(entry, 120) ? [text(entry, 120)!] : []))).slice(0, 40);
}

function collection<T>(value: unknown): T[] {
  if (!value || typeof (value as Iterable<T>)[Symbol.iterator] !== "function") return [];
  return Array.from(value as Iterable<T>);
}

function getFlag(document: IdentityJournal, key: string): unknown {
  try { return document.getFlag?.(ETHERNUM.MODULE_NAME, key); } catch { return undefined; }
}

export function normalizeCompanyIdentityRecord(value: unknown, actorUuid = ""): CompanyIdentityRecord | null {
  const input = record(value);
  const uuid = text(input.actorUuid, 300) ?? text(actorUuid, 300);
  if (!uuid) return null;
  const rank = integer(input.rank);
  return {
    actorUuid: uuid,
    ...(text(input.codename) ? { codename: text(input.codename) } : {}),
    ...(rank === undefined ? {} : { rank }),
    ...(text(input.squad) ? { squad: text(input.squad) } : {}),
    squadIds: strings(input.squadIds),
    ...(text(input.department) ? { department: text(input.department) } : {}),
    ...(text(input.operationalStatus) ? { operationalStatus: text(input.operationalStatus) } : {}),
    revision: integer(input.revision) ?? 0,
    updatedAt: integer(input.updatedAt) ?? 0,
  };
}

export function normalizeCompanyIdentityData(value: unknown): CompanyIdentityData {
  const input = record(value);
  const identities = Object.fromEntries(Object.entries(record(input.identities)).flatMap(([uuid, candidate]) => {
    const identity = normalizeCompanyIdentityRecord(candidate, uuid);
    return identity ? [[identity.actorUuid, identity]] : [];
  }));
  return {
    schemaVersion: COMPANY_IDENTITY_SCHEMA_VERSION,
    revision: integer(input.revision) ?? 0,
    identities,
    migration: { ...record(input.migration) },
  };
}

function defaults(): CompanyIdentityRepositoryDependencies {
  return {
    currentUser: () => game.user as unknown as IdentityUser | null,
    users: () => collection<IdentityUser>(game.users),
    journals: () => collection<IdentityJournal>((game as Game & { journal?: Iterable<IdentityJournal> }).journal),
    createJournal: async (data, options) => {
      type JournalClass = { create?: (source: Record<string, unknown>, createOptions?: Record<string, unknown>) => Promise<IdentityJournal | null> };
      const globals = globalThis as typeof globalThis & { JournalEntry?: JournalClass; CONFIG?: { JournalEntry?: { documentClass?: JournalClass } } };
      const documentClass = globals.CONFIG?.JournalEntry?.documentClass ?? globals.JournalEntry;
      return documentClass?.create ? documentClass.create.call(documentClass, data, options) : null;
    },
  };
}

export class CompanyIdentityRepository {
  private readonly dependencies: CompanyIdentityRepositoryDependencies;
  private tail: Promise<void> = Promise.resolve();

  constructor(dependencies: Partial<CompanyIdentityRepositoryDependencies> = {}) {
    this.dependencies = { ...defaults(), ...dependencies };
  }

  async initialize(): Promise<CompanyIdentityData> {
    if (!this.dependencies.currentUser()?.isGM) return normalizeCompanyIdentityData({});
    const journal = this.findAdmin() ?? await this.createAdmin(normalizeCompanyIdentityData({}));
    const data = normalizeCompanyIdentityData(getFlag(journal, COMPANY_IDENTITY_DATA_FLAG));
    await this.write(data);
    return data;
  }

  async read(): Promise<CompanyIdentityData> {
    this.assertGM();
    const journal = this.findAdmin();
    return normalizeCompanyIdentityData(journal ? getFlag(journal, COMPANY_IDENTITY_DATA_FLAG) : {});
  }

  async write(value: unknown): Promise<CompanyIdentityData> {
    this.assertGM();
    return this.lock(async () => {
      const data = normalizeCompanyIdentityData(value);
      const journal = this.findAdmin() ?? await this.createAdmin(data);
      if (!journal.update) throw new Error("O arquivo de identidades não pode ser atualizado.");
      await journal.update({
        name: COMPANY_IDENTITY_ADMIN_NAME,
        ownership: { default: NONE_PERMISSION },
        [`flags.${ETHERNUM.MODULE_NAME}.${COMPANY_IDENTITY_ADMIN_FLAG}`]: { schemaVersion: COMPANY_IDENTITY_SCHEMA_VERSION },
        [`flags.${ETHERNUM.MODULE_NAME}.${COMPANY_IDENTITY_DATA_FLAG}`]: data,
      }, { render: false });
      return data;
    });
  }

  readProjection(actorUuid: string, user = this.dependencies.currentUser()): CompanyIdentityRecord | null {
    const userId = text(user?.id, 140);
    if (!userId) return null;
    for (const journal of this.projections()) {
      const payload = record(getFlag(journal, COMPANY_IDENTITY_PROJECTION_FLAG));
      if (payload.userId !== userId) continue;
      return normalizeCompanyIdentityRecord(payload.identity, actorUuid);
    }
    return null;
  }

  async synchronizeProjections(data: CompanyIdentityData): Promise<void> {
    this.assertGM();
    const users = collection<IdentityUser>(this.dependencies.users()).filter(user => !user.isGM && user.id && user.character?.uuid);
    const existing = this.projections();
    const keep = new Set<IdentityJournal>();
    for (const user of users) {
      const userId = text(user.id, 140)!;
      const actorUuid = text(user.character?.uuid, 300)!;
      const identity = data.identities[actorUuid];
      const payload = { schemaVersion: COMPANY_IDENTITY_SCHEMA_VERSION, userId, actorUuid, identity: identity ?? null };
      const ownership = { default: NONE_PERMISSION, [userId]: OBSERVER_PERMISSION };
      const candidate = existing.find(journal => record(getFlag(journal, COMPANY_IDENTITY_PROJECTION_FLAG)).userId === userId);
      if (candidate?.update) {
        keep.add(candidate);
        await candidate.update({
          name: `[Ethernum] Identidade da Companhia - ${text(user.name) ?? userId}`,
          ownership,
          [`flags.${ETHERNUM.MODULE_NAME}.${COMPANY_IDENTITY_PROJECTION_FLAG}`]: payload,
        }, { render: false });
      } else {
        const created = await this.dependencies.createJournal({
          name: `[Ethernum] Identidade da Companhia - ${text(user.name) ?? userId}`,
          ownership,
          flags: { [ETHERNUM.MODULE_NAME]: { [COMPANY_IDENTITY_PROJECTION_FLAG]: payload } },
        }, { renderSheet: false });
        if (created) keep.add(created);
      }
    }
    for (const journal of existing) if (!keep.has(journal)) await journal.delete?.({ render: false });
  }

  private findAdmin(): IdentityJournal | null {
    return collection<IdentityJournal>(this.dependencies.journals()).find(journal => {
      const marker = record(getFlag(journal, COMPANY_IDENTITY_ADMIN_FLAG));
      return Number(marker.schemaVersion) === COMPANY_IDENTITY_SCHEMA_VERSION;
    }) ?? null;
  }

  private projections(): IdentityJournal[] {
    return collection<IdentityJournal>(this.dependencies.journals()).filter(journal => {
      const payload = record(getFlag(journal, COMPANY_IDENTITY_PROJECTION_FLAG));
      return Boolean(payload.userId);
    });
  }

  private async createAdmin(data: CompanyIdentityData): Promise<IdentityJournal> {
    const journal = await this.dependencies.createJournal({
      name: COMPANY_IDENTITY_ADMIN_NAME,
      ownership: { default: NONE_PERMISSION },
      flags: { [ETHERNUM.MODULE_NAME]: {
        [COMPANY_IDENTITY_ADMIN_FLAG]: { schemaVersion: COMPANY_IDENTITY_SCHEMA_VERSION },
        [COMPANY_IDENTITY_DATA_FLAG]: data,
      } },
    }, { renderSheet: false });
    if (!journal) throw new Error("Não foi possível criar o arquivo de identidades da Companhia.");
    return journal;
  }

  private assertGM(): void {
    if (!this.dependencies.currentUser()?.isGM) throw new Error("Somente o Gamemaster pode acessar identidades administrativas.");
  }

  private async lock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try { return await operation(); } finally { release(); }
  }
}
