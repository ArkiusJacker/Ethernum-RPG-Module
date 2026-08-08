import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getUniqueMechanicProfile } from "../scripts/mechanics/registry.js";
import { selectProfileSheetData } from "../scripts/mechanics/sheet-data.js";
import { UniqueMechanicsKernel } from "../scripts/unique/internal/UniqueMechanicsKernel.js";
import { UniqueMechanicsLegacy } from "../scripts/unique/UniqueMechanicsLegacy.js";

const migratedProfiles = ["arkius", "charles", "atlas", "yu", "bayle", "gyro"] as const;

describe("Mechanics Core 2.1 architecture", () => {
  it.each(migratedProfiles)("keeps %s independent from legacyProfileAdapter", profile => {
    const source = readFileSync(join(process.cwd(), "scripts", "mechanics", profile, "profile.ts"), "utf8");
    expect(source).not.toContain("legacyProfileAdapter");
    expect(source).toContain(`from "./runtime.js"`);
    expect(source).toContain(`from "./sheet-data.js"`);
    expect(source).toContain(`from "./macros.js"`);
  });

  it("keeps the legacy facade below the roadmap limit", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts", "unique", "UniqueMechanicsLegacy.ts"),
      "utf8",
    );
    expect(source.split(/\r?\n/).length).toBeLessThan(4_000);
    expect(source).toContain("extends UniqueMechanicsKernel");
  });

  it("returns only the active character branch from modular sheet data", () => {
    const complete = {
      activeProfile: "charles",
      concordia: { arkius: { id: 1 }, charles: { id: 2 }, atlas: { id: 3 }, yu: { id: 4 } },
      pipping: { id: 5 },
      bayle: { id: 6 },
      gyro: { id: 7 },
    };
    expect(selectProfileSheetData(complete, "charles")).toEqual({
      activeProfile: "charles",
      concordia: { charles: { id: 2 } },
    });
  });
});

describe("migrated profile compatibility", () => {
  const actor = { id: "actor" } as Actor;
  const runtime = { buildSheetData: vi.fn() };

  it.each([
    ["arkius-jacker", "nucleo-em-brasas", "toggleNucleoEmBrasas", {}],
    ["charles", "impulse-climb", "useCharlesImpulseClimb", {}],
    ["atlas-sidarta", "divine-gaze", "activateAtlasDivineGaze", {}],
    ["yu-jiu-ji-tae", "rage", "toggleYuRage", {}],
    ["bayle-dragon", "dragon-breath", "useBayleAction", {}],
    ["gyro-spin", "technique", "useGyroTechnique", { techniqueId: "steel-ball" }],
  ] as const)("routes %s through the same public implementation", async (
    profileId,
    actionId,
    methodName,
    payload,
  ) => {
    const result = { profileId, actionId };
    const method = methodName as keyof typeof UniqueMechanicsKernel;
    const spy = vi.spyOn(UniqueMechanicsKernel, method as never).mockResolvedValue(result as never);
    const profile = getUniqueMechanicProfile(profileId);

    const dispatched = await profile?.executeAction({ actor, runtime }, actionId, payload);
    const legacyMethod = UniqueMechanicsLegacy[method] as unknown as (...args: unknown[]) => Promise<unknown>;
    const legacyArgs = methodName === "useBayleAction"
      ? [actor, actionId]
      : methodName === "useGyroTechnique"
        ? [actor, "steel-ball", "stable"]
        : [actor];
    const legacy = await legacyMethod.call(UniqueMechanicsLegacy, ...legacyArgs);

    expect(dispatched).toBe(result);
    expect(legacy).toBe(result);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
