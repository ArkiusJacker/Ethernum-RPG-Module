import type { ManagedMacroDefinition, UniqueMechanicAction } from "../types.js";

export const CHARLES_ACTION_IDS = [
  "impulse-climb", "containment-shot", "vector-pull", "cushioning-net",
  "overloaded-net", "craft-imagination",
] as const;

export const CHARLES_MANAGED_MACROS = [
  {
    id: "concordia-charles-status",
    name: "Ethernum - Charles: Painel",
    command: "await game.ethernum.macros.concordia.charles.showStatus();",
    img: "icons/svg/hammer.svg",
  },
  {
    id: "charles-impulse-climb",
    name: "Ethernum - Charles: Escalada de Impulso",
    command: "await game.ethernum.macros.concordia.charles.impulseClimb();",
    img: "icons/svg/hammer.svg",
  },
  {
    id: "charles-containment-shot",
    name: "Ethernum - Charles: Disparo de Contenção",
    command: "await game.ethernum.macros.concordia.charles.containmentShot();",
    img: "icons/svg/hammer.svg",
  },
  {
    id: "charles-vector-pull",
    name: "Ethernum - Charles: Puxão Vetorial",
    command: "await game.ethernum.macros.concordia.charles.vectorPull();",
    img: "icons/svg/hammer.svg",
  },
  {
    id: "charles-cushioning-net",
    name: "Ethernum - Charles: Rede de Amortecimento",
    command: "await game.ethernum.macros.concordia.charles.cushioningNet();",
    img: "icons/svg/hammer.svg",
  },
  {
    id: "charles-craft-imagination",
    name: "Ethernum - Charles: Craft da Imaginação",
    command: "await game.ethernum.macros.concordia.charles.craftImagination();",
    img: "icons/svg/hammer.svg",
  },
] satisfies readonly ManagedMacroDefinition[];

export function getCharlesActions(): UniqueMechanicAction[] {
  return CHARLES_ACTION_IDS.map(id => ({ id }));
}

export function getCharlesManagedMacros(): ManagedMacroDefinition[] {
  return CHARLES_MANAGED_MACROS.map(definition => ({ ...definition }));
}
