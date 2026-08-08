export type CharacterSheetModuleStatus = "built" | "hidden" | "failed";
export type CharacterSheetModulePhase = "visibility" | "build";

export interface CharacterSheetModule<TContext, TOutput = unknown> {
  id: string;
  order?: number;
  isVisible?: (context: TContext) => boolean | Promise<boolean>;
  build: (context: TContext) => TOutput | Promise<TOutput>;
}

export interface BuiltCharacterSheetModule<TOutput> {
  id: string;
  order: number;
  output: TOutput;
}

export interface CharacterSheetModuleMetric {
  id: string;
  order: number;
  status: CharacterSheetModuleStatus;
  phase: CharacterSheetModulePhase;
  durationMs: number;
  error?: unknown;
}

export interface CharacterSheetModuleBuildReport<TOutput> {
  modules: BuiltCharacterSheetModule<TOutput>[];
  metrics: CharacterSheetModuleMetric[];
}

interface RegisteredModule<TContext, TOutput> {
  module: CharacterSheetModule<TContext, TOutput>;
  sequence: number;
}

type Clock = () => number;

function systemClock(): number {
  return globalThis.performance?.now() ?? Date.now();
}

function moduleOrder(module: { order?: number }): number {
  return Number.isFinite(module.order) ? module.order as number : 0;
}

export class CharacterSheetModuleRegistry<TContext, TOutput = unknown> {
  readonly #modules = new Map<string, RegisteredModule<TContext, TOutput>>();
  readonly #clock: Clock;
  #sequence = 0;

  constructor(clock: Clock = systemClock) {
    this.#clock = clock;
  }

  register(module: CharacterSheetModule<TContext, TOutput>): this {
    const id = module.id.trim();
    if (!id) throw new Error("Character sheet modules require a non-empty id.");
    if (this.#modules.has(id)) throw new Error(`Character sheet module already registered: ${id}`);
    this.#modules.set(id, { module: { ...module, id }, sequence: this.#sequence++ });
    return this;
  }

  unregister(id: string): boolean {
    return this.#modules.delete(id);
  }

  get(id: string): CharacterSheetModule<TContext, TOutput> | undefined {
    return this.#modules.get(id)?.module;
  }

  ordered(): CharacterSheetModule<TContext, TOutput>[] {
    return [...this.#modules.values()]
      .sort((left, right) => {
        const orderDifference = moduleOrder(left.module) - moduleOrder(right.module);
        return orderDifference || left.sequence - right.sequence;
      })
      .map(entry => entry.module);
  }

  async buildVisible(context: TContext): Promise<CharacterSheetModuleBuildReport<TOutput>> {
    const modules: BuiltCharacterSheetModule<TOutput>[] = [];
    const metrics: CharacterSheetModuleMetric[] = [];

    for (const module of this.ordered()) {
      const order = moduleOrder(module);
      const visibilityStarted = this.#clock();
      let visible: boolean;
      try {
        visible = await module.isVisible?.(context) ?? true;
      } catch (error) {
        metrics.push({
          id: module.id,
          order,
          status: "failed",
          phase: "visibility",
          durationMs: Math.max(0, this.#clock() - visibilityStarted),
          error,
        });
        continue;
      }

      const visibilityDuration = Math.max(0, this.#clock() - visibilityStarted);
      if (!visible) {
        metrics.push({
          id: module.id,
          order,
          status: "hidden",
          phase: "visibility",
          durationMs: visibilityDuration,
        });
        continue;
      }

      const buildStarted = this.#clock();
      try {
        const output = await module.build(context);
        modules.push({ id: module.id, order, output });
        metrics.push({
          id: module.id,
          order,
          status: "built",
          phase: "build",
          durationMs: Math.max(0, this.#clock() - buildStarted),
        });
      } catch (error) {
        metrics.push({
          id: module.id,
          order,
          status: "failed",
          phase: "build",
          durationMs: Math.max(0, this.#clock() - buildStarted),
          error,
        });
      }
    }

    return { modules, metrics };
  }

  build(context: TContext): Promise<CharacterSheetModuleBuildReport<TOutput>> {
    return this.buildVisible(context);
  }
}
