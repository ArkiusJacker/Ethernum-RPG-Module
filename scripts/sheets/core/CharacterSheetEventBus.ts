export type CharacterSheetEventMap = object;
export type CharacterSheetEventListener<TPayload> = (payload: TPayload) => void;

export class CharacterSheetEventBus<TEvents extends CharacterSheetEventMap> {
  readonly #listeners = new Map<keyof TEvents, Set<CharacterSheetEventListener<unknown>>>();

  on<TKey extends keyof TEvents>(
    event: TKey,
    listener: CharacterSheetEventListener<TEvents[TKey]>,
  ): () => void {
    const listeners = this.#listeners.get(event) ?? new Set<CharacterSheetEventListener<unknown>>();
    listeners.add(listener as CharacterSheetEventListener<unknown>);
    this.#listeners.set(event, listeners);
    return () => this.off(event, listener);
  }

  once<TKey extends keyof TEvents>(
    event: TKey,
    listener: CharacterSheetEventListener<TEvents[TKey]>,
  ): () => void {
    const unsubscribe = this.on(event, payload => {
      unsubscribe();
      listener(payload);
    });
    return unsubscribe;
  }

  off<TKey extends keyof TEvents>(
    event: TKey,
    listener: CharacterSheetEventListener<TEvents[TKey]>,
  ): void {
    const listeners = this.#listeners.get(event);
    listeners?.delete(listener as CharacterSheetEventListener<unknown>);
    if (listeners?.size === 0) this.#listeners.delete(event);
  }

  emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): void {
    const listeners = [...(this.#listeners.get(event) ?? [])];
    for (const listener of listeners) listener(payload);
  }

  clear<TKey extends keyof TEvents>(event?: TKey): void {
    if (event === undefined) this.#listeners.clear();
    else this.#listeners.delete(event);
  }

  listenerCount<TKey extends keyof TEvents>(event: TKey): number {
    return this.#listeners.get(event)?.size ?? 0;
  }
}
