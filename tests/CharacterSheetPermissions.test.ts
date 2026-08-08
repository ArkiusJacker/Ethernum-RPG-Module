import { describe, expect, it } from "vitest";
import { resolveCharacterSheetPermissions } from "../scripts/sheets/core/CharacterSheetController.js";

function actor(isOwner: boolean, observer: boolean): Actor {
  return {
    isOwner,
    testUserPermission: () => observer,
  } as unknown as Actor;
}

describe("CharacterSheet permissions", () => {
  it("gives a GM full control", () => {
    const result = resolveCharacterSheetPermissions(actor(false, false), { isGM: true } as User, false);
    expect(result).toMatchObject({ gm: true, editable: true, canChooseSheet: true });
  });

  it("lets an owner use the sheet and follow world sheet policy", () => {
    const allowed = resolveCharacterSheetPermissions(actor(true, true), { isGM: false } as User, true);
    const blocked = resolveCharacterSheetPermissions(actor(true, true), { isGM: false } as User, false);
    expect(allowed).toMatchObject({ owner: true, observer: true, editable: true, canChooseSheet: true });
    expect(blocked.canChooseSheet).toBe(false);
  });

  it("keeps observer and limited access read only", () => {
    const observer = resolveCharacterSheetPermissions(actor(false, true), { isGM: false } as User);
    const limited = resolveCharacterSheetPermissions(actor(false, false), { isGM: false } as User);
    expect(observer).toMatchObject({ observer: true, editable: false, canChooseSheet: false });
    expect(limited).toMatchObject({ observer: false, editable: false, canChooseSheet: false });
  });
});
