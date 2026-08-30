import { describe, expect, it, vi } from "vitest";
import {
  CONTRACT_DOCUMENT_UNAVAILABLE_CODE,
  ContractDocumentStorageService,
  type ContractFilePickerPort,
} from "../scripts/contracts/ContractDocumentStorageService.js";

function filePicker(overrides: Partial<ContractFilePickerPort> = {}): ContractFilePickerPort {
  return {
    copyModuleAssetToDataFolder: vi.fn(async input => ({ path: input.destinationPath })),
    exists: vi.fn(async () => true),
    ...overrides,
  };
}

describe("ContractDocumentStorageService", () => {
  it("copies a bundled document without overwrite and verifies it before migration", async () => {
    const port = filePicker();
    const service = new ContractDocumentStorageService(port);

    await expect(service.prepareLegacyMigration(
      { storage: "module-asset", path: "modules/ethernum-rpg-module/assets/contracts/report.pdf" },
      "worlds/ethernum/contracts/report.pdf",
    )).resolves.toEqual({
      source: { storage: "module-asset", path: "modules/ethernum-rpg-module/assets/contracts/report.pdf" },
      destination: { storage: "foundry-data", path: "worlds/ethernum/contracts/report.pdf" },
    });
    expect(port.copyModuleAssetToDataFolder).toHaveBeenCalledWith({
      sourcePath: "modules/ethernum-rpg-module/assets/contracts/report.pdf",
      destinationPath: "worlds/ethernum/contracts/report.pdf",
      overwrite: false,
    });
    expect(port.exists).toHaveBeenCalledWith("worlds/ethernum/contracts/report.pdf");
  });

  it("does not complete migration when copy verification fails", async () => {
    const service = new ContractDocumentStorageService(filePicker({ exists: vi.fn(async () => false) }));
    await expect(service.prepareLegacyMigration(
      { storage: "module-asset", path: "modules/ethernum-rpg-module/assets/contracts/report.pdf" },
      "worlds/ethernum/contracts/report.pdf",
    )).rejects.toThrow(CONTRACT_DOCUMENT_UNAVAILABLE_CODE);
  });

  it("rejects non-bundled sources, unsafe destinations and unsafe FilePicker output", async () => {
    const service = new ContractDocumentStorageService(filePicker());
    await expect(service.prepareLegacyMigration(
      { storage: "foundry-data", path: "worlds/ethernum/contracts/report.pdf" },
      "worlds/ethernum/contracts/report-copy.pdf",
    )).rejects.toThrow(/module-asset/i);
    await expect(service.prepareLegacyMigration(
      { storage: "module-asset", path: "modules/ethernum-rpg-module/assets/contracts/report.pdf" },
      "C:\\Users\\Titan\\report.pdf",
    )).rejects.toThrow(/caminho portátil/i);

    const unsafeResult = filePicker({
      copyModuleAssetToDataFolder: vi.fn(async () => ({ path: "C:\\Users\\Titan\\report.pdf" })),
    });
    await expect(new ContractDocumentStorageService(unsafeResult).prepareLegacyMigration(
      { storage: "module-asset", path: "modules/ethernum-rpg-module/assets/contracts/report.pdf" },
      "worlds/ethernum/contracts/report.pdf",
    )).rejects.toThrow(/não portátil/i);
  });

  it("returns structured diagnostics instead of throwing for missing files", async () => {
    const service = new ContractDocumentStorageService(filePicker({ exists: vi.fn(async () => false) }));
    await expect(service.diagnose({ storage: "foundry-data", path: "worlds/ethernum/contracts/missing.pdf" }))
      .resolves.toEqual(expect.objectContaining({
        status: "unavailable",
        code: CONTRACT_DOCUMENT_UNAVAILABLE_CODE,
      }));
    await expect(service.diagnose({ storage: "foundry-document", uuid: "JournalEntry.contract" }))
      .resolves.toEqual({ status: "unchecked" });
  });
});
