export type CharacterHitPointsStatus = "full" | "stable" | "critical" | "defeated";

export interface CharacterHitPointsPreview {
  value: number;
  max: number;
  ratio: number;
  status: CharacterHitPointsStatus;
}

export function buildCharacterHitPointsPreview(value: unknown, maximum: unknown): CharacterHitPointsPreview {
  const parsedMaximum = Number(maximum);
  const max = Number.isFinite(parsedMaximum) ? Math.max(0, Math.trunc(parsedMaximum)) : 0;
  const parsedValue = Number(value);
  const valueNumber = Number.isFinite(parsedValue) ? Math.trunc(parsedValue) : 0;
  const normalizedValue = Math.max(0, max > 0 ? Math.min(max, valueNumber) : valueNumber);
  const ratio = max > 0 ? Math.max(0, Math.min(1, normalizedValue / max)) : 0;
  const status: CharacterHitPointsStatus = normalizedValue <= 0
    ? "defeated"
    : ratio <= 0.25
      ? "critical"
      : ratio >= 1
        ? "full"
        : "stable";
  return { value: normalizedValue, max, ratio, status };
}

export function applyCharacterHitPointsPreview(
  root: HTMLElement | null,
  value: unknown,
  maximum: unknown,
): CharacterHitPointsPreview {
  const preview = buildCharacterHitPointsPreview(value, maximum);
  const monitor = root?.querySelector<HTMLElement>('[data-resource="hp"]');
  const track = monitor?.querySelector<HTMLElement>(".eth-hp-track");
  const fill = track?.querySelector<HTMLElement>(".ecs-hp-fluid");
  if (monitor) monitor.dataset.hpStatus = preview.status;
  if (track) track.setAttribute("aria-valuenow", String(preview.value));
  fill?.style.setProperty("--ecs-hp-ratio", String(preview.ratio));
  return preview;
}

export const CharacterHitPointsService = Object.freeze({
  preview: buildCharacterHitPointsPreview,
  apply: applyCharacterHitPointsPreview,
});
