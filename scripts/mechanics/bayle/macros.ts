import type { UniqueMechanicAction } from "../types.js";

export const BAYLE_ACTION_IDS = [
  "placidusax-lightning", "dragon-breath", "dragon-roar", "lightning-lances", "bayle-closure",
] as const;

export function getBayleActions(): UniqueMechanicAction[] {
  return BAYLE_ACTION_IDS.map(id => ({ id }));
}

export function getBayleManagedMacros(): UniqueMechanicAction[] {
  return BAYLE_ACTION_IDS.map(id => ({ id, macroName: id }));
}
