import { describe, expect, it } from "vitest";
import {
  contractVisibilityAllows,
  createDefaultContractArchive,
  importLegacyJournalContracts,
  normalizeContractArchive,
  normalizeContractStoredDocument,
  normalizeFoundryDataPath,
  normalizePublicModuleAssetPath,
} from "../scripts/contracts/ContractArchiveModel.js";

describe("ContractArchiveModel", () => {
  it("installs Contract 01 as the canonical structured reference", () => {
    const archive = createDefaultContractArchive();
    const [contract] = archive.contracts;

    expect(contract).toMatchObject({
      id: "contract-01-operation-manifesto-13",
      number: 1,
      title: "Operação Manifesto 13",
      status: "completed",
      grade: "S",
      informationFound: 5,
      informationTotal: 5,
      pdfPageCount: 13,
      publicAsset: true,
      reportDocument: {
        storage: "module-asset",
        path: "modules/ethernum-rpg-module/assets/contracts/contract-01-operation-manifesto-13.pdf",
      },
    });
    expect(contract?.pdfPath).toBe("modules/ethernum-rpg-module/assets/contracts/contract-01-operation-manifesto-13.pdf");
  });

  it("merges the reference contract without overwriting an existing customized record", () => {
    const archive = normalizeContractArchive({
      schemaVersion: 1,
      revision: 7,
      customExtension: { preserved: true },
      contracts: [{
        id: "contract-01-operation-manifesto-13",
        number: 1,
        title: "Operação Manifesto 13 - mesa",
        status: "active",
        attachments: [],
        visibility: { mode: "restricted", grants: [{ kind: "user", id: "u-1" }] },
        createdAt: 1,
        updatedAt: 2,
      }],
    });

    expect(archive.contracts).toHaveLength(1);
    expect(archive.contracts[0]).toMatchObject({ title: "Operação Manifesto 13 - mesa", status: "active" });
    expect(archive.customExtension).toEqual({ preserved: true });
  });

  it("evaluates GM, minimum rank, exact rank, user, agent and squad grants", () => {
    const viewer = { userId: "u-1", actorId: "a-1", rank: 3, squadIds: ["s-1"], isGM: false };

    expect(contractVisibilityAllows({ mode: "all" }, viewer)).toBe(true);
    expect(contractVisibilityAllows({ mode: "gm" }, viewer)).toBe(false);
    expect(contractVisibilityAllows({ mode: "gm" }, { ...viewer, isGM: true })).toBe(true);
    expect(contractVisibilityAllows({ mode: "restricted", minimumRank: 4 }, viewer)).toBe(false);
    expect(contractVisibilityAllows({ mode: "restricted", minimumRank: 2 }, viewer)).toBe(true);
    expect(contractVisibilityAllows({ mode: "restricted", allowedRanks: [2, 3] }, viewer)).toBe(true);
    expect(contractVisibilityAllows({ mode: "restricted", grants: [{ kind: "user", id: "u-1" }] }, viewer)).toBe(true);
    expect(contractVisibilityAllows({ mode: "restricted", grants: [{ kind: "agent", id: "a-1" }] }, viewer)).toBe(true);
    expect(contractVisibilityAllows({ mode: "restricted", grants: [{ kind: "squad", id: "s-1" }] }, viewer)).toBe(true);
    expect(contractVisibilityAllows({ mode: "restricted", grants: [{ kind: "squad", id: "other" }] }, viewer)).toBe(false);
  });

  it("imports legacy Journal contracts once without changing their source records", () => {
    const source = [{ uuid: "JournalEntry.legacy1", name: "Contrato 12 - Legado" }];
    const first = importLegacyJournalContracts(createDefaultContractArchive(), source, 100);
    const second = importLegacyJournalContracts(first, source, 200);

    expect(first.contracts).toHaveLength(2);
    expect(first.contracts[1]).toMatchObject({ number: 12, journalUuid: "JournalEntry.legacy1", status: "available" });
    expect(second).toEqual(first);
    expect(source).toEqual([{ uuid: "JournalEntry.legacy1", name: "Contrato 12 - Legado" }]);
  });

  it("rejects traversal and non-module document paths", () => {
    expect(normalizePublicModuleAssetPath("modules/ethernum-rpg-module/assets/contracts/report.pdf")).toBeTruthy();
    for (const path of [
      "javascript:alert(1)",
      "data:application/pdf;base64,AAA",
      "modules/ethernum-rpg-module/assets/../secret.pdf",
      "modules/ethernum-rpg-module/assets/%2e%2e/secret.pdf",
      "//example.test/report.pdf",
      "worlds/private/report.pdf",
    ]) expect(normalizePublicModuleAssetPath(path)).toBeUndefined();
  });

  it("normalizes portable stored documents with storage-specific locators", () => {
    expect(normalizeContractStoredDocument({ storage: "foundry-document", uuid: "JournalEntry.contract.Page.report", path: "ignored.pdf" }))
      .toEqual({ storage: "foundry-document", uuid: "JournalEntry.contract.Page.report" });
    expect(normalizeContractStoredDocument({ storage: "foundry-data", path: "worlds/ethernum/contracts/report 02.pdf", uuid: "ignored" }))
      .toEqual({ storage: "foundry-data", path: "worlds/ethernum/contracts/report 02.pdf" });
    expect(normalizeContractStoredDocument({ storage: "module-asset", path: "modules/ethernum-rpg-module/assets/contracts/report.pdf" }))
      .toEqual({ storage: "module-asset", path: "modules/ethernum-rpg-module/assets/contracts/report.pdf" });
    expect(normalizeContractStoredDocument({ storage: "foundry-document", path: "worlds/ethernum/report.pdf" })).toBeUndefined();
    expect(normalizeContractStoredDocument({ storage: "foundry-data", uuid: "JournalEntry.contract" })).toBeUndefined();
  });

  it("never accepts or persists absolute Windows paths in document fields", () => {
    for (const path of [
      "C:\\Users\\Titan\\report.pdf",
      "C:/Users/Titan/report.pdf",
      "\\\\server\\share\\report.pdf",
      "file:///C:/Users/Titan/report.pdf",
      "/C:/Users/Titan/report.pdf",
      "worlds/ethernum/../secret.pdf",
    ]) {
      expect(normalizeFoundryDataPath(path)).toBeUndefined();
      expect(normalizeContractStoredDocument({ storage: "foundry-data", path })).toBeUndefined();
    }

    const archive = normalizeContractArchive({
      contracts: [{
        id: "unsafe",
        number: 9,
        title: "Unsafe",
        pdfPath: "C:\\Users\\Titan\\report.pdf",
        reportDocument: { storage: "foundry-data", path: "C:\\Users\\Titan\\report.pdf" },
        attachments: [{
          id: "unsafe-file",
          label: "Unsafe file",
          kind: "pdf",
          path: "C:\\Users\\Titan\\annex.pdf",
          document: { storage: "foundry-data", path: "C:\\Users\\Titan\\annex.pdf" },
        }],
        visibility: { mode: "gm" },
      }],
    });
    const serialized = JSON.stringify(archive);
    expect(serialized).not.toContain("C:\\\\Users");
    expect(archive.contracts.find(contract => contract.id === "unsafe")?.reportDocument).toBeUndefined();
    expect(archive.contracts.find(contract => contract.id === "unsafe")?.attachments[0]?.document).toBeUndefined();
  });
});
