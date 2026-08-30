import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzePackageSize } from "../tools/report-package-size.mjs";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ethernum-size-"));
  roots.push(root);
  mkdirSync(join(root, "assets", "runtime"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, "assets", "runtime", "large.bin"), Buffer.alloc(30));
  writeFileSync(join(root, "scripts", "ethernum.js"), Buffer.alloc(10));
  return root;
}

describe("package size report", () => {
  it("reports deterministic totals and largest files/directories", () => {
    const report = analyzePackageSize({ root: fixture(), limits: { distBytes: 100, zipBytes: 100, largestFileBytes: 100 } });
    expect(report).toMatchObject({ distBytes: 40, fileCount: 2, warnings: [], forbiddenRuntimeFiles: [] });
    expect(report.largestFiles[0]).toEqual({ path: "assets/runtime/large.bin", bytes: 30 });
    expect(report.largestDirectories[0]).toEqual({ path: "assets", bytes: 30 });
  });

  it("warns on abnormal growth without throwing and detects QA leakage separately", () => {
    const root = fixture();
    mkdirSync(join(root, "docs", "qa"), { recursive: true });
    writeFileSync(join(root, "docs", "qa", "evidence.png"), Buffer.alloc(20));
    writeFileSync(join(root, "assets", "runtime", "duplicate.bin"), Buffer.alloc(30));
    const report = analyzePackageSize({
      root,
      baseline: { distBytes: 20, zipBytes: 0 },
      limits: { distBytes: 45, zipBytes: 100, largestFileBytes: 25 },
    });
    expect(report.warnings).toContain("dist grew 350% from baseline");
    expect(report.warnings.some(message => message.startsWith("dist exceeds"))).toBe(true);
    expect(report.warnings.some(message => message.startsWith("largest file exceeds"))).toBe(true);
    expect(report.forbiddenRuntimeFiles).toEqual(["docs/qa/evidence.png"]);
    expect(report.duplicateFiles[0].paths).toEqual([
      "assets/runtime/duplicate.bin",
      "assets/runtime/large.bin",
    ]);
  });
});
