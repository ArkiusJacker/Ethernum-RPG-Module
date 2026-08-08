import { describe, expect, it } from "vitest";
import {
  createUniqueExecution,
  reconcileUniqueExecutions,
  reservedResourceTotal,
  transitionUniqueExecution,
  upsertUniqueExecution,
} from "../scripts/unique/core/UniqueExecutionManager.js";

function execution(id: string, actionId: string, pulse: number, now = 1000) {
  return createUniqueExecution({
    id,
    now,
    profileId: "pipping-night",
    actionId,
    sourceActorUuid: "Actor.pipping",
    requesterUserId: "player",
    reservedResources: { pulse },
  });
}

describe("UniqueExecutionManager", () => {
  it("keeps two Pipping actions independently reserved", () => {
    const first = execution("execution-a", "ruin-note", 1);
    const second = execution("execution-b", "dark-whisper", 2, 1001);
    const executions = upsertUniqueExecution([first], second);

    expect(executions).toHaveLength(2);
    expect(reservedResourceTotal(executions, "pulse")).toBe(3);
    expect(executions.map(entry => entry.id)).toEqual(["execution-a", "execution-b"]);
  });

  it("cancelling or failing one execution releases only its reservation", () => {
    const initial = [
      execution("execution-a", "ruin-note", 1),
      execution("execution-b", "dark-whisper", 2, 1001),
    ];
    const cancelled = transitionUniqueExecution(initial, "execution-a", "cancelled");
    const failed = transitionUniqueExecution(cancelled, "execution-b", "failed", {
      error: "synthetic failure",
    });

    expect(reservedResourceTotal(cancelled, "pulse")).toBe(2);
    expect(reservedResourceTotal(failed, "pulse")).toBe(0);
    expect(failed.find(entry => entry.id === "execution-a")?.stage).toBe("cancelled");
    expect(failed.find(entry => entry.id === "execution-b")?.error).toBe("synthetic failure");
  });

  it("cancels stale interactive executions without touching completed history", () => {
    const stale = execution("stale", "ruin-note", 1, 1000);
    const completed = transitionUniqueExecution(
      [execution("done", "dark-whisper", 1, 900)],
      "done",
      "executed",
      {},
      950,
    )[0];
    const reconciled = reconcileUniqueExecutions([stale, completed], 500, 2000);

    expect(reconciled.find(entry => entry.id === "stale")?.stage).toBe("cancelled");
    expect(reconciled.find(entry => entry.id === "done")?.stage).toBe("executed");
  });
});
