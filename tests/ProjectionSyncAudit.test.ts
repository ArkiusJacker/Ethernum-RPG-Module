import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectionSyncScheduler } from "../scripts/company/ProjectionSyncScheduler.js";

const root = resolve(import.meta.dirname, "..");

describe("projection synchronization audit", () => {
  const main = readFileSync(resolve(root, "scripts/main.ts"), "utf8");
  afterEach(() => vi.useRealTimers());

  it("uses domain-specific hook groups instead of one broad cascade", () => {
    expect(main).toContain('["createItem", "updateItem", "deleteItem"]');
    expect(main).toContain('["createJournalEntry", "updateJournalEntry", "deleteJournalEntry"]');
    expect(main).toContain("CompanyIdentityService.scheduleProjectionSync()");
  });

  it("coalesces repeated projection requests into one logical synchronization", async () => {
    vi.useFakeTimers();
    const synchronize = vi.fn(async () => undefined);
    const scheduler = createProjectionSyncScheduler({ isAuthoritative: () => true, synchronize });

    expect(scheduler.schedule()).toBe(true);
    scheduler.schedule();
    scheduler.schedule();
    expect(scheduler.pending()).toBe(true);
    await vi.advanceTimersByTimeAsync(149);
    expect(synchronize).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(synchronize).toHaveBeenCalledOnce();
    expect(scheduler.pending()).toBe(false);
  });

  it("does not schedule projections on a non-authoritative client", async () => {
    vi.useFakeTimers();
    const synchronize = vi.fn(async () => undefined);
    const scheduler = createProjectionSyncScheduler({ isAuthoritative: () => false, synchronize });
    expect(scheduler.schedule(0)).toBe(false);
    await vi.runAllTimersAsync();
    expect(synchronize).not.toHaveBeenCalled();
  });
});
