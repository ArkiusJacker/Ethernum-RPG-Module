import { ETHERNUM } from "../config.js";
import { getEthernumAuthorityBridge } from "../core/EthernumAuthority.js";
import type { AuthorityBridgeEvent, AuthorityDiagnostics } from "../core/AuthorityBridge.js";
import { GMControlCenter } from "./GMControlCenter.js";
import {
  buildAuthorityControlSnapshot,
  mountAuthorityControlCenter,
  unmountAuthorityControlCenter,
} from "./GMControlCenterBridge.js";
import type { GMControlCenterSnapshot, GMControlTheme } from "./GMControlCenterData.js";

const ROOT_ID = "ethernum-gm-control-overlay";
const STORAGE_SUFFIX = "gmControlOverlayLayout";
const DEFAULT_WIDTH = 860;
const DEFAULT_HEIGHT = 700;
const MIN_WIDTH = 460;
const MIN_HEIGHT = 380;
const VIEWPORT_MARGIN = 8;
const DEFAULT_TOP = 100;
const DEFAULT_RIGHT = 24;
const DRAG_EXCLUSION = "button, input, select, textarea, a, summary, [data-no-drag]";

export interface GMControlOverlayLayout {
  minimized: boolean;
  left?: number;
  top?: number;
  width: number;
  height: number;
}

export type GMControlLauncherState = "normal" | "pending" | "warning" | "error";

interface ViewportSize {
  width: number;
  height: number;
}

function localize(key: string): string {
  return game.i18n?.localize(key) ?? key;
}

function format(key: string, data: Record<string, unknown>): string {
  return game.i18n?.format(key, data) ?? localize(key);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function viewport(): ViewportSize {
  return {
    width: Math.max(1, globalThis.innerWidth || 1280),
    height: Math.max(1, globalThis.innerHeight || 720),
  };
}

export function gmControlOverlayStorageKey(worldId: string, userId: string): string {
  return `${ETHERNUM.MODULE_NAME}.${worldId || "world"}.${userId || "user"}.${STORAGE_SUFFIX}`;
}

export function clampGMControlSize(
  width: number,
  height: number,
  view: ViewportSize,
): { width: number; height: number } {
  const maxWidth = Math.max(Math.min(MIN_WIDTH, view.width - VIEWPORT_MARGIN * 2), Math.floor(view.width * 0.9));
  const maxHeight = Math.max(Math.min(MIN_HEIGHT, view.height - VIEWPORT_MARGIN * 2), Math.floor(view.height * 0.9));
  return {
    width: clamp(Math.round(width), Math.min(MIN_WIDTH, maxWidth), maxWidth),
    height: clamp(Math.round(height), Math.min(MIN_HEIGHT, maxHeight), maxHeight),
  };
}

export function clampGMControlPosition(
  left: number,
  top: number,
  size: { width: number; height: number },
  view: ViewportSize,
): { left: number; top: number } {
  return {
    left: clamp(Math.round(left), VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, view.width - size.width - VIEWPORT_MARGIN)),
    top: clamp(Math.round(top), VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, view.height - size.height - VIEWPORT_MARGIN)),
  };
}

export function resolveGMControlLauncherState(
  pending: number,
  diagnostics?: Pick<AuthorityDiagnostics, "primaryGMId" | "lastError">,
): GMControlLauncherState {
  if (diagnostics?.lastError) return "error";
  if (!diagnostics?.primaryGMId) return "warning";
  return pending > 0 ? "pending" : "normal";
}

export function shouldMountGMControlCenter(isGM: boolean): boolean {
  return isGM;
}

function defaultLayout(): GMControlOverlayLayout {
  const size = clampGMControlSize(DEFAULT_WIDTH, DEFAULT_HEIGHT, viewport());
  return { minimized: true, width: size.width, height: size.height };
}

function currentStorageKey(): string {
  const worldId = String((game as unknown as { world?: { id?: string } }).world?.id ?? "world");
  return gmControlOverlayStorageKey(worldId, String(game.user?.id ?? "user"));
}

function readLayout(): GMControlOverlayLayout {
  const fallback = defaultLayout();
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(currentStorageKey()) ?? "null") as Partial<GMControlOverlayLayout> | null;
    if (!stored) return fallback;
    const size = clampGMControlSize(
      finite(stored.width) ? stored.width : fallback.width,
      finite(stored.height) ? stored.height : fallback.height,
      viewport(),
    );
    return {
      minimized: stored.minimized !== false,
      left: finite(stored.left) ? stored.left : undefined,
      top: finite(stored.top) ? stored.top : undefined,
      ...size,
    };
  } catch {
    return fallback;
  }
}

function readTheme(): GMControlTheme {
  try {
    return game.settings?.get(ETHERNUM.MODULE_NAME, "gmControlTheme") === "concordia"
      ? "concordia"
      : "ethernum";
  } catch {
    return "ethernum";
  }
}

export class GMControlCenterOverlay {
  private static instance: GMControlCenterOverlay | null = null;

  private readonly bridge = getEthernumAuthorityBridge();
  private readonly lifecycle = new AbortController();
  private shellListeners: AbortController | null = null;
  private unsubscribe: (() => void) | null = null;
  private root: HTMLElement | null = null;
  private host: HTMLElement | null = null;
  private controller: GMControlCenter | null = null;
  private layout = readLayout();
  private pending = 0;
  private launcherState: GMControlLauncherState = "normal";
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;
  private initializedBadge = false;
  private stale = true;
  private theme = readTheme();

  static initialize(): GMControlCenterOverlay | null {
    if (!shouldMountGMControlCenter(Boolean(game.user?.isGM)) || typeof document === "undefined") {
      this.destroy();
      return null;
    }
    if (this.instance) return this.instance;
    document.getElementById(ROOT_ID)?.remove();
    this.instance = new GMControlCenterOverlay();
    this.instance.initialize();
    return this.instance;
  }

  static async open(): Promise<boolean> {
    if (!game.user?.isGM) return false;
    const instance = this.initialize();
    if (!instance) return false;
    await instance.setMinimized(false);
    return true;
  }

  static close(): boolean {
    if (!game.user?.isGM || !this.instance) return false;
    void this.instance.setMinimized(true);
    return true;
  }

  static async toggle(): Promise<boolean> {
    if (!game.user?.isGM) return false;
    const instance = this.initialize();
    if (!instance) return false;
    await instance.setMinimized(!instance.layout.minimized);
    return true;
  }

  static minimize(): boolean {
    return this.close();
  }

  static restorePosition(): boolean {
    if (!game.user?.isGM || !this.instance) return false;
    this.instance.restoreDefaultPosition();
    return true;
  }

  static restoreSize(): boolean {
    if (!game.user?.isGM || !this.instance) return false;
    this.instance.restoreDefaultSize();
    return true;
  }

  static async refresh(): Promise<boolean> {
    if (!game.user?.isGM || !this.instance) return false;
    await this.instance.refresh(true);
    return true;
  }

  static destroy(): void {
    this.instance?.destroy();
    this.instance = null;
  }

  private initialize(): void {
    GMControlCenter.ensureStylesheet();
    this.ensureRoot();
    this.renderShell();
    this.unsubscribe = this.bridge.subscribe(event => this.onAuthorityEvent(event));
    globalThis.addEventListener("resize", () => this.clampToViewport(), { signal: this.lifecycle.signal });
    globalThis.addEventListener("beforeunload", () => GMControlCenterOverlay.destroy(), { signal: this.lifecycle.signal });
    void this.refreshBadge();
    if (!this.layout.minimized) void this.mountPanel();
  }

  private ensureRoot(): HTMLElement {
    if (this.root?.isConnected) return this.root;
    const root = document.createElement("aside");
    root.id = ROOT_ID;
    root.className = "ethernum-gm-control-overlay";
    root.setAttribute("aria-label", localize("ETHERNUM.GMControl.Overlay.Title"));
    document.body.appendChild(root);
    this.root = root;
    return root;
  }

  private renderShell(): void {
    const root = this.ensureRoot();
    this.shellListeners?.abort();
    this.shellListeners = new AbortController();
    root.className = `ethernum-gm-control-overlay theme-${this.theme} state-${this.launcherState}${this.layout.minimized ? " is-minimized" : ""}`;
    this.applyLayout();

    if (this.layout.minimized) {
      this.unmountPanel();
      const launcherLabel = `${localize("ETHERNUM.GMControl.Overlay.Open")}. ${localize(`ETHERNUM.GMControl.Overlay.States.${this.launcherState}`)}`;
      root.innerHTML = `
        <button type="button" class="ethernum-gm-control-launcher" data-gm-overlay-action="open"
          title="${launcherLabel}" aria-label="${launcherLabel}">
          <i class="fas fa-shield-halved" aria-hidden="true"></i>
          <span class="ethernum-gm-control-launcher__badge" data-gm-overlay-badge ${this.pending ? "" : "hidden"}>${this.pending}</span>
          <span class="ethernum-gm-control-launcher__status" aria-hidden="true"></span>
        </button>`;
    } else {
      root.innerHTML = `
        <header class="ethernum-gm-control-overlay__header" data-gm-overlay-drag>
          <div class="ethernum-gm-control-overlay__identity">
            <i class="fas fa-shield-halved" aria-hidden="true"></i>
            <div><strong>${localize("ETHERNUM.GMControl.Overlay.Title")}</strong><span data-gm-overlay-theme>${localize(`ETHERNUM.GMControl.Themes.${this.theme}`)}</span></div>
          </div>
          <div class="ethernum-gm-control-overlay__meta" data-no-drag>
            <span><i class="fas fa-user-shield" aria-hidden="true"></i>${localize("ETHERNUM.GMControl.Overlay.PrimaryGM")}: <strong data-gm-overlay-primary>${this.primaryGMName()}</strong></span>
            <span><i class="fas fa-inbox" aria-hidden="true"></i>${localize("ETHERNUM.GMControl.Overlay.Pending")}: <strong data-gm-overlay-pending>${this.pending}</strong></span>
          </div>
          <div class="ethernum-gm-control-overlay__commands" data-no-drag>
            ${this.headerButton("refresh", "fa-rotate", "ETHERNUM.GMControl.Actions.Refresh")}
            ${this.headerButton("restore-position", "fa-location-crosshairs", "ETHERNUM.GMControl.Overlay.RestorePosition")}
            ${this.headerButton("restore-size", "fa-expand", "ETHERNUM.GMControl.Overlay.RestoreSize")}
            ${this.headerButton("minimize", "fa-minus", "ETHERNUM.GMControl.Overlay.Minimize")}
          </div>
        </header>
        <div class="ethernum-gm-control-overlay__content" data-gm-overlay-host></div>
        <button type="button" class="ethernum-gm-control-overlay__resize" data-gm-overlay-resize
          title="${localize("ETHERNUM.GMControl.Overlay.Resize")}" aria-label="${localize("ETHERNUM.GMControl.Overlay.Resize")}"></button>`;
      this.host = root.querySelector<HTMLElement>("[data-gm-overlay-host]");
    }

    this.activateShellListeners();
  }

  private headerButton(action: string, icon: string, labelKey: string): string {
    const label = localize(labelKey);
    return `<button type="button" data-gm-overlay-action="${action}" title="${label}" aria-label="${label}"><i class="fas ${icon}" aria-hidden="true"></i></button>`;
  }

  private async mountPanel(): Promise<void> {
    if (this.layout.minimized || !this.host?.isConnected || this.controller) return;
    const result = await mountAuthorityControlCenter(this.host, {
      reactive: false,
      callbacks: {
        onThemeChange: theme => {
          this.theme = theme;
          this.updateShellMeta();
        },
      },
    });
    this.controller = result.controller;
    this.stale = false;
  }

  private unmountPanel(): void {
    if (this.host) unmountAuthorityControlCenter(this.host);
    this.controller = null;
    this.host = null;
  }

  private activateShellListeners(): void {
    const root = this.root;
    const signal = this.shellListeners?.signal;
    if (!root || !signal) return;
    root.querySelectorAll<HTMLElement>("[data-gm-overlay-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.gmOverlayAction;
        if (action === "open") void this.setMinimized(false);
        else if (action === "minimize") void this.setMinimized(true);
        else if (action === "refresh") void this.refresh(true);
        else if (action === "restore-position") this.restoreDefaultPosition();
        else if (action === "restore-size") this.restoreDefaultSize();
      }, { signal });
    });
    this.activateDrag(root, signal);
    this.activateResize(root, signal);
  }

  private activateDrag(root: HTMLElement, signal: AbortSignal): void {
    const handle = root.querySelector<HTMLElement>("[data-gm-overlay-drag], .ethernum-gm-control-launcher");
    handle?.addEventListener("pointerdown", event => {
      if (event.button !== 0 || (event.target as Element | null)?.closest(DRAG_EXCLUSION)) return;
      const rect = root.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const onMove = (move: PointerEvent): void => {
        const position = clampGMControlPosition(
          rect.left + move.clientX - startX,
          rect.top + move.clientY - startY,
          { width: root.offsetWidth, height: root.offsetHeight },
          viewport(),
        );
        this.setRootPosition(position.left, position.top);
      };
      const finish = (): void => {
        globalThis.removeEventListener("pointermove", onMove);
        globalThis.removeEventListener("pointerup", finish);
        globalThis.removeEventListener("pointercancel", finish);
        const next = root.getBoundingClientRect();
        this.layout.left = next.left;
        this.layout.top = next.top;
        this.persistLayout();
      };
      globalThis.addEventListener("pointermove", onMove);
      globalThis.addEventListener("pointerup", finish, { once: true });
      globalThis.addEventListener("pointercancel", finish, { once: true });
    }, { signal });
  }

  private activateResize(root: HTMLElement, signal: AbortSignal): void {
    root.querySelector<HTMLElement>("[data-gm-overlay-resize]")?.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const onMove = (move: PointerEvent): void => {
        const size = clampGMControlSize(
          rect.width + move.clientX - startX,
          rect.height + move.clientY - startY,
          viewport(),
        );
        root.style.width = `${size.width}px`;
        root.style.height = `${size.height}px`;
      };
      const finish = (): void => {
        globalThis.removeEventListener("pointermove", onMove);
        globalThis.removeEventListener("pointerup", finish);
        globalThis.removeEventListener("pointercancel", finish);
        const size = clampGMControlSize(root.offsetWidth, root.offsetHeight, viewport());
        this.layout = { ...this.layout, ...size };
        this.persistLayout();
        this.clampToViewport();
      };
      globalThis.addEventListener("pointermove", onMove);
      globalThis.addEventListener("pointerup", finish, { once: true });
      globalThis.addEventListener("pointercancel", finish, { once: true });
    }, { signal });
  }

  private async setMinimized(minimized: boolean): Promise<void> {
    if (!game.user?.isGM || this.layout.minimized === minimized && this.controller) return;
    this.layout.minimized = minimized;
    this.persistLayout();
    this.renderShell();
    if (!minimized) {
      await this.mountPanel();
      if (this.stale) await this.refresh(true);
    }
  }

  private async refresh(forcePanel = false): Promise<void> {
    if (!game.user?.isGM) return;
    const snapshot = await buildAuthorityControlSnapshot();
    this.applySnapshot(snapshot);
    if (this.layout.minimized && !forcePanel) return;
    if (!this.controller) await this.mountPanel();
    if (this.controller) {
      this.controller.setSnapshot(snapshot);
      await this.controller.render({ reload: false });
      this.stale = false;
    }
  }

  private async refreshBadge(requestId?: string): Promise<void> {
    const [queue, diagnostics] = await Promise.all([this.bridge.getQueue(), this.bridge.getDiagnostics()]);
    const previous = this.pending;
    this.pending = queue.length;
    this.launcherState = resolveGMControlLauncherState(this.pending, diagnostics);
    this.updateShellMeta();
    if (this.initializedBadge && this.pending > previous) {
      const entry = queue.find(item => item.request.requestId === requestId) ?? queue.at(-1);
      this.pulseLauncher();
      ui.notifications?.info(format("ETHERNUM.GMControl.Overlay.NewRequest", {
        actor: entry?.request.sourceActorUuid ?? localize("ETHERNUM.GMControl.Common.NotAvailable"),
        action: entry?.request.actionId ?? entry?.request.handlerId ?? localize("ETHERNUM.GMControl.Common.NotAvailable"),
      }));
    }
    this.initializedBadge = true;
  }

  private onAuthorityEvent(event: AuthorityBridgeEvent): void {
    this.stale = true;
    if (event.type === "queue" || event.type === "audit") void this.refreshBadge(event.requestId);
    if (this.layout.minimized) return;
    if (this.refreshTimer !== null) globalThis.clearTimeout(this.refreshTimer);
    this.refreshTimer = globalThis.setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 80);
  }

  private applySnapshot(snapshot: GMControlCenterSnapshot): void {
    this.pending = Number(snapshot.summary?.pending ?? snapshot.queue?.length ?? 0);
    this.updateShellMeta();
  }

  private updateShellMeta(): void {
    const root = this.root;
    if (!root) return;
    root.classList.remove("theme-ethernum", "theme-concordia", "state-normal", "state-pending", "state-warning", "state-error");
    root.classList.add(`theme-${this.theme}`, `state-${this.launcherState}`);
    const badge = root.querySelector<HTMLElement>("[data-gm-overlay-badge]");
    if (badge) {
      badge.textContent = String(this.pending);
      badge.hidden = this.pending === 0;
    }
    const pending = root.querySelector<HTMLElement>("[data-gm-overlay-pending]");
    if (pending) pending.textContent = String(this.pending);
    const primary = root.querySelector<HTMLElement>("[data-gm-overlay-primary]");
    if (primary) primary.textContent = this.primaryGMName();
    const theme = root.querySelector<HTMLElement>("[data-gm-overlay-theme]");
    if (theme) theme.textContent = localize(`ETHERNUM.GMControl.Themes.${this.theme}`);
    const launcher = root.querySelector<HTMLElement>(".ethernum-gm-control-launcher");
    if (launcher) {
      const label = `${localize("ETHERNUM.GMControl.Overlay.Open")}. ${localize(`ETHERNUM.GMControl.Overlay.States.${this.launcherState}`)}`;
      launcher.setAttribute("aria-label", label);
      launcher.setAttribute("title", label);
    }
  }

  private primaryGMName(): string {
    return this.bridge.getPrimaryGM()?.name ?? localize("ETHERNUM.GMControl.Common.NotAvailable");
  }

  private pulseLauncher(): void {
    const root = this.root;
    if (!root?.classList.contains("is-minimized")) return;
    root.classList.remove("has-new-request");
    void root.offsetWidth;
    root.classList.add("has-new-request");
    if (this.pulseTimer !== null) globalThis.clearTimeout(this.pulseTimer);
    this.pulseTimer = globalThis.setTimeout(() => root.classList.remove("has-new-request"), 750);
  }

  private applyLayout(): void {
    const root = this.root;
    if (!root) return;
    if (this.layout.minimized) {
      root.style.width = "auto";
      root.style.height = "auto";
    } else {
      const size = clampGMControlSize(this.layout.width, this.layout.height, viewport());
      this.layout = { ...this.layout, ...size };
      root.style.width = `${size.width}px`;
      root.style.height = `${size.height}px`;
    }
    if (finite(this.layout.left) && finite(this.layout.top)) {
      const rectSize = this.layout.minimized
        ? { width: 54, height: 54 }
        : { width: this.layout.width, height: this.layout.height };
      const position = clampGMControlPosition(this.layout.left, this.layout.top, rectSize, viewport());
      this.setRootPosition(position.left, position.top);
    } else {
      root.style.left = "auto";
      root.style.right = `${DEFAULT_RIGHT}px`;
      root.style.top = `${DEFAULT_TOP}px`;
    }
  }

  private setRootPosition(left: number, top: number): void {
    if (!this.root) return;
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
    this.root.style.right = "auto";
  }

  private clampToViewport(): void {
    if (!this.root) return;
    const size = this.layout.minimized
      ? { width: this.root.offsetWidth || 54, height: this.root.offsetHeight || 54 }
      : clampGMControlSize(this.layout.width, this.layout.height, viewport());
    if (!this.layout.minimized) {
      this.layout = { ...this.layout, ...size };
      this.root.style.width = `${size.width}px`;
      this.root.style.height = `${size.height}px`;
    }
    const rect = this.root.getBoundingClientRect();
    const position = clampGMControlPosition(rect.left, rect.top, size, viewport());
    this.setRootPosition(position.left, position.top);
    this.layout.left = position.left;
    this.layout.top = position.top;
    this.persistLayout();
  }

  private restoreDefaultPosition(): void {
    this.layout.left = undefined;
    this.layout.top = undefined;
    this.persistLayout();
    this.applyLayout();
  }

  private restoreDefaultSize(): void {
    const size = clampGMControlSize(DEFAULT_WIDTH, DEFAULT_HEIGHT, viewport());
    this.layout = { ...this.layout, ...size };
    this.persistLayout();
    this.applyLayout();
  }

  private persistLayout(): void {
    try {
      globalThis.localStorage?.setItem(currentStorageKey(), JSON.stringify(this.layout));
    } catch {
      // Storage may be unavailable in privacy-restricted browser contexts.
    }
  }

  private destroy(): void {
    this.lifecycle.abort();
    this.shellListeners?.abort();
    this.unsubscribe?.();
    if (this.refreshTimer !== null) globalThis.clearTimeout(this.refreshTimer);
    if (this.pulseTimer !== null) globalThis.clearTimeout(this.pulseTimer);
    this.unmountPanel();
    this.root?.remove();
    this.root = null;
  }
}
