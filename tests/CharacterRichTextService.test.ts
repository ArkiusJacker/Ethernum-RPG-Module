import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canViewCharacterSecrets,
  characterRichTextCapabilityStatus,
  enrichCharacterBiography,
  enrichCharacterRichText,
} from "../scripts/sheets/core/CharacterRichTextService.js";

afterEach(() => vi.unstubAllGlobals());

describe("CharacterRichTextService", () => {
  it("prefers TextEditorPF2e and supplies async roll context and document permissions", async () => {
    const enrichHTML = vi.fn(async (content: string) => `<pf2e>${content}</pf2e>`);
    class TextEditorPF2e {
      static enrichHTML = enrichHTML;
    }
    vi.stubGlobal("TextEditorPF2e", TextEditorPF2e);
    vi.stubGlobal("TextEditor", { enrichHTML: vi.fn() });
    const actor = {
      isOwner: true,
      getRollData: vi.fn(() => ({ actor: { level: 8 } })),
    };

    await expect(enrichCharacterRichText("@Check[fortitude] [[/r 1d20]]", actor)).resolves.toBe(
      "<pf2e>@Check[fortitude] [[/r 1d20]]</pf2e>",
    );
    expect(enrichHTML).toHaveBeenCalledWith("@Check[fortitude] [[/r 1d20]]", {
      async: true,
      secrets: true,
      rollData: { actor: { level: 8 } },
      relativeTo: actor,
    });
  });

  it("uses Foundry enrichment after a PF2e failure", async () => {
    vi.stubGlobal("TextEditorPF2e", { enrichHTML: vi.fn().mockRejectedValue(new Error("PF2e unavailable")) });
    const foundryEnrich = vi.fn(async (content: string) => `<foundry>${content}</foundry>`);
    vi.stubGlobal("TextEditor", { enrichHTML: foundryEnrich });

    await expect(enrichCharacterRichText("@UUID[Actor.test]", {})).resolves.toBe(
      "<foundry>@UUID[Actor.test]</foundry>",
    );
    expect(foundryEnrich).toHaveBeenCalledOnce();
  });

  it("removes secret and GM-only blocks before enrichment for non-owners", async () => {
    const enrichHTML = vi.fn(async (content: string) => content);
    vi.stubGlobal("TextEditor", { enrichHTML });
    const actor = { testUserPermission: vi.fn(() => false) };
    const content = [
      "<p>Public</p>",
      '<section class="secret"><p>Hidden</p></section>',
      '<div data-visibility="gm">GM note</div>',
    ].join("");

    const enriched = await enrichCharacterRichText(content, actor, { user: { id: "player" } });

    expect(enriched).toBe("<p>Public</p>");
    expect(enrichHTML).toHaveBeenCalledWith("<p>Public</p>", expect.objectContaining({ secrets: false }));
    expect(canViewCharacterSecrets(actor, { id: "player" })).toBe(false);
    expect(actor.testUserPermission).toHaveBeenCalledWith({ id: "player" }, "OWNER");
    expect(canViewCharacterSecrets(actor, { isGM: true })).toBe(true);
  });

  it("does not leak content after nested tags inside a secret block", async () => {
    const enrichHTML = vi.fn(async (content: string) => content);
    vi.stubGlobal("TextEditor", { enrichHTML });
    const content = [
      "<p>Before</p>",
      '<section class="secret"><div><section><p>Nested secret</p></section></div><p>Still secret</p></section>',
      '<article data-visibility="gm"><div><span>GM only</span></div></article>',
      "<p>After</p>",
    ].join("");

    await expect(enrichCharacterRichText(content, {}, { user: { id: "player" } })).resolves.toBe(
      "<p>Before</p><p>After</p>",
    );
    expect(enrichHTML).toHaveBeenCalledWith("<p>Before</p><p>After</p>", expect.objectContaining({ secrets: false }));
  });

  it("reports the actual PF2e, Foundry, or unsupported enrichment capability", () => {
    expect(characterRichTextCapabilityStatus()).toBe("unsupported");
    vi.stubGlobal("TextEditor", { enrichHTML: vi.fn() });
    expect(characterRichTextCapabilityStatus()).toBe("fallback");
    vi.stubGlobal("TextEditorPF2e", { enrichHTML: vi.fn() });
    expect(characterRichTextCapabilityStatus()).toBe("supported");
  });

  it("enriches all biography fields and falls back to safely escaped text", async () => {
    const actor = {
      system: {
        details: {
          biography: {
            appearance: "<b>Masked</b>",
            backstory: "@UUID[Item.story]",
            campaignNotes: "Campaign",
            allies: "Allies",
            enemies: "Enemies",
            organizations: "Organizations",
          },
        },
      },
    };

    const biography = await enrichCharacterBiography(actor);

    expect(biography.appearance).toBe("&lt;b&gt;Masked&lt;/b&gt;");
    expect(biography.backstory).toBe("@UUID[Item.story]");
    expect(Object.keys(biography)).toEqual([
      "appearance", "backstory", "campaignNotes", "allies", "enemies", "organizations",
    ]);
  });
});
