import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMBAT_TURN_TIMER_FLAG,
  CombatTurnTimer,
  createDefaultCombatTurnTimerState,
  getCombatTurnTimerKey,
  getPreferredCombatTimerDuration,
  getTimerRemainingSeconds,
  normalizeCombatTurnTimerState,
} from "../scripts/combat/CombatTurnTimer.js";

interface FakeCombat {
  id: string;
  round: number;
  turn: number;
  started: boolean;
  combatant: { id: string };
  flags: Record<string, unknown>;
  nextTurnCalls: number;
  getFlag: (scope: string, key: string) => unknown;
  setFlag: (scope: string, key: string, value: unknown) => Promise<unknown>;
  nextTurn: () => Promise<void>;
}

function fakeCombat(): FakeCombat {
  return {
    id: "combat-1",
    round: 1,
    turn: 0,
    started: true,
    combatant: { id: "combatant-a" },
    flags: {},
    nextTurnCalls: 0,
    getFlag(_scope, key) {
      return this.flags[key];
    },
    async setFlag(_scope, key, value) {
      this.flags[key] = value;
      return value;
    },
    async nextTurn() {
      this.nextTurnCalls += 1;
      this.turn += 1;
      this.combatant = { id: "combatant-b" };
    },
  };
}

describe("CombatTurnTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));
    vi.stubGlobal("ui", { notifications: { warn: vi.fn() } });
    vi.stubGlobal("game", {
      user: { id: "gm-a", isGM: true },
      users: [
        { id: "gm-b", active: true, isGM: true },
        { id: "gm-a", active: true, isGM: true },
      ],
      i18n: { localize: (key: string) => key },
      modules: new Map(),
      settings: { get: vi.fn(() => 60) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("normalizes invalid durations and preserves paused state", () => {
    const state = normalizeCombatTurnTimerState({
      enabled: true,
      running: false,
      durationSeconds: 2,
      pausedRemainingSeconds: 3,
    }, "combat", "turn");
    expect(state.durationSeconds).toBe(5);
    expect(state.pausedRemainingSeconds).toBe(3);
  });

  it("uses the preferred duration for a combat without a persisted timer flag", () => {
    const combat = fakeCombat();
    vi.mocked(game.settings!.get).mockReturnValue(90);

    expect(CombatTurnTimer.getState(combat as unknown as Combat)).toMatchObject({
      enabled: false,
      running: false,
      durationSeconds: 90,
      pausedRemainingSeconds: 90,
    });
  });

  it("does not overwrite the duration of a persisted combat timer", () => {
    const combat = fakeCombat();
    combat.flags[COMBAT_TURN_TIMER_FLAG] = createDefaultCombatTurnTimerState(
      combat.id,
      getCombatTurnTimerKey(combat as unknown as Combat),
      30,
    );
    vi.mocked(game.settings!.get).mockReturnValue(120);

    expect(CombatTurnTimer.getState(combat as unknown as Combat).durationSeconds).toBe(30);
  });

  it("clamps invalid preferred durations and survives setting read failures", () => {
    vi.mocked(game.settings!.get).mockReturnValue(1);
    expect(getPreferredCombatTimerDuration()).toBe(5);

    vi.mocked(game.settings!.get).mockReturnValue(100_000);
    expect(getPreferredCombatTimerDuration()).toBe(86_400);

    vi.mocked(game.settings!.get).mockImplementation(() => {
      throw new Error("settings unavailable");
    });
    expect(getPreferredCombatTimerDuration()).toBe(60);
  });

  it("calculates remaining time from timestamps without writes", () => {
    const state = {
      ...createDefaultCombatTurnTimerState("combat", "turn", 60),
      enabled: true,
      running: true,
      startedAt: 1_000,
      pausedRemainingSeconds: 60,
    };
    expect(getTimerRemainingSeconds(state, 16_000)).toBe(45);
  });

  it("advances an expired turn exactly once", async () => {
    const combat = fakeCombat();
    const typedCombat = combat as unknown as Combat;
    const initialKey = getCombatTurnTimerKey(typedCombat);
    expect(initialKey).toContain("combatant-a");

    await CombatTurnTimer.setDuration(typedCombat, 5);
    await CombatTurnTimer.start(typedCombat);
    await CombatTurnTimer.setAutoAdvance(typedCombat, true);
    await vi.advanceTimersByTimeAsync(5_100);
    await vi.runAllTicks();

    expect(combat.nextTurnCalls).toBe(1);
    await CombatTurnTimer.handleCombatUpdate(typedCombat);
    expect(CombatTurnTimer.getState(typedCombat)).toMatchObject({
      running: true,
      pausedRemainingSeconds: 5,
    });

    await vi.advanceTimersByTimeAsync(5_100);
    expect(combat.nextTurnCalls).toBe(2);
    CombatTurnTimer.handleCombatDelete(typedCombat);
  });

  it("preserves a paused timer during a manual turn change", async () => {
    const combat = fakeCombat();
    const typedCombat = combat as unknown as Combat;
    await CombatTurnTimer.setDuration(typedCombat, 30);
    await CombatTurnTimer.start(typedCombat);
    await CombatTurnTimer.pause(typedCombat);

    combat.turn = 1;
    combat.combatant = { id: "combatant-b" };
    await CombatTurnTimer.handleCombatUpdate(typedCombat);

    const state = CombatTurnTimer.getState(typedCombat);
    expect(state.running).toBe(false);
    expect(state.pausedRemainingSeconds).toBe(30);
    expect(state.turnKey).toContain("combatant-b");
    CombatTurnTimer.handleCombatDelete(typedCombat);
  });

  it("pauses, resumes, and resets from timestamp-based remaining time", async () => {
    const combat = fakeCombat();
    const typedCombat = combat as unknown as Combat;
    await CombatTurnTimer.setDuration(typedCombat, 60);
    await CombatTurnTimer.start(typedCombat);
    await vi.advanceTimersByTimeAsync(10_000);
    await CombatTurnTimer.pause(typedCombat);
    expect(CombatTurnTimer.getState(typedCombat).pausedRemainingSeconds).toBe(50);

    await CombatTurnTimer.resume(typedCombat);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(getTimerRemainingSeconds(CombatTurnTimer.getState(typedCombat))).toBe(45);

    await CombatTurnTimer.reset(typedCombat);
    expect(getTimerRemainingSeconds(CombatTurnTimer.getState(typedCombat))).toBe(60);
    CombatTurnTimer.handleCombatDelete(typedCombat);
  });

  it("does not allow a player to mutate timer flags", async () => {
    const combat = fakeCombat();
    const typedCombat = combat as unknown as Combat;
    (game as Game).user!.isGM = false;

    await CombatTurnTimer.start(typedCombat);

    expect(combat.flags).toEqual({});
    expect(ui.notifications?.warn).toHaveBeenCalledOnce();
    CombatTurnTimer.handleCombatDelete(typedCombat);
  });

  it("cancels an automatic advance when the combat is deleted", async () => {
    const combat = fakeCombat();
    const typedCombat = combat as unknown as Combat;
    await CombatTurnTimer.setDuration(typedCombat, 5);
    await CombatTurnTimer.start(typedCombat);
    await CombatTurnTimer.setAutoAdvance(typedCombat, true);

    CombatTurnTimer.handleCombatDelete(typedCombat);
    await vi.advanceTimersByTimeAsync(5_100);

    expect(combat.nextTurnCalls).toBe(0);
  });

  it("clears the old GM schedule and lets the new primary GM resume it", async () => {
    const combat = fakeCombat();
    const typedCombat = combat as unknown as Combat;
    (game as Game).combat = typedCombat;
    await CombatTurnTimer.setDuration(typedCombat, 10);
    await CombatTurnTimer.start(typedCombat);
    await CombatTurnTimer.setAutoAdvance(typedCombat, true);
    await vi.advanceTimersByTimeAsync(2_000);

    const users = Array.from(game.users ?? []) as Array<User & { active: boolean }>;
    users[1].active = false;
    await CombatTurnTimer.handleAuthorityChange();

    await vi.advanceTimersByTimeAsync(3_000);
    expect(combat.nextTurnCalls).toBe(0);

    (game as Game).user = users[0];
    await CombatTurnTimer.handleAuthorityChange();
    await vi.advanceTimersByTimeAsync(5_100);
    expect(combat.nextTurnCalls).toBe(1);
    CombatTurnTimer.handleCombatDelete(typedCombat);
  });

  it("advances an already expired timer once when the new GM takes authority", async () => {
    const combat = fakeCombat();
    const typedCombat = combat as unknown as Combat;
    (game as Game).combat = typedCombat;
    await CombatTurnTimer.setDuration(typedCombat, 5);
    await CombatTurnTimer.start(typedCombat);
    await CombatTurnTimer.setAutoAdvance(typedCombat, true);

    const users = Array.from(game.users ?? []) as Array<User & { active: boolean }>;
    users[1].active = false;
    await CombatTurnTimer.handleAuthorityChange();
    await vi.advanceTimersByTimeAsync(5_100);
    expect(combat.nextTurnCalls).toBe(0);

    (game as Game).user = users[0];
    await CombatTurnTimer.handleAuthorityChange();
    await CombatTurnTimer.handleAuthorityChange();

    expect(combat.nextTurnCalls).toBe(1);
    CombatTurnTimer.handleCombatDelete(typedCombat);
  });

  it("debounces repeated authority change signals", async () => {
    const handleAuthorityChange = vi
      .spyOn(CombatTurnTimer, "handleAuthorityChange")
      .mockResolvedValue();

    CombatTurnTimer.queueAuthorityChange();
    CombatTurnTimer.queueAuthorityChange();
    await vi.advanceTimersByTimeAsync(149);
    expect(handleAuthorityChange).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(handleAuthorityChange).toHaveBeenCalledOnce();
  });
});
