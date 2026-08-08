import type { CampaignCoreId } from "../config.js";
import type { UniqueMechanicProfileId } from "./types.js";

export interface UniqueMechanicProfileMetadata {
  id: Exclude<UniqueMechanicProfileId, "">;
  label: string;
  core: CampaignCoreId;
  placeholder?: boolean;
}

export const UNIQUE_MECHANIC_PROFILE_CATALOG: readonly UniqueMechanicProfileMetadata[] = [
  { id: "gyro-spin", label: "Gyro Zeppeli - Via da Rotacao Sagrada", core: "ethernum-company" },
  { id: "bayle-dragon", label: "Bayle, o Horror - Corpo Draconico", core: "ethernum-company" },
  { id: "pipping-night", label: "Pipping Baldwin Black - Expressao da Noite", core: "ethernum-company" },
  { id: "kaitake", label: "Kaitake", core: "ethernum-company", placeholder: true },
  { id: "cinerio", label: "Cinerio", core: "ethernum-company", placeholder: true },
  { id: "ailan", label: "Ailan", core: "ethernum-company", placeholder: true },
  { id: "arkius-jacker", label: "Arkius Jacker - Concordia", core: "concordia" },
  { id: "atlas-sidarta", label: "Atlas Sidarta - Olhar do Divino", core: "concordia" },
  { id: "charles", label: "Charles - Miranha em Acao", core: "concordia" },
  { id: "yu-jiu-ji-tae", label: "Yu, Jiu Ji Tae - Rage in the Flesh", core: "concordia" },
  { id: "morgana", label: "Morgana", core: "concordia", placeholder: true },
  { id: "unluck", label: "Unluck", core: "concordia", placeholder: true },
];

export function getUniqueMechanicProfileMetadata(
  profileId: unknown,
): UniqueMechanicProfileMetadata | null {
  if (typeof profileId !== "string") return null;
  return UNIQUE_MECHANIC_PROFILE_CATALOG.find(profile => profile.id === profileId) ?? null;
}

export function isCatalogProfileId(profileId: unknown): profileId is UniqueMechanicProfileId {
  return profileId === "" || getUniqueMechanicProfileMetadata(profileId) !== null;
}

export function getCatalogProfileOptions(core: CampaignCoreId): UniqueMechanicProfileMetadata[] {
  return UNIQUE_MECHANIC_PROFILE_CATALOG
    .filter(profile => profile.core === core)
    .map(profile => ({ ...profile }));
}
