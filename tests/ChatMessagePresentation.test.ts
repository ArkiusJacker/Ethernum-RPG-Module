import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  chatMessagePresentationClasses,
  hasEthernumMessageFlags,
  normalizeChatMessageVariant,
  resolveChatMessageVariant,
} from "../scripts/ui/ChatMessagePresentation.js";

const MODULE_ID = "ethernum-rpg-module";
const root = resolve(import.meta.dirname, "..");

describe("ChatMessagePresentation variant resolution", () => {
  it.each([
    ["ethernum-company", "ethernum"],
    ["Ethernum", "ethernum"],
    ["concordia", "concordia"],
    ["pf2e", "neutral"],
    ["future-core", "neutral"],
  ])("normalizes %p to %s", (value, expected) => {
    expect(normalizeChatMessageVariant(value)).toBe(expected);
  });

  it("prefers explicit message presentation over the actor core", () => {
    expect(resolveChatMessageVariant({
      messageFlags: { [MODULE_ID]: { presentation: { core: "concordia" } } },
      actorCore: "ethernum-company",
    })).toBe("concordia");

    expect(resolveChatMessageVariant({
      messageFlags: { [MODULE_ID]: { chatVariant: "neutral" } },
      actorCore: "concordia",
    })).toBe("neutral");
  });

  it("uses the actor core for ordinary actor-authored PF2e messages", () => {
    expect(resolveChatMessageVariant({ messageFlags: { pf2e: {} }, actorCore: "concordia" }))
      .toBe("concordia");
    expect(resolveChatMessageVariant({ messageFlags: { pf2e: {} }, actorCore: "ethernum-company" }))
      .toBe("ethernum");
  });

  it("keeps unrelated messages neutral and supports legacy module messages", () => {
    expect(resolveChatMessageVariant({ messageFlags: { pf2e: {} } })).toBe("neutral");
    expect(resolveChatMessageVariant({ messageFlags: { [MODULE_ID]: { generated: true } } }))
      .toBe("ethernum");
    expect(hasEthernumMessageFlags({ [MODULE_ID]: {} })).toBe(true);
    expect(hasEthernumMessageFlags({ pf2e: {} })).toBe(false);
  });

  it("returns scoped classes only for themed variants", () => {
    expect(chatMessagePresentationClasses("neutral")).toEqual([]);
    expect(chatMessagePresentationClasses("ethernum")).toEqual([
      "ethernum-chat-presentation",
      "ethernum-chat-presentation--ethernum",
    ]);
  });
});

describe("ChatMessagePresentation visual contract", () => {
  const styles = readFileSync(resolve(root, "styles/chat-message-presentation.css"), "utf8");
  const controller = readFileSync(resolve(root, "scripts/ui/ChatMessagePresentation.ts"), "utf8");

  it("scopes presentation to classified messages and keeps both cores distinct", () => {
    expect(styles).toContain(".chat-message.ethernum-chat-presentation");
    expect(styles).toContain(".ethernum-chat-presentation--ethernum");
    expect(styles).toContain(".ethernum-chat-presentation--concordia");
    expect(styles).not.toMatch(/^\.chat-message\s*\{/m);
  });

  it("does not take ownership of PF2e card layout and honors reduced motion", () => {
    expect(styles).toContain(":not(.chat-card, .pf2e, [data-pf2e-chat-card])");
    expect(styles).not.toMatch(/\.pf2e\s*\{[^}]*display\s*:/s);
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("transition: none !important");
  });

  it("uses the modern Foundry hook and provides a scoped loot manifest layout", () => {
    expect(controller).toContain('"renderChatMessageHTML"');
    expect(styles).toContain(".ethernum-loot-card");
  });
});
