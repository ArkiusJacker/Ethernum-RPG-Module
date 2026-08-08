import { describe, expect, it } from "vitest";
import { createPF2eCharacterSnapshot } from "../scripts/core/PF2eCharacterAdapter.js";

describe("PF2eCharacterAdapter", () => {
  it("creates a stable snapshot from prepared PF2e character data", () => {
    const snapshot = createPF2eCharacterSnapshot({
      id: "actor-1",
      uuid: "Actor.actor-1",
      name: "Atlas",
      img: "atlas.webp",
      system: {
        details: { level: { value: 9 } },
        attributes: {
          hp: { value: 61, max: 88, temp: 7 },
          ac: { value: 28 },
          speed: { value: 25 },
        },
        perception: { mod: 17 },
        resources: { heroPoints: { value: 2 } },
        saves: {
          fortitude: { value: 18 },
          reflex: { value: 14 },
          will: { value: 19 },
        },
      },
      saves: {
        fortitude: { mod: 20 },
        reflex: { check: { mod: 16 } },
        will: { mod: 21 },
      },
      itemTypes: {
        class: [{ name: "Cleric" }],
        ancestry: [{ name: "Human" }],
        heritage: [{ name: "Skilled Heritage" }],
        condition: [
          { name: "Drained 1", slug: "drained", system: { value: { value: 1 } } },
          { name: "Off-Guard", slug: "off-guard", system: { value: { value: null } } },
        ],
      },
    });

    expect(snapshot).toEqual({
      actorId: "actor-1",
      actorUuid: "Actor.actor-1",
      name: "Atlas",
      image: "atlas.webp",
      level: 9,
      className: "Cleric",
      ancestryName: "Human",
      heritageName: "Skilled Heritage",
      hp: { current: 61, max: 88, temp: 7 },
      ac: 28,
      perception: 17,
      speed: 25,
      saves: { fortitude: 20, reflex: 16, will: 21 },
      heroPoints: 2,
      conditions: [
        { slug: "drained", name: "Drained 1", value: 1 },
        { slug: "off-guard", name: "Off-Guard" },
      ],
    });
  });

  it("returns safe defaults for partial actor data", () => {
    expect(createPF2eCharacterSnapshot({ name: "New Hero" })).toEqual({
      actorId: "",
      actorUuid: "",
      name: "New Hero",
      image: "",
      level: 0,
      className: "",
      ancestryName: "",
      hp: { current: 0, max: 0, temp: 0 },
      ac: 0,
      perception: 0,
      speed: 0,
      saves: { fortitude: 0, reflex: 0, will: 0 },
      heroPoints: 0,
      conditions: [],
    });
  });

  it("reads Foundry-style iterable item collections", () => {
    const snapshot = createPF2eCharacterSnapshot({
      items: new Set([
        { type: "class", name: "Monk" },
        { type: "ancestry", name: "Human" },
        { type: "condition", name: "Stunned 2", slug: "stunned", system: { value: { value: 2 } } },
      ]),
    });
    expect(snapshot.className).toBe("Monk");
    expect(snapshot.ancestryName).toBe("Human");
    expect(snapshot.conditions).toEqual([{ slug: "stunned", name: "Stunned 2", value: 2 }]);
  });
});
