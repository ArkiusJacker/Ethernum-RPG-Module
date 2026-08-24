import type {
  LootCandidate,
  LootCategory,
  LootGenerationInput,
  LootManifest,
  LootManifestItem,
  LootRarity,
} from "./LootGeneratorTypes.js";

const RARITIES = new Set<LootRarity>(["common", "uncommon", "rare", "unique"]);
const CATEGORIES = new Set<LootCategory>(["treasure", "consumable", "permanent"]);

function integer(value: unknown, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Math.max(minimum, Math.min(maximum, Number.isFinite(parsed) ? Math.floor(parsed) : minimum));
}

function strings<T extends string>(value: readonly T[], allowed: ReadonlySet<T>): T[] {
  return Array.from(new Set(value.filter(entry => allowed.has(entry))));
}

function normalizeInput(input: LootGenerationInput): LootGenerationInput {
  const minimumItemLevel = integer(input.minimumItemLevel, 0, 30);
  const maximumItemLevel = Math.max(minimumItemLevel, integer(input.maximumItemLevel, 0, 30));
  return {
    partyLevel: integer(input.partyLevel, 0, 30),
    partySize: integer(input.partySize, 1, 12),
    encounterLevel: integer(input.encounterLevel, 0, 30),
    minimumItemLevel,
    maximumItemLevel,
    rarities: strings(input.rarities, RARITIES),
    categories: strings(input.categories, CATEGORIES),
    types: Array.from(new Set((input.types ?? []).map(value => value.trim().toLowerCase()).filter(Boolean))).slice(0, 40),
    traits: Array.from(new Set((input.traits ?? []).map(value => value.trim().toLowerCase()).filter(Boolean))).slice(0, 40),
    allowedSources: Array.from(new Set(input.allowedSources.map(value => value.trim()).filter(Boolean))).slice(0, 100),
    budgetCopper: integer(input.budgetCopper, 0, 100_000_000),
    seed: String(input.seed || "ethernum").trim().slice(0, 160) || "ethernum",
  };
}

function seedValue(seed: string): number {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function randomFactory(seed: string): () => number {
  let state = seedValue(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}

function manifestId(input: LootGenerationInput, candidates: readonly LootCandidate[]): string {
  const signature = `${JSON.stringify(input)}|${candidates.map(candidate => candidate.uuid).sort().join("|")}`;
  return `loot-${seedValue(signature).toString(36).padStart(7, "0")}`;
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return result;
}

export function generateLootManifest(
  rawInput: LootGenerationInput,
  sourceCandidates: readonly LootCandidate[],
  now = Date.now(),
): LootManifest {
  const input = normalizeInput(rawInput);
  const warnings: string[] = [];
  const candidates = sourceCandidates.filter(candidate => {
    if (!candidate.uuid || !candidate.name || candidate.priceCopper < 0) return false;
    if (candidate.level < input.minimumItemLevel || candidate.level > input.maximumItemLevel) return false;
    if (input.rarities.length && !input.rarities.includes(candidate.rarity)) return false;
    if (input.categories.length && !input.categories.includes(candidate.category)) return false;
    if (input.types.length && !input.types.includes(candidate.type.toLowerCase())) return false;
    if (input.traits.length && !input.traits.every(trait => candidate.traits.map(value => value.toLowerCase()).includes(trait))) return false;
    if (input.allowedSources.length && !input.allowedSources.includes(candidate.sourceId)) return false;
    return true;
  });

  if (candidates.length === 0) warnings.push("Nenhum Item PF2e real corresponde aos filtros selecionados.");
  const random = randomFactory(input.seed);
  const ordered = shuffled(candidates, random).sort((left, right) => {
    const leftDistance = Math.abs(left.level - input.encounterLevel);
    const rightDistance = Math.abs(right.level - input.encounterLevel);
    return leftDistance - rightDistance;
  });
  const targetCount = Math.max(1, Math.min(12, input.partySize + (input.encounterLevel > input.partyLevel ? 1 : 0)));
  const selected: LootManifestItem[] = [];
  let remaining = input.budgetCopper;
  for (const candidate of ordered) {
    if (selected.length >= targetCount) break;
    if (candidate.priceCopper > remaining) continue;
    selected.push({ ...candidate, quantity: 1, subtotalCopper: candidate.priceCopper });
    remaining -= candidate.priceCopper;
  }

  if (selected.length === 0 && candidates.length > 0 && input.budgetCopper > 0) {
    warnings.push("O orçamento não comporta nenhum dos itens filtrados; o valor foi preservado como moeda.");
  }
  if (selected.length < Math.min(targetCount, candidates.length) && remaining === 0) {
    warnings.push("O orçamento foi totalmente consumido antes de preencher a quantidade sugerida.");
  }
  const specialCandidate = candidates
    .filter(candidate => candidate.rarity !== "common" && !selected.some(item => item.uuid === candidate.uuid))
    .sort((left, right) => right.level - left.level || left.name.localeCompare(right.name))[0];
  const spentCopper = selected.reduce((sum, item) => sum + item.subtotalCopper, 0);
  return {
    manifestId: manifestId(input, selected),
    seed: input.seed,
    input,
    items: selected,
    ...(specialCandidate ? { specialCandidate } : {}),
    spentCopper,
    currencyCopper: Math.max(0, input.budgetCopper - spentCopper),
    totalCopper: input.budgetCopper,
    candidateCount: candidates.length,
    warnings,
    generatedAt: now,
  };
}
