export interface PerformanceMetricSnapshot {
  id: string;
  count: number;
  totalMs: number;
  averageMs: number;
  minimumMs: number;
  maximumMs: number;
  lastMs: number;
  lastAt: number;
}

interface MutablePerformanceMetric {
  count: number;
  totalMs: number;
  minimumMs: number;
  maximumMs: number;
  lastMs: number;
  lastAt: number;
}

const MAX_METRICS = 64;
const metrics = new Map<string, MutablePerformanceMetric>();

function clock(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

function normalizeDuration(durationMs: number): number {
  return Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
}

export const PerformanceTelemetry = Object.freeze({
  now: clock,

  record(id: string, durationMs: number): number {
    const key = String(id).trim();
    const duration = normalizeDuration(durationMs);
    if (!key) return duration;
    const existing = metrics.get(key);
    if (!existing && metrics.size >= MAX_METRICS) {
      const oldest = [...metrics.entries()].sort((left, right) => left[1].lastAt - right[1].lastAt)[0]?.[0];
      if (oldest) metrics.delete(oldest);
    }
    const metric = existing ?? {
      count: 0,
      totalMs: 0,
      minimumMs: duration,
      maximumMs: duration,
      lastMs: duration,
      lastAt: Date.now(),
    };
    metric.count += 1;
    metric.totalMs += duration;
    metric.minimumMs = Math.min(metric.minimumMs, duration);
    metric.maximumMs = Math.max(metric.maximumMs, duration);
    metric.lastMs = duration;
    metric.lastAt = Date.now();
    metrics.set(key, metric);
    return duration;
  },

  start(id: string): () => number {
    const startedAt = clock();
    let stopped = false;
    return () => {
      if (stopped) return 0;
      stopped = true;
      return this.record(id, clock() - startedAt);
    };
  },

  async measure<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const stop = this.start(id);
    try {
      return await operation();
    } finally {
      stop();
    }
  },

  snapshot(): PerformanceMetricSnapshot[] {
    return [...metrics.entries()]
      .map(([id, metric]) => ({
        id,
        count: metric.count,
        totalMs: metric.totalMs,
        averageMs: metric.count ? metric.totalMs / metric.count : 0,
        minimumMs: metric.minimumMs,
        maximumMs: metric.maximumMs,
        lastMs: metric.lastMs,
        lastAt: metric.lastAt,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  },

  reset(): void {
    metrics.clear();
  },
});
