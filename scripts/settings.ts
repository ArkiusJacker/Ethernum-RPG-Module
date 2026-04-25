import { ETHERNUM, type Rank, type RuneClassKey } from './config.js';

export function registerSettings(): void {
  game.settings!.register(ETHERNUM.MODULE_NAME, "longRestFullRestore", {
    name: "ETHERNUM.Settings.LongRestFullRestore.Name",
    hint: "ETHERNUM.Settings.LongRestFullRestore.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings!.register(ETHERNUM.MODULE_NAME, "showEtherInChat", {
    name: "ETHERNUM.Settings.ShowEtherInChat.Name",
    hint: "ETHERNUM.Settings.ShowEtherInChat.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings!.register(ETHERNUM.MODULE_NAME, "allowOverride", {
    name: "ETHERNUM.Settings.AllowOverride.Name",
    hint: "ETHERNUM.Settings.AllowOverride.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings!.register(ETHERNUM.MODULE_NAME, "runeClassDCs", {
    name: "ETHERNUM.Settings.RuneClassDCs.Name",
    hint: "ETHERNUM.Settings.RuneClassDCs.Hint",
    scope: "world",
    config: false,
    type: Object,
    default: { 1: 15, 2: 20, 3: 30, 4: 40, 5: 50 }
  });

  game.settings!.register(ETHERNUM.MODULE_NAME, "feCostsPerRank", {
    name: "ETHERNUM.Settings.FECostsPerRank.Name",
    hint: "ETHERNUM.Settings.FECostsPerRank.Hint",
    scope: "world",
    config: false,
    type: Object,
    default: { "F": 100, "E": 200, "D": 400, "C": 800, "B": 1600, "A": 3200, "S": 6400, "K": 12800 }
  });

  game.settings!.register(ETHERNUM.MODULE_NAME, "schemaVersion", {
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  console.log("Ethernum RPG Module | Settings registradas");
}

export function getFECostForRank(rank: Rank): number {
  try {
    const customCosts = game.settings!.get(ETHERNUM.MODULE_NAME, "feCostsPerRank") as Record<Rank, number>;
    return customCosts[rank] ?? ETHERNUM.FE_COST_PER_LEVEL[rank] ?? 100;
  } catch {
    return ETHERNUM.FE_COST_PER_LEVEL[rank] ?? 100;
  }
}

export function getRuneClassDC(runeClass: RuneClassKey): number {
  try {
    const customDCs = game.settings!.get(ETHERNUM.MODULE_NAME, "runeClassDCs") as Record<RuneClassKey, number>;
    return customDCs[runeClass] ?? ETHERNUM.RUNE_CLASSES[runeClass]?.defaultDC ?? 15;
  } catch {
    return ETHERNUM.RUNE_CLASSES[runeClass]?.defaultDC ?? 15;
  }
}
