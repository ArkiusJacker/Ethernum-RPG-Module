export type CharacterSheetDirtyPath =
  | "identity"
  | "vitals"
  | "overview"
  | "combat"
  | "inventory"
  | "spellcasting"
  | "feats"
  | "effects"
  | "unique"
  | "ethernum"
  | "all";

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const dirty = new Map<string, Set<CharacterSheetDirtyPath>>();

function key(actorId: string, region: string): string {
  return `${actorId}:${region}`;
}

export const CharacterSheetCache = {
  getOrCreate<T>(actorId: string, region: string, factory: () => T, ttlMs = 350): T {
    const entry = cache.get(key(actorId, region));
    const paths = dirty.get(actorId);
    if (entry && entry.expiresAt > Date.now() && !paths?.has("all") && !paths?.has(region as CharacterSheetDirtyPath)) {
      return entry.value as T;
    }
    const value = factory();
    cache.set(key(actorId, region), { value, expiresAt: Date.now() + ttlMs });
    paths?.delete(region as CharacterSheetDirtyPath);
    if (paths?.size === 0) dirty.delete(actorId);
    return value;
  },

  invalidate(actorId: string, ...paths: CharacterSheetDirtyPath[]): void {
    const regions = paths.length > 0 ? paths : ["all" as const];
    const actorDirty = dirty.get(actorId) ?? new Set<CharacterSheetDirtyPath>();
    regions.forEach(path => actorDirty.add(path));
    dirty.set(actorId, actorDirty);
    if (actorDirty.has("all")) {
      for (const cacheKey of cache.keys()) {
        if (cacheKey.startsWith(`${actorId}:`)) cache.delete(cacheKey);
      }
    } else {
      regions.forEach(path => cache.delete(key(actorId, path)));
    }
  },

  getDirtyPaths(actorId: string): CharacterSheetDirtyPath[] {
    return [...(dirty.get(actorId) ?? [])];
  },

  clear(actorId?: string): void {
    if (!actorId) {
      cache.clear();
      dirty.clear();
      return;
    }
    for (const cacheKey of cache.keys()) {
      if (cacheKey.startsWith(`${actorId}:`)) cache.delete(cacheKey);
    }
    dirty.delete(actorId);
  },
};
