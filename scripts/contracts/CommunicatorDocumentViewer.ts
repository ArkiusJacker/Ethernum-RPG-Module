import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";
import { ETHERNUM } from "../config.js";
import type { CommunicatorDocumentTarget } from "./ContractArchiveTypes.js";

export type CommunicatorPdfFitMode = "width" | "page" | "custom";
export type CommunicatorDocumentViewerAction =
  | "previous"
  | "next"
  | "zoom-in"
  | "zoom-out"
  | "fit-width"
  | "fit-page";

export interface CommunicatorDocumentViewerData {
  active: boolean;
  target?: CommunicatorDocumentTarget;
  title?: string;
  kind?: CommunicatorDocumentTarget["kind"];
  isPdf: boolean;
  isImage: boolean;
  isText: boolean;
  isJournal: boolean;
  isDossier: boolean;
  page: number;
  pageCount: number;
  pageLabel: string;
  zoom: number;
  zoomLabel: string;
  fitMode: CommunicatorPdfFitMode;
  canPrevious: boolean;
  canNext: boolean;
  canOpenExternal: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function sameTarget(left: CommunicatorDocumentTarget | null, right: CommunicatorDocumentTarget | null): boolean {
  return left?.contractId === right?.contractId && left?.attachmentId === right?.attachmentId;
}

export class CommunicatorDocumentViewer {
  private target: CommunicatorDocumentTarget | null = null;
  private page = 1;
  private pageCount = 1;
  private zoom = 100;
  private fitMode: CommunicatorPdfFitMode = "width";
  private renderTask: RenderTask | null = null;
  private renderSequence = 0;
  private readonly documents = new Map<string, Promise<PDFDocumentProxy>>();
  private pdfModule: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;

  setTarget(target: CommunicatorDocumentTarget | null): void {
    if (!sameTarget(this.target, target)) {
      this.page = 1;
      this.zoom = 100;
      this.fitMode = "width";
    }
    this.target = target;
    this.pageCount = Math.max(1, Math.trunc(Number(target?.pageCount) || 1));
    this.page = clamp(this.page, 1, this.pageCount);
  }

  clear(): void {
    this.renderSequence += 1;
    this.renderTask?.cancel();
    this.renderTask = null;
    this.target = null;
    this.page = 1;
    this.pageCount = 1;
    this.zoom = 100;
    this.fitMode = "width";
  }

  apply(action: CommunicatorDocumentViewerAction): boolean {
    if (!this.target || this.target.kind !== "pdf") return false;
    const before = `${this.page}:${this.zoom}:${this.fitMode}`;
    if (action === "previous") this.page = clamp(this.page - 1, 1, this.pageCount);
    if (action === "next") this.page = clamp(this.page + 1, 1, this.pageCount);
    if (action === "zoom-in") {
      this.zoom = clamp(this.zoom + 10, 50, 200);
      this.fitMode = "custom";
    }
    if (action === "zoom-out") {
      this.zoom = clamp(this.zoom - 10, 50, 200);
      this.fitMode = "custom";
    }
    if (action === "fit-width") this.fitMode = "width";
    if (action === "fit-page") this.fitMode = "page";
    return before !== `${this.page}:${this.zoom}:${this.fitMode}`;
  }

  getData(): CommunicatorDocumentViewerData {
    const kind = this.target?.kind;
    return {
      active: Boolean(this.target),
      ...(this.target ? { target: this.target, title: this.target.label, kind } : {}),
      isPdf: kind === "pdf",
      isImage: kind === "image",
      isText: kind === "text",
      isJournal: kind === "journal",
      isDossier: kind === "dossier",
      page: this.page,
      pageCount: this.pageCount,
      pageLabel: `${this.page} / ${this.pageCount}`,
      zoom: this.zoom,
      zoomLabel: `${this.zoom}%`,
      fitMode: this.fitMode,
      canPrevious: this.page > 1,
      canNext: this.page < this.pageCount,
      canOpenExternal: Boolean(this.target?.sourceUrl || this.target?.uuid),
    };
  }

  async render(host: HTMLElement | null): Promise<void> {
    const sequence = ++this.renderSequence;
    this.renderTask?.cancel();
    this.renderTask = null;
    if (!host || !this.target || this.target.kind !== "pdf" || !this.target.sourceUrl) return;

    const stage = host.querySelector<HTMLElement>("[data-document-viewer-stage]");
    const canvas = host.querySelector<HTMLCanvasElement>("[data-document-viewer-canvas]");
    const fallback = host.querySelector<HTMLElement>("[data-document-viewer-fallback]");
    if (!stage || !canvas || !fallback) return;

    stage.classList.add("is-loading");
    stage.classList.remove("is-unavailable");
    stage.setAttribute("aria-busy", "true");
    try {
      const document = await this.loadPdf(this.target.sourceUrl);
      if (sequence !== this.renderSequence) return;
      this.pageCount = Math.max(1, document.numPages);
      this.page = clamp(this.page, 1, this.pageCount);
      const page = await document.getPage(this.page);
      if (sequence !== this.renderSequence) return;

      const base = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(160, stage.clientWidth - 18);
      const availableHeight = Math.max(180, stage.clientHeight - 18);
      const fitScale = this.fitMode === "page"
        ? Math.min(availableWidth / base.width, availableHeight / base.height)
        : this.fitMode === "width"
          ? availableWidth / base.width
          : this.zoom / 100;
      const cssScale = clamp(fitScale, 0.25, 3);
      const outputScale = clamp(globalThis.devicePixelRatio || 1, 1, 2);
      const viewport = page.getViewport({ scale: cssScale * outputScale });
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas 2D indisponível.");

      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
      canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;
      const task = page.render({ canvasContext: context, viewport });
      this.renderTask = task;
      await task.promise;
      if (sequence !== this.renderSequence) return;
      stage.classList.remove("is-loading", "is-unavailable");
      stage.setAttribute("aria-busy", "false");
      canvas.hidden = false;
      fallback.hidden = true;
    } catch (error) {
      if (sequence !== this.renderSequence || (error as { name?: string }).name === "RenderingCancelledException") return;
      console.error("Ethernum | Embedded PDF render failed", error);
      stage.classList.remove("is-loading");
      stage.classList.add("is-unavailable");
      stage.setAttribute("aria-busy", "false");
      canvas.hidden = true;
      fallback.hidden = false;
    } finally {
      if (sequence === this.renderSequence) this.renderTask = null;
    }
  }

  destroy(): void {
    this.clear();
    for (const document of this.documents.values()) void document.then(pdf => pdf.destroy()).catch(() => undefined);
    this.documents.clear();
  }

  private async loadPdf(sourceUrl: string): Promise<PDFDocumentProxy> {
    const existing = this.documents.get(sourceUrl);
    if (existing) return existing;
    this.pdfModule ??= import("pdfjs-dist/legacy/build/pdf.mjs").then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = `modules/${ETHERNUM.MODULE_NAME}/scripts/pdf.worker.min.mjs`;
      return pdfjs;
    });
    const pdfjs = await this.pdfModule;
    const loading = pdfjs.getDocument({ url: sourceUrl, isEvalSupported: false }).promise;
    this.documents.set(sourceUrl, loading);
    void loading.catch(() => this.documents.delete(sourceUrl));
    return loading;
  }
}
