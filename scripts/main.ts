import { ETHERNUM, type Rank } from './config.js';
import { registerSettings, getFECostForRank } from './settings.js';
import { EtherSystem } from './systems.js';
import { EtherTabManager } from './ui/EtherTabManager.js';
import { migrateWorld } from './utils/DataMigration.js';

declare global {
  interface Game {
    ethernum?: { ETHERNUM: typeof ETHERNUM };
  }
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

  if (Object.keys(updates).length > 0) await actor.update(updates);
}

Hooks.on("renderCharacterSheetPF2e", (app: Application, html: JQuery) => EtherTabManager.render(app, html));
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
  ]);

  game.ethernum = { ETHERNUM };
});

Hooks.once("ready", async () => {
  console.log("Ethernum RPG Module | Sistema de Éter pronto!");

  await migrateWorld();

  if (game.user?.isGM) {
    (game.actors ?? []).filter((a: Actor) => (a.type as string) === "character").forEach((a: Actor) => initializeActorFlags(a));
  }

  if (game.system?.id !== "pf2e") {
    ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Warnings.NotPF2E"));
  }
});
