import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("HARVEST experiment registry", () => {
  const registry = readFileSync(join(process.cwd(), "docs", "EXPERIMENTAL_TESTS.md"), "utf8");

  it("tracks every current generated-mechanic and AI experiment with stable IDs", () => {
    expect(registry).toContain("HARVEST-EXP-0001 - Generated NPC Mechanic Template Families");
    expect(registry).toContain("HARVEST-EXP-0002 - AI-Assisted Mechanic Provider Architecture");
    expect(registry).toContain("HARVEST-EXP-0003 - AI Text Refinement Workflow");
    expect(registry.match(/HARVEST-EXP-\d{4}/g)).toHaveLength(3);
  });

  it("keeps active experiments awaiting explicit user approval", () => {
    expect(registry.match(/Status: `AWAITING_USER_APPROVAL`/g)).toHaveLength(3);
    expect(registry).not.toContain("## Active Experiments\n\nNone.");
  });
});
