export const CHARACTER_SHEET_MOTION_MODES = ["full", "reduced", "off"] as const;

export type CharacterSheetMotionMode = typeof CHARACTER_SHEET_MOTION_MODES[number];

export interface CharacterSheetMotionResolution {
  requested: CharacterSheetMotionMode;
  resolved: CharacterSheetMotionMode;
  systemPrefersReducedMotion: boolean;
  systemPreferenceApplied: boolean;
}

export interface CharacterSheetMotionServiceOptions {
  readPreference?: () => unknown;
  readSystemPrefersReducedMotion?: () => boolean;
  defaultMode?: CharacterSheetMotionMode;
}

const DEFAULT_MOTION_MODE: CharacterSheetMotionMode = "full";

export function normalizeCharacterSheetMotionMode(
  value: unknown,
  fallback: CharacterSheetMotionMode = DEFAULT_MOTION_MODE,
): CharacterSheetMotionMode {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return (CHARACTER_SHEET_MOTION_MODES as readonly string[]).includes(normalized)
    ? normalized as CharacterSheetMotionMode
    : fallback;
}

export function resolveCharacterSheetMotion(
  preference: unknown,
  systemPrefersReducedMotion = false,
  fallback: CharacterSheetMotionMode = DEFAULT_MOTION_MODE,
): CharacterSheetMotionResolution {
  const requested = normalizeCharacterSheetMotionMode(preference, fallback);
  const reduceFullMotion = requested === "full" && systemPrefersReducedMotion;
  return {
    requested,
    resolved: reduceFullMotion ? "reduced" : requested,
    systemPrefersReducedMotion,
    systemPreferenceApplied: reduceFullMotion,
  };
}

function safelyRead<T>(reader: (() => T) | undefined, fallback: T): T {
  if (!reader) return fallback;
  try {
    return reader();
  } catch {
    return fallback;
  }
}

export class CharacterSheetMotionService {
  readonly #readPreference: () => unknown;
  readonly #readSystemPrefersReducedMotion: () => boolean;
  readonly #defaultMode: CharacterSheetMotionMode;

  constructor(options: CharacterSheetMotionServiceOptions = {}) {
    this.#readPreference = options.readPreference ?? (() => options.defaultMode ?? DEFAULT_MOTION_MODE);
    this.#readSystemPrefersReducedMotion = options.readSystemPrefersReducedMotion ?? (() => false);
    this.#defaultMode = options.defaultMode ?? DEFAULT_MOTION_MODE;
  }

  resolve(preference?: unknown): CharacterSheetMotionResolution {
    const requestedPreference = preference === undefined
      ? safelyRead(this.#readPreference, this.#defaultMode)
      : preference;
    const systemPrefersReducedMotion = safelyRead(this.#readSystemPrefersReducedMotion, false);
    return resolveCharacterSheetMotion(requestedPreference, systemPrefersReducedMotion, this.#defaultMode);
  }

  get mode(): CharacterSheetMotionMode {
    return this.resolve().resolved;
  }
}
