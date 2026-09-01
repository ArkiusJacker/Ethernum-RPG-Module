import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  FieldCommunicatorView,
  type FieldCommunicatorMountOptions,
} from "../scripts/ui/FieldCommunicatorView.js";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

type TestListener = {
  callback: (event: TestEvent) => void;
  signal?: AbortSignal;
};

class TestEvent {
  defaultPrevented = false;

  constructor(
    readonly type: string,
    readonly target: TestElement,
    readonly currentTarget: TestElement = target,
  ) {}

  preventDefault(): void {
    this.defaultPrevented = true;
  }
}

class TestElement {
  readonly dataset: Record<string, string> = {};
  readonly actions: TestElement[] = [];
  readonly listeners = new Map<string, TestListener[]>();
  readonly attributes = new Map<string, string>();
  tagName = "BUTTON";
  type = "button";
  disabled = false;
  isConnected = true;
  scrollTop = 0;
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

  emit(type: string, target: TestElement = this): TestEvent {
    const event = new TestEvent(type, target, this);
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener.callback(event);
    return event;
  }

  querySelector<T>(selector: string): T | null {
    if (selector === "[data-communicator-scroll]") return this.scroll as T | null;
    return null;
  }

  querySelectorAll<T>(selector: string): T[] {
    if (selector === "[data-communicator-action]") return this.actions as T[];
    if (selector.includes("data-communicator-action")) {
      return this.actions.filter(action => !action.disabled && action.getAttribute("aria-disabled") !== "true") as T[];
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

  focus(): void {}

  hasAttribute(name: string): boolean {
    return name === "disabled" ? this.disabled : this.attributes.has(name);
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
    this.isConnected = false;
  }
}

class TestHost extends TestElement {
  readonly communicator = new TestElement();
  html = "";

  constructor(actions: TestElement[]) {
    super();
    this.communicator.actions.push(...actions);
    this.communicator.scroll = new TestElement();
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
    return selector === "[data-field-communicator]" ? this.communicator as T : null;
  }
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let settle!: () => void;
  const promise = new Promise<void>(resolvePromise => { settle = resolvePromise; });
  return { promise, resolve: settle };
}

function flush(): Promise<void> {
  return new Promise(resolvePromise => setTimeout(resolvePromise, 0));
}

describe("Company Store v3.8.2 UI integration", () => {
  it("replaces the communicator whisper placeholder with CompanyStoreService", () => {
    const service = read("scripts/communicator/FieldCommunicatorService.ts");

    expect(service).toContain("getCompanyStoreService");
    expect(service).toContain("private readonly companyStore: CompanyStoreService");
    expect(service).toContain("await this.companyStore.getSnapshot(previewUserId, options.selectedStoreEntryId)");
    expect(service).toContain("return this.companyStore.requestPurchase(entryId);");
    expect(service).not.toContain('channel: "shop-request"');
    expect(service).not.toMatch(/requestPurchase\(itemUuid[\s\S]*?solicita a compra/);
  });

  it("renders catalog, detail, receipt, actions, and visible store states", () => {
    const template = read("templates/ethernum-field-communicator.html");

    expect(template).toContain("{{#if panel.isShop}}");
    expect(template).toContain('class="ethc-store-catalog"');
    expect(template).toContain('class="ethc-store-detail"');
    expect(template).toContain("ethc-store-receipt--{{panel.storeReceipt.tone}}");
    expect(template).toContain('data-communicator-action="open-store-item"');
    expect(template).toContain('data-communicator-action="store-back"');
    expect(template).toContain('data-communicator-action="store-purchase"');
    expect(template).toContain('data-communicator-action="store-receipt-close"');
    expect(template).toContain("ETHERNUM.FieldCommunicator.Copy.PF2eBalance");
    expect(template).toContain("panel.store.balance.label");
    expect(template).toContain("panel.store.selectedItem.stockLabel");
    expect(template).toContain("panel.store.selectedItem.authorizationLabel");
    expect(template).toContain("panel.store.state.noActor");
    expect(template).toContain("ETHERNUM.FieldCommunicator.Copy.CatalogUnavailable");
    expect(template).toContain('aria-live="polite"');
    expect(template).toContain("disabled aria-disabled=\"true\"");
  });

  it("blocks purchases in GM preview and refreshes asynchronous approval completion", () => {
    const overlay = read("scripts/ui/FieldCommunicatorOverlay.ts");

    expect(overlay).toContain('if (this.previewUserId) throw new Error("A compra fica desativada durante a pré-visualização do mestre.")');
    expect(overlay).toContain("const submission = await this.service.requestPurchase(entryId)");
    expect(overlay).toContain("this.storeReceipt = submission.receipt");
    expect(overlay).toContain("if (submission.completion)");
    expect(overlay).toContain("submission.completion.then(receipt =>");
    expect(overlay).toContain("this.storeReceipt?.transactionId !== receipt.transactionId");
    expect(overlay).toContain("this.storeReceipt = receipt");
    expect(overlay).toContain("void this.controller?.render()");
  });

  it("disables purchase controls and ignores a second click while processing", async () => {
    const purchase = new TestElement({ communicatorAction: "store-purchase", communicatorStoreEntryId: "night-blade" });
    const host = new TestHost([purchase]);
    const transaction = deferred();
    const onAction = vi.fn(() => transaction.promise);
    const options: FieldCommunicatorMountOptions = {
      dataSource: () => ({
        apps: [{ id: "shop", panelId: "shop" }],
        panels: { shop: { id: "shop", isShop: true } },
      }),
      renderTemplate: () => "<section data-field-communicator></section>",
      initialScreen: "panel",
      initialPanelId: "shop",
      bootMode: "off",
      callbacks: { onAction },
    };
    const { controller } = await FieldCommunicatorView.mount(host as unknown as HTMLElement, options);

    host.communicator.emit("click", purchase);
    await Promise.resolve();

    expect(onAction).toHaveBeenCalledOnce();
    expect(purchase.disabled).toBe(true);
    expect(purchase.getAttribute("aria-disabled")).toBe("true");
    expect(purchase.dataset.processing).toBe("true");
    expect(host.communicator.getAttribute("aria-busy")).toBe("true");

    host.communicator.emit("click", purchase);
    await Promise.resolve();
    expect(onAction).toHaveBeenCalledOnce();

    transaction.resolve();
    await flush();

    expect(purchase.disabled).toBe(false);
    expect(purchase.getAttribute("aria-disabled")).toBeNull();
    expect(purchase.dataset.processing).toBeUndefined();
    expect(host.communicator.getAttribute("aria-busy")).toBeNull();
    controller.destroy();
  });

  it("keeps compact store imagery, touch targets, and the 320-520px responsive layout", () => {
    const styles = read("styles/ethernum-field-communicator.css");

    expect(styles).toMatch(/\.ethc-store-row\s*\{[\s\S]*?grid-template-columns:\s*56px\s+minmax\(0,\s*1fr\)/);
    expect(styles).toMatch(/\.ethc-store-row img,[\s\S]*?\.ethc-store-row__image\s*\{[\s\S]*?width:\s*56px;[\s\S]*?height:\s*56px;/);
    expect(styles).toMatch(/\.ethc-store-back\s*\{[\s\S]*?min-height:\s*40px;/);
    expect(styles).toMatch(/\.ethc-store-purchase,[\s\S]*?\.ethc-store-receipt \.ethc-primary-button\s*\{[\s\S]*?min-height:\s*44px;/);
    expect(styles).toMatch(/@media \(max-width:\s*379px\)[\s\S]*?\.ethc-store-row\s*\{[\s\S]*?grid-template-columns:\s*56px\s+minmax\(0,\s*1fr\)\s+14px;/);
    expect(styles).toContain("@container (max-width: 520px)");
    expect(styles).toContain("@container (max-width: 390px)");
  });
});
