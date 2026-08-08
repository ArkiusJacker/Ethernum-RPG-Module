import { asRecord, asStringRecord, clampNumber, optionalString } from "../state.js";
import {
  normalizeUniqueExecutions,
  reconcileUniqueExecutions,
  type UniqueExecutionTransaction,
} from "../../unique/core/UniqueExecutionManager.js";

export const PIPPING_STATE_VERSION = 5;
export type PippingExpression = "destruction" | "order" | "chaos";
export type PippingDarknessMode = "manual" | "random" | "scatter" | "area";
export type PippingTier = 1 | 2 | 3 | 4 | 5;

export interface PippingShadowManifestation {
  id: string;
  sceneId: string;
  variant: PippingExpression;
  kind: "animated" | "mirrored";
}

export interface PippingPendingAction {
  actionId: string;
  pulseCost: number;
  startedAt: number;
  userId?: string;
}

export interface PippingAnimatedShadowState {
  tileId?: string;
  sceneId?: string;
  position?: {
    x: number;
    y: number;
  };
  usedOffGuardTurnKey?: string;
  [key: string]: unknown;
}

export function resolvePippingAnimatedShadowPosition(
  shadow: Readonly<PippingAnimatedShadowState>,
  activeSceneId: string | undefined,
  tileExists: (tileId: string) => boolean,
): { x: number; y: number } | null {
  const { position, sceneId, tileId } = shadow;
  if (!position || !activeSceneId || sceneId !== activeSceneId || !tileId || !tileExists(tileId)) {
    return null;
  }
  const x = Number(position.x);
  const y = Number(position.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

export interface PippingPersistentArea {
  id: string;
  actionId: "shadow-king" | "dead-sun-epitaph";
  sceneId: string;
  documentUuid: string;
  expiresAtRound?: number;
}

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
    templateUuid?: string;
    sourceTokenUuid?: string;
    [key: string]: unknown;
  };
  shadowManifestations: PippingShadowManifestation[];
  animatedShadow: PippingAnimatedShadowState;
  persistentAreas: PippingPersistentArea[];
  frequencies: Record<string, string>;
  executions: UniqueExecutionTransaction[];
  /** @deprecated Compatibility snapshot only. It is never used as an action mutex. */
  pendingAction?: PippingPendingAction;
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
  shadowManifestations: [],
  animatedShadow: {},
  persistentAreas: [],
  frequencies: {},
  executions: [],
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

function normalizeShadowManifestations(value: unknown): PippingShadowManifestation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    const record = asRecord(entry);
    const id = optionalString(record.id);
    const sceneId = optionalString(record.sceneId);
    const variant = normalizeExpression(record.variant);
    const kind: PippingShadowManifestation["kind"] | null = record.kind === "animated"
      ? "animated"
      : record.kind === "mirrored"
        ? "mirrored"
        : null;
    return id && sceneId && variant && kind ? [{ id, sceneId, variant, kind }] : [];
  }).slice(-12);
}

function normalizePendingAction(value: unknown): PippingPendingAction | undefined {
  const pending = asRecord(value);
  const actionId = optionalString(pending.actionId);
  const startedAt = Number(pending.startedAt);
  if (!actionId || !Number.isFinite(startedAt) || startedAt <= 0) return undefined;
  return {
    actionId,
    pulseCost: clampNumber(pending.pulseCost, 0, 0, 20),
    startedAt,
    userId: optionalString(pending.userId),
  };
}

function normalizeAnimatedShadow(value: unknown): PippingAnimatedShadowState {
  const shadow = asRecord(value);
  const position = asRecord(shadow.position);
  const x = Number(position.x);
  const y = Number(position.y);
  return {
    ...shadow,
    tileId: optionalString(shadow.tileId),
    sceneId: optionalString(shadow.sceneId),
    position: Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined,
    usedOffGuardTurnKey: optionalString(shadow.usedOffGuardTurnKey),
  };
}

function normalizePersistentAreas(value: unknown): PippingPersistentArea[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    const area = asRecord(entry);
    const id = optionalString(area.id);
    const sceneId = optionalString(area.sceneId);
    const documentUuid = optionalString(area.documentUuid);
    const actionId: PippingPersistentArea["actionId"] | null = area.actionId === "shadow-king" || area.actionId === "dead-sun-epitaph"
      ? area.actionId
      : null;
    const expiresAtRound = Number(area.expiresAtRound);
    return id && sceneId && documentUuid && actionId
      ? [{
        id,
        sceneId,
        documentUuid,
        actionId,
        ...(Number.isFinite(expiresAtRound) ? { expiresAtRound } : {}),
      }]
      : [];
  }).slice(-8);
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
      templateUuid: optionalString(darkness.templateUuid),
      sourceTokenUuid: optionalString(darkness.sourceTokenUuid),
    },
    shadowManifestations: normalizeShadowManifestations(state.shadowManifestations),
    animatedShadow: normalizeAnimatedShadow(state.animatedShadow),
    persistentAreas: normalizePersistentAreas(state.persistentAreas),
    frequencies: asStringRecord(state.frequencies),
    executions: reconcileUniqueExecutions(
      normalizeUniqueExecutions(state.executions),
      10 * 60_000,
    ),
    pendingAction: normalizePendingAction(state.pendingAction),
    recovery: {
      ...DEFAULT_PIPPING_STATE.recovery,
      ...recovery,
      communeAvailable: Boolean(recovery.communeAvailable),
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
