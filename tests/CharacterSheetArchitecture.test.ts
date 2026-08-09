import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function TypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? TypeScriptFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

describe("Character Sheet architecture", () => {
  it("does not import the unique mechanics kernel or legacy facade", () => {
    const sources = TypeScriptFiles(join(process.cwd(), "scripts", "sheets"))
      .map(path => readFileSync(path, "utf8"))
      .join("\n");
    expect(sources).not.toContain("UniqueMechanicsKernel");
    expect(sources).not.toContain("UniqueMechanicsLegacy");
  });

  it("keeps changed character-sheet labels in both locale catalogs", () => {
    const pt = JSON.parse(readFileSync(join(process.cwd(), "lang", "pt-BR.json"), "utf8"));
    const en = JSON.parse(readFileSync(join(process.cwd(), "lang", "en.json"), "utf8"));
    const keys = [
      ["Inventory", "Bulk"],
      ["Inventory", "Stowed"],
      ["Inventory", "Categories", "Weapons"],
      ["Spellcasting", "Cantrips"],
      ["Spellcasting", "Rank"],
      ["Spellcasting", "Cast"],
      ["CombatMomentum", "Active"],
      ["CombatMomentum", "Waiting"],
      ["EtherPanel", "Power"],
    ];
    const at = (catalog: Record<string, unknown>, path: string[]) => path.reduce<unknown>(
      (value, key) => (value as Record<string, unknown>)?.[key],
      (catalog.ETHERNUM as Record<string, unknown>).CharacterSheet,
    );
    for (const key of keys) {
      expect(at(pt, key), `pt-BR ${key.join(".")}`).toBeTypeOf("string");
      expect(at(en, key), `en ${key.join(".")}`).toBeTypeOf("string");
    }

    const presentation = readFileSync(join(
      process.cwd(), "scripts", "sheets", "core", "CharacterSheetPresentation.ts",
    ), "utf8");
    expect(presentation).toContain('localize("ETHERNUM.CharacterSheet.Inventory.Categories.Weapons"');
    expect(presentation).toContain('localize("ETHERNUM.CharacterSheet.CombatMomentum.Active"');
    expect(presentation).toContain('localize("ETHERNUM.CharacterSheet.EtherPanel.Power"');
  });
});
