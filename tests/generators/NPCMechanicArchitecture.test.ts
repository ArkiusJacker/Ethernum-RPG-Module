import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string): string => readFileSync(new URL(path, import.meta.url), "utf8");

describe("generated NPC mechanic architecture", () => {
  it("keeps generator UI and services outside legacy unique-mechanic internals", () => {
    const implementation = [
      source("../../scripts/ui/GMControlCenterBridge.ts"),
      source("../../scripts/generators/OperationalGeneratorService.ts"),
      source("../../scripts/unique/services/GeneratedNPCMechanicService.ts"),
    ].join("\n");
    expect(implementation).not.toMatch(/UniqueMechanicsKernel|UniqueMechanicsLegacy/);
  });

  it("keeps generated definitions separate from the authored profile id union", () => {
    const profileTypes = source("../../scripts/mechanics/types.ts");
    const generatedTypes = source("../../scripts/generators/mechanics/GeneratedNPCMechanicTypes.ts");
    expect(generatedTypes).not.toContain("UniqueMechanicProfileId");
    expect(profileTypes).not.toContain("GeneratedNPCMechanicDefinition");
  });
});
