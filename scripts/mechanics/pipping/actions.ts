export interface PippingScalingValue {
  base: number;
  baseLevel: number;
  increase: number;
  everyLevels: number;
  maximum?: number;
  increaseLevels?: readonly number[];
  valuesByLevel?: readonly {
    level: number;
    value: number;
  }[];
}

export interface PippingScalingIncrease {
  level: number;
  value: number;
}

export interface PippingScalingResolution {
  current: number;
  nextIncrease: PippingScalingIncrease | null;
  maximum?: number;
  maximumLevel?: number;
}

export type PippingFormulaPurpose = "damage" | "healing" | "reduction";
export type PippingFormulaDamageType = "void" | "cold" | "void-or-cold";

interface PippingDiceFormulaDefinition {
  kind: "dice";
  purpose: "damage" | "healing";
  diceSize: 6 | 8;
  scaling: PippingScalingValue;
  addCharisma?: boolean;
  damageType?: PippingFormulaDamageType;
}

interface PippingHalfLevelFormulaDefinition {
  kind: "half-level-ceiling";
  purpose: "reduction";
  addCharisma: true;
}

export type PippingFormulaDefinition =
  | PippingDiceFormulaDefinition
  | PippingHalfLevelFormulaDefinition;

export const PIPPING_ACTION_FORMULAS = {
  "ruin-note": {
    kind: "dice",
    purpose: "damage",
    diceSize: 6,
    scaling: { base: 2, baseLevel: 3, increase: 1, everyLevels: 2, maximum: 10 },
    damageType: "void",
  },
  "restoring-pulse": {
    kind: "dice",
    purpose: "healing",
    diceSize: 6,
    scaling: { base: 2, baseLevel: 3, increase: 1, everyLevels: 2, maximum: 10 },
    addCharisma: true,
  },
  "void-touch": {
    kind: "dice",
    purpose: "damage",
    diceSize: 6,
    scaling: { base: 4, baseLevel: 5, increase: 1, everyLevels: 2, maximum: 11 },
    damageType: "void",
  },
  "black-order-mantle": {
    kind: "half-level-ceiling",
    purpose: "reduction",
    addCharisma: true,
  },
  "night-emanation": {
    kind: "dice",
    purpose: "damage",
    diceSize: 6,
    scaling: { base: 6, baseLevel: 9, increase: 1, everyLevels: 2, maximum: 11 },
    damageType: "void-or-cold",
  },
  "requiem-persist": {
    kind: "dice",
    purpose: "healing",
    diceSize: 8,
    scaling: { base: 3, baseLevel: 9, increase: 1, everyLevels: 4, maximum: 5 },
    addCharisma: true,
  },
  "ending-chorus": {
    kind: "dice",
    purpose: "damage",
    diceSize: 6,
    scaling: { base: 10, baseLevel: 13, increase: 1, everyLevels: 2, maximum: 13 },
    damageType: "void",
  },
  "gentle-night-liturgy": {
    kind: "dice",
    purpose: "healing",
    diceSize: 8,
    scaling: {
      base: 6,
      baseLevel: 13,
      increase: 1,
      everyLevels: 1,
      maximum: 8,
      increaseLevels: [17, 19],
    },
    addCharisma: true,
  },
  "dead-sun-epitaph": {
    kind: "dice",
    purpose: "damage",
    diceSize: 6,
    scaling: { base: 14, baseLevel: 17, increase: 2, everyLevels: 2, maximum: 16 },
    damageType: "void-or-cold",
  },
  "night-refuses-end": {
    kind: "dice",
    purpose: "healing",
    diceSize: 8,
    scaling: { base: 8, baseLevel: 17, increase: 0, everyLevels: 2, maximum: 8 },
    addCharisma: true,
  },
} as const satisfies Record<string, PippingFormulaDefinition>;

export type PippingFormulaId = keyof typeof PIPPING_ACTION_FORMULAS;

function normalizedLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
}

function cappedScalingValue(scaling: PippingScalingValue, increases: number): number {
  const value = scaling.base + Math.max(0, increases) * scaling.increase;
  return scaling.maximum === undefined ? value : Math.min(value, scaling.maximum);
}

function scalingIncreaseCount(scaling: PippingScalingValue, actorLevel: number): number {
  const level = normalizedLevel(actorLevel);
  if (scaling.increase <= 0) return 0;
  if (scaling.increaseLevels) {
    return scaling.increaseLevels.filter(increaseLevel => increaseLevel <= level).length;
  }
  const interval = Math.max(1, Math.floor(scaling.everyLevels));
  return Math.max(0, Math.floor((Math.max(scaling.baseLevel, level) - scaling.baseLevel) / interval));
}

export function resolveScaling(scaling: PippingScalingValue, actorLevel: number): number {
  if (scaling.valuesByLevel?.length) {
    const level = normalizedLevel(actorLevel);
    return [...scaling.valuesByLevel]
      .sort((left, right) => left.level - right.level)
      .reduce(
        (value, entry) => entry.level <= level ? entry.value : value,
        scaling.base,
      );
  }
  return cappedScalingValue(scaling, scalingIncreaseCount(scaling, actorLevel));
}

export function getNextScalingIncrease(
  scaling: PippingScalingValue,
  actorLevel: number,
): PippingScalingIncrease | null {
  const level = normalizedLevel(actorLevel);
  const current = resolveScaling(scaling, level);
  if (scaling.maximum !== undefined && current >= scaling.maximum) return null;

  if (scaling.valuesByLevel?.length) {
    const next = [...scaling.valuesByLevel]
      .sort((left, right) => left.level - right.level)
      .find(entry => entry.level > level && entry.value > current);
    return next ? { level: next.level, value: next.value } : null;
  }

  if (scaling.increase <= 0) return null;

  if (scaling.increaseLevels) {
    for (const increaseLevel of scaling.increaseLevels) {
      if (increaseLevel <= level) continue;
      const value = resolveScaling(scaling, increaseLevel);
      if (value > current) return { level: increaseLevel, value };
    }
    return null;
  }

  const interval = Math.max(1, Math.floor(scaling.everyLevels));
  const completedIntervals = Math.max(
    0,
    Math.floor((Math.max(scaling.baseLevel, level) - scaling.baseLevel) / interval),
  );
  const nextLevel = scaling.baseLevel + (completedIntervals + 1) * interval;
  const value = resolveScaling(scaling, nextLevel);
  return value > current ? { level: nextLevel, value } : null;
}

function getScalingMaximumLevel(scaling: PippingScalingValue): number | undefined {
  const maximum = scaling.maximum;
  if (maximum === undefined) return undefined;
  if (maximum <= scaling.base) return scaling.baseLevel;
  if (scaling.valuesByLevel?.length) {
    return [...scaling.valuesByLevel]
      .sort((left, right) => left.level - right.level)
      .find(entry => entry.value >= maximum)?.level;
  }
  if (scaling.increase <= 0) return undefined;

  const increasesRequired = Math.ceil((maximum - scaling.base) / scaling.increase);
  if (scaling.increaseLevels) {
    return scaling.increaseLevels[increasesRequired - 1];
  }
  return scaling.baseLevel + increasesRequired * Math.max(1, Math.floor(scaling.everyLevels));
}

export function resolveScalingProgression(
  scaling: PippingScalingValue,
  actorLevel: number,
): PippingScalingResolution {
  return {
    current: resolveScaling(scaling, actorLevel),
    nextIncrease: getNextScalingIncrease(scaling, actorLevel),
    ...(scaling.maximum === undefined ? {} : { maximum: scaling.maximum }),
    ...(getScalingMaximumLevel(scaling) === undefined
      ? {}
      : { maximumLevel: getScalingMaximumLevel(scaling) }),
  };
}

export interface PippingResolvedFormula {
  formulaId: PippingFormulaId;
  current: string;
  nextIncrease: {
    level: number;
    formula: string;
  } | null;
  maximum?: {
    level?: number;
    formula: string;
  };
}

function signedCharisma(charismaModifier: number): string {
  const modifier = normalizedCharismaModifier(charismaModifier);
  return modifier >= 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
}

function normalizedCharismaModifier(charismaModifier: number): number {
  return Number.isFinite(charismaModifier) ? Math.trunc(charismaModifier) : 0;
}

function formatFormulaValue(
  definition: PippingFormulaDefinition,
  value: number,
  charismaModifier: number,
): string {
  if (definition.kind === "half-level-ceiling") return String(value);
  return `${value}d${definition.diceSize}${definition.addCharisma ? signedCharisma(charismaModifier) : ""}`;
}

export function resolvePippingActionFormula(
  formulaId: string | undefined,
  level: number,
  charismaModifier: number,
  _tier?: number,
): PippingResolvedFormula | null {
  if (!formulaId || !(formulaId in PIPPING_ACTION_FORMULAS)) return null;
  const resolvedFormulaId = formulaId as PippingFormulaId;
  const definition = PIPPING_ACTION_FORMULAS[resolvedFormulaId] as PippingFormulaDefinition;
  const actorLevel = normalizedLevel(level);
  const charisma = normalizedCharismaModifier(charismaModifier);

  if (definition.kind === "half-level-ceiling") {
    const currentValue = Math.ceil(actorLevel / 2) + charisma;
    const nextLevel = actorLevel % 2 === 0 ? actorLevel + 1 : actorLevel + 2;
    return {
      formulaId: resolvedFormulaId,
      current: formatFormulaValue(definition, currentValue, charisma),
      nextIncrease: actorLevel >= 20 ? null : {
        level: nextLevel,
        formula: formatFormulaValue(definition, Math.ceil(nextLevel / 2) + charisma, charisma),
      },
    };
  }

  const progression = resolveScalingProgression(definition.scaling, actorLevel);
  return {
    formulaId: resolvedFormulaId,
    current: formatFormulaValue(definition, progression.current, charisma),
    nextIncrease: progression.nextIncrease
      ? {
        level: progression.nextIncrease.level,
        formula: formatFormulaValue(definition, progression.nextIncrease.value, charisma),
      }
      : null,
    ...(progression.maximum === undefined
      ? {}
      : {
        maximum: {
          level: progression.maximumLevel,
          formula: formatFormulaValue(definition, progression.maximum, charisma),
        },
      }),
  };
}

export const getPippingActionFormulaProgression = resolvePippingActionFormula;

export function getPippingActionFormula(
  formulaId: string | undefined,
  level: number,
  charismaModifier: number,
  tier: number,
): string | null {
  return resolvePippingActionFormula(formulaId, level, charismaModifier, tier)?.current ?? null;
}
