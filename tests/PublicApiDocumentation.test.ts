import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("game.ethernum API classification", () => {
  const main = readFileSync(resolve(root, "scripts/main.ts"), "utf8");
  const docs = readFileSync(resolve(root, "docs/API.md"), "utf8");

  it("publishes a versioned facade without exposing mutable repositories", () => {
    expect(main).toContain('apiVersion: "1"');
    expect(main).toContain("diagnostics:");
    expect(main).not.toContain("CompanyStoreRepository,");
    expect(main).not.toContain("CompanyIdentityRepository,");
  });

  it("documents supported, experimental, internal, and deprecated surfaces", () => {
    expect(docs).toContain("## API suportada");
    expect(docs).toContain("## API experimental");
    expect(docs).toContain("## Serviços internos");
    expect(docs).toContain("## Aliases descontinuados");
    expect(docs).toContain("Nenhum alias histórico foi removido");
  });
});
