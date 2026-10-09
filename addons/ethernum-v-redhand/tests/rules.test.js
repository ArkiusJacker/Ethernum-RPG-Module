import { describe, expect, it } from "vitest";
import { consumeTrackedAmmo, claimEncounterGlitch, classifyStrikeOutcome, createKeyedMutex, isSafeSfxPath, migrateVState } from "../scripts/rules.js";

describe("V RedHand pure rules", () => {
  it("claims the first Glitch once and never restores a spent cartridge", () => {
    const encounter = { log: [], cartridge: false, cartridgeSpent: false };
    expect(claimEncounterGlitch(encounter, "glitch-1")).toEqual({ duplicate: false, cartridgeGranted: true });
    encounter.log.push({ eventId: "glitch-1", glitch: true, result: 1 });
    encounter.cartridgeSpent = true;
    expect(claimEncounterGlitch(encounter, "glitch-1")).toEqual({ duplicate: true, cartridgeGranted: false });
    expect(claimEncounterGlitch(encounter, "glitch-2")).toEqual({ duplicate: false, cartridgeGranted: false });
    expect(encounter.cartridgeSpent).toBe(true);
  });

  it("consumes a magazine once per Strike message and tracks each Twin Colt separately", () => {
    const encounter = {
      ammo: {
        Railgun: { kind: "bullet", rounds: 2, max: 3 },
        "Twin Colts": { kind: "pair", left: 1, right: 2 },
      },
    };
    expect(consumeTrackedAmmo(encounter, { eventId: "rail-1", weaponName: "Railgun" })).toMatchObject({ consumed: true, remaining: 1 });
    expect(consumeTrackedAmmo(encounter, { eventId: "rail-1", weaponName: "Railgun" })).toMatchObject({ consumed: false, duplicate: true });
    expect(consumeTrackedAmmo(encounter, { eventId: "twin-1", weaponName: "Twin Colts", hand: "left" })).toMatchObject({ consumed: true, remaining: 0, hand: "left" });
    expect(consumeTrackedAmmo(encounter, { eventId: "twin-2", weaponName: "Twin Colts", hand: "left" })).toMatchObject({ consumed: false, reason: "empty" });
    expect(encounter.ammo["Twin Colts"].right).toBe(2);
  });

  it("classifies Strike results and rejects ambiguous flavor", () => {
    expect(classifyStrikeOutcome({ degreeOfSuccess: 3 })).toBe("critical");
    expect(classifyStrikeOutcome({ outcome: "success" })).toBe("success");
    expect(classifyStrikeOutcome({}, "Critical Failure")).toBe("failure");
    expect(classifyStrikeOutcome({}, "Strike card")).toBe("unknown");
  });

  it("serializes asynchronous actions for the same Actor key", async () => {
    const mutex = createKeyedMutex();
    let active = 0;
    let peak = 0;
    const operation = async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active -= 1;
    };
    await Promise.all([mutex("V", operation), mutex("V", operation), mutex("V", operation)]);
    expect(peak).toBe(1);
  });

  it("migrates old roulette data while preserving encounter progress", () => {
    const state = {
      schemaVersion: 1,
      encounter: {
        current: { mode: "G", result: 19 },
        spins: 2,
        cartridge: true,
        cartridgeSpent: true,
        pendingUltimateBonus: { formula: "6d6" },
        log: [{ result: 20, name: "Old Ultimate", at: 123 }, { result: 19, name: "Railgun" }],
      },
      daily: { tax: 5, draft: [2] },
    };
    migrateVState(state, { schemaVersion: 1 }, {
      weaponFor: (mode, result) => ({ mode, result, name: "Migrated weapon" }),
      isUltimateName: name => name === "Old Ultimate",
    });
    expect(state.schemaVersion).toBe(4);
    expect(state.encounter.current).toMatchObject({ result: 20, name: "Migrated weapon" });
    expect(state.encounter.log[0]).toMatchObject({ result: 1, glitch: true, eventId: "legacy-123-0" });
    expect(state.encounter.log[1].result).toBe(20);
    expect(state.encounter).toMatchObject({ spins: 2, cartridge: true, cartridgeSpent: true, pendingUltimateBonus: null });
    expect(state.daily).toMatchObject({ tax: 5, draft: [2] });
    expect(state.encounter.processedStrikeMessages).toEqual([]);
  });

  it("accepts only audio paths inside this module", () => {
    expect(isSafeSfxPath("modules/ethernum-v-redhand/audio/01_CYBERPUNK/CP_Scanner_Open.mp3")).toBe(true);
    expect(isSafeSfxPath("modules/ethernum-v-redhand/audio/../../secret.mp3")).toBe(false);
    expect(isSafeSfxPath("https://example.invalid/audio.mp3")).toBe(false);
    expect(isSafeSfxPath("modules/ethernum-v-redhand/audio/custom.mp3?autoplay=1")).toBe(false);
  });
});
