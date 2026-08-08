import { ETHERNUM } from "../config.js";
import { getEthernumAuthorityBridge, setAuthorityPolicy } from "../core/EthernumAuthority.js";
import { UNIQUE_MECHANIC_PROFILES } from "../mechanics/registry.js";
import { reconcileUniqueExecutions } from "../unique/core/UniqueExecutionManager.js";
import { UniqueMechanicsSystem } from "../unique/UniqueMechanics.js";
import { CombatMomentumSystem } from "../table/CombatMomentumSystem.js";
import { GMControlCenter, type GMControlCenterMountResult } from "./GMControlCenter.js";
import {
  GM_CONTROL_POLICY_CATEGORIES,
  type GMControlAuditEntry,
  type GMControlCenterCallbacks,
  type GMControlCenterSnapshot,
  type GMControlQueueItem,
} from "./GMControlCenterData.js";

const mountedControllers = new WeakMap<HTMLElement, {
  controller: GMControlCenter;
  unsubscribe: () => void;
}>();

function actors(): Actor[] {
  return (Array.from(game.actors ?? []) as Actor[])
    .filter(actor => (actor.type as string) === "character");
}

function users(): User[] {
  return Array.from(game.users ?? []) as User[];
}

function actorByUuid(uuid: string | undefined): Actor | undefined {
  return uuid ? actors().find(actor => actor.uuid === uuid) : undefined;
}

function userName(id: string | undefined): string {
  return users().find(user => user.id === id)?.name ?? id ?? "";
}

function profileName(id: string | undefined): string {
  return (id ? UNIQUE_MECHANIC_PROFILES.get(id)?.label : undefined) ?? id ?? "";
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showJson(title: string, value: unknown): void {
  new Dialog({
    title,
    content: `<pre class="ethernum-gm-json">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`,
    buttons: { close: { label: game.i18n!.localize("ETHERNUM.Buttons.Close") } },
  }).render(true);
}

export async function buildAuthorityControlSnapshot(): Promise<GMControlCenterSnapshot> {
  const bridge = getEthernumAuthorityBridge();
  const [queue, audit, policies, diagnostics] = await Promise.all([
    bridge.getQueue(),
    bridge.getAuditLog(),
    bridge.getPolicyConfiguration(),
    bridge.getDiagnostics(),
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
      trustEligible: true,
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

  return {
    summary: {
      pending: queueRows.length,
      approved: auditStatusCount("approved"),
      rejected: auditStatusCount("rejected"),
      failures: auditStatusCount("failed"),
      onlineGMs: users().filter(user => user.active && user.isGM).length,
      averageLatencyMs: diagnostics.averageLatencyMs,
    },
    queue: queueRows,
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
}

function callbacks(): GMControlCenterCallbacks {
  const bridge = getEthernumAuthorityBridge();
  return {
    onQueueAction: async (action, item) => {
      if (action === "approve") await bridge.approve(item.id);
      else if (action === "reject") await bridge.reject(item.id);
      else if (action === "approve-trust") {
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
  };
}

export async function mountAuthorityControlCenter(host: HTMLElement): Promise<GMControlCenterMountResult> {
  const previous = mountedControllers.get(host);
  previous?.unsubscribe();
  previous?.controller.destroy();
  const result = await GMControlCenter.mount(host, {
    dataSource: buildAuthorityControlSnapshot,
    callbacks: callbacks(),
    isGM: () => Boolean(game.user?.isGM),
  });
  if (result.controller) {
    const unsubscribe = getEthernumAuthorityBridge().subscribe(() => {
      void result.controller?.refresh();
    });
    mountedControllers.set(host, { controller: result.controller, unsubscribe });
  }
  return result;
}
