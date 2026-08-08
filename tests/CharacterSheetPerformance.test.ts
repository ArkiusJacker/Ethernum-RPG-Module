import { beforeEach, describe, expect, it, vi } from "vitest";
import { PF2eCharacterAdapter } from "../scripts/core/PF2eCharacterAdapter.js";
import { CharacterSheetCache } from "../scripts/sheets/core/CharacterSheetCache.js";
import { buildCharacterSheetPresentation } from "../scripts/sheets/core/CharacterSheetPresentation.js";
import { CharacterSheetState } from "../scripts/sheets/core/CharacterSheetState.js";

function average(iterations: number, operation: () => void): number {
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) operation();
  return (performance.now() - started) / iterations;
}

describe("Character Sheet performance smoke", () => {
  beforeEach(() => {
    vi.stubGlobal("game", { i18n: { localize: (key: string) => key } });
    CharacterSheetCache.clear();
  });

  it("records representative adapter, tab, HP and inventory timings", () => {
    const actor = {
      id: "performance-actor",
      uuid: "Actor.performance-actor",
      name: "Performance Hero",
      img: "hero.webp",
      isOwner: true,
      system: {
        details: { level: { value: 10 } },
        attributes: { hp: { value: 80, max: 100, temp: 5 }, ac: { value: 30 }, speed: { value: 25 } },
        perception: { mod: 18 },
        saves: { fortitude: { mod: 19 }, reflex: { mod: 17 }, will: { mod: 20 } },
        resources: { heroPoints: { value: 2, max: 3 }, focus: { value: 1, max: 3 } },
        actions: [],
      },
      skills: {},
      items: new Map(),
      itemTypes: {},
      getFlag: () => undefined,
    } as unknown as Actor;
    const permissions = {
      owner: true,
      gm: false,
      observer: true,
      editable: true,
      canChooseSheet: true,
    };
    const build = () => buildCharacterSheetPresentation({
      identity: PF2eCharacterAdapter.identity(actor),
      vitals: PF2eCharacterAdapter.vitals(actor),
      abilities: PF2eCharacterAdapter.abilities(actor),
      skills: PF2eCharacterAdapter.skills(actor),
      defenses: PF2eCharacterAdapter.defenses(actor),
      movement: PF2eCharacterAdapter.movement(actor),
      strikes: PF2eCharacterAdapter.strikes(actor),
      actions: PF2eCharacterAdapter.actions(actor),
      inventory: PF2eCharacterAdapter.inventory(actor),
      feats: PF2eCharacterAdapter.feats(actor),
      spellcasting: PF2eCharacterAdapter.spellcasting(actor),
      effects: PF2eCharacterAdapter.effects(actor),
      resources: PF2eCharacterAdapter.resources(actor),
    }, permissions);

    const initialRenderMs = average(250, build);
    const state = new CharacterSheetState({
      worldId: "world",
      userId: "user",
      actorId: "performance-actor",
      sheetId: "ethernum",
    }, null);
    const tabChangeMs = average(500, () => { state.setActiveTab("combat"); });
    const hpUpdateMs = average(500, () => {
      CharacterSheetCache.invalidate("performance-actor", "vitals");
      CharacterSheetCache.getOrCreate("performance-actor", "vitals", () => PF2eCharacterAdapter.vitals(actor));
    });
    const inventoryUpdateMs = average(500, () => {
      CharacterSheetCache.invalidate("performance-actor", "inventory");
      CharacterSheetCache.getOrCreate("performance-actor", "inventory", () => PF2eCharacterAdapter.inventory(actor));
    });

    console.info("Ethernum Character Sheet mock performance", {
      initialRenderMs,
      tabChangeMs,
      hpUpdateMs,
      inventoryUpdateMs,
    });
    expect([initialRenderMs, tabChangeMs, hpUpdateMs, inventoryUpdateMs].every(Number.isFinite)).toBe(true);
    expect(build()).toHaveProperty("identity.name", "Performance Hero");
  });
});
