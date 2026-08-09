import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  CharacterSheetViewportService,
  type CharacterSheetViewportStateStore,
} from "../scripts/sheets/core/CharacterSheetViewportService.js";

class MemoryState implements CharacterSheetViewportStateStore {
  activeTab: string;
  scroll: Record<string, number>;

  constructor(activeTab: string, scroll: Record<string, number> = {}) {
    this.activeTab = activeTab;
    this.scroll = { ...scroll };
  }

  load() {
    return { activeTab: this.activeTab, scroll: { ...this.scroll } };
  }

  setActiveTab(activeTab: string): void {
    this.activeTab = activeTab;
  }

  setScroll(regionId: string, position: number): void {
    this.scroll[regionId] = position;
  }
}

class FakeClassList {
  readonly values = new Set<string>();

  toggle(value: string, force?: boolean): boolean {
    const enabled = force ?? !this.values.has(value);
    if (enabled) this.values.add(value);
    else this.values.delete(value);
    return enabled;
  }

  contains(value: string): boolean {
    return this.values.has(value);
  }
}

interface FakeDocument {
  activeElement: FakeElement | null;
  body: FakeElement;
}

class FakeElement {
  readonly tagName: string;
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly classList = new FakeClassList();
  readonly ownerDocument: FakeDocument;
  readonly children: FakeElement[] = [];
  hidden = false;
  disabled = false;
  scrollTop = 0;
  tabIndex = 0;
  focusOptions: FocusOptions | undefined;

  constructor(tagName: string, ownerDocument: FakeDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
  }

  append(...elements: FakeElement[]): this {
    this.children.push(...elements);
    return this;
  }

  contains(element: FakeElement): boolean {
    return this === element || this.children.some(child => child.contains(element));
  }

  getAttribute(name: string): string | null {
    if (name === "hidden") return this.hidden ? "" : null;
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
      return this.dataset[key] ?? null;
    }
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  matches(selector: string): boolean {
    if (selector.includes(":disabled") && this.disabled) return true;
    if (selector.includes("[hidden]") && this.hidden) return true;
    return selector.includes("[aria-hidden='true']") && this.attributes.get("aria-hidden") === "true";
  }

  closest<T extends FakeElement = FakeElement>(selector: string): T | null {
    if (selector === ".ecs-tab-panel[data-tab]" && this.dataset.tab) return this as T;
    return null;
  }

  focus(options?: FocusOptions): void {
    this.focusOptions = options;
    this.ownerDocument.activeElement = this;
  }

  getBoundingClientRect(): DOMRect {
    return { top: 100, bottom: 140, left: 0, right: 40, width: 40, height: 40, x: 0, y: 100, toJSON: () => ({}) };
  }
}

class FakeRoot extends FakeElement {
  readonly tabs = new Map<string, FakeElement>();
  readonly panels = new Map<string, FakeElement>();
  readonly selectorTargets = new Map<string, FakeElement>();

  addTab(tabId: string, active: boolean, scrollTop = 0): this {
    const tab = new FakeElement("button", this.ownerDocument);
    tab.dataset.sheetTab = tabId;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    const panel = new FakeElement("section", this.ownerDocument);
    panel.dataset.tab = tabId;
    panel.dataset.scrollRegion = tabId;
    panel.hidden = !active;
    panel.scrollTop = scrollTop;
    this.tabs.set(tabId, tab);
    this.panels.set(tabId, panel);
    this.append(tab, panel);
    return this;
  }

  querySelectorAll<T extends Element = Element>(selector: string): T[] {
    if (selector === "[data-sheet-tab]") return [...this.tabs.values()] as unknown as T[];
    if (selector === ".ecs-tab-panel[data-tab]") return [...this.panels.values()] as unknown as T[];
    if (selector === "[data-scroll-region]") return [...this.panels.values()] as unknown as T[];
    return [];
  }

  querySelector<T extends Element = Element>(selector: string): T | null {
    if (selector === '[data-sheet-tab].is-active, [data-sheet-tab][aria-selected="true"]') {
      return [...this.tabs.values()].find(tab => tab.classList.contains("is-active")) as unknown as T ?? null;
    }
    if (selector === ".ecs-tab-panel[data-tab]:not([hidden])") {
      return [...this.panels.values()].find(panel => !panel.hidden) as unknown as T ?? null;
    }
    const panel = selector.match(/^\.ecs-tab-panel\[data-tab="(.+)"\]$/)?.[1];
    if (panel) return this.panels.get(panel) as unknown as T ?? null;
    const tab = selector.match(/^\[data-sheet-tab="(.+)"\]$/)?.[1];
    if (tab) return this.tabs.get(tab) as unknown as T ?? null;
    return this.selectorTargets.get(selector) as unknown as T ?? null;
  }
}

function documentFixture(): FakeDocument {
  const document = {} as FakeDocument;
  document.body = new FakeElement("body", document);
  document.activeElement = document.body;
  return document;
}

function service(state: MemoryState): CharacterSheetViewportService {
  return new CharacterSheetViewportService({
    actorId: "actor-1",
    sheetId: "ethernum",
    state,
    now: () => 10_000,
    scheduleFrame: callback => callback(0),
  });
}

beforeAll(() => {
  vi.stubGlobal("Element", FakeElement);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("CharacterSheetViewportService", () => {
  it.each([
    ["skill roll", 700, "roll-skill", { skill: "athletics" }],
    ["equip weapon", 1_250, "toggle-item-equipped", { itemId: "weapon-1" }],
    ["cast spell", 900, "cast-spell", { itemId: "spell-1", entryId: "entry-1" }],
    ["adjust HP", 500, "update-hp", {}],
  ])("keeps scroll and focus after a %s rerender", async (_label, scrollTop, action, identity) => {
    const state = new MemoryState("overview");
    const viewport = service(state);
    const beforeDocument = documentFixture();
    const before = new FakeRoot("form", beforeDocument).addTab("overview", true, scrollTop as number);
    const control = new FakeElement(action === "update-hp" ? "input" : "button", beforeDocument);
    control.dataset.action = action as string;
    Object.assign(control.dataset, identity);
    before.append(control);
    beforeDocument.activeElement = control;

    const snapshot = viewport.capture(before as unknown as ParentNode);
    expect(snapshot?.scroll.workspace).toBe(scrollTop);
    expect(snapshot?.focus?.action).toBe(action);

    const afterDocument = documentFixture();
    const after = new FakeRoot("form", afterDocument).addTab("overview", true, 0);
    const replacement = new FakeElement(control.tagName, afterDocument);
    replacement.dataset.action = action as string;
    Object.assign(replacement.dataset, identity);
    after.append(replacement);
    after.selectorTargets.set(snapshot?.focus?.selector ?? "", replacement);

    await viewport.restoreAfterRender(after as unknown as ParentNode);

    expect(after.panels.get("overview")?.scrollTop).toBe(scrollTop);
    expect(afterDocument.activeElement).toBe(replacement);
    expect(replacement.focusOptions).toEqual({ preventScroll: true });
  });

  it("stores the previous tab and restores the visited tab without forcing zero", () => {
    const state = new MemoryState("overview", { inventory: 1_250 });
    const viewport = service(state);
    const document = documentFixture();
    const root = new FakeRoot("form", document)
      .addTab("overview", true, 700)
      .addTab("inventory", false, 0);

    viewport.selectTab(root as unknown as ParentNode, "inventory");

    expect(state.scroll.overview).toBe(700);
    expect(state.activeTab).toBe("inventory");
    expect(root.panels.get("overview")?.hidden).toBe(true);
    expect(root.panels.get("inventory")?.hidden).toBe(false);
    expect(root.panels.get("inventory")?.scrollTop).toBe(1_250);
    expect(root.tabs.get("inventory")?.focusOptions).toEqual({ preventScroll: true });
  });

  it("prioritizes the immediate in-memory snapshot over older persisted scroll", async () => {
    const state = new MemoryState("spellcasting", { spellcasting: 100 });
    const viewport = service(state);
    const beforeDocument = documentFixture();
    const before = new FakeRoot("form", beforeDocument).addTab("spellcasting", true, 900);
    viewport.capture(before as unknown as ParentNode);
    state.scroll.spellcasting = 25;

    const afterDocument = documentFixture();
    const after = new FakeRoot("form", afterDocument).addTab("spellcasting", true, 0);
    await viewport.restoreAfterRender(after as unknown as ParentNode);

    expect(after.panels.get("spellcasting")?.scrollTop).toBe(900);
    expect(viewport.snapshot).toBeNull();
  });

  it("restores persisted scroll on first render without replacing it with zero", async () => {
    const state = new MemoryState("inventory", { inventory: 1_250 });
    const viewport = service(state);
    const document = documentFixture();
    const root = new FakeRoot("form", document).addTab("inventory", true, 0);

    await viewport.restoreAfterRender(root as unknown as ParentNode);

    expect(root.panels.get("inventory")?.scrollTop).toBe(1_250);
    expect(state.scroll.inventory).toBe(1_250);
  });
});
