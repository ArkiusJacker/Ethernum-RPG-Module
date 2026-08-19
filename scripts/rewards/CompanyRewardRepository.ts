import { ETHERNUM } from "../config.js";
import {
  COMPANY_REWARD_SCHEMA_VERSION,
  type CompanyRewardData,
  type CompanyRewardRecord,
  type CompanyRewardState,
} from "./CompanyRewardTypes.js";

export const COMPANY_REWARD_ADMIN_FLAG = "companyRewardRepository";
export const COMPANY_REWARD_DATA_FLAG = "companyRewardData";
export const COMPANY_REWARD_ADMIN_NAME = "[Ethernum] Ledger Administrativo de Recompensas";
const NONE_PERMISSION = 0;
const STATES = new Set<CompanyRewardState>(["received", "granting", "granted", "completed", "compensating", "rolledBack", "recoveryRequired"]);

interface RewardJournal {
  id?: string | null;
  getFlag?: (scope: string, key: string) => unknown;
  update?: (changes: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
}

export interface CompanyRewardRepositoryDependencies {
  currentUser: () => { isGM?: boolean } | null;
  journals: () => Iterable<RewardJournal>;
  createJournal: (data: Record<string, unknown>, options?: Record<string, unknown>) => Promise<RewardJournal | null>;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, max = 500): string { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function integer(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0; }
function collection<T>(value: unknown): T[] { return value && typeof (value as Iterable<T>)[Symbol.iterator] === "function" ? Array.from(value as Iterable<T>) : []; }

function normalizeRecord(value: unknown): CompanyRewardRecord | null {
  const input = record(value);
  const transactionId = text(input.transactionId, 160);
  const actorUuid = text(input.actorUuid, 300);
  if (!transactionId || !actorUuid) return null;
  const state = STATES.has(input.state as CompanyRewardState) ? input.state as CompanyRewardState : "recoveryRequired";
  return {
    transactionId,
    actorUuid,
    ...(text(input.contractId, 160) ? { contractId: text(input.contractId, 160) } : {}),
    ...(text(input.itemUuid, 300) ? { itemUuid: text(input.itemUuid, 300) } : {}),
    ...(text(input.currency, 80) ? { currency: text(input.currency, 80) } : {}),
    ...(input.xpMetadata === undefined ? {} : { xpMetadata: integer(input.xpMetadata) }),
    ...(input.epMetadata === undefined ? {} : { epMetadata: integer(input.epMetadata) }),
    ...(text(input.commendation, 240) ? { commendation: text(input.commendation, 240) } : {}),
    ...(text(input.note, 1_000) ? { note: text(input.note, 1_000) } : {}),
    state,
    ...(text(input.actorName, 180) ? { actorName: text(input.actorName, 180) } : {}),
    ...(text(input.itemName, 240) ? { itemName: text(input.itemName, 240) } : {}),
    createdItemIds: Array.isArray(input.createdItemIds) ? input.createdItemIds.map(value => text(value, 160)).filter(Boolean).slice(0, 30) : [],
    createdAt: integer(input.createdAt),
    updatedAt: integer(input.updatedAt),
    ...(input.completedAt === undefined ? {} : { completedAt: integer(input.completedAt) }),
    ...(text(input.error, 1_000) ? { error: text(input.error, 1_000) } : {}),
    ...(Array.isArray(input.recoveryNotes) ? { recoveryNotes: input.recoveryNotes.map(value => text(value, 500)).filter(Boolean).slice(0, 20) } : {}),
  };
}

export function normalizeCompanyRewardData(value: unknown): CompanyRewardData {
  const input = record(value);
  const rewards = (Array.isArray(input.rewards) ? input.rewards : []).map(normalizeRecord).filter((entry): entry is CompanyRewardRecord => Boolean(entry));
  return { schemaVersion: COMPANY_REWARD_SCHEMA_VERSION, revision: integer(input.revision), rewards: rewards.slice(-500) };
}

function defaults(): CompanyRewardRepositoryDependencies {
  return {
    currentUser: () => game.user ?? null,
    journals: () => collection<RewardJournal>((game as Game & { journal?: Iterable<RewardJournal> }).journal),
    createJournal: async (data, options) => {
      type JournalClass = { create?: (source: Record<string, unknown>, createOptions?: Record<string, unknown>) => Promise<RewardJournal | null> };
      const globals = globalThis as typeof globalThis & { JournalEntry?: JournalClass; CONFIG?: { JournalEntry?: { documentClass?: JournalClass } } };
      const documentClass = globals.CONFIG?.JournalEntry?.documentClass ?? globals.JournalEntry;
      return documentClass?.create ? documentClass.create.call(documentClass, data, options) : null;
    },
  };
}

export class CompanyRewardRepository {
  private readonly dependencies: CompanyRewardRepositoryDependencies;
  private tail: Promise<void> = Promise.resolve();
  constructor(dependencies: Partial<CompanyRewardRepositoryDependencies> = {}) { this.dependencies = { ...defaults(), ...dependencies }; }

  async initialize(): Promise<CompanyRewardData> {
    if (!this.dependencies.currentUser()?.isGM) return normalizeCompanyRewardData({});
    const data = await this.read();
    await this.write(data);
    return data;
  }

  async read(): Promise<CompanyRewardData> {
    this.assertGM();
    const journal = this.find();
    return normalizeCompanyRewardData(journal?.getFlag?.(ETHERNUM.MODULE_NAME, COMPANY_REWARD_DATA_FLAG));
  }

  async write(value: unknown): Promise<CompanyRewardData> {
    this.assertGM();
    return this.lock(async () => {
      const data = normalizeCompanyRewardData(value);
      const journal = this.find() ?? await this.create(data);
      if (!journal.update) throw new Error("O ledger de recompensas não pode ser atualizado.");
      await journal.update({
        name: COMPANY_REWARD_ADMIN_NAME,
        ownership: { default: NONE_PERMISSION },
        [`flags.${ETHERNUM.MODULE_NAME}.${COMPANY_REWARD_ADMIN_FLAG}`]: { schemaVersion: COMPANY_REWARD_SCHEMA_VERSION },
        [`flags.${ETHERNUM.MODULE_NAME}.${COMPANY_REWARD_DATA_FLAG}`]: data,
      }, { render: false });
      return data;
    });
  }

  private find(): RewardJournal | null {
    return collection<RewardJournal>(this.dependencies.journals()).find(journal => Number(record(journal.getFlag?.(ETHERNUM.MODULE_NAME, COMPANY_REWARD_ADMIN_FLAG)).schemaVersion) === COMPANY_REWARD_SCHEMA_VERSION) ?? null;
  }
  private async create(data: CompanyRewardData): Promise<RewardJournal> {
    const journal = await this.dependencies.createJournal({
      name: COMPANY_REWARD_ADMIN_NAME,
      ownership: { default: NONE_PERMISSION },
      flags: { [ETHERNUM.MODULE_NAME]: {
        [COMPANY_REWARD_ADMIN_FLAG]: { schemaVersion: COMPANY_REWARD_SCHEMA_VERSION },
        [COMPANY_REWARD_DATA_FLAG]: data,
      } },
    }, { renderSheet: false });
    if (!journal) throw new Error("Não foi possível criar o ledger de recompensas.");
    return journal;
  }
  private assertGM(): void { if (!this.dependencies.currentUser()?.isGM) throw new Error("Somente o Gamemaster pode acessar recompensas administrativas."); }
  private async lock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.tail; let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    await previous; try { return await operation(); } finally { release(); }
  }
}
