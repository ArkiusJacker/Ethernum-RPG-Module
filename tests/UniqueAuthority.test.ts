import { describe, expect, it } from "vitest";
import { validateUniqueMutationPayload } from "../scripts/core/PF2eAdapter.js";
import { validateUniqueCanvasOperation } from "../scripts/core/UniqueCanvasAdapter.js";
import {
  DEFAULT_ARKIUS_STATE,
  hasActiveArkiusKineticAura,
} from "../scripts/mechanics/arkius/profile.js";

describe("unique mechanic authority policies", () => {
  it("allows Yu to apply the supported target conditions", () => {
    expect(() => validateUniqueMutationPayload("yu-jiu-ji-tae", "yu-stunning-fist", [{
      actorUuid: "Actor.target",
      conditions: [{ slug: "stunned", value: 1 }],
    }])).not.toThrow();
  });

  it("rejects a mutation borrowed from another profile", () => {
    expect(() => validateUniqueMutationPayload("charles", "yu-stunning-fist", [{
      actorUuid: "Actor.target",
      conditions: [{ slug: "stunned", value: 1 }],
    }])).toThrow(/mecânica ativa/i);
  });

  it("rejects unsupported conditions and excessive HP changes", () => {
    expect(() => validateUniqueMutationPayload("charles", "charles-vector-pull", [{
      actorUuid: "Actor.target",
      conditions: [{ slug: "doomed", value: 1 }],
    }])).toThrow(/condição/i);
    expect(() => validateUniqueMutationPayload("arkius-jacker", "arkius-exaurir-o-sol", [{
      actorUuid: "Actor.target",
      hpDelta: -501,
    }])).toThrow(/PV/i);
  });

  it("allows the bounded Atlas buff rules", () => {
    expect(() => validateUniqueMutationPayload("atlas-sidarta", "atlas-steel-resonance", [{
      actorUuid: "Actor.ally",
      effects: [{
        name: "Ressonância de Aço",
        slug: "atlas-ressonancia-de-aco-Actor.source",
        description: "+1 de status na CA.",
        duration: { value: 2, unit: "rounds", expiry: "turn-start" },
        rules: [{ key: "Resistance", type: "slashing", value: 5 }],
      }],
    }])).not.toThrow();
  });
});

describe("unique canvas authority policies", () => {
  it("keeps the Jacker aura active even when Thermal Nimbus is disabled", () => {
    expect(hasActiveArkiusKineticAura({
      ...DEFAULT_ARKIUS_STATE,
      kineticAura: { ...DEFAULT_ARKIUS_STATE.kineticAura, active: true },
      thermalNimbus: { ...DEFAULT_ARKIUS_STATE.thermalNimbus, active: false },
    })).toBe(true);
  });

  it("allows the Jacker aura independently from Thermal Nimbus", () => {
    expect(() => validateUniqueCanvasOperation("arkius-jacker", {
      type: "upsert-arkius-aura",
      sceneId: "scene",
      sourceTokenId: "token",
      radius: 10,
    })).not.toThrow();
  });

  it("rejects profile spoofing and invalid template ranges", () => {
    expect(() => validateUniqueCanvasOperation("charles", {
      type: "upsert-arkius-aura",
      sceneId: "scene",
      sourceTokenId: "token",
      radius: 10,
    })).toThrow(/mecânica ativa/i);
    expect(() => validateUniqueCanvasOperation("arkius-jacker", {
      type: "create-arkius-solar",
      sceneId: "scene",
      sourceTokenId: "token",
      templateType: "ray",
      distance: 120,
      direction: 0,
      fillColor: "#d94122",
    })).toThrow(/distância/i);
  });
});
