import { getAdministrativeCommunicatorService } from "../administration/AdministrativeCommunicatorService.js";
import { getEthernumAuthorityBridge, setAuthorityPolicy } from "../core/EthernumAuthority.js";
import { PerformanceTelemetry } from "../core/PerformanceTelemetry.js";
import { UNIQUE_MECHANIC_PROFILES } from "../mechanics/registry.js";
import { getCompanyStoreService } from "../store/CompanyStoreService.js";
import { CombatMomentumSystem } from "../table/CombatMomentumSystem.js";
import { reconcileUniqueExecutions } from "../unique/core/UniqueExecutionManager.js";
import { UniqueMechanicsSystem } from "../unique/UniqueMechanics.js";
import { GMControlCenter, type GMControlCenterMountResult } from "./GMControlCenter.js";
import {
  GM_CONTROL_POLICY_CATEGORIES,
  type GMControlAuditEntry,
  type GMControlCenterCallbacks,
  type GMControlCenterSnapshot,
  type GMControlQueueItem,
} from "./GMControlCenterData.js";
import { dispatchGMControlCommand } from "./gm-control/GMControlCommandDispatcher.js";
import {
  actorByUuid,
  actors,
  downloadJson,
  showJson,
  users,
} from "./gm-control/GMCommandSupport.js";

const mountedControllers = new WeakMap<HTMLElement, {
  controller: GMControlCenter;
  unsubscribe: () => void;
}>();

function userName(id: string | undefined): string {
  return users().find(user => user.id === id)?.name ?? id ?? "";
}

function profileName(id: string | undefined): string {
  return (id ? UNIQUE_MECHANIC_PROFILES.get(id)?.label : undefined) ?? id ?? "";
}

export async function buildAuthorityControlSnapshot(): Promise<GMControlCenterSnapshot> {
  const stopMeasurement = PerformanceTelemetry.start("command-device.snapshot");
  const bridge = getEthernumAuthorityBridge();
  const [queue, audit, policies, diagnostics, storeRecovery] = await Promise.all([
    bridge.getQueue(),
    bridge.getAuditLog(),
    bridge.getPolicyConfiguration(),
    bridge.getDiagnostics(),
    getCompanyStoreService().getRecoveryCases(),
  ]);
  const queueRows: GMControlQueueItem[] = queue.map(entry => {
    const source = actorByUuid(entry.request.sourceActorUuid);
    return {
      id: entry.id,
      requestId: entry.request.requestId,
      status: "queued",
      createdAt: entry.queuedAt,
      expiresAt: entry.expiresAt,
      userId: entry.request.requesterId,
      userName: userName(entry.request.requesterId),
      actorId: source?.id ?? undefined,
      actorName: source?.name ?? entry.request.sourceActorUuid,
      profileId: entry.request.profileId,
      profileName: profileName(entry.request.profileId),
      actionType: entry.request.category,
      actionName: entry.request.actionId ?? entry.request.handlerId,
      summary: entry.request.summary ?? entry.request.details,
      payload: entry.request.payload,
      trustEligible: entry.request.handlerId !== "company-store.purchase.approval",
      approvable: true,
    };
  });
  const auditRows: GMControlAuditEntry[] = audit.map(entry => {
    const source = actorByUuid(entry.sourceActorUuid);
    return {
      id: entry.id,
      requestId: entry.requestId,
      status: entry.status,
      timestamp: entry.timestamp,
      userId: entry.requesterId,
      userName: userName(entry.requesterId),
      actorId: source?.id ?? undefined,
      actorName: source?.name ?? entry.sourceActorUuid,
      profileId: entry.profileId,
      profileName: profileName(entry.profileId),
      actionType: entry.category,
      actionName: entry.actionId ?? entry.handlerId,
      message: entry.error ?? entry.summary,
      durationMs: entry.latencyMs,
      payload: entry,
    };
  });
  const profileRows = [...UNIQUE_MECHANIC_PROFILES.values()].map(profile => ({
    id: `profile:${profile.id}`,
    category: "effect" as const,
    mode: policies.profiles?.[profile.id] ?? policies.default,
    profileId: profile.id,
    profileName: profile.label,
    inherited: policies.profiles?.[profile.id] === undefined,
  }));
  const auditStatusCount = (status: GMControlAuditEntry["status"]): number =>
    auditRows.filter(entry => entry.status === status).length;

  const snapshot: GMControlCenterSnapshot = {
    summary: {
      pending: queueRows.length,
      approved: auditStatusCount("approved"),
      rejected: auditStatusCount("rejected"),
      failures: auditStatusCount("failed"),
      onlineGMs: users().filter(user => user.active && user.isGM).length,
      averageLatencyMs: diagnostics.averageLatencyMs,
    },
    queue: queueRows,
    storeRecovery,
    audit: auditRows,
    policies: [
      ...GM_CONTROL_POLICY_CATEGORIES.map(category => ({
        id: `category:${category}`,
        category,
        mode: policies.categories?.[category] ?? policies.default,
        inherited: policies.categories?.[category] === undefined,
      })),
      ...profileRows,
    ],
    diagnostics: [
      { id: "primary", labelKey: "ETHERNUM.GMControl.Diagnostics.PrimaryGM", value: userName(diagnostics.primaryGMId ?? undefined), tone: diagnostics.primaryGMId ? "success" : "danger" },
      { id: "current", labelKey: "ETHERNUM.GMControl.Diagnostics.CurrentGM", value: userName(diagnostics.currentUserId ?? undefined) },
      { id: "users", labelKey: "ETHERNUM.GMControl.Diagnostics.OnlineUsers", value: users().filter(user => user.active).length },
      { id: "pending", labelKey: "ETHERNUM.GMControl.Diagnostics.Pending", value: diagnostics.queuedRequests, tone: diagnostics.queuedRequests ? "warning" : "neutral" },
      { id: "processed", labelKey: "ETHERNUM.GMControl.Diagnostics.Processed", value: diagnostics.executedRequests },
      { id: "failures", labelKey: "ETHERNUM.GMControl.Diagnostics.Failures", value: diagnostics.failedRequests, tone: diagnostics.failedRequests ? "danger" : "neutral" },
      { id: "last", labelKey: "ETHERNUM.GMControl.Diagnostics.LastRequest", value: diagnostics.lastRequestAt ? new Date(diagnostics.lastRequestAt).toLocaleTimeString() : "-" },
      { id: "latency", labelKey: "ETHERNUM.GMControl.Diagnostics.Latency", value: `${diagnostics.averageLatencyMs} ms` },
    ],
    actors: actors().map(actor => ({ id: actor.id!, name: actor.name })),
    userOptions: users().map(user => ({ value: user.id!, label: user.name })),
    profileOptions: [...UNIQUE_MECHANIC_PROFILES.values()].map(profile => ({ value: profile.id, label: profile.label })),
    actionTypeOptions: [...new Set(auditRows.map(entry => entry.actionType).filter(Boolean))]
      .map(value => ({ value: value!, label: value! })),
    actorOptions: actors().map(actor => ({ value: actor.id!, label: actor.name })),
    updatedAt: Date.now(),
  };
  const result = await getAdministrativeCommunicatorService().buildSnapshot(snapshot);
  stopMeasurement();
  return result;
}

export function createAuthorityControlCallbacks(): GMControlCenterCallbacks {
  const bridge = getEthernumAuthorityBridge();
  return {
    onQueueAction: async (action, item) => {
      if (action === "approve") await bridge.approve(item.id);
      else if (action === "reject") await bridge.reject(item.id);
      else if (action === "approve-trust") {
        if (!item.trustEligible) throw new Error("Esta requisição não permite alterar a política de confiança.");
        const queued = (await bridge.getQueue()).find(entry => entry.id === item.id);
        if (queued) await setAuthorityPolicy(queued.request.category, "auto", queued.request.profileId);
        await bridge.approve(item.id);
      } else if (action === "payload") showJson(item.actionName ?? item.requestId, item.payload);
      else if (action === "details") showJson(item.actionName ?? item.requestId, item);
    },
    onAuditAction: async (action, context) => {
      if (action === "clear") await bridge.clearAuditLog();
      else if (action === "export") downloadJson("ethernum-audit-log.json", await bridge.exportState());
      else if (context.entry) showJson(context.entry.actionName ?? context.entry.id, context.entry);
    },
    onPolicyChange: change => setAuthorityPolicy(change.category, change.mode, change.profileId),
    onDiagnosticsAction: async action => {
      if (action === "clear-expired") await bridge.expirePending();
      if (action === "reconcile") await bridge.reconcile();
    },
    onAdminAction: async (action, payload) => {
      if (action === "grant-fulgor") {
        const actor = game.actors?.get(payload.actorId ?? "") as Actor | undefined;
        if (actor) await CombatMomentumSystem.grantFulgor(actor);
      } else if (action === "cleanup-expired") await bridge.expirePending();
      else if (action === "clear-audit") await bridge.clearAuditLog();
      else if (action === "export-data") downloadJson("ethernum-authority-export.json", await bridge.exportState());
      else if (action === "reconcile-orphans") {
        await bridge.reconcile();
        await Promise.all(actors().map(async actor => {
          if (UniqueMechanicsSystem.getState(actor).activeProfile !== "pipping-night") return;
          const state = UniqueMechanicsSystem.getPippingState(actor);
          await UniqueMechanicsSystem.updatePippingState(actor, {
            executions: reconcileUniqueExecutions(state.executions, 10 * 60_000),
          });
        }));
      } else if (action === "cancel-stuck") {
        await Promise.all(actors().map(async actor => {
          if (UniqueMechanicsSystem.getState(actor).activeProfile !== "pipping-night") return;
          const state = UniqueMechanicsSystem.getPippingState(actor);
          await UniqueMechanicsSystem.updatePippingState(actor, {
            executions: reconcileUniqueExecutions(state.executions, 0, Date.now() + 1),
            pendingAction: undefined,
          });
        }));
      }
    },
    onDomainAction: async (action, payload) => {
      await dispatchGMControlCommand(action, payload);
    },
  };
}

export async function mountAuthorityControlCenter(
  host: HTMLElement,
  options: { reactive?: boolean; callbacks?: Partial<GMControlCenterCallbacks> } = {},
): Promise<GMControlCenterMountResult> {
  const previous = mountedControllers.get(host);
  previous?.unsubscribe();
  previous?.controller.destroy();
  const result = await GMControlCenter.mount(host, {
    dataSource: buildAuthorityControlSnapshot,
    callbacks: { ...createAuthorityControlCallbacks(), ...options.callbacks },
    isGM: () => Boolean(game.user?.isGM),
  });
  if (result.controller) {
    const unsubscribe = options.reactive === false
      ? () => undefined
      : getEthernumAuthorityBridge().subscribe(() => {
          void result.controller?.refresh();
        });
    mountedControllers.set(host, { controller: result.controller, unsubscribe });
  }
  return result;
}

export function unmountAuthorityControlCenter(host: HTMLElement): void {
  const mounted = mountedControllers.get(host);
  mounted?.unsubscribe();
  mounted?.controller.destroy();
  mountedControllers.delete(host);
}
