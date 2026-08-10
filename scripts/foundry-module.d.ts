import type { EtherAttribute, CampaignCoreId } from './config.js';
import type { CombatMomentumState } from './table/CombatMomentumSystem.js';
import type { CombatTurnTimerState } from './combat/CombatTurnTimer.js';

/**
 * Augmenta as interfaces globais do foundry-vtt-types com as flags e settings
 * específicas do módulo Ethernum.
 */
declare global {
  // Registra as settings do módulo — necessário para game.settings.register/get/set
  interface SettingConfig {
    "ethernum-rpg-module.longRestFullRestore": boolean;
    "ethernum-rpg-module.showEtherInChat": boolean;
    "ethernum-rpg-module.allowOverride": boolean;
    "ethernum-rpg-module.playersCanChooseCharacterSheet": boolean;
    "ethernum-rpg-module.runeClassDCs": Record<number, number>;
    "ethernum-rpg-module.feCostsPerRank": Record<string, number>;
    "ethernum-rpg-module.defaultRuneCostPerClass": Record<number, number>;
    "ethernum-rpg-module.schemaVersion": number;
    "ethernum-rpg-module.combatTrackerEnabled": boolean;
    "ethernum-rpg-module.combatTrackerOnlyInCombat": boolean;
    "ethernum-rpg-module.combatTrackerDetailedStats": boolean;
    "ethernum-rpg-module.characterSheetAnimations": "full" | "reduced" | "off";
    "ethernum-rpg-module.characterSheetHighContrast": boolean;
    "ethernum-rpg-module.characterSheetVisualReference": "off" | "ethernum";
    "ethernum-rpg-module.characterSheetVisualReferencePath": string;
    "ethernum-rpg-module.characterSheetVisualReferenceOpacity": number;
    "ethernum-rpg-module.characterSheetVisualReferenceScale": number;
    "ethernum-rpg-module.characterSheetVisualReferenceX": number;
    "ethernum-rpg-module.characterSheetVisualReferenceY": number;
    "ethernum-rpg-module.characterSheetVisualReferenceFit": "width" | "height";
    "ethernum-rpg-module.combatAnimations": "full" | "reduced" | "off";
    "ethernum-rpg-module.pippingAnimations": "full" | "reduced" | "off";
    "ethernum-rpg-module.pippingAnimationSpeed": "fast" | "normal" | "cinematic";
    "ethernum-rpg-module.pippingAbilityHoverEffects": "full" | "reduced" | "off";
    "ethernum-rpg-module.pippingHoverCanvasPreview": "off" | "card" | "token";
    "ethernum-rpg-module.combatTimerPreferredDuration": number;
    "ethernum-rpg-module.authorityBridgeQueue": unknown[];
    "ethernum-rpg-module.authorityBridgeAudit": unknown[];
    "ethernum-rpg-module.authorityBridgePolicies": Record<string, unknown>;
    "ethernum-rpg-module.authorityApprovalTimeoutMinutes": "2" | "5" | "10";
    "ethernum-rpg-module.authorityAuditRetention": "100" | "250" | "500" | "1000" | "2000";
    "ethernum-rpg-module.gmControlTheme": "ethernum" | "concordia";
    "ethernum-rpg-module.fieldCommunicatorApps": Record<string, unknown>;
    "ethernum-rpg-module.fieldCommunicatorGroupHistoryLimit": number;
    "ethernum-rpg-module.fieldCommunicatorBoot": "always" | "session" | "off";
    "ethernum-rpg-module.fieldCommunicatorMotion": "full" | "reduced" | "off";
    "ethernum-rpg-module.fieldCommunicatorSounds": boolean;
    "ethernum-rpg-module.fieldCommunicatorTextScale": "normal" | "large";
    "ethernum-rpg-module.fieldCommunicatorBrightness": "low" | "normal" | "high";
    "ethernum-rpg-module.fieldCommunicatorHighContrast": boolean;
    "ethernum-rpg-module.fieldCommunicatorNotifications": "all" | "priority" | "off";
  }

  // Registra as flags do módulo — necessário para actor.getFlag/setFlag
  interface FlagConfig {
    Actor: {
      "ethernum-rpg-module": {
        etherAttributes?: Record<string, EtherAttribute>;
        talents?: Record<string, EtherAttribute>;
        fe?: { current: number; total: number };
        etherSystem?: { etherMax: number; etherCurrent: number; etherPower: number };
        runes?: Array<Record<string, unknown> & { core?: CampaignCoreId }>;
        maxRuneClass?: number;
        uniqueMechanics?: {
          activeCore?: CampaignCoreId;
          activeProfile: string;
          profiles: Record<string, unknown>;
        };
        combatMomentum?: CombatMomentumState;
        characterSheetMode?: "auto" | "ethernum" | "concordia" | "pf2e";
        schemaVersion?: number;
        [key: string]: unknown;
      };
    };
    Combat: {
      "ethernum-rpg-module": {
        combatTurnTimer?: CombatTurnTimerState;
        [key: string]: unknown;
      };
    };
  }
}
