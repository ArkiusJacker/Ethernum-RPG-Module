export type RuneWordCategory = "verb" | "noun" | "source";
export type RuneWordStatus = "canonical" | "legacy" | "test";

export interface RuneWordDefinition {
  id: string;
  labelKey: string;
  order: number;
  status: RuneWordStatus;
  /** Exact, language-independent migration inputs used only for legacy storage. */
  migrationAliases: readonly string[];
}

export interface RuneCatalog {
  schemaVersion: 2;
  verbs: readonly RuneWordDefinition[];
  nouns: readonly RuneWordDefinition[];
  sources: readonly RuneWordDefinition[];
}

export interface RuneWordOptionViewModel {
  value: string;
  label: string;
  selected: boolean;
  status: RuneWordStatus | "custom" | "unknown";
  legacy: boolean;
}

const canonical = (
  group: "Verbs" | "Nouns" | "Sources",
  id: string,
  order: number,
  ...migrationAliases: string[]
): RuneWordDefinition => Object.freeze({
  id,
  labelKey: `ETHERNUM.RuneCatalog.${group}.${id}`,
  order,
  status: "canonical" as const,
  migrationAliases: Object.freeze([id, ...migrationAliases]),
});

export const RUNE_CATALOG: RuneCatalog = Object.freeze({
  schemaVersion: 2,
  verbs: Object.freeze([
    canonical("Verbs", "criar", 1, "CRIAR", "CREATE"),
    canonical("Verbs", "trancar", 2, "TRANCAR", "LOCK"),
    canonical("Verbs", "liberar", 3, "LIBERAR", "RELEASE"),
    canonical("Verbs", "identificar", 4, "IDENTIFICAR", "IDENTIFY"),
    canonical("Verbs", "reparar", 5, "REPARAR", "REPAIR"),
    canonical("Verbs", "detonar", 6, "DETONAR", "DETONATE"),
    canonical("Verbs", "sustentar", 7, "SUSTENTAR", "SUSTAIN"),
    canonical("Verbs", "transportar", 8, "TRANSPORTAR", "TRANSPORT"),
    canonical("Verbs", "multiplicar", 9, "MULTIPLICAR", "MULTIPLY"),
    canonical("Verbs", "refletir", 10, "REFLETIR", "REFLECT"),
    canonical("Verbs", "destruir", 11, "DESTRUIR", "DESTROY"),
    canonical("Verbs", "atravessar", 12, "ATRAVESSAR", "TRAVERSE"),
    canonical("Verbs", "controlar", 13, "CONTROLAR", "CONTROL"),
    canonical("Verbs", "modificar", 14, "MODIFICAR", "MODIFY"),
    canonical("Verbs", "imitar", 15, "IMITAR", "IMITATE"),
    canonical("Verbs", "dominar", 16, "DOMINAR", "DOMINATE"),
    canonical("Verbs", "inflingir", 17, "INFLINGIR", "INFLICT"),
  ]),
  nouns: Object.freeze([
    canonical("Nouns", "fogo", 1, "Fogo", "Fire"),
    canonical("Nouns", "sombra", 2, "Sombra", "Shadow"),
    canonical("Nouns", "peso", 3, "Peso", "Weight"),
    canonical("Nouns", "aco", 4, "Aço", "Steel"),
    canonical("Nouns", "eletricidade", 5, "Eletricidade", "Electricity"),
    canonical("Nouns", "destino", 6, "Destino", "Fate"),
    canonical("Nouns", "outros", 7, "Outros", "Others"),
    canonical("Nouns", "velocidade", 8, "Velocidade", "Speed"),
    canonical("Nouns", "animais", 9, "Animais", "Animals"),
    canonical("Nouns", "plantas", 10, "Plantas", "Plants"),
    canonical("Nouns", "mente", 11, "Mente", "Mind"),
    canonical("Nouns", "ligacao", 12, "Ligação", "Bond"),
    canonical("Nouns", "som", 13, "Som", "Sound"),
    canonical("Nouns", "duracao", 14, "Duração", "Duration"),
    canonical("Nouns", "destreza", 15, "Destreza", "Dexterity"),
    canonical("Nouns", "ar", 16, "Ar", "Air"),
    canonical("Nouns", "corpo", 17, "Corpo", "Body"),
    canonical("Nouns", "ferocidade", 18, "Ferocidade", "Ferocity"),
    canonical("Nouns", "agua", 19, "Água", "Water"),
    canonical("Nouns", "vida", 20, "Vida", "Life"),
    canonical("Nouns", "luz", 21, "Luz", "Light"),
    canonical("Nouns", "madeira", 22, "Madeira", "Wood"),
    canonical("Nouns", "percepcao", 23, "Percepção", "Perception"),
    canonical("Nouns", "tempo", 24, "Tempo", "Time"),
  ]),
  sources: Object.freeze([
    canonical("Sources", "sangue", 1, "Sangue", "Blood"),
    canonical("Sources", "calor", 2, "Calor", "Heat"),
    canonical("Sources", "dor", 3, "Dor", "Pain"),
    canonical("Sources", "memoria", 4, "Memória", "Memory"),
    canonical("Sources", "forca", 5, "Força", "Strength"),
    canonical("Sources", "vigor", 6, "Vigor"),
    canonical("Sources", "destreza", 7, "Destreza", "Dexterity"),
    canonical("Sources", "velocidade", 8, "Velocidade", "Speed"),
    canonical("Sources", "personalidade", 9, "Personalidade", "Personality"),
    canonical("Sources", "inteligencia", 10, "Inteligência", "Intelligence"),
    canonical("Sources", "sabedoria", 11, "Sabedoria", "Wisdom"),
    canonical("Sources", "conhecimento", 12, "Conhecimento", "Knowledge"),
    canonical("Sources", "coragem", 13, "Coragem", "Courage"),
    canonical("Sources", "sanidade", 14, "Sanidade", "Sanity"),
    canonical("Sources", "amor", 15, "Amor", "Love"),
    canonical("Sources", "raiva", 16, "Raiva", "Anger"),
    canonical("Sources", "desejo", 17, "Desejo", "Desire"),
    canonical("Sources", "empatia", 18, "Empatia", "Empathy"),
    canonical("Sources", "sonho", 19, "Sonho", "Dream"),
  ]),
});

const LEGACY_VALUES: Readonly<Record<RuneWordCategory, ReadonlySet<string>>> = Object.freeze({
  verb: new Set(["IMBUIR", "TRAVAR", "AGENDAR", "MOLDAR", "EXECUTAR", "RASTREAR", "REESCREVER", "OTIMIZAR"]),
  noun: new Set(["Gelo", "Gravidade", "Natureza", "Sangue"]),
  source: new Set(["Éter"]),
});

function definitions(category: RuneWordCategory): readonly RuneWordDefinition[] {
  if (category === "verb") return RUNE_CATALOG.verbs;
  if (category === "noun") return RUNE_CATALOG.nouns;
  return RUNE_CATALOG.sources;
}

export function resolveCanonicalRuneWord(
  category: RuneWordCategory,
  value: unknown,
): RuneWordDefinition | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return definitions(category).find(definition => definition.migrationAliases.includes(value)) ?? null;
}

export function isLegacyRuneWord(category: RuneWordCategory, value: unknown): boolean {
  return typeof value === "string" && LEGACY_VALUES[category].has(value);
}

export function migrateStoredRuneWord(category: RuneWordCategory, value: unknown): unknown {
  return resolveCanonicalRuneWord(category, value)?.id ?? value;
}

export function localizeStoredRuneWord(
  category: RuneWordCategory,
  value: unknown,
  localize: (key: string) => string,
): string {
  if (typeof value !== "string" || value.length === 0) return "";
  const definition = resolveCanonicalRuneWord(category, value);
  return definition ? localize(definition.labelKey) : value;
}

export function buildRuneWordOptions(
  category: RuneWordCategory,
  selectedValue: unknown,
  customWords: readonly string[],
  localize: (key: string) => string,
): RuneWordOptionViewModel[] {
  const selected = typeof selectedValue === "string" ? selectedValue : "";
  const canonicalSelection = resolveCanonicalRuneWord(category, selected)?.id ?? selected;
  const canonicalOptions = definitions(category).map(definition => ({
    value: definition.id,
    label: localize(definition.labelKey),
    selected: canonicalSelection === definition.id,
    status: definition.status,
    legacy: false,
  }));
  const canonicalIds = new Set(canonicalOptions.map(option => option.value));
  const customOptions: RuneWordOptionViewModel[] = customWords
    .filter(word => word.length > 0 && !canonicalIds.has(word) && !resolveCanonicalRuneWord(category, word))
    .map(word => ({
      value: word,
      label: word,
      selected: selected === word,
      status: "custom" as const,
      legacy: false,
    }));
  const alreadyRepresented = canonicalOptions.some(option => option.selected)
    || customOptions.some(option => option.selected)
    || selected.length === 0;
  if (!alreadyRepresented) {
    const legacy = isLegacyRuneWord(category, selected);
    customOptions.push({
      value: selected,
      label: selected,
      selected: true,
      status: legacy ? "legacy" : "unknown",
      legacy,
    });
  }
  return [...canonicalOptions, ...customOptions];
}
