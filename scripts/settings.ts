import { ETHERNUM, type Rank, type RuneClassKey } from './config.js';

type BooleanSettingKey = "longRestFullRestore" | "showEtherInChat" | "allowOverride" | "playersCanChooseCharacterSheet";
type ClientBooleanSettingKey =
  | "combatTrackerEnabled"
  | "combatTrackerOnlyInCombat"
  | "combatTrackerDetailedStats";
export type CombatAnimationMode = "full" | "reduced" | "off";
export type CharacterSheetAnimationMode = CombatAnimationMode;
export type PippingAnimationSpeed = "fast" | "normal" | "cinematic";
export type PippingAbilityHoverMode = "full" | "reduced" | "off";
export type PippingHoverCanvasPreviewMode = "off" | "card" | "token";
export type FieldCommunicatorBootMode = "always" | "session" | "off";
export type FieldCommunicatorMotionMode = "full" | "reduced" | "off";
export type FieldCommunicatorTextScale = "normal" | "large";
export type FieldCommunicatorBrightness = "low" | "normal" | "high";
export type FieldCommunicatorNotificationMode = "all" | "priority" | "off";

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

  game.settings!.register(ETHERNUM.MODULE_NAME, "playersCanChooseCharacterSheet", {
    name: "ETHERNUM.Settings.PlayersCanChooseCharacterSheet.Name",
    hint: "ETHERNUM.Settings.PlayersCanChooseCharacterSheet.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "authorityBridgeQueue", {
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "authorityBridgeAudit", {
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "authorityBridgePolicies", {
    scope: "world",
    config: false,
    type: Object,
    default: { default: "auto", categories: {}, profiles: {}, handlers: {} },
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "authorityApprovalTimeoutMinutes", {
    name: "ETHERNUM.Settings.AuthorityApprovalTimeout.Name",
    hint: "ETHERNUM.Settings.AuthorityApprovalTimeout.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "2": "ETHERNUM.Settings.AuthorityApprovalTimeout.Two",
      "5": "ETHERNUM.Settings.AuthorityApprovalTimeout.Five",
      "10": "ETHERNUM.Settings.AuthorityApprovalTimeout.Ten",
    },
    default: "2",
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "authorityAuditRetention", {
    name: "ETHERNUM.Settings.AuthorityAuditRetention.Name",
    hint: "ETHERNUM.Settings.AuthorityAuditRetention.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "100": "100",
      "250": "250",
      "500": "500",
      "1000": "1000",
      "2000": "2000",
    },
    default: "500",
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "gmControlTheme", {
    scope: "client",
    config: false,
    type: String,
    choices: { ethernum: "Ethernum", concordia: "Concórdia" },
    default: "ethernum",
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "fieldCommunicatorApps", {
    scope: "world",
    config: false,
    type: Object,
    default: { version: 1, apps: [] },
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "fieldCommunicatorGroupHistoryLimit", {
    name: "ETHERNUM.Settings.FieldCommunicatorGroupHistoryLimit.Name",
    hint: "ETHERNUM.Settings.FieldCommunicatorGroupHistoryLimit.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 100,
  });

  const refreshClientUI = () => window.dispatchEvent(new CustomEvent("ethernum-client-settings-changed"));
  const refreshCharacterSheetUI = () => {
    refreshClientUI();
    const windows = (ui as unknown as {
      windows?: Record<string, { options?: { classes?: string[] }; render?: (force?: boolean) => unknown }>;
    }).windows ?? {};
    for (const application of Object.values(windows)) {
      if (!application.options?.classes?.includes("ethernum-character-sheet-window")) continue;
      application.render?.(false);
    }
  };
  const applyPippingHoverMode = (value: unknown) => {
    const mode = value === "reduced" || value === "off" ? value : "full";
    document.documentElement.dataset.ethernumPippingHover = mode;
  };
  const applyCharacterSheetMotionMode = (value: unknown) => {
    const requested = value === "reduced" || value === "off" ? value : "full";
    const mode = requested === "full" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "reduced"
      : requested;
    document.documentElement.dataset.ethernumSheetMotion = mode;
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
  game.settings!.register(ETHERNUM.MODULE_NAME, "fieldCommunicatorBoot", {
    name: "ETHERNUM.Settings.FieldCommunicatorBoot.Name",
    hint: "ETHERNUM.Settings.FieldCommunicatorBoot.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      always: "ETHERNUM.Settings.FieldCommunicatorBoot.Always",
      session: "ETHERNUM.Settings.FieldCommunicatorBoot.Session",
      off: "ETHERNUM.Settings.FieldCommunicatorBoot.Off",
    },
    default: "session",
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "fieldCommunicatorMotion", {
    name: "ETHERNUM.Settings.FieldCommunicatorMotion.Name",
    hint: "ETHERNUM.Settings.FieldCommunicatorMotion.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      full: "ETHERNUM.Settings.FieldCommunicatorMotion.Full",
      reduced: "ETHERNUM.Settings.FieldCommunicatorMotion.Reduced",
      off: "ETHERNUM.Settings.FieldCommunicatorMotion.Off",
    },
    default: "full",
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "fieldCommunicatorSounds", {
    name: "ETHERNUM.Settings.FieldCommunicatorSounds.Name",
    hint: "ETHERNUM.Settings.FieldCommunicatorSounds.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "fieldCommunicatorTextScale", {
    name: "ETHERNUM.Settings.FieldCommunicatorTextScale.Name",
    hint: "ETHERNUM.Settings.FieldCommunicatorTextScale.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      normal: "ETHERNUM.Settings.FieldCommunicatorTextScale.Normal",
      large: "ETHERNUM.Settings.FieldCommunicatorTextScale.Large",
    },
    default: "normal",
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "fieldCommunicatorBrightness", {
    name: "ETHERNUM.Settings.FieldCommunicatorBrightness.Name",
    hint: "ETHERNUM.Settings.FieldCommunicatorBrightness.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      low: "ETHERNUM.Settings.FieldCommunicatorBrightness.Low",
      normal: "ETHERNUM.Settings.FieldCommunicatorBrightness.Normal",
      high: "ETHERNUM.Settings.FieldCommunicatorBrightness.High",
    },
    default: "normal",
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "fieldCommunicatorHighContrast", {
    name: "ETHERNUM.Settings.FieldCommunicatorHighContrast.Name",
    hint: "ETHERNUM.Settings.FieldCommunicatorHighContrast.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: refreshClientUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "fieldCommunicatorNotifications", {
    name: "ETHERNUM.Settings.FieldCommunicatorNotifications.Name",
    hint: "ETHERNUM.Settings.FieldCommunicatorNotifications.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      all: "ETHERNUM.Settings.FieldCommunicatorNotifications.All",
      priority: "ETHERNUM.Settings.FieldCommunicatorNotifications.Priority",
      off: "ETHERNUM.Settings.FieldCommunicatorNotifications.Off",
    },
    default: "all",
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
  game.settings!.register(ETHERNUM.MODULE_NAME, "characterSheetAnimations", {
    name: "ETHERNUM.Settings.CharacterSheetAnimations.Name",
    hint: "ETHERNUM.Settings.CharacterSheetAnimations.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      full: "ETHERNUM.Settings.CharacterSheetAnimations.Full",
      reduced: "ETHERNUM.Settings.CharacterSheetAnimations.Reduced",
      off: "ETHERNUM.Settings.CharacterSheetAnimations.Off",
    },
    default: "full",
    onChange: value => {
      applyCharacterSheetMotionMode(value);
      refreshCharacterSheetUI();
    },
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "characterSheetHighContrast", {
    name: "ETHERNUM.Settings.CharacterSheetHighContrast.Name",
    hint: "ETHERNUM.Settings.CharacterSheetHighContrast.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: refreshCharacterSheetUI,
  });
  game.settings!.register(ETHERNUM.MODULE_NAME, "characterSheetVisualReference", {
    name: "ETHERNUM.Settings.CharacterSheetVisualReference.Name",
    hint: "ETHERNUM.Settings.CharacterSheetVisualReference.Hint",
    scope: "client",
    config: false,
    type: String,
    choices: { off: "Off", ethernum: "Ethernum Reference" },
    default: "off",
    onChange: refreshCharacterSheetUI,
  });
  for (const [key, fallback] of [
    ["characterSheetVisualReferencePath", ""],
    ["characterSheetVisualReferenceOpacity", 0.35],
    ["characterSheetVisualReferenceScale", 1],
    ["characterSheetVisualReferenceX", 0],
    ["characterSheetVisualReferenceY", 0],
    ["characterSheetVisualReferenceFit", "width"],
  ] as const) {
    game.settings!.register(ETHERNUM.MODULE_NAME, key, {
      name: key,
      scope: "client",
      config: false,
      type: typeof fallback === "number" ? Number : String,
      default: fallback,
      onChange: refreshCharacterSheetUI,
    });
  }
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
  applyCharacterSheetMotionMode(getCharacterSheetAnimationMode());

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

export function canPlayersChooseCharacterSheet(): boolean {
  return getBooleanSetting("playersCanChooseCharacterSheet", true);
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

export function getCharacterSheetAnimationMode(): CharacterSheetAnimationMode {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, "characterSheetAnimations");
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

export function getFieldCommunicatorBootMode(): FieldCommunicatorBootMode {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, "fieldCommunicatorBoot");
    if (value === "always" || value === "off") return value;
  } catch {
    return "session";
  }
  return "session";
}

export function getFieldCommunicatorMotionMode(): FieldCommunicatorMotionMode {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, "fieldCommunicatorMotion");
    if (value === "reduced" || value === "off") return value;
  } catch {
    return "full";
  }
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
}

export function getFieldCommunicatorSoundsEnabled(): boolean {
  try {
    return game.settings!.get(ETHERNUM.MODULE_NAME, "fieldCommunicatorSounds") === true;
  } catch {
    return false;
  }
}

export function getFieldCommunicatorTextScale(): FieldCommunicatorTextScale {
  try {
    return game.settings!.get(ETHERNUM.MODULE_NAME, "fieldCommunicatorTextScale") === "large" ? "large" : "normal";
  } catch {
    return "normal";
  }
}

export function getFieldCommunicatorBrightness(): FieldCommunicatorBrightness {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, "fieldCommunicatorBrightness");
    if (value === "low" || value === "high") return value;
  } catch {
    return "normal";
  }
  return "normal";
}

export function getFieldCommunicatorHighContrast(): boolean {
  try {
    return game.settings!.get(ETHERNUM.MODULE_NAME, "fieldCommunicatorHighContrast") === true;
  } catch {
    return false;
  }
}

export function getFieldCommunicatorNotificationMode(): FieldCommunicatorNotificationMode {
  try {
    const value = game.settings!.get(ETHERNUM.MODULE_NAME, "fieldCommunicatorNotifications");
    if (value === "priority" || value === "off") return value;
  } catch {
    return "all";
  }
  return "all";
}
