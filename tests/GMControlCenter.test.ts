import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GM_CONTROL_POLICY_CATEGORIES,
  GM_CONTROL_QUEUE_STATUSES,
  GM_CONTROL_SECTIONS,
  buildGMControlCenterData,
  filterGMControlAuditEntries,
  paginateGMControlAuditEntries,
  type GMControlAuditEntry,
} from "../scripts/ui/GMControlCenterData.js";

const root = resolve(import.meta.dirname, "..");
const now = Date.UTC(2026, 7, 8, 12, 0, 0);

const audit: GMControlAuditEntry[] = [
  {
    id: "audit-1",
    requestId: "request-1",
    status: "executed",
    timestamp: now - 10 * 60 * 1_000,
    userId: "user-1",
    userName: "Player One",
    actorId: "actor-1",
    actorName: "Pipping",
    profileId: "pipping",
    profileName: "Pipping",
    actionType: "canvas",
    actionName: "living-night",
  },
  {
    id: "audit-2",
    requestId: "request-2",
    status: "failed",
    timestamp: now - 2 * 60 * 60 * 1_000,
    userId: "user-2",
    userName: "Player Two",
    actorId: "actor-2",
    actorName: "Jacker",
    profileId: "arkius-jacker",
    profileName: "Arkius Jacker",
    actionType: "actor-mutation",
    actionName: "kinetic-aura",
    message: "authority timeout",
  },
];

describe("GM Control Center data", () => {
  it("defines every required operational section and authority category", () => {
    expect(GM_CONTROL_SECTIONS).toEqual([
      "summary",
      "queue",
      "audit",
      "policies",
      "diagnostics",
      "admin",
    ]);
    expect(GM_CONTROL_POLICY_CATEGORIES).toContain("canvas");
    expect(GM_CONTROL_POLICY_CATEGORIES).toContain("multi-target");
    expect(GM_CONTROL_QUEUE_STATUSES).toContain("duplicate");
  });

  it("filters audit records by structured fields, period and search", () => {
    expect(filterGMControlAuditEntries(audit, { status: "failed" }, now)).toHaveLength(1);
    expect(filterGMControlAuditEntries(audit, { userId: "user-1" }, now)[0]?.id).toBe("audit-1");
    expect(filterGMControlAuditEntries(audit, { profileId: "pipping" }, now)[0]?.id).toBe("audit-1");
    expect(filterGMControlAuditEntries(audit, { actionType: "canvas" }, now)[0]?.id).toBe("audit-1");
    expect(filterGMControlAuditEntries(audit, { actorId: "actor-2" }, now)[0]?.id).toBe("audit-2");
    expect(filterGMControlAuditEntries(audit, { period: "hour" }, now)).toHaveLength(1);
    expect(filterGMControlAuditEntries(audit, { search: "TIMEOUT" }, now)[0]?.id).toBe("audit-2");
  });

  it("paginates the filtered audit dataset in bounded groups of 50", () => {
    const entries = Array.from({ length: 121 }, (_, index) => ({ id: `audit-${index}` }));
    const second = paginateGMControlAuditEntries(entries, 2, 50);
    expect(second.rows).toHaveLength(50);
    expect(second.rows[0]?.id).toBe("audit-50");
    expect(second.pagination).toMatchObject({
      page: 2,
      totalPages: 3,
      total: 121,
      from: 51,
      to: 100,
      hasPrevious: true,
      hasNext: true,
    });
    expect(paginateGMControlAuditEntries(entries, 99, 50).pagination.page).toBe(3);
  });

  it("prepares themes, GM visibility, queue actions and localized labels", () => {
    const view = buildGMControlCenterData({
      queue: [{
        id: "queue-1",
        requestId: "request-1",
        status: "queued",
        createdAt: now,
        payload: { operation: "test" },
        trustEligible: true,
      }],
      audit,
    }, {
      isGM: true,
      theme: "concordia",
      activeSection: "queue",
      now,
      locale: "en-US",
    }) as {
      isGM: boolean;
      theme: string;
      panels: Record<string, { active: boolean }>;
      queueRows: Array<{ actions: Array<{ id: string }>; statusLabelKey: string }>;
      summaryItems: Array<{ labelKey: string }>;
    };

    expect(view.isGM).toBe(true);
    expect(view.theme).toBe("concordia");
    expect(view.panels.queue.active).toBe(true);
    expect(view.queueRows[0]?.actions.map(action => action.id)).toEqual([
      "approve",
      "reject",
      "approve-trust",
      "details",
      "payload",
    ]);
    expect(view.queueRows[0]?.statusLabelKey).toBe("ETHERNUM.GMControl.Statuses.queued");
    expect(view.summaryItems.every(item => item.labelKey.startsWith("ETHERNUM.GMControl."))).toBe(true);
  });
});

describe("GM Control Center visual layer", () => {
  const template = readFileSync(resolve(root, "templates/ethernum-gm-control-tab.html"), "utf8");
  const styles = readFileSync(resolve(root, "styles/ethernum-gm-control.css"), "utf8");
  const controller = readFileSync(resolve(root, "scripts/ui/GMControlCenter.ts"), "utf8");

  it("keeps the template GM-only and covers every section", () => {
    expect(template).toMatch(/^\{\{#if isGM\}\}/);
    for (const section of GM_CONTROL_SECTIONS) {
      expect(template).toContain(`ethernum-gm-panel-${section}`);
      expect(template).toContain(`ETHERNUM.GMControl.Sections.${section}`);
    }
  });

  it("uses translation keys for controls and exposes every required action group", () => {
    expect(template).toContain("data-gm-queue-action");
    expect(template).toContain("data-gm-audit-action");
    expect(template).toContain("data-gm-audit-page");
    expect(template).toContain("data-gm-policy");
    expect(template).toContain("data-gm-diagnostics-action");
    expect(template).toContain("data-gm-admin-action");
    expect(template).toContain("{{localize");
    expect(template).not.toContain(">Aprovar<");
    expect(template).not.toContain(">Rejeitar<");
  });

  it("ships both responsive themes and enforces the runtime GM guard", () => {
    expect(styles).toContain(".ethernum-gm-control.theme-concordia");
    expect(styles).toContain("@media (max-width: 620px)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(controller).toContain("Boolean(game.user?.isGM)");
    expect(controller).toContain("onQueueAction");
    expect(controller).toContain("onPolicyChange");
  });
});
