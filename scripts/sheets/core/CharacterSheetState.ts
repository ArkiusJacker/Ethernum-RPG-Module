export interface CharacterSheetStateScope {
  worldId: string;
  userId: string;
  actorId: string;
  sheetId: string;
}

export interface CharacterSheetViewState {
  activeTab: string;
  collapsed: Record<string, boolean>;
  scroll: Record<string, number>;
  compact: boolean;
}

export interface CharacterSheetStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STATE_PREFIX = "ethernum.character-sheet-state.v1";
const MEMORY_STORAGE = new Map<string, string>();

function defaultState(): CharacterSheetViewState {
  return {
    activeTab: "",
    collapsed: {},
    scroll: {},
    compact: false,
  };
}

function defaultStorage(): CharacterSheetStorage | null {
  return (globalThis as { localStorage?: CharacterSheetStorage }).localStorage ?? null;
}

function booleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
}

function scrollRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

function normalizeState(value: unknown): CharacterSheetViewState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultState();
  const state = value as Partial<CharacterSheetViewState>;
  return {
    activeTab: typeof state.activeTab === "string" ? state.activeTab : "",
    collapsed: booleanRecord(state.collapsed),
    scroll: scrollRecord(state.scroll),
    compact: state.compact === true,
  };
}

export function createCharacterSheetStateKey(scope: CharacterSheetStateScope): string {
  return [scope.worldId, scope.userId, scope.actorId, scope.sheetId]
    .map(part => encodeURIComponent(String(part)))
    .reduce((key, part) => `${key}:${part}`, STATE_PREFIX);
}

export class CharacterSheetState {
  readonly key: string;
  readonly #storage: CharacterSheetStorage | null;

  constructor(scope: CharacterSheetStateScope, storage: CharacterSheetStorage | null = defaultStorage()) {
    this.key = createCharacterSheetStateKey(scope);
    this.#storage = storage;
  }

  load(): CharacterSheetViewState {
    let serialized: string | null = null;
    try {
      serialized = this.#storage?.getItem(this.key) ?? null;
    } catch {
      serialized = null;
    }
    serialized ??= MEMORY_STORAGE.get(this.key) ?? null;
    if (!serialized) return defaultState();

    try {
      return normalizeState(JSON.parse(serialized));
    } catch {
      return defaultState();
    }
  }

  save(state: CharacterSheetViewState): CharacterSheetViewState {
    const normalized = normalizeState(state);
    const serialized = JSON.stringify(normalized);
    MEMORY_STORAGE.set(this.key, serialized);
    try {
      this.#storage?.setItem(this.key, serialized);
    } catch {
      // The in-memory copy remains available when browser storage is blocked.
    }
    return normalized;
  }

  update(patch: Partial<CharacterSheetViewState>): CharacterSheetViewState {
    return this.save({ ...this.load(), ...patch });
  }

  setActiveTab(activeTab: string): CharacterSheetViewState {
    return this.update({ activeTab });
  }

  setCollapsed(sectionId: string, collapsed: boolean): CharacterSheetViewState {
    const current = this.load();
    return this.update({ collapsed: { ...current.collapsed, [sectionId]: collapsed } });
  }

  setScroll(regionId: string, position: number): CharacterSheetViewState {
    const current = this.load();
    const nextPosition = Number.isFinite(position) ? position : 0;
    return this.update({ scroll: { ...current.scroll, [regionId]: nextPosition } });
  }

  setCompact(compact: boolean): CharacterSheetViewState {
    return this.update({ compact });
  }

  reset(): CharacterSheetViewState {
    MEMORY_STORAGE.delete(this.key);
    try {
      this.#storage?.removeItem(this.key);
    } catch {
      // Browser storage may be unavailable; memory was already cleared.
    }
    return defaultState();
  }
}
