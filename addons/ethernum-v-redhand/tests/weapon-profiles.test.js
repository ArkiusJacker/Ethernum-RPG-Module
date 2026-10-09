import { describe, expect, it } from "vitest";
import { ultimateProfiles, ultimates, wayProfiles, weaponsG, weaponsS } from "../scripts/data.js";
import { validateUltimateProfileCatalog, validateWeaponProfileCatalog, weaponProfileFor } from "../scripts/weapon-profiles.js";

describe("V RedHand weapon catalog", () => {
  it("defines explicit profiles for every regular roulette result", () => {
    expect(weaponsG).toHaveLength(19);
    expect(weaponsS).toHaveLength(19);
    expect(validateWeaponProfileCatalog({ weaponsG, weaponsS, wayProfiles })).toEqual([]);
    for (const [name, , , effect] of [...weaponsG, ...weaponsS]) {
      const profile = weaponProfileFor({ name });
      expect(profile, name).toBeTruthy();
      expect(profile.damage.dice).toBeGreaterThan(0);
      expect(profile.damageOptions.some(option => option.type === profile.damage.type)).toBe(true);
      expect(Array.isArray(profile.traits)).toBe(true);
      expect(effect).toBeTruthy();
    }
  });

  it("validates all 22 Ultimate signatures and the Gume do Infinito bonus", () => {
    expect(ultimates).toHaveLength(22);
    expect(validateUltimateProfileCatalog({ ultimates, profiles: ultimateProfiles, wayProfiles })).toEqual([]);
    expect(ultimateProfiles["Gume do Infinito"]).toMatchObject({
      kind: "strike",
      label: "Corte Perfeito",
      bonus: "6d6",
      bonusType: "precision",
    });
  });

  it("replaces the selected alternate damage type without changing declared traits", () => {
    const original = weaponProfileFor({ name: "Malorian Arms 3516" });
    const fire = weaponProfileFor({ name: "Malorian Arms 3516", damageChoice: "fire" });
    expect(original.damageType).toBe("piercing");
    expect(fire.damageType).toBe("fire");
    expect(fire.traits).toEqual(original.traits);
  });
});
