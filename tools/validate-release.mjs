import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const MODULE_ID = "ethernum-rpg-module";

function parseArguments(argv) {
  const options = {
    manifest: "module.json",
    root: ".",
    expectedVersion: "",
    zip: "",
    checkImports: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check-imports") {
      options.checkImports = true;
      continue;
    }
    if (!["--manifest", "--root", "--expected-version", "--zip"].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  return options;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON at ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function normalizeModulePath(path) {
  return String(path).replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function assertSafeRelativePath(path, label) {
  const normalized = normalizeModulePath(path);
  if (
    !normalized
    || isAbsolute(normalized)
    || normalized.startsWith("/")
    || normalized.split("/").includes("..")
    || /^[a-zA-Z]:/.test(normalized)
  ) {
    throw new Error(`${label} contains an unsafe path: ${path}`);
  }
  return normalized;
}

function collectManifestFiles(manifest) {
  const references = new Set();
  for (const key of ["esmodules", "scripts", "styles"]) {
    for (const path of manifest[key] ?? []) references.add(assertSafeRelativePath(path, key));
  }
  for (const language of manifest.languages ?? []) {
    if (language?.path) references.add(assertSafeRelativePath(language.path, "languages"));
  }
  for (const pack of manifest.packs ?? []) {
    const packPath = pack?.path ?? pack?.location;
    if (packPath) references.add(assertSafeRelativePath(packPath, "packs"));
  }
  for (const key of ["license", "readme"]) {
    if (manifest[key]) references.add(assertSafeRelativePath(manifest[key], key));
  }
  return references;
}

function listFiles(root) {
  const files = [];
  const visit = current => {
    for (const entry of readdirSync(current)) {
      const absolute = resolve(current, entry);
      if (statSync(absolute).isDirectory()) visit(absolute);
      else files.push(relative(root, absolute).split(sep).join("/"));
    }
  };
  visit(root);
  return files.sort();
}

function resolveLocalImport(importer, specifier) {
  const candidate = resolve(dirname(importer), specifier);
  const candidates = [candidate, `${candidate}.js`, resolve(candidate, "index.js")];
  return candidates.some(path => existsSync(path) && statSync(path).isFile());
}

function validateLocalImports(root) {
  const importPatterns = [
    /\b(?:import|export)\s+(?:[^"'()]*?\s+from\s+)?["'](\.[^"']+)["']/g,
    /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/g,
  ];

  for (const relativePath of listFiles(root).filter(path => path.endsWith(".js"))) {
    const absolutePath = resolve(root, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    for (const pattern of importPatterns) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        if (!resolveLocalImport(absolutePath, match[1])) {
          throw new Error(`Broken local import "${match[1]}" in ${relativePath}`);
        }
      }
    }
  }
}

function findEndOfCentralDirectory(buffer) {
  const minimumOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("ZIP end-of-central-directory record was not found");
}

function readZipEntries(zipPath) {
  const buffer = readFileSync(zipPath);
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let offset = buffer.readUInt32LE(endOffset + 16);
  const entries = new Set();

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central-directory entry at offset ${offset}`);
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (!name.endsWith("/")) entries.add(assertSafeRelativePath(name, "ZIP"));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function validateZip(zipPath, root, manifestFiles) {
  if (!existsSync(zipPath)) throw new Error(`ZIP does not exist: ${zipPath}`);
  const zipEntries = readZipEntries(zipPath);
  if (!zipEntries.has("module.json")) {
    throw new Error("ZIP must contain module.json at its root");
  }

  const expectedFiles = new Set(listFiles(root));
  for (const path of expectedFiles) {
    if (!zipEntries.has(path)) throw new Error(`ZIP is missing distribution file: ${path}`);
  }
  for (const path of zipEntries) {
    if (!expectedFiles.has(path)) throw new Error(`ZIP contains an unexpected file: ${path}`);
  }
  for (const path of manifestFiles) {
    if (!zipEntries.has(path)) throw new Error(`ZIP is missing manifest reference: ${path}`);
  }
}

function validate() {
  const options = parseArguments(process.argv.slice(2));
  const root = resolve(options.root);
  const manifestPath = resolve(options.manifest);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`Root directory does not exist: ${root}`);
  if (!existsSync(manifestPath)) throw new Error(`Manifest does not exist: ${manifestPath}`);

  const manifest = readJson(manifestPath);
  if (manifest.id !== MODULE_ID) throw new Error(`Expected manifest id "${MODULE_ID}", found "${manifest.id ?? ""}"`);
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(String(manifest.version ?? ""))) {
    throw new Error(`Invalid manifest version: ${manifest.version ?? ""}`);
  }
  if (options.expectedVersion && manifest.version !== options.expectedVersion) {
    throw new Error(`Manifest version ${manifest.version} does not match expected version ${options.expectedVersion}`);
  }

  const packagePath = resolve(root, "package.json");
  if (existsSync(packagePath)) {
    const packageJson = readJson(packagePath);
    if (packageJson.version !== manifest.version) {
      throw new Error(`package.json version ${packageJson.version ?? ""} does not match manifest version ${manifest.version}`);
    }
  }

  const manifestFiles = collectManifestFiles(manifest);
  for (const path of manifestFiles) {
    const absolutePath = resolve(root, path);
    if (!existsSync(absolutePath)) throw new Error(`Manifest reference does not exist: ${path}`);
  }

  if (options.checkImports) validateLocalImports(root);
  if (options.zip) validateZip(resolve(options.zip), root, manifestFiles);

  console.log(
    `Validated ${manifest.id} v${manifest.version}: ${manifestFiles.size} manifest references`
    + `${options.checkImports ? ", local imports" : ""}`
    + `${options.zip ? ", and ZIP contents" : ""}.`,
  );
}

try {
  validate();
} catch (error) {
  console.error(`Release validation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
