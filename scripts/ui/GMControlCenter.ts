import { ETHERNUM } from "../config.js";
import {
  DEFAULT_GM_CONTROL_FILTERS,
  GM_CONTROL_SECTIONS,
  GM_CONTROL_THEMES,
  buildGMControlCenterData,
  type GMControlAdminAction,
  type GMControlAdminPayload,
  type GMControlAuditAction,
  type GMControlAuditFilters,
  type GMControlCenterCallbacks,
  type GMControlCenterDataSource,
  type GMControlCenterSnapshot,
  type GMControlDiagnosticsAction,
  type GMControlPolicyCategory,
  type GMControlPolicyMode,
  type GMControlQueueAction,
  type GMControlQueueItem,
  type GMControlSection,
  type GMControlTheme,
} from "./GMControlCenterData.js";

const TEMPLATE_PATH = `modules/${ETHERNUM.MODULE_NAME}/templates/ethernum-gm-control-tab.html`;
const STYLESHEET_PATH = `modules/${ETHERNUM.MODULE_NAME}/styles/ethernum-gm-control.css`;
const STYLESHEET_ID = `${ETHERNUM.MODULE_NAME}-gm-control-styles`;
const THEME_STORAGE_SUFFIX = "gmControlTheme";

type RenderTemplateFunction = (path: string, data: object) => Promise<string>;

export interface GMControlCenterMountOptions {
  dataSource: GMControlCenterDataSource | (() => GMControlCenterSnapshot | Promise<GMControlCenterSnapshot>);
  callbacks?: GMControlCenterCallbacks;
  activeSection?: GMControlSection;
  theme?: GMControlTheme;
  filters?: Partial<GMControlAuditFilters>;
  templatePath?: string;
  stylesheetPath?: string;
  renderTemplate?: RenderTemplateFunction;
  isGM?: () => boolean;
  locale?: () => string;
}

export interface GMControlCenterMountResult {
  mounted: boolean;
  controller: GMControlCenter | null;
}

function localize(key: string): string {
  return game.i18n?.localize(key) ?? key;
}

function notifyError(): void {
  ui.notifications?.error(localize("ETHERNUM.GMControl.Errors.ActionFailed"));
}

function resolveRenderTemplate(): RenderTemplateFunction {
  const modernRenderer = (foundry.applications as Record<string, unknown> & {
    handlebars?: { renderTemplate?: RenderTemplateFunction };
  })?.handlebars?.renderTemplate;
  return modernRenderer ?? renderTemplate;
}

function isTheme(value: string | undefined): value is GMControlTheme {
  return Boolean(value && GM_CONTROL_THEMES.includes(value as GMControlTheme));
}

function isSection(value: string | undefined): value is GMControlSection {
  return Boolean(value && GM_CONTROL_SECTIONS.includes(value as GMControlSection));
}

function queryValue(root: HTMLElement, selector: string): string {
  return root.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.value ?? "";
}

function numericValue(root: HTMLElement, selector: string): number | undefined {
  const value = Number(queryValue(root, selector));
  return Number.isFinite(value) ? value : undefined;
}

function storageKey(): string {
  const worldId = String((game as unknown as { world?: { id?: string } }).world?.id ?? "world");
  const userId = String(game.user?.id ?? "user");
  return `${ETHERNUM.MODULE_NAME}.${worldId}.${userId}.${THEME_STORAGE_SUFFIX}`;
}

function storedTheme(): GMControlTheme | null {
  try {
    const setting = game.settings?.get(ETHERNUM.MODULE_NAME, "gmControlTheme");
    if (isTheme(String(setting))) return String(setting) as GMControlTheme;
    const value = globalThis.localStorage?.getItem(storageKey()) ?? undefined;
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function persistTheme(theme: GMControlTheme): void {
  try {
    void game.settings?.set(ETHERNUM.MODULE_NAME, "gmControlTheme", theme);
    globalThis.localStorage?.setItem(storageKey(), theme);
  } catch {
    // Client storage can be unavailable in privacy-restricted browser contexts.
  }
}

export class GMControlCenter {
  static readonly TAB_ID = "ethernum-gm-control";
  static readonly TEMPLATE_PATH = TEMPLATE_PATH;
  static readonly STYLESHEET_PATH = STYLESHEET_PATH;

  readonly host: HTMLElement;
  readonly options: GMControlCenterMountOptions;

  private activeSection: GMControlSection;
  private theme: GMControlTheme;
  private filters: GMControlAuditFilters;
  private auditPage = 1;
  private readonly auditPageSize = 50;
  private readonly pendingDomainActions = new Set<string>();
  private snapshot: GMControlCenterSnapshot = {};
  private listeners: AbortController | null = null;
  private searchTimer: number | null = null;
  private renderSequence = 0;
  private destroyed = false;

  constructor(host: HTMLElement, options: GMControlCenterMountOptions) {
    this.host = host;
    this.options = options;
    this.activeSection = options.activeSection ?? "operations";
    this.theme = options.theme ?? storedTheme() ?? "ethernum";
    this.filters = { ...DEFAULT_GM_CONTROL_FILTERS, ...options.filters };
  }

  static async mount(
    host: HTMLElement,
    options: GMControlCenterMountOptions,
  ): Promise<GMControlCenterMountResult> {
    const isGM = options.isGM?.() ?? Boolean(game.user?.isGM);
    if (!isGM) {
      host.querySelector<HTMLElement>(`[data-ethernum-gm-control]`)?.remove();
      return { mounted: false, controller: null };
    }
    const controller = new GMControlCenter(host, options);
    await controller.render();
    return { mounted: true, controller };
  }

  static ensureStylesheet(path = STYLESHEET_PATH): HTMLLinkElement | null {
    if (typeof document === "undefined") return null;
    const existing = document.getElementById(STYLESHEET_ID);
    if (existing instanceof HTMLLinkElement) return existing;
    const link = document.createElement("link");
    link.id = STYLESHEET_ID;
    link.rel = "stylesheet";
    link.href = path;
    document.head.appendChild(link);
    return link;
  }

  async render(options: { reload?: boolean } = {}): Promise<void> {
    if (this.destroyed) return;
    if (!(this.options.isGM?.() ?? Boolean(game.user?.isGM))) {
      this.destroy();
      return;
    }

    const sequence = ++this.renderSequence;
    if (options.reload !== false) this.snapshot = await this.loadSnapshot();
    if (this.destroyed || sequence !== this.renderSequence) return;

    GMControlCenter.ensureStylesheet(this.options.stylesheetPath);
    const viewData = buildGMControlCenterData(this.snapshot, {
      isGM: true,
      theme: this.theme,
      activeSection: this.activeSection,
      filters: this.filters,
      auditPage: this.auditPage,
      auditPageSize: this.auditPageSize,
      locale: this.options.locale?.() ?? game.i18n?.lang ?? "pt-BR",
    });
    const renderer = this.options.renderTemplate ?? resolveRenderTemplate();
    const html = await renderer(this.options.templatePath ?? TEMPLATE_PATH, viewData);
    if (this.destroyed || sequence !== this.renderSequence) return;

    this.listeners?.abort();
    this.host.innerHTML = html;
    this.host.dataset.ethernumGmControlHost = "true";
    this.activateListeners();
  }

  async refresh(): Promise<void> {
    await this.run(async () => {
      await this.options.callbacks?.onRefresh?.();
      await this.render();
    });
  }

  setSnapshot(snapshot: GMControlCenterSnapshot): void {
    this.snapshot = snapshot;
  }

  setSection(section: GMControlSection): Promise<void> {
    this.activeSection = section;
    return this.run(async () => {
      await this.options.callbacks?.onSectionChange?.(section);
      await this.render({ reload: false });
    });
  }

  setTheme(theme: GMControlTheme): Promise<void> {
    this.theme = theme;
    persistTheme(theme);
    return this.run(async () => {
      await this.options.callbacks?.onThemeChange?.(theme);
      await this.render({ reload: false });
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.renderSequence += 1;
    this.listeners?.abort();
    this.listeners = null;
    if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
    this.searchTimer = null;
    this.host.removeAttribute("data-ethernum-gm-control-host");
    this.host.querySelector<HTMLElement>("[data-ethernum-gm-control]")?.remove();
  }

  private async loadSnapshot(): Promise<GMControlCenterSnapshot> {
    const source = this.options.dataSource;
    return typeof source === "function" ? await source() : await source.getSnapshot();
  }

  private root(): HTMLElement | null {
    return this.host.querySelector<HTMLElement>("[data-ethernum-gm-control]");
  }

  private activateListeners(): void {
    const root = this.root();
    if (!root) return;
    this.listeners = new AbortController();
    const signal = this.listeners.signal;

    root.querySelectorAll<HTMLButtonElement>("[data-gm-section]").forEach(button => {
      button.addEventListener("click", () => {
        const section = button.dataset.gmSection;
        if (isSection(section)) void this.setSection(section);
      }, { signal });
    });

    root.querySelectorAll<HTMLButtonElement>("[data-gm-theme]").forEach(button => {
      button.addEventListener("click", () => {
        const theme = button.dataset.gmTheme;
        if (isTheme(theme)) void this.setTheme(theme);
      }, { signal });
    });

    root.querySelector<HTMLButtonElement>("[data-gm-refresh]")?.addEventListener(
      "click",
      () => void this.refresh(),
      { signal },
    );

    root.querySelectorAll<HTMLButtonElement>("[data-gm-queue-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.gmQueueAction as GMControlQueueAction | undefined;
        const item = this.queueItem(button.dataset.requestId);
        if (action && item) void this.handleQueueAction(action, item);
      }, { signal });
    });

    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-gm-audit-filter]").forEach(control => {
      const eventName = control instanceof HTMLInputElement && control.type === "search" ? "input" : "change";
      control.addEventListener(eventName, () => this.handleFilterChange(root, control), { signal });
    });

    root.querySelectorAll<HTMLButtonElement>("[data-gm-audit-page]").forEach(button => {
      button.addEventListener("click", () => {
        const page = Number(button.dataset.gmAuditPage);
        if (!Number.isFinite(page) || page < 1) return;
        this.auditPage = Math.floor(page);
        void this.render({ reload: false });
      }, { signal });
    });

    root.querySelectorAll<HTMLButtonElement>("[data-gm-audit-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.gmAuditAction as GMControlAuditAction | undefined;
        if (!action) return;
        const entry = this.snapshot.audit?.find(candidate => candidate.id === button.dataset.auditId);
        void this.run(async () => {
          await this.options.callbacks?.onAuditAction?.(action, { entry, filters: { ...this.filters } });
          if (action === "clear") await this.render();
        });
      }, { signal });
    });

    root.querySelectorAll<HTMLSelectElement>("[data-gm-policy]").forEach(select => {
      select.addEventListener("change", () => {
        const policy = this.snapshot.policies?.find(candidate => candidate.id === select.dataset.policyId);
        if (!policy) return;
        const mode = select.value as GMControlPolicyMode;
        void this.run(async () => {
          await this.options.callbacks?.onPolicyChange?.({
            policyId: policy.id,
            category: select.dataset.category as GMControlPolicyCategory,
            profileId: policy.profileId,
            mode,
          });
          await this.render();
        });
      }, { signal });
    });

    root.querySelectorAll<HTMLButtonElement>("[data-gm-diagnostics-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.gmDiagnosticsAction as GMControlDiagnosticsAction | undefined;
        if (action) void this.handleDiagnosticsAction(action);
      }, { signal });
    });

    root.querySelectorAll<HTMLButtonElement>("[data-gm-admin-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.gmAdminAction as GMControlAdminAction | undefined;
        if (action) void this.handleAdminAction(action, root);
      }, { signal });
    });

    root.querySelectorAll<HTMLButtonElement>("[data-gm-domain-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.gmDomainAction;
        if (!action) return;
        const payload: Record<string, string> = {};
        for (const [key, value] of Object.entries(button.dataset)) if (typeof value === "string") payload[key] = value;
        if (action === "preview-player") payload.userId = queryValue(root, "[data-gm-preview-user]");
        void this.handleDomainAction(action, payload);
      }, { signal });
    });
  }

  private queueItem(id: string | undefined): GMControlQueueItem | undefined {
    return this.snapshot.queue?.find(item => item.id === id || item.requestId === id);
  }

  private async handleQueueAction(action: GMControlQueueAction, item: GMControlQueueItem): Promise<void> {
    await this.run(async () => {
      await this.options.callbacks?.onQueueAction?.(action, item);
      if (action === "approve" || action === "reject" || action === "approve-trust") await this.render();
    });
  }

  private handleFilterChange(root: HTMLElement, control: HTMLInputElement | HTMLSelectElement): void {
    this.auditPage = 1;
    this.filters = {
      status: queryValue(root, '[data-gm-audit-filter="status"]') as GMControlAuditFilters["status"],
      userId: queryValue(root, '[data-gm-audit-filter="userId"]'),
      profileId: queryValue(root, '[data-gm-audit-filter="profileId"]'),
      actionType: queryValue(root, '[data-gm-audit-filter="actionType"]'),
      actorId: queryValue(root, '[data-gm-audit-filter="actorId"]'),
      period: queryValue(root, '[data-gm-audit-filter="period"]') as GMControlAuditFilters["period"],
      search: queryValue(root, '[data-gm-audit-filter="search"]'),
    };
    const commit = () => void this.run(async () => {
      await this.options.callbacks?.onAuditFiltersChange?.({ ...this.filters });
      await this.render({ reload: false });
    });
    if (control instanceof HTMLInputElement && control.type === "search") {
      if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
      this.searchTimer = window.setTimeout(commit, 180);
      return;
    }
    commit();
  }

  private async handleDiagnosticsAction(action: GMControlDiagnosticsAction): Promise<void> {
    await this.run(async () => {
      await this.options.callbacks?.onDiagnosticsAction?.(action);
      if (action === "copy") {
        const payload = JSON.stringify(this.snapshot.diagnostics ?? [], null, 2);
        await globalThis.navigator?.clipboard?.writeText(payload);
      } else {
        await this.render();
      }
    });
  }

  private async handleAdminAction(action: GMControlAdminAction, root: HTMLElement): Promise<void> {
    const payload: GMControlAdminPayload = action === "grant-fulgor"
      ? {
          actorId: queryValue(root, "[data-gm-admin-actor]"),
          amount: numericValue(root, "[data-gm-admin-amount]"),
        }
      : {};
    await this.run(async () => {
      await this.options.callbacks?.onAdminAction?.(action, payload);
      await this.render();
    });
  }

  private async handleDomainAction(action: string, payload: Readonly<Record<string, string>>): Promise<void> {
    const transactionId = payload.transactionId ?? "";
    const key = transactionId ? `${action}\u001f${transactionId}` : action;
    if (this.pendingDomainActions.has(key)) return;
    this.pendingDomainActions.add(key);
    const root = this.root();
    root?.querySelectorAll<HTMLButtonElement>(`[data-transaction-id="${CSS.escape(transactionId)}"]`)
      .forEach(button => { button.disabled = true; });
    try {
      await this.run(async () => {
        await this.options.callbacks?.onDomainAction?.(action, payload);
        if (action !== "preview-player" && action !== "open-document" && action !== "store-recovery-copy") {
          await this.render();
        }
      });
    } finally {
      this.pendingDomainActions.delete(key);
      this.root()?.querySelectorAll<HTMLButtonElement>(`[data-transaction-id="${CSS.escape(transactionId)}"]`)
        .forEach(button => { button.disabled = false; });
    }
  }

  private async run(task: () => void | Promise<void>): Promise<void> {
    const root = this.root();
    root?.setAttribute("aria-busy", "true");
    try {
      await task();
    } catch (error) {
      console.error(`${ETHERNUM.MODULE_NAME} | GM Control Center`, error);
      notifyError();
    } finally {
      this.root()?.removeAttribute("aria-busy");
    }
  }
}

export type {
  GMControlAdminAction,
  GMControlAdminPayload,
  GMControlAuditAction,
  GMControlAuditFilters,
  GMControlCenterCallbacks,
  GMControlCenterDataSource,
  GMControlCenterSnapshot,
  GMControlDiagnosticsAction,
  GMControlPolicyCategory,
  GMControlPolicyMode,
  GMControlQueueAction,
  GMControlQueueItem,
  GMControlSection,
  GMControlTheme,
};
