import { describe, expect, it } from "vitest";
import {
  PF2eCharacterAdapter,
  createPF2eCharacterSnapshot,
} from "../scripts/core/PF2eCharacterAdapter.js";

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

  it("reads complete identity and prepared vitals without writing to the actor", () => {
    const actor = {
      id: "hero-7",
      uuid: "Actor.hero-7",
      name: "Yu",
      img: "yu.webp",
      playerName: "Alice",
      armorClass: { value: 31 },
      perception: { label: "Perception", mod: 18, roll: () => undefined },
      system: {
        details: { level: { value: 10 } },
        attributes: {
          hp: { value: 72, max: 90, temp: 8 },
          ac: { value: 29 },
        },
        perception: { mod: 16 },
        resources: { heroPoints: { value: 2, max: 3 } },
      },
      itemTypes: {
        class: [{ id: "class", name: "Monk" }],
        ancestry: [{ id: "ancestry", name: "Human" }],
        heritage: [{ id: "heritage", name: "Versatile Heritage" }],
        background: [{ id: "background", name: "Martial Disciple" }],
        condition: [
          { id: "dying", name: "Dying 2", slug: "dying", system: { value: { value: 2 } } },
          { id: "wounded", name: "Wounded 1", slug: "wounded", system: { value: { value: 1 } } },
          { id: "doomed", name: "Doomed 1", slug: "doomed", system: { value: { value: 1 } } },
        ],
      },
    };
    const before = JSON.stringify(actor);

    expect(PF2eCharacterAdapter.identity(actor as never)).toEqual({
      actorId: "hero-7",
      actorUuid: "Actor.hero-7",
      name: "Yu",
      image: "yu.webp",
      level: 10,
      className: "Monk",
      ancestryName: "Human",
      heritageName: "Versatile Heritage",
      backgroundName: "Martial Disciple",
      playerName: "Alice",
    });
    expect(PF2eCharacterAdapter.vitals(actor as never)).toEqual({
      hp: { current: 72, max: 90, temp: 8 },
      ac: 31,
      perception: 18,
      heroPoints: { current: 2, max: 3 },
      dying: 2,
      wounded: 1,
      doomed: 1,
    });
    expect(JSON.stringify(actor)).toBe(before);
  });

  it("normalizes all abilities and prepared or stored skills", () => {
    const roll = () => undefined;
    const actor = {
      abilities: {
        str: { label: "Strength", mod: 5 },
        dex: { mod: 4 },
      },
      skills: new Map([
        ["acrobatics", { label: "Acrobatics", mod: 17, rank: 2, roll }],
        ["athletics", { label: "Athletics", check: { mod: 19, roll }, rank: 3 }],
      ]),
      system: {
        abilities: {
          str: { mod: 4 }, dex: { mod: 3 }, con: { mod: 2 },
          int: { mod: 1 }, wis: { mod: 0 }, cha: { mod: -1 },
        },
        skills: {
          acrobatics: { mod: 15, rank: 1 },
          arcana: { label: "Arcana", mod: 12, rank: 1 },
        },
      },
    };

    expect(PF2eCharacterAdapter.abilities(actor as never)).toEqual([
      { slug: "str", label: "Strength", modifier: 5 },
      { slug: "dex", label: "DEX", modifier: 4 },
      { slug: "con", label: "CON", modifier: 2 },
      { slug: "int", label: "INT", modifier: 1 },
      { slug: "wis", label: "WIS", modifier: 0 },
      { slug: "cha", label: "CHA", modifier: -1 },
    ]);
    expect(PF2eCharacterAdapter.skills(actor as never)).toEqual([
      { slug: "acrobatics", label: "Acrobatics", modifier: 17, rank: 2, rankLabel: "Expert", rollable: true },
      { slug: "arcana", label: "Arcana", modifier: 12, rank: 1, rankLabel: "Trained", rollable: false },
      { slug: "athletics", label: "Athletics", modifier: 19, rank: 3, rankLabel: "Master", rollable: true },
    ]);
  });

  it("prefers prepared defenses and supports every PF2e movement type", () => {
    const roll = () => undefined;
    const actor = {
      armorClass: { value: 30 },
      perception: { mod: 18, check: { roll } },
      saves: {
        fortitude: { label: "Fortitude", mod: 20, roll },
        reflex: { check: { mod: 17, roll } },
        will: { mod: 19, roll },
      },
      speed: {
        total: 35,
        otherSpeeds: new Set([
          { type: "fly", total: 40 },
          { type: "climb", value: 15 },
        ]),
      },
      movement: { swim: { value: 20 }, burrow: 10 },
      system: {
        attributes: {
          ac: { value: 28 },
          speed: { value: 25, otherSpeeds: [{ type: "swim", value: 25 }] },
        },
        perception: { mod: 16 },
        saves: {
          fortitude: { mod: 18 }, reflex: { mod: 15 }, will: { mod: 17 },
        },
      },
    };

    expect(PF2eCharacterAdapter.defenses(actor as never)).toEqual({
      ac: 30,
      perception: { slug: "perception", label: "Perception", modifier: 18, rollable: true },
      saves: {
        fortitude: { slug: "fortitude", label: "Fortitude", modifier: 20, rollable: true },
        reflex: { slug: "reflex", label: "Reflex", modifier: 17, rollable: true },
        will: { slug: "will", label: "Will", modifier: 19, rollable: true },
      },
    });
    expect(PF2eCharacterAdapter.movement(actor as never)).toEqual({
      land: 35,
      fly: 40,
      swim: 20,
      climb: 15,
      burrow: 10,
      speeds: [
        { type: "land", label: "Land", value: 35 },
        { type: "fly", label: "Fly", value: 40 },
        { type: "swim", label: "Swim", value: 20 },
        { type: "climb", label: "Climb", value: 15 },
        { type: "burrow", label: "Burrow", value: 10 },
      ],
    });
  });

  it("does not read the deprecated PF2e speed path when modern movement data exists", () => {
    const attributes = { ac: { value: 20 } } as Record<string, unknown>;
    Object.defineProperty(attributes, "speed", {
      get: () => {
        throw new Error("deprecated system.attributes.speed was read");
      },
    });
    const movement = PF2eCharacterAdapter.movement({
      movement: {
        speeds: [
          { type: "land", value: 30 },
          { type: "fly", value: 15 },
        ],
      },
      system: { attributes },
    } as never);

    expect(movement).toMatchObject({ land: 30, fly: 15 });
  });

  it("unites actor items, typed conditions, and effects without duplicates", () => {
    const drained = {
      id: "condition-1",
      uuid: "Actor.hero.Item.condition-1",
      type: "condition",
      name: "Drained 1",
      slug: "drained",
      img: "drained.webp",
      system: { value: { value: 1 } },
    };
    const effects = PF2eCharacterAdapter.effects({
      items: new Set([
        drained,
        {
          id: "persistent",
          type: "condition",
          name: "Persistent Fire",
          slug: "persistent-damage-fire",
          system: { value: { value: 3 }, duration: { remaining: 2, unit: "rounds" } },
        },
      ]),
      itemTypes: {
        condition: [{ ...drained }],
        effect: [{ id: "effect-1", name: "Bless", slug: "bless", system: { duration: { value: 1, unit: "minutes" } } }],
      },
      effects: [{ id: "effect-1", type: "effect", name: "Bless duplicate", slug: "bless" }],
    } as never);

    expect(effects).toHaveLength(3);
    expect(effects).toEqual([
      {
        id: "condition-1",
        uuid: "Actor.hero.Item.condition-1",
        slug: "drained",
        name: "Drained 1",
        image: "drained.webp",
        kind: "condition",
        value: 1,
        active: true,
      },
      {
        id: "persistent",
        uuid: "",
        slug: "persistent-damage-fire",
        name: "Persistent Fire",
        image: "",
        kind: "persistent-damage",
        value: 3,
        duration: "2 rounds",
        active: true,
      },
      {
        id: "effect-1",
        uuid: "",
        slug: "bless",
        name: "Bless",
        image: "",
        kind: "effect",
        duration: "1 minutes",
        active: true,
      },
    ]);
  });

  it("reads prepared strikes and actions without calculating PF2e rolls", () => {
    const actor = {
      system: {
        actions: [
          {
            id: "fist",
            type: "strike",
            label: "Fist",
            item: { id: "weapon-1", type: "weapon", name: "Fist", img: "fist.webp", system: { traits: { value: ["agile", "finesse"] } } },
            variants: [{ modifier: 18 }, { modifier: 14 }, { modifier: 10 }],
            damage: { formula: "2d8+5" },
          },
          {
            id: "raise-shield",
            type: "action",
            label: "Raise a Shield",
            actions: 1,
            traits: ["general"],
          },
        ],
      },
    };

    expect(PF2eCharacterAdapter.strikes(actor as never)).toEqual([{
      id: "fist",
      itemId: "weapon-1",
      label: "Fist",
      image: "fist.webp",
      traits: ["agile", "finesse"],
      attackModifier: 18,
      map: { first: 18, second: 14, third: 10 },
      damage: "2d8+5",
      usable: true,
    }]);
    expect(PF2eCharacterAdapter.actions(actor as never)).toEqual([{
      id: "raise-shield",
      label: "Raise a Shield",
      actionType: "action",
      actions: 1,
      traits: ["general"],
      usable: true,
    }]);
  });

  it("categorizes iterable inventory and groups feats", () => {
    const actor = {
      items: new Map([
        ["sword", { id: "sword", uuid: "Actor.hero.Item.sword", type: "weapon", name: "Longsword", img: "sword.webp", system: { quantity: 1, equipped: { carryType: "held" }, bulk: { value: "1" }, price: { value: { gp: 1 } } } }],
        ["shield", { id: "shield", type: "armor", name: "Steel Shield", system: { category: "shield", quantity: 1 } }],
        ["potion", { id: "potion", type: "consumable", name: "Healing Potion", system: { quantity: 2 } }],
        ["feat", { id: "feat", type: "feat", name: "Power Attack", img: "feat.webp", system: { category: "class", level: { value: 1 }, traits: { value: ["fighter"] } } }],
      ]),
    };
    const inventory = PF2eCharacterAdapter.inventory(actor as never);

    expect(inventory.all).toHaveLength(3);
    expect(inventory.weapons[0]).toEqual({
      id: "sword",
      uuid: "Actor.hero.Item.sword",
      name: "Longsword",
      image: "sword.webp",
      type: "weapon",
      quantity: 1,
      equipped: true,
      bulk: "1",
      price: "1 gp",
    });
    expect(inventory.shields.map(item => item.name)).toEqual(["Steel Shield"]);
    expect(inventory.consumables[0].quantity).toBe(2);
    expect(PF2eCharacterAdapter.feats(actor as never)).toEqual([{
      id: "feat",
      uuid: "",
      name: "Power Attack",
      image: "feat.webp",
      category: "class",
      level: 1,
      traits: ["fighter"],
    }]);
  });

  it("reads spellcasting entries, spells, focus points, and generic class resources", () => {
    const actor = {
      system: {
        resources: {
          heroPoints: { value: 1, max: 3 },
          focus: { value: 2, max: 3 },
          mythicPoints: { value: 1, max: 3 },
          panache: { value: 1, max: 1 },
        },
      },
      items: [
        {
          id: "entry-1",
          type: "spellcastingEntry",
          name: "Divine Prepared Spells",
          system: {
            tradition: { value: "divine" },
            prepared: { value: "prepared" },
            statistic: { dc: { value: 27 }, mod: 17 },
          },
        },
        {
          id: "heal",
          uuid: "Actor.hero.Item.heal",
          type: "spell",
          name: "Heal",
          img: "heal.webp",
          system: {
            level: { value: 3 },
            category: "spell",
            location: { value: "entry-1" },
            traits: { traditions: ["divine"] },
          },
        },
        {
          id: "light",
          type: "spell",
          name: "Light",
          system: { rank: 0, category: "cantrip", traits: { traditions: ["divine"] } },
        },
      ],
    };

    expect(PF2eCharacterAdapter.spellcasting(actor as never)).toEqual({
      hasSpellcasting: true,
      entries: [{
        id: "entry-1",
        name: "Divine Prepared Spells",
        tradition: "divine",
        dc: 27,
        spellAttack: 17,
        preparation: "prepared",
        focus: false,
        spells: [{
          id: "heal",
          uuid: "Actor.hero.Item.heal",
          name: "Heal",
          image: "heal.webp",
          rank: 3,
          category: "spell",
          locationId: "entry-1",
          traditions: ["divine"],
          focus: false,
        }],
      }],
      unassignedSpells: [{
        id: "light",
        uuid: "",
        name: "Light",
        image: "",
        rank: 0,
        category: "cantrip",
        traditions: ["divine"],
        focus: false,
      }],
      focusPoints: { current: 2, max: 3 },
    });
    expect(PF2eCharacterAdapter.resources(actor as never)).toEqual({
      heroPoints: { current: 1, max: 3 },
      focusPoints: { current: 2, max: 3 },
      mythicPoints: { current: 1, max: 3 },
      classResources: { panache: { current: 1, max: 1 } },
    });
  });

  it("uses robust actor.system and iterable itemTypes fallbacks", () => {
    const actor = {
      name: "Fallback Hero",
      system: {
        level: { value: 4 },
        attributes: {
          hp: { value: -5, max: 44 },
          ac: { mod: 21 },
          speed: { value: 25, otherSpeeds: new Set([{ type: "fly", value: 30 }]) },
        },
        perception: { value: 11 },
        saves: {
          fortitude: { totalModifier: 12 },
          reflex: { total: 10 },
          will: { value: 13 },
        },
      },
      itemTypes: {
        class: new Set([{ name: "Inventor" }]),
        ancestry: new Set([{ name: "Dwarf" }]),
        weapon: new Set([{ id: "hammer", name: "Hammer", system: { quantity: { value: 1 } } }]),
      },
    };

    expect(PF2eCharacterAdapter.identity(actor as never)).toMatchObject({
      name: "Fallback Hero",
      level: 4,
      className: "Inventor",
      ancestryName: "Dwarf",
    });
    expect(PF2eCharacterAdapter.vitals(actor as never)).toMatchObject({
      hp: { current: 0, max: 44, temp: 0 },
      ac: 21,
      perception: 11,
      heroPoints: { current: 0, max: 0 },
    });
    expect(PF2eCharacterAdapter.defenses(actor as never).saves).toMatchObject({
      fortitude: { modifier: 12 },
      reflex: { modifier: 10 },
      will: { modifier: 13 },
    });
    expect(PF2eCharacterAdapter.movement(actor as never)).toMatchObject({ land: 25, fly: 30 });
    expect(PF2eCharacterAdapter.inventory(actor as never).weapons[0]).toMatchObject({
      id: "hammer",
      name: "Hammer",
      type: "weapon",
      quantity: 1,
    });
  });
});
