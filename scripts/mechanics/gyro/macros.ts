import { ETHERNUM } from "../../config.js";
import type { ManagedMacroDefinition, UniqueMechanicAction } from "../types.js";

export const GYRO_ACTION_IDS = ["technique"] as const;

export const GYRO_MANAGED_MACROS = [{
  id: "gyro-techniques",
  name: "Ethernum - Gyro: Técnicas",
  command: "await game.ethernum.macros.ethernumCompany.gyro.showTechniques();",
  img: `modules/${ETHERNUM.MODULE_NAME}/assets/unique/spinball.png`,
}] satisfies readonly ManagedMacroDefinition[];

export function getGyroActions(): UniqueMechanicAction[] {
  return GYRO_ACTION_IDS.map(id => ({ id }));
}

export function getGyroManagedMacros(): ManagedMacroDefinition[] {
  return GYRO_MANAGED_MACROS.map(definition => ({ ...definition }));
}
