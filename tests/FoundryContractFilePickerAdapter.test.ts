import { afterEach, describe, expect, it, vi } from "vitest";
import { FoundryContractFilePickerAdapter } from "../scripts/contracts/FoundryContractFilePickerAdapter.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FoundryContractFilePickerAdapter", () => {
  it("checks portable Data Folder paths through FilePicker browse", async () => {
    const browse = vi.fn(async () => ({ files: ["worlds/test/contracts/report.pdf"] }));
    vi.stubGlobal("FilePicker", { browse, upload: vi.fn() });
    const adapter = new FoundryContractFilePickerAdapter();
    await expect(adapter.exists("worlds/test/contracts/report.pdf")).resolves.toBe(true);
    await expect(adapter.exists("C:\\Users\\Titan\\report.pdf")).resolves.toBe(false);
    expect(browse).toHaveBeenCalledWith("data", "worlds/test/contracts", { wildcard: false });
  });

  it("checks bundled module assets through a read-only HTTP request", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const adapter = new FoundryContractFilePickerAdapter();

    await expect(adapter.exists("modules/ethernum-rpg-module/assets/contracts/report.pdf")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "modules/ethernum-rpg-module/assets/contracts/report.pdf",
      { method: "HEAD", credentials: "same-origin" },
    );
  });

  it("copies through Foundry fetch/upload and refuses an existing destination", async () => {
    const browse = vi.fn(async (_source: string, directory: string) => ({
      files: directory === "worlds/existing" ? ["worlds/existing/report.pdf"] : [],
    }));
    const upload = vi.fn(async () => ({ path: "worlds/test/contracts/report.pdf" }));
    vi.stubGlobal("FilePicker", { browse, upload });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["pdf"], { type: "application/pdf" }), { status: 200 })));
    vi.stubGlobal("File", class extends Blob {
      name: string;
      constructor(bits: BlobPart[], name: string, options?: BlobPropertyBag) { super(bits, options); this.name = name; }
    });
    const adapter = new FoundryContractFilePickerAdapter();
    await expect(adapter.copyModuleAssetToDataFolder({
      sourcePath: "modules/ethernum-rpg-module/assets/contracts/report.pdf",
      destinationPath: "worlds/test/contracts/report.pdf",
      overwrite: false,
    })).resolves.toEqual({ path: "worlds/test/contracts/report.pdf" });
    expect(upload).toHaveBeenCalledWith("data", "worlds/test/contracts", expect.objectContaining({ name: "report.pdf" }), { notify: false });
    await expect(adapter.copyModuleAssetToDataFolder({
      sourcePath: "modules/ethernum-rpg-module/assets/contracts/report.pdf",
      destinationPath: "worlds/existing/report.pdf",
      overwrite: false,
    })).rejects.toThrow(/nunca sobrescreve/i);
  });
});
