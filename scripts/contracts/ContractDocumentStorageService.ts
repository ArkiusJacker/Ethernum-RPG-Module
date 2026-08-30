import {
  normalizeContractStoredDocument,
  normalizeFoundryDataPath,
} from "./ContractArchiveModel.js";
import type {
  ContractDocumentAvailability,
  ContractStoredDocument,
} from "./ContractArchiveTypes.js";

export const CONTRACT_DOCUMENT_UNAVAILABLE_CODE = "DOCUMENT UNAVAILABLE" as const;

export interface ContractFilePickerPort {
  copyModuleAssetToDataFolder(input: {
    sourcePath: string;
    destinationPath: string;
    overwrite: false;
  }): Promise<{ path: string }>;
  exists(path: string): Promise<boolean>;
}

export interface PreparedContractDocumentMigration {
  source: ContractStoredDocument & { storage: "module-asset"; path: string };
  destination: ContractStoredDocument & { storage: "foundry-data"; path: string };
}

function unavailable(message: string): ContractDocumentAvailability {
  return {
    status: "unavailable",
    code: CONTRACT_DOCUMENT_UNAVAILABLE_CODE,
    message,
  };
}

export class ContractDocumentStorageService {
  constructor(private readonly filePicker: ContractFilePickerPort | null = null) {}

  async diagnose(document: ContractStoredDocument): Promise<ContractDocumentAvailability> {
    const normalized = normalizeContractStoredDocument(document);
    if (!normalized) return unavailable("A referência do documento é inválida.");
    if (normalized.storage === "foundry-document") return { status: "unchecked" };
    if (!this.filePicker) return { status: "unchecked" };

    try {
      return await this.filePicker.exists(normalized.path!)
        ? { status: "available" }
        : unavailable("O arquivo não está disponível no caminho portátil configurado.");
    } catch {
      return unavailable("Não foi possível verificar o arquivo no Data Folder.");
    }
  }

  async prepareLegacyMigration(
    sourceInput: ContractStoredDocument,
    selectedPath: string,
  ): Promise<PreparedContractDocumentMigration> {
    const source = normalizeContractStoredDocument(sourceInput);
    if (!source || source.storage !== "module-asset" || !source.path) {
      throw new Error("Somente documentos legados module-asset podem usar esta migração.");
    }
    const requestedPath = normalizeFoundryDataPath(selectedPath);
    if (!requestedPath) {
      throw new Error("Selecione um caminho portátil dentro do Foundry Data Folder.");
    }
    if (!this.filePicker) {
      throw new Error("O adaptador FilePicker não está disponível para copiar o documento.");
    }

    const copied = await this.filePicker.copyModuleAssetToDataFolder({
      sourcePath: source.path,
      destinationPath: requestedPath,
      overwrite: false,
    });
    const copiedPath = normalizeFoundryDataPath(copied.path);
    if (!copiedPath) throw new Error("O FilePicker retornou um caminho não portátil.");

    let exists = false;
    try {
      exists = await this.filePicker.exists(copiedPath);
    } catch {
      exists = false;
    }
    if (!exists) {
      throw new Error(`${CONTRACT_DOCUMENT_UNAVAILABLE_CODE}: a cópia não pôde ser confirmada no Data Folder.`);
    }

    return {
      source: { storage: "module-asset", path: source.path },
      destination: { storage: "foundry-data", path: copiedPath },
    };
  }
}
