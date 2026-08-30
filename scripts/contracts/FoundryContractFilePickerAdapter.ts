import {
  normalizeFoundryDataPath,
  normalizePublicModuleAssetPath,
} from "./ContractArchiveModel.js";
import type { ContractFilePickerPort } from "./ContractDocumentStorageService.js";

type BrowseResult = { files?: string[] };
type UploadResult = { path?: string };
type FilePickerStatic = {
  browse(source: string, target: string, options?: Record<string, unknown>): Promise<BrowseResult>;
  upload(source: string, target: string, file: File, options?: Record<string, unknown>): Promise<UploadResult>;
};

function picker(): FilePickerStatic {
  const root = globalThis as typeof globalThis & {
    FilePicker?: FilePickerStatic;
    foundry?: { applications?: { apps?: { FilePicker?: { implementation?: FilePickerStatic } } } };
  };
  const implementation = root.foundry?.applications?.apps?.FilePicker?.implementation ?? root.FilePicker;
  if (!implementation?.browse || !implementation?.upload) throw new Error("A infraestrutura FilePicker do Foundry não está disponível.");
  return implementation;
}

function parts(path: string): { directory: string; filename: string } {
  const separator = path.lastIndexOf("/");
  return {
    directory: separator >= 0 ? path.slice(0, separator) : "",
    filename: separator >= 0 ? path.slice(separator + 1) : path,
  };
}

function pathMatches(candidate: string, expected: string): boolean {
  const normalized = candidate.replaceAll("\\", "/").split(/[?#]/, 1)[0];
  return normalized === expected || normalized.endsWith(`/${expected}`);
}

export class FoundryContractFilePickerAdapter implements ContractFilePickerPort {
  async exists(pathValue: string): Promise<boolean> {
    const modulePath = normalizePublicModuleAssetPath(pathValue);
    if (modulePath) {
      const response = await fetch(modulePath, { method: "HEAD", credentials: "same-origin" });
      return response.ok;
    }
    const path = normalizeFoundryDataPath(pathValue);
    if (!path) return false;
    const { directory } = parts(path);
    const result = await picker().browse("data", directory, { wildcard: false });
    return (result.files ?? []).some(candidate => pathMatches(String(candidate), path));
  }

  async copyModuleAssetToDataFolder(input: {
    sourcePath: string;
    destinationPath: string;
    overwrite: false;
  }): Promise<{ path: string }> {
    const destinationPath = normalizeFoundryDataPath(input.destinationPath);
    if (!destinationPath) throw new Error("O destino selecionado não é um caminho portátil do Data Folder.");
    if (await this.exists(destinationPath)) throw new Error("Já existe um arquivo no destino selecionado; a migração nunca sobrescreve arquivos.");
    const response = await fetch(input.sourcePath, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Não foi possível ler o documento legado (${response.status}).`);
    const { directory, filename } = parts(destinationPath);
    const source = await response.blob();
    const file = new File([source], filename, { type: source.type || "application/octet-stream" });
    const uploaded = await picker().upload("data", directory, file, { notify: false });
    const uploadedPath = normalizeFoundryDataPath(uploaded.path);
    if (!uploadedPath || uploadedPath !== destinationPath) throw new Error("O FilePicker não confirmou o destino portátil solicitado.");
    return { path: uploadedPath };
  }
}

export function createFoundryContractFilePickerPort(): ContractFilePickerPort {
  return new FoundryContractFilePickerAdapter();
}
