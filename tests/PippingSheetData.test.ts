import { describe, expect, it } from "vitest";
import {
  PIPPING_ACTIONS,
  getPippingAction,
  resolvePippingTargetSpec,
} from "../scripts/mechanics/pipping/progression.js";
import {
  buildPippingSheetData,
  readPippingActorCharismaModifier,
} from "../scripts/mechanics/pipping/sheet-data.js";
import {
  DEFAULT_PIPPING_STATE,
  type PippingNightState,
} from "../scripts/mechanics/pipping/state.js";

function state(overrides: Partial<PippingNightState> = {}): PippingNightState {
  return {
    ...DEFAULT_PIPPING_STATE,
    pulse: 20,
    tier: 5,
    expressionChoices: {
      "1": "destruction",
      "2": "destruction",
      "3": "destruction",
      "4": "destruction",
      "5": "destruction",
    },
    ...overrides,
  };
}

const actor = {
  name: "Pipping Baldwin Black",
  system: {
    abilities: {
      cha: { mod: 4 },
    },
  },
};

describe("Pipping sheet data", () => {
  it("fully explains Dark Whisper without a Foundry localization runtime", () => {
    const sheet = buildPippingSheetData({
      actor,
      state: state(),
      level: 20,
      tier: 5,
      dc: 36,
      isGM: false,
    });
    const whisper = sheet.actions.find(action => action.id === "dark-whisper");

    expect(whisper).toBeDefined();
    expect(whisper?.header.actionLabel).toBe("1 ação");
    expect(whisper?.activation.pulseCost).toBe("1 PS");
    expect(whisper?.activation.optionalCosts).toContain("Intensificado: 2 PS no total");
    expect(whisper?.summaryEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Efeito", value: "+1 circunstancial" }),
      expect.objectContaining({ label: "Intensificado", value: "+2 circunstancial" }),
      expect.objectContaining({ label: "Alvo", value: expect.stringContaining("1 aliado") }),
      expect.objectContaining({ label: "Alvo", value: expect.stringContaining("30 pés") }),
      expect.objectContaining({
        label: "Duração",
        value: "até o início do próximo turno de Pipping",
      }),
    ]));
    expect(whisper?.durationEntries.join(" ")).toContain("primeiro ataque ou salvamento");
    expect(whisper?.durationEntries.join(" ")).toContain("início do próximo turno");
    expect(whisper?.details.flatMap(section => section.entries).map(entry => entry.value).join(" "))
      .toContain("próprio Pipping");
    expect(whisper?.automationEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ component: "Seleção do alvo", mode: "assisted" }),
      expect.objectContaining({ component: "Escolha normal ou intensificada", mode: "automatic" }),
      expect.objectContaining({ component: "Aplicação do efeito", mode: "automatic" }),
      expect.objectContaining({ component: "Consumo no primeiro teste", mode: "automatic" }),
      expect.objectContaining({ component: "Expiração", mode: "automatic" }),
    ]));
  });

  it("builds non-empty structured details for all 22 actions", () => {
    const sheet = buildPippingSheetData({
      actor,
      state: state(),
      level: 20,
      tier: 5,
      dc: 36,
      isGM: true,
    });

    expect(PIPPING_ACTIONS).toHaveLength(22);
    expect(sheet.actions).toHaveLength(22);
    for (const action of sheet.actions) {
      expect(action.name).toBeTruthy();
      expect(action.header.actionLabel).toBeTruthy();
      expect(action.activation.pulseCost).toMatch(/PS$/);
      expect(action.targeting.target || action.targeting.area).toBeTruthy();
      expect(action.summaryEntries.length).toBeGreaterThanOrEqual(3);
      expect(action.summaryEntries.length).toBeLessThanOrEqual(6);
      expect(action.scalingEntries.length).toBeGreaterThan(0);
      expect(action.durationEntries.length).toBeGreaterThan(0);
      expect(action.requirementEntries.length).toBeGreaterThan(0);
      expect(action.automationEntries.length).toBeGreaterThan(0);
      expect(action.details.length).toBeGreaterThan(0);
      expect(action.details.every(section =>
        section.label.length > 0
        && section.entries.length > 0
        && section.entries.every(entry => entry.value.trim().length > 0)
      )).toBe(true);
      if (PIPPING_ACTIONS.find(definition => definition.id === action.id)?.save) {
        expect(action.outcomes.map(outcome => outcome.degree))
          .toEqual(["criticalSuccess", "success", "failure", "criticalFailure"]);
      }
    }
  });

  it("always lists all four degrees for saves, including basic damage", () => {
    const sheet = buildPippingSheetData({
      actor,
      state: state(),
      level: 20,
      tier: 5,
      dc: 36,
      isGM: false,
    });
    const ruinNote = sheet.actions.find(action => action.id === "ruin-note");
    const degrees = ruinNote?.outcomes.map(outcome => outcome.degree);

    expect(degrees).toEqual(["criticalSuccess", "success", "failure", "criticalFailure"]);
    expect(ruinNote?.outcomes.map(outcome => outcome.text)).toEqual(expect.arrayContaining([
      expect.stringContaining("Nenhum dano"),
      expect.stringContaining("Metade do dano"),
      expect.stringContaining("Dano completo"),
      expect.stringContaining("Dano dobrado"),
    ]));
  });

  it("derives formulas and availability without mutating actor or state", () => {
    const actorSnapshot = structuredClone(actor);
    const currentState = state({ pulse: 0 });
    const stateSnapshot = structuredClone(currentState);
    const sheet = buildPippingSheetData({
      actor,
      state: currentState,
      level: 9,
      tier: 3,
      dc: 27,
      isGM: false,
    });

    expect(readPippingActorCharismaModifier(actor)).toBe(4);
    expect(sheet.actions.find(action => action.id === "night-emanation")?.scalingEntries)
      .toContainEqual(expect.objectContaining({ id: "formula", current: "6d6" }));
    expect(sheet.actions.find(action => action.id === "ruin-note")?.usable).toBe(false);
    expect(sheet.actions.find(action => action.id === "ruin-note")?.lockReason)
      .toBe("Pulso Sombrio insuficiente.");
    expect(actor).toEqual(actorSnapshot);
    expect(currentState).toEqual(stateSnapshot);
  });

  it("presents the same resolved range and area consumed by the runtime", () => {
    const level = 9;
    const tier = 3;
    const sheet = buildPippingSheetData({
      actor,
      state: state({ tier }),
      level,
      tier,
      dc: 27,
      isGM: false,
    });
    const shadowFormDefinition = getPippingAction("shadow-form")!;
    const shadowKingDefinition = getPippingAction("shadow-king")!;
    const shadowFormSpec = resolvePippingTargetSpec(shadowFormDefinition, level, tier);
    const shadowKingSpec = resolvePippingTargetSpec(shadowKingDefinition, level, tier);

    expect(sheet.actions.find(action => action.id === "shadow-form")?.targeting.range)
      .toBe(`${shadowFormSpec.range} pés`);
    expect(sheet.actions.find(action => action.id === "shadow-king")?.targeting).toEqual(
      expect.objectContaining({
        area: `Emanação de ${shadowKingSpec.area?.size} pés`,
        origin: "Sombra Animada",
      }),
    );
  });
});
