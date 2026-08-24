import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const files = [
  "scripts/generators/mechanics/ai/UniqueMechanicAITypes.ts",
  "scripts/generators/mechanics/ai/UniqueMechanicAIDataBoundary.ts",
  "scripts/generators/mechanics/ai/UniqueMechanicAIDraftValidator.ts",
  "scripts/generators/mechanics/ai/UniqueMechanicAIAssistanceService.ts",
  "scripts/generators/OperationalGeneratorService.ts",
  "scripts/ui/GMControlCenterBridge.ts",
];
const implementation = files.map(file => readFileSync(resolve(root, file), "utf8")).join("\n");

describe("AI architectural gate", () => {
  it("does not ship a provider secret, direct network adapter or client persistence path", () => {
    expect(implementation).not.toMatch(/api[_-]?key|authorization\s*:|bearer\s+|api\.openai\.com/i);
    expect(implementation).not.toContain("localStorage");
    expect(implementation).not.toMatch(/game\.settings\.(?:get|set|register).*ai/i);
    expect(implementation).not.toMatch(/\bfetch\s*\(/);
  });

  it("never evaluates model output and keeps AI visibly experimental", () => {
    expect(implementation).not.toMatch(/\beval\s*\(|new\s+Function\s*\(/);
    expect(implementation).toContain("validateUniqueMechanicAIDraft");
    const template = readFileSync(resolve(root, "templates/ethernum-gm-control-tab.html"), "utf8");
    expect(template).toContain("[TESTE — AI]");
    expect(template).toContain("INDISPONÍVEL");
    expect(template).toContain("Fronteira de dados");
    expect(template).toContain("mechanic-ai-accept");
    expect(template).toContain("mechanic-ai-reject");
  });
});
