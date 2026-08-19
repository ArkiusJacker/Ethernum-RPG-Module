import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROFILE_MOTION_DEFINITIONS,
  PROFILE_MOTION_IDS,
  PROFILE_MOTION_VARIABLES,
  ProfileMotionRegistry,
  resolveProfileMotion,
} from "../scripts/sheets/core/ProfileMotionRegistry.js";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("ProfileMotionRegistry", () => {
  it("registers the seven profile motion identities exactly once", () => {
    expect(PROFILE_MOTION_IDS).toEqual([
      "pipping-night",
      "gyro-spin",
      "bayle-rage",
      "arkius-jacker",
      "yu-jiu-ji-tae",
      "charles",
      "atlas-sidarta",
    ]);
    expect(PROFILE_MOTION_DEFINITIONS).toHaveLength(PROFILE_MOTION_IDS.length);
    expect(new Set(PROFILE_MOTION_DEFINITIONS.map(definition => definition.id)).size).toBe(PROFILE_MOTION_IDS.length);
    expect(new Set(PROFILE_MOTION_DEFINITIONS.map(definition => definition.className)).size).toBe(PROFILE_MOTION_IDS.length);
  });

  it("exposes restrained classes and a complete variable contract", () => {
    for (const definition of PROFILE_MOTION_DEFINITIONS) {
      expect(definition.className).toBe(`ecs-profile-motion--${definition.id}`);
      expect(Object.keys(definition.variables).sort()).toEqual([...PROFILE_MOTION_VARIABLES].sort());
      expect(Number.parseFloat(definition.variables["--ecs-profile-motion-scale"])).toBeLessThanOrEqual(1.01);
      expect(Math.abs(Number.parseFloat(definition.variables["--ecs-profile-motion-distance"]))).toBeLessThanOrEqual(2);
    }
  });

  it.each([
    ["full", "5.2s", "1px"],
    ["reduced", "140ms", "0px"],
    ["off", "0ms", "0px"],
  ] as const)("resolves %s motion declaratively", (mode, duration, distance) => {
    expect(resolveProfileMotion("pipping-night", mode)).toMatchObject({
      profileId: "pipping-night",
      mode,
      classes: ["ecs-profile-motion", "ecs-profile-motion--pipping-night", `ecs-profile-motion--${mode}`],
      variables: {
        "--ecs-profile-motion-duration": duration,
        "--ecs-profile-motion-distance": distance,
      },
    });
  });

  it("normalizes profile input, supports the Bayle runtime alias, and rejects unknown profiles", () => {
    expect(ProfileMotionRegistry.resolve(" GYRO-SPIN ")?.profileId).toBe("gyro-spin");
    expect(ProfileMotionRegistry.resolve("bayle-dragon")?.profileId).toBe("bayle-rage");
    expect(ProfileMotionRegistry.resolve("not-a-profile")).toBeNull();
    expect(ProfileMotionRegistry.resolve(null)).toBeNull();
  });

  it("ships isolated CSS for all modes and the operating-system preference", () => {
    const css = read("styles/sheets/profile-motion.css");
    for (const profileId of PROFILE_MOTION_IDS) {
      expect(css).toContain(`ecs-profile-motion--${profileId}`);
      expect(css).toContain(`ecs-profile-${profileId}`);
    }
    for (const mode of ["full", "reduced", "off"]) {
      expect(css).toContain(`data-motion=\"${mode}\"`);
      expect(css).toContain(`ecs-profile-motion--${mode}`);
    }
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("animation: none !important");
  });

  it("loads the isolated stylesheet through the stable base stylesheet", () => {
    const manifest = JSON.parse(read("module.json")) as { styles: string[] };
    const baseCss = read("styles/ethernum.css");
    expect(manifest.styles).toContain("styles/ethernum.css");
    expect(manifest.styles).not.toContain("styles/sheets/profile-motion.css");
    expect(baseCss.trimStart().startsWith('@import url("./sheets/profile-motion.css");')).toBe(true);
  });
});
