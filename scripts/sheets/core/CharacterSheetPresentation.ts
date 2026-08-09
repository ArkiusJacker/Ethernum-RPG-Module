import { ETHERNUM } from "../../config.js";
import type { CharacterSheetPermissions } from "./CharacterSheetController.js";

type Data = Record<string, unknown>;

function record(value: unknown): Data {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function number(value: unknown, fallback = 0): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function localize(key: string, fallback = key): string {
  const value = game.i18n?.localize(key);
  return value && value !== key ? value : fallback;
}

function percent(value: number, max: number): number {
  return max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
}

function viewIdentity(value: unknown): Data {
  const identity = record(value);
  return {
    ...identity,
    img: identity.image,
    ancestry: identity.ancestryName,
    heritage: identity.heritageName,
    background: identity.backgroundName,
  };
}

function viewVitals(value: unknown): Data {
  const vitals = record(value);
  const hp = record(vitals.hp);
  const current = number(hp.current);
  const max = number(hp.max);
  const heroPoints = record(vitals.heroPoints);
  return {
    ...vitals,
    hp: { ...hp, value: current, max, percentage: percent(current, max) },
    heroPoints: { ...heroPoints, value: number(heroPoints.current), max: number(heroPoints.max, 3) },
  };
}

function viewDefenses(value: unknown): Data {
  const defenses = record(value);
  return {
    ...defenses,
    ac: { value: number(defenses.ac) },
    immunities: list(defenses.immunities),
    resistances: list(defenses.resistances),
    weaknesses: list(defenses.weaknesses),
  };
}

function viewResources(value: unknown): Data[] {
  const resources = record(value);
  const result: Data[] = [];
  const add = (label: string, resourceValue: unknown) => {
    const resource = record(resourceValue);
    if (Object.keys(resource).length === 0) return;
    result.push({ label, value: number(resource.current), max: number(resource.max) });
  };
  add(localize("ETHERNUM.CharacterSheet.Overview.HeroPoints", "Hero Points"), resources.heroPoints);
  add(localize("ETHERNUM.CharacterSheet.Overview.FocusPoints", "Focus Points"), resources.focusPoints);
  add(localize("ETHERNUM.CharacterSheet.Overview.MythicPoints", "Mythic Points"), resources.mythicPoints);
  Object.entries(record(resources.classResources)).forEach(([slug, resource]) => add(slug, resource));
  return result;
}

function viewAbilities(value: unknown): Data[] {
  return list(value).map(abilityValue => {
    const ability = record(abilityValue);
    const slug = String(ability.slug ?? "").toLowerCase();
    const key = slug ? `ETHERNUM.CharacterSheet.Abilities.${slug}` : "";
    return { ...ability, label: key ? localize(key, String(ability.label ?? slug.toUpperCase())) : ability.label };
  });
}

function viewStrikes(value: unknown): Data[] {
  return list(value).map(strikeValue => {
    const strike = record(strikeValue);
    const map = record(strike.map);
    return {
      ...strike,
      itemId: strike.itemId,
      name: strike.label,
      img: strike.image ?? "icons/svg/sword.svg",
      modifier: number(strike.attackModifier),
      attackVariants: [map.first, map.second, map.third].map((modifier, index) => ({
        index,
        label: `${number(modifier) >= 0 ? "+" : ""}${number(modifier)}`,
      })),
    };
  });
}

function viewActions(value: unknown): Data[] {
  return list(value).map(actionValue => {
    const action = record(actionValue);
    const actions = number(action.actions, -1);
    return {
      ...action,
      itemId: action.itemId,
      name: action.label,
      img: action.image ?? "icons/svg/book.svg",
      actionGlyph: actions > 0 ? String(actions) : action.actionType === "reaction" ? "R" : "",
      actionLabel: action.actionType,
    };
  });
}

function viewInventory(value: unknown): Data {
  const inventory = record(value);
  const bulk = record(inventory.bulk);
  const labels: Record<string, string> = {
    weapons: localize("ETHERNUM.CharacterSheet.Inventory.Categories.Weapons", "Armas"),
    armor: localize("ETHERNUM.CharacterSheet.Inventory.Categories.Armor", "Armaduras"),
    shields: localize("ETHERNUM.CharacterSheet.Inventory.Categories.Shields", "Escudos"),
    consumables: localize("ETHERNUM.CharacterSheet.Inventory.Categories.Consumables", "Consumíveis"),
    equipment: localize("ETHERNUM.CharacterSheet.Inventory.Categories.Equipment", "Equipamento"),
    treasure: localize("ETHERNUM.CharacterSheet.Inventory.Categories.Treasure", "Tesouros"),
    containers: localize("ETHERNUM.CharacterSheet.Inventory.Categories.Containers", "Recipientes"),
    other: localize("ETHERNUM.CharacterSheet.Inventory.Categories.Other", "Outros"),
  };
  const categories = Object.entries(labels).map(([id, label]) => ({
    id,
    label,
    collapsed: false,
    items: list(inventory[id]).map(itemValue => {
      const item = record(itemValue);
      const type = String(item.type ?? "").toLowerCase();
      const carryType = String(item.carryType ?? "");
      const hands = String(item.hands ?? "");
      const heldValue = `held:${number(item.handsHeld, hands === "2" ? 2 : 1)}`;
      const carryOptions: Data[] = [];
      const addCarryOption = (value: string, label: string) => carryOptions.push({
        value,
        label,
        selected: value === (carryType === "held" ? heldValue : carryType),
      });
      if (type === "weapon") {
        if (hands !== "2") addCarryOption("held:1", localize("ETHERNUM.CharacterSheet.Inventory.HoldOne", "Segurar - 1 mão"));
        if (["1+", "2"].includes(hands)) addCarryOption("held:2", localize("ETHERNUM.CharacterSheet.Inventory.HoldTwo", "Segurar - 2 mãos"));
        addCarryOption("stowed", localize("ETHERNUM.CharacterSheet.Inventory.Stow", "Guardar"));
        addCarryOption("dropped", localize("ETHERNUM.CharacterSheet.Inventory.Drop", "Soltar"));
      } else if (type === "shield" || id === "shields") {
        addCarryOption("held:1", localize("ETHERNUM.CharacterSheet.Inventory.HoldOne", "Segurar - 1 mão"));
        addCarryOption("stowed", localize("ETHERNUM.CharacterSheet.Inventory.Stow", "Guardar"));
        addCarryOption("dropped", localize("ETHERNUM.CharacterSheet.Inventory.Drop", "Soltar"));
      } else if (type === "armor") {
        addCarryOption("worn", localize("ETHERNUM.CharacterSheet.Inventory.Wear", "Vestir"));
        addCarryOption("stowed", localize("ETHERNUM.CharacterSheet.Inventory.Stow", "Guardar"));
      } else if (carryType) {
        addCarryOption("worn", localize("ETHERNUM.CharacterSheet.Inventory.Wear", "Vestir"));
        addCarryOption("stowed", localize("ETHERNUM.CharacterSheet.Inventory.Stow", "Guardar"));
        addCarryOption("dropped", localize("ETHERNUM.CharacterSheet.Inventory.Drop", "Soltar"));
      }
      return {
        ...item,
        img: item.image,
        carryOptions,
        canEquip: carryOptions.length > 0,
        canInvest: item.isInvestable === true,
        canUse: item.type === "consumable",
      };
    }),
  }));
  return {
    ...inventory,
    categories,
    bulk: bulk.available === true
      ? bulk
      : { ...bulk, available: false, label: localize("ETHERNUM.CharacterSheet.Inventory.BulkUnavailable", "Bulk indisponível") },
  };
}

function viewSpellcasting(value: unknown): Data {
  const spellcasting = record(value);
  const entries = list(spellcasting.entries).map(entryValue => {
    const entry = record(entryValue);
    const preparedGroups = list(entry.groups).map(groupValue => {
      const group = record(groupValue);
      const rank = number(group.rank);
      return {
        ...group,
        rank,
        label: rank === 0
          ? localize("ETHERNUM.CharacterSheet.Spellcasting.Cantrips", "Truques")
          : localize("ETHERNUM.CharacterSheet.Spellcasting.Rank", "Círculo {rank}").replace("{rank}", String(rank)),
        spells: list(group.spells).map(spellValue => {
          const spell = record(spellValue);
          return { ...spell, img: spell.image, rank: number(spell.rank, rank), castRank: number(spell.castRank, rank) };
        }),
      };
    });
    const grouped = new Map<number, Data[]>();
    if (preparedGroups.length === 0) list(entry.spells).forEach(spellValue => {
      const spell = record(spellValue);
      const rank = number(spell.rank);
      const spells = grouped.get(rank) ?? [];
      spells.push({ ...spell, img: spell.image, castRank: number(spell.castRank, rank) });
      grouped.set(rank, spells);
    });
    return {
      ...entry,
      attack: entry.spellAttack,
      category: entry.preparation,
      groups: preparedGroups.length > 0
        ? preparedGroups
        : [...grouped.entries()].sort(([a], [b]) => a - b).map(([rank, spells]) => ({
          rank,
          label: rank === 0
            ? localize("ETHERNUM.CharacterSheet.Spellcasting.Cantrips", "Truques")
            : localize("ETHERNUM.CharacterSheet.Spellcasting.Rank", "Círculo {rank}").replace("{rank}", String(rank)),
          spells,
        })),
    };
  });
  return { ...spellcasting, entries };
}

function viewEffects(value: unknown): Data {
  const effects: Data[] = list(value).map(effectValue => {
    const effect = record(effectValue);
    return {
      ...effect,
      img: effect.image,
      hasValue: effect.value !== undefined,
      enabled: effect.active !== false,
      durationLabel: effect.duration,
    };
  });
  return {
    conditions: effects.filter(effect => record(effect).kind === "condition"),
    temporary: effects.filter(effect => record(effect).kind === "effect"),
    persistent: effects.filter(effect => record(effect).kind === "persistent-damage"),
  };
}

function viewCombatMomentum(value: unknown): Data {
  const state = record(value);
  const fides = record(state.fides);
  const fulgor = record(state.fulgor);
  const fidesCharges = number(fides.charges);
  const fulgorProgress = number(fulgor.chainCount);
  const fulgorMax = Math.max(1, number(fulgor.maxChain, 1));
  return {
    ...state,
    enabled: true,
    statusLabel: record(state.lastResult).label || (state.combatId
      ? localize("ETHERNUM.CharacterSheet.CombatMomentum.Active", "Combate ativo")
      : localize("ETHERNUM.CharacterSheet.CombatMomentum.Waiting", "Aguardando combate")),
    fides: {
      ...fides,
      max: 3,
      percentage: percent(fidesCharges, 3),
      canUse: fidesCharges > 0 && number(fides.markers) >= 3,
    },
    fulgor: {
      ...fulgor,
      charges: fulgorProgress,
      max: fulgorMax,
      percentage: percent(fulgorProgress, fulgorMax),
      canUse: fulgor.active === true,
    },
  };
}

function viewEthernumSystems(value: unknown): Data {
  const systems = record(value);
  const ether = record(systems.ether);
  const current = number(ether.etherCurrent);
  const max = number(ether.etherMax);
  const fe = record(systems.fe);
  const attributes = Object.entries(record(systems.attributes)).map(([id, entryValue]) => {
    const entry = record(entryValue);
    return { id, label: localize(`ETHERNUM.Attribute.${id}`, id), rankLabel: entry.rank, ...entry };
  });
  const talents = Object.entries(record(systems.talents)).map(([id, entryValue]) => {
    const entry = record(entryValue);
    return {
      id,
      name: localize(`ETHERNUM.Talent.${id}`, id),
      rankLabel: entry.rank,
      canUse: true,
      ...entry,
    };
  });
  const runes = list(systems.runes).map(runeValue => {
    const rune = record(runeValue);
    const runeClass = Math.max(1, Math.min(5, number(rune.runeClass, 1)));
    return {
      ...rune,
      classId: runeClass,
      classLabel: ETHERNUM.RUNE_CLASSES[runeClass as 1 | 2 | 3 | 4 | 5]?.name ?? String(runeClass),
      formula: [rune.verb, rune.noun, rune.source].filter(Boolean).join(" + "),
      cost: rune.costValue,
      icon: "fas fa-gem",
      canUse: rune.active !== false,
      statusLabel: rune.active === false
        ? localize("ETHERNUM.Common.Inactive", "Inativo")
        : localize("ETHERNUM.Common.Active", "Ativo"),
    };
  });
  const runeClasses = Object.entries(ETHERNUM.RUNE_CLASSES).map(([id, config]) => ({
    id,
    label: config.name,
    icon: "fas fa-gem",
    count: runes.filter(rune => String(rune.classId) === id).length,
  }));
  return {
    ...systems,
    ether: {
      ...ether,
      value: current,
      max,
      percentage: percent(current, max),
      stats: [{ label: localize("ETHERNUM.CharacterSheet.EtherPanel.Power", "Poder de Éter"), value: number(ether.etherPower) }],
    },
    fe: { ...fe, value: number(fe.current), total: number(fe.total) },
    attributes,
    talents,
    runes,
    runeClasses,
    runeFormula: { complete: false, verb: {}, noun: {}, source: {} },
  };
}

export function buildCharacterSheetPresentation(
  moduleData: Data,
  permissions: CharacterSheetPermissions,
): Data {
  return {
    ...moduleData,
    identity: viewIdentity(moduleData.identity),
    vitals: viewVitals(moduleData.vitals),
    abilities: viewAbilities(moduleData.abilities),
    defenses: viewDefenses(moduleData.defenses),
    movement: list(record(moduleData.movement).speeds).map(speed => ({ ...record(speed), unit: "ft" })),
    resources: viewResources(moduleData.resources),
    strikes: viewStrikes(moduleData.strikes),
    actions: viewActions(moduleData.actions),
    inventory: viewInventory(moduleData.inventory),
    spellcasting: viewSpellcasting(moduleData.spellcasting),
    feats: list(moduleData.feats).map(featValue => {
      const feat = record(featValue);
      return { ...feat, img: feat.image };
    }),
    effects: viewEffects(moduleData.effects),
    combatMomentum: viewCombatMomentum(moduleData.combatMomentum),
    ethernumSystems: viewEthernumSystems(moduleData.ethernumSystems),
    permissions: {
      ...permissions,
      isGM: permissions.gm,
      canUpdateActor: permissions.editable,
      canUpdateItems: permissions.editable,
      canCreateItems: permissions.editable,
      canConfigureSheet: permissions.canChooseSheet,
      canConfigureUniqueMechanic: permissions.gm,
      canUpdateEthernum: permissions.editable,
      canManageCombatMomentum: permissions.gm,
    },
  };
}
