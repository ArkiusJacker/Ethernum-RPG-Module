export type PF2eBridgeTelemetrySource =
  | "pf2e-prepared"
  | "document-fallback"
  | "foundry-drop"
  | "drop-delegate"
  | "adapter"
  | "pf2e-sheet";

export type PF2eBridgeTelemetryStatus = "success" | "fallback" | "failed";

export interface PF2eBridgeTelemetryEntry {
  timestamp: number;
  actorId: string;
  operation: string;
  capability: string;
  source: PF2eBridgeTelemetrySource;
  status: PF2eBridgeTelemetryStatus;
  durationMs?: number;
  message?: string;
}

export interface PF2eBridgeTelemetryInput extends Omit<PF2eBridgeTelemetryEntry, "timestamp"> {
  timestamp?: number;
}

export interface PF2eBridgeTelemetryQuery {
  actorId?: string;
  limit?: number;
}

export interface PF2eBridgeTelemetryMeasureInput {
  actorId: string;
  operation: string;
  capability: string;
  source: PF2eBridgeTelemetrySource;
  successStatus?: Extract<PF2eBridgeTelemetryStatus, "success" | "fallback">;
  fallbackMessage?: string;
}

export interface PF2eBridgeResultTelemetryInput {
  actorId: string;
  operation: string;
  capability: string;
  durationMs?: number;
}

export interface PF2eBridgeTelemetryResultLike {
  ok: boolean;
  source?: PF2eBridgeTelemetrySource;
  capability?: string;
  reason?: string;
  fallback?: unknown;
}

type Clock = () => number;

export const PF2E_BRIDGE_TELEMETRY_LIMIT = 50;

const SOURCES = new Set<PF2eBridgeTelemetrySource>([
  "pf2e-prepared",
  "document-fallback",
  "foundry-drop",
  "drop-delegate",
  "adapter",
  "pf2e-sheet",
]);

const STATUSES = new Set<PF2eBridgeTelemetryStatus>(["success", "fallback", "failed"]);

function systemClock(): number {
  return Date.now();
}

function boundedText(value: unknown, maximum: number, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, maximum);
}

export function sanitizePF2eTelemetryMessage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const sanitized = value
    .replace(/\b(password|passphrase|token|secret|secret notes?|biograph(?:y|ia)|chat(?: content)?|notes?)\b\s*[:=]\s*[^,;|]+/gi, "$1=[redacted]")
    .replace(/data:[^\s]+/gi, "[data-url]")
    .replace(/[a-z]:\\(?:[^\\\s]+\\)*[^\s]+/gi, "[local-path]")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized ? sanitized.slice(0, 240) : undefined;
}

function finiteDuration(value: unknown): number | undefined {
  const duration = Number(value);
  return Number.isFinite(duration) ? Math.max(0, Math.round(duration * 100) / 100) : undefined;
}

function immutableEntry(input: PF2eBridgeTelemetryInput, clock: Clock): PF2eBridgeTelemetryEntry {
  const source = SOURCES.has(input.source) ? input.source : "adapter";
  const status = STATUSES.has(input.status) ? input.status : "failed";
  const timestamp = Number.isFinite(input.timestamp) ? Math.max(0, Number(input.timestamp)) : clock();
  const durationMs = finiteDuration(input.durationMs);
  const message = sanitizePF2eTelemetryMessage(input.message);
  return Object.freeze({
    timestamp,
    actorId: boundedText(input.actorId, 128, "unknown-actor"),
    operation: boundedText(input.operation, 80, "unknown-operation"),
    capability: boundedText(input.capability, 80, "unknown-capability"),
    source,
    status,
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(message === undefined ? {} : { message }),
  });
}

function errorType(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

/**
 * In-memory telemetry for one Foundry client. It deliberately has no storage or
 * socket integration, so entries cannot leak into world flags or other clients.
 */
export class PF2eBridgeTelemetryBuffer {
  readonly #entries: PF2eBridgeTelemetryEntry[] = [];
  readonly #capacity: number;
  readonly #clock: Clock;

  constructor(capacity = PF2E_BRIDGE_TELEMETRY_LIMIT, clock: Clock = systemClock) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("PF2e bridge telemetry capacity must be a positive integer.");
    }
    this.#capacity = capacity;
    this.#clock = clock;
  }

  record(input: PF2eBridgeTelemetryInput): PF2eBridgeTelemetryEntry {
    const entry = immutableEntry(input, this.#clock);
    this.#entries.push(entry);
    if (this.#entries.length > this.#capacity) {
      this.#entries.splice(0, this.#entries.length - this.#capacity);
    }
    return entry;
  }

  list(query: PF2eBridgeTelemetryQuery = {}): PF2eBridgeTelemetryEntry[] {
    const actorId = query.actorId?.trim();
    const available = actorId ? this.#entries.filter(entry => entry.actorId === actorId) : this.#entries;
    const requestedLimit = Number(query.limit);
    const limit = Number.isInteger(requestedLimit) && requestedLimit >= 0
      ? Math.min(requestedLimit, available.length)
      : available.length;
    return available.slice(available.length - limit).map(entry => ({ ...entry }));
  }

  clear(actorId?: string): void {
    if (!actorId) {
      this.#entries.length = 0;
      return;
    }
    for (let index = this.#entries.length - 1; index >= 0; index -= 1) {
      if (this.#entries[index]?.actorId === actorId) this.#entries.splice(index, 1);
    }
  }

  async measure<T>(input: PF2eBridgeTelemetryMeasureInput, operation: () => T | Promise<T>): Promise<T> {
    const started = this.#clock();
    try {
      const result = await operation();
      this.record({
        ...input,
        status: input.successStatus ?? "success",
        durationMs: this.#clock() - started,
        message: input.successStatus === "fallback" ? input.fallbackMessage : undefined,
      });
      return result;
    } catch (error) {
      this.record({
        ...input,
        status: "failed",
        durationMs: this.#clock() - started,
        message: errorType(error),
      });
      throw error;
    }
  }
}

export const PF2eBridgeTelemetry = new PF2eBridgeTelemetryBuffer();

export function recordPF2eBridgeTelemetry(input: PF2eBridgeTelemetryInput): PF2eBridgeTelemetryEntry {
  return PF2eBridgeTelemetry.record(input);
}

export function measurePF2eBridgeOperation<T>(
  input: PF2eBridgeTelemetryMeasureInput,
  operation: () => T | Promise<T>,
): Promise<T> {
  return PF2eBridgeTelemetry.measure(input, operation);
}

export function recordPF2eBridgeResultTelemetry(
  input: PF2eBridgeResultTelemetryInput,
  result: PF2eBridgeTelemetryResultLike,
  telemetry: PF2eBridgeTelemetryBuffer = PF2eBridgeTelemetry,
): PF2eBridgeTelemetryEntry {
  const fallback = !result.ok && (result.reason === "unsupported" || result.reason === "not-found");
  return telemetry.record({
    actorId: input.actorId,
    operation: input.operation,
    capability: result.capability ?? input.capability,
    source: result.ok ? result.source ?? "adapter" : fallback ? "pf2e-sheet" : "adapter",
    status: result.ok ? "success" : fallback ? "fallback" : "failed",
    durationMs: input.durationMs,
    message: result.ok ? undefined : result.reason ?? "bridge-failure",
  });
}
