import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function flatten(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
}

function loadLocale(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(root, "lang", name), "utf8")) as Record<string, unknown>;
}

describe("localization parity", () => {
  const pt = loadLocale("pt-BR.json");
  const en = loadLocale("en.json");

  it("keeps exactly the same translation keys in PT-BR and EN", () => {
    expect(flatten(pt).sort()).toEqual(flatten(en).sort());
  });

  it("resolves every explicit Ethernum key used by the modified templates", () => {
    const keys = new Set(flatten(pt));
    for (const templateName of [
      "ether-runes-tab.html",
      "ethernum-field-communicator.html",
      "ethernum-gm-control-tab.html",
    ]) {
      const template = readFileSync(resolve(root, "templates", templateName), "utf8");
      const referenced = template.matchAll(/localize\s+["'](ETHERNUM\.[^"']+)["']/g);
      for (const match of referenced) expect(keys.has(match[1]), `${templateName}: ${match[1]}`).toBe(true);
    }
    for (const scriptName of [
      "scripts/communicator/FieldCommunicatorService.ts",
      "scripts/contracts/CommunicatorDocumentViewer.ts",
      "scripts/ui/FieldCommunicatorOverlay.ts",
      "scripts/ui/FieldCommunicatorView.ts",
      "scripts/ui/gm-control/ModernDialogService.ts",
    ]) {
      const script = readFileSync(resolve(root, scriptName), "utf8");
      const referenced = script.matchAll(/localize\(\s*["'](ETHERNUM\.[^"']+)["']/g);
      for (const match of referenced) expect(keys.has(match[1]), `${scriptName}: ${match[1]}`).toBe(true);
    }
  });

  it("keeps visible communicator copy localized, except for product marks", () => {
    const template = readFileSync(resolve(root, "templates", "ethernum-field-communicator.html"), "utf8");
    const withoutMarks = template
      .replaceAll("Ethernum Company", "")
      .replaceAll("Gamemaster", "")
      .replaceAll(/<[^>]+>/g, "")
      .replaceAll(/\{\{[^}]+\}\}/g, "")
      .replaceAll(/\s+/g, " ")
      .trim();
    expect(withoutMarks).not.toMatch(/[A-Za-zÀ-ÿ]{2,}/);
  });
});
