import type { UniqueMechanicAction } from "../types.js";

export const GYRO_ACTION_IDS = ["technique"] as const;

export function getGyroActions(): UniqueMechanicAction[] {
  return GYRO_ACTION_IDS.map(id => ({ id }));
}

export function getGyroManagedMacros(): UniqueMechanicAction[] {
  return GYRO_ACTION_IDS.map(id => ({ id, macroName: id }));
}
