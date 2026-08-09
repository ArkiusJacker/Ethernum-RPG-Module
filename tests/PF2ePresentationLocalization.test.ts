import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PF2ePresentationLocalization,
  localizePF2eRank,
  localizePF2eValue,
  localizePF2eValues,
} from "../scripts/sheets/core/PF2ePresentationLocalization.js";

const translations: Record<string, string> = {
  "PF2E.ProficiencyLevel0": "Destreinado",
  "PF2E.ProficiencyLevel2": "Especialista",
  "PF2E.LanguageDwarven": "Anão",
  "PF2E.SenseDarkvision": "Visão no Escuro",
  "PF2E.Actor.Creature.Sense.Acuity.Precise": "Preciso",
  "PF2E.Foot.Abbreviation": "pés",
  "PF2E.TraitAgile": "Ágil",
  "PF2E.TraditionArcane": "Arcana",
  "PF2E.DamageTypeFire": "Fogo",
  "PF2E.SpellPreparationTypePrepared": "Preparada",
};

beforeEach(() => {
  vi.stubGlobal("CONFIG", {
    PF2E: {
      languages: { dwarven: "PF2E.LanguageDwarven" },
      senses: { darkvision: { label: "PF2E.SenseDarkvision" } },
      weaponGroups: new Map([["sword", "Espadas"]]),
      armorGroups: { plate: { label: "Armadura de Placas" } },
      actionTraits: { agile: "PF2E.TraitAgile" },
      magicTraditions: { arcane: "PF2E.TraditionArcane" },
      damageTypes: { fire: "PF2E.DamageTypeFire" },
    },
  });
  vi.stubGlobal("game", {
    i18n: {
      localize: (key: string) => translations[key] ?? key,
    },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("PF2ePresentationLocalization", () => {
  it("uses official PF2e proficiency keys", () => {
    expect(localizePF2eRank(0)).toBe("Destreinado");
    expect(localizePF2eRank(2)).toBe("Especialista");
    expect(localizePF2eRank(99)).toBe("Legendary");
  });

  it("resolves PF2e dictionaries before humanizing slugs", () => {
    expect(PF2ePresentationLocalization.language("dwarven")).toBe("Anão");
    expect(PF2ePresentationLocalization.sense("darkvision")).toBe("Visão no Escuro");
    expect(PF2ePresentationLocalization.senseAcuity("precise")).toBe("Preciso");
    expect(PF2ePresentationLocalization.distanceUnit()).toBe("pés");
    expect(PF2ePresentationLocalization.weaponGroup("sword")).toBe("Espadas");
    expect(PF2ePresentationLocalization.armorGroup("plate")).toBe("Armadura de Placas");
    expect(PF2ePresentationLocalization.trait("agile")).toBe("Ágil");
    expect(PF2ePresentationLocalization.tradition("arcane")).toBe("Arcana");
    expect(PF2ePresentationLocalization.damageType("fire")).toBe("Fogo");
    expect(PF2ePresentationLocalization.preparation("prepared")).toBe("Preparada");
  });

  it("returns readable, deduplicated labels when PF2e has no dictionary entry", () => {
    expect(localizePF2eValue("language", "shadow-tongue")).toBe("Shadow Tongue");
    expect(localizePF2eValues("trait", ["agile", "agile", "cold-iron"])).toEqual(["Ágil", "Cold Iron"]);
  });
});
