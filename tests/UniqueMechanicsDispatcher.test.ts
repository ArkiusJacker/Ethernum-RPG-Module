import { describe, expect, it, vi } from "vitest";
import { UniqueMechanicsDispatcher } from "../scripts/unique/core/UniqueMechanicsDispatcher.js";
import type { UniqueMechanicsRuntime } from "../scripts/mechanics/types.js";

const PROFILE_IDS = [
  "gyro-spin",
  "bayle-dragon",
  "pipping-night",
  "arkius-jacker",
  "yu-jiu-ji-tae",
  "charles",
  "atlas-sidarta",
] as const;

function actor(profileId: string): Actor {
  return {
    getFlag: vi.fn(() => ({ activeProfile: profileId })),
  } as unknown as Actor;
}

function runtime(): UniqueMechanicsRuntime {
  return {
    buildSheetData: vi.fn((_actor: Actor, isGM: boolean) => ({ isGM })),
    usePippingAction: vi.fn(async () => undefined),
  } as unknown as UniqueMechanicsRuntime;
}

describe("UniqueMechanicsDispatcher", () => {
  it.each(PROFILE_IDS)("resolves the %s profile", profileId => {
    expect(UniqueMechanicsDispatcher.resolve(actor(profileId))?.id).toBe(profileId);
  });

  it("delegates sheet construction through the active profile", () => {
    const legacy = runtime();
    expect(UniqueMechanicsDispatcher.buildSheetData(actor("pipping-night"), true, legacy)).toEqual({
      isGM: true,
    });
    expect(legacy.buildSheetData).toHaveBeenCalledOnce();
  });

  it("delegates an action without bypassing its profile", async () => {
    const legacy = runtime();
    const source = actor("pipping-night");
    await UniqueMechanicsDispatcher.executeAction(source, "ruin-note", {}, legacy);
    expect(legacy.usePippingAction).toHaveBeenCalledWith(source, "ruin-note");
  });
});
