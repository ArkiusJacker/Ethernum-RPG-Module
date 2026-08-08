import type { UniqueMechanicAction } from "../types.js";

export const ATLAS_ACTION_IDS = ["divine-gaze", "complete-divine-gaze"] as const;

export function getAtlasActions(): UniqueMechanicAction[] {
  return ATLAS_ACTION_IDS.map(id => ({ id }));
}

export function getAtlasManagedMacros(): UniqueMechanicAction[] {
  return ATLAS_ACTION_IDS.map(id => ({ id, macroName: id }));
}
