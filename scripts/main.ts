import { ETHERNUM, type Rank, type CampaignCoreId } from './config.js';
import { registerSettings, getFECostForRank } from './settings.js';
import { EtherSystem } from './systems.js';
import { CombatMomentumSystem, createDefaultCombatMomentumState } from './table/CombatMomentumSystem.js';
import { CombatMomentumTracker } from './ui/CombatMomentumTracker.js';
import { EtherTabManager } from './ui/EtherTabManager.js';
import { UniqueMechanicsHud } from './ui/UniqueMechanicsHud.js';
import { ARKIUS_ICON_ASSET, GYRO_SPINBALL_ASSET, UniqueMechanicsSystem, type GyroExecutionMode, type UniqueMechanicProfileId } from './unique/UniqueMechanics.js';
import { migrateWorld } from './utils/DataMigration.js';
import { ensureManagedMacros as ensureManagedMacroDefinitions } from './core/ManagedMacroService.js';
import { initializePF2eAdapterSocket } from './core/PF2eAdapter.js';
import { initializePippingCanvasSocket } from './mechanics/pipping/canvas.js';
import { AutomationAuthority } from './core/AutomationAuthority.js';
import { CombatTurnTimer } from './combat/CombatTurnTimer.js';
import { AnimationService } from './core/AnimationService.js';

const GYRO_TECHNIQUES_MACRO_NAME = "Ethernum - Gyro: Técnicas";
const GYRO_TECHNIQUES_MACRO_COMMAND = "await game.ethernum.macros.ethernumCompany.gyro.showTechniques();";
const BAYLE_STATUS_MACRO_NAME = "Ethernum - Bayle: Painel";
const BAYLE_STATUS_MACRO_COMMAND = "await game.ethernum.macros.ethernumCompany.bayle.showStatus();";
const PIPPING_STATUS_MACRO_NAME = "Ethernum - Pipping: Painel";
const PIPPING_STATUS_MACRO_COMMAND = "await game.ethernum.macros.ethernumCompany.pipping.showStatus();";
const PIPPING_MANAGED_MACROS = [
  {
    name: PIPPING_STATUS_MACRO_NAME,
    command: PIPPING_STATUS_MACRO_COMMAND,
    flag: "pipping-status",
    img: "icons/magic/unholy/orb-glowing-purple.webp",
  },
  {
    name: "Ethernum - Pipping: Ativar Noite Viva",
    command: "await game.ethernum.macros.ethernumCompany.pipping.activateLivingNight();",
    flag: "pipping-living-night",
    img: "icons/magic/unholy/barrier-shield-glowing-pink.webp",
  },
  {
    name: "Ethernum - Pipping: Comungar com a Noite",
    command: "await game.ethernum.macros.ethernumCompany.pipping.communeWithNight();",
    flag: "pipping-commune-night",
    img: "icons/magic/time/hourglass-brown-purple.webp",
  },
  {
    name: "Ethernum - Pipping: Configurar Escuridão",
    command: "await game.ethernum.macros.ethernumCompany.pipping.configureDarkness();",
    flag: "pipping-configure-darkness",
    img: "icons/magic/unholy/silhouette-robe-evil-power.webp",
  },
];
const YU_MACRO_ICON = "icons/svg/terror.svg";
const COMBAT_MOMENTUM_MANAGED_MACROS = [
  {
    name: "Ethernum - Momentum Fides",
    command: "await game.ethernum.macros.combat.momentumFides();",
    flag: "combat-momentum-fides",
    img: "icons/svg/d20-highlight.svg",
  },
  {
    name: "Ethernum - Fulgor Negro",
    command: "await game.ethernum.macros.combat.fulgorNegro();",
    flag: "combat-fulgor-negro",
    img: "icons/svg/lightning.svg",
  },
];

const ARKIUS_MANAGED_MACROS = [
  {
    name: "Ethernum - Concórdia: Arkius Painel",
    command: "await game.ethernum.macros.concordia.arkius.showStatus();",
    flag: "concordia-arkius-status",
  },
  {
    name: "Ethernum - Arkius: Núcleo em Brasas",
    command: "await game.ethernum.macros.concordia.arkius.toggleNucleoEmBrasas();",
    flag: "arkius-nucleo-em-brasas",
  },
  {
    name: "Ethernum - Arkius: Fluxo",
    command: "await game.ethernum.macros.concordia.arkius.setSintoniaFluxo();",
    flag: "arkius-sintonia-fluxo",
  },
  {
    name: "Ethernum - Arkius: Brasas",
    command: "await game.ethernum.macros.concordia.arkius.setSintoniaBrasas();",
    flag: "arkius-sintonia-brasas",
  },
  {
    name: "Ethernum - Arkius: Exaurir o Sol",
    command: "await game.ethernum.macros.concordia.arkius.exaurirOSol();",
    flag: "arkius-exaurir-o-sol",
  },
  {
    name: "Ethernum - Arkius: Aura Cinética",
    command: "await game.ethernum.macros.concordia.arkius.toggleKineticAura();",
    flag: "arkius-kinetic-aura",
  },
  {
    name: "Ethernum - Arkius: Thermal Nimbus",
    command: "await game.ethernum.macros.concordia.arkius.toggleThermalNimbus();",
    flag: "arkius-thermal-nimbus",
  },
  {
    name: "Ethernum - Arkius: Resiliência Reativa",
    command: "await game.ethernum.macros.concordia.arkius.resilienciaReativa();",
    flag: "arkius-resiliencia-reativa",
  },
  {
    name: "Ethernum - Arkius: Descanso Curto",
    command: "await game.ethernum.macros.concordia.arkius.shortRestReset();",
    flag: "arkius-short-rest",
  },
  {
    name: "Ethernum - Arkius: Descanso Longo",
    command: "await game.ethernum.macros.concordia.arkius.longRestReset();",
    flag: "arkius-long-rest",
  },
];

const YU_MANAGED_MACROS = [
  {
    name: "Ethernum - Yu: Painel",
    command: "await game.ethernum.macros.concordia.yu.showStatus();",
    flag: "concordia-yu-status",
  },
  {
    name: "Ethernum - Yu: Rage in the Flesh",
    command: "await game.ethernum.macros.concordia.yu.toggleRage();",
    flag: "yu-rage-in-the-flesh",
  },
  {
    name: "Ethernum - Yu: Flurry of Blows",
    command: "await game.ethernum.macros.concordia.yu.flurryOfBlows();",
    flag: "yu-flurry-of-blows",
  },
  {
    name: "Ethernum - Yu: Sobrecarga de Medo",
    command: "await game.ethernum.macros.concordia.yu.flurryFear();",
    flag: "yu-flurry-fear",
  },
  {
    name: "Ethernum - Yu: Stunning Fist +2d10",
    command: "await game.ethernum.macros.concordia.yu.stunningFistDamage();",
    flag: "yu-stunning-fist-damage",
  },
];

const CHARLES_MANAGED_MACROS = [
  {
    name: "Ethernum - Charles: Painel",
    command: "await game.ethernum.macros.concordia.charles.showStatus();",
    flag: "concordia-charles-status",
  },
  {
    name: "Ethernum - Charles: Escalada de Impulso",
    command: "await game.ethernum.macros.concordia.charles.impulseClimb();",
    flag: "charles-impulse-climb",
  },
  {
    name: "Ethernum - Charles: Disparo de Contenção",
    command: "await game.ethernum.macros.concordia.charles.containmentShot();",
    flag: "charles-containment-shot",
  },
  {
    name: "Ethernum - Charles: Puxão Vetorial",
    command: "await game.ethernum.macros.concordia.charles.vectorPull();",
    flag: "charles-vector-pull",
  },
  {
    name: "Ethernum - Charles: Rede de Amortecimento",
    command: "await game.ethernum.macros.concordia.charles.cushioningNet();",
    flag: "charles-cushioning-net",
  },
  {
    name: "Ethernum - Charles: Craft da Imaginação",
    command: "await game.ethernum.macros.concordia.charles.craftImagination();",
    flag: "charles-craft-imagination",
  },
];

const ATLAS_MANAGED_MACROS = [
  {
    name: "Ethernum - Atlas: Painel",
    command: "await game.ethernum.macros.concordia.atlas.showStatus();",
    flag: "concordia-atlas-status",
  },
  {
    name: "Ethernum - Atlas: Olhar do Divino",
    command: "await game.ethernum.macros.concordia.atlas.olharDoDivino();",
    flag: "atlas-olhar-do-divino",
  },
  {
    name: "Ethernum - Atlas: Concluir Olhar",
    command: "await game.ethernum.macros.concordia.atlas.completeDivineGaze();",
    flag: "atlas-complete-divine-gaze",
  },
];

declare global {
  interface Game {
    ethernum?: {
      ETHERNUM: typeof ETHERNUM;
      unique: typeof UniqueMechanicsSystem;
      macros: {
        getActor: () => Actor | null;
        setActiveCore: (coreId: CampaignCoreId, actor?: Actor | null) => Promise<void>;
        setUniqueProfile: (profileId: UniqueMechanicProfileId, actor?: Actor | null) => Promise<void>;
        showGyroStatus: (actor?: Actor | null) => Promise<void>;
        gainGyroSP: (amount?: number, actor?: Actor | null, reason?: string) => Promise<unknown>;
        spendGyroSP: (amount?: number, actor?: Actor | null, reason?: string) => Promise<unknown>;
        setGyroSP: (value: number, actor?: Actor | null) => Promise<unknown>;
        startGyroCombat: (actor?: Actor | null) => Promise<unknown>;
        rollGyroControl: (mode?: GyroExecutionMode, actor?: Actor | null) => Promise<Roll | null>;
        rollGyroDeviation: (actor?: Actor | null) => Promise<Roll | null>;
        clearGyroDeviation: (actor?: Actor | null) => Promise<void>;
        playGyroAnimation: (actor?: Actor | null) => Promise<boolean>;
        showGyroTechniques: (actor?: Actor | null) => Promise<void>;
        useGyroTechnique: (techniqueId: string, mode?: GyroExecutionMode, actor?: Actor | null) => Promise<void>;
        showBayleStatus: (actor?: Actor | null) => Promise<void>;
        adjustBayleArdor: (amount?: number, actor?: Actor | null) => Promise<unknown>;
        setBayleStage: (stage?: number, actor?: Actor | null) => Promise<unknown>;
        toggleBayleRage: (actor?: Actor | null) => Promise<unknown>;
        toggleBayleAwakening: (actor?: Actor | null) => Promise<unknown>;
        useBayleAction: (actionId: string, actor?: Actor | null) => Promise<void>;
        showPippingStatus: (actor?: Actor | null) => Promise<void>;
        adjustPippingPulse: (amount?: number, actor?: Actor | null) => Promise<unknown>;
        momentumFides: (actor?: Actor | null) => Promise<void>;
        fulgorNegro: (actor?: Actor | null) => Promise<void>;
        combat: {
          momentumFides: (actor?: Actor | null) => Promise<void>;
          fulgorNegro: (actor?: Actor | null) => Promise<void>;
        };
        ethernumCompany: {
          gyro: {
            showStatus: (actor?: Actor | null) => Promise<void>;
            showTechniques: (actor?: Actor | null) => Promise<void>;
            gainSP: (amount?: number, actor?: Actor | null, reason?: string) => Promise<unknown>;
          };
          bayle: {
            showStatus: (actor?: Actor | null) => Promise<void>;
            adjustArdor: (amount?: number, actor?: Actor | null) => Promise<unknown>;
            toggleRage: (actor?: Actor | null) => Promise<unknown>;
            toggleAwakening: (actor?: Actor | null) => Promise<unknown>;
          };
          pipping: {
            showStatus: (actor?: Actor | null) => Promise<void>;
            adjustPulse: (amount?: number, actor?: Actor | null) => Promise<unknown>;
            activateLivingNight: (actor?: Actor | null) => Promise<unknown>;
            endLivingNight: (actor?: Actor | null) => Promise<unknown>;
            useAction: (actionId: string, actor?: Actor | null) => Promise<void>;
            useReaction: (actionId?: string, actor?: Actor | null) => Promise<void>;
            useFinisher: (actionId?: string, actor?: Actor | null) => Promise<void>;
            configureDarkness: (
              mode?: "manual" | "random" | "scatter" | "area",
              actor?: Actor | null,
            ) => Promise<unknown>;
            resolveDarkness: (actor?: Actor | null) => Promise<string | null>;
            communeWithNight: (actor?: Actor | null) => Promise<unknown>;
            dailyPreparations: (actor?: Actor | null) => Promise<unknown>;
          };
        };
        concordia: {
          charles: {
            showStatus: (actor?: Actor | null) => Promise<void>;
            impulseClimb: (actor?: Actor | null) => Promise<void>;
            containmentShot: (actor?: Actor | null) => Promise<void>;
            vectorPull: (actor?: Actor | null) => Promise<void>;
            cushioningNet: (actor?: Actor | null, overloaded?: boolean) => Promise<void>;
            craftImagination: (actor?: Actor | null) => Promise<void>;
            repairDevice: (actor?: Actor | null) => Promise<unknown>;
            shortRestReset: (actor?: Actor | null) => Promise<unknown>;
            longRestReset: (actor?: Actor | null) => Promise<unknown>;
          };
          atlas: {
            showStatus: (actor?: Actor | null) => Promise<void>;
            olharDoDivino: (actor?: Actor | null) => Promise<unknown>;
            activateDivineGaze: (actor?: Actor | null) => Promise<unknown>;
            completeDivineGaze: (actor?: Actor | null) => Promise<unknown>;
            shortRestReset: (actor?: Actor | null) => Promise<unknown>;
            longRestReset: (actor?: Actor | null) => Promise<unknown>;
          };
          arkius: {
            showStatus: (actor?: Actor | null) => Promise<void>;
            toggleNucleoEmBrasas: (actor?: Actor | null) => Promise<unknown>;
            activateNucleoEmBrasas: (actor?: Actor | null) => Promise<unknown>;
            endNucleoEmBrasas: (actor?: Actor | null) => Promise<unknown>;
            setSintoniaFluxo: (actor?: Actor | null) => Promise<unknown>;
            setSintoniaBrasas: (actor?: Actor | null) => Promise<unknown>;
            consumeSintoniaFluxo: (actor?: Actor | null) => Promise<unknown>;
            consumeSintoniaBrasas: (actor?: Actor | null) => Promise<unknown>;
            setSolarArea: (areaId?: "emanation" | "cone" | "line", actor?: Actor | null) => Promise<unknown>;
            setConcordiaAspect: (aspect?: "chains" | "ruby" | "convergence", actor?: Actor | null) => Promise<unknown>;
            toggleKineticAura: (actor?: Actor | null) => Promise<unknown>;
            markPersistentFireProc: (actor?: Actor | null) => Promise<unknown>;
            exaurirOSol: (actor?: Actor | null) => Promise<unknown>;
            resilienciaReativa: (actor?: Actor | null) => Promise<unknown>;
            shortRestReset: (actor?: Actor | null) => Promise<unknown>;
            longRestReset: (actor?: Actor | null) => Promise<unknown>;
            toggleThermalNimbus: (actor?: Actor | null) => Promise<unknown>;
            syncThermalNimbusAura: (actor?: Actor | null) => Promise<unknown>;
            clearThermalNimbusAura: (actor?: Actor | null) => Promise<unknown>;
            toggleGateJunctionFire: (actor?: Actor | null) => Promise<unknown>;
          };
          yu: {
            showStatus: (actor?: Actor | null) => Promise<void>;
            activateRage: (actor?: Actor | null) => Promise<unknown>;
            endRage: (actor?: Actor | null) => Promise<unknown>;
            toggleRage: (actor?: Actor | null) => Promise<unknown>;
            adjustRounds: (amount?: number, actor?: Actor | null) => Promise<unknown>;
            flurryOfBlows: (actor?: Actor | null) => Promise<void>;
            flurryFear: (actor?: Actor | null) => Promise<Roll | null>;
            stunningFistDamage: (actor?: Actor | null) => Promise<Roll | null>;
            shortRestReset: (actor?: Actor | null) => Promise<unknown>;
            longRestReset: (actor?: Actor | null) => Promise<unknown>;
          };
        };
      };
    };
  }
}

function resolveMacroActor(actor?: Actor | null): Actor | null {
  return actor ?? UniqueMechanicsSystem.getControlledActor();
}

function buildMacroApi() {
  const api = {
    getActor: () => UniqueMechanicsSystem.getControlledActor(),
    setActiveCore: async (coreId: CampaignCoreId, actor?: Actor | null) => {
      const target = resolveMacroActor(actor);
      if (!target) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
        return;
      }
      await UniqueMechanicsSystem.setActiveCore(target, coreId);
    },
    setUniqueProfile: async (profileId: UniqueMechanicProfileId, actor?: Actor | null) => {
      const target = resolveMacroActor(actor);
      if (!target) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
        return;
      }
      await UniqueMechanicsSystem.setActiveProfile(target, profileId);
    },
    showGyroStatus: async (actor?: Actor | null) => UniqueMechanicsSystem.showGyroStatus(resolveMacroActor(actor)),
    gainGyroSP: async (amount = 1, actor?: Actor | null, reason = "Macro") =>
      UniqueMechanicsSystem.gainGyroSP(resolveMacroActor(actor), amount, reason),
    spendGyroSP: async (amount = 1, actor?: Actor | null, reason = "Macro") =>
      UniqueMechanicsSystem.spendGyroSP(resolveMacroActor(actor), amount, reason),
    setGyroSP: async (value: number, actor?: Actor | null) => {
      const target = resolveMacroActor(actor);
      if (!target) return ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return UniqueMechanicsSystem.setGyroSP(target, value);
    },
    startGyroCombat: async (actor?: Actor | null) => UniqueMechanicsSystem.startGyroCombat(resolveMacroActor(actor)),
    rollGyroControl: async (mode: GyroExecutionMode = "forced", actor?: Actor | null) =>
      UniqueMechanicsSystem.rollGyroControl(resolveMacroActor(actor), mode),
    rollGyroDeviation: async (actor?: Actor | null) =>
      UniqueMechanicsSystem.rollGyroDeviation(resolveMacroActor(actor)),
    clearGyroDeviation: async (actor?: Actor | null) =>
      UniqueMechanicsSystem.clearGyroDeviation(resolveMacroActor(actor)),
    playGyroAnimation: async (actor?: Actor | null) =>
      UniqueMechanicsSystem.playGyroSpinAnimation(resolveMacroActor(actor), "status"),
    showGyroTechniques: async (actor?: Actor | null) =>
      UniqueMechanicsSystem.showGyroTechniques(resolveMacroActor(actor)),
    useGyroTechnique: async (techniqueId: string, mode: GyroExecutionMode = "stable", actor?: Actor | null) =>
      UniqueMechanicsSystem.useGyroTechnique(resolveMacroActor(actor), techniqueId, mode),
    showBayleStatus: async (actor?: Actor | null) =>
      UniqueMechanicsSystem.showBayleStatus(resolveMacroActor(actor)),
    adjustBayleArdor: async (amount = 1, actor?: Actor | null) =>
      UniqueMechanicsSystem.adjustBayleArdor(resolveMacroActor(actor), amount),
    setBayleStage: async (stage = 1, actor?: Actor | null) =>
      UniqueMechanicsSystem.setBayleStage(resolveMacroActor(actor), stage),
    toggleBayleRage: async (actor?: Actor | null) =>
      UniqueMechanicsSystem.toggleBayleRage(resolveMacroActor(actor)),
    toggleBayleAwakening: async (actor?: Actor | null) =>
      UniqueMechanicsSystem.toggleBayleAwakening(resolveMacroActor(actor)),
    useBayleAction: async (actionId: string, actor?: Actor | null) =>
      UniqueMechanicsSystem.useBayleAction(resolveMacroActor(actor), actionId),
    showPippingStatus: async (actor?: Actor | null) =>
      UniqueMechanicsSystem.showPippingStatus(resolveMacroActor(actor)),
    adjustPippingPulse: async (amount = 1, actor?: Actor | null) =>
      UniqueMechanicsSystem.adjustPippingPulse(resolveMacroActor(actor), amount),
    momentumFides: async (actor?: Actor | null) =>
      CombatMomentumSystem.useMomentumFides(resolveMacroActor(actor)),
    fulgorNegro: async (actor?: Actor | null) =>
      CombatMomentumSystem.useFulgorNegro(resolveMacroActor(actor)),
  };

  return {
    ...api,
    combat: {
      momentumFides: api.momentumFides,
      fulgorNegro: api.fulgorNegro,
    },
    ethernumCompany: {
      gyro: {
        showStatus: api.showGyroStatus,
        showTechniques: api.showGyroTechniques,
        gainSP: api.gainGyroSP,
      },
      bayle: {
        showStatus: api.showBayleStatus,
        adjustArdor: api.adjustBayleArdor,
        toggleRage: api.toggleBayleRage,
        toggleAwakening: api.toggleBayleAwakening,
      },
      pipping: {
        showStatus: api.showPippingStatus,
        adjustPulse: api.adjustPippingPulse,
        activateLivingNight: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.activatePippingLivingNight(resolveMacroActor(actor)),
        endLivingNight: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.endPippingLivingNight(resolveMacroActor(actor)),
        useAction: async (actionId: string, actor?: Actor | null) =>
          UniqueMechanicsSystem.usePippingAction(resolveMacroActor(actor), actionId),
        useReaction: async (actionId = "void-echoes", actor?: Actor | null) =>
          UniqueMechanicsSystem.usePippingReaction(resolveMacroActor(actor), actionId),
        useFinisher: async (actionId = "beyond-form", actor?: Actor | null) =>
          UniqueMechanicsSystem.usePippingFinisher(resolveMacroActor(actor), actionId),
        configureDarkness: async (
          mode?: "manual" | "random" | "scatter" | "area",
          actor?: Actor | null,
        ) => UniqueMechanicsSystem.configurePippingDarkness(resolveMacroActor(actor), mode),
        resolveDarkness: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.resolvePippingDarknessTarget(resolveMacroActor(actor)),
        communeWithNight: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.communePippingWithNight(resolveMacroActor(actor)),
        dailyPreparations: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.pippingDailyPreparations(resolveMacroActor(actor)),
      },
    },
    concordia: {
      charles: {
        showStatus: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.showCharlesStatus(resolveMacroActor(actor)),
        impulseClimb: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.useCharlesImpulseClimb(resolveMacroActor(actor)),
        containmentShot: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.useCharlesContainmentShot(resolveMacroActor(actor)),
        vectorPull: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.useCharlesVectorPull(resolveMacroActor(actor)),
        cushioningNet: async (actor?: Actor | null, overloaded = false) =>
          UniqueMechanicsSystem.deployCharlesCushioningNet(resolveMacroActor(actor), overloaded),
        craftImagination: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.useCharlesCraftImagination(resolveMacroActor(actor)),
        repairDevice: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.repairCharlesDevice(resolveMacroActor(actor)),
        shortRestReset: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.charlesShortRestReset(resolveMacroActor(actor)),
        longRestReset: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.charlesLongRestReset(resolveMacroActor(actor)),
      },
      atlas: {
        showStatus: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.showAtlasStatus(resolveMacroActor(actor)),
        olharDoDivino: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.activateAtlasDivineGaze(resolveMacroActor(actor)),
        activateDivineGaze: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.activateAtlasDivineGaze(resolveMacroActor(actor)),
        completeDivineGaze: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.completeAtlasDivineGaze(resolveMacroActor(actor)),
        shortRestReset: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.atlasShortRestReset(resolveMacroActor(actor)),
        longRestReset: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.atlasLongRestReset(resolveMacroActor(actor)),
      },
      arkius: {
        showStatus: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.showConcordiaArkiusStatus(resolveMacroActor(actor)),
        toggleNucleoEmBrasas: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.toggleNucleoEmBrasas(resolveMacroActor(actor)),
        activateNucleoEmBrasas: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.activateNucleoEmBrasas(resolveMacroActor(actor)),
        endNucleoEmBrasas: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.endNucleoEmBrasas(resolveMacroActor(actor)),
        setSintoniaFluxo: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.setSintoniaFluxo(resolveMacroActor(actor)),
        setSintoniaBrasas: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.setSintoniaBrasas(resolveMacroActor(actor)),
        consumeSintoniaFluxo: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.consumeSintoniaFluxo(resolveMacroActor(actor)),
        consumeSintoniaBrasas: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.consumeSintoniaBrasas(resolveMacroActor(actor)),
        setSolarArea: async (areaId: "emanation" | "cone" | "line" = "emanation", actor?: Actor | null) =>
          UniqueMechanicsSystem.setArkiusSolarArea(resolveMacroActor(actor), areaId),
        setConcordiaAspect: async (aspect: "chains" | "ruby" | "convergence" = "chains", actor?: Actor | null) =>
          UniqueMechanicsSystem.setArkiusConcordiaAspect(resolveMacroActor(actor), aspect),
        toggleKineticAura: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.toggleArkiusKineticAura(resolveMacroActor(actor)),
        markPersistentFireProc: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.markPersistentFireProc(resolveMacroActor(actor)),
        exaurirOSol: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.exaurirOSol(resolveMacroActor(actor)),
        resilienciaReativa: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.resilienciaReativa(resolveMacroActor(actor)),
        shortRestReset: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.shortRestReset(resolveMacroActor(actor)),
        longRestReset: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.longRestReset(resolveMacroActor(actor)),
        toggleThermalNimbus: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.toggleThermalNimbus(resolveMacroActor(actor)),
        syncThermalNimbusAura: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.syncArkiusKineticAuraTemplate(resolveMacroActor(actor)),
        clearThermalNimbusAura: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.clearArkiusKineticAura(resolveMacroActor(actor)),
        toggleGateJunctionFire: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.toggleGateJunctionFire(resolveMacroActor(actor)),
      },
      yu: {
        showStatus: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.showYuStatus(resolveMacroActor(actor)),
        activateRage: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.activateYuRage(resolveMacroActor(actor)),
        endRage: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.endYuRage(resolveMacroActor(actor)),
        toggleRage: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.toggleYuRage(resolveMacroActor(actor)),
        adjustRounds: async (amount = 0, actor?: Actor | null) =>
          UniqueMechanicsSystem.adjustYuRounds(resolveMacroActor(actor), amount),
        flurryOfBlows: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.useYuFlurryOfBlows(resolveMacroActor(actor)),
        flurryFear: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.rollYuFlurryFear(resolveMacroActor(actor)),
        stunningFistDamage: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.rollYuStunningFistDamage(resolveMacroActor(actor)),
        shortRestReset: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.yuShortRestReset(resolveMacroActor(actor)),
        longRestReset: async (actor?: Actor | null) =>
          UniqueMechanicsSystem.yuLongRestReset(resolveMacroActor(actor)),
      },
    },
  };
}

async function ensureManagedMacros(): Promise<void> {
  const definitions = [
    {
      id: "gyro-techniques",
      name: GYRO_TECHNIQUES_MACRO_NAME,
      command: GYRO_TECHNIQUES_MACRO_COMMAND,
      img: GYRO_SPINBALL_ASSET,
    },
    {
      id: "bayle-status",
      name: BAYLE_STATUS_MACRO_NAME,
      command: BAYLE_STATUS_MACRO_COMMAND,
      img: GYRO_SPINBALL_ASSET,
    },
    ...PIPPING_MANAGED_MACROS.map(macro => ({
      id: macro.flag,
      name: macro.name,
      command: macro.command,
      img: macro.img,
    })),
    ...ARKIUS_MANAGED_MACROS.map(macro => ({
      id: macro.flag,
      name: macro.name,
      command: macro.command,
      img: ARKIUS_ICON_ASSET,
    })),
    ...YU_MANAGED_MACROS.map(macro => ({
      id: macro.flag,
      name: macro.name,
      command: macro.command,
      img: YU_MACRO_ICON,
    })),
    ...CHARLES_MANAGED_MACROS.map(macro => ({
      id: macro.flag,
      name: macro.name,
      command: macro.command,
      img: "icons/svg/hammer.svg",
    })),
    ...ATLAS_MANAGED_MACROS.map(macro => ({
      id: macro.flag,
      name: macro.name,
      command: macro.command,
      img: "icons/svg/sword.svg",
    })),
    ...COMBAT_MOMENTUM_MANAGED_MACROS.map(macro => ({
      id: macro.flag,
      name: macro.name,
      command: macro.command,
      img: macro.img,
    })),
  ];
  await ensureManagedMacroDefinitions(definitions);
}

function registerHandlebarsHelpers(): void {
  Handlebars.registerHelper('ethernum-concat', (...args: unknown[]) => {
    args.pop(); // remove Handlebars options object
    return (args as string[]).join('');
  });
  Handlebars.registerHelper('ethernum-eq',       (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper('ethernum-gt',        (a: number, b: number) => a > b);
  Handlebars.registerHelper('ethernum-lte',       (a: number, b: number) => a <= b);
  Handlebars.registerHelper('ethernum-divide',    (a: number, b: number) => b !== 0 ? a / b : 0);
  Handlebars.registerHelper('ethernum-multiply',  (a: number, b: number) => a * b);
  Handlebars.registerHelper('ethernum-rankIndex', (rank: Rank) => ETHERNUM.RANKS.indexOf(rank ?? "F"));
  Handlebars.registerHelper('ethernum-attrRankBonus',   (rank: Rank) => ETHERNUM.ATTRIBUTE_RANK_BONUS[rank ?? "F"] ?? 2);
  Handlebars.registerHelper('ethernum-talentRankBonus', (rank: Rank) => ETHERNUM.TALENT_RANK_BONUS[rank ?? "F"] ?? 3);
  Handlebars.registerHelper('ethernum-ranks',       () => ETHERNUM.RANKS);
  Handlebars.registerHelper('ethernum-runeClasses', () => ETHERNUM.RUNE_CLASSES);
  Handlebars.registerHelper('ethernum-runeTrinity', () => ETHERNUM.RUNE_TRINITY);
  Handlebars.registerHelper('ethernum-verbTier', (verb: string) => {
    const { VERBS } = ETHERNUM.RUNE_TRINITY;
    if (VERBS.tier1.includes(verb)) return 1;
    if (VERBS.tier2.includes(verb)) return 2;
    if (VERBS.tier3.includes(verb)) return 3;
    return 0;
  });
  Handlebars.registerHelper('ethernum-feCost', (rank: Rank) => getFECostForRank(rank));
}

async function initializeActorFlags(actor: Actor): Promise<void> {
  if ((actor.type as string) !== "character") return;

  const updates: Record<string, unknown> = {};
  const ether = new EtherSystem();
  const m = ETHERNUM.MODULE_NAME;

  if (!actor.getFlag(m, "etherAttributes"))
    updates[`flags.${m}.etherAttributes`] = { ...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES };

  if (!actor.getFlag(m, "talents"))
    updates[`flags.${m}.talents`] = { ...ETHERNUM.DEFAULT_TALENTS };

  if (!actor.getFlag(m, "fe"))
    updates[`flags.${m}.fe`] = { ...ETHERNUM.DEFAULT_FE };

  if (actor.getFlag(m, "maxRuneClass") === undefined)
    updates[`flags.${m}.maxRuneClass`] = 1;

  if (!actor.getFlag(m, "etherSystem"))
    updates[`flags.${m}.etherSystem`] = {
      etherMax:     ether.calculateMaxEther(actor),
      etherCurrent: ether.calculateMaxEther(actor),
      etherPower:   ether.calculateEtherPower(actor),
    };

  if (!actor.getFlag(m, "uniqueMechanics"))
    updates[`flags.${m}.uniqueMechanics`] = { activeCore: "ethernum-company", activeProfile: "", profiles: {} };

  if (!actor.getFlag(m, "combatMomentum"))
    updates[`flags.${m}.combatMomentum`] = createDefaultCombatMomentumState();

  if (Object.keys(updates).length > 0) await actor.update(updates);
}

function renderEthernumTabs(app: Application & { actor?: Actor }, html: JQuery<HTMLElement> | HTMLElement): void {
  const $html = html instanceof HTMLElement ? $(html) : html;
  void EtherTabManager.render(app, $html).catch(error => {
    console.error("Ethernum RPG Module | Sheet tab rendering failed", error);
  });
}

Hooks.on("renderCharacterSheetPF2e", (app: Application & { actor?: Actor }, html: JQuery<HTMLElement>) => renderEthernumTabs(app, html));
Hooks.on("renderApplicationV2", (app: Application & { actor?: Actor }, element: HTMLElement) => renderEthernumTabs(app, element));
Hooks.on("createActor", (actor: Actor) => {
  if (!AutomationAuthority.isPrimaryGM()) return;
  void initializeActorFlags(actor).catch(error => {
    console.error("Ethernum RPG Module | Actor initialization failed", actor.name, actor.id, error);
  });
});
Hooks.on("createChatMessage", (message: ChatMessage) => {
  void UniqueMechanicsSystem.handlePF2EChatMessage(message).catch(error => {
    console.error("Ethernum RPG Module | PF2E chat automation failed", error);
  });
  void CombatMomentumSystem.handlePF2EChatMessage(message).catch(error => {
    console.error("Ethernum RPG Module | Combat momentum automation failed", error);
  });
});
Hooks.on("updateCombat", (combat: Combat) => {
  void UniqueMechanicsSystem.handleCombatTurnAdvance(combat).catch(error => {
    console.error("Ethernum RPG Module | Unique mechanic turn update failed", error);
  });
  void CombatMomentumSystem.handleCombatUpdate(combat).catch(error => {
    console.error("Ethernum RPG Module | Combat tracker turn update failed", error);
  });
  void CombatTurnTimer.handleCombatUpdate(combat).catch(error => {
    console.error("Ethernum RPG Module | Combat turn timer update failed", error);
  });
});
Hooks.on("deleteCombat", (combat: Combat) => {
  void CombatMomentumSystem.handleCombatDelete(combat).catch(error => {
    console.error("Ethernum RPG Module | Combat tracker cleanup failed", error);
  });
  CombatTurnTimer.handleCombatDelete(combat);
});
Hooks.on("updateActor", (actor: Actor, changed: Record<string, unknown>) => {
  void UniqueMechanicsSystem.handleYuActorUpdate(actor, changed).catch(error => {
    console.error("Ethernum RPG Module | Yu actor automation failed", error);
  });
  void CombatMomentumSystem.handleActorUpdate(actor, changed).catch(error => {
    console.error("Ethernum RPG Module | Combat tracker actor update failed", error);
  });
});
Hooks.on("updateToken", (tokenDocument: TokenDocument, changed: Record<string, unknown>) => {
  void UniqueMechanicsSystem.handleTokenUpdate(tokenDocument, changed).catch(error => {
    console.error("Ethernum RPG Module | Token movement automation failed", error);
  });
});
Hooks.on("canvasReady", () => {
  void UniqueMechanicsSystem.reconcilePippingCanvasDocuments().catch(error => {
    console.error("Ethernum RPG Module | Pipping canvas reconciliation failed", error);
  });
});
Hooks.on("pf2e.restForTheNight", (actor: Actor) => {
  if (AutomationAuthority.canMutate(actor, true)) {
    void CombatMomentumSystem.dailyReset(actor).catch(error => {
      console.error("Ethernum RPG Module | Combat tracker daily reset failed", error);
    });
    if (UniqueMechanicsSystem.getState(actor).activeProfile === "pipping-night") {
      void UniqueMechanicsSystem.pippingDailyPreparations(actor).catch(error => {
        console.error("Ethernum RPG Module | Pipping daily preparations failed", error);
      });
    }
  }
});

Hooks.once("init", () => {
  console.log(`Ethernum RPG Module | Inicializando Sistema de Éter v${game.modules?.get(ETHERNUM.MODULE_NAME)?.version ?? "?"}`);

  registerHandlebarsHelpers();
  registerSettings();

  const loadTpls = (foundry.applications as Record<string, unknown> & { handlebars?: { loadTemplates?: typeof loadTemplates } })
    ?.handlebars?.loadTemplates ?? loadTemplates;

  loadTpls([
    `${ETHERNUM.TEMPLATE_PATH}ether-attributes-tab.html`,
    `${ETHERNUM.TEMPLATE_PATH}ether-runes-tab.html`,
    `${ETHERNUM.TEMPLATE_PATH}unique-mechanics-tab.html`,
  ]);

  game.ethernum = {
    ETHERNUM,
    unique: UniqueMechanicsSystem,
    macros: buildMacroApi(),
  };
});

Hooks.once("ready", async () => {
  console.log("Ethernum RPG Module | Sistema de Éter pronto!");

  await migrateWorld();
  initializePF2eAdapterSocket();
  initializePippingCanvasSocket();
  await ensureManagedMacros();
  UniqueMechanicsHud.initialize();
  CombatMomentumTracker.initialize();
  AnimationService.initialize();
  if (game.combat) await CombatTurnTimer.handleCombatUpdate(game.combat);

  if (AutomationAuthority.isPrimaryGM()) {
    const actors = (Array.from(game.actors ?? []) as Actor[])
      .filter(actor => (actor.type as string) === "character");
    const results = await Promise.allSettled(actors.map(actor => initializeActorFlags(actor)));
    const failures = results.flatMap((result, index) => result.status === "rejected"
      ? [{ actor: actors[index], reason: result.reason }]
      : []);
    if (failures.length > 0) {
      console.error("Ethernum RPG Module | Actor initialization completed with failures", failures);
      ui.notifications?.warn(game.i18n!.format("ETHERNUM.Initialization.Failed", {
        failed: failures.length,
        total: actors.length,
      }));
    }
  }

  if (game.system?.id !== "pf2e") {
    ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Warnings.NotPF2E"));
  }
});
