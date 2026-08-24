import { ETHERNUM } from "../../config.js";
import type {
  LootApplicationData,
  LootApplicationRecord,
  LootApplicationState,
  LootManifest,
} from "./LootGeneratorTypes.js";

export const LOOT_APPLICATION_SCHEMA_VERSION = 1;
export const LOOT_APPLICATION_ADMIN_FLAG = "lootApplicationRepository";
export const LOOT_APPLICATION_DATA_FLAG = "lootApplicationData";
export const LOOT_APPLICATION_ADMIN_NAME = "[Ethernum] Ledger Administrativo de Loot";
const STATES = new Set<LootApplicationState>(["received", "granting", "completed", "compensating", "rolledBack", "recoveryRequired"]);

interface LootJournal {
  getFlag?: (scope: string, key: string) => unknown;
  update?: (changes: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
}

export interface LootApplicationRepositoryDependencies {
  currentUser: () => { isGM?: boolean } | null;
  journals: () => Iterable<LootJournal>;
  createJournal: (data: Record<string, unknown>, options?: Record<string, unknown>) => Promise<LootJournal | null>;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, maximum = 500): string { return typeof value === "string" ? value.trim().slice(0, maximum) : ""; }
function integer(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0; }
function collection<T>(value: unknown): T[] { return value && typeof (value as Iterable<T>)[Symbol.iterator] === "function" ? Array.from(value as Iterable<T>) : []; }

function normalizeRecord(value: unknown): LootApplicationRecord | null {
  const input = record(value);
  const applicationId = text(input.applicationId, 160);
  const actorUuid = text(input.actorUuid, 300);
  const manifest = record(input.manifest);
  if (!applicationId || !actorUuid || !text(manifest.manifestId, 160) || !Array.isArray(manifest.items)) return null;
  return {
    applicationId,
    actorUuid,
    manifest: input.manifest as LootManifest,
    actorName: text(input.actorName, 180) || actorUuid,
    state: STATES.has(input.state as LootApplicationState) ? input.state as LootApplicationState : "recoveryRequired",
    createdItemIds: Array.isArray(input.createdItemIds) ? input.createdItemIds.map(value => text(value, 160)).filter(Boolean).slice(0, 200) : [],
    currencyGranted: input.currencyGranted === true,
    createdAt: integer(input.createdAt),
    updatedAt: integer(input.updatedAt),
    ...(input.completedAt === undefined ? {} : { completedAt: integer(input.completedAt) }),
    ...(text(input.error, 1_000) ? { error: text(input.error, 1_000) } : {}),
    ...(Array.isArray(input.recoveryNotes) ? { recoveryNotes: input.recoveryNotes.map(value => text(value, 500)).filter(Boolean).slice(0, 20) } : {}),
  };
}

export function normalizeLootApplicationData(value: unknown): LootApplicationData {
  const input = record(value);
  const applications = (Array.isArray(input.applications) ? input.applications : [])
    .map(normalizeRecord).filter((entry): entry is LootApplicationRecord => Boolean(entry)).slice(-200);
  return { schemaVersion: LOOT_APPLICATION_SCHEMA_VERSION, revision: integer(input.revision), applications };
}

function defaults(): LootApplicationRepositoryDependencies {
  return {
    currentUser: () => game.user ?? null,
    journals: () => collection<LootJournal>((game as Game & { journal?: Iterable<LootJournal> }).journal),
    createJournal: async (data, options) => {
      type JournalClass = { create?: (source: Record<string, unknown>, createOptions?: Record<string, unknown>) => Promise<LootJournal | null> };
      const globals = globalThis as typeof globalThis & { JournalEntry?: JournalClass; CONFIG?: { JournalEntry?: { documentClass?: JournalClass } } };
      const documentClass = globals.CONFIG?.JournalEntry?.documentClass ?? globals.JournalEntry;
      return documentClass?.create ? documentClass.create.call(documentClass, data, options) : null;
    },
  };
}

export class LootApplicationRepository {
  private readonly dependencies: LootApplicationRepositoryDependencies;
  private tail: Promise<void> = Promise.resolve();
  constructor(dependencies: Partial<LootApplicationRepositoryDependencies> = {}) { this.dependencies = { ...defaults(), ...dependencies }; }

  async initialize(): Promise<LootApplicationData> {
    if (!this.dependencies.currentUser()?.isGM) return normalizeLootApplicationData({});
    const data = await this.read();
    await this.write(data);
    return data;
  }
  async read(): Promise<LootApplicationData> {
    this.assertGM();
    return normalizeLootApplicationData(this.find()?.getFlag?.(ETHERNUM.MODULE_NAME, LOOT_APPLICATION_DATA_FLAG));
  }
  async write(value: unknown): Promise<LootApplicationData> {
    this.assertGM();
    return this.lock(async () => {
      const data = normalizeLootApplicationData(value);
      const journal = this.find() ?? await this.create(data);
      if (!journal.update) throw new Error("O ledger de loot não pode ser atualizado.");
      await journal.update({
        name: LOOT_APPLICATION_ADMIN_NAME,
        ownership: { default: 0 },
        [`flags.${ETHERNUM.MODULE_NAME}.${LOOT_APPLICATION_ADMIN_FLAG}`]: { schemaVersion: LOOT_APPLICATION_SCHEMA_VERSION },
        [`flags.${ETHERNUM.MODULE_NAME}.${LOOT_APPLICATION_DATA_FLAG}`]: data,
      }, { render: false });
      return data;
    });
  }

  private find(): LootJournal | null {
    return collection<LootJournal>(this.dependencies.journals()).find(journal =>
      Number(record(journal.getFlag?.(ETHERNUM.MODULE_NAME, LOOT_APPLICATION_ADMIN_FLAG)).schemaVersion) === LOOT_APPLICATION_SCHEMA_VERSION,
    ) ?? null;
  }
  private async create(data: LootApplicationData): Promise<LootJournal> {
    const journal = await this.dependencies.createJournal({
      name: LOOT_APPLICATION_ADMIN_NAME,
      ownership: { default: 0 },
      flags: { [ETHERNUM.MODULE_NAME]: {
        [LOOT_APPLICATION_ADMIN_FLAG]: { schemaVersion: LOOT_APPLICATION_SCHEMA_VERSION },
        [LOOT_APPLICATION_DATA_FLAG]: data,
      } },
    }, { renderSheet: false });
    if (!journal) throw new Error("Não foi possível criar o ledger de loot.");
    return journal;
  }
  private assertGM(): void { if (!this.dependencies.currentUser()?.isGM) throw new Error("Somente o Gamemaster pode acessar o ledger de loot."); }
  private async lock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.tail; let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    await previous; try { return await operation(); } finally { release(); }
  }
}
