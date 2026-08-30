import {
  COMPANY_STORE_ENTRY_VERSION,
  COMPANY_STORE_SCHEMA_VERSION,
  COMPANY_STORE_TRANSACTION_MODES,
  COMPANY_STORE_TRANSACTION_STATES,
  type CompanyStoreCoins,
  type CompanyStoreData,
  type CompanyStoreEntry,
  type CompanyStorePrincipalAuthorization,
  type CompanyStoreRecoveryStepState,
  type CompanyStoreTransactionMode,
  type CompanyStoreTransactionRecord,
} from "./CompanyStoreTypes.js";

const ENTRY_KEYS = new Set([
  "version", "revision", "id", "itemUuid", "priceOverride", "stock", "minimumRank",
  "allowedRegions", "requiredFlags", "transactionMode", "featured", "enabled",
]);
const STORE_KEYS = new Set(["schemaVersion", "revision", "entries", "transactions", "authorizations", "migration"]);
const TRANSACTION_KEYS = new Set([
  "id", "fingerprint", "requesterId", "actorUuid", "actorName", "entryId", "requestMessageUuid", "itemUuid",
  "itemName", "transactionMode", "state", "price", "priceLabel", "stockBefore",
  "createdItemIds", "createdAt", "updatedAt", "completedAt", "approvedBy", "error",
  "recoveryNotes",
  "recovery", "recoveryResolution",
]);

const RECOVERY_STATES = new Set([
  "notStarted", "pending", "confirmed", "refunded", "removed", "unchanged",
  "decremented", "restored", "notApplicable", "ambiguous",
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, maximum = 240): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function integer(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function stringList(value: unknown, maximum = 40): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.flatMap(candidate => {
    const normalized = text(candidate, 120);
    return normalized ? [normalized] : [];
  }))).slice(0, maximum);
}

function extensions(input: Record<string, unknown>, known: Set<string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([key]) => !known.has(key)));
}

export function storeEntryIdFromUuid(uuid: string): string {
  const tail = uuid.split(".").filter(Boolean).at(-1) ?? "item";
  return `world-${tail.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "item"}`;
}

export function normalizeRequiredFlag(value: unknown): string | null {
  const flag = text(value, 80).toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,79}$/.test(flag) ? flag : null;
}

export function normalizeCompanyStoreEntry(value: unknown): CompanyStoreEntry | null {
  const input = record(value);
  const id = text(input.id, 100).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const itemUuid = text(input.itemUuid, 300);
  if (!id || !itemUuid || /[\u0000-\u001f]/.test(itemUuid)) return null;
  const mode = COMPANY_STORE_TRANSACTION_MODES.includes(input.transactionMode as CompanyStoreTransactionMode)
    ? input.transactionMode as CompanyStoreTransactionMode
    : "approval";
  const allowedRegions = Array.from(new Set(stringList(input.allowedRegions).map(region => region.toLocaleLowerCase())));
  const requiredFlags = Array.from(new Set(stringList(input.requiredFlags)
    .map(normalizeRequiredFlag)
    .filter((flag): flag is string => Boolean(flag))));
  const override = text(input.priceOverride, 80);
  return {
    ...extensions(input, ENTRY_KEYS),
    version: Math.max(COMPANY_STORE_ENTRY_VERSION, integer(input.version, COMPANY_STORE_ENTRY_VERSION)),
    revision: integer(input.revision),
    id,
    itemUuid,
    ...(override ? { priceOverride: override } : {}),
    ...(input.stock === undefined || input.stock === null || input.stock === "" ? {} : { stock: integer(input.stock) }),
    ...(input.minimumRank === undefined || input.minimumRank === null || input.minimumRank === "" ? {} : { minimumRank: integer(input.minimumRank) }),
    ...(allowedRegions.length ? { allowedRegions } : {}),
    ...(requiredFlags.length ? { requiredFlags } : {}),
    transactionMode: mode,
    featured: input.featured === true,
    enabled: input.enabled !== false,
  };
}

export function coinsFromCopper(copperValue: number): CompanyStoreCoins {
  let remaining = Math.max(0, Math.floor(Number(copperValue) || 0));
  const pp = Math.floor(remaining / 1_000);
  remaining -= pp * 1_000;
  const gp = Math.floor(remaining / 100);
  remaining -= gp * 100;
  const sp = Math.floor(remaining / 10);
  const cp = remaining - sp * 10;
  return { pp, gp, sp, cp, copperValue: Math.max(0, Math.floor(Number(copperValue) || 0)) };
}

export function normalizeCoins(value: unknown): CompanyStoreCoins {
  const input = record(value);
  if (Number.isFinite(Number(input.copperValue))) return coinsFromCopper(Number(input.copperValue));
  const pp = integer(input.pp);
  const gp = integer(input.gp);
  const sp = integer(input.sp);
  const cp = integer(input.cp);
  return { pp, gp, sp, cp, copperValue: pp * 1_000 + gp * 100 + sp * 10 + cp };
}

export function parseCompanyStorePrice(value: unknown): CompanyStoreCoins | null {
  if (value && typeof value === "object") return normalizeCoins(value);
  const input = text(value, 80).toLowerCase().replace(/,/g, " ");
  if (!input) return null;
  if (/^\d+$/.test(input)) return normalizeCoins({ gp: Number(input) });
  const result: Record<string, number> = { pp: 0, gp: 0, sp: 0, cp: 0 };
  let residue = input;
  let matchedDenomination = false;
  for (const match of input.matchAll(/(\d+)\s*(pp|gp|sp|cp)\b/g)) {
    matchedDenomination = true;
    result[match[2]!] = Number(result[match[2]!] ?? 0) + Number(match[1]);
    residue = residue.replace(match[0], " ");
  }
  if (!matchedDenomination || residue.replace(/[+\s]+/g, "") !== "") return null;
  return normalizeCoins(result);
}

function normalizeTransaction(value: unknown): CompanyStoreTransactionRecord | null {
  const input = record(value);
  const id = text(input.id, 140);
  const fingerprint = text(input.fingerprint, 500);
  const requesterId = text(input.requesterId, 140);
  const actorUuid = text(input.actorUuid, 300);
  const entryId = text(input.entryId, 100);
  const itemUuid = text(input.itemUuid, 300);
  const requestMessageUuid = text(input.requestMessageUuid, 300);
  if (!id || !fingerprint || !requesterId || !actorUuid || !entryId || !requestMessageUuid || !itemUuid) return null;
  const transactionMode = COMPANY_STORE_TRANSACTION_MODES.includes(input.transactionMode as CompanyStoreTransactionMode)
    ? input.transactionMode as CompanyStoreTransactionMode
    : "approval";
  const state = COMPANY_STORE_TRANSACTION_STATES.includes(input.state as CompanyStoreTransactionRecord["state"])
    ? input.state as CompanyStoreTransactionRecord["state"]
    : "recoveryRequired";
  const recoveryInput = record(input.recovery);
  const recoveryState = (
    candidate: unknown,
    fallback: CompanyStoreRecoveryStepState,
  ): CompanyStoreRecoveryStepState => RECOVERY_STATES.has(candidate as string)
    ? candidate as CompanyStoreRecoveryStepState
    : fallback;
  const resolutionInput = record(input.recoveryResolution);
  const outcome = resolutionInput.outcome === "completed" || resolutionInput.outcome === "rolledBack"
    ? resolutionInput.outcome
    : undefined;
  const resolutionNote = text(resolutionInput.note, 1_000);
  const resolvedBy = text(resolutionInput.resolvedBy, 140);
  return {
    ...extensions(input, TRANSACTION_KEYS),
    id,
    fingerprint,
    requesterId,
    actorUuid,
    actorName: text(input.actorName, 180),
    entryId,
    requestMessageUuid,
    itemUuid,
    itemName: text(input.itemName, 240),
    transactionMode,
    state,
    price: normalizeCoins(input.price),
    priceLabel: text(input.priceLabel, 120),
    ...(input.stockBefore === undefined ? {} : { stockBefore: integer(input.stockBefore) }),
    createdItemIds: stringList(input.createdItemIds, 20),
    createdAt: integer(input.createdAt),
    updatedAt: integer(input.updatedAt),
    ...(input.completedAt === undefined ? {} : { completedAt: integer(input.completedAt) }),
    ...(text(input.approvedBy, 140) ? { approvedBy: text(input.approvedBy, 140) } : {}),
    ...(text(input.error, 1_000) ? { error: text(input.error, 1_000) } : {}),
    ...(stringList(input.recoveryNotes, 20).length ? { recoveryNotes: stringList(input.recoveryNotes, 20) } : {}),
    ...(Object.keys(recoveryInput).length ? { recovery: {
      debit: recoveryState(recoveryInput.debit, "ambiguous"),
      delivery: recoveryState(recoveryInput.delivery, "ambiguous"),
      stock: recoveryState(recoveryInput.stock, "ambiguous"),
    } } : {}),
    ...(outcome && resolutionNote && resolvedBy ? { recoveryResolution: {
      outcome,
      note: resolutionNote,
      resolvedAt: integer(resolutionInput.resolvedAt),
      resolvedBy,
    } } : {}),
  };
}

export function createDefaultCompanyStoreData(): CompanyStoreData {
  return { schemaVersion: COMPANY_STORE_SCHEMA_VERSION, revision: 0, entries: [], transactions: [], authorizations: {} };
}

function normalizeAuthorization(value: unknown, actorUuid: string): CompanyStorePrincipalAuthorization | null {
  const input = record(value);
  const uuid = text(input.actorUuid, 300) || text(actorUuid, 300);
  if (!uuid) return null;
  const flags = stringList(input.flags)
    .map(normalizeRequiredFlag)
    .filter((flag): flag is string => Boolean(flag));
  const region = text(input.region, 120).toLocaleLowerCase();
  return {
    actorUuid: uuid,
    ...(input.rank === undefined || input.rank === null || input.rank === "" ? {} : { rank: integer(input.rank) }),
    ...(region ? { region } : {}),
    flags,
    updatedAt: integer(input.updatedAt),
  };
}

export function normalizeCompanyStoreData(value: unknown): CompanyStoreData {
  const input = record(value);
  const entries = (Array.isArray(input.entries) ? input.entries : [])
    .map(normalizeCompanyStoreEntry)
    .filter((entry): entry is CompanyStoreEntry => Boolean(entry));
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const transactions = (Array.isArray(input.transactions) ? input.transactions : [])
    .map(normalizeTransaction)
    .filter((transaction): transaction is CompanyStoreTransactionRecord => Boolean(transaction));
  const migration = record(input.migration);
  const authorizations = Object.fromEntries(Object.entries(record(input.authorizations)).flatMap(([actorUuid, value]) => {
    const authorization = normalizeAuthorization(value, actorUuid);
    return authorization ? [[authorization.actorUuid, authorization]] : [];
  }));
  return {
    ...extensions(input, STORE_KEYS),
    schemaVersion: COMPANY_STORE_SCHEMA_VERSION,
    revision: integer(input.revision),
    entries: [...byId.values()],
    transactions: transactions.slice(-500),
    authorizations,
    ...(Object.keys(migration).length ? {
      migration: {
        ...migration,
        ...(migration.worldItemsImportedAt === undefined ? {} : { worldItemsImportedAt: integer(migration.worldItemsImportedAt) }),
        ...(Array.isArray(migration.importedItemUuids) ? { importedItemUuids: stringList(migration.importedItemUuids, 2_000) } : {}),
        ...(migration.authorizationsImportedAt === undefined ? {} : { authorizationsImportedAt: integer(migration.authorizationsImportedAt) }),
      },
    } : {}),
  };
}

export function mergeWorldItems(
  store: CompanyStoreData,
  itemUuids: readonly string[],
  importedAt = Date.now(),
): CompanyStoreData {
  if (store.migration?.worldItemsImportedAt) return normalizeCompanyStoreData(store);
  const existingUuids = new Set(store.entries.map(entry => entry.itemUuid));
  const usedIds = new Set(store.entries.map(entry => entry.id));
  const additions: CompanyStoreEntry[] = [];
  for (const uuid of Array.from(new Set(itemUuids.filter(Boolean)))) {
    if (existingUuids.has(uuid)) continue;
    const base = storeEntryIdFromUuid(uuid);
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    usedIds.add(id);
    additions.push({
      version: COMPANY_STORE_ENTRY_VERSION,
      revision: 0,
      id,
      itemUuid: uuid,
      transactionMode: "approval",
      featured: false,
      enabled: true,
    });
  }
  return normalizeCompanyStoreData({
    ...store,
    revision: store.revision + 1,
    entries: [...store.entries, ...additions],
    migration: {
      ...store.migration,
      worldItemsImportedAt: importedAt,
      importedItemUuids: itemUuids,
    },
  });
}

export function transactionFingerprint(payload: {
  requesterId: string;
  actorUuid: string;
  entryId: string;
}): string {
  return `${payload.requesterId}\u001f${payload.actorUuid}\u001f${payload.entryId}\u001f1`;
}
