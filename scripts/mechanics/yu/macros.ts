import type { ManagedMacroDefinition, UniqueMechanicAction } from "../types.js";

export const YU_ACTION_IDS = ["rage", "flurry-of-blows", "stunning-fist"] as const;

export const YU_MANAGED_MACROS = [
  {
    id: "concordia-yu-status",
    name: "Ethernum - Yu: Painel",
    command: "await game.ethernum.macros.concordia.yu.showStatus();",
    img: "icons/svg/terror.svg",
  },
  {
    id: "yu-rage-in-the-flesh",
    name: "Ethernum - Yu: Rage in the Flesh",
    command: "await game.ethernum.macros.concordia.yu.toggleRage();",
    img: "icons/svg/terror.svg",
  },
  {
    id: "yu-flurry-of-blows",
    name: "Ethernum - Yu: Flurry of Blows",
    command: "await game.ethernum.macros.concordia.yu.flurryOfBlows();",
    img: "icons/svg/terror.svg",
  },
  {
    id: "yu-flurry-fear",
    name: "Ethernum - Yu: Sobrecarga de Medo",
    command: "await game.ethernum.macros.concordia.yu.flurryFear();",
    img: "icons/svg/terror.svg",
  },
  {
    id: "yu-stunning-fist-damage",
    name: "Ethernum - Yu: Stunning Fist +2d10",
    command: "await game.ethernum.macros.concordia.yu.stunningFistDamage();",
    img: "icons/svg/terror.svg",
  },
] satisfies readonly ManagedMacroDefinition[];

export function getYuActions(): UniqueMechanicAction[] {
  return YU_ACTION_IDS.map(id => ({ id }));
}

export function getYuManagedMacros(): ManagedMacroDefinition[] {
  return YU_MANAGED_MACROS.map(definition => ({ ...definition }));
}
