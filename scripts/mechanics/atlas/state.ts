import { asRecord, clampNumber, optionalString } from "../state.js";

export const ATLAS_SIDARTA_PROFILE_ID = "atlas-sidarta" as const;
export const ATLAS_MODIFICATION_IDS = [
  "frontline-vigor",
  "shattering-judgment",
  "steel-resonance",
  "spear-reach",
  "gorum-clamor",
  "iron-baptism",
] as const;
export type AtlasModificationId = typeof ATLAS_MODIFICATION_IDS[number];
export type AtlasBaptismDamageType = "slashing" | "piercing";

export interface AtlasState {
  usesSpent: number;
  exhaustedLocked: boolean;
  fatigueStupefied: number;
  pending: {
    active: boolean;
    modifications: AtlasModificationId[];
    spellRank: number;
    originalActions: number;
    baptismDamageType: AtlasBaptismDamageType;
    overdrive: boolean;
    [key: string]: unknown;
  };
  slowPending: boolean;
  slowActive: boolean;
  stupefiedPending: boolean;
  stupefiedActive: boolean;
  overdriveFlatCheckArmed: boolean;
  overdriveSpellRank: number;
  lastCombatTurnKey?: string;
  [key: string]: unknown;
}

export const DEFAULT_ATLAS_STATE: AtlasState = {
  usesSpent: 0,
  exhaustedLocked: false,
  fatigueStupefied: 0,
  pending: {
    active: false,
    modifications: [],
    spellRank: 1,
    originalActions: 2,
    baptismDamageType: "slashing",
    overdrive: false,
  },
  slowPending: false,
  slowActive: false,
  stupefiedPending: false,
  stupefiedActive: false,
  overdriveFlatCheckArmed: false,
  overdriveSpellRank: 1,
};

function normalizeModification(value: unknown): AtlasModificationId | null {
  return ATLAS_MODIFICATION_IDS.includes(value as AtlasModificationId)
    ? value as AtlasModificationId
    : null;
}

export function normalizeAtlasState(value: unknown): AtlasState {
  const state = asRecord(value);
  const pending = asRecord(state.pending);
  const modifications = Array.isArray(pending.modifications)
    ? pending.modifications.map(normalizeModification).filter((entry): entry is AtlasModificationId => entry !== null)
    : [];
  return {
    ...DEFAULT_ATLAS_STATE,
    ...state,
    usesSpent: clampNumber(state.usesSpent, 0, 0, 5),
    exhaustedLocked: Boolean(state.exhaustedLocked),
    fatigueStupefied: Math.max(0, Math.floor(Number(state.fatigueStupefied ?? 0) || 0)),
    pending: {
      ...DEFAULT_ATLAS_STATE.pending,
      ...pending,
      active: Boolean(pending.active) && modifications.length > 0,
      modifications,
      spellRank: clampNumber(pending.spellRank, 1, 1, 10),
      originalActions: clampNumber(pending.originalActions, 2, 1, 3),
      baptismDamageType: pending.baptismDamageType === "piercing" ? "piercing" : "slashing",
      overdrive: Boolean(pending.overdrive) && modifications.length > 1,
    },
    slowPending: Boolean(state.slowPending),
    slowActive: Boolean(state.slowActive),
    stupefiedPending: Boolean(state.stupefiedPending),
    stupefiedActive: Boolean(state.stupefiedActive),
    overdriveFlatCheckArmed: Boolean(state.overdriveFlatCheckArmed),
    overdriveSpellRank: clampNumber(state.overdriveSpellRank, 1, 1, 10),
    lastCombatTurnKey: optionalString(state.lastCombatTurnKey),
  };
}
