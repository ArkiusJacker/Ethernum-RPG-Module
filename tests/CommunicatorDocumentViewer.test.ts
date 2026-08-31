import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(),
}));

import { CommunicatorDocumentViewer } from "../scripts/contracts/CommunicatorDocumentViewer.js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const target = {
  contractId: "contract-01",
  attachmentId: "__report__",
  label: "Relatório",
  kind: "pdf" as const,
  category: "report" as const,
  sourceUrl: "modules/ethernum-rpg-module/assets/contracts/report.pdf",
  pageCount: 13,
};

describe("CommunicatorDocumentViewer", () => {
  let viewer: CommunicatorDocumentViewer;

  beforeEach(() => {
    vi.clearAllMocks();
    viewer = new CommunicatorDocumentViewer();
  });

  it("clamps pages and exposes complete PDF controls", () => {
    viewer.setTarget(target);
    expect(viewer.getData()).toMatchObject({ page: 1, pageCount: 13, canPrevious: false, canNext: true, fitMode: "width" });
    expect(viewer.apply("previous")).toBe(false);
    for (let index = 0; index < 20; index += 1) viewer.apply("next");
    expect(viewer.getData()).toMatchObject({ page: 13, canPrevious: true, canNext: false });
  });

  it("bounds zoom and restores fit modes", () => {
    viewer.setTarget(target);
    for (let index = 0; index < 20; index += 1) viewer.apply("zoom-in");
    expect(viewer.getData()).toMatchObject({ zoom: 200, fitMode: "custom" });
    for (let index = 0; index < 30; index += 1) viewer.apply("zoom-out");
    expect(viewer.getData()).toMatchObject({ zoom: 50, fitMode: "custom" });
    viewer.apply("fit-page");
    expect(viewer.getData().fitMode).toBe("page");
    viewer.apply("fit-width");
    expect(viewer.getData().fitMode).toBe("width");
  });

  it("preserves controls for the same document and resets for a different target", () => {
    viewer.setTarget(target);
    viewer.apply("next");
    viewer.apply("zoom-in");
    viewer.setTarget({ ...target });
    expect(viewer.getData()).toMatchObject({ page: 2, zoom: 110 });
    viewer.setTarget({ ...target, attachmentId: "annex" });
    expect(viewer.getData()).toMatchObject({ page: 1, zoom: 100, fitMode: "width" });
  });

  it("enters the internal fallback when PDF.js cannot load the document", async () => {
    vi.mocked(getDocument).mockReturnValue({ promise: Promise.reject(new Error("missing")) } as never);
    const classes = new Set<string>();
    const stage = {
      clientWidth: 420,
      clientHeight: 300,
      classList: {
        add: (...names: string[]) => names.forEach(name => classes.add(name)),
        remove: (...names: string[]) => names.forEach(name => classes.delete(name)),
      },
      setAttribute: vi.fn(),
    };
    const canvas = { hidden: false };
    const fallback = { hidden: true, textContent: "" };
    const host = {
      querySelector: (selector: string) => selector.includes("stage") ? stage : selector.includes("canvas") ? canvas : fallback,
    };
    viewer.setTarget(target);

    await viewer.render(host as unknown as HTMLElement);

    expect(classes.has("is-unavailable")).toBe(true);
    expect(canvas.hidden).toBe(true);
    expect(fallback.hidden).toBe(false);
    expect(fallback.textContent).toContain("DOCUMENT UNAVAILABLE");
    expect(viewer.getData()).toMatchObject({
      unavailable: true,
      diagnosticCode: "DOCUMENT UNAVAILABLE",
    });
    expect(stage.setAttribute).toHaveBeenLastCalledWith("aria-busy", "false");
  });

  it("renders a preflight missing-file diagnostic without asking PDF.js to load", async () => {
    const classes = new Set<string>();
    const stage = {
      clientWidth: 420,
      clientHeight: 300,
      classList: {
        add: (...names: string[]) => names.forEach(name => classes.add(name)),
        remove: (...names: string[]) => names.forEach(name => classes.delete(name)),
      },
      setAttribute: vi.fn(),
    };
    const canvas = { hidden: false };
    const fallback = { hidden: true, textContent: "" };
    const host = {
      querySelector: (selector: string) => selector.includes("stage") ? stage : selector.includes("canvas") ? canvas : fallback,
    };
    viewer.setTarget({
      ...target,
      availability: {
        status: "unavailable",
        code: "DOCUMENT UNAVAILABLE",
        message: "Arquivo removido do Data Folder.",
      },
    });

    await viewer.render(host as unknown as HTMLElement);

    expect(classes.has("is-unavailable")).toBe(true);
    expect(canvas.hidden).toBe(true);
    expect(fallback.textContent).toBe("DOCUMENT UNAVAILABLE - Arquivo removido do Data Folder.");
    expect(getDocument).not.toHaveBeenCalled();
  });

  it("destroys cached loading tasks and releases the active canvas", async () => {
    const destroy = vi.fn(async () => undefined);
    const render = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
    const pdf = {
      numPages: 1,
      getPage: vi.fn(async () => ({
        getViewport: ({ scale }: { scale: number }) => ({ width: 100 * scale, height: 120 * scale }),
        render,
      })),
    };
    vi.mocked(getDocument).mockReturnValue({ promise: Promise.resolve(pdf), destroy } as never);
    const stage = {
      clientWidth: 420,
      clientHeight: 300,
      classList: { add: vi.fn(), remove: vi.fn() },
      setAttribute: vi.fn(),
    };
    const clearRect = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      hidden: true,
      style: { width: "", height: "", removeProperty: vi.fn() },
      getContext: vi.fn(() => ({ clearRect })),
    };
    const fallback = { hidden: true, textContent: "" };
    const host = {
      querySelector: (selector: string) => selector.includes("stage") ? stage : selector.includes("canvas") ? canvas : fallback,
    };
    viewer.setTarget(target);
    await viewer.render(host as unknown as HTMLElement);

    viewer.destroy();

    expect(destroy).toHaveBeenCalledOnce();
    expect(clearRect).toHaveBeenCalledOnce();
    expect(canvas).toMatchObject({ width: 1, height: 1, hidden: true });
  });
});
