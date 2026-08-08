import { ETHERNUM } from "../config.js";
import {
  AuthorityBridge,
  type AuthorityPolicyConfiguration,
} from "./AuthorityBridge.js";

let bridge: AuthorityBridge | null = null;

function numericSetting(key: string, fallback: number): number {
  try {
    const settings = game.settings as unknown as { get(scope: string, setting: string): unknown } | undefined;
    const value = Number(settings?.get(ETHERNUM.MODULE_NAME, key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

export function getAuthorityApprovalTimeoutMs(): number {
  return numericSetting("authorityApprovalTimeoutMinutes", 2) * 60_000;
}

export function getEthernumAuthorityBridge(): AuthorityBridge {
  bridge ??= new AuthorityBridge({
    moduleId: ETHERNUM.MODULE_NAME,
    approvalTtlMs: getAuthorityApprovalTimeoutMs(),
    requestTimeoutMs: Math.max(getAuthorityApprovalTimeoutMs() + 30_000, 150_000),
    auditLimit: numericSetting("authorityAuditRetention", 500),
    replayLimit: 500,
    replayTtlMs: 15 * 60_000,
  });
  return bridge;
}

export function initializeEthernumAuthorityBridge(): AuthorityBridge {
  const instance = getEthernumAuthorityBridge();
  instance.start();
  return instance;
}

export async function setAuthorityPolicy(
  category: string,
  mode: AuthorityPolicyConfiguration["default"],
  profileId?: string,
): Promise<void> {
  const instance = getEthernumAuthorityBridge();
  const policies = await instance.getPolicyConfiguration();
  if (profileId) {
    policies.profiles = { ...policies.profiles, [profileId]: mode };
  } else {
    policies.categories = { ...policies.categories, [category]: mode };
  }
  await instance.setPolicyConfiguration(policies);
}
