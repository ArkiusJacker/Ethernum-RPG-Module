import { ETHERNUM } from "../config.js";
import {
  createDefaultCompanyStoreData,
  normalizeCoins,
  normalizeCompanyStoreData,
} from "./CompanyStoreModel.js";
import {
  COMPANY_STORE_SCHEMA_VERSION,
  COMPANY_STORE_TRANSACTION_MODES,
  type CompanyStoreAuthorizationCode,
  type CompanyStoreData,
  type CompanyStoreItemDTO,
  type CompanyStoreSnapshot,
} from "./CompanyStoreTypes.js";

export const COMPANY_STORE_ADMIN_MARKER_FLAG = "companyStoreRepository";
export const COMPANY_STORE_DATA_FLAG = "companyStoreData";
export const COMPANY_STORE_PROJECTION_FLAG = "companyStoreProjection";
export const COMPANY_STORE_ADMIN_NAME = "[Ethernum] Administração da Loja da Companhia";
export const COMPANY_STORE_PROJECTION_NAME_PREFIX = "[Ethernum] Loja da Companhia";

const NONE_PERMISSION = 0;
const OBSERVER_PERMISSION = 2;
const ADMINISTRATIVE_KIND = "administrative";
const PROJECTION_KIND = "projection";

export interface CompanyStoreRepositoryUser {
  id?: string | null;
  name?: string | null;
  isGM?: boolean;
  active?: boolean;
  character?: Actor | null;
}

export interface CompanyStoreRepositoryJournal {
  id?: string | null;
  name?: string | null;
  ownership?: Record<string, number>;
  getFlag?: (scope: string, key: string) => unknown;
  setFlag?: (scope: string, key: string, value: unknown) => Promise<unknown>;
  update?: (changes: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  delete?: (options?: Record<string, unknown>) => Promise<unknown>;
}

export interface CompanyStoreProjectionData {
  kind: typeof PROJECTION_KIND;
  schemaVersion: number;
  userId: string;
  snapshot: CompanyStoreSnapshot;
}

export type CompanyStoreProjectionFactory = (
  user: CompanyStoreRepositoryUser,
  administrativeData: Readonly<CompanyStoreData>,
) => CompanyStoreSnapshot | Promise<CompanyStoreSnapshot>;

export interface CompanyStoreProjectionSyncResult {
  created: number;
  updated: number;
  unchanged: number;
  deleted: number;
}

export interface CompanyStoreRepositoryDependencies {
  moduleId: string;
  currentUser: () => CompanyStoreRepositoryUser | null;
  users: () => Iterable<CompanyStoreRepositoryUser>;
  journals: () => Iterable<CompanyStoreRepositoryJournal>;
  createJournal: (
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<CompanyStoreRepositoryJournal | null>;
}

export interface CompanyStoreRepositoryLike {
  initialize(): Promise<CompanyStoreData>;
  readStore(): Promise<CompanyStoreData>;
  writeStore(data: unknown): Promise<CompanyStoreData>;
  readProjection(user?: CompanyStoreRepositoryUser | User | null): CompanyStoreSnapshot | null;
  synchronizeProjections(factory: CompanyStoreProjectionFactory): Promise<void>;
  scheduleProjectionSync(factory: CompanyStoreProjectionFactory): void;
}

type PartialRepositoryDependencies = Partial<CompanyStoreRepositoryDependencies>;

interface AdministrativeMarker {
  kind: typeof ADMINISTRATIVE_KIND;
  schemaVersion: number;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, maximum = 180): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function integer(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function collection<T>(value: unknown): T[] {
  if (!value || typeof (value as Iterable<T>)[Symbol.iterator] !== "function") return [];
  return Array.from(value as Iterable<T>);
}

function getFlag(
  document: CompanyStoreRepositoryJournal,
  moduleId: string,
  key: string,
): unknown {
  return document.getFlag?.(moduleId, key);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

function stableEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function administrativeMarker(): AdministrativeMarker {
  return { kind: ADMINISTRATIVE_KIND, schemaVersion: COMPANY_STORE_SCHEMA_VERSION };
}

function isAdministrativeMarker(value: unknown): boolean {
  const marker = record(value);
  return marker.kind === ADMINISTRATIVE_KIND
    && integer(marker.schemaVersion) === COMPANY_STORE_SCHEMA_VERSION;
}

function projectionUserId(value: unknown): string {
  const projection = record(value);
  return projection.kind === PROJECTION_KIND ? text(projection.userId, 140) : "";
}

const AUTHORIZATION_CODES = new Set<CompanyStoreAuthorizationCode>([
  "authorized", "approval", "no-actor", "currency-unavailable", "rank", "region", "flag",
  "permission", "out-of-stock", "insufficient-funds", "broken-item", "unsupported-item",
  "recovery-required",
]);

function optionalInteger(value: unknown): number | undefined {
  return Number.isFinite(Number(value)) ? integer(value) : undefined;
}

function sanitizeItem(value: unknown): CompanyStoreItemDTO | null {
  const input = record(value);
  const id = text(input.id, 140);
  const name = text(input.name, 240);
  if (!id || !name) return null;
  const mode = COMPANY_STORE_TRANSACTION_MODES.includes(input.transactionMode as "automatic" | "approval")
    ? input.transactionMode as "automatic" | "approval"
    : "approval";
  const authorizationCode = AUTHORIZATION_CODES.has(input.authorizationCode as CompanyStoreAuthorizationCode)
    ? input.authorizationCode as CompanyStoreAuthorizationCode
    : "permission";
  const level = optionalInteger(input.level);
  const stock = optionalInteger(input.stock);
  return {
    id,
    name,
    ...(text(input.image, 500) ? { image: text(input.image, 500) } : {}),
    ...(text(input.description, 2_000) ? { description: text(input.description, 2_000) } : {}),
    ...(level === undefined ? {} : { level }),
    ...(text(input.rarity, 80) ? { rarity: text(input.rarity, 80) } : {}),
    ...(text(input.rarityLabel, 120) ? { rarityLabel: text(input.rarityLabel, 120) } : {}),
    price: normalizeCoins(input.price),
    priceLabel: text(input.priceLabel, 120),
    ...(stock === undefined ? {} : { stock }),
    stockLabel: text(input.stockLabel, 120),
    transactionMode: mode,
    actionLabel: text(input.actionLabel, 120),
    authorizationCode,
    authorizationLabel: text(input.authorizationLabel, 240),
    authorized: input.authorized === true,
    affordable: input.affordable === true,
    available: input.available === true,
    featured: input.featured === true,
    quoteRevision: integer(input.quoteRevision),
    ...(input.broken === true ? { broken: true } : {}),
  };
}

/** Only resolved public DTO fields cross the administrative boundary. */
function sanitizeSnapshot(value: unknown): CompanyStoreSnapshot {
  const input = record(value);
  const balanceInput = record(input.balance);
  const balance = normalizeCoins(balanceInput);
  const denominationIds = new Set(["pp", "gp", "sp", "cp"]);
  const denominations = (Array.isArray(balanceInput.denominations) ? balanceInput.denominations : [])
    .flatMap(value => {
      const denomination = record(value);
      const id = text(denomination.id, 2);
      return denominationIds.has(id) ? [{
        id: id as "pp" | "gp" | "sp" | "cp",
        label: text(denomination.label, 40) || id.toUpperCase(),
        value: integer(denomination.value),
      }] : [];
    });
  const items = (Array.isArray(input.items) ? input.items : [])
    .map(sanitizeItem)
    .filter((item): item is CompanyStoreItemDTO => Boolean(item));
  const selectedItem = sanitizeItem(input.selectedItem);
  const state = record(input.state);
  return {
    schemaVersion: COMPANY_STORE_SCHEMA_VERSION,
    revision: integer(input.revision),
    ...(text(input.actorId, 140) ? { actorId: text(input.actorId, 140) } : {}),
    ...(text(input.actorUuid, 300) ? { actorUuid: text(input.actorUuid, 300) } : {}),
    ...(text(input.actorName, 180) ? { actorName: text(input.actorName, 180) } : {}),
    balance: {
      ...balance,
      available: balanceInput.available === true,
      label: text(balanceInput.label, 120),
      denominations,
    },
    items,
    ...(selectedItem ? { selectedItem } : {}),
    state: {
      noActor: state.noActor === true,
      currencyUnavailable: state.currencyUnavailable === true,
      empty: state.empty === true,
    },
  };
}

function normalizeProjectionData(value: unknown, expectedUserId?: string): CompanyStoreProjectionData | null {
  const input = record(value);
  const userId = text(input.userId, 140);
  if (input.kind !== PROJECTION_KIND || !userId || (expectedUserId && userId !== expectedUserId)) return null;
  return {
    kind: PROJECTION_KIND,
    schemaVersion: COMPANY_STORE_SCHEMA_VERSION,
    userId,
    snapshot: sanitizeSnapshot(input.snapshot),
  };
}

function projectionFor(
  userId: string,
  snapshot: CompanyStoreSnapshot,
): CompanyStoreProjectionData {
  return normalizeProjectionData({
    kind: PROJECTION_KIND,
    schemaVersion: COMPANY_STORE_SCHEMA_VERSION,
    userId,
    snapshot,
  }, userId)!;
}

function defaultDependencies(): CompanyStoreRepositoryDependencies {
  return {
    moduleId: ETHERNUM.MODULE_NAME,
    currentUser: () => game.user as unknown as CompanyStoreRepositoryUser | null,
    users: () => collection<CompanyStoreRepositoryUser>(game.users),
    journals: () => collection<CompanyStoreRepositoryJournal>(
      (game as Game & { journal?: Iterable<CompanyStoreRepositoryJournal> }).journal,
    ),
    createJournal: async (data, options) => {
      type JournalDocumentClass = {
          create?: (
            source: Record<string, unknown>,
            createOptions?: Record<string, unknown>,
          ) => Promise<CompanyStoreRepositoryJournal | null>;
      };
      const globals = globalThis as typeof globalThis & {
        JournalEntry?: JournalDocumentClass;
        CONFIG?: { JournalEntry?: { documentClass?: JournalDocumentClass } };
      };
      const documentClass = globals.CONFIG?.JournalEntry?.documentClass ?? globals.JournalEntry;
      return documentClass?.create ? documentClass.create.call(documentClass, data, options) : null;
    },
  };
}

export class CompanyStoreRepository implements CompanyStoreRepositoryLike {
  readonly moduleId: string;

  private readonly dependencies: CompanyStoreRepositoryDependencies;
  private operationTail: Promise<void> = Promise.resolve();
  private scheduledFactory: CompanyStoreProjectionFactory | null = null;
  private projectionSyncScheduled = false;

  constructor(dependencies: PartialRepositoryDependencies = {}) {
    this.dependencies = { ...defaultDependencies(), ...dependencies };
    this.moduleId = this.dependencies.moduleId;
  }

  async initialize(): Promise<CompanyStoreData> {
    if (!this.dependencies.currentUser()?.isGM) return createDefaultCompanyStoreData();
    const store = await this.create();
    const raw = getFlag(store, this.moduleId, COMPANY_STORE_DATA_FLAG);
    const normalized = normalizeCompanyStoreData(raw);
    if (!stableEqual(raw, normalized)) await this.writeStore(normalized);
    return normalized;
  }

  find(): CompanyStoreRepositoryJournal | null {
    this.assertGM();
    return this.findAdministrativeJournal();
  }

  async create(data: unknown = createDefaultCompanyStoreData()): Promise<CompanyStoreRepositoryJournal> {
    this.assertGM();
    return this.withLock(async () => {
      const existing = this.findAdministrativeJournal();
      if (existing) return existing;
      return this.createAdministrativeJournal(normalizeCompanyStoreData(data));
    });
  }

  async read(): Promise<CompanyStoreData> {
    this.assertGM();
    const store = this.findAdministrativeJournal();
    return normalizeCompanyStoreData(
      store ? getFlag(store, this.moduleId, COMPANY_STORE_DATA_FLAG) : createDefaultCompanyStoreData(),
    );
  }

  readStore(): Promise<CompanyStoreData> {
    return this.read();
  }

  async write(data: unknown): Promise<CompanyStoreData> {
    this.assertGM();
    return this.withLock(async () => {
      const normalized = normalizeCompanyStoreData(data);
      const store = this.findAdministrativeJournal()
        ?? await this.createAdministrativeJournal(normalized);
      await this.writeAdministrativeJournal(store, normalized);
      return normalized;
    });
  }

  writeStore(data: unknown): Promise<CompanyStoreData> {
    return this.write(data);
  }

  findProjection(userId: string): CompanyStoreRepositoryJournal | null {
    const normalizedUserId = text(userId, 140);
    if (!normalizedUserId || !this.canReadProjection(normalizedUserId)) return null;
    return this.projectionJournals()
      .filter(document => projectionUserId(getFlag(document, this.moduleId, COMPANY_STORE_PROJECTION_FLAG)) === normalizedUserId)
      .sort((left, right) => text(left.id).localeCompare(text(right.id)))[0] ?? null;
  }

  findProjections(): CompanyStoreRepositoryJournal[] {
    const current = this.dependencies.currentUser();
    if (current?.isGM) return this.projectionJournals();
    const userId = text(current?.id, 140);
    return userId ? this.projectionJournals().filter(document => (
      projectionUserId(getFlag(document, this.moduleId, COMPANY_STORE_PROJECTION_FLAG)) === userId
    )) : [];
  }

  readProjection(
    user: CompanyStoreRepositoryUser | User | null = this.dependencies.currentUser(),
  ): CompanyStoreSnapshot | null {
    const userId = text(user?.id, 140);
    const document = this.findProjection(userId);
    const projection = document
      ? normalizeProjectionData(
        getFlag(document, this.moduleId, COMPANY_STORE_PROJECTION_FLAG),
        userId,
      )
      : null;
    return projection?.snapshot ?? null;
  }

  async sync(factory: CompanyStoreProjectionFactory): Promise<CompanyStoreProjectionSyncResult> {
    this.assertGM();
    return this.withLock(async () => {
      const source = this.readAdministrativeData();
      const users = this.eligibleProjectionUsers(this.dependencies.users());
      const desired = await Promise.all(users.map(async user => ({
        user,
        snapshot: sanitizeSnapshot(await factory(user, source)),
      })));
      const projections = this.projectionJournals();
      const byUser = new Map<string, CompanyStoreRepositoryJournal[]>();
      for (const document of projections) {
        const userId = projectionUserId(getFlag(document, this.moduleId, COMPANY_STORE_PROJECTION_FLAG));
        if (!userId) continue;
        const documents = byUser.get(userId) ?? [];
        documents.push(document);
        byUser.set(userId, documents);
      }

      const result: CompanyStoreProjectionSyncResult = { created: 0, updated: 0, unchanged: 0, deleted: 0 };
      const keep = new Set<CompanyStoreRepositoryJournal>();
      for (const { user, snapshot } of desired) {
        const userId = text(user.id, 140);
        const payload = projectionFor(userId, snapshot);
        const ownership = { default: NONE_PERMISSION, [userId]: OBSERVER_PERMISSION };
        const name = `${COMPANY_STORE_PROJECTION_NAME_PREFIX} - ${text(user.name, 120) || userId}`;
        const candidates = (byUser.get(userId) ?? [])
          .sort((left, right) => text(left.id).localeCompare(text(right.id)));
        const existing = candidates[0];
        if (!existing) {
          const created = await this.dependencies.createJournal({
            name,
            ownership,
            flags: { [this.moduleId]: { [COMPANY_STORE_PROJECTION_FLAG]: payload } },
          }, { renderSheet: false });
          if (!created) throw new Error("Não foi possível criar a projeção da Loja da Companhia.");
          keep.add(created);
          result.created += 1;
          continue;
        }

        keep.add(existing);
        const currentPayload = getFlag(existing, this.moduleId, COMPANY_STORE_PROJECTION_FLAG);
        const contaminated = getFlag(existing, this.moduleId, COMPANY_STORE_DATA_FLAG) !== undefined
          || getFlag(existing, this.moduleId, COMPANY_STORE_ADMIN_MARKER_FLAG) !== undefined;
        if (
          contaminated
          || existing.name !== name
          || !stableEqual(existing.ownership ?? {}, ownership)
          || !stableEqual(currentPayload, payload)
        ) {
          if (!existing.update) throw new Error("A projeção da Loja da Companhia não pode ser atualizada.");
          await existing.update?.({
            name,
            ownership,
            [`flags.${this.moduleId}.${COMPANY_STORE_PROJECTION_FLAG}`]: payload,
            [`flags.${this.moduleId}.-=${COMPANY_STORE_DATA_FLAG}`]: null,
            [`flags.${this.moduleId}.-=${COMPANY_STORE_ADMIN_MARKER_FLAG}`]: null,
          }, { render: false });
          result.updated += 1;
        } else {
          result.unchanged += 1;
        }
      }

      const validUserIds = new Set(users.map(user => text(user.id, 140)));
      result.deleted = await this.deleteStaleUnlocked(validUserIds, keep);
      return result;
    });
  }

  async synchronizeProjections(factory: CompanyStoreProjectionFactory): Promise<void> {
    await this.sync(factory);
  }

  scheduleProjectionSync(factory: CompanyStoreProjectionFactory): void {
    this.scheduledFactory = factory;
    if (this.projectionSyncScheduled || !this.dependencies.currentUser()?.isGM) return;
    this.projectionSyncScheduled = true;
    queueMicrotask(() => {
      this.projectionSyncScheduled = false;
      const scheduled = this.scheduledFactory;
      this.scheduledFactory = null;
      if (!scheduled || !this.dependencies.currentUser()?.isGM) return;
      void this.synchronizeProjections(scheduled).catch(error => {
        console.error(`${this.moduleId} | Company Store projection synchronization failed`, error);
      });
    });
  }

  async deleteStale(validUserIds?: Iterable<string>): Promise<number> {
    this.assertGM();
    return this.withLock(async () => {
      const valid = validUserIds
        ? new Set(collection<string>(validUserIds).map(userId => text(userId, 140)).filter(Boolean))
        : new Set(this.eligibleProjectionUsers(this.dependencies.users()).map(user => text(user.id, 140)));
      return this.deleteStaleUnlocked(valid);
    });
  }

  private findAdministrativeJournal(): CompanyStoreRepositoryJournal | null {
    return collection<CompanyStoreRepositoryJournal>(this.dependencies.journals())
      .filter(document => isAdministrativeMarker(
        getFlag(document, this.moduleId, COMPANY_STORE_ADMIN_MARKER_FLAG),
      ))
      .sort((left, right) => text(left.id).localeCompare(text(right.id)))[0] ?? null;
  }

  private projectionJournals(): CompanyStoreRepositoryJournal[] {
    return collection<CompanyStoreRepositoryJournal>(this.dependencies.journals())
      .filter(document => Boolean(projectionUserId(
        getFlag(document, this.moduleId, COMPANY_STORE_PROJECTION_FLAG),
      )));
  }

  private async createAdministrativeJournal(data: CompanyStoreData): Promise<CompanyStoreRepositoryJournal> {
    const document = await this.dependencies.createJournal({
      name: COMPANY_STORE_ADMIN_NAME,
      ownership: { default: NONE_PERMISSION },
      flags: {
        [this.moduleId]: {
          [COMPANY_STORE_ADMIN_MARKER_FLAG]: administrativeMarker(),
          [COMPANY_STORE_DATA_FLAG]: normalizeCompanyStoreData(data),
        },
      },
    }, { renderSheet: false });
    if (!document) throw new Error("Não foi possível criar o arquivo administrativo da Loja da Companhia.");
    return document;
  }

  private readAdministrativeData(): CompanyStoreData {
    const document = this.findAdministrativeJournal();
    return normalizeCompanyStoreData(
      document ? getFlag(document, this.moduleId, COMPANY_STORE_DATA_FLAG) : createDefaultCompanyStoreData(),
    );
  }

  private async writeAdministrativeJournal(
    document: CompanyStoreRepositoryJournal,
    data: CompanyStoreData,
  ): Promise<void> {
    const normalized = normalizeCompanyStoreData(data);
    if (document.update) {
      await document.update({
        name: COMPANY_STORE_ADMIN_NAME,
        ownership: { default: NONE_PERMISSION },
        [`flags.${this.moduleId}.${COMPANY_STORE_ADMIN_MARKER_FLAG}`]: administrativeMarker(),
        [`flags.${this.moduleId}.${COMPANY_STORE_DATA_FLAG}`]: normalized,
        [`flags.${this.moduleId}.-=${COMPANY_STORE_PROJECTION_FLAG}`]: null,
      }, { render: false });
      return;
    }
    if (!document.setFlag) throw new Error("O Journal administrativo não pode ser atualizado.");
    await document.setFlag(this.moduleId, COMPANY_STORE_ADMIN_MARKER_FLAG, administrativeMarker());
    await document.setFlag(this.moduleId, COMPANY_STORE_DATA_FLAG, normalized);
  }

  private eligibleProjectionUsers(users: Iterable<CompanyStoreRepositoryUser>): CompanyStoreRepositoryUser[] {
    const byId = new Map<string, CompanyStoreRepositoryUser>();
    for (const user of collection<CompanyStoreRepositoryUser>(users)) {
      const id = text(user.id, 140);
      if (!id || user.isGM) continue;
      byId.set(id, user);
    }
    return [...byId.values()].sort((left, right) => text(left.id).localeCompare(text(right.id)));
  }

  private async deleteStaleUnlocked(
    validUserIds: ReadonlySet<string>,
    keepDocuments: ReadonlySet<CompanyStoreRepositoryJournal> = new Set(),
  ): Promise<number> {
    const retainedUsers = new Set<string>();
    let deleted = 0;
    const projections = this.projectionJournals()
      .sort((left, right) => text(left.id).localeCompare(text(right.id)));
    for (const document of projections) {
      const userId = projectionUserId(getFlag(document, this.moduleId, COMPANY_STORE_PROJECTION_FLAG));
      const explicitlyKept = keepDocuments.has(document);
      const stale = !validUserIds.has(userId)
        || (!explicitlyKept && retainedUsers.has(userId));
      if (stale) {
        if (document.delete) {
          await document.delete({ render: false });
          deleted += 1;
        }
        continue;
      }
      retainedUsers.add(userId);
    }
    return deleted;
  }

  private canReadProjection(userId: string): boolean {
    const current = this.dependencies.currentUser();
    return Boolean(current?.isGM || (text(current?.id, 140) && text(current?.id, 140) === userId));
  }

  private assertGM(): void {
    if (!this.dependencies.currentUser()?.isGM) {
      throw new Error("Somente o Gamemaster pode acessar os dados administrativos da Loja da Companhia.");
    }
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.operationTail;
    let release!: () => void;
    this.operationTail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}
