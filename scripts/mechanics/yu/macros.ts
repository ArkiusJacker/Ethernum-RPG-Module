import type { UniqueMechanicAction } from "../types.js";

export const YU_ACTION_IDS = ["rage", "flurry-of-blows", "stunning-fist"] as const;

export function getYuActions(): UniqueMechanicAction[] {
  return YU_ACTION_IDS.map(id => ({ id }));
}

export function getYuManagedMacros(): UniqueMechanicAction[] {
  return YU_ACTION_IDS.map(id => ({ id, macroName: id }));
}
