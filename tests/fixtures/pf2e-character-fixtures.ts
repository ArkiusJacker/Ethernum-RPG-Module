export type HarnessCharacterClass =
  | "Fighter"
  | "Wizard"
  | "Sorcerer"
  | "Cleric"
  | "Kineticist"
  | "Inventor"
  | "Thaumaturge"
  | "Alchemist"
  | "Monk";

export type PF2eCharacterFixture = Record<string, unknown>;

type FixtureOptions = {
  level?: number;
  resources?: Record<string, unknown>;
  items?: Array<Record<string, unknown>>;
  actions?: Array<Record<string, unknown>>;
};

function item(
  id: string,
  type: string,
  name: string,
  system: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    uuid: `Actor.harness-${id}.Item.${id}`,
    type,
    name,
    img: `icons/${type}/${id}.webp`,
    system,
  };
}

function action(
  id: string,
  label: string,
  traits: string[] = [],
  actions = 1,
): Record<string, unknown> {
  return {
    id,
    slug: id,
    type: "action",
    actionType: "action",
    label,
    actions,
    traits,
    usable: true,
  };
}

function strike(
  id: string,
  label: string,
  damage: string,
  traits: string[] = [],
): Record<string, unknown> {
  return {
    id,
    slug: id,
    type: "strike",
    label,
    item: item(`${id}-item`, "weapon", label, {
      traits: { value: traits },
      damage: { formula: damage },
    }),
    variants: [{ modifier: 18 }, { modifier: 13 }, { modifier: 8 }],
    damage: { formula: damage },
    usable: true,
  };
}

function baseCharacter(className: HarnessCharacterClass, options: FixtureOptions = {}): PF2eCharacterFixture {
  const slug = className.toLowerCase();
  const level = options.level ?? 7;
  const actions = options.actions ?? [action(`${slug}-action`, `${className} Action`, [slug])];
  const classItem = item(`${slug}-class`, "class", className, { keyAbility: { value: "str" } });
  const ancestry = item(`${slug}-ancestry`, "ancestry", "Human");
  const heritage = item(`${slug}-heritage`, "heritage", "Versatile Heritage");
  const background = item(`${slug}-background`, "background", "Pathfinder Hopeful");
  const feat = item(`${slug}-feat`, "feat", `${className} Dedication`, {
    category: "class",
    level: { value: 1 },
    traits: { value: [slug] },
  });
  const equipment = item(`${slug}-kit`, "equipment", `${className} Kit`, {
    quantity: 1,
    bulk: { value: "1" },
    equipped: { carryType: "worn" },
  });

  return {
    id: `harness-${slug}`,
    uuid: `Actor.harness-${slug}`,
    name: `Harness ${className}`,
    img: `portraits/${slug}.webp`,
    type: "character",
    armorClass: { value: 25 },
    perception: { label: "Perception", mod: 14, roll: () => undefined },
    abilities: {
      str: { label: "Strength", mod: 4 },
      dex: { label: "Dexterity", mod: 3 },
      con: { label: "Constitution", mod: 3 },
      int: { label: "Intelligence", mod: 2 },
      wis: { label: "Wisdom", mod: 2 },
      cha: { label: "Charisma", mod: 1 },
    },
    skills: new Map([
      ["athletics", { label: "Athletics", mod: 16, rank: 2, roll: () => undefined }],
      ["class-skill", { label: `${className} Lore`, mod: 14, rank: 2, roll: () => undefined }],
    ]),
    saves: {
      fortitude: { label: "Fortitude", mod: 16, roll: () => undefined },
      reflex: { label: "Reflex", mod: 14, roll: () => undefined },
      will: { label: "Will", mod: 13, roll: () => undefined },
    },
    movement: {
      speeds: [
        { type: "land", value: 25 },
        { type: "climb", value: 10 },
      ],
    },
    inventory: {
      bulk: { value: 3, max: 9, encumberedAt: 6, maxPercentageInteger: 33 },
    },
    system: {
      details: {
        level: { value: level },
        biography: { appearance: `${className} fixture`, backstory: "Harness 2.0" },
      },
      attributes: {
        hp: { value: 68, max: 76, temp: 4 },
        ac: { value: 24 },
        immunities: [],
        resistances: [],
        weaknesses: [],
      },
      perception: { mod: 13 },
      saves: {
        fortitude: { mod: 15 },
        reflex: { mod: 13 },
        will: { mod: 12 },
      },
      abilities: {
        str: { mod: 4 }, dex: { mod: 3 }, con: { mod: 3 },
        int: { mod: 2 }, wis: { mod: 2 }, cha: { mod: 1 },
      },
      skills: {
        athletics: { label: "Athletics", mod: 15, rank: 2 },
      },
      resources: {
        heroPoints: { value: 1, max: 3 },
        focus: { value: 0, max: 0 },
        ...options.resources,
      },
      proficiencies: {
        attacks: { martial: { label: "Martial Weapons", rank: 2, visible: true } },
        defenses: { light: { label: "Light Armor", rank: 2, visible: true } },
        classDCs: { [slug]: { label: `${className} DC`, dc: 25, rank: 2, primary: true } },
      },
      traits: {
        senses: [{ slug: "low-light-vision", label: "Low-Light Vision", acuity: "precise" }],
        languages: { value: ["common"], details: "Fixture dialect" },
      },
      actions,
    },
    items: [classItem, ancestry, heritage, background, feat, equipment, ...(options.items ?? [])],
  };
}

function spell(
  id: string,
  name: string,
  rank: number,
  tradition: string,
  locationId: string,
  options: { category?: string; signature?: boolean } = {},
): Record<string, unknown> {
  return item(id, "spell", name, {
    rank,
    category: options.category ?? "spell",
    location: { value: locationId, signature: options.signature ?? false },
    traits: { traditions: [tradition] },
  });
}

function spellCollection(
  id: string,
  name: string,
  preparation: string,
  tradition: string,
  spells: Array<Record<string, unknown>>,
  slots: Record<string, unknown>,
  sheetData: Record<string, unknown>,
): Record<string, unknown> {
  const entry = item(id, "spellcastingEntry", name, {
    prepared: { value: preparation },
    tradition: { value: tradition },
    statistic: { dc: { value: 27 }, mod: 17 },
    slots,
  });
  const collection = Object.assign(new Map(spells.map(document => [String(document.id), document])), {
    id: `${id}-collection`,
    name,
    entry,
  });
  Object.assign(entry, {
    getSheetData: async (options: Record<string, unknown>) => {
      const { spells: requestedSpells, ...sheetOptions } = options;
      return {
        ...sheetData,
        options: sheetOptions,
        receivedSpellCollection: requestedSpells === collection,
      };
    },
  });
  return collection;
}

export function createFighterFixture(): PF2eCharacterFixture {
  return baseCharacter("Fighter", {
    actions: [
      strike("fighter-longsword", "Longsword", "2d8+4", ["versatile-p"]),
      action("power-attack", "Power Attack", ["flourish"], 2),
    ],
    resources: { bravery: { value: 1, max: 1 } },
  });
}

export function createWizardFixture(): PF2eCharacterFixture {
  const entryId = "wizard-arcane";
  const cantrip = spell("telekinetic-projectile", "Telekinetic Projectile", 0, "arcane", entryId, { category: "cantrip" });
  const forceBarrage = spell("force-barrage", "Force Barrage", 1, "arcane", entryId);
  const fear = spell("wizard-fear", "Fear", 1, "arcane", entryId);
  const focus = spell("protective-wards", "Protective Wards", 1, "arcane", entryId, { category: "focus" });
  const slots = {
    slot0: { max: 1, prepared: [{ id: "telekinetic-projectile", expended: false }] },
    slot1: { max: 2, prepared: [{ id: "force-barrage", expended: false }, { id: "force-barrage", expended: true }] },
    slot2: { max: 1, prepared: [{ id: "wizard-fear", expended: true }] },
  };
  const collection = spellCollection(
    entryId,
    "Arcane Prepared Spells",
    "prepared",
    "arcane",
    [cantrip, forceBarrage, fear, focus],
    slots,
    {
      preparation: "prepared",
      groups: [
        { rank: 0, cantrips: true, spells: [{ id: "telekinetic-projectile", castRank: 0 }] },
        { rank: 1, slots: { value: 1, max: 2 }, spells: [{ id: "force-barrage", expended: false }] },
        { rank: 2, slots: { value: 0, max: 1 }, spells: [{ id: "wizard-fear", baseRank: 1, castRank: 2, expended: true }] },
      ],
      focus: { value: 1, max: 2 },
    },
  );
  const actor = baseCharacter("Wizard", {
    resources: { focus: { value: 1, max: 2 } },
    items: [collection.entry as Record<string, unknown>, cantrip, forceBarrage, fear, focus],
  });
  return { ...actor, spellcasting: { collections: new Map([[entryId, collection]]) } };
}

export function createSorcererFixture(): PF2eCharacterFixture {
  const entryId = "sorcerer-arcane";
  const detectMagic = spell("detect-magic", "Detect Magic", 0, "arcane", entryId, { category: "cantrip" });
  const magicMissile = spell("sorcerer-force-barrage", "Force Barrage", 1, "arcane", entryId, { signature: true });
  const fireball = spell("fireball", "Fireball", 3, "arcane", entryId);
  const slots = {
    slot0: { max: 5, value: 5 },
    slot1: { max: 3, value: 2 },
    slot3: { max: 2, value: 1 },
  };
  const collection = spellCollection(
    entryId,
    "Arcane Repertoire",
    "spontaneous",
    "arcane",
    [detectMagic, magicMissile, fireball],
    slots,
    {
      preparation: "spontaneous",
      groups: [
        { rank: 1, slots: { value: 2, max: 3 }, spells: [{ id: "sorcerer-force-barrage", signature: true, castRank: 1 }] },
        { rank: 3, slots: { value: 1, max: 2 }, spells: [{ id: "sorcerer-force-barrage", signature: true, baseRank: 1, castRank: 3 }, { id: "fireball", castRank: 3 }] },
      ],
    },
  );
  const actor = baseCharacter("Sorcerer", {
    items: [collection.entry as Record<string, unknown>, detectMagic, magicMissile, fireball],
  });
  return { ...actor, spellcasting: { collections: new Map([[entryId, collection]]) } };
}

export function createClericFixture(): PF2eCharacterFixture {
  const entryId = "cleric-divine";
  const heal = spell("cleric-heal", "Heal", 3, "divine", entryId);
  const divineLance = spell("divine-lance", "Divine Lance", 0, "divine", entryId, { category: "cantrip" });
  const collection = spellCollection(
    entryId,
    "Divine Prepared Spells",
    "prepared",
    "divine",
    [heal, divineLance],
    { slot0: { max: 1, prepared: [{ id: "divine-lance" }] }, slot3: { max: 2, prepared: [{ id: "cleric-heal" }] } },
    { preparation: "prepared", groups: [{ rank: 3, slots: { value: 2, max: 2 }, spells: [{ id: "cleric-heal" }] }] },
  );
  const actor = baseCharacter("Cleric", {
    resources: { divineFont: { value: 4, max: 4 } },
    items: [collection.entry as Record<string, unknown>, heal, divineLance],
  });
  return { ...actor, spellcasting: { collections: new Map([[entryId, collection]]) } };
}

export function createKineticistFixture(): PF2eCharacterFixture {
  const elementalBlast = action("elemental-blast", "Elemental Blast", ["air", "impulse"]);
  const impulse = action("aerial-boomerang", "Aerial Boomerang", ["air", "impulse"], 2);
  const actor = baseCharacter("Kineticist", {
    actions: [elementalBlast, impulse],
    resources: { kineticAura: { value: 1, max: 1 } },
  });
  return {
    ...actor,
    actions: [elementalBlast, impulse],
    specialActions: [
      { ...elementalBlast, source: { id: "elemental-blast" } },
      { ...impulse, source: { slug: "aerial-boomerang" } },
      action("channel-elements", "Channel Elements", ["kineticist"]),
    ],
  };
}

export function createInventorFixture(): PF2eCharacterFixture {
  return baseCharacter("Inventor", {
    actions: [
      strike("innovation-strike", "Weapon Innovation", "2d6+4", ["inventor", "modular"]),
      action("overdrive", "Overdrive", ["inventor"]),
      action("explode", "Explode", ["fire", "unstable"], 2),
    ],
    resources: { unstable: { value: 1, max: 1 } },
  });
}

export function createThaumaturgeFixture(): PF2eCharacterFixture {
  return baseCharacter("Thaumaturge", {
    actions: [
      strike("implement-strike", "Implement Strike", "2d6+4", ["thaumaturge"]),
      action("exploit-vulnerability", "Exploit Vulnerability", ["esoterica"]),
    ],
    resources: { intensifyVulnerability: { value: 1, max: 1 } },
  });
}

export function createAlchemistFixture(): PF2eCharacterFixture {
  const formulas = [
    { uuid: "Compendium.pf2e.equipment-srd.Item.minor-elixir-of-life", name: "Minor Elixir of Life", quantity: 1 },
    { uuid: "Compendium.pf2e.equipment-srd.Item.lesser-alchemists-fire", name: "Lesser Alchemist's Fire", quantity: 1 },
  ];
  const prepared = [
    { ...formulas[0], quantity: 2, expended: false },
    { ...formulas[1], quantity: 1, expended: true, signature: true },
  ];
  const advancedAlchemy = {
    slug: "advanced-alchemy",
    label: "Advanced Alchemy",
    isPrepared: true,
    isDailyPrep: true,
    isAlchemical: true,
    maxSlots: 6,
    maxItemLevel: 7,
    resource: "infusedReagents",
    prepared,
    getSheetData: async (options: Record<string, unknown>) => ({
      dailyPrep: true,
      alchemical: true,
      resource: { slug: "infusedReagents", value: 5, max: 7 },
      batchSize: 2,
      maxItemLevel: 7,
      prepared,
      options,
    }),
  };
  const actor = baseCharacter("Alchemist", {
    resources: { infusedReagents: { value: 5, max: 7 } },
    actions: [action("quick-alchemy", "Quick Alchemy", ["additive", "manipulate"])],
  });
  return {
    ...actor,
    crafting: {
      formulas,
      getFormulas: async () => new Set(formulas),
      abilities: new Map([["advanced-alchemy", advancedAlchemy]]),
    },
    system: {
      ...(actor.system as Record<string, unknown>),
      crafting: {
        formulas,
        entries: { "advanced-alchemy": advancedAlchemy },
      },
    },
  };
}

export function createMonkFixture(): PF2eCharacterFixture {
  return baseCharacter("Monk", {
    actions: [
      strike("monk-fist", "Fist", "2d8+4", ["agile", "finesse", "unarmed"]),
      action("flurry-of-blows", "Flurry of Blows", ["flourish", "monk"]),
      action("stunning-fist", "Stunning Fist", ["incapacitation", "monk"]),
    ],
    resources: { focus: { value: 1, max: 1 } },
  });
}

export const PF2E_CHARACTER_FIXTURE_FACTORIES: Record<
  HarnessCharacterClass,
  () => PF2eCharacterFixture
> = {
  Fighter: createFighterFixture,
  Wizard: createWizardFixture,
  Sorcerer: createSorcererFixture,
  Cleric: createClericFixture,
  Kineticist: createKineticistFixture,
  Inventor: createInventorFixture,
  Thaumaturge: createThaumaturgeFixture,
  Alchemist: createAlchemistFixture,
  Monk: createMonkFixture,
};

export function createPF2eCharacterFixtures(): Record<HarnessCharacterClass, PF2eCharacterFixture> {
  return Object.fromEntries(
    Object.entries(PF2E_CHARACTER_FIXTURE_FACTORIES).map(([className, factory]) => [className, factory()]),
  ) as Record<HarnessCharacterClass, PF2eCharacterFixture>;
}
