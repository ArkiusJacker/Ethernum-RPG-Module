import { ETHERNUM } from "../config.js";
import { AutomationAuthority } from "../core/AutomationAuthority.js";

export const COMBAT_TURN_TIMER_FLAG = "combatTurnTimer";
export const DEFAULT_TURN_DURATION_SECONDS = 60;
const MIN_DURATION_SECONDS = 5;
const MAX_DURATION_SECONDS = 24 * 60 * 60;

export interface CombatTurnTimerState {
  version: 1;
  enabled: boolean;
  running: boolean;
  autoAdvance: boolean;
  durationSeconds: number;
  startedAt: number;
  pausedRemainingSeconds: number;
  combatId: string;
  turnKey: string;
  lastAdvancedTurnKey: string;
  revision: number;
}

export interface TimerSnapshot {
  state: CombatTurnTimerState;
  remainingSeconds: number;
  expired: boolean;
  status: "disabled" | "paused" | "running" | "expired";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function clampDuration(value: unknown): number {
  const duration = Math.floor(Number(value));
  if (!Number.isFinite(duration)) return DEFAULT_TURN_DURATION_SECONDS;
  return Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, duration));
}

export function timerNow(): number {
  const serverTime = Number((game as Game & { time?: { serverTime?: number } }).time?.serverTime);
  return Number.isFinite(serverTime) && serverTime > 0 ? serverTime : Date.now();
}

export function getCombatTurnTimerKey(combat: Combat): string {
  const data = combat as Combat & {
    turn?: number | null;
    combatant?: { id?: string | null };
    current?: { combatantId?: string | null };
  };
  const combatantId = data.combatant?.id ?? data.current?.combatantId ?? "none";
  return `${combat.id ?? "combat"}:${combat.round ?? 0}:${data.turn ?? -1}:${combatantId}`;
}

export function createDefaultCombatTurnTimerState(
  combatId = "",
  turnKey = "",
  durationSeconds = DEFAULT_TURN_DURATION_SECONDS,
): CombatTurnTimerState {
  const duration = clampDuration(durationSeconds);
  return {
    version: 1,
    enabled: false,
    running: false,
    autoAdvance: false,
    durationSeconds: duration,
    startedAt: 0,
    pausedRemainingSeconds: duration,
    combatId,
    turnKey,
    lastAdvancedTurnKey: "",
    revision: 0,
  };
}

export function normalizeCombatTurnTimerState(
  value: unknown,
  combatId = "",
  turnKey = "",
): CombatTurnTimerState {
  const state = asRecord(value);
  const durationSeconds = clampDuration(state.durationSeconds);
  const paused = Number(state.pausedRemainingSeconds);
  const startedAt = Number(state.startedAt);
  return {
    ...createDefaultCombatTurnTimerState(combatId, turnKey, durationSeconds),
    version: 1,
    enabled: Boolean(state.enabled),
    running: Boolean(state.running),
    autoAdvance: Boolean(state.autoAdvance),
    durationSeconds,
    startedAt: Number.isFinite(startedAt) && startedAt > 0 ? startedAt : 0,
    pausedRemainingSeconds: Number.isFinite(paused)
      ? Math.min(durationSeconds, Math.max(0, paused))
      : durationSeconds,
    combatId: typeof state.combatId === "string" ? state.combatId : combatId,
    turnKey: typeof state.turnKey === "string" ? state.turnKey : turnKey,
    lastAdvancedTurnKey: typeof state.lastAdvancedTurnKey === "string" ? state.lastAdvancedTurnKey : "",
    revision: Math.max(0, Math.floor(Number(state.revision ?? 0) || 0)),
  };
}

export function getTimerRemainingSeconds(
  state: CombatTurnTimerState,
  now = timerNow(),
): number {
  if (!state.enabled) return state.durationSeconds;
  if (!state.running || state.startedAt <= 0) return Math.max(0, state.pausedRemainingSeconds);
  const elapsed = Math.max(0, (now - state.startedAt) / 1000);
  return Math.max(0, state.pausedRemainingSeconds - elapsed);
}

export function getTimerSnapshot(
  state: CombatTurnTimerState,
  now = timerNow(),
): TimerSnapshot {
  const remainingSeconds = getTimerRemainingSeconds(state, now);
  const status = !state.enabled
    ? "disabled"
    : remainingSeconds <= 0
      ? "expired"
      : state.running
        ? "running"
        : "paused";
  return {
    state,
    remainingSeconds,
    expired: remainingSeconds <= 0,
    status,
  };
}

function isCombatStarted(combat: Combat): boolean {
  const data = combat as Combat & { started?: boolean; turn?: number | null };
  return Boolean(data.started ?? ((combat.round ?? 0) > 0 && data.turn !== null));
}

export class CombatTurnTimer {
  private static timeoutByCombat = new Map<string, ReturnType<typeof setTimeout>>();
  private static queueByCombat = new Map<string, Promise<unknown>>();

  static getState(combat: Combat): CombatTurnTimerState {
    const raw = combat.getFlag(ETHERNUM.MODULE_NAME, COMBAT_TURN_TIMER_FLAG);
    return normalizeCombatTurnTimerState(raw, combat.id ?? "", getCombatTurnTimerKey(combat));
  }

  static getActiveSnapshot(now = timerNow()): TimerSnapshot | null {
    return game.combat ? getTimerSnapshot(this.getState(game.combat), now) : null;
  }

  private static enqueue<T>(combat: Combat, operation: () => Promise<T>): Promise<T> {
    const key = combat.id ?? "combat";
    const previous = this.queueByCombat.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    this.queueByCombat.set(key, next);
    void next.finally(() => {
      if (this.queueByCombat.get(key) === next) this.queueByCombat.delete(key);
    });
    return next;
  }

  private static requireAuthority(): boolean {
    if (game.user?.isGM && AutomationAuthority.isPrimaryGM()) return true;
    ui.notifications?.warn(game.i18n!.localize("ETHERNUM.CombatTimer.Errors.NotAuthority"));
    return false;
  }

  private static async persist(
    combat: Combat,
    next: CombatTurnTimerState,
  ): Promise<CombatTurnTimerState> {
    await combat.setFlag(ETHERNUM.MODULE_NAME, COMBAT_TURN_TIMER_FLAG, {
      ...next,
      revision: next.revision + 1,
    });
    const persisted = this.getState(combat);
    this.schedule(combat, persisted);
    return persisted;
  }

  static async setDuration(combat: Combat, durationSeconds: number): Promise<CombatTurnTimerState> {
    if (!this.requireAuthority()) return this.getState(combat);
    return this.enqueue(combat, async () => {
      const current = this.getState(combat);
      const duration = clampDuration(durationSeconds);
      return this.persist(combat, {
        ...current,
        durationSeconds: duration,
        startedAt: current.running ? timerNow() : 0,
        pausedRemainingSeconds: duration,
      });
    });
  }

  static async start(combat: Combat): Promise<CombatTurnTimerState> {
    if (!this.requireAuthority()) return this.getState(combat);
    return this.enqueue(combat, async () => {
      const current = this.getState(combat);
      const remaining = current.pausedRemainingSeconds > 0
        ? current.pausedRemainingSeconds
        : current.durationSeconds;
      return this.persist(combat, {
        ...current,
        enabled: true,
        running: true,
        startedAt: timerNow(),
        pausedRemainingSeconds: remaining,
        combatId: combat.id ?? "",
        turnKey: getCombatTurnTimerKey(combat),
        lastAdvancedTurnKey: current.turnKey === getCombatTurnTimerKey(combat)
          ? current.lastAdvancedTurnKey
          : "",
      });
    });
  }

  static async pause(combat: Combat): Promise<CombatTurnTimerState> {
    if (!this.requireAuthority()) return this.getState(combat);
    return this.enqueue(combat, async () => {
      const current = this.getState(combat);
      return this.persist(combat, {
        ...current,
        running: false,
        startedAt: 0,
        pausedRemainingSeconds: getTimerRemainingSeconds(current),
      });
    });
  }

  static async resume(combat: Combat): Promise<CombatTurnTimerState> {
    return this.start(combat);
  }

  static async reset(combat: Combat): Promise<CombatTurnTimerState> {
    if (!this.requireAuthority()) return this.getState(combat);
    return this.enqueue(combat, async () => {
      const current = this.getState(combat);
      return this.persist(combat, {
        ...current,
        startedAt: current.running ? timerNow() : 0,
        pausedRemainingSeconds: current.durationSeconds,
        turnKey: getCombatTurnTimerKey(combat),
        lastAdvancedTurnKey: "",
      });
    });
  }

  static async setAutoAdvance(combat: Combat, autoAdvance: boolean): Promise<CombatTurnTimerState> {
    if (!this.requireAuthority()) return this.getState(combat);
    return this.enqueue(combat, async () => {
      const current = this.getState(combat);
      return this.persist(combat, { ...current, autoAdvance });
    });
  }

  static async disable(combat: Combat): Promise<CombatTurnTimerState> {
    if (!this.requireAuthority()) return this.getState(combat);
    return this.enqueue(combat, async () => {
      const current = this.getState(combat);
      this.clearSchedule(combat.id ?? "");
      return this.persist(combat, {
        ...current,
        enabled: false,
        running: false,
        autoAdvance: false,
        startedAt: 0,
        pausedRemainingSeconds: current.durationSeconds,
      });
    });
  }

  static async advanceNow(combat: Combat): Promise<void> {
    if (!this.requireAuthority()) return;
    await this.advanceTurnOnce(combat, false);
  }

  private static async advanceTurnOnce(combat: Combat, automatic: boolean): Promise<void> {
    await this.enqueue(combat, async () => {
      const current = this.getState(combat);
      const turnKey = getCombatTurnTimerKey(combat);
      if (!isCombatStarted(combat) || current.turnKey !== turnKey) return;
      if (automatic && (!current.enabled || !current.running || !current.autoAdvance)) return;
      if (automatic && getTimerRemainingSeconds(current) > 0) return;
      if (current.lastAdvancedTurnKey === turnKey) return;
      if (!AutomationAuthority.isPrimaryGM()) return;

      await this.persist(combat, {
        ...current,
        running: current.running,
        startedAt: current.running ? timerNow() : 0,
        pausedRemainingSeconds: 0,
        lastAdvancedTurnKey: turnKey,
      });

      const finalState = this.getState(combat);
      if (
        getCombatTurnTimerKey(combat) !== turnKey
        || finalState.lastAdvancedTurnKey !== turnKey
        || !AutomationAuthority.isPrimaryGM()
      ) return;

      try {
        console.debug(`Ethernum | Timer avancando turno ${turnKey}`);
        await combat.nextTurn();
      } catch (error) {
        console.error("Ethernum | Falha ao avançar turno pelo temporizador", error);
        const failed = this.getState(combat);
        if (getCombatTurnTimerKey(combat) === turnKey) {
          await this.persist(combat, {
            ...failed,
            running: current.running,
            startedAt: current.running ? timerNow() : 0,
            pausedRemainingSeconds: current.durationSeconds,
            lastAdvancedTurnKey: "",
          });
        }
      }
    });
  }

  static async handleCombatUpdate(combat: Combat): Promise<void> {
    const current = this.getState(combat);
    const turnKey = getCombatTurnTimerKey(combat);
    if (current.enabled && current.turnKey !== turnKey && AutomationAuthority.isPrimaryGM()) {
      await this.enqueue(combat, async () => {
        const latest = this.getState(combat);
        if (latest.turnKey === turnKey) return latest;
        return this.persist(combat, {
          ...latest,
          running: latest.running,
          startedAt: latest.running ? timerNow() : 0,
          pausedRemainingSeconds: latest.durationSeconds,
          combatId: combat.id ?? "",
          turnKey,
          lastAdvancedTurnKey: "",
        });
      });
      return;
    }
    this.schedule(combat, current);
  }

  static handleCombatDelete(combat: Combat): void {
    this.clearSchedule(combat.id ?? "");
    this.queueByCombat.delete(combat.id ?? "");
  }

  static schedule(combat: Combat, state = this.getState(combat)): void {
    const combatId = combat.id ?? "";
    this.clearSchedule(combatId);
    if (
      !AutomationAuthority.isPrimaryGM()
      || !state.enabled
      || !state.running
      || !state.autoAdvance
      || !isCombatStarted(combat)
      || state.turnKey !== getCombatTurnTimerKey(combat)
    ) return;

    const remainingMilliseconds = Math.max(0, getTimerRemainingSeconds(state) * 1000);
    const timeout = setTimeout(() => {
      void this.advanceTurnOnce(combat, true);
    }, Math.min(remainingMilliseconds + 25, 2_147_000_000));
    this.timeoutByCombat.set(combatId, timeout);
  }

  private static clearSchedule(combatId: string): void {
    const timeout = this.timeoutByCombat.get(combatId);
    if (timeout) clearTimeout(timeout);
    this.timeoutByCombat.delete(combatId);
  }
}
