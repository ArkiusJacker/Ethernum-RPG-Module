import type { ManagedMacroDefinition, UniqueMechanicAction } from "../types.js";

export const ATLAS_ACTION_IDS = ["divine-gaze", "complete-divine-gaze"] as const;

export const ATLAS_MANAGED_MACROS = [
  {
    id: "concordia-atlas-status",
    name: "Ethernum - Atlas: Painel",
    command: "await game.ethernum.macros.concordia.atlas.showStatus();",
    img: "icons/svg/sword.svg",
  },
  {
    id: "atlas-olhar-do-divino",
    name: "Ethernum - Atlas: Olhar do Divino",
    command: "await game.ethernum.macros.concordia.atlas.olharDoDivino();",
    img: "icons/svg/sword.svg",
  },
  {
    id: "atlas-complete-divine-gaze",
    name: "Ethernum - Atlas: Concluir Olhar",
    command: "await game.ethernum.macros.concordia.atlas.completeDivineGaze();",
    img: "icons/svg/sword.svg",
  },
] satisfies readonly ManagedMacroDefinition[];

export function getAtlasActions(): UniqueMechanicAction[] {
  return ATLAS_ACTION_IDS.map(id => ({ id }));
}

export function getAtlasManagedMacros(): ManagedMacroDefinition[] {
  return ATLAS_MANAGED_MACROS.map(definition => ({ ...definition }));
}
