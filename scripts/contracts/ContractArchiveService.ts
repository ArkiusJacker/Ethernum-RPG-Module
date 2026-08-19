import { ETHERNUM } from "../config.js";
import { AutomationAuthority } from "../core/AutomationAuthority.js";
import { CompanyIdentityService } from "../company/CompanyIdentityService.js";
import {
  contractVisibilityAllows,
  createDefaultContractArchive,
  importLegacyJournalContracts,
  normalizeContractArchive,
  normalizeContractRecord,
  normalizeContractVisibility,
} from "./ContractArchiveModel.js";
import {
  CONTRACT_ARCHIVE_SCHEMA_VERSION,
  CONTRACT_REPORT_ATTACHMENT_ID,
  type CommunicatorDocumentTarget,
  type ContractArchiveCompleteOptions,
  type ContractArchiveData,
  type ContractArchiveMutationOptions,
  type ContractArchiveSnapshot,
  type ContractArchiveViewerContext,
  type ContractDocumentReference,
  type EthernumContractAttachment,
  type EthernumContractDTO,
  type EthernumContractPrincipal,
  type EthernumContractRecord,
  type EthernumContractStatus,
  type EthernumContractVisibility,
} from "./ContractArchiveTypes.js";

const STORE_FLAG = "contractArchiveStore";
const ARCHIVE_FLAG = "contractArchiveData";
const CONTRACT_PROJECTION_FLAG = "contractArchiveProjection";
const DOCUMENT_PROJECTION_FLAG = "contractDocumentProjection";
const STORE_NAME = "[Ethernum] Arquivo Administrativo de Contratos";
const PROJECTION_NAME_PREFIX = "[Ethernum]";
const OBSERVER_PERMISSION = 2;
const NONE_PERMISSION = 0;

type UserWithCharacter = User & { character?: Actor | null };

interface ArchiveJournal {
  id?: string | null;
  uuid?: string | null;
  name?: string | null;
  pages?: Iterable<unknown>;
  ownership?: Record<string, number>;
  visible?: boolean;
  getFlag?: (scope: string, key: string) => unknown;
  setFlag?: (scope: string, key: string, value: unknown) => Promise<unknown>;
  testUserPermission?: (user: User, level: string | number) => boolean;
  update?: (changes: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  delete?: (options?: Record<string, unknown>) => Promise<unknown>;
  [key: string]: unknown;
}

interface ContractProjectionPayload {
  schemaVersion: number;
  contract: EthernumContractDTO;
}

interface DocumentProjectionPayload {
  schemaVersion: number;
  contractId: string;
  reference: ContractDocumentReference;
  target: CommunicatorDocumentTarget;
}

interface ContractProjectionResult {
  contract: EthernumContractDTO;
  documents: Array<{ reference: ContractDocumentReference; target: CommunicatorDocumentTarget; visibility?: EthernumContractVisibility; source: EthernumContractAttachment }>;
}

function collection<T>(value: unknown): T[] {
  if (!value || typeof (value as Iterable<T>)[Symbol.iterator] !== "function") return [];
  return Array.from(value as Iterable<T>);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stripMarkup(value: unknown): string {
  return String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 20_000);
}

function statusLabel(status: EthernumContractStatus): string {
  return ({
    available: "Disponível",
    accepted: "Aceito",
    active: "Ativo",
    completed: "Concluído",
    failed: "Falhou",
    archived: "Arquivado",
  } as const)[status];
}

function documentIcon(kind: EthernumContractAttachment["kind"]): string {
  return ({
    pdf: "fa-solid fa-file-pdf",
    journal: "fa-solid fa-book-open",
    image: "fa-solid fa-image",
    dossier: "fa-solid fa-user-secret",
    text: "fa-solid fa-file-lines",
  } as const)[kind];
}

function getFlag(document: ArchiveJournal, key: string): unknown {
  try {
    return document.getFlag?.(ETHERNUM.MODULE_NAME, key)
      ?? record(record(document.flags)[ETHERNUM.MODULE_NAME])[key];
  } catch {
    return undefined;
  }
}

function canObserve(document: ArchiveJournal | null, user: UserWithCharacter | null): boolean {
  if (!document || !user) return false;
  if (user.isGM) return true;
  if (typeof document.testUserPermission === "function") {
    try { return document.testUserPermission(user, "OBSERVER"); } catch { return false; }
  }
  return document.visible === true;
}

function stableEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function reportSource(recordData: EthernumContractRecord): EthernumContractAttachment | null {
  if (recordData.pdfPath) {
    return {
      id: CONTRACT_REPORT_ATTACHMENT_ID,
      label: "Ler relatório",
      kind: "pdf",
      category: "attachment",
      path: recordData.pdfPath,
      pageCount: recordData.pdfPageCount,
      publicAsset: recordData.publicAsset === true,
    };
  }
  if (recordData.journalUuid) {
    return {
      id: CONTRACT_REPORT_ATTACHMENT_ID,
      label: "Ler relatório",
      kind: "journal",
      category: "attachment",
      uuid: recordData.journalUuid,
    };
  }
  return null;
}

function referenceFor(source: EthernumContractAttachment, report = false): ContractDocumentReference {
  return {
    id: source.id,
    label: source.label,
    kind: source.kind,
    category: report ? "report" : source.category,
    ...(source.description ? { description: source.description } : {}),
    icon: documentIcon(source.kind),
  };
}

function emptyDTO(recordData: EthernumContractRecord): EthernumContractDTO {
  const found = recordData.informationFound;
  const total = recordData.informationTotal;
  return {
    id: recordData.id,
    number: recordData.number,
    title: recordData.title,
    status: recordData.status,
    statusLabel: statusLabel(recordData.status),
    ...(recordData.location ? { location: recordData.location } : {}),
    ...(recordData.region ? { region: recordData.region } : {}),
    ...(recordData.difficulty ? { difficulty: recordData.difficulty } : {}),
    ...(recordData.grade ? { grade: recordData.grade } : {}),
    ...(recordData.supervisor ? { supervisor: recordData.supervisor } : {}),
    ...(recordData.coverImage ? { coverImage: recordData.coverImage } : {}),
    ...(found === undefined ? {} : { informationFound: found }),
    ...(total === undefined ? {} : { informationTotal: total }),
    ...(found === undefined || total === undefined ? {} : { informationLabel: `${found}/${total}` }),
    attachments: [],
    dossiers: [],
    rewards: [...(recordData.rewards ?? [])],
  };
}

export class ContractArchiveService {
  private initialized = false;
  private initializedAsPrimary = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  async initialize(): Promise<void> {
    if (!this.initialized) this.initialized = true;
    if (!AutomationAuthority.isPrimaryGM() || this.initializedAsPrimary) return;
    await this.ensureInitialized();
    this.initializedAsPrimary = true;
  }

  scheduleProjectionSync(delay = 150): void {
    if (!AutomationAuthority.isPrimaryGM()) return;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      void this.initialize().then(() => this.synchronizeProjections()).catch(error => {
        console.error("Ethernum | Contract projection synchronization failed", error);
      });
    }, Math.max(0, delay));
  }

  async getSnapshot(previewUserId?: string | null): Promise<ContractArchiveSnapshot> {
    const current = game.user as UserWithCharacter | null;
    if (!current) return { schemaVersion: CONTRACT_ARCHIVE_SCHEMA_VERSION, revision: 0, contracts: [] };
    if (!current.isGM) return this.snapshotFromProjectionDocuments(current);

    const viewer = previewUserId
      ? collection<UserWithCharacter>(game.users).find(user => user.id === previewUserId) ?? current
      : current;
    const archive = await this.readArchive();
    const contracts = (await Promise.all(archive.contracts.map(contract => this.projectContract(contract, viewer))))
      .filter((result): result is ContractProjectionResult => Boolean(result))
      .map(result => result.contract)
      .sort((left, right) => left.number - right.number || left.title.localeCompare(right.title));
    return { schemaVersion: archive.schemaVersion, revision: archive.revision, contracts };
  }

  async resolveDocumentTarget(
    contractId: string,
    attachmentId = CONTRACT_REPORT_ATTACHMENT_ID,
    previewUserId?: string | null,
  ): Promise<CommunicatorDocumentTarget | null> {
    const current = game.user as UserWithCharacter | null;
    if (!current) return null;
    if (!current.isGM) {
      return this.documentProjectionDocuments(current)
        .map(document => getFlag(document, DOCUMENT_PROJECTION_FLAG) as DocumentProjectionPayload | undefined)
        .find(payload => payload?.contractId === contractId && payload.reference?.id === attachmentId)
        ?.target ?? null;
    }

    const viewer = previewUserId
      ? collection<UserWithCharacter>(game.users).find(user => user.id === previewUserId) ?? current
      : current;
    const archive = await this.readArchive();
    const contract = archive.contracts.find(candidate => candidate.id === contractId);
    if (!contract) return null;
    const projection = await this.projectContract(contract, viewer);
    return projection?.documents.find(document => document.reference.id === attachmentId)?.target ?? null;
  }

  async getArchive(): Promise<ContractArchiveData> {
    this.assertGM();
    return this.readArchive();
  }

  async publish(input: unknown, options: ContractArchiveMutationOptions = {}): Promise<ContractArchiveData> {
    const candidate = normalizeContractRecord(input);
    if (!candidate) throw new Error("Contrato inválido.");
    return this.mutate(options, archive => {
      const index = archive.contracts.findIndex(contract => contract.id === candidate.id);
      const previous = index >= 0 ? archive.contracts[index] : null;
      const normalized = normalizeContractRecord(previous ? { ...previous, ...record(input) } : input);
      if (!normalized) throw new Error("Contrato inválido.");
      const now = Date.now();
      const next = {
        ...normalized,
        revision: previous ? previous.revision + 1 : 1,
        createdAt: previous ? previous.createdAt : normalized.createdAt || now,
        updatedAt: now,
      };
      if (index >= 0) archive.contracts[index] = next;
      else archive.contracts.push(next);
    });
  }

  async archive(contractId: string, options: ContractArchiveMutationOptions = {}): Promise<ContractArchiveData> {
    return this.transition(contractId, "archived", options);
  }

  async activate(contractId: string, options: ContractArchiveMutationOptions = {}): Promise<ContractArchiveData> {
    return this.mutate(options, archive => {
      if (archive.contracts.some(contract => contract.status === "active" && contract.id !== contractId)) {
        throw new Error("Já existe outro contrato ativo.");
      }
      this.updateStatus(archive, contractId, "active");
    });
  }

  async complete(contractId: string, options: ContractArchiveCompleteOptions = {}): Promise<ContractArchiveData> {
    return this.mutate(options, archive => {
      const contract = this.updateStatus(archive, contractId, "completed");
      if (text(options.grade)) contract.grade = text(options.grade).slice(0, 40);
    });
  }

  async grantAccess(
    contractId: string,
    principal: EthernumContractPrincipal,
    options: ContractArchiveMutationOptions & { attachmentId?: string } = {},
  ): Promise<ContractArchiveData> {
    return this.changeGrant(contractId, principal, true, options);
  }

  async revokeAccess(
    contractId: string,
    principal: EthernumContractPrincipal,
    options: ContractArchiveMutationOptions & { attachmentId?: string } = {},
  ): Promise<ContractArchiveData> {
    return this.changeGrant(contractId, principal, false, options);
  }

  async synchronizeProjections(): Promise<void> {
    if (!AutomationAuthority.isPrimaryGM()) return;
    const archive = await this.readArchive();
    const desired = new Map<string, { name: string; ownership: Record<string, number>; flag: string; payload: unknown }>();

    for (const contract of archive.contracts) {
      const contractOwnership = await this.ownershipFor(contract);
      const contractDTO = emptyDTO(contract);
      desired.set(`contract:${contract.id}`, {
        name: `${PROJECTION_NAME_PREFIX} Contrato ${String(contract.number).padStart(2, "0")} - ${contract.title}`,
        ownership: contractOwnership,
        flag: CONTRACT_PROJECTION_FLAG,
        payload: { schemaVersion: CONTRACT_ARCHIVE_SCHEMA_VERSION, contract: contractDTO } satisfies ContractProjectionPayload,
      });

      const sources = [reportSource(contract), ...contract.attachments].filter((source): source is EthernumContractAttachment => Boolean(source));
      for (const source of sources) {
        const report = source.id === CONTRACT_REPORT_ATTACHMENT_ID;
        const reference = referenceFor(source, report);
        const target = await this.targetFor(contract, source, null, false);
        if (!target) continue;
        const ownership = await this.ownershipFor(contract, source);
        desired.set(`document:${contract.id}:${source.id}`, {
          name: `${PROJECTION_NAME_PREFIX} ${contract.title} - ${source.label}`,
          ownership,
          flag: DOCUMENT_PROJECTION_FLAG,
          payload: { schemaVersion: CONTRACT_ARCHIVE_SCHEMA_VERSION, contractId: contract.id, reference, target } satisfies DocumentProjectionPayload,
        });
      }
    }

    const existing = this.projectionDocuments();
    const existingByKey = new Map<string, ArchiveJournal>();
    for (const document of existing) {
      const contractPayload = getFlag(document, CONTRACT_PROJECTION_FLAG) as ContractProjectionPayload | undefined;
      if (contractPayload?.contract?.id) {
        existingByKey.set(`contract:${contractPayload.contract.id}`, document);
        continue;
      }
      const documentPayload = getFlag(document, DOCUMENT_PROJECTION_FLAG) as DocumentProjectionPayload | undefined;
      if (documentPayload?.contractId && documentPayload.reference?.id) {
        existingByKey.set(`document:${documentPayload.contractId}:${documentPayload.reference.id}`, document);
      }
    }

    for (const [key, entry] of desired) {
      const existingDocument = existingByKey.get(key);
      const changes = {
        name: entry.name,
        ownership: entry.ownership,
        [`flags.${ETHERNUM.MODULE_NAME}.${entry.flag}`]: entry.payload,
      };
      if (existingDocument?.update) {
        const currentPayload = getFlag(existingDocument, entry.flag);
        if (!stableEqual(currentPayload, entry.payload)
          || !stableEqual(existingDocument.ownership ?? {}, entry.ownership)
          || existingDocument.name !== entry.name) {
          await existingDocument.update(changes, { render: false });
        }
      } else {
        await this.createJournal({
          name: entry.name,
          ownership: entry.ownership,
          flags: { [ETHERNUM.MODULE_NAME]: { [entry.flag]: entry.payload } },
        });
      }
      existingByKey.delete(key);
    }

    for (const stale of existingByKey.values()) await stale.delete?.({ render: false });
  }

  private async ensureInitialized(): Promise<void> {
    let store = this.findStore();
    if (!store) {
      store = await this.createJournal({
        name: STORE_NAME,
        ownership: { default: NONE_PERMISSION },
        flags: {
          [ETHERNUM.MODULE_NAME]: {
            [STORE_FLAG]: true,
            [ARCHIVE_FLAG]: createDefaultContractArchive(),
          },
        },
      });
    }
    if (!store) throw new Error("Não foi possível criar o arquivo de contratos.");

    const raw = getFlag(store, ARCHIVE_FLAG);
    const legacyJournals = collection<ArchiveJournal>((game as Game & { journal?: Iterable<ArchiveJournal> }).journal)
      .filter(document => document !== store && !getFlag(document, CONTRACT_PROJECTION_FLAG) && !getFlag(document, DOCUMENT_PROJECTION_FLAG));
    const normalized = importLegacyJournalContracts(raw, legacyJournals.map(document => ({ uuid: document.uuid, name: document.name })));
    if (!stableEqual(raw, normalized)) await this.writeArchive(store, normalized);
    await this.synchronizeProjections();
  }

  private async readArchive(): Promise<ContractArchiveData> {
    const store = this.findStore();
    return normalizeContractArchive(store ? getFlag(store, ARCHIVE_FLAG) : createDefaultContractArchive());
  }

  private async mutate(
    options: ContractArchiveMutationOptions,
    updater: (archive: ContractArchiveData) => void,
  ): Promise<ContractArchiveData> {
    this.assertGM();
    const store = this.findStore();
    if (!store) throw new Error("Arquivo administrativo de contratos indisponível.");
    const archive = await this.readArchive();
    if (options.expectedRevision !== undefined && options.expectedRevision !== archive.revision) {
      throw new Error("O arquivo de contratos foi atualizado por outro mestre. Recarregue antes de tentar novamente.");
    }
    updater(archive);
    archive.revision += 1;
    await this.writeArchive(store, archive);
    await this.synchronizeProjections();
    return archive;
  }

  private transition(
    contractId: string,
    status: EthernumContractStatus,
    options: ContractArchiveMutationOptions,
  ): Promise<ContractArchiveData> {
    return this.mutate(options, archive => { this.updateStatus(archive, contractId, status); });
  }

  private updateStatus(archive: ContractArchiveData, contractId: string, status: EthernumContractStatus): EthernumContractRecord {
    const contract = archive.contracts.find(candidate => candidate.id === contractId);
    if (!contract) throw new Error("Contrato não encontrado.");
    contract.status = status;
    contract.revision += 1;
    contract.updatedAt = Date.now();
    return contract;
  }

  private changeGrant(
    contractId: string,
    principal: EthernumContractPrincipal,
    grant: boolean,
    options: ContractArchiveMutationOptions & { attachmentId?: string },
  ): Promise<ContractArchiveData> {
    if (!principal || !["user", "agent", "squad"].includes(principal.kind) || !text(principal.id)) {
      return Promise.reject(new Error("Principal de acesso inválido."));
    }
    return this.mutate(options, archive => {
      const contract = archive.contracts.find(candidate => candidate.id === contractId);
      if (!contract) throw new Error("Contrato não encontrado.");
      const target = options.attachmentId
        ? contract.attachments.find(attachment => attachment.id === options.attachmentId)
        : contract;
      if (!target) throw new Error("Anexo não encontrado.");
      const visibility = normalizeContractVisibility(target.visibility, { mode: "restricted" });
      const grants = [...(visibility.grants ?? [])].filter(candidate => !(candidate.kind === principal.kind && candidate.id === principal.id));
      if (grant) grants.push({ kind: principal.kind, id: text(principal.id) });
      target.visibility = { ...visibility, mode: "restricted", ...(grants.length ? { grants } : { grants: [] }) };
      contract.revision += 1;
      contract.updatedAt = Date.now();
    });
  }

  private async projectContract(contract: EthernumContractRecord, viewer: UserWithCharacter): Promise<ContractProjectionResult | null> {
    const context = this.viewerContext(viewer);
    if (!contractVisibilityAllows(contract.visibility, context)) return null;
    const projected = emptyDTO(contract);
    const documents: ContractProjectionResult["documents"] = [];
    const sources = [reportSource(contract), ...contract.attachments].filter((source): source is EthernumContractAttachment => Boolean(source));
    for (const source of sources) {
      const attachmentVisibility = source.visibility ?? contract.visibility;
      if (!contractVisibilityAllows(attachmentVisibility, context)) continue;
      const target = await this.targetFor(contract, source, viewer, true);
      if (!target) continue;
      const report = source.id === CONTRACT_REPORT_ATTACHMENT_ID;
      const reference = referenceFor(source, report);
      documents.push({ reference, target, visibility: source.visibility, source });
      if (report) projected.report = reference;
      else if (source.category === "dossier") projected.dossiers.push(reference);
      else projected.attachments.push(reference);
    }
    return { contract: projected, documents };
  }

  private async targetFor(
    contract: EthernumContractRecord,
    source: EthernumContractAttachment,
    viewer: UserWithCharacter | null,
    enforcePermission: boolean,
  ): Promise<CommunicatorDocumentTarget | null> {
    const permissionUuid = source.permissionUuid ?? source.uuid;
    let permissionDocument: ArchiveJournal | null = null;
    if (permissionUuid) {
      permissionDocument = await this.resolveUuid(permissionUuid);
      if (!permissionDocument || (enforcePermission && !canObserve(permissionDocument, viewer))) return null;
    }
    if (source.path && source.publicAsset !== true) return null;
    if ((source.kind === "pdf" || source.kind === "image") && !source.path) return null;
    if ((source.kind === "journal" || source.kind === "dossier") && !source.uuid && !source.content) return null;
    if (source.kind === "text" && !source.content && !source.uuid) return null;

    let extractedContent = source.content;
    if (!extractedContent && source.uuid && permissionDocument) extractedContent = this.documentText(permissionDocument, viewer);
    return {
      contractId: contract.id,
      attachmentId: source.id,
      label: source.label,
      kind: source.kind,
      category: source.id === CONTRACT_REPORT_ATTACHMENT_ID ? "report" : source.category,
      ...(source.description ? { description: source.description } : {}),
      ...(source.path ? { sourceUrl: source.path } : {}),
      ...(source.uuid ? { uuid: source.uuid } : {}),
      ...(extractedContent ? { content: stripMarkup(extractedContent) } : {}),
      ...(source.pageCount ? { pageCount: source.pageCount } : {}),
    };
  }

  private documentText(document: ArchiveJournal, viewer: UserWithCharacter | null): string {
    const pages = collection<Record<string, unknown>>(document.pages)
      .filter(page => canObserve(page as unknown as ArchiveJournal, viewer));
    const pageText = pages.flatMap(page => {
      const pageData = record(page);
      const textData = record(pageData.text);
      const system = record(pageData.system);
      const value = textData.content ?? system.content ?? pageData.content;
      return typeof value === "string" ? [stripMarkup(value)] : [];
    }).filter(Boolean);
    if (pageText.length) return pageText.join("\n\n").slice(0, 20_000);
    return stripMarkup(record(document).content ?? record(document).text);
  }

  private snapshotFromProjectionDocuments(viewer: UserWithCharacter): ContractArchiveSnapshot {
    const documents = this.documentProjectionDocuments(viewer)
      .map(document => getFlag(document, DOCUMENT_PROJECTION_FLAG) as DocumentProjectionPayload | undefined)
      .filter((payload): payload is DocumentProjectionPayload => Boolean(payload?.contractId && payload.reference && payload.target));
    const references = new Map<string, DocumentProjectionPayload[]>();
    for (const payload of documents) {
      const list = references.get(payload.contractId) ?? [];
      list.push(payload);
      references.set(payload.contractId, list);
    }
    const contracts = this.contractProjectionDocuments(viewer).flatMap(document => {
      const payload = getFlag(document, CONTRACT_PROJECTION_FLAG) as ContractProjectionPayload | undefined;
      if (!payload?.contract) return [];
      const dto: EthernumContractDTO = {
        ...payload.contract,
        attachments: [],
        dossiers: [],
        rewards: [...(payload.contract.rewards ?? [])],
      };
      for (const item of references.get(dto.id) ?? []) {
        if (item.reference.category === "report") dto.report = item.reference;
        else if (item.reference.category === "dossier") dto.dossiers.push(item.reference);
        else dto.attachments.push(item.reference);
      }
      return [dto];
    }).sort((left, right) => left.number - right.number || left.title.localeCompare(right.title));
    return { schemaVersion: CONTRACT_ARCHIVE_SCHEMA_VERSION, revision: 0, contracts };
  }

  private async ownershipFor(contract: EthernumContractRecord, source?: EthernumContractAttachment): Promise<Record<string, number>> {
    const ownership: Record<string, number> = { default: NONE_PERMISSION };
    for (const user of collection<UserWithCharacter>(game.users)) {
      if (!user.id || user.isGM) continue;
      const context = this.viewerContext(user);
      if (!contractVisibilityAllows(contract.visibility, context)) continue;
      if (source && !contractVisibilityAllows(source.visibility ?? contract.visibility, context)) continue;
      if (source && !(await this.targetFor(contract, source, user, true))) continue;
      ownership[user.id] = OBSERVER_PERMISSION;
    }
    return ownership;
  }

  private viewerContext(user: UserWithCharacter): ContractArchiveViewerContext {
    const actor = user.character ?? null;
    const identity = CompanyIdentityService.resolve(actor);
    return {
      userId: String(user.id ?? ""),
      isGM: Boolean(user.isGM),
      ...(actor?.id ? { actorId: actor.id } : {}),
      ...(identity.rank === undefined ? {} : { rank: identity.rank }),
      squadIds: identity.squadIds,
    };
  }

  private projectionDocuments(): ArchiveJournal[] {
    return collection<ArchiveJournal>((game as Game & { journal?: Iterable<ArchiveJournal> }).journal)
      .filter(document => Boolean(getFlag(document, CONTRACT_PROJECTION_FLAG) || getFlag(document, DOCUMENT_PROJECTION_FLAG)));
  }

  private contractProjectionDocuments(user: UserWithCharacter): ArchiveJournal[] {
    return this.projectionDocuments().filter(document => Boolean(getFlag(document, CONTRACT_PROJECTION_FLAG)) && canObserve(document, user));
  }

  private documentProjectionDocuments(user: UserWithCharacter): ArchiveJournal[] {
    return this.projectionDocuments().filter(document => Boolean(getFlag(document, DOCUMENT_PROJECTION_FLAG)) && canObserve(document, user));
  }

  private findStore(): ArchiveJournal | null {
    return collection<ArchiveJournal>((game as Game & { journal?: Iterable<ArchiveJournal> }).journal)
      .find(document => getFlag(document, STORE_FLAG) === true) ?? null;
  }

  private async writeArchive(store: ArchiveJournal, archive: ContractArchiveData): Promise<void> {
    const normalized = normalizeContractArchive(archive);
    if (store.setFlag) await store.setFlag(ETHERNUM.MODULE_NAME, ARCHIVE_FLAG, normalized);
    else await store.update?.({ [`flags.${ETHERNUM.MODULE_NAME}.${ARCHIVE_FLAG}`]: normalized }, { render: false });
  }

  private async createJournal(data: Record<string, unknown>): Promise<ArchiveJournal | null> {
    type JournalDocumentClass = {
      create?: (source: Record<string, unknown>, options?: Record<string, unknown>) => Promise<ArchiveJournal | null>;
    };
    const globals = globalThis as typeof globalThis & {
      JournalEntry?: JournalDocumentClass;
      CONFIG?: { JournalEntry?: { documentClass?: JournalDocumentClass } };
    };
    const documentClass = globals.CONFIG?.JournalEntry?.documentClass ?? globals.JournalEntry;
    if (!documentClass?.create) return null;
    return documentClass.create.call(documentClass, data, { renderSheet: false });
  }

  private async resolveUuid(value: string): Promise<ArchiveJournal | null> {
    try {
      return await (fromUuid as unknown as (uuid: string) => Promise<unknown>)(value) as ArchiveJournal | null;
    } catch {
      return null;
    }
  }

  private assertGM(): void {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode alterar o arquivo de contratos.");
  }
}

let service: ContractArchiveService | null = null;

export function getContractArchiveService(): ContractArchiveService {
  service ??= new ContractArchiveService();
  return service;
}

export async function initializeContractArchiveService(): Promise<ContractArchiveService> {
  const instance = getContractArchiveService();
  await instance.initialize();
  return instance;
}
