import { describe, expect, it } from "vitest";
import {
  contractVisibilityAllows,
  createDefaultContractArchive,
  importLegacyJournalContracts,
  normalizeContractArchive,
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
});

