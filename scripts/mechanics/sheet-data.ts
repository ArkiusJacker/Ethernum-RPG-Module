import type { UniqueMechanicProfileId } from "./types.js";

type MigratedProfileId = Extract<
  UniqueMechanicProfileId,
  "arkius-jacker" | "charles" | "atlas-sidarta" | "yu-jiu-ji-tae" | "bayle-dragon" | "gyro-spin"
>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/** Keeps the existing template contract while exposing data for only the active profile. */
export function selectProfileSheetData(
  complete: Record<string, unknown>,
  profileId: MigratedProfileId,
): Record<string, unknown> {
  const { concordia, pipping: _pipping, bayle: _bayle, gyro: _gyro, ...shell } = complete;
  const concordiaData = record(concordia);
  if (profileId === "arkius-jacker") {
    return { ...shell, concordia: { arkius: concordiaData.arkius } };
  }
  if (profileId === "charles") {
    return { ...shell, concordia: { charles: concordiaData.charles } };
  }
  if (profileId === "atlas-sidarta") {
    return { ...shell, concordia: { atlas: concordiaData.atlas } };
  }
  if (profileId === "yu-jiu-ji-tae") {
    return { ...shell, concordia: { yu: concordiaData.yu } };
  }
  if (profileId === "bayle-dragon") return { ...shell, bayle: complete.bayle };
  return { ...shell, gyro: complete.gyro };
}
