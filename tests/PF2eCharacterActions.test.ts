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

  it("delegates carry states to PF2e without writing equipped paths directly", async () => {
    const item = { id: "sword" };
    const changeCarryType = vi.fn().mockResolvedValue("changed");
    const actor = {
      isOwner: true,
      items: { get: vi.fn().mockReturnValue(item) },
      changeCarryType,
    } as unknown as Actor;

    await expect(PF2eCharacterActions.changeCarryType(actor, "sword", {
      carryType: "held",
      handsHeld: 2,
    })).resolves.toBe("changed");
    expect(changeCarryType).toHaveBeenCalledWith(item, { carryType: "held", handsHeld: 2 });
  });

  it("casts through the PF2e spell collection with rank and slot", async () => {
    const spell = { id: "daze" };
    const cast = vi.fn().mockResolvedValue("cast");
    const collection = {
      get: vi.fn().mockReturnValue(spell),
      entry: { cast },
    };
    const actor = {
      isOwner: true,
      spellcasting: { collections: { get: vi.fn().mockReturnValue(collection) } },
    } as unknown as Actor;

    await expect(PF2eCharacterActions.castSpell(actor, {
      entryId: "arcane",
      spellId: "daze",
      rank: 2,
      slotId: 1,
    })).resolves.toBe("cast");
    expect(cast).toHaveBeenCalledWith(spell, { rank: 2, slotId: 1 });
  });

  it("uses prepared PF2e resources and their actual maximum", async () => {
    const updateResource = vi.fn().mockResolvedValue("updated");
    const actor = {
      isOwner: true,
      getResource: vi.fn().mockReturnValue({ slug: "hero-points", value: 4, max: 5 }),
      updateResource,
    } as unknown as Actor;

    await PF2eCharacterActions.updateHeroPoints(actor, 7);
    expect(updateResource).toHaveBeenCalledWith("hero-points", 5);
    await PF2eCharacterActions.adjustResource(actor, "hero-points", -2);
    expect(updateResource).toHaveBeenLastCalledWith("hero-points", 2);
  });

  it("refuses investment when PF2e does not mark the item investable", async () => {
    const actor = {
      isOwner: true,
      items: { get: vi.fn().mockReturnValue({ isInvestable: false, update: vi.fn() }) },
    } as unknown as Actor;
    await expect(PF2eCharacterActions.toggleInvested(actor, "mundane", true)).rejects.toThrow("investable");
  });
});
