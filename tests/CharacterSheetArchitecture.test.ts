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
});
