import { ETHERNUM } from "../../config.js";
import type { ManagedMacroDefinition, UniqueMechanicAction } from "../types.js";

export const ARKIUS_ACTION_IDS = [
  "nucleo-em-brasas", "sintonia-fluxo", "sintonia-brasas", "aura-cinetica",
  "thermal-nimbus", "gate-junction-fire", "exaurir-o-sol", "resiliencia-reativa",
] as const;

const ARKIUS_MACRO_IMAGE = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/concordia/arkius-icon.png`;

export const ARKIUS_MANAGED_MACROS = [
  {
    id: "concordia-arkius-status",
    name: "Ethernum - Concórdia: Arkius Painel",
    command: "await game.ethernum.macros.concordia.arkius.showStatus();",
    img: ARKIUS_MACRO_IMAGE,
  },
  {
    id: "arkius-nucleo-em-brasas",
    name: "Ethernum - Arkius: Núcleo em Brasas",
    command: "await game.ethernum.macros.concordia.arkius.toggleNucleoEmBrasas();",
    img: ARKIUS_MACRO_IMAGE,
  },
  {
    id: "arkius-sintonia-fluxo",
    name: "Ethernum - Arkius: Fluxo",
    command: "await game.ethernum.macros.concordia.arkius.setSintoniaFluxo();",
    img: ARKIUS_MACRO_IMAGE,
  },
  {
    id: "arkius-sintonia-brasas",
    name: "Ethernum - Arkius: Brasas",
    command: "await game.ethernum.macros.concordia.arkius.setSintoniaBrasas();",
    img: ARKIUS_MACRO_IMAGE,
  },
  {
    id: "arkius-exaurir-o-sol",
    name: "Ethernum - Arkius: Exaurir o Sol",
    command: "await game.ethernum.macros.concordia.arkius.exaurirOSol();",
    img: ARKIUS_MACRO_IMAGE,
  },
  {
    id: "arkius-kinetic-aura",
    name: "Ethernum - Arkius: Aura Cinética",
    command: "await game.ethernum.macros.concordia.arkius.toggleKineticAura();",
    img: ARKIUS_MACRO_IMAGE,
  },
  {
    id: "arkius-thermal-nimbus",
    name: "Ethernum - Arkius: Thermal Nimbus",
    command: "await game.ethernum.macros.concordia.arkius.toggleThermalNimbus();",
    img: ARKIUS_MACRO_IMAGE,
  },
  {
    id: "arkius-resiliencia-reativa",
    name: "Ethernum - Arkius: Resiliência Reativa",
    command: "await game.ethernum.macros.concordia.arkius.resilienciaReativa();",
    img: ARKIUS_MACRO_IMAGE,
  },
  {
    id: "arkius-short-rest",
    name: "Ethernum - Arkius: Descanso Curto",
    command: "await game.ethernum.macros.concordia.arkius.shortRestReset();",
    img: ARKIUS_MACRO_IMAGE,
  },
  {
    id: "arkius-long-rest",
    name: "Ethernum - Arkius: Descanso Longo",
    command: "await game.ethernum.macros.concordia.arkius.longRestReset();",
    img: ARKIUS_MACRO_IMAGE,
  },
] satisfies readonly ManagedMacroDefinition[];

export function getArkiusActions(): UniqueMechanicAction[] {
  return ARKIUS_ACTION_IDS.map(id => ({ id }));
}

export function getArkiusManagedMacros(): ManagedMacroDefinition[] {
  return ARKIUS_MANAGED_MACROS.map(definition => ({ ...definition }));
}
