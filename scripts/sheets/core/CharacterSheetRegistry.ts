export const CHARACTER_SHEET_MODES = ["auto", "ethernum", "concordia", "pf2e"] as const;

export type CharacterSheetMode = (typeof CHARACTER_SHEET_MODES)[number];
export type ResolvedCharacterSheetMode = Exclude<CharacterSheetMode, "auto">;

export interface CharacterSheetResolutionInput {
  override?: unknown;
  activeCore?: unknown;
}

export interface CharacterSheetRegistration<TValue> {
  mode: ResolvedCharacterSheetMode;
  value: TValue;
}

const VALID_MODES = new Set<string>(CHARACTER_SHEET_MODES);

export function normalizeCharacterSheetMode(value: unknown): CharacterSheetMode {
  if (typeof value !== "string") return "auto";
  const normalized = value.trim().toLowerCase();
  return VALID_MODES.has(normalized) ? normalized as CharacterSheetMode : "auto";
}

export function resolveCharacterSheetMode(
  input: CharacterSheetResolutionInput,
): ResolvedCharacterSheetMode {
  const override = normalizeCharacterSheetMode(input.override);
  if (override !== "auto") return override;

  if (input.activeCore === "ethernum-company") return "ethernum";
  if (input.activeCore === "concordia") return "concordia";
  return "pf2e";
}

export class CharacterSheetRegistry<TValue = unknown> {
  readonly #registrations = new Map<ResolvedCharacterSheetMode, TValue>();

  constructor(registrations: Iterable<CharacterSheetRegistration<TValue>> = []) {
    for (const registration of registrations) {
      this.register(registration.mode, registration.value);
    }
  }

  normalize(value: unknown): CharacterSheetMode {
    return normalizeCharacterSheetMode(value);
  }

  resolveMode(input: CharacterSheetResolutionInput): ResolvedCharacterSheetMode {
    return resolveCharacterSheetMode(input);
  }

  register(mode: ResolvedCharacterSheetMode, value: TValue): this {
    const normalized = normalizeCharacterSheetMode(mode);
    if (normalized === "auto") {
      throw new Error("A concrete character sheet registration cannot use auto mode.");
    }
    this.#registrations.set(normalized, value);
    return this;
  }

  unregister(mode: ResolvedCharacterSheetMode): boolean {
    return this.#registrations.delete(mode);
  }

  get(mode: ResolvedCharacterSheetMode): TValue | undefined {
    return this.#registrations.get(mode);
  }

  resolve(input: CharacterSheetResolutionInput): CharacterSheetRegistration<TValue> | undefined {
    const mode = this.resolveMode(input);
    const value = this.get(mode);
    return value === undefined ? undefined : { mode, value };
  }
}
