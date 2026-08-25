import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Foundry compatibility policy", () => {
  it("aligns the manifest with the runtime-tested Foundry 13 baseline", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "module.json"), "utf8"));
    const documentation = readFileSync(join(process.cwd(), "docs", "COMPATIBILITY.md"), "utf8");
    expect(manifest.compatibility).toEqual({ minimum: "13", verified: "13" });
    expect(documentation).toContain("| 13.351 | 7.8.0 | Supported baseline |");
    expect(documentation).toContain("| 12 | Compatible PF2e release | Unsupported / best effort code paths |");
    expect(documentation).toContain("| 11 | Compatible PF2e release | Unsupported |");
    expect(documentation).toContain("Foundry VTT 13.351 with PF2e 7.8.0");
  });
});
