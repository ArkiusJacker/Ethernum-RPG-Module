import type { AdministrativeContractRow, AdministrativeSquadRow, AdministrativeStoreRow } from "../administration/AdministrativeCommunicatorTypes.js";
import type { CompanyRewardRecord } from "../rewards/CompanyRewardTypes.js";
import type { EmergencyBroadcastDTO } from "../communicator/EmergencyBroadcastService.js";

export const GM_CONTROL_I18N_ROOT = "ETHERNUM.GMControl";

export const GM_CONTROL_SECTIONS = [
  "operations",
  "contracts",
  "squads",
  "intelligence",
  "store",
  "requisitions",
  "rewards",
  "broadcast",
  "audit",
  "system",
] as const;

export const GM_CONTROL_THEMES = ["ethernum", "concordia"] as const;
export const GM_CONTROL_QUEUE_STATUSES = [
  "queued",
  "approved",
  "rejected",
  "executed",
  "failed",
  "cancelled",
  "expired",
  "duplicate",
] as const;
export const GM_CONTROL_POLICY_MODES = ["auto", "approval", "deny", "log"] as const;
export const GM_CONTROL_POLICY_CATEGORIES = [
  "actor-damage",
  "actor-healing",
  "condition",
  "effect",
  "canvas",
  "multi-target",
  "reaction",
  "out-of-turn",
] as const;

export type GMControlSection = typeof GM_CONTROL_SECTIONS[number];
export type GMControlTheme = typeof GM_CONTROL_THEMES[number];
export type GMControlQueueStatus = typeof GM_CONTROL_QUEUE_STATUSES[number];
export type GMControlPolicyMode = typeof GM_CONTROL_POLICY_MODES[number];
export type GMControlPolicyCategory = typeof GM_CONTROL_POLICY_CATEGORIES[number];
export type GMControlAuditPeriod = "all" | "hour" | "day" | "week";
export type GMControlTone = "neutral" | "info" | "success" | "warning" | "danger";
export type GMControlQueueAction = "approve" | "reject" | "approve-trust" | "details" | "payload";
export type GMControlAuditAction = "details" | "clear" | "export";
export type GMControlDiagnosticsAction = "refresh" | "clear-expired" | "reconcile" | "copy";
export type GMControlAdminAction =
  | "grant-fulgor"
  | "cleanup-expired"
  | "clear-audit"
  | "reconcile-orphans"
  | "cancel-stuck"
  | "export-data";

export interface GMControlSummary {
  pending: number;
  approved: number;
  rejected: number;
  failures: number;
  onlineGMs: number;
  averageLatencyMs: number;
}

export interface GMControlQueueItem {
  id: string;
  requestId: string;
  status: GMControlQueueStatus;
  createdAt: number;
  expiresAt?: number;
  userId?: string;
  userName?: string;
  actorId?: string;
  actorName?: string;
  actorUuid?: string;
  itemUuid?: string;
  profileId?: string;
  profileName?: string;
  actionType?: string;
  actionName?: string;
  summary?: string;
  payload?: unknown;
  trustEligible?: boolean;
  approvable?: boolean;
}

export interface GMControlAuditEntry {
  id: string;
  requestId?: string;
  status: GMControlQueueStatus;
  timestamp: number;
  userId?: string;
  userName?: string;
  actorId?: string;
  actorName?: string;
  profileId?: string;
  profileName?: string;
  actionType?: string;
  actionName?: string;
  message?: string;
  durationMs?: number;
  payload?: unknown;
}

export interface GMControlPolicy {
  id: string;
  category: GMControlPolicyCategory;
  mode: GMControlPolicyMode;
  profileId?: string;
  profileName?: string;
  inherited?: boolean;
  disabled?: boolean;
}

export interface GMControlDiagnostic {
  id: string;
  labelKey: string;
  value: string | number;
  tone?: GMControlTone;
  detail?: string;
}

export interface GMControlActorOption {
  id: string;
  name: string;
  disabled?: boolean;
}

export interface GMControlFilterOption {
  value: string;
  label: string;
}

export interface GMControlAuditFilters {
  status: GMControlQueueStatus | "all";
  userId: string;
  profileId: string;
  actionType: string;
  actorId: string;
  period: GMControlAuditPeriod;
  search: string;
}

export interface GMControlCenterSnapshot {
  summary?: Partial<GMControlSummary>;
  queue?: GMControlQueueItem[];
  audit?: GMControlAuditEntry[];
  policies?: GMControlPolicy[];
  diagnostics?: GMControlDiagnostic[];
  actors?: GMControlActorOption[];
  userOptions?: GMControlFilterOption[];
  profileOptions?: GMControlFilterOption[];
  actionTypeOptions?: GMControlFilterOption[];
  actorOptions?: GMControlFilterOption[];
  updatedAt?: number;
  commandDevice?: {
    archiveRevision: number;
    storeRevision: number;
    identityRevision: number;
    rewardRevision: number;
    primaryGM: string;
    primaryReady: boolean;
  };
  contracts?: AdministrativeContractRow[];
  storeEntries?: AdministrativeStoreRow[];
  squads?: AdministrativeSquadRow[];
  intelligence?: AdministrativeContractRow[];
  rewards?: CompanyRewardRecord[];
  broadcasts?: EmergencyBroadcastDTO[];
  requisitions?: GMControlQueueItem[];
  previewUsers?: GMControlFilterOption[];
  worldItems?: GMControlFilterOption[];
}

export interface GMControlCenterDataSource {
  getSnapshot(): GMControlCenterSnapshot | Promise<GMControlCenterSnapshot>;
}

export interface GMControlPolicyChange {
  policyId: string;
  category: GMControlPolicyCategory;
  profileId?: string;
  mode: GMControlPolicyMode;
}

export interface GMControlAdminPayload {
  actorId?: string;
  amount?: number;
}

export interface GMControlCenterCallbacks {
  onThemeChange?(theme: GMControlTheme): void | Promise<void>;
  onSectionChange?(section: GMControlSection): void | Promise<void>;
  onRefresh?(): void | Promise<void>;
  onQueueAction?(action: GMControlQueueAction, item: GMControlQueueItem): void | Promise<void>;
  onAuditAction?(
    action: GMControlAuditAction,
    context: { entry?: GMControlAuditEntry; filters: GMControlAuditFilters },
  ): void | Promise<void>;
  onAuditFiltersChange?(filters: GMControlAuditFilters): void | Promise<void>;
  onPolicyChange?(change: GMControlPolicyChange): void | Promise<void>;
  onDiagnosticsAction?(action: GMControlDiagnosticsAction): void | Promise<void>;
  onAdminAction?(action: GMControlAdminAction, payload: GMControlAdminPayload): void | Promise<void>;
  onDomainAction?(action: string, payload: Readonly<Record<string, string>>): void | Promise<void>;
}

export interface GMControlCenterBuildOptions {
  isGM: boolean;
  theme?: GMControlTheme;
  activeSection?: GMControlSection | "summary" | "queue" | "policies" | "diagnostics" | "admin";
  filters?: Partial<GMControlAuditFilters>;
  auditPage?: number;
  auditPageSize?: number;
  now?: number;
  locale?: string;
}

export interface GMControlAuditPagination {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  hasPrevious: boolean;
  hasNext: boolean;
  previousPage: number;
  nextPage: number;
}

export function paginateGMControlAuditEntries<T>(
  entries: readonly T[],
  requestedPage = 1,
  requestedPageSize = 50,
): { rows: T[]; pagination: GMControlAuditPagination } {
  const pageSize = Math.max(1, Math.min(100, Math.floor(requestedPageSize) || 50));
  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(totalPages, Math.floor(requestedPage) || 1));
  const start = (page - 1) * pageSize;
  const rows = entries.slice(start, start + pageSize);
  return {
    rows,
    pagination: {
      page,
      pageSize,
      totalPages,
      total,
      from: total === 0 ? 0 : start + 1,
      to: Math.min(start + pageSize, total),
      hasPrevious: page > 1,
      hasNext: page < totalPages,
      previousPage: Math.max(1, page - 1),
      nextPage: Math.min(totalPages, page + 1),
    },
  };
}

export const DEFAULT_GM_CONTROL_FILTERS: GMControlAuditFilters = Object.freeze({
  status: "all",
  userId: "",
  profileId: "",
  actionType: "",
  actorId: "",
  period: "all",
  search: "",
});

const SUMMARY_DEFINITIONS: ReadonlyArray<{
  id: keyof GMControlSummary;
  icon: string;
  tone: GMControlTone;
}> = [
  { id: "pending", icon: "fa-hourglass-half", tone: "warning" },
  { id: "approved", icon: "fa-circle-check", tone: "success" },
  { id: "rejected", icon: "fa-ban", tone: "danger" },
  { id: "failures", icon: "fa-triangle-exclamation", tone: "danger" },
  { id: "onlineGMs", icon: "fa-user-shield", tone: "info" },
  { id: "averageLatencyMs", icon: "fa-gauge-high", tone: "neutral" },
];

const SECTION_ICONS: Record<GMControlSection, string> = {
  operations: "fa-satellite-dish",
  contracts: "fa-file-signature",
  squads: "fa-people-group",
  intelligence: "fa-user-secret",
  store: "fa-store",
  requisitions: "fa-list-check",
  rewards: "fa-award",
  broadcast: "fa-tower-broadcast",
  audit: "fa-clock-rotate-left",
  system: "fa-screwdriver-wrench",
};

const QUEUE_ACTIONS: ReadonlyArray<{
  id: GMControlQueueAction;
  icon: string;
  tone: GMControlTone;
}> = [
  { id: "approve", icon: "fa-check", tone: "success" },
  { id: "reject", icon: "fa-xmark", tone: "danger" },
  { id: "approve-trust", icon: "fa-user-check", tone: "info" },
  { id: "details", icon: "fa-circle-info", tone: "neutral" },
  { id: "payload", icon: "fa-code", tone: "neutral" },
];

const DIAGNOSTIC_ACTIONS: ReadonlyArray<{ id: GMControlDiagnosticsAction; icon: string }> = [
  { id: "refresh", icon: "fa-rotate" },
  { id: "clear-expired", icon: "fa-hourglass-end" },
  { id: "reconcile", icon: "fa-arrows-rotate" },
  { id: "copy", icon: "fa-copy" },
];

const ADMIN_ACTIONS: ReadonlyArray<{ id: GMControlAdminAction; icon: string; tone: GMControlTone }> = [
  { id: "grant-fulgor", icon: "fa-bolt", tone: "success" },
  { id: "cleanup-expired", icon: "fa-broom", tone: "neutral" },
  { id: "clear-audit", icon: "fa-trash-can", tone: "danger" },
  { id: "reconcile-orphans", icon: "fa-link", tone: "info" },
  { id: "cancel-stuck", icon: "fa-stop", tone: "warning" },
  { id: "export-data", icon: "fa-file-export", tone: "neutral" },
];

function i18nKey(path: string): string {
  return `${GM_CONTROL_I18N_ROOT}.${path}`;
}

function normalizeFilters(filters: Partial<GMControlAuditFilters> = {}): GMControlAuditFilters {
  const status = filters.status && (filters.status === "all" || GM_CONTROL_QUEUE_STATUSES.includes(filters.status))
    ? filters.status
    : "all";
  const period = filters.period && ["all", "hour", "day", "week"].includes(filters.period)
    ? filters.period
    : "all";
  return {
    ...DEFAULT_GM_CONTROL_FILTERS,
    ...filters,
    status,
    period,
    search: String(filters.search ?? "").trim(),
  };
}

function periodStart(period: GMControlAuditPeriod, now: number): number {
  if (period === "hour") return now - 60 * 60 * 1_000;
  if (period === "day") return now - 24 * 60 * 60 * 1_000;
  if (period === "week") return now - 7 * 24 * 60 * 60 * 1_000;
  return Number.NEGATIVE_INFINITY;
}

function contains(haystack: unknown, needle: string): boolean {
  return String(haystack ?? "").toLocaleLowerCase().includes(needle);
}

export function filterGMControlAuditEntries(
  entries: readonly GMControlAuditEntry[],
  filterInput: Partial<GMControlAuditFilters>,
  now = Date.now(),
): GMControlAuditEntry[] {
  const filters = normalizeFilters(filterInput);
  const query = filters.search.toLocaleLowerCase();
  const earliest = periodStart(filters.period, now);
  return entries.filter(entry => {
    if (filters.status !== "all" && entry.status !== filters.status) return false;
    if (filters.userId && entry.userId !== filters.userId) return false;
    if (filters.profileId && entry.profileId !== filters.profileId) return false;
    if (filters.actionType && entry.actionType !== filters.actionType) return false;
    if (filters.actorId && entry.actorId !== filters.actorId) return false;
    if (entry.timestamp < earliest) return false;
    if (!query) return true;
    return [
      entry.id,
      entry.requestId,
      entry.userName,
      entry.actorName,
      entry.profileName,
      entry.actionType,
      entry.actionName,
      entry.message,
      entry.status,
    ].some(value => contains(value, query));
  });
}

function safeTheme(theme: GMControlTheme | undefined): GMControlTheme {
  return theme && GM_CONTROL_THEMES.includes(theme) ? theme : "ethernum";
}

function safeSection(section: GMControlCenterBuildOptions["activeSection"]): GMControlSection {
  const aliases: Record<string, GMControlSection> = {
    summary: "operations",
    queue: "requisitions",
    policies: "system",
    diagnostics: "system",
    admin: "system",
  };
  const normalized = section ? aliases[section] ?? section : undefined;
  return normalized && GM_CONTROL_SECTIONS.includes(normalized as GMControlSection) ? normalized as GMControlSection : "operations";
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return JSON.stringify({ error: i18nKey("Errors.PayloadSerialization") }, null, 2);
  }
}

function timestamp(value: number | undefined, locale: string): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value as number));
}

function optionRows(
  values: readonly GMControlFilterOption[] | undefined,
  selected: string,
): Array<GMControlFilterOption & { selected: boolean }> {
  return (values ?? []).map(option => ({ ...option, selected: option.value === selected }));
}

export function buildGMControlCenterData(
  snapshot: GMControlCenterSnapshot,
  options: GMControlCenterBuildOptions,
): Record<string, unknown> {
  const now = options.now ?? Date.now();
  const locale = options.locale || "pt-BR";
  const theme = safeTheme(options.theme);
  const activeSection = safeSection(options.activeSection);
  const filters = normalizeFilters(options.filters);
  const summary: GMControlSummary = {
    pending: snapshot.summary?.pending ?? snapshot.queue?.filter(item => item.status === "queued").length ?? 0,
    approved: snapshot.summary?.approved ?? 0,
    rejected: snapshot.summary?.rejected ?? 0,
    failures: snapshot.summary?.failures ?? 0,
    onlineGMs: snapshot.summary?.onlineGMs ?? 0,
    averageLatencyMs: snapshot.summary?.averageLatencyMs ?? 0,
  };
  const queue = [...(snapshot.queue ?? [])].sort((left, right) => left.createdAt - right.createdAt);
  const requisitions = [...(snapshot.requisitions ?? queue)].sort((left, right) => left.createdAt - right.createdAt);
  const filteredAudit = filterGMControlAuditEntries(snapshot.audit ?? [], filters, now)
    .sort((left, right) => right.timestamp - left.timestamp);
  const paginatedAudit = paginateGMControlAuditEntries(
    filteredAudit,
    options.auditPage,
    options.auditPageSize,
  );

  const sections = GM_CONTROL_SECTIONS.map(id => ({
    id,
    icon: SECTION_ICONS[id],
    labelKey: i18nKey(`Sections.${id}`),
    active: id === activeSection,
  }));
  const panels = Object.fromEntries(sections.map(section => [section.id, { active: section.active }])) as Record<string, { active: boolean }>;
  panels.summary = panels.operations;
  panels.queue = panels.requisitions;
  panels.policies = panels.system;
  panels.diagnostics = panels.system;
  panels.admin = panels.system;

  return {
    isGM: options.isGM,
    theme,
    themes: GM_CONTROL_THEMES.map(id => ({
      id,
      labelKey: i18nKey(`Themes.${id}`),
      active: id === theme,
    })),
    activeSection,
    sections,
    panels,
    summaryItems: SUMMARY_DEFINITIONS.map(definition => ({
      ...definition,
      labelKey: i18nKey(`Summary.${definition.id}`),
      value: summary[definition.id],
    })),
    queueRows: queue.map(item => ({
      ...item,
      createdLabel: timestamp(item.createdAt, locale),
      expiresLabel: timestamp(item.expiresAt, locale),
      statusLabelKey: i18nKey(`Statuses.${item.status}`),
      payloadPreview: safeJson(item.payload),
      actions: QUEUE_ACTIONS.filter(action => {
        if (action.id === "approve" || action.id === "reject") return item.approvable !== false && item.status === "queued";
        if (action.id === "approve-trust") return item.trustEligible === true && item.status === "queued";
        if (action.id === "payload") return item.payload !== undefined;
        return true;
      }).map(action => ({ ...action, labelKey: i18nKey(`Queue.Actions.${action.id}`) })),
    })),
    queueEmpty: queue.length === 0,
    requisitionRows: requisitions.map(item => ({
      ...item,
      createdLabel: timestamp(item.createdAt, locale),
      expiresLabel: timestamp(item.expiresAt, locale),
      statusLabelKey: i18nKey(`Statuses.${item.status}`),
      actions: QUEUE_ACTIONS.filter(action => {
        if (action.id === "approve" || action.id === "reject") return item.approvable !== false && item.status === "queued";
        if (action.id === "approve-trust") return false;
        if (action.id === "payload") return item.payload !== undefined;
        return true;
      }).map(action => ({ ...action, labelKey: i18nKey(`Queue.Actions.${action.id}`) })),
    })),
    requisitionsEmpty: requisitions.length === 0,
    auditRows: paginatedAudit.rows.map(entry => ({
      ...entry,
      timestampLabel: timestamp(entry.timestamp, locale),
      statusLabelKey: i18nKey(`Statuses.${entry.status}`),
      payloadPreview: safeJson(entry.payload),
    })),
    auditEmpty: filteredAudit.length === 0,
    auditCount: filteredAudit.length,
    auditPagination: paginatedAudit.pagination,
    filters,
    statusOptions: [
      { value: "all", labelKey: i18nKey("Filters.AllStatuses"), selected: filters.status === "all" },
      ...GM_CONTROL_QUEUE_STATUSES.map(value => ({
        value,
        labelKey: i18nKey(`Statuses.${value}`),
        selected: filters.status === value,
      })),
    ],
    periodOptions: (["all", "hour", "day", "week"] as const).map(value => ({
      value,
      labelKey: i18nKey(`Periods.${value}`),
      selected: filters.period === value,
    })),
    userOptions: optionRows(snapshot.userOptions, filters.userId),
    profileOptions: optionRows(snapshot.profileOptions, filters.profileId),
    actionTypeOptions: optionRows(snapshot.actionTypeOptions, filters.actionType),
    actorOptions: optionRows(snapshot.actorOptions, filters.actorId),
    policies: (snapshot.policies ?? []).map(policy => ({
      ...policy,
      categoryLabelKey: i18nKey(`Policies.Categories.${policy.category}`),
      scopeLabelKey: i18nKey(policy.profileId ? "Policies.ProfileOverride" : "Policies.WorldDefault"),
      modeOptions: GM_CONTROL_POLICY_MODES.map(mode => ({
        value: mode,
        labelKey: i18nKey(`Policies.Modes.${mode}`),
        selected: mode === policy.mode,
      })),
    })),
    policiesEmpty: (snapshot.policies?.length ?? 0) === 0,
    diagnostics: (snapshot.diagnostics ?? []).map(item => ({
      ...item,
      tone: item.tone ?? "neutral",
    })),
    diagnosticsEmpty: (snapshot.diagnostics?.length ?? 0) === 0,
    diagnosticActions: DIAGNOSTIC_ACTIONS.map(action => ({
      ...action,
      labelKey: i18nKey(`Diagnostics.Actions.${action.id}`),
    })),
    adminActions: ADMIN_ACTIONS.map(action => ({
      ...action,
      labelKey: i18nKey(`Admin.Actions.${action.id}`),
      descriptionKey: i18nKey(`Admin.Descriptions.${action.id}`),
      requiresActor: action.id === "grant-fulgor",
    })),
    actors: (snapshot.actors ?? []).map(actor => ({ ...actor, selected: false })),
    actorsEmpty: (snapshot.actors?.length ?? 0) === 0,
    commandDevice: snapshot.commandDevice ?? {
      archiveRevision: 0,
      storeRevision: 0,
      identityRevision: 0,
      rewardRevision: 0,
      primaryGM: "-",
      primaryReady: false,
    },
    contracts: (snapshot.contracts ?? []).map(contract => ({ ...contract, canActivate: contract.status !== "active", canComplete: contract.status !== "completed", canArchive: contract.status !== "archived" })),
    contractsEmpty: (snapshot.contracts?.length ?? 0) === 0,
    storeEntries: snapshot.storeEntries ?? [],
    storeEntriesEmpty: (snapshot.storeEntries?.length ?? 0) === 0,
    squads: snapshot.squads ?? [],
    squadsEmpty: (snapshot.squads?.length ?? 0) === 0,
    intelligence: snapshot.intelligence ?? [],
    intelligenceEmpty: (snapshot.intelligence?.length ?? 0) === 0,
    rewards: (snapshot.rewards ?? []).map(reward => ({
      ...reward,
      timestampLabel: timestamp(reward.completedAt ?? reward.updatedAt, locale),
      rewardLabel: [reward.itemName, reward.currency, reward.xpMetadata ? `${reward.xpMetadata} XP (metadata)` : "", reward.epMetadata ? `${reward.epMetadata} EP` : "", reward.commendation].filter(Boolean).join(" · "),
    })),
    rewardsEmpty: (snapshot.rewards?.length ?? 0) === 0,
    broadcasts: (snapshot.broadcasts ?? []).map(broadcast => ({ ...broadcast, timestampLabel: timestamp(broadcast.createdAt, locale) })),
    broadcastsEmpty: (snapshot.broadcasts?.length ?? 0) === 0,
    previewUsers: snapshot.previewUsers ?? [],
    worldItems: snapshot.worldItems ?? [],
    updatedAtLabel: timestamp(snapshot.updatedAt ?? now, locale),
    i18nRoot: GM_CONTROL_I18N_ROOT,
  };
}
