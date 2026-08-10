import { ETHERNUM } from "../config.js";
import {
  addFieldCommunicatorApp,
  disableFieldCommunicatorApp,
  duplicateFieldCommunicatorApp,
  editFieldCommunicatorApp,
  exportFieldCommunicatorRegistry,
  importFieldCommunicatorRegistry,
  removeFieldCommunicatorApp,
  reorderFieldCommunicatorApps,
  resetFieldCommunicatorRegistry,
} from "../communicator/FieldCommunicatorRegistry.js";
import { FieldCommunicatorService } from "../communicator/FieldCommunicatorService.js";
import type { FieldCommunicatorApp } from "../communicator/FieldCommunicatorTypes.js";
import { getFieldCommunicatorBootMode } from "../settings.js";
import {
  FieldCommunicatorView,
  type FieldCommunicatorActionContext,
  type FieldCommunicatorAdminPayload,
  type FieldCommunicatorBootMode,
  type FieldCommunicatorRenderTemplate,
} from "./FieldCommunicatorView.js";

const ROOT_ID = "ethernum-field-communicator-overlay";
const STYLESHEET_ID = `${ETHERNUM.MODULE_NAME}-field-communicator-styles`;
const STYLESHEET_PATH = `modules/${ETHERNUM.MODULE_NAME}/styles/ethernum-field-communicator.css`;
const TEMPLATE_PATH = `${ETHERNUM.TEMPLATE_PATH}ethernum-field-communicator.html`;
const STORAGE_SUFFIX = "fieldCommunicatorLayout";
const BOOT_SESSION_SUFFIX = "fieldCommunicatorBooted";
const MIN_WIDTH = 360;
const MIN_HEIGHT = 560;
const DEFAULT_WIDTH = 520;
const DEFAULT_HEIGHT = 780;
const LAUNCHER_SIZE = 66;
const VIEWPORT_MARGIN = 8;
const DRAG_EXCLUSION = "button, input, select, textarea, a, [data-no-drag]";

interface CommunicatorLayout {
  minimized: boolean;
  left?: number;
  top?: number;
  launcherLeft?: number;
  launcherTop?: number;
  launcherLocked: boolean;
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

function localize(key: string, fallback: string): string {
  const translated = game.i18n?.localize(key);
  return translated && translated !== key ? translated : fallback;
}

function viewport(): ViewportSize {
  return {
    width: Math.max(1, globalThis.innerWidth || 1280),
    height: Math.max(1, globalThis.innerHeight || 720),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampFieldCommunicatorSize(
  width: number,
  height: number,
  view: ViewportSize,
): { width: number; height: number } {
  const maxWidth = Math.max(320, view.width - VIEWPORT_MARGIN * 2);
  const maxHeight = Math.max(480, view.height - VIEWPORT_MARGIN * 2);
  return {
    width: clamp(Math.round(width), Math.min(MIN_WIDTH, maxWidth), maxWidth),
    height: clamp(Math.round(height), Math.min(MIN_HEIGHT, maxHeight), maxHeight),
  };
}

export function clampFieldCommunicatorPosition(
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

function storageKey(suffix: string): string {
  const worldId = String((game as Game & { world?: { id?: string } }).world?.id ?? "world");
  const userId = String(game.user?.id ?? "user");
  return `${ETHERNUM.MODULE_NAME}.${worldId}.${userId}.${suffix}`;
}

function defaultLayout(): CommunicatorLayout {
  const size = clampFieldCommunicatorSize(DEFAULT_WIDTH, DEFAULT_HEIGHT, viewport());
  return { minimized: true, launcherLocked: false, ...size };
}

function readLayout(): CommunicatorLayout {
  const fallback = defaultLayout();
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(storageKey(STORAGE_SUFFIX)) ?? "null") as Partial<CommunicatorLayout> | null;
    if (!stored) return fallback;
    const size = clampFieldCommunicatorSize(Number(stored.width) || fallback.width, Number(stored.height) || fallback.height, viewport());
    return {
      minimized: stored.minimized !== false,
      left: Number.isFinite(stored.left) ? Number(stored.left) : undefined,
      top: Number.isFinite(stored.top) ? Number(stored.top) : undefined,
      launcherLeft: Number.isFinite(stored.launcherLeft) ? Number(stored.launcherLeft) : undefined,
      launcherTop: Number.isFinite(stored.launcherTop) ? Number(stored.launcherTop) : undefined,
      launcherLocked: stored.launcherLocked === true,
      ...size,
    };
  } catch {
    return fallback;
  }
}

function resolveRenderer(): FieldCommunicatorRenderTemplate {
  const renderer = (foundry.applications as Record<string, unknown> & {
    handlebars?: { renderTemplate?: FieldCommunicatorRenderTemplate };
  })?.handlebars?.renderTemplate;
  return renderer ?? (renderTemplate as unknown as FieldCommunicatorRenderTemplate);
}

function resolveBootMode(): FieldCommunicatorBootMode {
  const preference = getFieldCommunicatorBootMode();
  if (preference === "off") return "off";
  if (preference === "always") return "skippable";
  const key = storageKey(BOOT_SESSION_SUFFIX);
  return globalThis.sessionStorage?.getItem(key) === "true" ? "short" : "skippable";
}

function htmlValue(host: HTMLElement | null, selector: string): string {
  return host?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)?.value.trim() ?? "";
}

function htmlChecked(host: HTMLElement | null, selector: string): boolean {
  return host?.querySelector<HTMLInputElement>(selector)?.checked ?? false;
}

export class FieldCommunicatorOverlay {
  private static instance: FieldCommunicatorOverlay | null = null;

  private readonly service = new FieldCommunicatorService();
  private readonly lifecycle = new AbortController();
  private root: HTMLElement | null = null;
  private host: HTMLElement | null = null;
  private controller: FieldCommunicatorView | null = null;
  private layout = readLayout();
  private savingSettings = false;
  private previewUserId: string | null = null;
  private suppressLauncherClick = false;

  static initialize(): FieldCommunicatorOverlay | null {
    if (typeof document === "undefined" || !game.user) return null;
    if (this.instance) return this.instance;
    document.getElementById(ROOT_ID)?.remove();
    this.instance = new FieldCommunicatorOverlay();
    this.instance.initialize();
    return this.instance;
  }

  static async open(): Promise<boolean> {
    const instance = this.initialize();
    if (!instance) return false;
    await instance.setMinimized(false);
    return true;
  }

  static close(): boolean {
    if (!this.instance) return false;
    void this.instance.setMinimized(true);
    return true;
  }

  static async toggle(): Promise<boolean> {
    const instance = this.initialize();
    if (!instance) return false;
    await instance.setMinimized(!instance.layout.minimized);
    return true;
  }

  static async refresh(): Promise<boolean> {
    if (!this.instance?.controller) return false;
    await this.instance.controller.refresh();
    return true;
  }

  static destroy(): void {
    this.instance?.destroy();
    this.instance = null;
  }

  private initialize(): void {
    this.ensureStylesheet();
    this.ensureRoot();
    this.renderShell();
    globalThis.addEventListener("resize", () => this.clampToViewport(), { signal: this.lifecycle.signal });
    globalThis.addEventListener("ethernum-client-settings-changed", () => {
      if (!this.layout.minimized && !this.savingSettings) void this.remount();
    }, { signal: this.lifecycle.signal });
    globalThis.addEventListener("beforeunload", () => FieldCommunicatorOverlay.destroy(), { signal: this.lifecycle.signal });
    if (!this.layout.minimized) void this.mount();
  }

  private ensureStylesheet(): void {
    if (document.getElementById(STYLESHEET_ID)) return;
    const link = document.createElement("link");
    link.id = STYLESHEET_ID;
    link.rel = "stylesheet";
    link.href = STYLESHEET_PATH;
    document.head.appendChild(link);
  }

  private ensureRoot(): HTMLElement {
    if (this.root?.isConnected) return this.root;
    const root = document.createElement("aside");
    root.id = ROOT_ID;
    root.className = "ethernum-field-communicator-overlay is-minimized";
    root.setAttribute("aria-label", localize("ETHERNUM.FieldCommunicator.Title", "Comunicador de Campo Ethernum"));
    document.body.appendChild(root);
    this.root = root;
    root.addEventListener("pointerdown", event => this.beginDrag(event), { signal: this.lifecycle.signal });
    root.addEventListener("click", event => {
      const action = (event.target as Element | null)?.closest<HTMLElement>("[data-communicator-action], [data-field-overlay-action]")
        ?.dataset.communicatorAction ?? "click";
      this.playInterfaceTone(action);
    }, { signal: this.lifecycle.signal });
    return root;
  }

  private playInterfaceTone(action: string): void {
    try {
      if (game.settings?.get(ETHERNUM.MODULE_NAME, "fieldCommunicatorSounds") !== true) return;
      const audio = globalThis as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextClass = audio.AudioContext ?? audio.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const confirmation = action.includes("send") || action.includes("purchase") || action.includes("save");
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(confirmation ? 620 : 360, context.currentTime);
      gain.gain.setValueAtTime(0.018, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.055);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.055);
      oscillator.addEventListener("ended", () => void context.close(), { once: true });
    } catch {
      // Audio feedback is optional and must never block an action.
    }
  }

  private renderShell(): void {
    const root = this.ensureRoot();
    root.className = `ethernum-field-communicator-overlay${this.layout.minimized ? ` is-minimized is-launcher-${this.layout.launcherLocked ? "locked" : "unlocked"}` : " is-open"}`;
    this.applyLayout();
    if (this.layout.minimized) {
      this.unmount();
      const label = localize("ETHERNUM.FieldCommunicator.Open", "Abrir Comunicador de Campo");
      const lockLabel = this.layout.launcherLocked
        ? localize("ETHERNUM.FieldCommunicator.Launcher.Unlock", "Destravar posição do Comunicador")
        : localize("ETHERNUM.FieldCommunicator.Launcher.Lock", "Travar posição do Comunicador");
      root.innerHTML = `<div class="ethc-launcher-dock" data-field-launcher-drag>
        <button type="button" class="ethc-launcher" data-field-overlay-action="open" title="${label}" aria-label="${label}"><i class="fas fa-mobile-screen-button" aria-hidden="true"></i><span class="ethc-launcher__signal" aria-hidden="true"></span></button>
        <button type="button" class="ethc-launcher-lock" data-field-overlay-action="toggle-launcher-lock" title="${lockLabel}" aria-label="${lockLabel}" aria-pressed="${this.layout.launcherLocked}"><i class="fas ${this.layout.launcherLocked ? "fa-lock" : "fa-lock-open"}" aria-hidden="true"></i></button>
      </div>`;
      root.querySelector<HTMLElement>("[data-field-overlay-action='open']")?.addEventListener("click", event => {
        if (this.suppressLauncherClick) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        void this.setMinimized(false);
      }, { signal: this.lifecycle.signal });
      root.querySelector<HTMLElement>("[data-field-overlay-action='toggle-launcher-lock']")?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        this.toggleLauncherLock();
      }, { signal: this.lifecycle.signal });
      return;
    }
    root.innerHTML = `<div class="ethernum-field-communicator-overlay__host" data-field-communicator-host></div><button type="button" class="ethc-overlay-resize" data-field-overlay-resize title="Redimensionar" aria-label="Redimensionar"></button>`;
    this.host = root.querySelector<HTMLElement>("[data-field-communicator-host]");
    root.querySelector<HTMLElement>("[data-field-overlay-resize]")?.addEventListener("pointerdown", event => this.beginResize(event), { signal: this.lifecycle.signal });
  }

  private async mount(): Promise<void> {
    if (this.layout.minimized || !this.host?.isConnected || this.controller) return;
    const result = await FieldCommunicatorView.mount(this.host, {
      dataSource: () => this.service.buildSnapshot(this.previewUserId),
      renderTemplate: resolveRenderer(),
      templatePath: TEMPLATE_PATH,
      bootMode: resolveBootMode(),
      maxRecents: 8,
      callbacks: {
        onOpenApp: (app, context) => this.openApp(app as FieldCommunicatorApp, context),
        onSettings: context => context.controller.openPanel("settings"),
        onBootComplete: () => {
          globalThis.sessionStorage?.setItem(storageKey(BOOT_SESSION_SUFFIX), "true");
        },
        onAction: (action, data, context) => this.handleAction(action, data, context),
        onAdminAction: (action, payload, context) => this.handleAdminAction(action, payload, context),
        onError: (error, action) => this.handleError(error, action),
      },
    });
    this.controller = result.controller;
  }

  private unmount(): void {
    this.controller?.destroy();
    this.controller = null;
    this.host = null;
  }

  private async remount(): Promise<void> {
    this.controller?.destroy();
    this.controller = null;
    if (this.host?.isConnected) await this.mount();
  }

  private async setMinimized(minimized: boolean): Promise<void> {
    this.layout.minimized = minimized;
    this.persistLayout();
    this.renderShell();
    if (!minimized) await this.mount();
  }

  private toggleLauncherLock(): void {
    this.layout.launcherLocked = !this.layout.launcherLocked;
    this.persistLayout();
    this.renderShell();
  }

  private async openApp(app: FieldCommunicatorApp, _context: FieldCommunicatorActionContext) {
    if (!app.enabled) return;
    if (app.source === "custom") {
      await this.service.openCustomApp(app);
      return;
    }
    return { screen: "panel" as const, panelId: app.internalTarget ?? app.id };
  }

  private async handleAction(
    action: string,
    data: Readonly<Record<string, string>>,
    context: FieldCommunicatorActionContext,
  ): Promise<void> {
    if (action === "close" || action === "power") {
      await this.setMinimized(true);
      return;
    }
    if (action === "open-administration") {
      if (game.user?.isGM) await context.controller.openPanel("administration");
      return;
    }
    if (action === "open-notifications") {
      await context.controller.openPanel("conversations");
      return;
    }
    if (action === "open-document" || action === "view-scene") {
      const uuid = data.communicatorTargetId ?? data.targetId ?? data.communicatorUuid ?? data.uuid;
      if (uuid) await this.service.openDocument(uuid);
      return;
    }
    if (action === "send-group") {
      await this.service.sendGroupMessage(htmlValue(this.host, "[data-communicator-group-message]"));
      await context.controller.render();
      return;
    }
    if (action === "send-private") {
      await this.service.sendPrivateMessage(
        htmlValue(this.host, "[data-communicator-private-recipient]"),
        htmlValue(this.host, "[data-communicator-private-message]"),
      );
      await context.controller.render();
      return;
    }
    if (action === "request-purchase") {
      const uuid = data.communicatorTargetId ?? data.targetId ?? data.communicatorUuid ?? data.uuid;
      if (uuid) await this.service.requestPurchase(uuid);
      ui.notifications?.info(localize("ETHERNUM.FieldCommunicator.Messages.PurchaseRequested", "Solicitação enviada ao mestre."));
      return;
    }
    if (action === "save-settings") {
      await this.saveSettings();
      await this.remount();
      return;
    }
    if (action === "reset-settings") {
      await this.resetSettings();
      await this.remount();
      return;
    }
  }

  private async handleAdminAction(
    action: string,
    payload: FieldCommunicatorAdminPayload,
    context: FieldCommunicatorActionContext,
  ): Promise<void> {
    if (!game.user?.isGM) return;
    let registry = this.service.getRegistry();
    const appId = payload.appId ?? payload.targetId ?? payload.data.communicatorAppId;
    if (action === "preview-user") {
      this.previewUserId = payload.value || payload.data.value || null;
      await context.controller.render();
      return;
    }
    if (action === "add-app") {
      const input = await this.appDialog();
      if (!input) return;
      registry = addFieldCommunicatorApp(registry, input);
    } else if (action === "edit-app" && appId) {
      const existing = registry.apps.find(app => app.id === appId);
      const input = await this.appDialog(existing);
      if (!input) return;
      registry = editFieldCommunicatorApp(registry, appId, input);
    } else if (action === "duplicate-app" && appId) {
      registry = duplicateFieldCommunicatorApp(registry, appId);
    } else if (action === "toggle-app" && appId) {
      const existing = registry.apps.find(app => app.id === appId);
      registry = disableFieldCommunicatorApp(registry, appId, existing?.enabled !== false);
    } else if (action === "remove-app" && appId) {
      registry = removeFieldCommunicatorApp(registry, appId);
      ui.notifications?.info(localize("ETHERNUM.FieldCommunicator.Messages.AppRemoved", "Atalho removido; documento preservado."));
    } else if ((action === "move-up" || action === "move-down") && appId) {
      const ids = registry.apps.map(app => app.id);
      const index = ids.indexOf(appId);
      const target = action === "move-up" ? index - 1 : index + 1;
      if (index >= 0 && target >= 0 && target < ids.length) [ids[index], ids[target]] = [ids[target]!, ids[index]!];
      registry = reorderFieldCommunicatorApps(registry, ids);
    } else if (action === "move-before" && appId && payload.targetId) {
      const ids = registry.apps.map(app => app.id).filter(id => id !== appId);
      const target = ids.indexOf(payload.targetId);
      ids.splice(target < 0 ? ids.length : target, 0, appId);
      registry = reorderFieldCommunicatorApps(registry, ids);
    } else if (action === "reset-apps") {
      registry = resetFieldCommunicatorRegistry(registry);
    } else if (action === "export-apps") {
      const content = exportFieldCommunicatorRegistry(registry);
      await globalThis.navigator?.clipboard?.writeText(content);
      ui.notifications?.info(localize("ETHERNUM.FieldCommunicator.Actions.Export", "Configuração copiada."));
      return;
    } else if (action === "import-apps") {
      const content = await this.importDialog();
      if (content === null) return;
      const imported = importFieldCommunicatorRegistry(content);
      if (imported.warnings.length) ui.notifications?.warn(imported.warnings.join(" "));
      registry = imported.registry;
    } else {
      return;
    }
    await this.service.setRegistry(registry);
    await context.controller.render();
  }

  private async saveSettings(): Promise<void> {
    const updates: Array<[string, unknown]> = [
      ["fieldCommunicatorBoot", htmlValue(this.host, "[name='fieldCommunicatorBoot']") || "session"],
      ["fieldCommunicatorMotion", htmlValue(this.host, "[name='fieldCommunicatorMotion']") || "full"],
      ["fieldCommunicatorSounds", htmlChecked(this.host, "[name='fieldCommunicatorSounds']")],
      ["fieldCommunicatorTextScale", htmlValue(this.host, "[name='fieldCommunicatorTextScale']") || "normal"],
      ["fieldCommunicatorBrightness", htmlValue(this.host, "[name='fieldCommunicatorBrightness']") || "normal"],
      ["fieldCommunicatorHighContrast", htmlChecked(this.host, "[name='fieldCommunicatorHighContrast']")],
      ["fieldCommunicatorNotifications", htmlValue(this.host, "[name='fieldCommunicatorNotifications']") || "all"],
    ];
    this.savingSettings = true;
    try {
      for (const [key, value] of updates) await game.settings?.set(ETHERNUM.MODULE_NAME, key as never, value as never);
    } finally {
      this.savingSettings = false;
    }
  }

  private async resetSettings(): Promise<void> {
    const defaults: Array<[string, unknown]> = [
      ["fieldCommunicatorBoot", "session"],
      ["fieldCommunicatorMotion", "full"],
      ["fieldCommunicatorSounds", false],
      ["fieldCommunicatorTextScale", "normal"],
      ["fieldCommunicatorBrightness", "normal"],
      ["fieldCommunicatorHighContrast", false],
      ["fieldCommunicatorNotifications", "all"],
    ];
    this.savingSettings = true;
    try {
      for (const [key, value] of defaults) await game.settings?.set(ETHERNUM.MODULE_NAME, key as never, value as never);
    } finally {
      this.savingSettings = false;
    }
  }

  private appDialog(existing?: FieldCommunicatorApp): Promise<Record<string, unknown> | null> {
    const values = existing ?? {
      id: "",
      label: "",
      description: "",
      icon: "fa-solid fa-file",
      type: "document",
      targetUuid: "",
      order: this.service.getRegistry().apps.length * 10,
      enabled: true,
    } as FieldCommunicatorApp;
    const unlock = (values.unlock ?? {}) as Record<string, unknown>;
    const csv = (value: unknown) => Array.isArray(value) ? value.join(", ") : "";
    const content = `<form class="ethc-admin-dialog">
      <label>ID<input name="id" value="${this.escapeAttribute(values.id)}"></label>
      <label>${localize("ETHERNUM.FieldCommunicator.Admin.Label", "Nome")}<input name="label" value="${this.escapeAttribute(values.label)}" required></label>
      <label>${localize("ETHERNUM.FieldCommunicator.Admin.Description", "Descrição")}<textarea name="description">${this.escapeAttribute(values.description)}</textarea></label>
      <label>${localize("ETHERNUM.FieldCommunicator.Admin.Icon", "Ícone Font Awesome")}<input name="icon" value="${this.escapeAttribute(values.icon)}"></label>
      <label>${localize("ETHERNUM.FieldCommunicator.Admin.Type", "Tipo")}<select name="type">${["document", "scene", "compendium", "journal-folder", "internal", "external"].map(type => `<option value="${type}"${values.type === type ? " selected" : ""}>${type}</option>`).join("")}</select></label>
      <label>${localize("ETHERNUM.FieldCommunicator.Admin.Target", "UUID ou destino")}<input name="target" value="${this.escapeAttribute(values.targetUrl ?? values.targetUuid ?? values.internalTarget ?? "")}"></label>
      <label>Destaque<input name="accent" placeholder="gold, danger, success ou #RRGGBB" value="${this.escapeAttribute(values.accent ?? "")}"></label>
      <label>Notificação<input name="badge" placeholder="auto, none ou número" value="${this.escapeAttribute(values.badge ?? "")}"></label>
      <label>${localize("ETHERNUM.FieldCommunicator.Admin.Order", "Ordem")}<input type="number" name="order" value="${Number(values.order) || 0}"></label>
      <label>${localize("ETHERNUM.FieldCommunicator.Admin.MinimumRank", "Rank mínimo")}<input type="number" name="minimumRank" value="${Number(values.minimumRank) || 0}"></label>
      <label>Ranks autorizados<input name="allowedRanks" placeholder="1, 2, 3" value="${this.escapeAttribute(csv(values.allowedRanks))}"></label>
      <label>Agentes autorizados<input name="allowedAgents" placeholder="IDs separados por vírgula" value="${this.escapeAttribute(csv(values.allowedAgents))}"></label>
      <label>Esquadrões autorizados<input name="allowedSquads" placeholder="IDs separados por vírgula" value="${this.escapeAttribute(csv(values.allowedSquads))}"></label>
      <label>Desbloqueio<select name="unlockKind"><option value="">Nenhum</option>${["actor-flag", "user-flag", "world-setting", "document-exists"].map(kind => `<option value="${kind}"${unlock.kind === kind ? " selected" : ""}>${kind}</option>`).join("")}</select></label>
      <label>Chave de desbloqueio<input name="unlockKey" value="${this.escapeAttribute(unlock.key ?? "")}"></label>
      <label>Valor esperado<input name="unlockEquals" value="${this.escapeAttribute(unlock.equals ?? "")}"></label>
      <label><input type="checkbox" name="enabled"${values.enabled === false ? "" : " checked"}> ${localize("ETHERNUM.FieldCommunicator.Admin.Enabled", "Ativo")}</label>
    </form>`;
    return new Promise(resolve => {
      new Dialog({
        title: localize("ETHERNUM.FieldCommunicator.Admin.Title", "Configurar aplicativo"),
        content,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: localize("ETHERNUM.Buttons.Save", "Salvar"),
            callback: html => {
              const form = html.find("form")[0] as HTMLFormElement;
              const data = new FormData(form);
              const type = String(data.get("type") ?? "document");
              const target = String(data.get("target") ?? "");
              const split = (name: string) => String(data.get(name) ?? "").split(",").map(value => value.trim()).filter(Boolean);
              const rawBadge = String(data.get("badge") ?? "").trim();
              const badge = /^\d+$/.test(rawBadge) ? Number(rawBadge) : rawBadge || undefined;
              const unlockKind = String(data.get("unlockKind") ?? "");
              const rawEquals = String(data.get("unlockEquals") ?? "").trim();
              const unlockEquals = rawEquals === "true" ? true : rawEquals === "false" ? false : rawEquals !== "" && Number.isFinite(Number(rawEquals)) ? Number(rawEquals) : rawEquals || undefined;
              resolve({
                id: String(data.get("id") ?? ""),
                label: String(data.get("label") ?? ""),
                description: String(data.get("description") ?? ""),
                icon: String(data.get("icon") ?? ""),
                type,
                ...(type === "external" ? { targetUrl: target } : type === "internal" ? { internalTarget: target } : { targetUuid: target }),
                accent: String(data.get("accent") ?? ""),
                badge,
                order: Number(data.get("order")),
                minimumRank: Number(data.get("minimumRank")),
                allowedRanks: split("allowedRanks").map(Number).filter(Number.isFinite),
                allowedAgents: split("allowedAgents"),
                allowedSquads: split("allowedSquads"),
                ...(unlockKind ? { unlock: { kind: unlockKind, key: String(data.get("unlockKey") ?? ""), equals: unlockEquals } } : {}),
                enabled: data.get("enabled") === "on",
              });
            },
          },
          cancel: { label: localize("ETHERNUM.Buttons.Close", "Fechar"), callback: () => resolve(null) },
        },
        default: "save",
        close: () => resolve(null),
      }).render(true);
    });
  }

  private importDialog(): Promise<string | null> {
    return new Promise(resolve => {
      new Dialog({
        title: localize("ETHERNUM.FieldCommunicator.Actions.Import", "Importar JSON"),
        content: '<textarea data-communicator-import style="width:100%;min-height:280px" aria-label="JSON"></textarea>',
        buttons: {
          import: { label: localize("ETHERNUM.FieldCommunicator.Actions.Import", "Importar"), callback: html => resolve(String(html.find("[data-communicator-import]").val() ?? "")) },
          cancel: { label: localize("ETHERNUM.Buttons.Close", "Fechar"), callback: () => resolve(null) },
        },
        default: "import",
        close: () => resolve(null),
      }).render(true);
    });
  }

  private handleError(error: unknown, action: string): void {
    console.error(`${ETHERNUM.MODULE_NAME} | Field Communicator ${action}`, error);
    ui.notifications?.error(error instanceof Error ? error.message : localize("ETHERNUM.FieldCommunicator.Errors.ActionFailed", "Operação indisponível."));
  }

  private beginDrag(event: PointerEvent): void {
    if (this.layout.minimized) {
      this.beginLauncherDrag(event);
      return;
    }
    const root = this.root;
    const target = event.target as Element | null;
    if (!root || this.layout.minimized || event.button !== 0 || !target?.closest("[data-communicator-drag]") || target.closest(DRAG_EXCLUSION)) return;
    const rect = root.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (next: PointerEvent) => {
      const position = clampFieldCommunicatorPosition(rect.left + next.clientX - startX, rect.top + next.clientY - startY, { width: root.offsetWidth, height: root.offsetHeight }, viewport());
      root.style.left = `${position.left}px`;
      root.style.top = `${position.top}px`;
      root.style.right = "auto";
    };
    const finish = () => {
      globalThis.removeEventListener("pointermove", move);
      const current = root.getBoundingClientRect();
      this.layout.left = current.left;
      this.layout.top = current.top;
      this.persistLayout();
    };
    globalThis.addEventListener("pointermove", move);
    globalThis.addEventListener("pointerup", finish, { once: true });
  }

  private beginLauncherDrag(event: PointerEvent): void {
    const root = this.root;
    const target = event.target as Element | null;
    if (!root || this.layout.launcherLocked || event.button !== 0 || !target?.closest("[data-field-launcher-drag]")
      || target.closest("[data-field-overlay-action='toggle-launcher-lock']")) return;
    const rect = root.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    const move = (next: PointerEvent) => {
      const distance = Math.hypot(next.clientX - startX, next.clientY - startY);
      if (!moved && distance < 5) return;
      moved = true;
      root.classList.add("is-dragging");
      const position = clampFieldCommunicatorPosition(
        rect.left + next.clientX - startX,
        rect.top + next.clientY - startY,
        { width: LAUNCHER_SIZE, height: LAUNCHER_SIZE },
        viewport(),
      );
      root.style.left = `${position.left}px`;
      root.style.top = `${position.top}px`;
      root.style.right = "auto";
      root.style.bottom = "auto";
    };
    const finish = () => {
      globalThis.removeEventListener("pointermove", move);
      root.classList.remove("is-dragging");
      if (!moved) return;
      const current = root.getBoundingClientRect();
      this.layout.launcherLeft = current.left;
      this.layout.launcherTop = current.top;
      this.persistLayout();
      this.suppressLauncherClick = true;
      globalThis.setTimeout(() => { this.suppressLauncherClick = false; }, 0);
    };
    globalThis.addEventListener("pointermove", move);
    globalThis.addEventListener("pointerup", finish, { once: true });
  }

  private beginResize(event: PointerEvent): void {
    const root = this.root;
    if (!root || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = root.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (next: PointerEvent) => {
      const size = clampFieldCommunicatorSize(rect.width + next.clientX - startX, rect.height + next.clientY - startY, viewport());
      root.style.width = `${size.width}px`;
      root.style.height = `${size.height}px`;
    };
    const finish = () => {
      globalThis.removeEventListener("pointermove", move);
      this.layout = { ...this.layout, ...clampFieldCommunicatorSize(root.offsetWidth, root.offsetHeight, viewport()) };
      this.persistLayout();
      this.clampToViewport();
    };
    globalThis.addEventListener("pointermove", move);
    globalThis.addEventListener("pointerup", finish, { once: true });
  }

  private applyLayout(): void {
    const root = this.root;
    if (!root) return;
    if (this.layout.minimized) {
      const view = viewport();
      const position = clampFieldCommunicatorPosition(
        this.layout.launcherLeft ?? view.width - LAUNCHER_SIZE - 24,
        this.layout.launcherTop ?? Math.max(84, (view.height - LAUNCHER_SIZE) / 2),
        { width: LAUNCHER_SIZE, height: LAUNCHER_SIZE },
        view,
      );
      root.style.width = `${LAUNCHER_SIZE}px`;
      root.style.height = `${LAUNCHER_SIZE}px`;
      root.style.left = `${position.left}px`;
      root.style.top = `${position.top}px`;
      root.style.right = "auto";
      root.style.bottom = "auto";
      return;
    }
    const size = clampFieldCommunicatorSize(this.layout.width, this.layout.height, viewport());
    root.style.width = `${size.width}px`;
    root.style.height = `${size.height}px`;
    const position = clampFieldCommunicatorPosition(
      this.layout.left ?? viewport().width - size.width - 24,
      this.layout.top ?? Math.max(24, (viewport().height - size.height) / 2),
      size,
      viewport(),
    );
    root.style.left = `${position.left}px`;
    root.style.top = `${position.top}px`;
    root.style.right = "auto";
  }

  private clampToViewport(): void {
    const root = this.root;
    if (!root) return;
    if (this.layout.minimized) {
      const rect = root.getBoundingClientRect();
      const position = clampFieldCommunicatorPosition(
        rect.left,
        rect.top,
        { width: LAUNCHER_SIZE, height: LAUNCHER_SIZE },
        viewport(),
      );
      this.layout.launcherLeft = position.left;
      this.layout.launcherTop = position.top;
      this.applyLayout();
      this.persistLayout();
      return;
    }
    const size = clampFieldCommunicatorSize(root.offsetWidth, root.offsetHeight, viewport());
    const rect = root.getBoundingClientRect();
    const position = clampFieldCommunicatorPosition(rect.left, rect.top, size, viewport());
    this.layout = { ...this.layout, ...size, ...position };
    this.applyLayout();
    this.persistLayout();
  }

  private persistLayout(): void {
    try { globalThis.localStorage?.setItem(storageKey(STORAGE_SUFFIX), JSON.stringify(this.layout)); } catch { /* Storage is optional. */ }
  }

  private escapeAttribute(value: unknown): string {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character));
  }

  private destroy(): void {
    this.controller?.destroy();
    this.controller = null;
    this.lifecycle.abort();
    this.root?.remove();
    this.root = null;
    this.host = null;
  }
}
