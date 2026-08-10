import { ETHERNUM } from "../../config.js";

export type EthernumVisualReferenceMode = "off" | "ethernum";
export type EthernumVisualReferenceFit = "width" | "height";

export interface EthernumVisualReferenceSnapshot {
  enabled: boolean;
  path: string;
  opacity: number;
  scale: number;
  x: number;
  y: number;
  fit: EthernumVisualReferenceFit;
}

interface VisualReferenceSettings {
  get(module: string, key: string): unknown;
  set(module: string, key: string, value: unknown): Promise<unknown>;
}

function settings(): VisualReferenceSettings | undefined {
  return game.settings as unknown as VisualReferenceSettings | undefined;
}

function read<T>(key: string, fallback: T): T {
  try {
    const value = settings()?.get(ETHERNUM.MODULE_NAME, key);
    return (value === undefined || value === null ? fallback : value) as T;
  } catch {
    return fallback;
  }
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

export function getEthernumVisualReferenceSnapshot(isGM = Boolean(game.user?.isGM)): EthernumVisualReferenceSnapshot {
  const mode = read<EthernumVisualReferenceMode>("characterSheetVisualReference", "off");
  const fit = read<EthernumVisualReferenceFit>("characterSheetVisualReferenceFit", "width");
  return {
    enabled: isGM && mode === "ethernum",
    path: String(read("characterSheetVisualReferencePath", "") ?? "").trim(),
    opacity: number(read("characterSheetVisualReferenceOpacity", 0.35), 0.35, 0.05, 1),
    scale: number(read("characterSheetVisualReferenceScale", 1), 1, 0.25, 3),
    x: number(read("characterSheetVisualReferenceX", 0), 0, -2000, 2000),
    y: number(read("characterSheetVisualReferenceY", 0), 0, -2000, 2000),
    fit: fit === "height" ? "height" : "width",
  };
}

export async function setEthernumVisualReferenceSetting(key: string, value: unknown): Promise<void> {
  const allowed = new Set([
    "characterSheetVisualReference",
    "characterSheetVisualReferencePath",
    "characterSheetVisualReferenceOpacity",
    "characterSheetVisualReferenceScale",
    "characterSheetVisualReferenceX",
    "characterSheetVisualReferenceY",
    "characterSheetVisualReferenceFit",
  ]);
  if (!game.user?.isGM || !allowed.has(key)) return;
  await settings()?.set(ETHERNUM.MODULE_NAME, key, value);
}

export const EthernumVisualReferenceService = Object.freeze({
  snapshot: getEthernumVisualReferenceSnapshot,
  set: setEthernumVisualReferenceSetting,
});
