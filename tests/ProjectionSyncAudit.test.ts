import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("projection synchronization audit", () => {
  const main = readFileSync(resolve(root, "scripts/main.ts"), "utf8");
  const identity = readFileSync(resolve(root, "scripts/company/CompanyIdentityService.ts"), "utf8");

  it("uses domain-specific hook groups instead of one broad cascade", () => {
    expect(main).toContain('["createItem", "updateItem", "deleteItem"]');
    expect(main).toContain('["createJournalEntry", "updateJournalEntry", "deleteJournalEntry"]');
    expect(main).toContain("CompanyIdentityService.scheduleProjectionSync()");
  });

  it("debounces identity projection updates on the primary GM", () => {
    expect(identity).toContain("projectionSyncTimer");
    expect(identity).toContain("AutomationAuthority.isPrimaryGM()");
    expect(identity).toContain("repository.synchronizeProjections(data)");
  });
});
