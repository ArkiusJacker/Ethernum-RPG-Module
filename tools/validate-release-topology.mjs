import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

export function evaluateReleaseTopology({ tagCommit, mainCommit, mergeBase }) {
  const normalized = {
    tagCommit: String(tagCommit ?? "").trim(),
    mainCommit: String(mainCommit ?? "").trim(),
    mergeBase: String(mergeBase ?? "").trim(),
  };
  return {
    ...normalized,
    tagAncestorOfMain: normalized.tagCommit !== "" && normalized.mergeBase === normalized.tagCommit,
  };
}

export function inspectReleaseTopology({ tagRef, mainRef }) {
  const tagCommit = git(["rev-parse", `${tagRef}^{commit}`]);
  const mainCommit = git(["rev-parse", `${mainRef}^{commit}`]);
  const mergeBase = git(["merge-base", tagCommit, mainCommit]);
  return evaluateReleaseTopology({ tagCommit, mainCommit, mergeBase });
}

function parseArguments(argv) {
  const options = { tagRef: "", mainRef: "origin/main" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!["--tag-ref", "--main-ref"].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    options[argument === "--tag-ref" ? "tagRef" : "mainRef"] = value;
    index += 1;
  }
  if (!options.tagRef) throw new Error("--tag-ref is required");
  return options;
}

function main() {
  const topology = inspectReleaseTopology(parseArguments(process.argv.slice(2)));
  console.log(`Tag commit:  ${topology.tagCommit}`);
  console.log(`Main commit: ${topology.mainCommit}`);
  console.log(`Merge base:  ${topology.mergeBase}`);
  if (!topology.tagAncestorOfMain) {
    throw new Error("Release tag commit is not present in main history");
  }
  console.log("Release topology valid: tag commit is an ancestor of main.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error) {
    console.error(`Release topology validation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
