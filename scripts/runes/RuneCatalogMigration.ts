import {
  RUNE_CATALOG,
  isLegacyRuneWord,
  migrateStoredRuneWord,
  type RuneWordCategory,
} from "./RuneCatalog.js";

export interface RuneCatalogMigrationSummary {
  converted: number;
  legacy: number;
  unknown: number;
}

export interface RuneCatalogMigrationResult<T extends Record<string, unknown>> {
  runes: T[];
  catalogSchemaVersion: 2;
  summary: RuneCatalogMigrationSummary;
}

const FIELDS: ReadonlyArray<readonly ["verb" | "noun" | "source", RuneWordCategory]> = [
  ["verb", "verb"],
  ["noun", "noun"],
  ["source", "source"],
];

export function migrateRuneCatalog<T extends Record<string, unknown>>(
  input: readonly T[],
  customWords: Partial<Record<"verbs" | "nouns" | "sources", readonly string[]>> = {},
): RuneCatalogMigrationResult<T> {
  const summary: RuneCatalogMigrationSummary = { converted: 0, legacy: 0, unknown: 0 };
  const custom = new Set([
    ...(customWords.verbs ?? []),
    ...(customWords.nouns ?? []),
    ...(customWords.sources ?? []),
  ]);
  const runes = input.map(source => {
    const rune: Record<string, unknown> = { ...source };
    for (const [field, category] of FIELDS) {
      const current = rune[field];
      if (typeof current !== "string" || current.length === 0) continue;
      const migrated = migrateStoredRuneWord(category, current);
      if (migrated !== current) {
        rune[field] = migrated;
        summary.converted += 1;
      } else if (isLegacyRuneWord(category, current)) {
        summary.legacy += 1;
      } else if (!custom.has(current)) {
        summary.unknown += 1;
      }
    }
    return rune as T;
  });
  return { runes, catalogSchemaVersion: RUNE_CATALOG.schemaVersion, summary };
}
