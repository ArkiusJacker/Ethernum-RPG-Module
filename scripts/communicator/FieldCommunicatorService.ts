import { ETHERNUM } from "../config.js";
import { CompanyIdentityService } from "../company/CompanyIdentityService.js";
import { createPF2eCharacterSnapshot } from "../core/PF2eCharacterAdapter.js";
import { getContractArchiveService, type ContractArchiveService } from "../contracts/ContractArchiveService.js";
import type {
  ContractArchiveSnapshot,
  EthernumContractDTO,
} from "../contracts/ContractArchiveTypes.js";
import type { CommunicatorDocumentViewerData } from "../contracts/CommunicatorDocumentViewer.js";
import { getCompanyStoreService, type CompanyStoreService } from "../store/CompanyStoreService.js";
import type {
  CompanyStorePurchaseReceipt,
  CompanyStorePurchaseSubmission,
  CompanyStoreSnapshot,
} from "../store/CompanyStoreTypes.js";
import { getFieldCommunicatorMotionMode } from "../settings.js";
import {
  filterFieldCommunicatorApps,
  normalizeFieldCommunicatorRegistry,
} from "./FieldCommunicatorRegistry.js";
import type {
  FieldCommunicatorApp,
  FieldCommunicatorRegistryData,
} from "./FieldCommunicatorTypes.js";
import type {
  FieldCommunicatorPanel,
  FieldCommunicatorSnapshot,
} from "../ui/FieldCommunicatorView.js";

export interface FieldCommunicatorEntry {
  id: string;
  uuid?: string;
  name: string;
  image?: string;
  subtitle?: string;
  status?: string;
  action?: string;
  targetId?: string;
  disabled?: boolean;
  icon?: string;
  badge?: string | number;
}

export interface FieldCommunicatorPanelData extends FieldCommunicatorPanel {
  title: string;
  description?: string;
  kind: string;
  entries?: FieldCommunicatorEntry[];
  empty?: boolean;
  actor?: ReturnType<typeof createPF2eCharacterSnapshot>;
  users?: FieldCommunicatorEntry[];
  messages?: FieldCommunicatorEntry[];
  settings?: Record<string, unknown>;
  registry?: FieldCommunicatorRegistryData;
  contractArchive?: ContractArchiveSnapshot;
  contractGroups?: Array<Record<string, unknown>>;
  selectedContract?: EthernumContractDTO;
  documentViewer?: CommunicatorDocumentViewerData;
  store?: CompanyStoreSnapshot;
  storeReceipt?: CompanyStorePurchaseReceipt;
  isGM?: boolean;
}

export interface FieldCommunicatorBuildOptions {
  selectedContractId?: string | null;
  documentViewer?: CommunicatorDocumentViewerData;
  selectedStoreEntryId?: string | null;
  storeReceipt?: CompanyStorePurchaseReceipt;
}

interface PermissionDocument {
  id?: string | null;
  uuid?: string | null;
  name?: string | null;
  img?: string;
  thumb?: string;
  type?: string;
  visible?: boolean;
  sheet?: { render?: (force?: boolean) => unknown };
  render?: (force?: boolean) => unknown;
  testUserPermission?: (user: User, level: string | number) => boolean;
  view?: () => unknown;
  activate?: () => unknown;
  folder?: { name?: string } | null;
  flags?: Record<string, unknown>;
  system?: Record<string, unknown>;
}

interface CommunicatorMessage extends PermissionDocument {
  content?: string;
  timestamp?: number;
  whisper?: string[];
  speaker?: { alias?: string };
  author?: { id?: string; name?: string };
  user?: { id?: string; name?: string };
}

type UserWithCharacter = User & {
  character?: Actor | null;
};

function localize(key: string, fallback: string): string {
  const translated = game.i18n?.localize(key);
  return translated && translated !== key ? translated : fallback;
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

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stripMarkup(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function escaped(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character] ?? character));
}

function appLabel(app: FieldCommunicatorApp): string {
  return app.source === "official"
    ? localize(`ETHERNUM.FieldCommunicator.Apps.${app.id}.Label`, app.label)
    : app.label;
}

function appDescription(app: FieldCommunicatorApp): string {
  return app.source === "official"
    ? localize(`ETHERNUM.FieldCommunicator.Apps.${app.id}.Description`, app.description)
    : app.description;
}

export class FieldCommunicatorService {
  constructor(
    private readonly contractArchive: ContractArchiveService = getContractArchiveService(),
    private readonly companyStore: CompanyStoreService = getCompanyStoreService(),
  ) {}

  getAssignedActor(user = game.user as UserWithCharacter | null): Actor | null {
    const assigned = user?.character;
    if (assigned && this.canObserve(assigned, user)) return assigned;
    if (!user?.isGM) return null;
    return collection<Actor>(game.actors).find(actor =>
      (actor.type as string) === "character" && this.canObserve(actor, user)) ?? null;
  }

  getRegistry(): FieldCommunicatorRegistryData {
    try {
      return normalizeFieldCommunicatorRegistry(
        game.settings?.get(ETHERNUM.MODULE_NAME, "fieldCommunicatorApps"),
      );
    } catch {
      return normalizeFieldCommunicatorRegistry({});
    }
  }

  async setRegistry(registry: FieldCommunicatorRegistryData): Promise<FieldCommunicatorRegistryData> {
    if (!game.user?.isGM) throw new Error("Only a GM can update communicator applications.");
    const normalized = normalizeFieldCommunicatorRegistry(registry);
    await game.settings?.set(ETHERNUM.MODULE_NAME, "fieldCommunicatorApps", normalized);
    return normalized;
  }

  async buildSnapshot(
    previewUserId?: string | null,
    options: FieldCommunicatorBuildOptions = {},
  ): Promise<FieldCommunicatorSnapshot> {
    const previewUser = previewUserId && game.user?.isGM
      ? collection<UserWithCharacter>(game.users).find(user => user.id === previewUserId) ?? null
      : null;
    const actor = previewUser
      ? (previewUser.character && this.canObserve(previewUser.character, previewUser) ? previewUser.character : null)
      : this.getAssignedActor();
    const subjectUser = previewUser ?? game.user as UserWithCharacter | null;
    const character = actor ? createPF2eCharacterSnapshot(actor) : null;
    const companyIdentity = CompanyIdentityService.resolve(actor);
    const registry = this.getRegistry();
    const context = {
      rank: companyIdentity.rank,
      agentId: actor?.id ?? undefined,
      squadIds: companyIdentity.squadIds,
    };
    const accessibleIds = new Set(filterFieldCommunicatorApps(
      registry.apps.map(app => ({ ...app, enabled: true })),
      context,
    ).map(app => app.id));
    const accessible = registry.apps.filter(app => accessibleIds.has(app.id));
    const apps = (await Promise.all(accessible.map(async app => {
      if (!(await this.canAccessUnlock(app, actor, subjectUser))) return null;
      const targetAccessible = app.source !== "custom" || await this.canAccessTarget(app, subjectUser);
      if (!targetAccessible && !game.user?.isGM) return null;
      return {
        id: app.id,
        source: app.source,
        type: app.type,
        order: app.order,
        enabled: app.enabled,
        icon: app.icon,
        minimumRank: app.minimumRank,
        badge: app.badge,
        label: appLabel(app),
        description: appDescription(app),
        accent: text(app.accent).startsWith("#") ? "custom" : text(app.accent) || "gold",
        accentColor: text(app.accent).startsWith("#") ? app.accent : undefined,
        panelId: app.type === "internal" ? app.internalTarget ?? app.id : undefined,
        disabled: !app.enabled,
        maintenance: !app.enabled,
        brokenTarget: !targetAccessible,
      };
    }))).filter((app): app is NonNullable<typeof app> => Boolean(app));

    const allowedPanelIds = new Set(apps.flatMap(app => app.panelId ? [app.panelId] : []));
    if (game.user?.isGM) allowedPanelIds.add("administration");
    const contractArchive = allowedPanelIds.has("contracts")
      ? await this.contractArchive.getSnapshot(previewUserId)
      : undefined;
    const store = allowedPanelIds.has("shop")
      ? await this.companyStore.getSnapshot(previewUserId, options.selectedStoreEntryId)
      : undefined;
    const panels = await this.buildPanels(actor, registry, subjectUser, allowedPanelIds, {
      ...options,
      contractArchive,
      store,
    });
    const preferences = this.clientSettings();
    const squads = companyIdentity.squadIds;
    const ether = record(actor?.getFlag(ETHERNUM.MODULE_NAME, "etherSystem"));
    const now = new Date();
    const activeUsers = collection<UserWithCharacter>(game.users)
      .filter(user => user.active && !user.isGM)
      .map(user => ({
        id: user.id,
        name: text(user.character?.name || user.name),
        selected: user.id === previewUser?.id,
      }));
    return {
      apps,
      panels,
      character,
      agent: {
        name: actor?.name ?? localize("ETHERNUM.FieldCommunicator.AgentFallback", "Agente não vinculado"),
        rank: companyIdentity.rank ?? "—",
        squad: companyIdentity.squad || squads.join(", ") || localize("ETHERNUM.FieldCommunicator.Signal", "Canal operacional"),
        online: true,
      },
      signal: {
        label: localize("ETHERNUM.FieldCommunicator.Signal", "Seguro"),
        bars: [true, true, true, true].map(active => ({ active })),
      },
      aether: {
        value: Math.max(0, number(ether.etherCurrent, 0)),
        max: Math.max(0, number(ether.etherMax, 0)),
      },
      notificationCount: 0,
      worldTime: {
        iso: now.toISOString(),
        label: now.toLocaleTimeString(game.i18n?.lang ?? "pt-BR", { hour: "2-digit", minute: "2-digit" }),
      },
      isGM: Boolean(game.user?.isGM),
      hasActor: Boolean(actor),
      state: {
        noActor: !actor,
        permissionDenied: false,
        documentUnavailable: false,
        maintenance: false,
      },
      homeMessage: localize("ETHERNUM.FieldCommunicator.HomeMessage", "Acesso seguro aos recursos de campo da companhia."),
      sync: { pending: false, label: localize("ETHERNUM.FieldCommunicator.Synchronized", "Dados sincronizados") },
      bootStatus: localize("ETHERNUM.FieldCommunicator.BootStatus", "Autenticando canal de Éter"),
      bootSteps: [
        { label: "Núcleo", complete: true },
        { label: "Identidade", complete: true },
        { label: "Canal", current: true },
      ],
      motionMode: preferences.motion,
      highContrast: preferences.highContrast,
      textScale: preferences.textScale === "large" ? 1.12 : 1,
      glowIntensity: preferences.brightness === "low" ? 0.08 : preferences.brightness === "high" ? 0.25 : 0.16,
      settings: {
        ...preferences,
        bootAlways: preferences.boot === "always",
        bootSession: preferences.boot === "session",
        bootOff: preferences.boot === "off",
        motionFull: preferences.motion === "full",
        motionReduced: preferences.motion === "reduced",
        motionOff: preferences.motion === "off",
        textNormal: preferences.textScale === "normal",
        textLarge: preferences.textScale === "large",
        brightnessLow: preferences.brightness === "low",
        brightnessNormal: preferences.brightness === "normal",
        brightnessHigh: preferences.brightness === "high",
        notificationsAll: preferences.notifications === "all",
        notificationsPriority: preferences.notifications === "priority",
        notificationsOff: preferences.notifications === "off",
      },
      ...(game.user?.isGM ? {
        adminApps: registry.apps.map(app => ({
          ...app,
          label: appLabel(app),
          description: appDescription(app),
          targetLabel: app.internalTarget ?? app.targetUuid ?? app.targetUrl ?? "Interno",
          canRemove: app.source === "custom",
        })),
        previewUsers: activeUsers,
        previewUserId: previewUser?.id ?? "",
        previewMode: Boolean(previewUser),
        registryVersion: registry.schemaVersion,
      } : {}),
      preferences,
    };
  }

  async openRegisteredApp(appId: string, previewUserId?: string | null): Promise<boolean> {
    const app = this.getRegistry().apps.find(candidate => candidate.id === appId);
    if (!app?.enabled) {
      throw new Error(localize("ETHERNUM.FieldCommunicator.Errors.NoPermission", "Acesso negado."));
    }
    const previewUser = previewUserId && game.user?.isGM
      ? collection<UserWithCharacter>(game.users).find(user => user.id === previewUserId) ?? null
      : null;
    const subjectUser = previewUser ?? game.user as UserWithCharacter | null;
    const actor = this.getAssignedActor(subjectUser);
    const identity = CompanyIdentityService.resolve(actor);
    const allowed = filterFieldCommunicatorApps([app], {
      rank: identity.rank,
      agentId: actor?.id ?? undefined,
      squadIds: identity.squadIds,
    }).length === 1;
    if (!allowed || !(await this.canAccessUnlock(app, actor, subjectUser)) || !(await this.canAccessTarget(app, subjectUser))) {
      throw new Error(localize("ETHERNUM.FieldCommunicator.Errors.NoPermission", "Acesso negado."));
    }
    return this.openCustomApp(app);
  }

  async openDocument(uuid: string): Promise<boolean> {
    const document = await this.resolveUuid(uuid);
    if (!document) throw new Error(localize("ETHERNUM.FieldCommunicator.Errors.BrokenTarget", "Arquivo indisponível."));
    if (!this.canObserve(document)) throw new Error(localize("ETHERNUM.FieldCommunicator.Errors.NoPermission", "Acesso negado."));
    if (typeof document.view === "function") {
      await document.view();
      return true;
    }
    if (typeof document.activate === "function") {
      await document.activate();
      return true;
    }
    document.sheet?.render?.(true);
    if (!document.sheet?.render && typeof document.render === "function") document.render(true);
    return true;
  }

  async resolveContractDocumentTarget(
    contractId: string,
    attachmentId?: string,
    previewUserId?: string | null,
  ) {
    return this.contractArchive.resolveDocumentTarget(contractId, attachmentId, previewUserId);
  }

  async openContractDocumentExternal(
    contractId: string,
    attachmentId?: string,
    previewUserId?: string | null,
  ): Promise<boolean> {
    const target = await this.resolveContractDocumentTarget(contractId, attachmentId, previewUserId);
    if (!target) throw new Error(localize("ETHERNUM.FieldCommunicator.Errors.NoPermission", "Acesso negado."));
    if (target.uuid) return this.openDocument(target.uuid);
    const source = text(target.sourceUrl);
    if (!source.startsWith(`modules/${ETHERNUM.MODULE_NAME}/assets/`)) {
      throw new Error(localize("ETHERNUM.FieldCommunicator.Errors.BrokenTarget", "Arquivo indisponível."));
    }
    const url = new URL(source, globalThis.location?.href ?? "http://localhost/");
    if (globalThis.location?.origin && url.origin !== globalThis.location.origin) {
      throw new Error(localize("ETHERNUM.FieldCommunicator.Errors.NoPermission", "Acesso negado."));
    }
    globalThis.open?.(url.href, "_blank", "noopener,noreferrer");
    return true;
  }

  async openCustomApp(app: FieldCommunicatorApp): Promise<boolean> {
    if (app.type === "external") {
      const url = text(app.targetUrl);
      if (!/^https?:\/\//i.test(url)) throw new Error("Invalid external URL.");
      return this.confirmExternal(url);
    }
    if (!app.targetUuid) throw new Error(localize("ETHERNUM.FieldCommunicator.Errors.BrokenTarget", "Arquivo indisponível."));
    return this.openDocument(app.targetUuid);
  }

  async sendGroupMessage(content: string): Promise<void> {
    const message = text(content).slice(0, 4_000);
    if (!message) return;
    const actor = this.getAssignedActor();
    await ChatMessage.create({
      content: `<p>${escaped(message)}</p>`,
      speaker: ChatMessage.getSpeaker({ actor: actor ?? undefined }),
      flags: { [ETHERNUM.MODULE_NAME]: { fieldCommunicator: { channel: "group" } } },
    } as never);
  }

  async sendPrivateMessage(recipientId: string, content: string): Promise<void> {
    const message = text(content).slice(0, 4_000);
    const recipient = collection<User>(game.users).find(user => user.id === recipientId);
    if (!message || !recipient) return;
    const actor = this.getAssignedActor();
    const whisper = Array.from(new Set([recipient.id, game.user?.id].filter((id): id is string => Boolean(id))));
    await ChatMessage.create({
      content: `<p>${escaped(message)}</p>`,
      speaker: ChatMessage.getSpeaker({ actor: actor ?? undefined }),
      whisper,
      flags: { [ETHERNUM.MODULE_NAME]: { fieldCommunicator: { channel: "private" } } },
    } as never);
  }

  requestPurchase(entryId: string): Promise<CompanyStorePurchaseSubmission> {
    return this.companyStore.requestPurchase(entryId);
  }

  private async buildPanels(
    actor: Actor | null,
    registry: FieldCommunicatorRegistryData,
    viewer: UserWithCharacter | null,
    allowedPanelIds: ReadonlySet<string>,
    options: FieldCommunicatorBuildOptions & {
      contractArchive?: ContractArchiveSnapshot;
      store?: CompanyStoreSnapshot;
    } = {},
  ): Promise<Record<string, FieldCommunicatorPanelData>> {
    const scenes = this.documentEntries(collection<PermissionDocument>(game.scenes), "view-scene", viewer);
    const journals = collection<PermissionDocument>((game as Game & { journal?: Iterable<PermissionDocument> }).journal)
      .filter(document => this.canObserve(document, viewer));
    const journalEntries = (matcher?: RegExp) => this.documentEntries(
      matcher ? journals.filter(document => matcher.test(`${document.folder?.name ?? ""} ${document.name ?? ""}`)) : journals,
      "open-document",
      viewer,
    );
    const users = collection<UserWithCharacter>(game.users)
      .filter(user => user.active && !user.isGM)
      .map(user => this.userEntry(user, viewer));
    const messages = this.communicatorMessages();

    const panels = {
      sheet: this.panel("sheet", localize("ETHERNUM.FieldCommunicator.Apps.sheet.Label", "Ficha"), "sheet", {
        actor: actor ? createPF2eCharacterSnapshot(actor) : undefined,
        entries: actor ? [this.documentEntry(actor as unknown as PermissionDocument, "open-document")] : [],
      }),
      conversations: this.panel("conversations", localize("ETHERNUM.FieldCommunicator.Panels.Conversations", "Conversas privadas"), "conversations", {
        users,
        messages: messages.private,
      }),
      group: this.panel("group", localize("ETHERNUM.FieldCommunicator.Panels.Group", "Canal do grupo"), "group", {
        messages: messages.group,
      }),
      squad: this.panel("squad", localize("ETHERNUM.FieldCommunicator.Panels.Squad", "Esquadrão"), "squad", { entries: users }),
      map: this.panel("map", localize("ETHERNUM.FieldCommunicator.Panels.Map", "Mapas liberados"), "documents", { entries: scenes }),
      manual: this.panel("manual", localize("ETHERNUM.FieldCommunicator.Panels.Manual", "Manual da companhia"), "documents", {
        entries: journalEntries(/manual|protocolo|procedimento/i),
      }),
      dossiers: this.panel("dossiers", localize("ETHERNUM.FieldCommunicator.Panels.Dossiers", "Dossiês"), "documents", {
        entries: journalEntries(/dossi|ameaça|inteligência|intelligence/i),
      }),
      contracts: this.contractPanel(
        options.contractArchive ?? { schemaVersion: 1, revision: 0, contracts: [] },
        options.selectedContractId,
        options.documentViewer,
      ),
      files: this.panel("files", localize("ETHERNUM.FieldCommunicator.Panels.Files", "Arquivos"), "documents", {
        entries: journalEntries(),
      }),
      shop: this.panel("shop", localize("ETHERNUM.FieldCommunicator.Panels.Shop", "Loja"), "shop", {
        store: options.store,
        storeReceipt: options.storeReceipt,
      }),
      settings: this.panel("settings", localize("ETHERNUM.FieldCommunicator.Panels.Settings", "Ajustes"), "settings", {
        settings: this.clientSettings(),
      }),
      administration: this.panel("administration", localize("ETHERNUM.FieldCommunicator.Panels.Administration", "Aplicativos do mestre"), "admin", {
        registry,
        isGM: Boolean(game.user?.isGM),
      }),
    };
    return Object.fromEntries(
      Object.entries(panels).filter(([panelId]) => allowedPanelIds.has(panelId)),
    );
  }

  private panel(
    id: string,
    title: string,
    kind: string,
    data: Partial<FieldCommunicatorPanelData>,
  ): FieldCommunicatorPanelData {
    const entries = data.entries ?? data.messages ?? [];
    const sections: Array<Record<string, unknown>> = [];
    if (data.users) sections.push(this.section(`${id}-users`, "Agentes", "fa-solid fa-users", data.users));
    if (data.entries) sections.push(this.section(`${id}-records`, kind === "shop" ? "Itens disponíveis" : "Registros", kind === "shop" ? "fa-solid fa-store" : "fa-solid fa-folder-open", data.entries));
    if (data.messages) sections.push(this.section(`${id}-messages`, "Transmissões recentes", "fa-solid fa-message", data.messages));
    return {
      id,
      title,
      description: this.panelDescription(kind),
      kind,
      ...data,
      sections,
      isGroup: kind === "group",
      isConversations: kind === "conversations",
      isContracts: kind === "contracts",
      isShop: kind === "shop",
      isSettings: kind === "settings",
      isAdmin: kind === "admin",
      empty: entries.length === 0,
    };
  }

  private contractPanel(
    archive: ContractArchiveSnapshot,
    selectedContractId?: string | null,
    documentViewer?: CommunicatorDocumentViewerData,
  ): FieldCommunicatorPanelData {
    const selectedContract = selectedContractId
      ? archive.contracts.find(contract => contract.id === selectedContractId)
      : undefined;
    const groupDefinitions: Array<{
      id: string;
      title: string;
      icon: string;
      statuses: EthernumContractDTO["status"][];
    }> = [
      { id: "active", title: "Ativo", icon: "fa-solid fa-satellite-dish", statuses: ["accepted", "active"] },
      { id: "available", title: "Disponíveis", icon: "fa-solid fa-file-signature", statuses: ["available"] },
      { id: "completed", title: "Concluídos", icon: "fa-solid fa-circle-check", statuses: ["completed", "failed"] },
      { id: "archived", title: "Arquivados", icon: "fa-solid fa-box-archive", statuses: ["archived"] },
    ];
    const contractGroups = groupDefinitions.flatMap(group => {
      const contracts = archive.contracts.filter(contract => group.statuses.includes(contract.status));
      if (contracts.length === 0 && group.id !== "active") return [];
      return [{
        ...group,
        count: contracts.length,
        items: contracts.map(contract => ({
          id: contract.id,
          numberLabel: `Contrato ${String(contract.number).padStart(2, "0")}`,
          label: contract.title,
          description: [contract.location, contract.statusLabel].filter(Boolean).join(" · "),
          grade: contract.grade,
          status: contract.status,
          action: "open-contract",
        })),
      }];
    });
    return this.panel(
      "contracts",
      localize("ETHERNUM.FieldCommunicator.Panels.Contracts", "Contratos"),
      "contracts",
      {
        contractArchive: archive,
        contractGroups,
        selectedContract,
        documentViewer,
      },
    );
  }

  private section(id: string, title: string, icon: string, entries: FieldCommunicatorEntry[]): Record<string, unknown> {
    return {
      id,
      title,
      icon,
      meta: String(entries.length),
      items: entries.map(entry => ({
        id: entry.id,
        label: entry.name,
        description: entry.status || entry.subtitle || "",
        icon: entry.icon ?? "fa-solid fa-file-lines",
        badge: entry.badge,
        action: entry.action,
        targetId: entry.targetId ?? entry.uuid,
        available: !entry.disabled && Boolean(entry.action),
      })),
    };
  }

  private panelDescription(kind: string): string {
    const descriptions: Record<string, string> = {
      sheet: "Resumo operacional do agente vinculado.",
      conversations: "Canal privado entre agentes ativos.",
      group: "Transmissão compartilhada do grupo.",
      squad: "Situação atual dos agentes conectados.",
      documents: "Documentos liberados pelas permissões do mundo.",
      contracts: "Arquivo operacional com contratos liberados para este perfil.",
      shop: "Catálogo com solicitação de compra ao mestre.",
      settings: "Preferências locais deste comunicador.",
      admin: "Registro de aplicativos administrado pelo mestre.",
    };
    return descriptions[kind] ?? "Canal operacional Ethernum.";
  }

  private documentEntries(documents: PermissionDocument[], action: string, viewer: UserWithCharacter | null): FieldCommunicatorEntry[] {
    return documents
      .filter(document => this.canObserve(document, viewer))
      .sort((left, right) => text(left.name).localeCompare(text(right.name), game.i18n?.lang ?? "pt-BR"))
      .map(document => this.documentEntry(document, action));
  }

  private documentEntry(document: PermissionDocument, action: string): FieldCommunicatorEntry {
    const system = record(document.system);
    const details = record(system.details);
    const level = number(record(details.level).value ?? system.level, NaN);
    return {
      id: text(document.id || document.uuid || document.name),
      uuid: text(document.uuid) || undefined,
      name: text(document.name) || localize("ETHERNUM.FieldCommunicator.States.Unavailable", "ARQUIVO INDISPONÍVEL"),
      image: text(document.img || document.thumb) || undefined,
      subtitle: Number.isFinite(level) ? `Nível ${level}` : text(document.type),
      action,
      targetId: text(document.uuid) || undefined,
    };
  }

  private userEntry(user: UserWithCharacter, viewer: UserWithCharacter | null): FieldCommunicatorEntry {
    const actor = user.character;
    return {
      id: text(user.id),
      targetId: text(actor?.uuid) || undefined,
      uuid: actor?.uuid,
      name: text(actor?.name || user.name),
      image: text((actor as Actor & { img?: string } | null)?.img) || undefined,
      subtitle: user.active ? localize("ETHERNUM.FieldCommunicator.Signal", "Canal operacional") : "Offline",
      action: actor && this.canObserve(actor, viewer) ? "open-document" : undefined,
      disabled: Boolean(actor && !this.canObserve(actor, viewer)),
    };
  }

  private communicatorMessages(): { group: FieldCommunicatorEntry[]; private: FieldCommunicatorEntry[] } {
    const currentUserId = game.user?.id;
    const limit = Math.max(10, Math.min(500, number(game.settings?.get(
      ETHERNUM.MODULE_NAME,
      "fieldCommunicatorGroupHistoryLimit",
    ), 100)));
    const messages = collection<CommunicatorMessage>((game as Game & { messages?: Iterable<CommunicatorMessage> }).messages)
      .slice(-limit)
      .reverse();
    const convert = (message: CommunicatorMessage): FieldCommunicatorEntry => ({
      id: text(message.id || message.uuid),
      name: text(message.speaker?.alias || message.author?.name || message.user?.name) || "Ethernum",
      subtitle: new Date(number(message.timestamp, Date.now())).toLocaleTimeString(game.i18n?.lang ?? "pt-BR", { hour: "2-digit", minute: "2-digit" }),
      status: stripMarkup(message.content).slice(0, 800),
    });
    const channel = (message: CommunicatorMessage): string => text(
      record(record(message.flags)?.[ETHERNUM.MODULE_NAME]).fieldCommunicator
        ? record(record(record(message.flags)?.[ETHERNUM.MODULE_NAME]).fieldCommunicator).channel
        : "",
    );
    return {
      group: messages.filter(message => channel(message) === "group").map(convert),
      private: messages.filter(message => {
        if (channel(message) !== "private") return false;
        return !message.whisper?.length || Boolean(currentUserId && message.whisper.includes(currentUserId));
      }).map(convert),
    };
  }

  private clientSettings(): Record<string, unknown> {
    const read = (key: string, fallback: unknown) => {
      try { return game.settings?.get(ETHERNUM.MODULE_NAME, key as never) ?? fallback; } catch { return fallback; }
    };
    return {
      boot: read("fieldCommunicatorBoot", "session"),
      motion: getFieldCommunicatorMotionMode(),
      sounds: read("fieldCommunicatorSounds", false),
      textScale: read("fieldCommunicatorTextScale", "normal"),
      brightness: read("fieldCommunicatorBrightness", "normal"),
      highContrast: read("fieldCommunicatorHighContrast", false),
      notifications: read("fieldCommunicatorNotifications", "all"),
    };
  }

  private canObserve(document: PermissionDocument | Actor, viewer: UserWithCharacter | null = game.user as UserWithCharacter | null): boolean {
    if (viewer?.isGM) return true;
    const user = viewer;
    if (!user) return false;
    if (typeof document.testUserPermission === "function") {
      try { return document.testUserPermission(user, "OBSERVER"); } catch { return false; }
    }
    return document.visible === true;
  }

  private async canAccessTarget(app: FieldCommunicatorApp, viewer: UserWithCharacter | null): Promise<boolean> {
    if (!app.enabled) return true;
    if (app.type === "external" || app.type === "internal") return true;
    if (!app.targetUuid) return true;
    const document = await this.resolveUuid(app.targetUuid);
    return Boolean(document && this.canObserve(document, viewer));
  }

  private async canAccessUnlock(
    app: FieldCommunicatorApp,
    actor: Actor | null,
    user: UserWithCharacter | null,
  ): Promise<boolean> {
    const unlock = app.unlock;
    if (!unlock) return true;
    let value: unknown;
    if (unlock.kind === "actor-flag") {
      value = actor?.getFlag(ETHERNUM.MODULE_NAME, unlock.key);
    } else if (unlock.kind === "user-flag") {
      value = (user as unknown as { getFlag?: (namespace: string, key: string) => unknown } | null)
        ?.getFlag?.(ETHERNUM.MODULE_NAME, unlock.key);
    } else if (unlock.kind === "world-setting") {
      const [namespace, ...path] = unlock.key.split(".");
      const settingKey = path.join(".");
      try {
        const settings = game.settings as unknown as { get: (namespace: string, key: string) => unknown };
        value = settingKey
          ? settings.get(namespace, settingKey)
          : settings.get(ETHERNUM.MODULE_NAME, namespace);
      } catch {
        return false;
      }
    } else if (unlock.kind === "document-exists") {
      value = Boolean(await this.resolveUuid(unlock.key));
    }
    return unlock.equals === undefined ? Boolean(value) : value === unlock.equals;
  }

  private async resolveUuid(uuid: string): Promise<PermissionDocument | null> {
    if (!uuid || typeof fromUuid !== "function") return null;
    try {
      return await (fromUuid as unknown as (value: string) => Promise<PermissionDocument | null>)(uuid);
    } catch {
      return null;
    }
  }

  private confirmExternal(url: string): Promise<boolean> {
    return new Promise(resolve => {
      new Dialog({
        title: localize("ETHERNUM.FieldCommunicator.Actions.ConfirmExternal", "Abrir link externo"),
        content: `<p>${escaped(localize("ETHERNUM.FieldCommunicator.Messages.ExternalConfirm", "Este endereço será aberto fora do Foundry:"))}</p><p><code>${escaped(url)}</code></p>`,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-up-right-from-square"></i>',
            label: localize("ETHERNUM.FieldCommunicator.Actions.ConfirmExternal", "Abrir link externo"),
            callback: () => {
              globalThis.open(url, "_blank", "noopener,noreferrer");
              resolve(true);
            },
          },
          cancel: { label: localize("ETHERNUM.Buttons.Close", "Fechar"), callback: () => resolve(false) },
        },
        default: "cancel",
        close: () => resolve(false),
      }).render(true);
    });
  }
}
