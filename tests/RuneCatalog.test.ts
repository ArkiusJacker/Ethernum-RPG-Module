import { describe, expect, it } from "vitest";
import {
  RUNE_CATALOG,
  buildRuneWordOptions,
  localizeStoredRuneWord,
  migrateStoredRuneWord,
  resolveCanonicalRuneWord,
} from "../scripts/runes/RuneCatalog.js";
import { migrateRuneCatalog } from "../scripts/runes/RuneCatalogMigration.js";

const labels = (key: string) => `localized:${key}`;

describe("canonical rune catalog", () => {
  it("publishes the exact canonical editorial order with stable ids", () => {
    expect(RUNE_CATALOG.schemaVersion).toBe(2);
    expect(RUNE_CATALOG.verbs.map(word => word.id)).toEqual([
      "criar", "trancar", "liberar", "identificar", "reparar", "detonar", "sustentar",
      "transportar", "multiplicar", "refletir", "destruir", "atravessar", "controlar",
      "modificar", "imitar", "dominar", "inflingir",
    ]);
    expect(RUNE_CATALOG.nouns.map(word => word.id)).toEqual([
      "fogo", "sombra", "peso", "aco", "eletricidade", "destino", "outros", "velocidade",
      "animais", "plantas", "mente", "ligacao", "som", "duracao", "destreza", "ar", "corpo",
      "ferocidade", "agua", "vida", "luz", "madeira", "percepcao", "tempo",
    ]);
    expect(RUNE_CATALOG.sources.map(word => word.id)).toEqual([
      "sangue", "calor", "dor", "memoria", "forca", "vigor", "destreza", "velocidade",
      "personalidade", "inteligencia", "sabedoria", "conhecimento", "coragem", "sanidade",
      "amor", "raiva", "desejo", "empatia", "sonho",
    ]);
    for (const group of [RUNE_CATALOG.verbs, RUNE_CATALOG.nouns, RUNE_CATALOG.sources]) {
      expect(group.every((word, index) => word.order === index + 1)).toBe(true);
      expect(new Set(group.map(word => word.id)).size).toBe(group.length);
    }
  });

  it("normalizes only exact canonical aliases and preserves legacy, custom, and unknown words", () => {
    const result = migrateRuneCatalog([
      { id: "canonical", verb: "CRIAR", noun: "Fogo", source: "Sangue", dc: 31, costValue: 7, effect: "kept" },
      { id: "legacy", verb: "TRAVAR", noun: "Gelo", source: "Éter", dc: 44, costValue: 9 },
      { id: "custom", verb: "SONDAR", noun: "Portais", source: "Esperança", custom: true },
      { id: "unknown", verb: "valor-desconhecido", noun: "???", source: "x" },
    ], { verbs: ["SONDAR"], nouns: ["Portais"], sources: ["Esperança"] });

    expect(result.runes[0]).toEqual({
      id: "canonical", verb: "criar", noun: "fogo", source: "sangue", dc: 31, costValue: 7, effect: "kept",
    });
    expect(result.runes[1]).toMatchObject({ verb: "TRAVAR", noun: "Gelo", source: "Éter", dc: 44, costValue: 9 });
    expect(result.runes[2]).toMatchObject({ verb: "SONDAR", noun: "Portais", source: "Esperança", custom: true });
    expect(result.runes[3]).toMatchObject({ verb: "valor-desconhecido", noun: "???", source: "x" });
    expect(result.summary).toEqual({ converted: 3, legacy: 3, unknown: 3 });
    expect(migrateRuneCatalog(result.runes).runes).toEqual(result.runes);
  });

  it("keeps legacy values selectable without offering them as canonical choices", () => {
    const options = buildRuneWordOptions("verb", "TRAVAR", [], labels);
    expect(options.filter(option => option.status === "canonical").some(option => option.value === "TRAVAR")).toBe(false);
    expect(options.at(-1)).toMatchObject({ value: "TRAVAR", selected: true, status: "legacy", legacy: true });
    expect(localizeStoredRuneWord("noun", "Fogo", labels)).toContain("RuneCatalog.Nouns.fogo");
    expect(migrateStoredRuneWord("verb", "TRAVAR")).toBe("TRAVAR");
    expect(resolveCanonicalRuneWord("verb", "TRANCAR")?.id).toBe("trancar");
    expect(buildRuneWordOptions("verb", "???", [], labels).at(-1)).toMatchObject({
      status: "unknown",
      legacy: false,
    });
  });
});
