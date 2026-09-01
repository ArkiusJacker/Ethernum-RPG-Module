import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectPublicApiContract } from "../scripts/api/PublicApiContract.js";

const root = resolve(import.meta.dirname, "..");

describe("game.ethernum API classification", () => {
  const main = readFileSync(resolve(root, "scripts/main.ts"), "utf8");
  const docs = readFileSync(resolve(root, "docs/API.md"), "utf8");

  it("validates the runtime shape without exposing mutable repositories", () => {
    const action = () => undefined;
    const api = {
      apiVersion: "1",
      ui: {
        openGMControlCenter: action,
        closeGMControlCenter: action,
        openFieldCommunicator: action,
        closeFieldCommunicator: action,
      },
      contracts: { list: action },
      store: { list: action, purchase: action },
      ai: { status: action },
      diagnostics: { performance: action },
      macros: {},
    };
    expect(inspectPublicApiContract(api)).toEqual({ valid: true, issues: [] });
    expect(inspectPublicApiContract({ ...api, apiVersion: "2", CompanyStoreRepository: {} })).toMatchObject({
      valid: false,
      issues: expect.arrayContaining(["apiVersion must be 1", "CompanyStoreRepository is an internal repository"]),
    });
    expect(main).toContain("assertPublicApiContract(game.ethernum)");
  });

  it("documents supported, experimental, internal, and deprecated surfaces", () => {
    expect(docs).toContain("## API suportada");
    expect(docs).toContain("## API experimental");
    expect(docs).toContain("## Serviços internos");
    expect(docs).toContain("## Aliases descontinuados");
    expect(docs).toContain("Nenhum alias histórico foi removido");
  });
});
