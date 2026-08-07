import {
  PIPPING_ACTIONS,
  getPippingActionAvailability,
  type PippingActionBlockReason,
} from "./progression.js";
import {
  buildPippingActionPresentation,
  presentPippingText,
  type PippingActionHeader,
  type PippingActionSummaryEntry,
  type PippingActivationPresentation,
  type PippingAutomationSheetEntry,
  type PippingDetailSection,
  type PippingLocalizer,
  type PippingOutcomeSheetEntry,
  type PippingResolutionPresentation,
  type PippingScalingSheetEntry,
  type PippingTargetingPresentation,
} from "./presentation.js";
import type { PippingNightState, PippingTier } from "./state.js";

export interface PippingActionSheetData {
  id: string;
  name: string;
  flavor: string;
  header: PippingActionHeader;
  activation: PippingActivationPresentation;
  targeting: PippingTargetingPresentation;
  resolution?: PippingResolutionPresentation;
  summaryEntries: PippingActionSummaryEntry[];
  outcomes: PippingOutcomeSheetEntry[];
  scalingEntries: PippingScalingSheetEntry[];
  durationEntries: string[];
  requirementEntries: string[];
  automationEntries: PippingAutomationSheetEntry[];
  details: PippingDetailSection[];
  unlocked: boolean;
  usable: boolean;
  lockReason: string;
}

export interface PippingSheetData {
  actorName: string;
  level: number;
  tier: PippingTier;
  dc: number;
  isGM: boolean;
  actions: PippingActionSheetData[];
}

export interface BuildPippingSheetDataOptions {
  actor: unknown;
  state: Readonly<PippingNightState>;
  level: number;
  tier: PippingTier;
  dc: number;
  isGM: boolean;
  localize?: PippingLocalizer;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function finiteInteger(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

export function readPippingActorCharismaModifier(actor: unknown): number {
  const actorData = asRecord(actor);
  const system = asRecord(actorData.system);
  const abilities = asRecord(system.abilities);
  const charisma = asRecord(abilities.cha);
  return finiteInteger(charisma.mod ?? charisma.value, 0);
}

function readActorName(actor: unknown): string {
  const name = asRecord(actor).name;
  return typeof name === "string" && name.trim().length > 0 ? name : "Pipping";
}

function normalizeLevel(level: number): number {
  return Math.max(1, finiteInteger(level, 1));
}

function normalizeDC(dc: number): number {
  return Math.max(0, finiteInteger(dc, 0));
}

function lockReasonFallback(reason: PippingActionBlockReason): string {
  if (reason === "tier") return "Requer Tier ou nível superior.";
  if (reason === "expression") return "Esta Expressão não foi escolhida para o Tier.";
  if (reason === "pulse") return "Pulso Sombrio insuficiente.";
  if (reason === "daily") return "Uso diário já consumido.";
  return "";
}

function localizedLockReason(
  reason: PippingActionBlockReason,
  localize: PippingLocalizer | undefined,
): string {
  if (!reason) return "";
  const keyByReason: Record<Exclude<PippingActionBlockReason, "">, string> = {
    daily: "ETHERNUM.Unique.Pipping.Errors.DailyUsed",
    expression: "ETHERNUM.Unique.Pipping.Errors.LockedAction",
    pulse: "ETHERNUM.Unique.Pipping.Errors.NotEnoughPulse",
    tier: "ETHERNUM.Unique.Pipping.Errors.LockedAction",
  };
  return presentPippingText(localize, keyByReason[reason], lockReasonFallback(reason));
}

export function buildPippingSheetData(
  options: BuildPippingSheetDataOptions,
): PippingSheetData {
  const level = normalizeLevel(options.level);
  const dc = normalizeDC(options.dc);
  const charismaModifier = readPippingActorCharismaModifier(options.actor);
  const actions = PIPPING_ACTIONS.map(action => {
    const presentation = buildPippingActionPresentation(action, {
      actorLevel: level,
      tier: options.tier,
      dc,
      charismaModifier,
      isGM: options.isGM,
      localize: options.localize,
    });
    const availability = getPippingActionAvailability(
      action,
      options.state as PippingNightState,
      level,
      options.tier,
    );
    return {
      id: action.id,
      ...presentation,
      unlocked: availability.tierUnlocked && availability.selected,
      usable: availability.usable,
      lockReason: localizedLockReason(availability.reason, options.localize),
    };
  });
  return {
    actorName: readActorName(options.actor),
    level,
    tier: options.tier,
    dc,
    isGM: options.isGM,
    actions,
  };
}

export const createPippingSheetData = buildPippingSheetData;
