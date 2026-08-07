import { ETHERNUM, type Rank, type RuneClassKey } from './config.js';

type BooleanSettingKey = "longRestFullRestore" | "showEtherInChat" | "allowOverride";
type ClientBooleanSettingKey =
  | "combatTrackerEnabled"
  | "combatTrackerOnlyInCombat"
  | "combatTrackerDetailedStats";
export type CombatAnimationMode = "full" | "reduced" | "off";
export type PippingAnimationSpeed = "fast" | "normal" | "cinematic";
export type PippingAbilityHoverMode = "full" | "reduced" | "off";
export type PippingHoverCanvasPreviewMode = "off" | "card" | "token";

function getBooleanSetting(key: BooleanSettingKey, fallback: boolean): boolean {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, key) as boolean | undefined;
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function registerSettings(): void {
  game.settings!.register(ETHERNUM.MODULE_NAME, "defaultRuneCostPerClass", {
    name: "ETHERNUM.Settings.DefaultRuneCostPerClass.Name",
    hint: "ETHERNUM.Settings.DefaultRuneCostPerClass.Hint",
    scope: "world",
    config: false,
    type: Object,
    default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
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

  const refreshClientUI = () => window.dispatchEvent(new CustomEvent("ethernum-client-settings-changed"));
  const applyPippingHoverMode = (value: unknown) => {
    const mode = value === "reduced" || value === "off" ? value : "full";
    document.documentElement.dataset.ethernumPippingHover = mode;
  };
  game.settings!.register(ETHERNUM.MODULE_NAME, "combatTrackerEnabled", {
    name: "ETHERNUM.Settings.CombatTrackerEnabled.Name",
    hint: "ETHERNUM.Settings.CombatTrackerEnabled.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "combatTrackerOnlyInCombat", {
    name: "ETHERNUM.Settings.CombatTrackerOnlyInCombat.Name",
    hint: "ETHERNUM.Settings.CombatTrackerOnlyInCombat.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "combatTrackerDetailedStats", {
    name: "ETHERNUM.Settings.CombatTrackerDetailedStats.Name",
    hint: "ETHERNUM.Settings.CombatTrackerDetailedStats.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "combatAnimations", {
    name: "ETHERNUM.Settings.CombatAnimations.Name",
    hint: "ETHERNUM.Settings.CombatAnimations.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      full: "ETHERNUM.Settings.CombatAnimations.Full",
      reduced: "ETHERNUM.Settings.CombatAnimations.Reduced",
      off: "ETHERNUM.Settings.CombatAnimations.Off",
    },
    default: "full",
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "pippingAnimations", {
    name: "ETHERNUM.Settings.PippingAnimations.Name",
    hint: "ETHERNUM.Settings.PippingAnimations.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      full: "ETHERNUM.Settings.PippingAnimations.Full",
      reduced: "ETHERNUM.Settings.PippingAnimations.Reduced",
      off: "ETHERNUM.Settings.PippingAnimations.Off",
    },
    default: "full",
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "pippingAnimationSpeed", {
    name: "ETHERNUM.Settings.PippingAnimationSpeed.Name",
    hint: "ETHERNUM.Settings.PippingAnimationSpeed.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      fast: "ETHERNUM.Settings.PippingAnimationSpeed.Fast",
      normal: "ETHERNUM.Settings.PippingAnimationSpeed.Normal",
      cinematic: "ETHERNUM.Settings.PippingAnimationSpeed.Cinematic",
    },
    default: "normal",
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "pippingAbilityHoverEffects", {
    name: "ETHERNUM.Settings.PippingAbilityHoverEffects.Name",
    hint: "ETHERNUM.Settings.PippingAbilityHoverEffects.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      full: "ETHERNUM.Settings.PippingAbilityHoverEffects.Full",
      reduced: "ETHERNUM.Settings.PippingAbilityHoverEffects.Reduced",
      off: "ETHERNUM.Settings.PippingAbilityHoverEffects.Off",
    },
    default: "full",
    onChange: value => {
      applyPippingHoverMode(value);
      refreshClientUI();
    },
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "pippingHoverCanvasPreview", {
    name: "ETHERNUM.Settings.PippingHoverCanvasPreview.Name",
    hint: "ETHERNUM.Settings.PippingHoverCanvasPreview.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      off: "ETHERNUM.Settings.PippingHoverCanvasPreview.Off",
      card: "ETHERNUM.Settings.PippingHoverCanvasPreview.Card",
      token: "ETHERNUM.Settings.PippingHoverCanvasPreview.Token",
    },
    default: "card",
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "combatTimerPreferredDuration", {
    scope: "client",
    config: false,
    type: Number,
    default: 60,
  });
  applyPippingHoverMode(getPippingAbilityHoverMode());

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

export function getDefaultRuneCost(runeClass: RuneClassKey): number {
  try {
    const costs = game.settings!.get(ETHERNUM.MODULE_NAME, "defaultRuneCostPerClass") as Record<number, number>;
    return costs[runeClass] ?? 0;
  } catch {
    return 0;
  }
}

export function isLongRestFullRestoreEnabled(): boolean {
  return getBooleanSetting("longRestFullRestore", true);
}

export function shouldShowEtherInChat(): boolean {
  return getBooleanSetting("showEtherInChat", true);
}

export function isOverrideAllowed(): boolean {
  return getBooleanSetting("allowOverride", true);
}

function getClientBooleanSetting(key: ClientBooleanSettingKey, fallback: boolean): boolean {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, key);
    return typeof value === "boolean" ? value : fallback;
  } catch {
    return fallback;
  }
}

export function isCombatTrackerEnabled(): boolean {
  return getClientBooleanSetting("combatTrackerEnabled", true);
}

export function isCombatTrackerOnlyInCombat(): boolean {
  return getClientBooleanSetting("combatTrackerOnlyInCombat", false);
}

export function shouldShowCombatTrackerStats(): boolean {
  return getClientBooleanSetting("combatTrackerDetailedStats", true);
}

export function getCombatAnimationMode(): CombatAnimationMode {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, "combatAnimations");
    if (value === "reduced" || value === "off") return value;
  } catch {
    return "full";
  }
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
}

export function getPippingAnimationMode(): CombatAnimationMode {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, "pippingAnimations");
    if (value === "reduced" || value === "off") return value;
  } catch {
    return "full";
  }
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
}

export function getPippingAnimationSpeed(): PippingAnimationSpeed {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, "pippingAnimationSpeed");
    if (value === "fast" || value === "cinematic") return value;
  } catch {
    return "normal";
  }
  return "normal";
}

export function getPippingAbilityHoverMode(): PippingAbilityHoverMode {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, "pippingAbilityHoverEffects");
    if (value === "reduced" || value === "off") return value;
  } catch {
    return "full";
  }
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
}

export function getPippingHoverCanvasPreviewMode(): PippingHoverCanvasPreviewMode {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, "pippingHoverCanvasPreview");
    if (value === "off" || value === "token") return value;
  } catch {
    return "card";
  }
  return "card";
}
