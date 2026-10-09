import { execFileSync } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { soundEffects, soundPath } from "../scripts/soundbank.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(scriptDirectory, "..");
const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index < 0 ? null : args[index + 1] ?? null;
};
const root = resolve(valueAfter("--root") ?? defaultRoot);
const zipPath = valueAfter("--zip");
const expectedVersion = valueAfter("--expected-version");
const errors = [];
const requiredZipFiles = new Set(["module.json"]);

async function requiredFile(path, label = path) {
  try { await access(path); }
  catch { errors.push(`Missing ${label}: ${path}`); }
}

const manifestPath = join(root, "module.json");
let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
catch (error) { errors.push(`Invalid module.json: ${error.message}`); }

if (manifest) {
  if (manifest.id !== "ethernum-v-redhand") errors.push(`Unexpected module id: ${manifest.id}`);
  if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/i.test(manifest.version ?? "")) errors.push(`Invalid module version: ${manifest.version}`);
  if (expectedVersion && manifest.version !== expectedVersion) errors.push(`Expected version ${expectedVersion}, found ${manifest.version}`);
  if (!manifest.socket) errors.push("module.json must enable the module socket");
  if (!manifest.esmodules?.length) errors.push("module.json has no esmodules entry");
  if (manifest.relationships?.modules?.find(entry => entry.id === "ethernum-rpg-module")?.compatibility?.minimum !== "3.8.11") {
    errors.push("The base-module minimum must remain 3.8.11");
  }
  const referencedFiles = [...(manifest.esmodules ?? []), ...(manifest.styles ?? []), ...(manifest.languages ?? []).map(entry => entry.path), manifest.readme].filter(Boolean);
  for (const path of referencedFiles) {
    requiredZipFiles.add(path);
    await requiredFile(join(root, path), `manifest reference ${path}`);
  }
  for (const stylesheet of manifest.styles ?? []) {
    try {
      const source = await readFile(join(root, stylesheet), "utf8");
      const assets = [...source.matchAll(/url\(["']?([^"')]+)["']?\)/gi)].map(match => match[1].trim());
      for (const asset of assets) {
        if (/^(?:data:|https?:|\/\/)/i.test(asset)) continue;
        const resolved = resolve(dirname(join(root, stylesheet)), asset.split(/[?#]/)[0]);
        if (!resolved.startsWith(`${root}${sep}`)) errors.push(`Stylesheet asset escapes add-on root: ${stylesheet} -> ${asset}`);
        else {
          requiredZipFiles.add(relative(root, resolved).split(sep).join("/"));
          await requiredFile(resolved, `stylesheet asset ${asset}`);
        }
      }
    } catch (error) { errors.push(`Could not read stylesheet ${stylesheet}: ${error.message}`); }
  }

  const visited = new Set();
  async function verifyImports(relativePath) {
    const normalized = relativePath.split("/").join(sep);
    const absolutePath = resolve(root, normalized);
    if (!absolutePath.startsWith(`${root}${sep}`) || visited.has(absolutePath)) return;
    visited.add(absolutePath);
    requiredZipFiles.add(relative(root, absolutePath).split(sep).join("/"));
    let source;
    try { source = await readFile(absolutePath, "utf8"); }
    catch { errors.push(`Missing imported module: ${relativePath}`); return; }
    const imports = [...source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)].map(match => match[1]);
    for (const specifier of imports) {
      if (!specifier.endsWith(".js")) {
        errors.push(`Import must include an explicit .js suffix: ${relativePath} -> ${specifier}`);
        continue;
      }
      const target = resolve(dirname(absolutePath), specifier);
      await verifyImports(relative(root, target).split(sep).join("/"));
    }
  }
  for (const entry of manifest.esmodules ?? []) await verifyImports(entry);
}

const soundbankPath = join(root, "audio", "soundbank.json");
try {
  const bank = JSON.parse(await readFile(soundbankPath, "utf8"));
  if (bank.moduleId !== "ethernum-v-redhand") errors.push("SFX bank moduleId does not match the add-on");
  const knownSounds = new Set(soundEffects.map(sound => sound.id));
  for (const event of bank.events ?? []) {
    for (const soundId of Array.isArray(event.audio) ? event.audio : [event.audio]) {
      if (soundId && !knownSounds.has(soundId)) errors.push(`SFX event ${event.trigger} references unknown sound ${soundId}`);
    }
  }
  for (const sound of soundEffects) {
    const path = soundPath(sound).replace("modules/ethernum-v-redhand/", "");
    requiredZipFiles.add(path);
    await requiredFile(join(root, path), `SFX ${sound.id}`);
  }
} catch (error) {
  errors.push(`Invalid soundbank or audio reference: ${error.message}`);
}

async function walk(directory, prefix = "") {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    const local = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) output.push(...await walk(path, local));
    else output.push(local);
  }
  return output;
}

if (zipPath) {
  try {
    let listing;
    let canCheckIntegrity = true;
    try { listing = execFileSync("unzip", ["-Z1", resolve(zipPath)], { encoding: "utf8" }); }
    catch {
      if (process.platform !== "win32") throw new Error("unzip command is required to inspect this archive");
      listing = execFileSync("tar", ["-tf", resolve(zipPath)], { encoding: "utf8" });
      canCheckIntegrity = false;
    }
    const entries = listing.split(/\r?\n/).filter(Boolean).map(entry => entry.replace(/\\/g, "/"));
    if (!entries.includes("module.json")) errors.push("ZIP must place module.json at its root");
    for (const required of requiredZipFiles) {
      if (!entries.includes(required)) errors.push(`ZIP is missing ${required}`);
    }
    if (canCheckIntegrity) execFileSync("unzip", ["-t", resolve(zipPath)], { stdio: "ignore" });
  } catch (error) {
    errors.push(`ZIP validation failed: ${error.message}`);
  }
}

if (errors.length) {
  console.error(errors.map(error => `ERROR ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  const files = await walk(root);
  console.log(`V RedHand package valid: ${manifest.version}; ${files.length} source files; ${soundEffects.length} registered SFX.`);
}
