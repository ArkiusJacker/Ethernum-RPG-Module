import { afterEach, describe, expect, it, vi } from "vitest";
import { PF2eCharacterAdapter } from "../scripts/core/PF2eCharacterAdapter.js";
import { PF2eCharacterActions } from "../scripts/sheets/core/PF2eCharacterActions.js";

describe("Character Sheet PF2e data parity", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads changes made by either sheet from the same Actor and Item documents", async () => {
    vi.stubGlobal("game", { user: { isGM: false } });
    const sword = {
      id: "sword",
      type: "weapon",
      name: "Longsword",
      system: { quantity: 1, equipped: { carryType: "stowed" }, usage: { value: "held-in-one-hand" } },
    };
    const heroPoints = { slug: "hero-points", value: 1, max: 4 };
    const actor = {
      id: "hero",
      uuid: "Actor.hero",
      name: "Parity Hero",
      isOwner: true,
      system: {
        attributes: { hp: { value: 30, max: 40, temp: 0 } },
        resources: { heroPoints },
      },
      items: new Map([[sword.id, sword]]),
      getResource: vi.fn((slug: string) => slug === heroPoints.slug ? heroPoints : null),
      updateResource: vi.fn(async (_slug: string, value: number) => { heroPoints.value = value; }),
      changeCarryType: vi.fn(async (item: typeof sword, options: { carryType: string; handsHeld?: number }) => {
        item.system.equipped.carryType = options.carryType;
        Object.assign(item.system.equipped, options.handsHeld ? { handsHeld: options.handsHeld } : {});
      }),
      update: vi.fn(async (changes: Record<string, unknown>) => {
        if (changes["system.attributes.hp.value"] !== undefined) {
          actor.system.attributes.hp.value = Number(changes["system.attributes.hp.value"]);
        }
      }),
    };

    await PF2eCharacterActions.updateHP(actor as never, 24);
    await PF2eCharacterActions.updateHeroPoints(actor as never, 3);
    await PF2eCharacterActions.changeCarryType(actor as never, sword.id, { carryType: "held", handsHeld: 1 });

    expect(PF2eCharacterAdapter.vitals(actor as never)).toMatchObject({
      hp: { current: 24, max: 40 },
      heroPoints: { current: 3, max: 4 },
    });
    expect(PF2eCharacterAdapter.inventory(actor as never).weapons[0]).toMatchObject({
      id: "sword",
      carryType: "held",
      handsHeld: 1,
      equipped: true,
    });

    actor.system.attributes.hp.value = 12;
    sword.system.equipped.carryType = "stowed";
    expect(PF2eCharacterAdapter.vitals(actor as never).hp.current).toBe(12);
    expect(PF2eCharacterAdapter.inventory(actor as never).weapons[0]).toMatchObject({
      carryType: "stowed",
      equipped: false,
    });
  });
});
