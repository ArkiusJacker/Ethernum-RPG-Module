import { ETHERNUM, type Rank } from './config.js';
import { registerSettings, getFECostForRank } from './settings.js';
import { EtherSystem } from './systems.js';
import { EtherTabManager } from './ui/EtherTabManager.js';
import { UniqueMechanicsHud } from './ui/UniqueMechanicsHud.js';
import { GYRO_SPINBALL_ASSET, UniqueMechanicsSystem, type GyroExecutionMode, type UniqueMechanicProfileId } from './unique/UniqueMechanics.js';
import { migrateWorld } from './utils/DataMigration.js';

const GYRO_TECHNIQUES_MACRO_NAME = "Ethernum - Gyro: Técnicas";
const GYRO_TECHNIQUES_MACRO_COMMAND = "await game.ethernum.macros.showGyroTechniques();";

type EthernumMacroDocument = {
  name?: string;
  command?: string;
  img?: string;
  update: (data: Record<string, unknown>, operation?: Record<string, unknown>) => Promise<unknown>;
};

declare global {
  interface Game {
    ethernum?: {
      ETHERNUM: typeof ETHERNUM;
      unique: typeof UniqueMechanicsSystem;
      macros: {
        getActor: () => Actor | null;
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
      };
    };
  }
}

function resolveMacroActor(actor?: Actor | null): Actor | null {
  return actor ?? UniqueMechanicsSystem.getControlledActor();
}

function buildMacroApi() {
  return {
    getActor: () => UniqueMechanicsSystem.getControlledActor(),
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
  };
}

async function ensureManagedMacros(): Promise<void> {
  if (!game.user?.isGM) return;
  const macros = game.macros as unknown as {
    find?: (predicate: (macro: EthernumMacroDocument) => boolean) => EthernumMacroDocument | undefined;
    getName?: (name: string) => EthernumMacroDocument | undefined;
  };
  const existing = macros.getName?.(GYRO_TECHNIQUES_MACRO_NAME)
    ?? macros.find?.(macro => macro.name === GYRO_TECHNIQUES_MACRO_NAME);
  const ownerPermission = (globalThis as {
    CONST?: { DOCUMENT_OWNERSHIP_LEVELS?: { OWNER?: number } };
  }).CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  const data = {
    name: GYRO_TECHNIQUES_MACRO_NAME,
    type: "script",
    img: GYRO_SPINBALL_ASSET,
    command: GYRO_TECHNIQUES_MACRO_COMMAND,
    ownership: { default: ownerPermission },
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        managedMacro: "gyro-techniques",
      },
    },
  };

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (existing.command !== GYRO_TECHNIQUES_MACRO_COMMAND) updates.command = GYRO_TECHNIQUES_MACRO_COMMAND;
    if (existing.img !== GYRO_SPINBALL_ASSET) updates.img = GYRO_SPINBALL_ASSET;
    updates.ownership = { default: ownerPermission };
    if (Object.keys(updates).length > 0) await existing.update(updates, { render: false });
    return;
  }

  const MacroClass = (globalThis as { Macro?: { create?: (data: Record<string, unknown>, operation?: Record<string, unknown>) => Promise<unknown> } }).Macro;
  await MacroClass?.create?.(data, { render: false });
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
    updates[`flags.${m}.uniqueMechanics`] = { activeProfile: "", profiles: {} };

  if (Object.keys(updates).length > 0) await actor.update(updates);
}

function renderEthernumTabs(app: Application & { actor?: Actor }, html: JQuery<HTMLElement> | HTMLElement): void {
  const $html = html instanceof HTMLElement ? $(html) : html;
  void EtherTabManager.render(app, $html);
}

Hooks.on("renderCharacterSheetPF2e", (app: Application & { actor?: Actor }, html: JQuery<HTMLElement>) => renderEthernumTabs(app, html));
Hooks.on("renderApplicationV2", (app: Application & { actor?: Actor }, element: HTMLElement) => renderEthernumTabs(app, element));
Hooks.on("createActor", (actor: Actor) => initializeActorFlags(actor));

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
  await ensureManagedMacros();
  UniqueMechanicsHud.initialize();

  if (game.user?.isGM) {
    (game.actors ?? []).filter((a: Actor) => (a.type as string) === "character").forEach((a: Actor) => initializeActorFlags(a));
  }

  if (game.system?.id !== "pf2e") {
    ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Warnings.NotPF2E"));
  }
});
