import type {
  UniqueMechanicProfile,
  UniqueMechanicProfileId,
  UniqueMechanicProfileOption,
} from "./types.js";
import { UNIQUE_MECHANIC_PROFILE_CATALOG } from "./profile-catalog.js";
import { gyroProfile } from "./gyro/profile.js";
import { bayleProfile } from "./bayle/profile.js";
import { pippingProfile } from "./pipping/profile.js";
import { arkiusProfile } from "./arkius/profile.js";
import { yuProfile } from "./yu/profile.js";
import { charlesProfile } from "./charles/profile.js";
import { atlasProfile } from "./atlas/profile.js";

const profiles = [
  gyroProfile,
  bayleProfile,
  pippingProfile,
  arkiusProfile,
  yuProfile,
  charlesProfile,
  atlasProfile,
] satisfies UniqueMechanicProfile[];

export const UNIQUE_MECHANIC_PROFILES = new Map<string, UniqueMechanicProfile>(
  profiles.map(profile => [profile.id, profile] as const),
);

export const PLACEHOLDER_PROFILE_OPTIONS: UniqueMechanicProfileOption[] =
  UNIQUE_MECHANIC_PROFILE_CATALOG
    .filter(profile => profile.placeholder)
    .map(profile => ({ ...profile, placeholder: true }));

export function getUniqueMechanicProfile(profileId: unknown): UniqueMechanicProfile | null {
  if (typeof profileId !== "string") return null;
  return UNIQUE_MECHANIC_PROFILES.get(profileId as Exclude<UniqueMechanicProfileId, "">) ?? null;
}

export function isKnownUniqueMechanicProfileId(profileId: unknown): profileId is UniqueMechanicProfileId {
  if (profileId === "") return true;
  if (getUniqueMechanicProfile(profileId)) return true;
  return PLACEHOLDER_PROFILE_OPTIONS.some(profile => profile.id === profileId);
}

export function normalizeRegisteredProfileState(profileId: string, value: unknown): unknown {
  return getUniqueMechanicProfile(profileId)?.normalizeState(value) ?? value;
}

export function getProfileOptions(core: "ethernum-company" | "concordia"): UniqueMechanicProfileOption[] {
  return [
    ...profiles
      .filter(profile => profile.core === core)
      .map(profile => ({ id: profile.id, label: profile.label, core: profile.core })),
    ...PLACEHOLDER_PROFILE_OPTIONS.filter(profile => profile.core === core),
  ];
}

export function createDefaultProfileStates(): Record<string, unknown> {
  return Object.fromEntries(
    profiles.map(profile => [profile.id, structuredClone(profile.defaultState)]),
  );
}

export function getDefaultProfileState(profileId: string): unknown {
  const profile = getUniqueMechanicProfile(profileId);
  return profile ? structuredClone(profile.defaultState) : undefined;
}

export {
  gyroProfile,
  bayleProfile,
  pippingProfile,
  arkiusProfile,
  yuProfile,
  charlesProfile,
  atlasProfile,
};
