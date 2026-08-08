import type { UniqueMechanicAction } from "../types.js";

export const ARKIUS_ACTION_IDS = [
  "nucleo-em-brasas", "sintonia-fluxo", "sintonia-brasas", "aura-cinetica",
  "thermal-nimbus", "gate-junction-fire", "exaurir-o-sol", "resiliencia-reativa",
] as const;

export function getArkiusActions(): UniqueMechanicAction[] {
  return ARKIUS_ACTION_IDS.map(id => ({ id }));
}

export function getArkiusManagedMacros(): UniqueMechanicAction[] {
  return ARKIUS_ACTION_IDS.map(id => ({ id, macroName: id }));
}
