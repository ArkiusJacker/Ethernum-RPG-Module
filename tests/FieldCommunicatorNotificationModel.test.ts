import { describe, expect, it } from "vitest";
import {
  addNotificationReads,
  buildFieldCommunicatorNotifications,
  normalizeNotificationReadState,
} from "../scripts/communicator/FieldCommunicatorNotificationModel.js";

const sources = [
  { id: "normal", type: "message", title: "Rotina", createdAt: 10, priority: "normal" as const, targetAppId: "group" },
  { id: "priority", type: "contract", title: "Contrato ativo", createdAt: 20, priority: "priority" as const, targetAppId: "contracts", targetId: "contract-1" },
  { id: "critical", type: "broadcast", title: "Alerta", createdAt: 30, priority: "critical" as const, targetAppId: "group" },
];

describe("FieldCommunicatorNotificationModel", () => {
  it("sorts reliable sources, deduplicates IDs and preserves per-user read state", () => {
    const state = normalizeNotificationReadState({ ids: ["priority"], updatedAt: 5 });
    const result = buildFieldCommunicatorNotifications([
      ...sources,
      { ...sources[0]!, title: "Rotina atualizada", createdAt: 40 },
    ], state, "all");

    expect(result.map(item => item.id)).toEqual(["normal", "critical", "priority"]);
    expect(result[0]).toMatchObject({ title: "Rotina atualizada", read: false });
    expect(result.find(item => item.id === "priority")?.read).toBe(true);
  });

  it("applies priority and off filters without changing source data", () => {
    expect(buildFieldCommunicatorNotifications(sources, normalizeNotificationReadState(null), "priority")
      .map(item => item.id)).toEqual(["critical", "priority"]);
    expect(buildFieldCommunicatorNotifications(sources, normalizeNotificationReadState(null), "off")).toEqual([]);
    expect(sources).toHaveLength(3);
  });

  it("adds read IDs idempotently and keeps a bounded schema-safe payload", () => {
    const next = addNotificationReads(normalizeNotificationReadState({ ids: ["normal"] }), ["normal", "critical"], 99);
    expect(next).toEqual({ schemaVersion: 1, ids: ["normal", "critical"], updatedAt: 99 });
  });
});
