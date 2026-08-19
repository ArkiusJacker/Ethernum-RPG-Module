export const FIELD_COMMUNICATOR_SCREENS = ["home", "panel", "recents"] as const;
export const FIELD_COMMUNICATOR_BOOT_MODES = ["full", "short", "skippable", "off"] as const;
export const FIELD_COMMUNICATOR_NAVIGATION_DIRECTIONS = ["none", "forward", "back"] as const;

export type FieldCommunicatorScreen = (typeof FIELD_COMMUNICATOR_SCREENS)[number];
export type FieldCommunicatorBootMode = (typeof FIELD_COMMUNICATOR_BOOT_MODES)[number];
export type FieldCommunicatorNavigationDirection = (typeof FIELD_COMMUNICATOR_NAVIGATION_DIRECTIONS)[number];
export type FieldCommunicatorBootCompletion = "timeout" | "skip" | "disabled";

export interface FieldCommunicatorApp {
  id: string;
  panelId?: string;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface FieldCommunicatorPanel {
  id: string;
  [key: string]: unknown;
}

export interface FieldCommunicatorSnapshot {
  apps?: readonly FieldCommunicatorApp[];
  panels?: Readonly<Record<string, FieldCommunicatorPanel | unknown>>;
  recentAppIds?: readonly string[];
  bootMode?: FieldCommunicatorBootMode;
  [key: string]: unknown;
}

export interface FieldCommunicatorLocation {
  screen: FieldCommunicatorScreen;
  panelId: string | null;
}

export interface FieldCommunicatorState extends FieldCommunicatorLocation {
  history: readonly FieldCommunicatorLocation[];
  recentAppIds: readonly string[];
  boot: {
    mode: FieldCommunicatorBootMode;
    active: boolean;
    canSkip: boolean;
  };
  destroyed: boolean;
}

export interface FieldCommunicatorDataContext {
  state: FieldCommunicatorState;
  controller: FieldCommunicatorView;
}

export interface FieldCommunicatorDataSource {
  getSnapshot(
    context: FieldCommunicatorDataContext,
  ): FieldCommunicatorSnapshot | Promise<FieldCommunicatorSnapshot>;
}

export type FieldCommunicatorDataProvider = (
  context: FieldCommunicatorDataContext,
) => FieldCommunicatorSnapshot | Promise<FieldCommunicatorSnapshot>;

export type FieldCommunicatorRenderTemplate = (
  path: string,
  data: FieldCommunicatorViewData,
) => string | Promise<string>;

export interface FieldCommunicatorOpenAppResult {
  panelId?: string | null;
  screen?: FieldCommunicatorScreen | null;
}

export interface FieldCommunicatorActionContext extends FieldCommunicatorDataContext {
  snapshot: FieldCommunicatorSnapshot;
}

export interface FieldCommunicatorAdminPayload {
  appId?: string;
  panelId?: string;
  targetId?: string;
  value?: string;
  data: Readonly<Record<string, string>>;
}

export interface FieldCommunicatorCallbacks {
  onRefresh?(context: FieldCommunicatorActionContext): void | Promise<void>;
  onSettings?(context: FieldCommunicatorActionContext): void | Promise<void>;
  onOpenApp?(
    app: FieldCommunicatorApp,
    context: FieldCommunicatorActionContext,
  ): void | FieldCommunicatorOpenAppResult | Promise<void | FieldCommunicatorOpenAppResult>;
  onHome?(context: FieldCommunicatorActionContext): void | Promise<void>;
  onBack?(
    from: FieldCommunicatorLocation,
    to: FieldCommunicatorLocation | null,
    context: FieldCommunicatorActionContext,
  ): boolean | void | Promise<boolean | void>;
  onRecents?(context: FieldCommunicatorActionContext): void | Promise<void>;
  onAdminAction?(
    action: string,
    payload: FieldCommunicatorAdminPayload,
    context: FieldCommunicatorActionContext,
  ): void | Promise<void>;
  onScreenChange?(
    location: FieldCommunicatorLocation,
    context: FieldCommunicatorActionContext,
  ): void | Promise<void>;
  onBootComplete?(
    reason: FieldCommunicatorBootCompletion,
    context: FieldCommunicatorActionContext,
  ): void | Promise<void>;
  onRendered?(context: FieldCommunicatorActionContext): void | Promise<void>;
  onAction?(
    action: string,
    data: Readonly<Record<string, string>>,
    context: FieldCommunicatorActionContext,
  ): void | Promise<void>;
  onError?(error: unknown, action: string): void;
}

export interface FieldCommunicatorTimerAdapter {
  setTimeout(callback: () => void, delay: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface FieldCommunicatorMountOptions {
  dataSource: FieldCommunicatorDataSource | FieldCommunicatorDataProvider;
  renderTemplate: FieldCommunicatorRenderTemplate;
  callbacks?: FieldCommunicatorCallbacks;
  templatePath?: string;
  bootMode?: FieldCommunicatorBootMode;
  bootDurations?: Partial<Record<Exclude<FieldCommunicatorBootMode, "off">, number>>;
  initialScreen?: FieldCommunicatorScreen;
  initialPanelId?: string | null;
  initialRecents?: readonly string[];
  maxRecents?: number;
  timers?: FieldCommunicatorTimerAdapter;
}

export interface FieldCommunicatorViewData extends FieldCommunicatorSnapshot {
  navigationDirection: FieldCommunicatorNavigationDirection;
  communicator: {
    screen: FieldCommunicatorScreen;
    panelId: string | null;
    isHome: boolean;
    isPanel: boolean;
    isRecents: boolean;
    canGoBack: boolean;
    recentAppIds: readonly string[];
    recentApps: readonly FieldCommunicatorApp[];
    activePanel: FieldCommunicatorPanel | unknown | null;
    scrollTop: number;
    navigationDirection: FieldCommunicatorNavigationDirection;
    boot: {
      mode: FieldCommunicatorBootMode;
      active: boolean;
      canSkip: boolean;
    };
  };
}

export interface FieldCommunicatorMountResult {
  mounted: boolean;
  controller: FieldCommunicatorView;
}

export interface FieldCommunicatorRenderOptions {
  reload?: boolean;
  captureScroll?: boolean;
}

const DEFAULT_TEMPLATE_PATH = "templates/field-communicator.html";
const DEFAULT_BOOT_DURATIONS: Record<Exclude<FieldCommunicatorBootMode, "off">, number> = {
  full: 2_200,
  short: 450,
  skippable: 2_200,
};

const defaultTimers: FieldCommunicatorTimerAdapter = {
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

function sameLocation(left: FieldCommunicatorLocation, right: FieldCommunicatorLocation): boolean {
  return left.screen === right.screen && left.panelId === right.panelId;
}

function locationKey(location: FieldCommunicatorLocation): string {
  return location.screen === "panel" ? `panel:${location.panelId ?? ""}` : location.screen;
}

function boundedRecents(ids: readonly string[], maximum: number): string[] {
  const unique: string[] = [];
  for (const id of ids) {
    if (!id || unique.includes(id)) continue;
    unique.push(id);
    if (unique.length >= maximum) break;
  }
  return unique;
}

function actionData(element: HTMLElement): Readonly<Record<string, string>> {
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(element.dataset)) {
    if (typeof value === "string") data[key] = value;
  }
  const value = (element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  if (typeof value === "string") data.value = value;
  return data;
}

function actionElement(target: EventTarget | null): HTMLElement | null {
  const candidate = target as { closest?: (selector: string) => HTMLElement | null } | null;
  return candidate?.closest?.("[data-communicator-action]") ?? null;
}

function isDisabled(element: HTMLElement): boolean {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

export class FieldCommunicatorView {
  static readonly TEMPLATE_PATH = DEFAULT_TEMPLATE_PATH;

  readonly host: HTMLElement;
  readonly options: FieldCommunicatorMountOptions;

  private snapshot: FieldCommunicatorSnapshot = {};
  private location: FieldCommunicatorLocation;
  private history: FieldCommunicatorLocation[] = [];
  private recentAppIds: string[];
  private readonly scrollPositions = new Map<string, number>();
  private listeners: AbortController | null = null;
  private bootMode: FieldCommunicatorBootMode = "off";
  private bootActive = false;
  private bootInitialized = false;
  private bootCompleted = false;
  private bootTimer: unknown = null;
  private renderSequence = 0;
  private destroyed = false;
  private draggedAdminAppId: string | null = null;
  private navigationDirection: FieldCommunicatorNavigationDirection = "none";
  private permissionDenied = false;
  private navigationIntentSequence = 0;
  private readonly pendingActions = new Set<string>();
  private confirmationTimer: unknown = null;

  constructor(host: HTMLElement, options: FieldCommunicatorMountOptions) {
    this.host = host;
    this.options = options;
    this.location = {
      screen: options.initialScreen ?? "home",
      panelId: options.initialScreen === "panel" ? options.initialPanelId ?? null : null,
    };
    this.recentAppIds = boundedRecents(options.initialRecents ?? [], this.maximumRecents());
  }

  static async mount(
    host: HTMLElement,
    options: FieldCommunicatorMountOptions,
  ): Promise<FieldCommunicatorMountResult> {
    const controller = new FieldCommunicatorView(host, options);
    await controller.render();
    return { mounted: true, controller };
  }

  getState(): FieldCommunicatorState {
    return {
      screen: this.location.screen,
      panelId: this.location.panelId,
      history: this.history.map(location => ({ ...location })),
      recentAppIds: [...this.recentAppIds],
      boot: {
        mode: this.bootMode,
        active: this.bootActive,
        canSkip: this.bootActive && this.bootMode === "skippable",
      },
      destroyed: this.destroyed,
    };
  }

  getSnapshot(): FieldCommunicatorSnapshot {
    return this.snapshot;
  }

  setSnapshot(snapshot: FieldCommunicatorSnapshot): void {
    this.snapshot = snapshot;
    if (this.recentAppIds.length === 0 && snapshot.recentAppIds) {
      this.recentAppIds = boundedRecents(snapshot.recentAppIds, this.maximumRecents());
    }
  }

  async render(options: FieldCommunicatorRenderOptions = {}): Promise<void> {
    if (this.destroyed) return;
    if (options.captureScroll !== false) this.captureScroll();
    const sequence = ++this.renderSequence;

    if (options.reload !== false) this.setSnapshot(await this.loadSnapshot());
    if (this.destroyed || sequence !== this.renderSequence) return;
    if (this.location.screen === "panel" && (!this.location.panelId || !this.hasPanel(this.location.panelId))) {
      this.location = { screen: "home", panelId: null };
      this.history = [];
      this.permissionDenied = true;
    }

    await this.initializeBoot();
    if (this.destroyed || sequence !== this.renderSequence) return;

    const html = await this.options.renderTemplate(
      this.options.templatePath ?? DEFAULT_TEMPLATE_PATH,
      this.buildViewData(),
    );
    if (this.destroyed || sequence !== this.renderSequence) return;

    this.listeners?.abort();
    this.host.innerHTML = html;
    this.host.dataset.fieldCommunicatorHost = "true";
    this.restoreScroll();
    this.activateListeners();
    this.navigationDirection = "none";
    void Promise.resolve(this.options.callbacks?.onRendered?.(this.context())).catch(error => {
      this.options.callbacks?.onError?.(error, "rendered");
    });
  }

  async refresh(): Promise<void> {
    await this.run("refresh", async () => {
      await this.options.callbacks?.onRefresh?.(this.context());
      await this.render();
    });
  }

  async showHome(): Promise<void> {
    const intent = ++this.navigationIntentSequence;
    await this.run("home", async () => {
      await this.options.callbacks?.onHome?.(this.context());
      if (intent !== this.navigationIntentSequence) return;
      this.permissionDenied = false;
      await this.navigate({ screen: "home", panelId: null });
    });
  }

  async showRecents(): Promise<void> {
    const intent = ++this.navigationIntentSequence;
    await this.run("recents", async () => {
      await this.options.callbacks?.onRecents?.(this.context());
      if (intent !== this.navigationIntentSequence) return;
      this.permissionDenied = false;
      await this.navigate({ screen: "recents", panelId: null });
    });
  }

  async clearRecents(): Promise<void> {
    this.recentAppIds = [];
    await this.render({ reload: false });
  }

  async openPanel(panelId: string): Promise<boolean> {
    if (!panelId) return false;
    const intent = ++this.navigationIntentSequence;
    if (!this.hasPanel(panelId)) {
      this.permissionDenied = true;
      await this.render({ reload: false });
      return false;
    }
    await this.run(`open-panel:${panelId}`, async () => {
      if (intent !== this.navigationIntentSequence) return;
      this.permissionDenied = false;
      await this.navigate({ screen: "panel", panelId });
    });
    return true;
  }

  async back(): Promise<void> {
    const intent = ++this.navigationIntentSequence;
    await this.run("back", async () => {
      const from = { ...this.location };
      const target = this.history.at(-1) ?? null;
      const handled = await this.options.callbacks?.onBack?.(from, target ? { ...target } : null, this.context());
      if (handled === true) {
        await this.render();
        return;
      }
      if (!target || intent !== this.navigationIntentSequence) return;

      this.captureScroll();
      this.history.pop();
      this.location = target;
      this.permissionDenied = false;
      this.navigationDirection = "back";
      await this.notifyScreenChange();
      await this.render({ reload: false, captureScroll: false });
    });
  }

  async openSettings(): Promise<void> {
    await this.run("settings", () => this.options.callbacks?.onSettings?.(this.context()));
  }

  async openApp(appId: string, requestedPanelId?: string): Promise<boolean> {
    const app = this.snapshot.apps?.find(candidate => candidate.id === appId);
    if (!app || app.disabled) return false;
    const intent = ++this.navigationIntentSequence;

    await this.run(`open-app:${app.id}`, async () => {
      const result = await this.options.callbacks?.onOpenApp?.(app, this.context());
      if (intent !== this.navigationIntentSequence) return;
      const destination = result?.screen;
      const panelId = requestedPanelId ?? result?.panelId ?? app.panelId;

      if (destination === "home") {
        this.permissionDenied = false;
        this.recordRecent(app.id);
        await this.navigate({ screen: "home", panelId: null });
      } else if (destination === "recents") {
        this.permissionDenied = false;
        this.recordRecent(app.id);
        await this.navigate({ screen: "recents", panelId: null });
      } else if (destination === "panel" || (destination === undefined && panelId)) {
        if (!panelId || !this.hasPanel(panelId)) {
          this.permissionDenied = true;
          await this.render({ reload: false });
          return;
        }
        this.permissionDenied = false;
        this.recordRecent(app.id);
        await this.navigate({ screen: "panel", panelId: panelId ?? app.id });
      } else {
        this.permissionDenied = false;
        this.recordRecent(app.id);
        await this.render({ reload: false });
      }
    });
    return true;
  }

  async runAdminAction(
    action: string,
    payload: Omit<FieldCommunicatorAdminPayload, "data"> & { data?: Readonly<Record<string, string>> } = {},
  ): Promise<void> {
    if (!action) return;
    await this.run(`admin:${action}`, () => this.options.callbacks?.onAdminAction?.(
      action,
      { ...payload, data: payload.data ?? {} },
      this.context(),
    ));
  }

  async skipBoot(): Promise<boolean> {
    if (!this.bootActive || this.bootMode !== "skippable") return false;
    await this.completeBoot("skip");
    return true;
  }

  async completeBoot(reason: FieldCommunicatorBootCompletion = "timeout"): Promise<void> {
    if (!this.bootActive || this.bootCompleted) return;
    this.bootActive = false;
    this.bootCompleted = true;
    this.clearBootTimer();
    await this.run("boot", async () => {
      await this.options.callbacks?.onBootComplete?.(reason, this.context());
      await this.render({ reload: false });
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.renderSequence += 1;
    this.listeners?.abort();
    this.listeners = null;
    this.clearBootTimer();
    if (this.confirmationTimer !== null) {
      (this.options.timers ?? defaultTimers).clearTimeout(this.confirmationTimer);
      this.confirmationTimer = null;
    }
    this.host.removeAttribute("data-field-communicator-host");
    this.root()?.remove();
  }

  private maximumRecents(): number {
    return Math.max(1, Math.floor(this.options.maxRecents ?? 8));
  }

  private async loadSnapshot(): Promise<FieldCommunicatorSnapshot> {
    const source = this.options.dataSource;
    return typeof source === "function"
      ? await source(this.dataContext())
      : await source.getSnapshot(this.dataContext());
  }

  private dataContext(): FieldCommunicatorDataContext {
    return { state: this.getState(), controller: this };
  }

  private context(): FieldCommunicatorActionContext {
    return { ...this.dataContext(), snapshot: this.snapshot };
  }

  private root(): HTMLElement | null {
    if (this.host.matches?.("[data-field-communicator]")) return this.host;
    return this.host.querySelector<HTMLElement>("[data-field-communicator]");
  }

  private currentScrollTop(): number {
    return this.scrollPositions.get(locationKey(this.location)) ?? 0;
  }

  private captureScroll(): void {
    const scroll = this.root()?.querySelector<HTMLElement>("[data-communicator-scroll]");
    if (scroll) this.scrollPositions.set(locationKey(this.location), Math.max(0, scroll.scrollTop));
  }

  private restoreScroll(): void {
    const scroll = this.root()?.querySelector<HTMLElement>("[data-communicator-scroll]");
    if (scroll) scroll.scrollTop = this.currentScrollTop();
  }

  private buildViewData(): FieldCommunicatorViewData {
    const apps = this.snapshot.apps ?? [];
    const appById = new Map(apps.map(app => [app.id, app]));
    const activePanel = this.location.panelId
      ? this.snapshot.panels?.[this.location.panelId] ?? null
      : null;
    const isHome = this.location.screen === "home";
    const isCommunicatorPanel = this.location.screen === "panel";
    const isSettings = isCommunicatorPanel && this.location.panelId === "settings";
    const isAdmin = isCommunicatorPanel && this.location.panelId === "administration";
    const recentApps = this.recentAppIds.flatMap(id => {
      const app = appById.get(id);
      return app ? [{ ...app, lastOpenedLabel: "Acessado nesta sessão" }] : [];
    });
    const activeApp = apps.find(app =>
      app.id === this.location.panelId
      || app.panelId === this.location.panelId
      || app.internalTarget === this.location.panelId)
      ?? (isAdmin ? {
        id: "administration",
        label: "Administração",
        description: "Aplicativos e permissões do comunicador",
        icon: "fa-solid fa-user-shield",
      } : null);
    const snapshotState = this.snapshot.state && typeof this.snapshot.state === "object"
      ? this.snapshot.state as Record<string, unknown>
      : {};
    return {
      ...this.snapshot,
      state: {
        ...snapshotState,
        permissionDenied: this.permissionDenied || snapshotState.permissionDenied === true,
      },
      apps,
      screen: this.location.screen,
      isHome,
      isPanel: isCommunicatorPanel && !isSettings && !isAdmin,
      isRecents: this.location.screen === "recents",
      isSettings,
      isAdmin,
      canGoBack: this.history.length > 0,
      recentApps,
      recentCount: recentApps.length,
      navigationDirection: this.navigationDirection,
      activeApp,
      panel: activePanel,
      showBoot: this.bootActive,
      bootState: this.bootActive ? this.bootMode : "ready",
      communicator: {
        screen: this.location.screen,
        panelId: this.location.panelId,
        isHome,
        isPanel: isCommunicatorPanel,
        isRecents: this.location.screen === "recents",
        canGoBack: this.history.length > 0,
        recentAppIds: [...this.recentAppIds],
        recentApps,
        activePanel,
        scrollTop: this.currentScrollTop(),
        navigationDirection: this.navigationDirection,
        boot: {
          mode: this.bootMode,
          active: this.bootActive,
          canSkip: this.bootActive && this.bootMode === "skippable",
        },
      },
    };
  }

  private async initializeBoot(): Promise<void> {
    if (this.bootInitialized) return;
    this.bootInitialized = true;
    this.bootMode = this.options.bootMode ?? this.snapshot.bootMode ?? "full";

    if (this.bootMode === "off") {
      this.bootCompleted = true;
      await this.options.callbacks?.onBootComplete?.("disabled", this.context());
      return;
    }

    this.bootActive = true;
    const durations = { ...DEFAULT_BOOT_DURATIONS, ...this.options.bootDurations };
    this.bootTimer = (this.options.timers ?? defaultTimers).setTimeout(
      () => void this.completeBoot("timeout"),
      Math.max(0, durations[this.bootMode]),
    );
  }

  private clearBootTimer(): void {
    if (this.bootTimer === null) return;
    (this.options.timers ?? defaultTimers).clearTimeout(this.bootTimer);
    this.bootTimer = null;
  }

  private recordRecent(appId: string): void {
    this.recentAppIds = boundedRecents(
      [appId, ...this.recentAppIds.filter(id => id !== appId)],
      this.maximumRecents(),
    );
  }

  private hasPanel(panelId: string): boolean {
    return Boolean(this.snapshot.panels && Object.prototype.hasOwnProperty.call(this.snapshot.panels, panelId));
  }

  private async navigate(location: FieldCommunicatorLocation): Promise<void> {
    if (sameLocation(this.location, location)) {
      await this.render({ reload: false });
      return;
    }
    this.captureScroll();
    this.history.push({ ...this.location });
    this.location = { ...location };
    this.navigationDirection = "forward";
    await this.notifyScreenChange();
    await this.render({ reload: false, captureScroll: false });
  }

  private async notifyScreenChange(): Promise<void> {
    await this.options.callbacks?.onScreenChange?.({ ...this.location }, this.context());
  }

  private activateListeners(): void {
    const root = this.root();
    if (!root) return;

    this.listeners = new AbortController();
    const signal = this.listeners.signal;
    root.addEventListener("click", event => {
      const element = actionElement(event.target);
      if (!element || !root.contains(element) || isDisabled(element)) return;
      const tagName = element.tagName?.toLowerCase();
      if (tagName === "select" || (tagName === "input" && (element as HTMLInputElement).type !== "button")) return;
      event.preventDefault();
      void this.handleAction(element);
    }, { signal });

    root.addEventListener("change", event => {
      const element = actionElement(event.target);
      if (!element || !root.contains(element) || isDisabled(element)) return;
      event.preventDefault();
      void this.handleAction(element);
    }, { signal });

    root.addEventListener("dragstart", event => {
      const row = (event.target as Element | null)?.closest<HTMLElement>("[data-communicator-admin-row]");
      const appId = row?.dataset.communicatorAppId;
      if (!appId) return;
      this.draggedAdminAppId = appId;
      (event as DragEvent).dataTransfer?.setData("text/plain", appId);
      (event as DragEvent).dataTransfer?.setDragImage(row, 20, 20);
    }, { signal });

    root.addEventListener("dragover", event => {
      if (!this.draggedAdminAppId || !(event.target as Element | null)?.closest("[data-communicator-admin-row]")) return;
      event.preventDefault();
    }, { signal });

    root.addEventListener("drop", event => {
      const row = (event.target as Element | null)?.closest<HTMLElement>("[data-communicator-admin-row]");
      const targetId = row?.dataset.communicatorAppId;
      const appId = this.draggedAdminAppId;
      this.draggedAdminAppId = null;
      if (!appId || !targetId || appId === targetId) return;
      event.preventDefault();
      void this.runAdminAction("move-before", { appId, targetId });
    }, { signal });

    root.addEventListener("dragend", () => { this.draggedAdminAppId = null; }, { signal });

    root.addEventListener("keydown", event => this.handleKeydown(event as KeyboardEvent), { signal });

    root.querySelector<HTMLElement>("[data-communicator-scroll]")?.addEventListener("scroll", event => {
      const element = event.currentTarget as HTMLElement;
      this.scrollPositions.set(locationKey(this.location), Math.max(0, element.scrollTop));
    }, { signal, passive: true });
  }

  private handleKeydown(event: KeyboardEvent): void {
    const root = this.root();
    if (!root) return;
    const target = event.target as Element | null;
    if (target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
    if (target?.closest?.("[data-document-viewer]")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      if (this.bootActive && this.bootMode === "skippable") void this.skipBoot();
      else void this.back();
      return;
    }

    const direction = event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
    if (direction !== 0) {
      const actions = Array.from(root.querySelectorAll<HTMLElement>(
        '[data-communicator-action]:not([disabled]):not([aria-disabled="true"])',
      ));
      if (actions.length === 0) return;
      const current = actionElement(event.target);
      const index = current ? actions.indexOf(current) : -1;
      const next = index < 0
        ? direction > 0 ? 0 : actions.length - 1
        : (index + direction + actions.length) % actions.length;
      event.preventDefault();
      actions[next]?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      const element = actionElement(event.target);
      if (!element || !root.contains(element) || isDisabled(element)) return;
      event.preventDefault();
      void this.handleAction(element);
    }
  }

  private async handleAction(element: HTMLElement): Promise<void> {
    const action = element.dataset.communicatorAction;
    if (!action) return;
    const data = actionData(element);
    const appId = data.communicatorAppId ?? data.appId ?? "";
    const panelId = data.communicatorPanelId ?? data.panelId;

    switch (action) {
      case "home":
      case "go-home":
        await this.showHome();
        return;
      case "back":
      case "go-back":
        await this.back();
        return;
      case "recents":
      case "open-recents":
        await this.showRecents();
        return;
      case "clear-recents":
        await this.clearRecents();
        return;
      case "settings":
      case "open-settings":
        await this.openSettings();
        return;
      case "refresh":
      case "refresh-panel":
        await this.refresh();
        return;
      case "open-admin":
        await this.openPanel("administration");
        return;
      case "open-app":
      case "open-recent":
        await this.openApp(appId, panelId);
        return;
      case "open-panel":
        if (panelId) await this.openPanel(panelId);
        return;
      case "boot-skip":
      case "skip-boot":
        await this.skipBoot();
        return;
      case "boot-complete":
        await this.completeBoot("timeout");
        return;
      case "admin": {
        const adminAction = data.communicatorAdminAction ?? data.adminAction ?? "";
        await this.runAdminAction(adminAction, {
          appId: appId || undefined,
          panelId,
          targetId: data.communicatorTargetId ?? data.targetId,
          value: data.communicatorValue ?? data.value,
          data,
        });
        return;
      }
      default:
        if (action.startsWith("admin-")) {
          await this.runAdminAction(action.slice("admin-".length), {
            appId: appId || undefined,
            panelId,
            targetId: data.communicatorTargetId ?? data.targetId,
            value: data.communicatorValue ?? data.value,
            data,
          });
          return;
        }
        await this.run(action, () => this.options.callbacks?.onAction?.(action, data, this.context()));
    }
  }

  private async run(action: string, task: () => void | Promise<void>): Promise<void> {
    if (this.pendingActions.has(action)) return;
    this.pendingActions.add(action);
    const root = this.root();
    const controls = action === "store-purchase"
      ? Array.from(root?.querySelectorAll<HTMLElement>("[data-communicator-action]") ?? [])
        .filter(control => control.dataset.communicatorAction === action)
      : [];
    const controlStates = controls.map(control => ({
      control,
      supportsDisabled: "disabled" in control,
      disabled: Boolean((control as HTMLElement & { disabled?: boolean }).disabled),
      ariaDisabled: control.getAttribute("aria-disabled"),
    }));
    for (const { control, supportsDisabled } of controlStates) {
      if (supportsDisabled) (control as HTMLElement & { disabled: boolean }).disabled = true;
      control.setAttribute("aria-disabled", "true");
      control.dataset.processing = "true";
    }
    root?.setAttribute("aria-busy", "true");
    try {
      await task();
      this.pulseConfirmation();
    } catch (error) {
      this.options.callbacks?.onError?.(error, action);
    } finally {
      this.pendingActions.delete(action);
      this.root()?.removeAttribute("aria-busy");
      for (const { control, supportsDisabled, disabled, ariaDisabled } of controlStates) {
        if (!control.isConnected) continue;
        if (supportsDisabled) (control as HTMLElement & { disabled: boolean }).disabled = disabled;
        if (ariaDisabled === null) control.removeAttribute("aria-disabled");
        else control.setAttribute("aria-disabled", ariaDisabled);
        delete control.dataset.processing;
      }
    }
  }

  private pulseConfirmation(): void {
    const root = this.root();
    if (!root?.classList) return;
    root.classList.remove("is-confirmed");
    void root.offsetWidth;
    root.classList.add("is-confirmed");
    if (this.confirmationTimer !== null) {
      (this.options.timers ?? defaultTimers).clearTimeout(this.confirmationTimer);
    }
    this.confirmationTimer = (this.options.timers ?? defaultTimers).setTimeout(() => {
      this.root()?.classList?.remove("is-confirmed");
      this.confirmationTimer = null;
    }, 280);
  }
}
