import { ETHERNUM } from "../../config.js";
import type { ManagedMacroDefinition, UniqueMechanicAction } from "../types.js";

export const BAYLE_ACTION_IDS = [
  "placidusax-lightning", "dragon-breath", "dragon-roar", "lightning-lances", "bayle-closure",
] as const;

export const BAYLE_MANAGED_MACROS = [{
  id: "bayle-status",
  name: "Ethernum - Bayle: Painel",
  command: "await game.ethernum.macros.ethernumCompany.bayle.showStatus();",
  img: `modules/${ETHERNUM.MODULE_NAME}/assets/unique/spinball.png`,
}] satisfies readonly ManagedMacroDefinition[];

export function getBayleActions(): UniqueMechanicAction[] {
  return BAYLE_ACTION_IDS.map(id => ({ id }));
}

export function getBayleManagedMacros(): ManagedMacroDefinition[] {
  return BAYLE_MANAGED_MACROS.map(definition => ({ ...definition }));
}
