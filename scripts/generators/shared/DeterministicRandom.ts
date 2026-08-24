export function deterministicHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicId(prefix: string, value: string): string {
  return `${prefix}-${deterministicHash(value).toString(36).padStart(7, "0")}`;
}

export function deterministicRandom(seed: string): () => number {
  let state = deterministicHash(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}

export function deterministicPick<T>(values: readonly T[], random: () => number): T | undefined {
  return values.length > 0 ? values[Math.floor(random() * values.length)] : undefined;
}
