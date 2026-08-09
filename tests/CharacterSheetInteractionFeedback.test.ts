import { describe, expect, it } from "vitest";
import {
  buildCharacterSheetFeedbackSelector,
  characterSheetFeedbackDuration,
} from "../scripts/sheets/core/CharacterSheetInteractionFeedback.js";

describe("CharacterSheetInteractionFeedback", () => {
  it("builds stable selectors from semantic identifiers", () => {
    expect(buildCharacterSheetFeedbackSelector({
      action: "cast-spell",
      itemId: "spell-1",
      entryId: "arcane",
    })).toBe('[data-action="cast-spell"][data-item-id="spell-1"][data-entry-id="arcane"]');
  });

  it("returns no selector when feedback targets the whole sheet", () => {
    expect(buildCharacterSheetFeedbackSelector()).toBeNull();
  });

  it("escapes attribute values without relying on browser globals", () => {
    expect(buildCharacterSheetFeedbackSelector({ itemId: 'item"\\id' }))
      .toBe('[data-item-id="item\\"\\\\id"]');
  });

  it("reduces or disables feedback duration according to motion mode", () => {
    expect(characterSheetFeedbackDuration("healing", "full")).toBe(360);
    expect(characterSheetFeedbackDuration("healing", "reduced")).toBe(140);
    expect(characterSheetFeedbackDuration("damage", "reduced")).toBe(120);
    expect(characterSheetFeedbackDuration("roll", "off")).toBe(0);
  });
});
