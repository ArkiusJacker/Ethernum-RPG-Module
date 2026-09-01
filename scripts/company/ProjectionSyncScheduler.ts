export interface ProjectionSyncSchedulerOptions {
  isAuthoritative: () => boolean;
  synchronize: () => Promise<void> | void;
  onError?: (error: unknown) => void;
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

export interface ProjectionSyncScheduler {
  schedule: (delayMs?: number) => boolean;
  cancel: () => boolean;
  pending: () => boolean;
}

export function createProjectionSyncScheduler(options: ProjectionSyncSchedulerOptions): ProjectionSyncScheduler {
  const setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimer = options.clearTimer ?? (timer => clearTimeout(timer));
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = (): boolean => {
    if (!timer) return false;
    clearTimer(timer);
    timer = null;
    return true;
  };

  return Object.freeze({
    schedule(delayMs = 150): boolean {
      if (!options.isAuthoritative()) return false;
      cancel();
      timer = setTimer(() => {
        timer = null;
        void Promise.resolve(options.synchronize()).catch(error => options.onError?.(error));
      }, Math.max(0, delayMs));
      return true;
    },
    cancel,
    pending: () => timer !== null,
  });
}
