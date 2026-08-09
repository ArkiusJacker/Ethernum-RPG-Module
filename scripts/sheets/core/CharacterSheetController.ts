import { ETHERNUM, type CampaignCoreId } from "../../config.js";
import { getUniqueMechanicProfile } from "../../mechanics/registry.js";
import { canPlayersChooseCharacterSheet } from "../../settings.js";
import { UniqueMechanicStateService } from "../../unique/services/UniqueMechanicStateService.js";
import { DEFAULT_CHARACTER_SHEET_MODULES } from "../components/index.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "../components/types.js";
import { ConcordiaShell } from "../concordia/ConcordiaSheet.js";
import {
  EthernumCompanyShell,
  type CharacterSheetShellDefinition,
} from "../ethernum/EthernumCompanySheet.js";
import { CharacterSheetCache } from "./CharacterSheetCache.js";
import { presentCharacterSheetError } from "./CharacterSheetDiagnosticsService.js";
import { CharacterSheetModuleRegistry, type CharacterSheetModuleMetric } from "./CharacterSheetModuleRegistry.js";
import { buildCharacterSheetPresentation } from "./CharacterSheetPresentation.js";
import {
  detectPF2eCharacterCapabilities,
  type PF2eCharacterCapabilities,
} from "./PF2eCharacterBridge.js";
import {
  CharacterSheetRegistry,
  normalizeCharacterSheetMode,
  type CharacterSheetMode,
  type ResolvedCharacterSheetMode,
} from "./CharacterSheetRegistry.js";
import { CharacterSheetState, type CharacterSheetViewState } from "./CharacterSheetState.js";
import { CharacterRichTextService } from "./CharacterRichTextService.js";
import { PF2eBridgeTelemetry, type PF2eBridgeTelemetryEntry } from "./PF2eBridgeTelemetry.js";
import {
  PF2ePreparedDataService,
  type PF2ePreparedDataSource,
} from "./PF2ePreparedDataService.js";

export interface CharacterSheetPermissions {
  owner: boolean;
  gm: boolean;
  observer: boolean;
  editable: boolean;
  canChooseSheet: boolean;
}

export interface EthernumCharacterSheetContext extends Record<string, unknown> {
  actor: Actor;
  core: CampaignCoreId;
  sheetId: ResolvedCharacterSheetMode;
  configuredMode: CharacterSheetMode;
  shell: CharacterSheetShellDefinition;
  permissions: CharacterSheetPermissions;
  ui: CharacterSheetViewState & {
    tabs: ReturnType<CharacterSheetShellDefinition["tabs"]>;
    showStowed: boolean;
    skillDetailsCollapsed: boolean;
    overviewDetailsCollapsed: boolean;
    overviewActivitiesCollapsed: boolean;
    overviewCraftingCollapsed: boolean;
    overviewBiographyCollapsed: boolean;
  };
  failedModules: Array<{ id: string; message: string }>;
  moduleFailures: Record<string, {
    id: string;
    message: string;
    technical: ReturnType<typeof presentCharacterSheetError>["technical"];
  }>;
  renderTimeMs: number;
}

export interface CharacterSheetDiagnostics {
  actorId: string;
  actorName: string;
  configuredMode: CharacterSheetMode;
  resolvedSheet: ResolvedCharacterSheetMode;
  activeCore: CampaignCoreId;
  adapterStatus: "ok" | "partial" | "failed";
  profile: string;
  failedModules: string[];
  moduleMetrics: CharacterSheetModuleMetric[];
  dirtyPaths: string[];
  renderTimeMs: number;
  foundryVersion: string;
  pf2eVersion: string;
  capabilities: PF2eCharacterCapabilities;
  capabilityStatus: {
    richText: "supported" | "fallback" | "unsupported";
    craftingPreparedData: "supported" | "fallback" | "unsupported";
  };
  preparedData: {
    spellcasting: PF2ePreparedDataSource;
    crafting: PF2ePreparedDataSource;
  };
  telemetry: PF2eBridgeTelemetryEntry[];
  fallbacksUsed: string[];
}

const sheetRegistry = new CharacterSheetRegistry<CharacterSheetShellDefinition>()
  .register("ethernum", EthernumCompanyShell)
  .register("concordia", ConcordiaShell);

const diagnostics = new Map<string, CharacterSheetDiagnostics>();

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function recordPreparedOperation(
  actor: Actor,
  operation: string,
  capability: string,
  source: PF2ePreparedDataSource,
  durationMs: number,
  diagnostics: Array<{ scope: string }>,
): void {
  PF2eBridgeTelemetry.record({
    actorId: actorId(actor),
    operation,
    capability,
    source: source === "prepared" ? "pf2e-prepared" : source === "adapter" ? "adapter" : "pf2e-sheet",
    status: source === "prepared" ? "success" : "fallback",
    durationMs: Math.max(0, durationMs),
    message: diagnostics.length > 0 ? diagnostics.map(entry => entry.scope).join(", ") : undefined,
  });
}

function actorId(actor: Actor): string {
  return String(actor.id ?? actor.uuid ?? actor.name ?? "actor");
}

function actorSheetMode(actor: Actor): CharacterSheetMode {
  return normalizeCharacterSheetMode(actor.getFlag(ETHERNUM.MODULE_NAME, "characterSheetMode"));
}

export function resolveCharacterSheetPermissions(
  actor: Actor,
  user: User | null | undefined,
  playersCanChoose = true,
): CharacterSheetPermissions {
  const gm = Boolean(user?.isGM);
  const owner = Boolean((actor as Actor & { isOwner?: boolean }).isOwner);
  let observer = owner || gm;
  if (!observer && user) {
    try {
      observer = actor.testUserPermission(user, "OBSERVER");
    } catch {
      observer = false;
    }
  }
  return {
    owner,
    gm,
    observer,
    editable: gm || owner,
    canChooseSheet: gm || (owner && playersCanChoose),
  };
}

function permissionsFor(actor: Actor): CharacterSheetPermissions {
  return resolveCharacterSheetPermissions(actor, game.user, canPlayersChooseCharacterSheet());
}

function stateFor(actor: Actor, sheetId: ResolvedCharacterSheetMode): CharacterSheetState {
  return new CharacterSheetState({
    worldId: String(game.world?.id ?? "world"),
    userId: String(game.user?.id ?? "user"),
    actorId: actorId(actor),
    sheetId,
  });
}

export const CharacterSheetController = {
  registry: sheetRegistry,

  resolve(actor: Actor): { configuredMode: CharacterSheetMode; resolvedSheet: ResolvedCharacterSheetMode; core: CampaignCoreId } {
    const uniqueState = UniqueMechanicStateService.getState(actor);
    const rawCore = record(actor.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics")).activeCore;
    const configuredMode = actorSheetMode(actor);
    return {
      configuredMode,
      resolvedSheet: sheetRegistry.resolveMode({ override: configuredMode, activeCore: rawCore }),
      core: uniqueState.activeCore,
    };
  },

  async build(actor: Actor): Promise<EthernumCharacterSheetContext> {
    const started = now();
    const resolution = this.resolve(actor);
    const shell = sheetRegistry.get(resolution.resolvedSheet) ?? EthernumCompanyShell;
    const id = actorId(actor);
    const moduleContext: CharacterSheetModuleContext = {
      actor,
      actorId: id,
      core: resolution.core,
      sheetId: resolution.resolvedSheet,
      isGM: Boolean(game.user?.isGM),
    };
    const modules = new CharacterSheetModuleRegistry<CharacterSheetModuleContext, CharacterSheetModuleOutput>();
    DEFAULT_CHARACTER_SHEET_MODULES.forEach(module => modules.register(module));
    const report = await modules.build(moduleContext);
    const moduleData = report.modules.reduce<Record<string, unknown>>(
      (data, module) => Object.assign(data, module.output),
      {},
    );
    const [spellcastingResult, craftingResult, enrichedBiography] = await Promise.all([
      (async () => {
        const operationStarted = now();
        const value = await PF2ePreparedDataService.spellcasting(actor);
        return { value, durationMs: now() - operationStarted };
      })(),
      (async () => {
        const operationStarted = now();
        const value = await PF2ePreparedDataService.crafting(actor);
        return { value, durationMs: now() - operationStarted };
      })(),
      CharacterRichTextService.biography(actor),
    ]);
    const preparedSpellcasting = spellcastingResult.value;
    const preparedCrafting = craftingResult.value;
    if (preparedSpellcasting.source !== "prepared" || preparedSpellcasting.diagnostics.length > 0) {
      recordPreparedOperation(
        actor,
        "prepare-spellcasting",
        "spellCollections",
        preparedSpellcasting.source,
        spellcastingResult.durationMs,
        preparedSpellcasting.diagnostics,
      );
    }
    if (preparedCrafting.source !== "prepared" || preparedCrafting.diagnostics.length > 0) {
      recordPreparedOperation(
        actor,
        "prepare-crafting",
        "craftingPreparedData",
        preparedCrafting.source,
        craftingResult.durationMs,
        preparedCrafting.diagnostics,
      );
    }

    const preparedEntryIds = new Set(preparedSpellcasting.entries.map(entry => entry.entryId));
    const spellcastingData = record(preparedSpellcasting.snapshot ?? moduleData.spellcasting);
    moduleData.spellcasting = {
      ...spellcastingData,
      entries: list(spellcastingData.entries).map(value => {
        const entry = record(value);
        return { ...entry, preparedDataAvailable: preparedEntryIds.has(String(entry.id ?? "")) };
      }),
      preparedSource: preparedSpellcasting.source,
      preparedDiagnostics: preparedSpellcasting.diagnostics.map(entry => entry.scope),
      openPF2eSheet: preparedSpellcasting.openPF2eSheet,
    };

    const detailsData = record(moduleData.details);
    const craftingData = record(preparedCrafting.snapshot ?? detailsData.crafting);
    moduleData.details = {
      ...detailsData,
      biography: enrichedBiography,
      crafting: {
        ...craftingData,
        preparedSource: preparedCrafting.source,
        preparedDiagnostics: preparedCrafting.diagnostics.map(entry => entry.scope),
        openPF2eSheet: preparedCrafting.openPF2eSheet,
      },
      specialActions: PF2ePreparedDataService.deduplicateSpecialActions(
        list(detailsData.specialActions) as Array<Record<string, unknown>>,
        list(moduleData.actions) as Array<Record<string, unknown>>,
      ),
    };
    const sheetPermissions = permissionsFor(actor);
    const presentedData = buildCharacterSheetPresentation(moduleData, sheetPermissions);
    const spellcasting = presentedData.spellcasting as { hasSpellcasting?: boolean } | undefined;
    const spellcastingFailed = report.metrics.some(metric => metric.id === "spellcasting" && metric.status === "failed");
    const tabs = shell.tabs(Boolean(spellcasting?.hasSpellcasting) || spellcastingFailed);
    const localState = stateFor(actor, resolution.resolvedSheet);
    const savedState = localState.load();
    const showStowed = savedState.collapsed["inventory:stowed"] !== true;
    const inventoryData = record(presentedData.inventory);
    if (Array.isArray(inventoryData.categories)) {
      inventoryData.categories = inventoryData.categories.map(categoryValue => {
        const category = record(categoryValue);
        const id = String(category.id ?? "");
        return {
          ...category,
          collapsed: savedState.collapsed[`inventory:${id}`] === true,
          items: Array.isArray(category.items)
            ? category.items.map(itemValue => {
              const item = record(itemValue);
              return { ...item, hidden: !showStowed && item.carryType === "stowed" };
            })
            : [],
        };
      });
    }
    const presentedSpellcastingData = record(presentedData.spellcasting);
    if (Array.isArray(presentedSpellcastingData.entries)) {
      presentedSpellcastingData.entries = presentedSpellcastingData.entries.map(entryValue => {
        const entry = record(entryValue);
        const id = String(entry.id ?? "");
        return { ...entry, collapsed: savedState.collapsed[`spellcasting:${id}`] === true };
      });
    }
    const activeTab = tabs.some(tab => tab.id === savedState.activeTab)
      ? savedState.activeTab
      : tabs[0]?.id ?? "overview";
    if (activeTab !== savedState.activeTab) localState.setActiveTab(activeTab);
    const safeModuleFailure = game.i18n?.localize("ETHERNUM.CharacterSheet.Errors.ModuleUnavailable")
      ?? "This section could not be loaded.";
    const failedModules = report.metrics.flatMap(metric => metric.status === "failed"
      ? [{
        id: metric.id,
        message: safeModuleFailure,
        technical: presentCharacterSheetError(metric.error, {
          isGM: sheetPermissions.gm,
          module: metric.id,
          capability: metric.phase,
          foundryVersion: String((game as Game & { version?: string }).version ?? "unknown"),
          pf2eVersion: String(game.system?.version ?? "unknown"),
        }).technical,
      }]
      : []);
    const moduleFailures = Object.fromEntries(failedModules.map(module => [module.id, module]));
    const renderTimeMs = Math.max(0, now() - started);
    const context: EthernumCharacterSheetContext = {
      actor,
      core: resolution.core,
      sheetId: resolution.resolvedSheet,
      configuredMode: resolution.configuredMode,
      shell: { ...shell, title: game.i18n?.localize(shell.title) ?? shell.title },
      permissions: presentedData.permissions as CharacterSheetPermissions,
      ui: {
        ...savedState,
        activeTab,
        showStowed,
        skillDetailsCollapsed: savedState.collapsed["overview:skill-details"] === true,
        overviewDetailsCollapsed: savedState.collapsed["overview:details"] === true,
        overviewActivitiesCollapsed: savedState.collapsed["overview:activities"] === true,
        overviewCraftingCollapsed: savedState.collapsed["overview:crafting"] === true,
        overviewBiographyCollapsed: savedState.collapsed["overview:biography"] === true,
        tabs: tabs.map(tab => ({
          ...tab,
          active: tab.id === activeTab,
          label: game.i18n?.localize(tab.label) ?? tab.label,
        })),
      },
      failedModules,
      moduleFailures,
      renderTimeMs,
      ...presentedData,
    };
    const uniqueState = UniqueMechanicStateService.getState(actor);
    const itemDocument = (globalThis as unknown as {
      Item?: { fromDropData?: (data: Record<string, unknown>) => unknown };
    }).Item;
    const capabilities = detectPF2eCharacterCapabilities(actor, {
      ...(typeof itemDocument?.fromDropData === "function" ? { dropResolver: itemDocument.fromDropData } : {}),
    });
    const foundryVersion = String((game as Game & { version?: string }).version ?? "unknown");
    const pf2eVersion = String(game.system?.version ?? "unknown");
    const capabilityStatus = {
      richText: CharacterRichTextService.capabilityStatus(),
      craftingPreparedData: preparedCrafting.source === "prepared"
        ? "supported" as const
        : preparedCrafting.source === "adapter"
          ? "fallback" as const
          : "unsupported" as const,
    };
    const preparedFallbacks = [
      preparedSpellcasting.source !== "prepared" ? `spellcasting:${preparedSpellcasting.source}` : "",
      preparedCrafting.source !== "prepared" ? `crafting:${preparedCrafting.source}` : "",
    ].filter(Boolean);
    diagnostics.set(id, {
      actorId: id,
      actorName: actor.name ?? "",
      configuredMode: resolution.configuredMode,
      resolvedSheet: resolution.resolvedSheet,
      activeCore: resolution.core,
      adapterStatus: failedModules.length === 0 ? "ok" : failedModules.length < report.metrics.length ? "partial" : "failed",
      profile: getUniqueMechanicProfile(uniqueState.activeProfile)?.id ?? "",
      failedModules: failedModules.map(module => module.id),
      moduleMetrics: report.metrics,
      dirtyPaths: CharacterSheetCache.getDirtyPaths(id),
      renderTimeMs,
      foundryVersion,
      pf2eVersion,
      capabilities,
      capabilityStatus,
      preparedData: {
        spellcasting: preparedSpellcasting.source,
        crafting: preparedCrafting.source,
      },
      telemetry: PF2eBridgeTelemetry.list({ actorId: id }),
      fallbacksUsed: [
        ...failedModules.map(module => `module:${module.id}`),
        ...preparedFallbacks,
      ],
    });
    return context;
  },

  state(actor: Actor, sheetId?: ResolvedCharacterSheetMode): CharacterSheetState {
    return stateFor(actor, sheetId ?? this.resolve(actor).resolvedSheet);
  },

  permissions(actor: Actor): CharacterSheetPermissions {
    return permissionsFor(actor);
  },

  async setMode(
    actor: Actor,
    modeValue: unknown,
    options: { sheetClassId?: string } = {},
  ): Promise<CharacterSheetMode> {
    const mode = normalizeCharacterSheetMode(modeValue);
    if (!permissionsFor(actor).canChooseSheet) {
      const message = game.i18n?.localize("ETHERNUM.CharacterSheet.Errors.Permission")
        ?? "You do not have permission to change this sheet.";
      ui.notifications?.warn(message);
      throw new Error(message);
    }
    const update: Record<string, unknown> = {
      [`flags.${ETHERNUM.MODULE_NAME}.characterSheetMode`]: mode,
    };
    if (options.sheetClassId) update["flags.core.sheetClass"] = options.sheetClassId;
    await actor.update(update);
    CharacterSheetCache.invalidate(actorId(actor), "all");
    return mode;
  },

  diagnostics(actor: Actor): CharacterSheetDiagnostics | null {
    return diagnostics.get(actorId(actor)) ?? null;
  },
};
