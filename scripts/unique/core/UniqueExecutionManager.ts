export type UniqueExecutionStage =
  | "created"
  | "reserved"
  | "queued"
  | "approved"
  | "executing"
  | "executed"
  | "failed"
  | "cancelled";

export interface UniqueExecutionTransaction {
  id: string;
  createdAt: number;
  updatedAt: number;
  profileId: string;
  actionId: string;
  sourceActorUuid: string;
  requesterUserId: string;
  stage: UniqueExecutionStage;
  reservedResources?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
}

export interface CreateUniqueExecutionOptions {
  profileId: string;
  actionId: string;
  sourceActorUuid: string;
  requesterUserId?: string;
  reservedResources?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  id?: string;
  now?: number;
}

const TERMINAL_STAGES = new Set<UniqueExecutionStage>([
  "executed",
  "failed",
  "cancelled",
]);
const EXECUTION_LIMIT = 30;
const mutationQueues = new Map<string, Promise<void>>();

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function executionId(): string {
  const foundryRoot = (globalThis as unknown as {
    foundry?: { utils?: { randomID?: (length?: number) => string } };
  }).foundry;
  return foundryRoot?.utils?.randomID?.(20)
    ?? globalThis.crypto?.randomUUID?.()
    ?? `execution-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isTerminalExecutionStage(stage: UniqueExecutionStage): boolean {
  return TERMINAL_STAGES.has(stage);
}

export function normalizeUniqueExecution(value: unknown): UniqueExecutionTransaction | null {
  const source = record(value);
  const id = optionalString(source.id);
  const profileId = optionalString(source.profileId);
  const actionId = optionalString(source.actionId);
  const sourceActorUuid = optionalString(source.sourceActorUuid);
  const requesterUserId = optionalString(source.requesterUserId);
  const createdAt = Number(source.createdAt);
  const updatedAt = Number(source.updatedAt ?? createdAt);
  const allowedStages: UniqueExecutionStage[] = [
    "created",
    "reserved",
    "queued",
    "approved",
    "executing",
    "executed",
    "failed",
    "cancelled",
  ];
  const stage = allowedStages.includes(source.stage as UniqueExecutionStage)
    ? source.stage as UniqueExecutionStage
    : null;
  if (
    !id
    || !profileId
    || !actionId
    || !sourceActorUuid
    || !requesterUserId
    || !stage
    || !Number.isFinite(createdAt)
    || !Number.isFinite(updatedAt)
  ) return null;
  return {
    id,
    createdAt,
    updatedAt,
    profileId,
    actionId,
    sourceActorUuid,
    requesterUserId,
    stage,
    ...(source.reservedResources ? { reservedResources: record(source.reservedResources) } : {}),
    ...(source.payload ? { payload: record(source.payload) } : {}),
    ...(source.result ? { result: record(source.result) } : {}),
    ...(optionalString(source.error) ? { error: optionalString(source.error) } : {}),
  };
}

export function normalizeUniqueExecutions(value: unknown): UniqueExecutionTransaction[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, UniqueExecutionTransaction>();
  for (const entry of value) {
    const execution = normalizeUniqueExecution(entry);
    if (execution) byId.set(execution.id, execution);
  }
  return [...byId.values()]
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(-EXECUTION_LIMIT);
}

export function createUniqueExecution(
  options: CreateUniqueExecutionOptions,
): UniqueExecutionTransaction {
  const now = options.now ?? Date.now();
  return {
    id: options.id ?? executionId(),
    createdAt: now,
    updatedAt: now,
    profileId: options.profileId,
    actionId: options.actionId,
    sourceActorUuid: options.sourceActorUuid,
    requesterUserId: options.requesterUserId ?? "system",
    stage: options.reservedResources ? "reserved" : "created",
    ...(options.reservedResources ? { reservedResources: options.reservedResources } : {}),
    ...(options.payload ? { payload: options.payload } : {}),
  };
}

export function upsertUniqueExecution(
  executions: readonly UniqueExecutionTransaction[],
  execution: UniqueExecutionTransaction,
): UniqueExecutionTransaction[] {
  return normalizeUniqueExecutions([
    ...executions.filter(entry => entry.id !== execution.id),
    execution,
  ]);
}

export function transitionUniqueExecution(
  executions: readonly UniqueExecutionTransaction[],
  executionIdValue: string,
  stage: UniqueExecutionStage,
  patch: Pick<UniqueExecutionTransaction, "result" | "error" | "payload"> = {},
  now = Date.now(),
): UniqueExecutionTransaction[] {
  const current = executions.find(entry => entry.id === executionIdValue);
  if (!current || isTerminalExecutionStage(current.stage)) return [...executions];
  return upsertUniqueExecution(executions, {
    ...current,
    ...patch,
    stage,
    updatedAt: now,
  });
}

export function reservedResourceTotal(
  executions: readonly UniqueExecutionTransaction[],
  resource: string,
  exceptExecutionId?: string,
): number {
  return executions.reduce((total, execution) => {
    if (execution.id === exceptExecutionId || isTerminalExecutionStage(execution.stage)) return total;
    const value = Number(execution.reservedResources?.[resource] ?? 0);
    return total + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
}

export function reconcileUniqueExecutions(
  executions: readonly UniqueExecutionTransaction[],
  timeoutMs: number,
  now = Date.now(),
): UniqueExecutionTransaction[] {
  return normalizeUniqueExecutions(executions.map(execution => {
    if (isTerminalExecutionStage(execution.stage) || now - execution.updatedAt <= timeoutMs) {
      return execution;
    }
    return {
      ...execution,
      stage: "cancelled" as const,
      updatedAt: now,
      error: "execution-timeout",
    };
  }));
}

/** Serializes only short document writes for one actor, never the interactive action itself. */
export async function serializeExecutionMutation<T>(
  actorUuid: string,
  mutation: () => Promise<T>,
): Promise<T> {
  const previous = mutationQueues.get(actorUuid) ?? Promise.resolve();
  let release = (): void => {};
  const current = new Promise<void>(resolve => { release = resolve; });
  const queued = previous.catch(() => {}).then(() => current);
  mutationQueues.set(actorUuid, queued);
  await previous.catch(() => {});
  try {
    return await mutation();
  } finally {
    release();
    if (mutationQueues.get(actorUuid) === queued) mutationQueues.delete(actorUuid);
  }
}
