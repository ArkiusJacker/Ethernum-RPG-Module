import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const MIB = 1024 * 1024;
const DEFAULT_LIMITS = Object.freeze({ distBytes: 50 * MIB, zipBytes: 45 * MIB, largestFileBytes: 20 * MIB });

function normalized(path) {
  return path.split(sep).join("/");
}

function filesUnder(root) {
  const files = [];
  const visit = current => {
    for (const name of readdirSync(current)) {
      const absolute = resolve(current, name);
      const stats = statSync(absolute);
      if (stats.isDirectory()) visit(absolute);
      else files.push({ path: normalized(relative(root, absolute)), bytes: stats.size });
    }
  };
  visit(root);
  return files.sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path));
}

function directoryTotals(files) {
  const totals = new Map();
  for (const file of files) {
    const parts = file.path.split("/");
    for (let depth = 1; depth < parts.length; depth += 1) {
      const path = parts.slice(0, depth).join("/");
      totals.set(path, (totals.get(path) ?? 0) + file.bytes);
    }
  }
  return [...totals].map(([path, bytes]) => ({ path, bytes }))
    .sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path));
}

function percentageGrowth(current, baseline) {
  return baseline > 0 ? Math.round(((current - baseline) / baseline) * 10_000) / 100 : null;
}

function exactDuplicates(root, files) {
  const byDigest = new Map();
  for (const file of files.filter(candidate => candidate.bytes > 0)) {
    const digest = createHash("sha256").update(readFileSync(resolve(root, file.path))).digest("hex");
    const group = byDigest.get(digest) ?? { sha256: digest, bytesEach: file.bytes, paths: [] };
    group.paths.push(file.path);
    byDigest.set(digest, group);
  }
  return [...byDigest.values()].filter(group => group.paths.length > 1)
    .sort((left, right) => right.bytesEach * right.paths.length - left.bytesEach * left.paths.length);
}

export function analyzePackageSize({ root, zip = "", baseline = null, limits = DEFAULT_LIMITS }) {
  const absoluteRoot = resolve(root);
  if (!existsSync(absoluteRoot) || !statSync(absoluteRoot).isDirectory()) throw new Error(`Distribution directory does not exist: ${absoluteRoot}`);
  const files = filesUnder(absoluteRoot);
  const distBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const zipBytes = zip && existsSync(resolve(zip)) ? statSync(resolve(zip)).size : null;
  const warnings = [];
  if (distBytes > limits.distBytes) warnings.push(`dist exceeds ${limits.distBytes} bytes`);
  if (zipBytes !== null && zipBytes > limits.zipBytes) warnings.push(`zip exceeds ${limits.zipBytes} bytes`);
  if ((files[0]?.bytes ?? 0) > limits.largestFileBytes) warnings.push(`largest file exceeds ${limits.largestFileBytes} bytes`);
  const baselineDist = Number(baseline?.distBytes ?? 0);
  const baselineZip = Number(baseline?.zipBytes ?? 0);
  const distGrowthPercent = percentageGrowth(distBytes, baselineDist);
  const zipGrowthPercent = zipBytes === null ? null : percentageGrowth(zipBytes, baselineZip);
  if (distGrowthPercent !== null && distGrowthPercent > 20) warnings.push(`dist grew ${distGrowthPercent}% from baseline`);
  if (zipGrowthPercent !== null && zipGrowthPercent > 20) warnings.push(`zip grew ${zipGrowthPercent}% from baseline`);
  const forbiddenRuntimeFiles = files.filter(file => /^(?:docs\/qa|qa)(?:\/|$)/i.test(file.path)).map(file => file.path);
  const duplicateFiles = exactDuplicates(absoluteRoot, files);
  const sourceArtFiles = files.filter(file => /\.(?:psd|psb|xcf|kra|ai|tiff?)$/i.test(file.path)).map(file => file.path);
  const bundledCampaignDocuments = files.filter(file => /\.(?:pdf|docx?|pptx?)$/i.test(file.path)).map(file => file.path);
  return {
    generatedAt: new Date().toISOString(),
    distBytes,
    zipBytes,
    fileCount: files.length,
    largestFiles: files.slice(0, 15),
    largestDirectories: directoryTotals(files).slice(0, 15),
    baseline: baseline ? { distBytes: baselineDist, zipBytes: baselineZip, distGrowthPercent, zipGrowthPercent } : null,
    warnings,
    forbiddenRuntimeFiles,
    duplicateFiles,
    sourceArtFiles,
    bundledCampaignDocuments,
  };
}

function argumentsFrom(argv) {
  const options = { root: "dist", zip: "", output: "", baseline: "" };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!["--root", "--zip", "--output", "--baseline"].includes(key) || !value) throw new Error(`Invalid package-size argument: ${key ?? ""}`);
    options[key.slice(2)] = value;
  }
  return options;
}

function formatMiB(bytes) {
  return bytes === null ? "n/a" : `${(bytes / MIB).toFixed(2)} MiB`;
}

function main() {
  const options = argumentsFrom(process.argv.slice(2));
  const baseline = options.baseline && existsSync(resolve(options.baseline)) ? JSON.parse(readFileSync(resolve(options.baseline), "utf8")) : null;
  const report = analyzePackageSize({ root: options.root, zip: options.zip, baseline });
  if (options.output) writeFileSync(resolve(options.output), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Package size: dist ${formatMiB(report.distBytes)}, zip ${formatMiB(report.zipBytes)}, ${report.fileCount} files.`);
  console.log("Largest files:");
  report.largestFiles.slice(0, 8).forEach(file => console.log(`- ${file.path}: ${formatMiB(file.bytes)}`));
  console.log("Largest directories:");
  report.largestDirectories.slice(0, 8).forEach(directory => console.log(`- ${directory.path}: ${formatMiB(directory.bytes)}`));
  report.warnings.forEach(warning => console.warn(`Package size warning: ${warning}`));
  console.log(`Exact duplicate groups: ${report.duplicateFiles.length}. Source-art files: ${report.sourceArtFiles.length}. Bundled documents: ${report.bundledCampaignDocuments.length}.`);
  if (report.forbiddenRuntimeFiles.length > 0) throw new Error(`QA documentation leaked into runtime package: ${report.forbiddenRuntimeFiles.join(", ")}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try { main(); } catch (error) { console.error(`Package size report failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
}
