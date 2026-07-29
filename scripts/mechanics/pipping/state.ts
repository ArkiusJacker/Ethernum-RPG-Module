import { asRecord, asStringRecord, clampNumber, optionalString } from "../state.js";

export const PIPPING_STATE_VERSION = 2;
export type PippingExpression = "destruction" | "order" | "chaos";
export type PippingDarknessMode = "manual" | "random" | "scatter" | "area";
export type PippingTier = 1 | 2 | 3 | 4 | 5;

export interface PippingNightState {
  version: number;
  pulse: number;
  tier: PippingTier;
  livingNightActive: boolean;
  livingNightTurnKey?: string;
  livingNightRounds: number;
  mirroredShadows: number;
  expressionChoices: Partial<Record<`${PippingTier}`, PippingExpression>>;
  darkness: {
    active: boolean;
    mode: PippingDarknessMode;
    radius: number;
    templateId?: string;
    [key: string]: unknown;
  };
  recovery: {
    communeAvailable: boolean;
    lastCombatRecoveryTurnKey?: string;
    recoveredByEchoTurnKeys: Record<string, string>;
    [key: string]: unknown;
  };
  daily: {
    beyondFormUsed: boolean;
    tierFiveFinisherUsed: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const DEFAULT_PIPPING_STATE: PippingNightState = {
  version: PIPPING_STATE_VERSION,
  pulse: 2,
  tier: 1,
  livingNightActive: false,
  livingNightRounds: 0,
  mirroredShadows: 0,
  expressionChoices: {},
  darkness: {
    active: false,
    mode: "manual",
    radius: 10,
  },
  recovery: {
    communeAvailable: false,
    recoveredByEchoTurnKeys: {},
  },
  daily: {
    beyondFormUsed: false,
    tierFiveFinisherUsed: false,
  },
};

function normalizeExpression(value: unknown): PippingExpression | null {
  return value === "destruction" || value === "order" || value === "chaos" ? value : null;
}

function normalizeDarknessMode(value: unknown): PippingDarknessMode {
  return value === "random" || value === "scatter" || value === "area" ? value : "manual";
}

export function normalizePippingState(value: unknown): PippingNightState {
  const state = asRecord(value);
  const darkness = asRecord(state.darkness);
  const recovery = asRecord(state.recovery);
  const daily = asRecord(state.daily);
  const rawChoices = asRecord(state.expressionChoices);
  const expressionChoices: PippingNightState["expressionChoices"] = {};

  for (const tier of [1, 2, 3, 4, 5] as const) {
    const key = String(tier) as `${PippingTier}`;
    const expression = normalizeExpression(rawChoices[key]);
    if (expression) expressionChoices[key] = expression;
  }

  return {
    ...DEFAULT_PIPPING_STATE,
    ...state,
    version: PIPPING_STATE_VERSION,
    pulse: clampNumber(state.pulse, DEFAULT_PIPPING_STATE.pulse, 0, 20),
    tier: clampNumber(state.tier, 1, 1, 5) as PippingTier,
    livingNightActive: Boolean(state.livingNightActive),
    livingNightTurnKey: optionalString(state.livingNightTurnKey),
    livingNightRounds: clampNumber(state.livingNightRounds, 0, 0, 10),
    mirroredShadows: clampNumber(state.mirroredShadows, 0, 0, 8),
    expressionChoices,
    darkness: {
      ...DEFAULT_PIPPING_STATE.darkness,
      ...darkness,
      active: Boolean(darkness.active ?? state.livingNightActive),
      mode: normalizeDarknessMode(darkness.mode),
      radius: clampNumber(darkness.radius, 10, 5, 60),
      templateId: optionalString(darkness.templateId),
    },
    recovery: {
      ...DEFAULT_PIPPING_STATE.recovery,
      ...recovery,
      communeAvailable: Boolean(recovery.communeAvailable ?? Number(state.pulse ?? 0) < 6),
      lastCombatRecoveryTurnKey: optionalString(recovery.lastCombatRecoveryTurnKey),
      recoveredByEchoTurnKeys: asStringRecord(recovery.recoveredByEchoTurnKeys),
    },
    daily: {
      ...DEFAULT_PIPPING_STATE.daily,
      ...daily,
      beyondFormUsed: Boolean(daily.beyondFormUsed),
      tierFiveFinisherUsed: Boolean(daily.tierFiveFinisherUsed),
    },
  };
}
