import { beforeEach, describe, expect, it, vi } from "vitest";
import { PF2eCharacterActions } from "../scripts/sheets/core/PF2eCharacterActions.js";

describe("PF2eCharacterActions", () => {
  beforeEach(() => {
    vi.stubGlobal("game", {
      user: { isGM: false },
      i18n: { localize: (key: string) => key },
    });
    vi.stubGlobal("ui", { notifications: { warn: vi.fn() } });
  });

  it("delegates skill rolls to the prepared PF2e check", async () => {
    const roll = vi.fn().mockResolvedValue("skill-roll");
    const actor = { isOwner: true, skills: { athletics: { check: { roll } } } } as unknown as Actor;
    await expect(PF2eCharacterActions.rollSkill(actor, "athletics", { skipDialog: true })).resolves.toBe("skill-roll");
    expect(roll).toHaveBeenCalledWith({ skipDialog: true });
  });

  it("delegates strike attack and damage to the selected prepared action", async () => {
    const attack = vi.fn().mockResolvedValue("attack");
    const damage = vi.fn().mockResolvedValue("damage");
    const actor = {
      isOwner: true,
      system: { actions: [{ id: "fist", variants: [{ roll: vi.fn() }, { roll: attack }], damage }] },
    } as unknown as Actor;
    await expect(PF2eCharacterActions.rollStrike(actor, "fist", 1)).resolves.toBe("attack");
    await expect(PF2eCharacterActions.rollStrikeDamage(actor, "fist")).resolves.toBe("damage");
  });

  it("blocks observers from using owner actions", async () => {
    const actor = { isOwner: false, skills: {} } as unknown as Actor;
    await expect(PF2eCharacterActions.rollSkill(actor, "arcana")).rejects.toThrow("permission");
  });
});
