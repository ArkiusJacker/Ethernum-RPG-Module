import { beforeEach, describe, expect, it, vi } from "vitest";
import { PF2eCharacterAdapter } from "../scripts/core/PF2eCharacterAdapter.js";
import { buildCharacterSheetPresentation } from "../scripts/sheets/core/CharacterSheetPresentation.js";

const permissions = {
  owner: true,
  gm: false,
  observer: true,
  editable: true,
  canChooseSheet: true,
};

describe("Character Bulk", () => {
  beforeEach(() => {
    vi.stubGlobal("game", { i18n: { localize: (key: string) => key } });
  });

  it("reads the prepared PF2e InventoryBulk snapshot before stored actor data", () => {
    const inventory = PF2eCharacterAdapter.inventory({
      inventory: {
        bulk: {
          value: {
            normal: 2,
            light: 7,
            toLightUnits: () => 27,
          },
          max: 8,
          encumberedAfter: 2,
          maxPercentageInteger: 30,
          isEncumbered: true,
        },
      },
      system: {
        attributes: {
          bulk: { value: 99, max: 99, encumberedAt: 99 },
        },
      },
      items: [
        { id: "heavy", type: "equipment", name: "Heavy item", system: { bulk: { value: "50" } } },
      ],
    } as never);

    expect(inventory.bulk).toEqual({
      value: 2.7,
      max: 8,
      encumberedAt: 2,
      percentage: 30,
      encumbered: true,
      available: true,
    });
  });

  it("uses safe scalar prepared data when the PF2e Bulk value object is absent", () => {
    const inventory = PF2eCharacterAdapter.inventory({
      inventory: {
        bulk: {
          bulk: 4,
          max: 10,
          encumberedAt: 6,
        },
      },
      items: [],
    } as never);

    expect(inventory.bulk).toEqual({
      value: 4,
      max: 10,
      encumberedAt: 6,
      percentage: 40,
      encumbered: false,
      available: true,
    });
  });

  it("marks Bulk unavailable instead of inventing a zero-over-zero total", () => {
    const inventory = PF2eCharacterAdapter.inventory({ items: [] } as never);

    expect(inventory.bulk).toEqual({
      value: null,
      max: null,
      percentage: 0,
      encumbered: false,
      available: false,
    });

    const presentation = buildCharacterSheetPresentation({ inventory }, permissions);
    expect(presentation).toMatchObject({
      inventory: {
        bulk: {
          value: null,
          max: null,
          available: false,
          label: "Bulk indisponível",
        },
      },
    });
  });

  it("passes the prepared Bulk snapshot through the sheet presentation", () => {
    const inventory = PF2eCharacterAdapter.inventory({
      inventory: {
        bulk: {
          value: { normal: 5, light: 0 },
          max: 12,
          encumberedAfter: 7,
          maxPercentage: 38,
          isEncumbered: false,
        },
      },
      items: [],
    } as never);

    const presentation = buildCharacterSheetPresentation({ inventory }, permissions);
    expect(presentation).toMatchObject({ inventory: { bulk: inventory.bulk } });
  });
});
