import {
  FIELD_COMMUNICATOR_APP_TYPES,
  FIELD_COMMUNICATOR_APP_VERSION,
  FIELD_COMMUNICATOR_SCHEMA_VERSION,
  OFFICIAL_FIELD_COMMUNICATOR_APP_IDS,
  type FieldCommunicatorAccessContext,
  type FieldCommunicatorApp,
  type FieldCommunicatorAppSource,
  type FieldCommunicatorAppType,
  type FieldCommunicatorBadge,
  type FieldCommunicatorImportResult,
  type FieldCommunicatorJsonPrimitive,
  type FieldCommunicatorRegistryData,
  type FieldCommunicatorResetOptions,
  type FieldCommunicatorUnlockCondition,
  type OfficialFieldCommunicatorAppId,
} from "./FieldCommunicatorTypes.js";

const MAX_ID_LENGTH = 64;
const MAX_LABEL_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 320;
const MAX_ICON_LENGTH = 512;
const MAX_TARGET_LENGTH = 512;
const MAX_URL_LENGTH = 2_048;
const MAX_ORDER = 1_000_000;
const MAX_RANK = 10_000;
const ORDER_STEP = 10;

const APP_TYPES = new Set<string>(FIELD_COMMUNICATOR_APP_TYPES);
const OFFICIAL_IDS = new Set<string>(OFFICIAL_FIELD_COMMUNICATOR_APP_IDS);
const DANGEROUS_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "javascript",
  "script",
  "code",
  "callback",
  "handler",
]);

const OFFICIAL_LABELS: Record<OfficialFieldCommunicatorAppId, string> = {
  sheet: "Ficha",
  conversations: "Conversas",
  group: "Grupo",
  squad: "Esquadrão",
  map: "Mapa",
  manual: "Manual",
  dossiers: "Dossiês",
  contracts: "Contratos",
  files: "Arquivos",
  shop: "Loja",
  settings: "Configurações",
};

const OFFICIAL_DESCRIPTIONS: Record<OfficialFieldCommunicatorAppId, string> = {
  sheet: "Abrir a ficha do agente",
  conversations: "Mensagens privadas visíveis ao agente",
  group: "Mensagens e comunicados do canal coletivo",
  squad: "Grupos atribuídos no registro da Companhia",
  map: "Cenas que este usuário pode observar",
  manual: "Journals visíveis de protocolos e procedimentos",
  dossiers: "Journals visíveis de inteligência e ameaças",
  contracts: "Contratos visíveis por estado e permissão",
  files: "Todos os Journals visíveis neste mundo",
  shop: "Entrega automática ou solicitação para aprovação",
  settings: "Preferências do comunicador",
};

const OFFICIAL_ICONS: Record<OfficialFieldCommunicatorAppId, string> = {
  sheet: "fa-solid fa-id-card",
  conversations: "fa-solid fa-message",
  group: "fa-solid fa-comments",
  squad: "fa-solid fa-people-group",
  map: "fa-solid fa-map-location-dot",
  manual: "fa-solid fa-book-open",
  dossiers: "fa-solid fa-address-book",
  contracts: "fa-solid fa-file-signature",
  files: "fa-solid fa-folder-open",
  shop: "fa-solid fa-store",
  settings: "fa-solid fa-gear",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDangerousKey(key: string): boolean {
  return DANGEROUS_KEYS.has(key.toLowerCase()) || /^on[a-z]/i.test(key);
}

function cloneSafeValue(value: unknown, depth = 0): unknown {
  if (depth > 30) return undefined;
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => cloneSafeValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }
  if (!isRecord(value)) return undefined;

  const cloned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isDangerousKey(key)) continue;
    const safeEntry = cloneSafeValue(entry, depth + 1);
    if (safeEntry !== undefined) cloned[key] = safeEntry;
  }
  return cloned;
}

function cloneSafeRecord(value: unknown): Record<string, unknown> {
  const cloned = cloneSafeValue(value);
  return isRecord(cloned) ? cloned : {};
}

function sanitizePlainText(value: unknown, maxLength: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeFieldCommunicatorId(value: unknown, fallback = "app"): string {
  const normalized = typeof value === "string"
    ? value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_ID_LENGTH)
      .replace(/-+$/g, "")
    : "";
  return normalized || fallback;
}

export function sanitizeFieldCommunicatorLabel(value: unknown, fallback = "Aplicativo"): string {
  return sanitizePlainText(value, MAX_LABEL_LENGTH, fallback) || fallback;
}

export function sanitizeFieldCommunicatorDescription(value: unknown): string {
  return sanitizePlainText(value, MAX_DESCRIPTION_LENGTH);
}

export function sanitizeFieldCommunicatorAccent(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const accent = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(accent)) return accent;
  if (/^[a-z][a-z0-9-]{0,31}$/.test(accent)) return accent;
  return undefined;
}

export function sanitizeFieldCommunicatorOrder(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(MAX_ORDER, Math.round(numeric)));
}

function sanitizeRank(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(0, Math.min(MAX_RANK, Math.floor(numeric)));
}

function sanitizeIdentifier(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const identifier = value
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .trim()
    .slice(0, 128);
  return identifier || undefined;
}

function sanitizeIdentifierList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const identifiers: string[] = [];
  for (const entry of value) {
    const identifier = sanitizeIdentifier(entry);
    if (identifier && !seen.has(identifier)) {
      seen.add(identifier);
      identifiers.push(identifier);
    }
  }
  return identifiers.length > 0 ? identifiers : undefined;
}

function sanitizeRankList(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ranks = Array.from(new Set(value
    .map(sanitizeRank)
    .filter((rank): rank is number => rank !== undefined)));
  return ranks.length > 0 ? ranks : undefined;
}

function sanitizeIcon(value: unknown): string {
  const icon = sanitizePlainText(value, MAX_ICON_LENGTH);
  if (/^(?:javascript|data\s*:)/i.test(icon)) return "fa-solid fa-grid-2";
  return icon || "fa-solid fa-grid-2";
}

function sanitizeTargetUuid(value: unknown): string | undefined {
  const target = sanitizePlainText(value, MAX_TARGET_LENGTH);
  if (!target || /^(?:javascript|data|https?)\s*:/i.test(target)) return undefined;
  return target;
}

function sanitizeInternalTarget(value: unknown, fallback: string): string {
  return sanitizeFieldCommunicatorId(value, fallback);
}

export function sanitizeFieldCommunicatorExternalUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return undefined;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

function normalizeType(value: unknown): FieldCommunicatorAppType | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (APP_TYPES.has(normalized)) return normalized as FieldCommunicatorAppType;
  if (["actor", "item", "journal", "journal-entry"].includes(normalized)) return "document";
  if (["folder", "journalfolder"].includes(normalized)) return "journal-folder";
  if (["url", "link"].includes(normalized)) return "external";
  return undefined;
}

function normalizeBadge(value: unknown): FieldCommunicatorBadge | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value !== "string") return undefined;
  const badge = sanitizePlainText(value, 40);
  return badge || undefined;
}

function normalizeUnlock(value: unknown): FieldCommunicatorUnlockCondition | undefined {
  if (!isRecord(value)) return undefined;
  const kind = value.kind;
  if (![
    "actor-flag",
    "user-flag",
    "world-setting",
    "document-exists",
  ].includes(String(kind))) return undefined;
  const key = sanitizePlainText(value.key, 160);
  if (!key) return undefined;
  const unlock = cloneSafeRecord(value) as FieldCommunicatorUnlockCondition;
  unlock.kind = kind as FieldCommunicatorUnlockCondition["kind"];
  unlock.key = key;
  const equals = value.equals;
  if (
    equals === null
    || typeof equals === "string"
    || typeof equals === "boolean"
    || (typeof equals === "number" && Number.isFinite(equals))
  ) {
    unlock.equals = equals as FieldCommunicatorJsonPrimitive;
  } else {
    delete unlock.equals;
  }
  return unlock;
}

function makeOfficialApp(id: OfficialFieldCommunicatorAppId, index: number): FieldCommunicatorApp {
  return {
    version: FIELD_COMMUNICATOR_APP_VERSION,
    id,
    source: "official",
    label: OFFICIAL_LABELS[id],
    description: OFFICIAL_DESCRIPTIONS[id],
    icon: OFFICIAL_ICONS[id],
    type: "internal",
    internalTarget: id,
    order: index * ORDER_STEP,
    enabled: true,
  };
}

export const OFFICIAL_FIELD_COMMUNICATOR_APPS: readonly FieldCommunicatorApp[] =
  Object.freeze(OFFICIAL_FIELD_COMMUNICATOR_APP_IDS.map((id, index) =>
    Object.freeze(makeOfficialApp(id, index))));

function normalizedVersion(value: unknown, fallback: number): number {
  const version = sanitizeRank(value);
  return version && version > 0 ? version : fallback;
}

export function normalizeFieldCommunicatorApp(
  input: unknown,
  fallbackOrder = 0,
): FieldCommunicatorApp | undefined {
  if (!isRecord(input)) return undefined;
  const rawType = input.type;
  const inferredType = rawType === undefined
    ? (input.targetUrl !== undefined || input.url !== undefined ? "external" : "document")
    : normalizeType(rawType);
  if (!inferredType) return undefined;

  const id = sanitizeFieldCommunicatorId(input.id, sanitizeFieldCommunicatorId(input.label));
  const official = OFFICIAL_IDS.has(id);
  const source: FieldCommunicatorAppSource = official ? "official" : "custom";
  const normalized = cloneSafeRecord(input) as FieldCommunicatorApp;
  normalized.version = normalizedVersion(input.version ?? input.schemaVersion, FIELD_COMMUNICATOR_APP_VERSION);
  normalized.id = id;
  normalized.source = source;
  normalized.label = sanitizeFieldCommunicatorLabel(input.label, official
    ? OFFICIAL_LABELS[id as OfficialFieldCommunicatorAppId]
    : "Aplicativo");
  normalized.description = sanitizeFieldCommunicatorDescription(input.description);
  normalized.icon = sanitizeIcon(input.icon);
  normalized.type = inferredType;
  normalized.order = sanitizeFieldCommunicatorOrder(input.order, fallbackOrder);
  normalized.enabled = input.enabled !== false;

  const accent = sanitizeFieldCommunicatorAccent(input.accent);
  if (accent) normalized.accent = accent;
  else delete normalized.accent;
  const badge = normalizeBadge(input.badge);
  if (badge !== undefined) normalized.badge = badge;
  else delete normalized.badge;
  const minimumRank = sanitizeRank(input.minimumRank ?? input.minRank);
  if (minimumRank !== undefined) normalized.minimumRank = minimumRank;
  else delete normalized.minimumRank;
  const allowedRanks = sanitizeRankList(input.allowedRanks);
  if (allowedRanks) normalized.allowedRanks = allowedRanks;
  else delete normalized.allowedRanks;
  const allowedAgents = sanitizeIdentifierList(input.allowedAgents);
  if (allowedAgents) normalized.allowedAgents = allowedAgents;
  else delete normalized.allowedAgents;
  const allowedSquads = sanitizeIdentifierList(input.allowedSquads);
  if (allowedSquads) normalized.allowedSquads = allowedSquads;
  else delete normalized.allowedSquads;
  const unlock = normalizeUnlock(input.unlock);
  if (unlock) normalized.unlock = unlock;
  else delete normalized.unlock;

  delete normalized.schemaVersion;
  delete normalized.minRank;
  delete normalized.url;
  if (inferredType === "external") {
    const targetUrl = sanitizeFieldCommunicatorExternalUrl(
      input.targetUrl ?? input.url ?? input.targetUuid,
    );
    if (!targetUrl) return undefined;
    normalized.targetUrl = targetUrl;
    delete normalized.targetUuid;
    delete normalized.internalTarget;
  } else if (inferredType === "internal") {
    normalized.internalTarget = sanitizeInternalTarget(input.internalTarget, id);
    delete normalized.targetUuid;
    delete normalized.targetUrl;
  } else {
    const targetUuid = sanitizeTargetUuid(input.targetUuid);
    if (targetUuid) normalized.targetUuid = targetUuid;
    else delete normalized.targetUuid;
    delete normalized.targetUrl;
    delete normalized.internalTarget;
  }
  return normalized;
}

function mergeOfficialApp(app: FieldCommunicatorApp): FieldCommunicatorApp {
  const id = app.id as OfficialFieldCommunicatorAppId;
  const defaults = OFFICIAL_FIELD_COMMUNICATOR_APPS[
    OFFICIAL_FIELD_COMMUNICATOR_APP_IDS.indexOf(id)
  ];
  return {
    ...app,
    id,
    source: "official",
    type: "internal",
    internalTarget: id,
    targetUuid: undefined,
    targetUrl: undefined,
    version: Math.max(app.version, defaults.version),
  };
}

function nextUniqueId(base: string, usedIds: Set<string>): string {
  let id = sanitizeFieldCommunicatorId(base);
  if (!usedIds.has(id)) return id;
  let suffix = 2;
  while (usedIds.has(`${id}-${suffix}`)) suffix += 1;
  const suffixText = `-${suffix}`;
  id = `${id.slice(0, MAX_ID_LENGTH - suffixText.length).replace(/-+$/g, "")}${suffixText}`;
  return id;
}

function rawAppsFrom(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (!isRecord(input)) return [];
  if (Array.isArray(input.apps)) return input.apps;
  if (Array.isArray(input.customApps)) return input.customApps;
  return [];
}

export function stableSortFieldCommunicatorApps(
  apps: readonly FieldCommunicatorApp[],
): FieldCommunicatorApp[] {
  return apps
    .map((app, index) => ({ app, index }))
    .sort((left, right) => left.app.order - right.app.order || left.index - right.index)
    .map(({ app }) => app);
}

export function normalizeFieldCommunicatorRegistry(input: unknown): FieldCommunicatorRegistryData {
  const registryInput = isRecord(input) ? input : {};
  const output = cloneSafeRecord(registryInput) as FieldCommunicatorRegistryData;
  const usedIds = new Set<string>();
  const officialById = new Map<OfficialFieldCommunicatorAppId, FieldCommunicatorApp>();
  const customApps: FieldCommunicatorApp[] = [];

  rawAppsFrom(input).forEach((rawApp, index) => {
    const app = normalizeFieldCommunicatorApp(rawApp, (index + OFFICIAL_FIELD_COMMUNICATOR_APP_IDS.length) * ORDER_STEP);
    if (!app) return;
    if (OFFICIAL_IDS.has(app.id)) {
      const id = app.id as OfficialFieldCommunicatorAppId;
      if (!officialById.has(id)) officialById.set(id, mergeOfficialApp(app));
      return;
    }
    const id = nextUniqueId(app.id, usedIds);
    usedIds.add(id);
    customApps.push({ ...app, id, source: "custom" });
  });

  const officialApps = OFFICIAL_FIELD_COMMUNICATOR_APPS.map((defaults) => {
    const migrated = officialById.get(defaults.id as OfficialFieldCommunicatorAppId);
    return migrated ? mergeOfficialApp(migrated) : { ...defaults };
  });
  output.schemaVersion = Math.max(
    normalizedVersion(registryInput.schemaVersion ?? registryInput.version, FIELD_COMMUNICATOR_SCHEMA_VERSION),
    FIELD_COMMUNICATOR_SCHEMA_VERSION,
  );
  output.apps = stableSortFieldCommunicatorApps([...officialApps, ...customApps]);
  delete output.version;
  delete output.customApps;
  return output;
}

export function createDefaultFieldCommunicatorRegistry(): FieldCommunicatorRegistryData {
  return normalizeFieldCommunicatorRegistry({
    schemaVersion: FIELD_COMMUNICATOR_SCHEMA_VERSION,
    apps: OFFICIAL_FIELD_COMMUNICATOR_APPS,
  });
}

export function isFieldCommunicatorAppAccessible(
  app: FieldCommunicatorApp,
  context: FieldCommunicatorAccessContext,
): boolean {
  if (!app.enabled) return false;
  const rank = sanitizeRank(context.rank) ?? 0;
  if ((app.minimumRank ?? 0) > rank) return false;
  if (app.allowedRanks?.length && !app.allowedRanks.includes(rank)) return false;

  const hasAgentRestriction = Boolean(app.allowedAgents?.length);
  const hasSquadRestriction = Boolean(app.allowedSquads?.length);
  if (!hasAgentRestriction && !hasSquadRestriction) return true;
  const agentAllowed = Boolean(context.agentId && app.allowedAgents?.includes(context.agentId));
  const squadAllowed = Boolean(context.squadIds?.some((id) => app.allowedSquads?.includes(id)));
  return agentAllowed || squadAllowed;
}

export function filterFieldCommunicatorApps(
  apps: readonly FieldCommunicatorApp[],
  context: FieldCommunicatorAccessContext,
): FieldCommunicatorApp[] {
  return stableSortFieldCommunicatorApps(apps.filter((app) =>
    isFieldCommunicatorAppAccessible(app, context)));
}

function withNormalizedApps(
  registry: FieldCommunicatorRegistryData,
  apps: readonly FieldCommunicatorApp[],
): FieldCommunicatorRegistryData {
  return normalizeFieldCommunicatorRegistry({ ...cloneSafeRecord(registry), apps });
}

export function addFieldCommunicatorApp(
  registry: FieldCommunicatorRegistryData,
  input: unknown,
): FieldCommunicatorRegistryData {
  const current = normalizeFieldCommunicatorRegistry(registry);
  const app = normalizeFieldCommunicatorApp(input, current.apps.length * ORDER_STEP);
  if (!app) throw new Error("Invalid field communicator application.");
  if (OFFICIAL_IDS.has(app.id)) throw new Error(`Official application id cannot be added: ${app.id}`);
  if (current.apps.some((entry) => entry.id === app.id)) {
    throw new Error(`Field communicator application id already exists: ${app.id}`);
  }
  return withNormalizedApps(current, [...current.apps, { ...app, source: "custom" }]);
}

export function editFieldCommunicatorApp(
  registry: FieldCommunicatorRegistryData,
  id: string,
  patch: unknown,
): FieldCommunicatorRegistryData {
  const current = normalizeFieldCommunicatorRegistry(registry);
  const index = current.apps.findIndex((app) => app.id === id);
  if (index < 0 || !isRecord(patch)) return current;
  const existing = current.apps[index];
  const official = OFFICIAL_IDS.has(existing.id);
  const candidate = normalizeFieldCommunicatorApp({ ...existing, ...cloneSafeRecord(patch) }, existing.order);
  if (!candidate) throw new Error("Invalid field communicator application update.");
  const nextId = official ? existing.id : candidate.id;
  if (current.apps.some((entry, entryIndex) => entryIndex !== index && entry.id === nextId)) {
    throw new Error(`Field communicator application id already exists: ${nextId}`);
  }
  const replacement = official
    ? mergeOfficialApp({ ...candidate, id: existing.id, source: "official" })
    : { ...candidate, id: nextId, source: "custom" as const };
  const apps = current.apps.slice();
  apps[index] = replacement;
  return withNormalizedApps(current, apps);
}

export function duplicateFieldCommunicatorApp(
  registry: FieldCommunicatorRegistryData,
  id: string,
  requestedId?: string,
): FieldCommunicatorRegistryData {
  const current = normalizeFieldCommunicatorRegistry(registry);
  const original = current.apps.find((app) => app.id === id);
  if (!original) return current;
  const usedIds = new Set(current.apps.map((app) => app.id));
  const duplicateId = nextUniqueId(requestedId ?? `${original.id}-copy`, usedIds);
  const duplicate = normalizeFieldCommunicatorApp({
    ...original,
    id: duplicateId,
    source: "custom",
    label: `${original.label} (cópia)`,
    order: Math.min(MAX_ORDER, original.order + 1),
  }, original.order + 1);
  if (!duplicate) throw new Error("Field communicator application could not be duplicated.");
  return withNormalizedApps(current, [...current.apps, { ...duplicate, id: duplicateId, source: "custom" }]);
}

export function reorderFieldCommunicatorApps(
  registry: FieldCommunicatorRegistryData,
  orderedIds: readonly string[],
): FieldCommunicatorRegistryData {
  const current = normalizeFieldCommunicatorRegistry(registry);
  const byId = new Map(current.apps.map((app) => [app.id, app]));
  const seen = new Set<string>();
  const ordered: FieldCommunicatorApp[] = [];
  for (const id of orderedIds) {
    const app = byId.get(id);
    if (app && !seen.has(id)) {
      seen.add(id);
      ordered.push(app);
    }
  }
  for (const app of stableSortFieldCommunicatorApps(current.apps)) {
    if (!seen.has(app.id)) ordered.push(app);
  }
  return withNormalizedApps(current, ordered.map((app, index) => ({
    ...app,
    order: index * ORDER_STEP,
  })));
}

export function disableFieldCommunicatorApp(
  registry: FieldCommunicatorRegistryData,
  id: string,
  disabled = true,
): FieldCommunicatorRegistryData {
  return editFieldCommunicatorApp(registry, id, { enabled: !disabled });
}

export function removeFieldCommunicatorApp(
  registry: FieldCommunicatorRegistryData,
  id: string,
): FieldCommunicatorRegistryData {
  const current = normalizeFieldCommunicatorRegistry(registry);
  if (OFFICIAL_IDS.has(id)) return current;
  return withNormalizedApps(current, current.apps.filter((app) => app.id !== id));
}

export function resetFieldCommunicatorRegistry(
  registry: FieldCommunicatorRegistryData,
  options: FieldCommunicatorResetOptions = {},
): FieldCommunicatorRegistryData {
  const current = normalizeFieldCommunicatorRegistry(registry);
  const customApps = options.preserveCustomApps === false
    ? []
    : current.apps.filter((app) => app.source === "custom");
  const resetOfficialApps = OFFICIAL_FIELD_COMMUNICATOR_APPS.map((defaults) => {
    const existing = current.apps.find((app) => app.id === defaults.id);
    return { ...existing, ...defaults };
  });
  return withNormalizedApps(current, [...resetOfficialApps, ...customApps]);
}

export function exportFieldCommunicatorRegistry(registry: FieldCommunicatorRegistryData): string {
  return JSON.stringify(normalizeFieldCommunicatorRegistry(registry), null, 2);
}

export function importFieldCommunicatorRegistry(payload: string | unknown): FieldCommunicatorImportResult {
  const warnings: string[] = [];
  let parsed: unknown = payload;
  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload) as unknown;
    } catch {
      return {
        registry: createDefaultFieldCommunicatorRegistry(),
        rejectedCount: 0,
        warnings: ["Invalid JSON. The official registry was restored."],
      };
    }
  }
  const rawApps = rawAppsFrom(parsed);
  let rejectedCount = 0;
  rawApps.forEach((app, index) => {
    if (!normalizeFieldCommunicatorApp(app, index * ORDER_STEP)) rejectedCount += 1;
  });
  if (rejectedCount > 0) {
    warnings.push(`${rejectedCount} unsafe or invalid application(s) were rejected.`);
  }
  return {
    registry: normalizeFieldCommunicatorRegistry(parsed),
    rejectedCount,
    warnings,
  };
}
