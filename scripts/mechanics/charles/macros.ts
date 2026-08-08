import type { UniqueMechanicAction } from "../types.js";

export const CHARLES_ACTION_IDS = [
  "impulse-climb", "containment-shot", "vector-pull", "cushioning-net",
  "overloaded-net", "craft-imagination",
] as const;

export function getCharlesActions(): UniqueMechanicAction[] {
  return CHARLES_ACTION_IDS.map(id => ({ id }));
}

export function getCharlesManagedMacros(): UniqueMechanicAction[] {
  return CHARLES_ACTION_IDS.map(id => ({ id, macroName: id }));
}
