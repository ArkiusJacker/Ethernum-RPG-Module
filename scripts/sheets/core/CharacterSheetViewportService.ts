import type { CharacterSheetViewState } from "./CharacterSheetState.js";

export interface CharacterSheetViewportFocus {
  action?: string;
  itemId?: string;
  entryId?: string;
  strikeId?: string;
  selector?: string;
  relativeTop?: number;
}

export interface CharacterSheetViewportSnapshot {
  actorId: string;
  sheetId: string;
  activeTab: string;
  scroll: {
    workspace: number;
    regions?: Record<string, number>;
  };
  focus?: CharacterSheetViewportFocus;
  timestamp: number;
}

export interface CharacterSheetViewportStateStore {
  load(): Pick<CharacterSheetViewState, "activeTab" | "scroll">;
  setActiveTab(activeTab: string): unknown;
  setScroll(regionId: string, position: number): unknown;
}

export interface CharacterSheetViewportServiceOptions {
  actorId: string;
  sheetId: string;
  state: CharacterSheetViewportStateStore;
  now?: () => number;
  scheduleFrame?: (callback: FrameRequestCallback) => unknown;
  snapshotMaxAgeMs?: number;
}

const FOCUS_DATA_KEYS = [
  "action",
  "itemId",
  "entryId",
  "strikeId",
  "preparedActionId",
  "uniqueAction",
  "runeId",
  "conditionSlug",
  "category",
] as const;

const DEFAULT_SNAPSHOT_MAX_AGE_MS = 30_000;

function finite(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? Math.max(0, result) : 0;
}

function attributeName(key: string): string {
  return `data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
}

function escapeAttribute(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function elementDataset(element: Element, key: string): string {
  return (element as HTMLElement).dataset?.[key] ?? element.getAttribute(attributeName(key)) ?? "";
}

function rootContains(root: ParentNode, element: Element): boolean {
  return typeof (root as Node).contains === "function" ? (root as Node).contains(element) : true;
}

function tabPanel(root: ParentNode, tabId: string): HTMLElement | null {
  const escaped = escapeAttribute(tabId);
  return root.querySelector<HTMLElement>(`.ecs-tab-panel[data-tab="${escaped}"]`)
    ?? root.querySelector<HTMLElement>(".ecs-tab-panel[data-tab]:not([hidden])")
    ?? root.querySelector<HTMLElement>(".ecs-workspace");
}

function activeTabFromDom(root: ParentNode): string {
  const selected = root.querySelector<HTMLElement>(
    '[data-sheet-tab].is-active, [data-sheet-tab][aria-selected="true"]',
  );
  if (selected) return elementDataset(selected, "sheetTab");
  const panel = root.querySelector<HTMLElement>(".ecs-tab-panel[data-tab]:not([hidden])");
  return panel ? elementDataset(panel, "tab") : "";
}

function focusSelector(element: Element): string | undefined {
  const tag = element.tagName?.toLowerCase() || "*";
  const attributes = FOCUS_DATA_KEYS.flatMap(key => {
    const value = elementDataset(element, key);
    return value ? [`[${attributeName(key)}="${escapeAttribute(value)}"]`] : [];
  });
  if (attributes.length > 0) return `${tag}${attributes.join("")}`;

  const id = element.getAttribute("id");
  if (id) return `${tag}[id="${escapeAttribute(id)}"]`;
  const name = element.getAttribute("name");
  if (name) return `${tag}[name="${escapeAttribute(name)}"]`;
  return undefined;
}

function focusSnapshot(root: ParentNode, scrollRoot: HTMLElement | null): CharacterSheetViewportFocus | undefined {
  const document = (root as Node).ownerDocument ?? globalThis.document;
  const active = document?.activeElement;
  if (!(active instanceof Element) || active === document.body || !rootContains(root, active)) return undefined;

  const selector = focusSelector(active);
  if (!selector) return undefined;
  let relativeTop: number | undefined;
  if (scrollRoot && typeof active.getBoundingClientRect === "function") {
    relativeTop = active.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top;
  }
  return {
    action: elementDataset(active, "action") || undefined,
    itemId: elementDataset(active, "itemId") || undefined,
    entryId: elementDataset(active, "entryId") || undefined,
    strikeId: elementDataset(active, "strikeId") || undefined,
    selector,
    ...(Number.isFinite(relativeTop) ? { relativeTop } : {}),
  };
}

function defaultScheduleFrame(callback: FrameRequestCallback): unknown {
  if (typeof globalThis.requestAnimationFrame === "function") return globalThis.requestAnimationFrame(callback);
  return globalThis.setTimeout(() => callback(Date.now()), 0);
}

function focusWithoutScroll(element: HTMLElement, scrollRoot: HTMLElement | null, scrollTop: number): void {
  if (element.matches?.(":disabled, [hidden], [aria-hidden='true']")) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    try {
      element.focus();
    } catch {
      return;
    }
  }
  if (scrollRoot) scrollRoot.scrollTop = scrollTop;
}

export class CharacterSheetViewportService {
  readonly #actorId: string;
  readonly #sheetId: string;
  readonly #state: CharacterSheetViewportStateStore;
  readonly #now: () => number;
  readonly #scheduleFrame: (callback: FrameRequestCallback) => unknown;
  readonly #snapshotMaxAgeMs: number;
  readonly #boundRoots = new WeakSet<object>();
  #snapshot: CharacterSheetViewportSnapshot | null = null;
  #restoreGeneration = 0;

  constructor(options: CharacterSheetViewportServiceOptions) {
    this.#actorId = options.actorId;
    this.#sheetId = options.sheetId;
    this.#state = options.state;
    this.#now = options.now ?? Date.now;
    this.#scheduleFrame = options.scheduleFrame ?? defaultScheduleFrame;
    this.#snapshotMaxAgeMs = options.snapshotMaxAgeMs ?? DEFAULT_SNAPSHOT_MAX_AGE_MS;
  }

  get snapshot(): CharacterSheetViewportSnapshot | null {
    return this.#snapshot;
  }

  capture(root: ParentNode | null): CharacterSheetViewportSnapshot | null {
    if (!root) return this.#snapshot;
    const stored = this.#state.load();
    const activeTab = activeTabFromDom(root) || stored.activeTab;
    const scrollRoot = tabPanel(root, activeTab);
    const regions: Record<string, number> = {};
    root.querySelectorAll<HTMLElement>("[data-scroll-region]").forEach(region => {
      const regionId = elementDataset(region, "scrollRegion");
      if (regionId) regions[regionId] = finite(region.scrollTop);
    });
    const workspace = finite(scrollRoot?.scrollTop);
    if (activeTab) this.#state.setScroll(activeTab, workspace);

    this.#snapshot = {
      actorId: this.#actorId,
      sheetId: this.#sheetId,
      activeTab,
      scroll: {
        workspace,
        ...(Object.keys(regions).length > 0 ? { regions } : {}),
      },
      focus: focusSnapshot(root, scrollRoot),
      timestamp: this.#now(),
    };
    return this.#snapshot;
  }

  bind(root: HTMLElement): void {
    if (this.#boundRoots.has(root)) return;
    this.#boundRoots.add(root);

    root.addEventListener("scroll", event => {
      const target = event.target as HTMLElement | null;
      const panel = target?.closest?.<HTMLElement>(".ecs-tab-panel[data-tab]");
      if (!panel || panel !== target) return;
      const tabId = elementDataset(panel, "tab");
      if (tabId) this.#state.setScroll(tabId, finite(panel.scrollTop));
    }, true);

    const captureInteraction = (event: Event): void => {
      const target = event.target as Element | null;
      if (!target?.closest?.("[data-action], [data-sheet-tab], input, select, textarea, [draggable='true']")) return;
      this.capture(root);
    };
    root.addEventListener("pointerdown", captureInteraction, true);
    root.addEventListener("change", captureInteraction, true);
    root.addEventListener("submit", captureInteraction, true);
    root.addEventListener("keydown", event => {
      if (!event.key || !["Enter", " "].includes(event.key)) return;
      captureInteraction(event);
    }, true);
  }

  selectTab(root: ParentNode, tabId: string, focus = true, persistCurrent = true): void {
    if (!tabId) return;
    const stored = this.#state.load();
    const previousTab = activeTabFromDom(root) || stored.activeTab;
    const previousPanel = tabPanel(root, previousTab);
    if (persistCurrent && previousTab && previousPanel) {
      this.#state.setScroll(previousTab, finite(previousPanel.scrollTop));
    }

    root.querySelectorAll<HTMLElement>("[data-sheet-tab]").forEach(tab => {
      const active = elementDataset(tab, "sheetTab") === tabId;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    root.querySelectorAll<HTMLElement>(".ecs-tab-panel[data-tab]").forEach(panel => {
      panel.hidden = elementDataset(panel, "tab") !== tabId;
    });
    this.#state.setActiveTab(tabId);

    const nextPanel = tabPanel(root, tabId);
    const nextScroll = finite(this.#state.load().scroll[tabId]);
    if (nextPanel) nextPanel.scrollTop = nextScroll;
    const tab = root.querySelector<HTMLElement>(`[data-sheet-tab="${escapeAttribute(tabId)}"]`);
    if (focus && tab) focusWithoutScroll(tab, nextPanel, nextScroll);
  }

  async restoreAfterRender(root: ParentNode | null): Promise<CharacterSheetViewportSnapshot | null> {
    if (!root) return null;
    const generation = ++this.#restoreGeneration;
    await new Promise<void>(resolve => {
      this.#scheduleFrame(() => this.#scheduleFrame(() => resolve()));
    });
    if (generation !== this.#restoreGeneration) return null;

    const stored = this.#state.load();
    const candidate = this.#snapshot;
    const snapshot = candidate
      && candidate.actorId === this.#actorId
      && candidate.sheetId === this.#sheetId
      && this.#now() - candidate.timestamp <= this.#snapshotMaxAgeMs
      ? candidate
      : null;
    const activeTab = snapshot?.activeTab || stored.activeTab || activeTabFromDom(root);
    if (activeTab) this.selectTab(root, activeTab, false, false);

    root.querySelectorAll<HTMLElement>("[data-scroll-region]").forEach(region => {
      const regionId = elementDataset(region, "scrollRegion");
      const tabId = elementDataset(region, "tab");
      const position = snapshot?.scroll.regions?.[regionId]
        ?? stored.scroll[tabId || regionId];
      if (position !== undefined) region.scrollTop = finite(position);
    });

    const scrollRoot = tabPanel(root, activeTab);
    const workspace = snapshot?.scroll.workspace ?? stored.scroll[activeTab] ?? 0;
    if (scrollRoot) scrollRoot.scrollTop = finite(workspace);
    if (snapshot?.focus?.selector) {
      const focused = root.querySelector<HTMLElement>(snapshot.focus.selector);
      if (focused) focusWithoutScroll(focused, scrollRoot, finite(workspace));
    }

    if (snapshot) this.#snapshot = null;
    return snapshot;
  }

  clear(): void {
    this.#snapshot = null;
    this.#restoreGeneration += 1;
  }
}
