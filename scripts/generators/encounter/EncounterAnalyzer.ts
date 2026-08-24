import type {
  EncounterAnalysis,
  EncounterAnalysisInput,
  EncounterBudgets,
  EncounterContribution,
  EncounterParticipant,
} from "./EncounterAnalyzerTypes.js";

const XP_BY_RELATIVE_LEVEL: Readonly<Record<number, number>> = {
  [-4]: 10, [-3]: 15, [-2]: 20, [-1]: 30, 0: 40, 1: 60, 2: 80, 3: 120, 4: 160,
};

function level(value: unknown): number {
  const parsed = Number(value);
  return Math.max(0, Math.min(30, Number.isFinite(parsed) ? Math.floor(parsed) : 0));
}

function normalized(values: readonly EncounterParticipant[], disposition: EncounterParticipant["disposition"]): EncounterParticipant[] {
  return values.flatMap((entry, index) => {
    const name = String(entry.name ?? "").trim().slice(0, 180);
    return name ? [{ id: String(entry.id || `${disposition}-${index}`), name, level: level(entry.level), disposition }] : [];
  });
}

export function encounterBudgets(partySize: number): EncounterBudgets {
  const adjustment = Math.max(-3, Math.min(8, Math.floor(partySize) - 4));
  return {
    trivial: Math.max(10, 40 + adjustment * 10),
    low: Math.max(15, 60 + adjustment * 15),
    moderate: Math.max(20, 80 + adjustment * 20),
    severe: Math.max(30, 120 + adjustment * 30),
    extreme: Math.max(40, 160 + adjustment * 40),
  };
}

function difficulty(xp: number, budgets: EncounterBudgets): EncounterAnalysis["difficulty"] {
  if (xp > budgets.extreme) return "beyond-extreme";
  if (xp >= budgets.extreme) return "extreme";
  if (xp >= budgets.severe) return "severe";
  if (xp >= budgets.moderate) return "moderate";
  if (xp >= budgets.low) return "low";
  return "trivial";
}

export function analyzeEncounter(raw: EncounterAnalysisInput, now = Date.now()): EncounterAnalysis {
  const party = normalized(raw.party, "party");
  const enemies = normalized(raw.enemies, "enemy");
  const warnings: string[] = [];
  const partySize = party.length;
  const partyLevel = partySize
    ? Math.round(party.reduce((sum, member) => sum + member.level, 0) / partySize)
    : 0;
  const mixedPartyLevels = new Set(party.map(member => member.level)).size > 1;
  if (!partySize) warnings.push("Nenhum personagem jogador foi encontrado no encontro atual.");
  if (!enemies.length) warnings.push("Nenhum inimigo foi encontrado no encontro atual.");
  if (mixedPartyLevels) warnings.push(`O grupo possui níveis mistos; o diagnóstico usa a média arredondada ${partyLevel}.`);

  const contributions: EncounterContribution[] = enemies.map(enemy => {
    const relativeLevel = enemy.level - partyLevel;
    if (relativeLevel < -4) return { ...enemy, relativeLevel, xp: 0, warning: "Abaixo de nível do grupo -4; confirme o XP no PF2e." };
    if (relativeLevel > 4) return { ...enemy, relativeLevel, xp: 160, warning: "Acima de nível do grupo +4; encontro potencialmente desproporcional." };
    return { ...enemy, relativeLevel, xp: XP_BY_RELATIVE_LEVEL[relativeLevel] ?? 0 };
  });
  warnings.push(...contributions.flatMap(entry => entry.warning ? [`${entry.name}: ${entry.warning}`] : []));
  const calculatedXp = contributions.reduce((sum, entry) => sum + entry.xp, 0);
  const preparedXp = Number(raw.preparedXp);
  const usePrepared = Number.isFinite(preparedXp) && preparedXp >= 0;
  const xp = usePrepared ? Math.floor(preparedXp) : calculatedXp;
  if (usePrepared && xp !== calculatedXp) warnings.push(`O XP preparado pelo PF2e (${xp}) difere do cálculo por nível (${calculatedXp}).`);
  const budgets = encounterBudgets(partySize || 4);
  const rating = difficulty(xp, budgets);
  if (rating === "beyond-extreme") warnings.push("O orçamento excede Extremo. Revise a composição antes da sessão.");
  return {
    encounterName: String(raw.encounterName || "Encontro atual").trim().slice(0, 180),
    partySize,
    partyLevel,
    partyAdjustment: (partySize || 4) - 4,
    mixedPartyLevels,
    xp,
    xpSource: usePrepared ? "prepared" : "calculated",
    difficulty: rating,
    budgets,
    contributions,
    warnings,
    analyzedAt: now,
  };
}
