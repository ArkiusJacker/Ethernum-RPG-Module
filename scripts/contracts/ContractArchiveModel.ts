import {
  CONTRACT_ARCHIVE_SCHEMA_VERSION,
  CONTRACT_RECORD_VERSION,
  CONTRACT_STATUSES,
  type ContractArchiveData,
  type ContractArchiveViewerContext,
  type EthernumContractAttachment,
  type EthernumContractDocumentKind,
  type EthernumContractPrincipal,
  type EthernumContractRecord,
  type EthernumContractStatus,
  type EthernumContractVisibility,
} from "./ContractArchiveTypes.js";

const DEFAULT_CONTRACT_TIMESTAMP = Date.UTC(2026, 6, 30, 23, 41, 52);
const MODULE_ASSET_PREFIX = "modules/ethernum-rpg-module/assets/";
const MAX_TEXT_LENGTH = 20_000;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, maximum = 240): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maximum) : undefined;
}

function content(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  return normalized ? normalized.slice(0, MAX_TEXT_LENGTH) : undefined;
}

function integer(value: unknown, fallback = 0, minimum = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.trunc(parsed)) : fallback;
}

function strings(value: unknown, maximum = 100): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.flatMap(entry => text(entry) ? [text(entry)!] : []))).slice(0, maximum);
}

function identifier(value: unknown, fallback: string): string {
  const candidate = text(value, 120)?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return candidate || fallback;
}

function uuid(value: unknown): string | undefined {
  const candidate = text(value, 300);
  return candidate && /^[A-Za-z][A-Za-z0-9._-]*(?:\.[A-Za-z0-9._-]+)+$/.test(candidate)
    ? candidate
    : undefined;
}

export function normalizePublicModuleAssetPath(value: unknown): string | undefined {
  const candidate = text(value, 500)?.replace(/^\/+/, "");
  if (!candidate || candidate.includes("\\") || candidate.includes("%") || candidate.includes("?") || candidate.includes("#")) return undefined;
  if (!candidate.startsWith(MODULE_ASSET_PREFIX) || !/^[A-Za-z0-9_./-]+$/.test(candidate)) return undefined;
  const segments = candidate.split("/");
  if (segments.some(segment => !segment || segment === "." || segment === "..")) return undefined;
  return candidate;
}

function normalizePrincipal(value: unknown): EthernumContractPrincipal | null {
  const input = record(value);
  const kind = input.kind === "user" || input.kind === "agent" || input.kind === "squad"
    ? input.kind
    : null;
  const id = text(input.id, 160);
  return kind && id ? { kind, id } : null;
}

export function normalizeContractVisibility(
  value: unknown,
  fallback: EthernumContractVisibility = { mode: "gm" },
): EthernumContractVisibility {
  const input = record(value);
  const mode = input.mode === "all" || input.mode === "restricted" || input.mode === "gm"
    ? input.mode
    : fallback.mode;
  const minimumRank = input.minimumRank === undefined ? undefined : integer(input.minimumRank, 0);
  const allowedRanks = Array.isArray(input.allowedRanks)
    ? Array.from(new Set(input.allowedRanks.map(rank => integer(rank, -1, -1)).filter(rank => rank >= 0))).slice(0, 20)
    : [];
  const grants = Array.isArray(input.grants)
    ? input.grants.map(normalizePrincipal).filter((grant): grant is EthernumContractPrincipal => Boolean(grant)).slice(0, 200)
    : [];
  return {
    mode,
    ...(minimumRank === undefined ? {} : { minimumRank }),
    ...(allowedRanks.length ? { allowedRanks } : {}),
    ...(grants.length ? { grants } : {}),
  };
}

function normalizeAttachment(value: unknown, index: number): EthernumContractAttachment | null {
  const input = record(value);
  const kind: EthernumContractDocumentKind | null = ["pdf", "journal", "image", "dossier", "text"].includes(String(input.kind))
    ? input.kind as EthernumContractDocumentKind
    : null;
  const label = text(input.label);
  if (!kind || !label) return null;
  const category = input.category === "dossier" || input.category === "reward" ? input.category : "attachment";
  const normalizedPath = normalizePublicModuleAssetPath(input.path);
  const normalizedContent = content(input.content);
  return {
    ...input,
    id: identifier(input.id, `attachment-${index + 1}`),
    label,
    kind,
    category,
    ...(text(input.description, 500) ? { description: text(input.description, 500) } : {}),
    ...(uuid(input.uuid) ? { uuid: uuid(input.uuid) } : {}),
    ...(normalizedPath ? { path: normalizedPath } : {}),
    ...(normalizedContent ? { content: normalizedContent } : {}),
    ...(integer(input.pageCount) > 0 ? { pageCount: integer(input.pageCount) } : {}),
    ...(uuid(input.permissionUuid) ? { permissionUuid: uuid(input.permissionUuid) } : {}),
    publicAsset: input.publicAsset === true,
    ...(input.informationRequired === undefined ? {} : { informationRequired: integer(input.informationRequired) }),
    ...(input.visibility === undefined ? {} : { visibility: normalizeContractVisibility(input.visibility) }),
  };
}

function normalizeStatus(value: unknown): EthernumContractStatus {
  return CONTRACT_STATUSES.includes(value as EthernumContractStatus)
    ? value as EthernumContractStatus
    : "available";
}

export function normalizeContractRecord(value: unknown, index = 0): EthernumContractRecord | null {
  const input = record(value);
  const title = text(input.title);
  if (!title) return null;
  const number = integer(input.number, index + 1);
  const id = identifier(input.id, `contract-${String(number).padStart(2, "0")}`);
  const attachments = Array.isArray(input.attachments)
    ? input.attachments.map(normalizeAttachment).filter((attachment): attachment is EthernumContractAttachment => Boolean(attachment))
    : [];
  const informationFound = input.informationFound === undefined ? undefined : integer(input.informationFound);
  const informationTotal = input.informationTotal === undefined ? undefined : integer(input.informationTotal);
  const createdAt = integer(input.createdAt, DEFAULT_CONTRACT_TIMESTAMP);
  const updatedAt = integer(input.updatedAt, createdAt);
  return {
    ...input,
    version: integer(input.version, CONTRACT_RECORD_VERSION, 1),
    revision: integer(input.revision, 1, 1),
    id,
    number,
    title,
    status: normalizeStatus(input.status),
    ...(text(input.location) ? { location: text(input.location) } : {}),
    ...(text(input.region) ? { region: text(input.region) } : {}),
    ...(text(input.difficulty) ? { difficulty: text(input.difficulty) } : {}),
    ...(text(input.grade, 40) ? { grade: text(input.grade, 40) } : {}),
    ...(text(input.supervisor) ? { supervisor: text(input.supervisor) } : {}),
    ...(normalizePublicModuleAssetPath(input.coverImage) ? { coverImage: normalizePublicModuleAssetPath(input.coverImage) } : {}),
    ...(uuid(input.journalUuid) ? { journalUuid: uuid(input.journalUuid) } : {}),
    ...(normalizePublicModuleAssetPath(input.pdfPath) ? { pdfPath: normalizePublicModuleAssetPath(input.pdfPath) } : {}),
    ...(integer(input.pdfPageCount) > 0 ? { pdfPageCount: integer(input.pdfPageCount) } : {}),
    publicAsset: input.publicAsset === true,
    ...(informationFound === undefined ? {} : { informationFound }),
    ...(informationTotal === undefined ? {} : { informationTotal }),
    attachments,
    rewards: strings(input.rewards, 30),
    visibility: normalizeContractVisibility(input.visibility, { mode: "gm" }),
    createdAt,
    updatedAt,
  };
}

export function createDefaultContractRecord(): EthernumContractRecord {
  return normalizeContractRecord({
    version: CONTRACT_RECORD_VERSION,
    revision: 1,
    id: "contract-01-operation-manifesto-13",
    number: 1,
    title: "Operação Manifesto 13",
    status: "completed",
    location: "Complexo Industrial de Stonesour",
    region: "Stonesour",
    difficulty: "Ameaça Extrema Não Catalogada",
    grade: "S",
    supervisor: "Dália \"Catraca\" Venn",
    coverImage: `${MODULE_ASSET_PREFIX}contracts/contract-01-cover.png`,
    pdfPath: `${MODULE_ASSET_PREFIX}contracts/contract-01-operation-manifesto-13.pdf`,
    pdfPageCount: 13,
    publicAsset: true,
    informationFound: 5,
    informationTotal: 5,
    rewards: ["19 PO e 6 PP por agente", "35 XP por agente", "2 Ethernum Points"],
    attachments: [],
    visibility: { mode: "all" },
    createdAt: DEFAULT_CONTRACT_TIMESTAMP,
    updatedAt: DEFAULT_CONTRACT_TIMESTAMP,
  })!;
}

export function createDefaultContractArchive(): ContractArchiveData {
  return {
    schemaVersion: CONTRACT_ARCHIVE_SCHEMA_VERSION,
    revision: 1,
    contracts: [createDefaultContractRecord()],
    migration: { legacyJournalImport: 0 },
  };
}

export function normalizeContractArchive(value: unknown): ContractArchiveData {
  const input = record(value);
  const contracts = Array.isArray(input.contracts)
    ? input.contracts.map(normalizeContractRecord).filter((contract): contract is EthernumContractRecord => Boolean(contract))
    : [];
  const byId = new Map(contracts.map(contract => [contract.id, contract]));
  const reference = createDefaultContractRecord();
  if (!byId.has(reference.id)) byId.set(reference.id, reference);
  return {
    ...input,
    schemaVersion: Math.max(CONTRACT_ARCHIVE_SCHEMA_VERSION, integer(input.schemaVersion, CONTRACT_ARCHIVE_SCHEMA_VERSION, 1)),
    revision: integer(input.revision, 1, 1),
    contracts: [...byId.values()],
    migration: { ...record(input.migration) },
  };
}

export function contractVisibilityAllows(
  visibility: EthernumContractVisibility,
  viewer: ContractArchiveViewerContext,
): boolean {
  if (viewer.isGM) return true;
  if (visibility.mode === "all") return true;
  if (visibility.mode === "gm") return false;
  if (visibility.minimumRank !== undefined && (viewer.rank === undefined || viewer.rank < visibility.minimumRank)) return false;

  let hasGrantRule = false;
  let granted = false;
  if (visibility.allowedRanks?.length) {
    hasGrantRule = true;
    granted ||= viewer.rank !== undefined && visibility.allowedRanks.includes(viewer.rank);
  }
  if (visibility.grants?.length) {
    hasGrantRule = true;
    granted ||= visibility.grants.some(grant => (
      (grant.kind === "user" && grant.id === viewer.userId)
      || (grant.kind === "agent" && grant.id === viewer.actorId)
      || (grant.kind === "squad" && viewer.squadIds.includes(grant.id))
    ));
  }
  return hasGrantRule ? granted : visibility.minimumRank !== undefined;
}

export function importLegacyJournalContracts(
  archiveInput: unknown,
  journals: readonly { uuid?: string | null; name?: string | null }[],
  timestamp = Date.now(),
): ContractArchiveData {
  const archive = normalizeContractArchive(archiveInput);
  if (Number(record(archive.migration).legacyJournalImport) >= 1) return archive;
  const knownUuids = new Set(archive.contracts.flatMap(contract => contract.journalUuid ? [contract.journalUuid] : []));
  const imported: EthernumContractRecord[] = [];
  for (const journal of journals) {
    const journalUuid = uuid(journal.uuid);
    const name = text(journal.name);
    if (!journalUuid || !name || knownUuids.has(journalUuid) || !/contrato|contract|missão|mission/i.test(name)) continue;
    const match = name.match(/(?:contrato|contract|missão|mission)\s*#?\s*(\d+)/i);
    const number = match ? integer(match[1], archive.contracts.length + imported.length + 1) : archive.contracts.length + imported.length + 1;
    const contract = normalizeContractRecord({
      id: `legacy-${journalUuid}`,
      number,
      title: name,
      status: "available",
      journalUuid,
      attachments: [],
      visibility: { mode: "all" },
      createdAt: timestamp,
      updatedAt: timestamp,
    }, archive.contracts.length + imported.length);
    if (contract) imported.push(contract);
    knownUuids.add(journalUuid);
  }
  return {
    ...archive,
    revision: archive.revision + (imported.length ? 1 : 0),
    contracts: [...archive.contracts, ...imported],
    migration: { ...record(archive.migration), legacyJournalImport: 1 },
  };
}
