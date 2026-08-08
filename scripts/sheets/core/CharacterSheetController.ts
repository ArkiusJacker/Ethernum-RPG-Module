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
import { CharacterSheetModuleRegistry, type CharacterSheetModuleMetric } from "./CharacterSheetModuleRegistry.js";
import { buildCharacterSheetPresentation } from "./CharacterSheetPresentation.js";
import {
  CharacterSheetRegistry,
  normalizeCharacterSheetMode,
  type CharacterSheetMode,
  type ResolvedCharacterSheetMode,
} from "./CharacterSheetRegistry.js";
import { CharacterSheetState, type CharacterSheetViewState } from "./CharacterSheetState.js";

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
  ui: CharacterSheetViewState & { tabs: ReturnType<CharacterSheetShellDefinition["tabs"]> };
  failedModules: Array<{ id: string; message: string }>;
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
    const sheetPermissions = permissionsFor(actor);
    const presentedData = buildCharacterSheetPresentation(moduleData, sheetPermissions);
    const spellcasting = presentedData.spellcasting as { hasSpellcasting?: boolean } | undefined;
    const tabs = shell.tabs(Boolean(spellcasting?.hasSpellcasting));
    const localState = stateFor(actor, resolution.resolvedSheet);
    const savedState = localState.load();
    const activeTab = tabs.some(tab => tab.id === savedState.activeTab)
      ? savedState.activeTab
      : tabs[0]?.id ?? "overview";
    if (activeTab !== savedState.activeTab) localState.setActiveTab(activeTab);
    const failedModules = report.metrics.flatMap(metric => metric.status === "failed"
      ? [{
        id: metric.id,
        message: metric.error instanceof Error ? metric.error.message : String(metric.error),
      }]
      : []);
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
        tabs: tabs.map(tab => ({
          ...tab,
          active: tab.id === activeTab,
          label: game.i18n?.localize(tab.label) ?? tab.label,
        })),
      },
      failedModules,
      renderTimeMs,
      ...presentedData,
    };
    const uniqueState = UniqueMechanicStateService.getState(actor);
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
    });
    return context;
  },

  state(actor: Actor, sheetId?: ResolvedCharacterSheetMode): CharacterSheetState {
    return stateFor(actor, sheetId ?? this.resolve(actor).resolvedSheet);
  },

  async setMode(actor: Actor, modeValue: unknown): Promise<CharacterSheetMode> {
    const mode = normalizeCharacterSheetMode(modeValue);
    if (!permissionsFor(actor).canChooseSheet) {
      const message = game.i18n?.localize("ETHERNUM.CharacterSheet.Errors.Permission")
        ?? "You do not have permission to change this sheet.";
      ui.notifications?.warn(message);
      throw new Error(message);
    }
    await actor.setFlag(ETHERNUM.MODULE_NAME, "characterSheetMode", mode);
    CharacterSheetCache.invalidate(actorId(actor), "all");
    return mode;
  },

  diagnostics(actor: Actor): CharacterSheetDiagnostics | null {
    return diagnostics.get(actorId(actor)) ?? null;
  },
};
