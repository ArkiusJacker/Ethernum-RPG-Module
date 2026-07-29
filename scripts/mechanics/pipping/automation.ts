import type { PippingDarknessMode } from "./state.js";

export interface DarknessCandidate {
  id: string;
  allied: boolean;
  distance: number;
}

export function affectedDarknessCandidates(
  candidates: DarknessCandidate[],
  radius: number,
): DarknessCandidate[] {
  return candidates.filter(candidate => !candidate.allied && candidate.distance <= radius);
}

export function resolveDarknessTarget(
  candidates: DarknessCandidate[],
  mode: PippingDarknessMode,
  random: () => number = Math.random,
): DarknessCandidate | null {
  if (mode === "manual" || mode === "area" || mode === "scatter" || candidates.length === 0) return null;
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[index] ?? null;
}
