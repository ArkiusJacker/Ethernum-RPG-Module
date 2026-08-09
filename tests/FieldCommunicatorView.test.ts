import { describe, expect, it, vi } from "vitest";
import {
  FIELD_COMMUNICATOR_BOOT_MODES,
  FieldCommunicatorView,
  type FieldCommunicatorBootCompletion,
  type FieldCommunicatorMountOptions,
  type FieldCommunicatorViewData,
} from "../scripts/ui/FieldCommunicatorView.js";

type TestListener = {
  callback: (event: TestEvent) => void;
  signal?: AbortSignal;
};

class TestEvent {
  readonly type: string;
  readonly target: TestElement;
  readonly currentTarget: TestElement;
  readonly key: string;
  defaultPrevented = false;

  constructor(type: string, target: TestElement, key = "") {
    this.type = type;
    this.target = target;
    this.currentTarget = target;
    this.key = key;
  }

  preventDefault(): void {
    this.defaultPrevented = true;
  }
}

class TestElement {
  readonly dataset: Record<string, string> = {};
  readonly actions: TestElement[] = [];
  readonly listeners = new Map<string, TestListener[]>();
  readonly attributes = new Map<string, string>();
  scrollTop = 0;
  focused = false;
  removed = false;
  scroll: TestElement | null = null;

  constructor(dataset: Record<string, string> = {}) {
    Object.assign(this.dataset, dataset);
  }

  addEventListener(type: string, callback: (event: TestEvent) => void, options?: AddEventListenerOptions): void {
    const listener = { callback, signal: options?.signal };
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    options?.signal?.addEventListener("abort", () => {
      this.listeners.set(type, (this.listeners.get(type) ?? []).filter(candidate => candidate !== listener));
    }, { once: true });
  }

  emit(type: string, target: TestElement = this, key = ""): TestEvent {
    const event = new TestEvent(type, target, key);
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener.callback(event);
    return event;
  }

  querySelector<T>(selector: string): T | null {
    if (selector === "[data-communicator-scroll]") return this.scroll as T | null;
    return null;
  }

  querySelectorAll<T>(selector: string): T[] {
    if (selector.includes("data-communicator-action")) {
      return this.actions.filter(action => !action.hasAttribute("disabled") && action.getAttribute("aria-disabled") !== "true") as T[];
    }
    return [];
  }

  closest(selector: string): TestElement | null {
    return selector === "[data-communicator-action]" && this.dataset.communicatorAction ? this : null;
  }

  contains(element: TestElement): boolean {
    return element === this || this.actions.includes(element) || element === this.scroll;
  }

  matches(selector: string): boolean {
    return selector === "[data-field-communicator]";
  }

  focus(): void {
    for (const action of this.actions) action.focused = false;
    this.focused = true;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  remove(): void {
    this.removed = true;
  }
}

class TestHost extends TestElement {
  readonly root = new TestElement();
  html = "";

  constructor(actions: TestElement[] = []) {
    super();
    this.root.actions.push(...actions);
    this.root.scroll = new TestElement();
  }

  set innerHTML(value: string) {
    this.html = value;
  }

  get innerHTML(): string {
    return this.html;
  }

  override matches(): boolean {
    return false;
  }

  override querySelector<T>(selector: string): T | null {
    if (selector === "[data-field-communicator]") return this.root as T;
    return null;
  }
}

function action(name: string, data: Record<string, string> = {}): TestElement {
  return new TestElement({ communicatorAction: name, ...data });
}

function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function setup(overrides: Partial<FieldCommunicatorMountOptions> = {}) {
  const actions = {
    home: action("home"),
    back: action("back"),
    recents: action("recents"),
    settings: action("settings"),
    sheet: action("open-app", { communicatorAppId: "sheet", communicatorPanelId: "sheet-panel" }),
    files: action("open-app", { communicatorAppId: "files" }),
    admin: action("admin", {
      communicatorAdminAction: "edit-app",
      communicatorAppId: "sheet",
      communicatorTargetId: "entry-1",
    }),
    refresh: action("refresh"),
    custom: action("signal"),
  };
  const host = new TestHost(Object.values(actions));
  const renders: FieldCommunicatorViewData[] = [];
  const options: FieldCommunicatorMountOptions = {
    dataSource: () => ({
      apps: [
        { id: "sheet", label: "Sheet", panelId: "sheet-panel" },
        { id: "files", label: "Files" },
        { id: "disabled", label: "Disabled", disabled: true },
      ],
      panels: { "sheet-panel": { id: "sheet-panel", title: "Sheet" } },
    }),
    renderTemplate: async (_path, data) => {
      renders.push(data);
      return `<section>${data.communicator.screen}</section>`;
    },
    bootMode: "off",
    ...overrides,
  };
  return { host, actions, renders, options };
}

describe("FieldCommunicatorView navigation", () => {
  it("mounts from an injectable source and manages panels, history and recents", async () => {
    const { host, renders, options } = setup();
    const { controller, mounted } = await FieldCommunicatorView.mount(host as unknown as HTMLElement, options);

    expect(mounted).toBe(true);
    expect(renders.at(-1)?.communicator).toMatchObject({ screen: "home", isHome: true, canGoBack: false });
    expect(renders.at(-1)).toMatchObject({
      screen: "home",
      isHome: true,
      isPanel: false,
      showBoot: false,
      recentCount: 0,
    });

    expect(await controller.openApp("sheet")).toBe(true);
    expect(controller.getState()).toMatchObject({
      screen: "panel",
      panelId: "sheet-panel",
      recentAppIds: ["sheet"],
    });
    expect(renders.at(-1)?.communicator.activePanel).toMatchObject({ id: "sheet-panel" });
    expect(renders.at(-1)).toMatchObject({
      isPanel: true,
      activeApp: { id: "sheet" },
      panel: { id: "sheet-panel" },
    });

    await controller.showRecents();
    expect(renders.at(-1)?.communicator).toMatchObject({ screen: "recents", isRecents: true });
    expect(renders.at(-1)?.communicator.recentApps.map(app => app.id)).toEqual(["sheet"]);
    await controller.clearRecents();
    expect(renders.at(-1)?.recentCount).toBe(0);

    await controller.back();
    expect(controller.getState()).toMatchObject({ screen: "panel", panelId: "sheet-panel" });
    await controller.showHome();
    expect(controller.getState().screen).toBe("home");
    expect(await controller.openApp("disabled")).toBe(false);
    expect(controller.getState().recentAppIds).toEqual([]);
  });

  it("routes declarative click actions to settings, apps, navigation and admin callbacks", async () => {
    const calls: string[] = [];
    const { host, actions, options } = setup({
      callbacks: {
        onSettings: () => calls.push("settings"),
        onRefresh: () => calls.push("refresh"),
        onOpenApp: app => calls.push(`app:${app.id}`),
        onHome: () => calls.push("home"),
        onBack: () => calls.push("back"),
        onRecents: () => calls.push("recents"),
        onAdminAction: (name, payload) => calls.push(`admin:${name}:${payload.targetId}`),
        onAction: name => calls.push(`action:${name}`),
      },
    });
    const { controller } = await FieldCommunicatorView.mount(host as unknown as HTMLElement, options);

    host.root.emit("click", actions.settings);
    host.root.emit("click", actions.refresh);
    host.root.emit("click", actions.sheet);
    await flush();
    host.root.emit("click", actions.recents);
    await flush();
    host.root.emit("click", actions.back);
    host.root.emit("click", actions.home);
    host.root.emit("click", actions.admin);
    host.root.emit("click", actions.custom);
    await flush();

    expect(calls).toEqual(expect.arrayContaining([
      "settings",
      "refresh",
      "app:sheet",
      "recents",
      "back",
      "home",
      "admin:edit-app:entry-1",
      "action:signal",
    ]));
    expect(controller.getState().recentAppIds).toEqual(["sheet"]);
  });

  it("keeps an independent internal scroll position for each screen", async () => {
    const { host, options } = setup();
    const { controller } = await FieldCommunicatorView.mount(host as unknown as HTMLElement, options);
    const scroll = host.root.scroll!;

    scroll.scrollTop = 144;
    scroll.emit("scroll");
    await controller.openPanel("sheet-panel");
    expect(scroll.scrollTop).toBe(0);

    scroll.scrollTop = 61;
    scroll.emit("scroll");
    await controller.back();
    expect(scroll.scrollTop).toBe(144);

    await controller.openPanel("sheet-panel");
    expect(scroll.scrollTop).toBe(61);
  });
});

describe("FieldCommunicatorView boot and keyboard", () => {
  it("supports every boot mode with deterministic timers", async () => {
    expect(FIELD_COMMUNICATOR_BOOT_MODES).toEqual(["full", "short", "skippable", "off"]);
    for (const mode of FIELD_COMMUNICATOR_BOOT_MODES) {
      const scheduled: Array<{ callback: () => void; delay: number }> = [];
      const completions: FieldCommunicatorBootCompletion[] = [];
      const { host, renders, options } = setup({
        bootMode: mode,
        timers: {
          setTimeout: (callback, delay) => scheduled.push({ callback, delay }) - 1,
          clearTimeout: () => undefined,
        },
        callbacks: { onBootComplete: reason => completions.push(reason) },
      });
      const { controller } = await FieldCommunicatorView.mount(host as unknown as HTMLElement, options);

      if (mode === "off") {
        expect(renders.at(-1)?.communicator.boot.active).toBe(false);
        expect(completions).toEqual(["disabled"]);
      } else {
        expect(renders.at(-1)?.communicator.boot).toMatchObject({
          mode,
          active: true,
          canSkip: mode === "skippable",
        });
        expect(scheduled).toHaveLength(1);
        expect(scheduled[0]?.delay).toBe(mode === "short" ? 450 : 2_200);
        scheduled[0]?.callback();
        await flush();
        expect(controller.getState().boot.active).toBe(false);
        expect(completions).toEqual(["timeout"]);
      }
      controller.destroy();
    }
  });

  it("handles Enter, Space, arrows and Escape without browser-specific globals", async () => {
    const calls: string[] = [];
    const { host, actions, options } = setup({
      bootMode: "skippable",
      timers: { setTimeout: () => 1, clearTimeout: () => undefined },
      callbacks: {
        onSettings: () => calls.push("settings"),
        onOpenApp: app => calls.push(app.id),
        onBootComplete: reason => calls.push(`boot:${reason}`),
      },
    });
    const { controller } = await FieldCommunicatorView.mount(host as unknown as HTMLElement, options);

    const enter = host.root.emit("keydown", actions.settings, "Enter");
    const space = host.root.emit("keydown", actions.files, " ");
    const arrow = host.root.emit("keydown", actions.settings, "ArrowRight");
    const escape = host.root.emit("keydown", actions.home, "Escape");
    await flush();

    expect(enter.defaultPrevented).toBe(true);
    expect(space.defaultPrevented).toBe(true);
    expect(arrow.defaultPrevented).toBe(true);
    expect(actions.sheet.focused).toBe(true);
    expect(escape.defaultPrevented).toBe(true);
    expect(calls).toEqual(expect.arrayContaining(["settings", "files", "boot:skip"]));
    expect(controller.getState().boot.active).toBe(false);
  });
});

describe("FieldCommunicatorView lifecycle", () => {
  it("aborts stale listeners on rerender and all listeners on destroy", async () => {
    let settings = 0;
    const { host, actions, options } = setup({ callbacks: { onSettings: () => settings += 1 } });
    const { controller } = await FieldCommunicatorView.mount(host as unknown as HTMLElement, options);

    expect(host.root.listeners.get("click")).toHaveLength(1);
    await controller.render({ reload: false });
    expect(host.root.listeners.get("click")).toHaveLength(1);
    host.root.emit("click", actions.settings);
    await flush();
    expect(settings).toBe(1);

    controller.destroy();
    expect(host.root.listeners.get("click")).toHaveLength(0);
    expect(host.root.removed).toBe(true);
    host.root.emit("click", actions.settings);
    await flush();
    expect(settings).toBe(1);
  });

  it("does not share navigation, recents, scroll or boot state between instances", async () => {
    const first = setup({ bootMode: "off" });
    const second = setup({ bootMode: "off" });
    const firstView = (await FieldCommunicatorView.mount(first.host as unknown as HTMLElement, first.options)).controller;
    const secondView = (await FieldCommunicatorView.mount(second.host as unknown as HTMLElement, second.options)).controller;

    first.host.root.scroll!.scrollTop = 90;
    first.host.root.scroll!.emit("scroll");
    await firstView.openApp("sheet");

    expect(firstView.getState()).toMatchObject({ screen: "panel", recentAppIds: ["sheet"] });
    expect(secondView.getState()).toMatchObject({ screen: "home", recentAppIds: [] });
    expect(second.renders.at(-1)?.communicator.scrollTop).toBe(0);
  });

  it("reports callback failures without coupling to Foundry notifications", async () => {
    const failure = new Error("settings failed");
    const errors: Array<{ error: unknown; action: string }> = [];
    const { host, options } = setup({
      callbacks: {
        onSettings: () => { throw failure; },
        onError: (error, actionName) => errors.push({ error, action: actionName }),
      },
    });
    const { controller } = await FieldCommunicatorView.mount(host as unknown as HTMLElement, options);

    await expect(controller.openSettings()).resolves.toBeUndefined();
    expect(errors).toEqual([{ error: failure, action: "settings" }]);
  });
});
