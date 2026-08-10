import type {
  CharacterSheetModuleMetric,
  CharacterSheetModuleStatus,
} from "./CharacterSheetModuleRegistry.js";
import type {
  PF2eBridgeTelemetryEntry,
  PF2eBridgeTelemetryStatus,
} from "./PF2eBridgeTelemetry.js";

export type CharacterSheetCapabilityStatus = "supported" | "fallback" | "unsupported";
export type CharacterSheetDiagnosticModuleStatus = "ok" | "partial" | "failed" | "not-applicable";

export const CHARACTER_SHEET_DIAGNOSTICS_TEMPLATE =
  "modules/ethernum-rpg-module/templates/sheets/character-sheet-diagnostics.html";
export const CHARACTER_SHEET_DIAGNOSTICS_STYLESHEET =
  "modules/ethernum-rpg-module/styles/sheets/character-sheet-diagnostics.css";

export type CharacterSheetDiagnosticCapability =
  | "carryType"
  | "resources"
  | "conditions"
  | "spellCollections"
  | "spellCast"
  | "spellPreparation"
  | "dragDrop"
  | "richText"
  | "craftingPreparedData";

export type CharacterSheetDiagnosticModule =
  | "identity"
  | "overview"
  | "combat"
  | "inventory"
  | "feats"
  | "spellcasting"
  | "unique"
  | "effects"
  | "ether"
  | "runes";

export interface CharacterSheetDiagnosticsInput {
  isGM: boolean;
  actorId: string;
  actorName?: string;
  shell: string;
  configuredMode: string;
  activeCore: string;
  theme?: string;
  animationMode?: string;
  uniqueProfile?: string;
  foundryVersion: string;
  pf2eVersion: string;
  ethernumVersion: string;
  capabilities?: Partial<Record<CharacterSheetDiagnosticCapability, boolean>>;
  capabilityStatus?: Partial<Record<CharacterSheetDiagnosticCapability, CharacterSheetCapabilityStatus>>;
  moduleMetrics?: CharacterSheetModuleMetric[];
  moduleStatus?: Partial<Record<CharacterSheetDiagnosticModule, CharacterSheetDiagnosticModuleStatus>>;
  telemetry?: PF2eBridgeTelemetryEntry[];
  renderTimeMs?: number;
  dirtyPaths?: string[];
  uiAssetPackVersion?: number;
  loadedUIAssets?: string[];
  missingUIAssets?: string[];
  referenceOverlay?: boolean;
  highContrast?: boolean;
}

export interface CharacterSheetCapabilityDiagnostic {
  id: CharacterSheetDiagnosticCapability;
  label: string;
  status: CharacterSheetCapabilityStatus;
}

export interface CharacterSheetModuleDiagnostic {
  id: CharacterSheetDiagnosticModule;
  label: string;
  status: CharacterSheetDiagnosticModuleStatus;
  durationMs?: number;
  technical?: {
    errorType: string;
    message: string;
    module: string;
  };
}

export interface CharacterSheetOperationDiagnostic extends PF2eBridgeTelemetryEntry {
  time: string;
  statusLabel: string;
  sourceLabel: string;
}

export interface CharacterSheetDiagnosticsSnapshot {
  access: "gm";
  status: "ok" | "partial" | "failed";
  generatedAt: number;
  actor: { id: string; label: string };
  sheet: {
    shell: string;
    configuredMode: string;
    activeCore: string;
    theme: string;
    animationMode: string;
    uniqueProfile: string;
  };
  versions: { foundry: string; pf2e: string; ethernum: string };
  visual: {
    assetPackVersion: number | null;
    loadedAssets: string[];
    missingAssets: string[];
    referenceOverlay: boolean;
    highContrast: boolean;
  };
  capabilities: CharacterSheetCapabilityDiagnostic[];
  modules: CharacterSheetModuleDiagnostic[];
  operations: CharacterSheetOperationDiagnostic[];
  performance: {
    lastRenderMs: number | null;
    moduleBuildTimes: Array<{ id: string; durationMs: number }>;
    slowestModule: { id: string; durationMs: number } | null;
    dirtyPaths: string[];
  };
}

export interface CharacterSheetControllerDiagnosticsLike {
  actorId: string;
  actorName?: string;
  configuredMode: string;
  resolvedSheet: string;
  activeCore: string;
  animationMode?: string;
  adapterStatus?: "ok" | "partial" | "failed";
  profile?: string;
  moduleMetrics?: CharacterSheetModuleMetric[];
  dirtyPaths?: string[];
  renderTimeMs?: number;
  foundryVersion: string;
  pf2eVersion: string;
  capabilities?: Partial<Record<CharacterSheetDiagnosticCapability, boolean>>;
}

export interface CharacterSheetControllerDiagnosticsInput {
  isGM: boolean;
  diagnostics: CharacterSheetControllerDiagnosticsLike;
  ethernumVersion: string;
  animationMode?: string;
  telemetry?: PF2eBridgeTelemetryEntry[];
  capabilityStatus?: CharacterSheetDiagnosticsInput["capabilityStatus"];
  moduleStatus?: CharacterSheetDiagnosticsInput["moduleStatus"];
  uiAssetPackVersion?: number;
  loadedUIAssets?: string[];
  missingUIAssets?: string[];
  referenceOverlay?: boolean;
  highContrast?: boolean;
}

export interface CharacterSheetSafeErrorPresentation {
  title: string;
  message: string;
  action: { id: "open-pf2e-sheet"; label: string };
  technical: null | {
    errorType: string;
    message: string;
    module: string;
    capability: string;
    pf2eVersion: string;
    foundryVersion: string;
  };
}

export interface CharacterSheetErrorContext {
  isGM: boolean;
  module: string;
  moduleLabel?: string;
  capability?: string;
  pf2eVersion?: string;
  foundryVersion?: string;
}

const CAPABILITIES: Array<{ id: CharacterSheetDiagnosticCapability; label: string }> = [
  { id: "carryType", label: "Carry Type" },
  { id: "resources", label: "Resources" },
  { id: "conditions", label: "Conditions" },
  { id: "spellCollections", label: "Spell Collections" },
  { id: "spellCast", label: "Spell Cast" },
  { id: "spellPreparation", label: "Spell Preparation" },
  { id: "dragDrop", label: "Drag & Drop" },
  { id: "richText", label: "Rich Text" },
  { id: "craftingPreparedData", label: "Crafting Prepared Data" },
];

const MODULES: Array<{ id: CharacterSheetDiagnosticModule; label: string; metricId: string }> = [
  { id: "identity", label: "Identity", metricId: "header" },
  { id: "overview", label: "Overview", metricId: "overview" },
  { id: "combat", label: "Combat", metricId: "combat" },
  { id: "inventory", label: "Inventory", metricId: "inventory" },
  { id: "feats", label: "Feats", metricId: "feats" },
  { id: "spellcasting", label: "Spellcasting", metricId: "spellcasting" },
  { id: "unique", label: "Unique", metricId: "unique" },
  { id: "effects", label: "Effects", metricId: "effects" },
  { id: "ether", label: "Ether", metricId: "ethernum-systems" },
  { id: "runes", label: "Runes", metricId: "ethernum-systems" },
];

const SOURCE_LABELS: Record<PF2eBridgeTelemetryEntry["source"], string> = {
  "pf2e-prepared": "PF2e Prepared",
  "document-fallback": "Document Fallback",
  "foundry-drop": "Foundry Drop",
  "drop-delegate": "Drop Delegate",
  adapter: "Adapter",
  "pf2e-sheet": "PF2e Sheet",
};

function safeText(value: unknown, fallback: string, maximum = 120): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, maximum);
}

function safeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Technical error details unavailable.";
  return safeText(error.message, error.name || "Error", 200)
    .replace(/[a-z]:\\(?:[^\\\s]+\\)*[^\s]+/gi, "[local-path]")
    .replace(/\b(password|token|secret|biograph(?:y|ia)|chat|notes?)\b\s*[:=]\s*[^,;|]+/gi, "$1=[redacted]");
}

function finiteMilliseconds(value: unknown): number | undefined {
  const result = Number(value);
  return Number.isFinite(result) ? Math.max(0, Math.round(result * 100) / 100) : undefined;
}

function metricStatus(status: CharacterSheetModuleStatus): CharacterSheetDiagnosticModuleStatus {
  if (status === "built") return "ok";
  if (status === "failed") return "failed";
  return "not-applicable";
}

function capabilityDiagnostics(input: CharacterSheetDiagnosticsInput): CharacterSheetCapabilityDiagnostic[] {
  return CAPABILITIES.map(capability => ({
    ...capability,
    status: input.capabilityStatus?.[capability.id]
      ?? (input.capabilities?.[capability.id] === true ? "supported" : "unsupported"),
  }));
}

function moduleDiagnostics(input: CharacterSheetDiagnosticsInput): CharacterSheetModuleDiagnostic[] {
  const metrics = input.moduleMetrics ?? [];
  return MODULES.map(module => {
    const metric = [...metrics].reverse().find(candidate => candidate.id === module.metricId);
    const status = input.moduleStatus?.[module.id]
      ?? (metric ? metricStatus(metric.status) : "not-applicable");
    const durationMs = finiteMilliseconds(metric?.durationMs);
    const technical = metric?.status === "failed"
      ? {
        errorType: metric.error instanceof Error ? metric.error.name : "UnknownError",
        message: safeErrorMessage(metric.error),
        module: module.id,
      }
      : undefined;
    return {
      id: module.id,
      label: module.label,
      status,
      ...(durationMs === undefined ? {} : { durationMs }),
      ...(technical ? { technical } : {}),
    };
  });
}

function operationDiagnostics(input: CharacterSheetDiagnosticsInput): CharacterSheetOperationDiagnostic[] {
  return (input.telemetry ?? [])
    .filter(entry => entry.actorId === input.actorId)
    .slice(-50)
    .reverse()
    .map(entry => ({
      ...entry,
      time: new Date(entry.timestamp).toLocaleTimeString(undefined, { hour12: false }),
      statusLabel: entry.status.toUpperCase(),
      sourceLabel: SOURCE_LABELS[entry.source],
    }));
}

function performanceDiagnostics(input: CharacterSheetDiagnosticsInput) {
  const moduleBuildTimes = (input.moduleMetrics ?? [])
    .filter(metric => metric.phase === "build")
    .map(metric => ({ id: metric.id, durationMs: finiteMilliseconds(metric.durationMs) ?? 0 }));
  const slowestModule = moduleBuildTimes.reduce<null | { id: string; durationMs: number }>(
    (slowest, metric) => !slowest || metric.durationMs > slowest.durationMs ? metric : slowest,
    null,
  );
  return {
    lastRenderMs: finiteMilliseconds(input.renderTimeMs) ?? null,
    moduleBuildTimes,
    slowestModule,
    dirtyPaths: (input.dirtyPaths ?? []).map(path => safeText(path, "unknown", 80)),
  };
}

export function createCharacterSheetDiagnostics(
  input: CharacterSheetDiagnosticsInput,
): CharacterSheetDiagnosticsSnapshot | null {
  if (!input.isGM) return null;
  const modules = moduleDiagnostics(input);
  const failedModules = modules.filter(module => module.status === "failed").length;
  const partialModules = modules.filter(module => module.status === "partial").length;
  const applicableModules = modules.filter(module => module.status !== "not-applicable").length;
  return {
    access: "gm",
    status: failedModules > 0 && failedModules === applicableModules
      ? "failed"
      : failedModules > 0 || partialModules > 0
        ? "partial"
        : "ok",
    generatedAt: Date.now(),
    actor: {
      id: safeText(input.actorId, "unknown-actor", 128),
      label: safeText(input.actorName, "Actor", 80),
    },
    sheet: {
      shell: safeText(input.shell, "unknown"),
      configuredMode: safeText(input.configuredMode, "unknown"),
      activeCore: safeText(input.activeCore, "unknown"),
      theme: safeText(input.theme, input.shell === "concordia" ? "Mechanical Grimoire" : "Ethernum Fidelity"),
      animationMode: safeText(input.animationMode, "unknown"),
      uniqueProfile: safeText(input.uniqueProfile, "none"),
    },
    versions: {
      foundry: safeText(input.foundryVersion, "unknown", 40),
      pf2e: safeText(input.pf2eVersion, "unknown", 40),
      ethernum: safeText(input.ethernumVersion, "unknown", 40),
    },
    visual: {
      assetPackVersion: Number.isFinite(Number(input.uiAssetPackVersion))
        ? Number(input.uiAssetPackVersion)
        : null,
      loadedAssets: (input.loadedUIAssets ?? []).map(id => safeText(id, "unknown", 40)),
      missingAssets: (input.missingUIAssets ?? []).map(id => safeText(id, "unknown", 40)),
      referenceOverlay: Boolean(input.referenceOverlay),
      highContrast: Boolean(input.highContrast),
    },
    capabilities: capabilityDiagnostics(input),
    modules,
    operations: operationDiagnostics(input),
    performance: performanceDiagnostics(input),
  };
}

export function createCharacterSheetDiagnosticsFromController(
  input: CharacterSheetControllerDiagnosticsInput,
): CharacterSheetDiagnosticsSnapshot | null {
  const diagnostics = input.diagnostics;
  const moduleStatus = { ...(input.moduleStatus ?? {}) };
  return createCharacterSheetDiagnostics({
    isGM: input.isGM,
    actorId: diagnostics.actorId,
    actorName: diagnostics.actorName,
    shell: diagnostics.resolvedSheet,
    configuredMode: diagnostics.configuredMode,
    activeCore: diagnostics.activeCore,
    theme: diagnostics.resolvedSheet === "concordia" ? "Mechanical Grimoire" : "Ethernum Fidelity",
    animationMode: input.animationMode,
    uniqueProfile: diagnostics.profile,
    foundryVersion: diagnostics.foundryVersion,
    pf2eVersion: diagnostics.pf2eVersion,
    ethernumVersion: input.ethernumVersion,
    capabilities: diagnostics.capabilities,
    capabilityStatus: input.capabilityStatus,
    moduleMetrics: diagnostics.moduleMetrics,
    moduleStatus,
    telemetry: input.telemetry,
    renderTimeMs: diagnostics.renderTimeMs,
    dirtyPaths: diagnostics.dirtyPaths,
    uiAssetPackVersion: input.uiAssetPackVersion,
    loadedUIAssets: input.loadedUIAssets,
    missingUIAssets: input.missingUIAssets,
    referenceOverlay: input.referenceOverlay,
    highContrast: input.highContrast,
  });
}

function lineStatus(status: CharacterSheetCapabilityStatus | CharacterSheetDiagnosticModuleStatus | PF2eBridgeTelemetryStatus): string {
  return status.toUpperCase().replace("NOT-APPLICABLE", "NOT APPLICABLE");
}

export function serializeCharacterSheetDiagnostics(snapshot: CharacterSheetDiagnosticsSnapshot): string {
  const lines = [
    "Ethernum Character Sheet Diagnostic",
    `Generated: ${new Date(snapshot.generatedAt).toISOString()}`,
    `Status: ${snapshot.status.toUpperCase()}`,
    `Actor: ${snapshot.actor.label} (${snapshot.actor.id})`,
    `Shell: ${snapshot.sheet.shell}`,
    `Configured Mode: ${snapshot.sheet.configuredMode}`,
    `Active Core: ${snapshot.sheet.activeCore}`,
    `Theme: ${snapshot.sheet.theme}`,
    `Animation Mode: ${snapshot.sheet.animationMode}`,
    `Unique Profile: ${snapshot.sheet.uniqueProfile}`,
    `Foundry: ${snapshot.versions.foundry}`,
    `PF2e: ${snapshot.versions.pf2e}`,
    `Ethernum: ${snapshot.versions.ethernum}`,
    `UI Asset Pack: ${snapshot.visual.assetPackVersion ?? "not applicable"}`,
    `Loaded UI Assets: ${snapshot.visual.loadedAssets.join(", ") || "none"}`,
    `Missing UI Assets: ${snapshot.visual.missingAssets.join(", ") || "none"}`,
    `Reference Overlay: ${snapshot.visual.referenceOverlay ? "ON" : "OFF"}`,
    `High Contrast: ${snapshot.visual.highContrast ? "ON" : "OFF"}`,
    "",
    "Capabilities",
    ...snapshot.capabilities.map(entry => `- ${entry.label}: ${lineStatus(entry.status)}`),
    "",
    "Modules",
    ...snapshot.modules.map(entry => {
      const timing = entry.durationMs === undefined ? "" : ` (${entry.durationMs}ms)`;
      return `- ${entry.label}: ${lineStatus(entry.status)}${timing}`;
    }),
    "",
    "Performance",
    `- Last Render: ${snapshot.performance.lastRenderMs ?? "unknown"}ms`,
    `- Slowest Module: ${snapshot.performance.slowestModule
      ? `${snapshot.performance.slowestModule.id} (${snapshot.performance.slowestModule.durationMs}ms)`
      : "none"}`,
    `- Cache Dirty Paths: ${snapshot.performance.dirtyPaths.join(", ") || "none"}`,
    "",
    "Latest Operations",
    ...snapshot.operations.map(entry => {
      const timing = entry.durationMs === undefined ? "" : ` ${entry.durationMs}ms`;
      return `- ${entry.time} | ${entry.operation} | ${entry.sourceLabel} | ${lineStatus(entry.status)}${timing}`;
    }),
  ];
  return lines.join("\n");
}

export async function copyCharacterSheetDiagnostics(
  snapshot: CharacterSheetDiagnosticsSnapshot,
  clipboard: { writeText(text: string): Promise<void> } | undefined = globalThis.navigator?.clipboard,
): Promise<{ copied: boolean; text: string }> {
  const text = serializeCharacterSheetDiagnostics(snapshot);
  if (!clipboard?.writeText) return { copied: false, text };
  await clipboard.writeText(text);
  return { copied: true, text };
}

export function presentCharacterSheetError(
  error: unknown,
  context: CharacterSheetErrorContext,
): CharacterSheetSafeErrorPresentation {
  const moduleLabel = safeText(context.moduleLabel, safeText(context.module, "module"), 80);
  return {
    title: `Could not load ${moduleLabel}.`,
    message: "Open the PF2e sheet to continue this operation.",
    action: { id: "open-pf2e-sheet", label: "Open PF2e Sheet" },
    technical: context.isGM
      ? {
        errorType: error instanceof Error ? error.name : "UnknownError",
        message: safeErrorMessage(error),
        module: safeText(context.module, "unknown"),
        capability: safeText(context.capability, "unknown"),
        pf2eVersion: safeText(context.pf2eVersion, "unknown", 40),
        foundryVersion: safeText(context.foundryVersion, "unknown", 40),
      }
      : null,
  };
}

export function logCharacterSheetTechnicalError(
  error: unknown,
  context: Omit<CharacterSheetErrorContext, "isGM">,
  logger: Pick<Console, "error"> = console,
): void {
  logger.error("Ethernum character sheet operation failed", {
    module: context.module,
    capability: context.capability,
    pf2eVersion: context.pf2eVersion,
    foundryVersion: context.foundryVersion,
  }, error);
}

export const CharacterSheetDiagnosticsService = Object.freeze({
  create: createCharacterSheetDiagnostics,
  fromController: createCharacterSheetDiagnosticsFromController,
  serialize: serializeCharacterSheetDiagnostics,
  copy: copyCharacterSheetDiagnostics,
  presentError: presentCharacterSheetError,
  logTechnicalError: logCharacterSheetTechnicalError,
});
