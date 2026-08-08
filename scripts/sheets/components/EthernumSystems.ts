import { ETHERNUM } from "../../config.js";
import type { CharacterSheetModule } from "../core/CharacterSheetModuleRegistry.js";
import { CharacterSheetCache } from "../core/CharacterSheetCache.js";
import type { CharacterSheetModuleContext, CharacterSheetModuleOutput } from "./types.js";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export const EthernumSystemsModule: CharacterSheetModule<CharacterSheetModuleContext, CharacterSheetModuleOutput> = {
  id: "ethernum-systems",
  order: 90,
  isVisible: context => context.sheetId === "ethernum",
  build: ({ actor, actorId, core }) => CharacterSheetCache.getOrCreate(actorId, "ethernum", () => {
    const allRunes = actor.getFlag(ETHERNUM.MODULE_NAME, "runes");
    const runes = Array.isArray(allRunes)
      ? allRunes.filter(rune => {
        const runeCore = record(rune).core;
        return runeCore === undefined ? core === "ethernum-company" : runeCore === core;
      })
      : [];
    return {
      ethernumSystems: {
        ether: record(actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem")),
        attributes: record(actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes")),
        talents: record(actor.getFlag(ETHERNUM.MODULE_NAME, "talents")),
        fe: record(actor.getFlag(ETHERNUM.MODULE_NAME, "fe")),
        runes,
        maxRuneClass: Number(actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") ?? 1),
      },
    };
  }),
};
