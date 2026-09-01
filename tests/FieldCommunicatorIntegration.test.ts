import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clampFieldCommunicatorPosition,
  clampFieldCommunicatorSize,
} from "../scripts/ui/FieldCommunicatorOverlay.js";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Field Communicator v3.8.0 integration", () => {
  it("is registered outside character sheets with a public API and persistent launcher", () => {
    const main = read("scripts/main.ts");
    const overlay = read("scripts/ui/FieldCommunicatorOverlay.ts");
    const manifest = JSON.parse(read("module.json")) as { styles: string[] };

    expect(main).toContain("FieldCommunicatorOverlay.initialize()");
    expect(main).toContain("openFieldCommunicator");
    expect(main).toContain("toggleFieldCommunicator");
    expect(overlay).toContain("document.body.appendChild(root)");
    expect(overlay).toContain("await instance.remount()");
    expect(overlay).toContain("await this.remount()");
    expect(overlay).toContain("if (!this.layout.minimized) void this.mount()");
    expect(overlay).toContain('if (typeof document === "undefined" || !game.user) return null;');
    expect(overlay).not.toContain('if (typeof document === "undefined" || !game.user?.isGM) return null;');
    expect(manifest.styles).toContain("styles/ethernum-field-communicator.css");
  });

  it("keeps the device shell scrollable, closable and declarative", () => {
    const template = read("templates/ethernum-field-communicator.html");
    const styles = read("styles/ethernum-field-communicator.css");

    expect(template).toContain("data-field-communicator");
    expect(template).toContain("data-communicator-scroll");
    expect(template).toContain('data-communicator-action="power"');
    expect(template).toContain('data-navigation-direction="{{navigationDirection}}"');
    expect(template).toContain("data-communicator-private-message");
    expect(template).toContain("data-communicator-group-message");
    expect(template).toContain('data-communicator-action="open-notification"');
    expect(template).toContain('data-communicator-action="mark-all-notifications-read"');
    expect(template).toContain("ETHERNUM.FieldCommunicator.Copy.NoSquad");
    expect(read("scripts/communicator/FieldCommunicatorService.ts")).toContain("Canal local protegido");
    expect(template).not.toContain("signal.bars");
    expect(template).not.toContain("Document cannot be rendered internally");
    expect(template).not.toMatch(/<script\b/i);
    expect(styles).toContain(".ethernum-field-communicator-overlay");
    expect(styles).toContain(".ethc-launcher");
    expect(styles).toContain("@container");
    expect(styles).toContain("prefers-reduced-motion");
    expect(styles).toContain(".ethc-notification-row");
    expect(styles).toContain(".ethc-squad-member");
    expect(styles).toContain("ethc-screen-power-down");
    expect(styles).toContain("ethc-fold-top");
    expect(styles).toContain("ethc-nav-forward");
    expect(read("scripts/ui/FieldCommunicatorOverlay.ts")).toContain("AudioContext");
    expect(read("scripts/ui/FieldCommunicatorOverlay.ts")).toContain("CommunicatorLifecycleController");
  });

  it("lets each user move and lock the minimized launcher away from the chat controls", () => {
    const overlay = read("scripts/ui/FieldCommunicatorOverlay.ts");
    const styles = read("styles/ethernum-field-communicator.css");

    expect(overlay).toContain("launcherLeft?: number");
    expect(overlay).toContain("launcherTop?: number");
    expect(overlay).toContain("launcherLocked: boolean");
    expect(overlay).toContain("beginLauncherDrag(event)");
    expect(overlay).toContain("toggleLauncherLock()");
    expect(overlay).toContain("this.suppressLauncherClick = true");
    expect(overlay).toContain("storageKey(STORAGE_SUFFIX)");
    expect(overlay).toContain("worldId");
    expect(overlay).toContain("userId");
    expect(styles).toContain(".ethc-launcher-lock");
    expect(styles).toContain(".is-launcher-unlocked.is-dragging");
    expect(styles).not.toMatch(/\.ethernum-field-communicator-overlay\s*\{[^}]*bottom\s*:/s);
  });

  it("uses Foundry documents and chat permissions without arbitrary script execution", () => {
    const service = read("scripts/communicator/FieldCommunicatorService.ts");
    const registry = read("scripts/communicator/FieldCommunicatorRegistry.ts");

    expect(service).toContain("testUserPermission(user, \"OBSERVER\")");
    expect(service).toContain("canObserve(document, viewer)");
    expect(service).toContain("canAccessTarget(app, subjectUser)");
    expect(service).toContain("openRegisteredApp(appId");
    expect(service).toContain("allowedPanelIds");
    expect(service).toContain("...(game.user?.isGM && !previewUser ? {");
    expect(service).toContain("previewMode: Boolean(previewUser)");
    expect(service).toContain("ChatMessage.create");
    expect(service).toContain("fromUuid");
    expect(service).toContain("whisper");
    expect(registry).toContain("sanitizeFieldCommunicatorExternalUrl");
    expect(`${service}\n${registry}`).not.toMatch(/\beval\s*\(|new\s+Function\s*\(/);
  });

  it("clamps the communicator to desktop and compact viewports", () => {
    expect(clampFieldCommunicatorSize(900, 1_000, { width: 800, height: 700 }))
      .toEqual({ width: 784, height: 684 });
    expect(clampFieldCommunicatorSize(100, 100, { width: 360, height: 520 }))
      .toEqual({ width: 344, height: 504 });
    expect(clampFieldCommunicatorPosition(-100, 900, { width: 344, height: 504 }, { width: 360, height: 520 }))
      .toEqual({ left: 8, top: 8 });
    expect(clampFieldCommunicatorSize(600, 800, { width: 320, height: 568 }))
      .toEqual({ width: 304, height: 552 });
  });
});
