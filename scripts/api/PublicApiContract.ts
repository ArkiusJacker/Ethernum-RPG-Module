export interface PublicApiContractInspection {
  valid: boolean;
  issues: string[];
}

const REQUIRED_FUNCTIONS = [
  "ui.openGMControlCenter",
  "ui.closeGMControlCenter",
  "ui.openFieldCommunicator",
  "ui.closeFieldCommunicator",
  "contracts.list",
  "store.list",
  "store.purchase",
  "ai.status",
  "diagnostics.performance",
] as const;

const FORBIDDEN_ROOT_MEMBERS = [
  "CompanyStoreRepository",
  "CompanyIdentityRepository",
  "ContractArchiveRepository",
] as const;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function resolvePath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => record(current)?.[segment], value);
}

export function inspectPublicApiContract(value: unknown): PublicApiContractInspection {
  const root = record(value);
  const issues: string[] = [];
  if (!root) return { valid: false, issues: ["game.ethernum must be an object"] };
  if (root.apiVersion !== "1") issues.push("apiVersion must be 1");
  for (const path of REQUIRED_FUNCTIONS) {
    if (typeof resolvePath(root, path) !== "function") issues.push(`${path} must be a function`);
  }
  if (!record(root.macros)) issues.push("macros must be an object");
  for (const member of FORBIDDEN_ROOT_MEMBERS) {
    if (Object.hasOwn(root, member)) issues.push(`${member} is an internal repository`);
  }
  return { valid: issues.length === 0, issues };
}

export function assertPublicApiContract(value: unknown): void {
  const inspection = inspectPublicApiContract(value);
  if (!inspection.valid) throw new Error(`Invalid game.ethernum public API: ${inspection.issues.join("; ")}`);
}
