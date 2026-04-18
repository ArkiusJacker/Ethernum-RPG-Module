import { ETHERNUM } from './config.js';
import { registerSettings, getFECostForRank } from './settings.js';
import { EtherSystem } from './systems.js';
import { EtherTabManager } from './ui/EtherTabManager.js';
import { migrateWorld } from './utils/DataMigration.js';

function registerHandlebarsHelpers() {
  Handlebars.registerHelper('ethernum-concat', function(...args) {
    args.pop();
    return args.join('');
  });
  Handlebars.registerHelper('ethernum-eq', (a, b) => a === b);
  Handlebars.registerHelper('ethernum-gt', (a, b) => a > b);
  Handlebars.registerHelper('ethernum-lte', (a, b) => a <= b);
  Handlebars.registerHelper('ethernum-divide', (a, b) => (b !== 0 ? a / b : 0));
  Handlebars.registerHelper('ethernum-multiply', (a, b) => a * b);
  Handlebars.registerHelper('ethernum-rankIndex', (rank) => ETHERNUM.RANKS.indexOf(rank || "F"));
  Handlebars.registerHelper('ethernum-attrRankBonus', (rank) => ETHERNUM.ATTRIBUTE_RANK_BONUS[rank || "F"] || 2);
  Handlebars.registerHelper('ethernum-talentRankBonus', (rank) => ETHERNUM.TALENT_RANK_BONUS[rank || "F"] || 3);
  Handlebars.registerHelper('ethernum-ranks', () => ETHERNUM.RANKS);
  Handlebars.registerHelper('ethernum-runeClasses', () => ETHERNUM.RUNE_CLASSES);
  Handlebars.registerHelper('ethernum-runeTrinity', () => ETHERNUM.RUNE_TRINITY);
  Handlebars.registerHelper('ethernum-verbTier', (verb) => {
    const { VERBS } = ETHERNUM.RUNE_TRINITY;
    if (VERBS.tier1.includes(verb)) return 1;
    if (VERBS.tier2.includes(verb)) return 2;
    if (VERBS.tier3.includes(verb)) return 3;
    return 0;
  });
  Handlebars.registerHelper('ethernum-feCost', (rank) => getFECostForRank(rank));
}

async function initializeActorFlags(actor) {
  if (actor.type !== "character") return;

  const updates = {};
  const ether = new EtherSystem();

  if (!actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes"))
    updates[`flags.${ETHERNUM.MODULE_NAME}.etherAttributes`] = {...ETHERNUM.DEFAULT_ETHER_ATTRIBUTES};

  if (!actor.getFlag(ETHERNUM.MODULE_NAME, "talents"))
    updates[`flags.${ETHERNUM.MODULE_NAME}.talents`] = {...ETHERNUM.DEFAULT_TALENTS};

  if (!actor.getFlag(ETHERNUM.MODULE_NAME, "fe"))
    updates[`flags.${ETHERNUM.MODULE_NAME}.fe`] = {...ETHERNUM.DEFAULT_FE};

  if (actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") === undefined)
    updates[`flags.${ETHERNUM.MODULE_NAME}.maxRuneClass`] = 1;

  if (!actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem"))
    updates[`flags.${ETHERNUM.MODULE_NAME}.etherSystem`] = {
      etherMax: ether.calculateMaxEther(actor),
      etherCurrent: ether.calculateMaxEther(actor),
      etherPower: ether.calculateEtherPower(actor),
    };

  if (Object.keys(updates).length > 0) await actor.update(updates);
}

Hooks.on("renderCharacterSheetPF2e", (app, html) => EtherTabManager.render(app, html));
Hooks.on("createActor", (actor) => initializeActorFlags(actor));

Hooks.once("init", () => {
  console.log(`Ethernum RPG Module | Inicializando Sistema de Éter v${game.modules.get(ETHERNUM.MODULE_NAME)?.version ?? "?"}`);

  registerHandlebarsHelpers();
  registerSettings();

  const loadTpls = foundry.applications?.handlebars?.loadTemplates ?? loadTemplates;
  loadTpls([
    `${ETHERNUM.TEMPLATE_PATH}ether-attributes-tab.html`,
    `${ETHERNUM.TEMPLATE_PATH}ether-runes-tab.html`,
  ]);

  game.ethernum = { ETHERNUM };
});

Hooks.once("ready", async () => {
  console.log("Ethernum RPG Module | Sistema de Éter pronto!");

  await migrateWorld();

  if (game.user.isGM) {
    game.actors.filter(a => a.type === "character").forEach(a => initializeActorFlags(a));
  }

  if (game.system.id !== "pf2e") {
    ui.notifications.warn(game.i18n.localize("ETHERNUM.Warnings.NotPF2E"));
  }
});
