import type {
  UniqueActorHookContext,
  UniqueCombatHookContext,
  UniqueMechanicAction,
  UniqueMechanicProfile,
  UniqueMechanicsRuntime,
  UniqueProfileContext,
  UniqueRestContext,
} from "./types.js";

type RuntimeMethod = (...args: unknown[]) => unknown;

export interface LegacyProfileAdapterOptions {
  actions: readonly (string | UniqueMechanicAction)[];
  handlers?: Record<string, string>;
  wildcardHandler?: string;
  passActionId?: boolean;
  combatHook?: string;
  actorHook?: string;
  shortRestHandler?: string;
  longRestHandler?: string;
}

function runtimeMethod(runtime: UniqueMechanicsRuntime, name?: string): RuntimeMethod | null {
  if (!name) return null;
  const method = runtime[name];
  return typeof method === "function" ? method as RuntimeMethod : null;
}

async function invoke(
  runtime: UniqueMechanicsRuntime,
  methodName: string | undefined,
  args: unknown[],
): Promise<unknown> {
  const method = runtimeMethod(runtime, methodName);
  if (!method) return undefined;
  return method.apply(runtime, args);
}

function actions(options: LegacyProfileAdapterOptions): UniqueMechanicAction[] {
  return options.actions.map(action => typeof action === "string" ? { id: action } : { ...action });
}

export function legacyProfileAdapter(
  options: LegacyProfileAdapterOptions,
): Pick<UniqueMechanicProfile,
  | "buildSheetData"
  | "getActions"
  | "executeAction"
  | "getManagedMacros"
  | "onCombatUpdate"
  | "onActorUpdate"
  | "onRest"
> {
  return {
    buildSheetData: ({ actor, isGM, runtime }: UniqueProfileContext) =>
      runtime.buildSheetData(actor, Boolean(isGM)),
    getActions: () => actions(options),
    executeAction: async (context, actionId, payload = {}) => {
      const methodName = options.handlers?.[actionId] ?? options.wildcardHandler;
      if (!methodName) throw new Error(`No dispatcher handler is registered for action ${actionId}.`);
      const explicitArgs = Array.isArray(payload.args) ? payload.args : [];
      const args = options.passActionId
        ? [context.actor, actionId, ...explicitArgs]
        : [context.actor, ...explicitArgs];
      return invoke(context.runtime, methodName, args);
    },
    getManagedMacros: () => [],
    onCombatUpdate: async ({ combat, runtime }: UniqueCombatHookContext) => {
      await invoke(runtime, options.combatHook, [combat]);
    },
    onActorUpdate: async ({ actor, changed, runtime }: UniqueActorHookContext) => {
      await invoke(runtime, options.actorHook, [actor, changed]);
    },
    onRest: async ({ actor, rest, runtime }: UniqueRestContext) => {
      const handler = rest === "long" ? options.longRestHandler : options.shortRestHandler;
      await invoke(runtime, handler, [actor]);
    },
  };
}
