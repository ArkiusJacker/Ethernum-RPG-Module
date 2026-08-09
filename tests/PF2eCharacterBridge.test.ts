import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PF2eCharacterBridge,
  detectPF2eCharacterCapabilities,
} from "../scripts/sheets/core/PF2eCharacterBridge.js";

function spellcastingFixture() {
  const spell = { id: "force-barrage", name: "Force Barrage" };
  const cast = vi.fn().mockResolvedValue("cast");
  const addSpell = vi.fn().mockResolvedValue(spell);
  const prepareSpell = vi.fn().mockResolvedValue("prepared");
  const collection = Object.assign(new Map([[spell.id, spell]]), {
    id: "arcane-entry",
    entry: { id: "arcane-entry", cast },
    addSpell,
    prepareSpell,
  });
  const collections = new Map([[collection.id, collection]]);
  return { spell, cast, addSpell, prepareSpell, collection, collections };
}

describe("PF2eCharacterBridge", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects prepared PF2e 7.8 capabilities from public methods", () => {
    const fixture = spellcastingFixture();
    const actor = {
      changeCarryType: vi.fn(),
      getResource: vi.fn(),
      updateResource: vi.fn(),
      increaseCondition: vi.fn(),
      decreaseCondition: vi.fn(),
      spellcasting: { collections: fixture.collections },
    };

    expect(detectPF2eCharacterCapabilities(actor, {
      entryId: "arcane-entry",
      dropDelegate: vi.fn(),
    })).toEqual({
      carryType: true,
      resources: true,
      conditions: true,
      spellCollections: true,
      spellCast: true,
      spellPreparation: true,
      dragDrop: true,
    });
  });

  it("reports absent capabilities without inspecting actor system data", () => {
    const actor = Object.defineProperty({}, "system", {
      get: () => {
        throw new Error("internal system data must not be inspected");
      },
    });

    expect(detectPF2eCharacterCapabilities(actor)).toEqual({
      carryType: false,
      resources: false,
      conditions: false,
      spellCollections: false,
      spellCast: false,
      spellPreparation: false,
      dragDrop: false,
    });
  });

  it("delegates carry state changes to actor.changeCarryType", async () => {
    const changeCarryType = vi.fn().mockResolvedValue("changed");
    const actor = { changeCarryType };
    const item = { id: "sword" };

    await expect(PF2eCharacterBridge.changeCarryType(actor, item, {
      carryType: "held",
      handsHeld: 2,
      inSlot: false,
    })).resolves.toEqual({ ok: true, value: "changed", source: "pf2e-prepared" });
    expect(changeCarryType).toHaveBeenCalledWith(item, {
      carryType: "held",
      handsHeld: 2,
      inSlot: false,
    });
  });

  it("uses prepared resource APIs and refuses unknown resources", async () => {
    const resource = { slug: "hero-points", value: 1, max: 3 };
    const getResource = vi.fn((slug: string) => slug === resource.slug ? resource : null);
    const updateResource = vi.fn().mockResolvedValue("updated");
    const actor = { getResource, updateResource };

    await expect(PF2eCharacterBridge.getResource(actor, resource.slug)).resolves.toEqual({
      ok: true,
      value: resource,
      source: "pf2e-prepared",
    });
    await expect(PF2eCharacterBridge.updateResource(actor, resource.slug, 2, { render: false }))
      .resolves.toEqual({ ok: true, value: "updated", source: "pf2e-prepared" });
    expect(updateResource).toHaveBeenCalledWith(resource.slug, 2, { render: false });

    const missing = await PF2eCharacterBridge.updateResource(actor, "missing", 1);
    expect(missing).toMatchObject({
      ok: false,
      capability: "resources",
      reason: "not-found",
      fallback: "open-pf2e-sheet",
    });
    expect(updateResource).toHaveBeenCalledTimes(1);
  });

  it("prefers actor condition APIs and supports condition-document fallbacks", async () => {
    const increaseCondition = vi.fn().mockResolvedValue("increased");
    const decreaseCondition = vi.fn().mockResolvedValue("decreased");
    const actor = { increaseCondition, decreaseCondition };

    await expect(PF2eCharacterBridge.increaseCondition(actor, "frightened", { value: 2 }))
      .resolves.toEqual({ ok: true, value: "increased", source: "pf2e-prepared" });
    await expect(PF2eCharacterBridge.decreaseCondition(actor, "frightened", { forceRemove: true }))
      .resolves.toEqual({ ok: true, value: "decreased", source: "pf2e-prepared" });
    expect(increaseCondition).toHaveBeenCalledWith("frightened", { value: 2 });
    expect(decreaseCondition).toHaveBeenCalledWith("frightened", { forceRemove: true });

    const condition = {
      increase: vi.fn().mockResolvedValue("item-increased"),
      decrease: vi.fn().mockResolvedValue("item-decreased"),
    };
    await expect(PF2eCharacterBridge.increaseCondition({}, condition)).resolves.toEqual({
      ok: true,
      value: "item-increased",
      source: "document-fallback",
    });
    await expect(PF2eCharacterBridge.decreaseCondition({}, condition)).resolves.toEqual({
      ok: true,
      value: "item-decreased",
      source: "document-fallback",
    });
  });

  it("casts through collection.entry.cast with rank and slot delegated to PF2e", async () => {
    const fixture = spellcastingFixture();
    const actor = { spellcasting: { collections: fixture.collections } };

    await expect(PF2eCharacterBridge.castSpell({
      actor,
      entryId: "arcane-entry",
      spellId: fixture.spell.id,
      rank: 3,
      slotId: 1,
      options: { consume: true, message: true },
    })).resolves.toEqual({ ok: true, value: "cast", source: "pf2e-prepared" });
    expect(fixture.cast).toHaveBeenCalledWith(fixture.spell, {
      consume: true,
      message: true,
      rank: 3,
      slotId: 1,
    });
  });

  it("adds, prepares, and clears spell slots through collection methods", async () => {
    const fixture = spellcastingFixture();
    const actor = { spellcasting: { collections: fixture.collections } };
    const droppedSpell = { id: "fear", name: "Fear" };

    await PF2eCharacterBridge.addSpell({
      actor,
      entryId: "arcane-entry",
      spell: droppedSpell,
      groupId: 1,
    });
    expect(fixture.addSpell).toHaveBeenCalledWith(droppedSpell, { groupId: 1 });

    await PF2eCharacterBridge.prepareSpell({
      actor,
      entryId: "arcane-entry",
      spellId: fixture.spell.id,
      groupId: 3,
      slotIndex: 0,
    });
    expect(fixture.prepareSpell).toHaveBeenCalledWith(fixture.spell, 3, 0);

    await PF2eCharacterBridge.unprepareSpell({
      actor,
      entryId: "arcane-entry",
      groupId: "cantrips",
      slotIndex: 2,
    });
    expect(fixture.prepareSpell).toHaveBeenCalledWith(null, "cantrips", 2);
  });

  it("resolves public Foundry drop data and delegates generic actor drops", async () => {
    const droppedItem = { id: "dropped-item" };
    const resolver = vi.fn().mockResolvedValue(droppedItem);
    const event = {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({ type: "Item", uuid: "Item.drop" })),
      },
    };

    await expect(PF2eCharacterBridge.resolveDroppedItem(event, resolver)).resolves.toEqual({
      ok: true,
      value: droppedItem,
      source: "foundry-drop",
    });
    expect(resolver).toHaveBeenCalledWith({ type: "Item", uuid: "Item.drop" });

    const delegate = vi.fn().mockResolvedValue("delegated");
    await expect(PF2eCharacterBridge.handleDrop({
      actor: { id: "hero" },
      event,
      data: { type: "Item", uuid: "Item.drop" },
      delegate,
    })).resolves.toEqual({ ok: true, value: "delegated", source: "drop-delegate" });
    expect(delegate).toHaveBeenCalledWith({
      actor: { id: "hero" },
      event,
      data: { type: "Item", uuid: "Item.drop" },
    });
  });

  it("adds a dropped spell without manually importing item source data", async () => {
    const fixture = spellcastingFixture();
    const actor = { spellcasting: { collections: fixture.collections } };
    const droppedSpell = { id: "fear", name: "Fear" };
    const resolver = vi.fn().mockResolvedValue(droppedSpell);

    await expect(PF2eCharacterBridge.addDroppedSpell({
      actor,
      entryId: "arcane-entry",
      dropData: { type: "Item", uuid: "Compendium.pf2e.spells.Item.fear" },
      groupId: 1,
      resolver,
    })).resolves.toEqual({ ok: true, value: fixture.spell, source: "pf2e-prepared" });
    expect(fixture.addSpell).toHaveBeenCalledWith(droppedSpell, { groupId: 1 });
  });

  it("returns safe PF2e-sheet fallbacks instead of guessing document paths", async () => {
    const carry = await PF2eCharacterBridge.changeCarryType({}, { id: "sword" }, { carryType: "held" });
    const cast = await PF2eCharacterBridge.castSpell({
      actor: {},
      entryId: "arcane-entry",
      spellId: "force-barrage",
      rank: 1,
    });
    const drop = await PF2eCharacterBridge.handleDrop({ actor: {}, data: { type: "Item" } });

    expect(carry).toMatchObject({ ok: false, reason: "unsupported", fallback: "open-pf2e-sheet" });
    expect(cast).toMatchObject({
      ok: false,
      capability: "spellCast",
      reason: "unsupported",
      fallback: "open-pf2e-sheet",
    });
    expect(drop).toMatchObject({ ok: false, reason: "unsupported", fallback: "open-pf2e-sheet" });
  });

  it("captures prepared API failures as operation results", async () => {
    const error = new Error("PF2e rejected the update");
    const result = await PF2eCharacterBridge.changeCarryType({
      changeCarryType: vi.fn().mockRejectedValue(error),
    }, { id: "sword" }, { carryType: "held" });

    expect(result).toMatchObject({
      ok: false,
      capability: "carryType",
      reason: "operation-failed",
      fallback: "open-pf2e-sheet",
      error,
    });
  });

  it("remains independent from unique-mechanics kernels", () => {
    const source = readFileSync(join(
      process.cwd(),
      "scripts",
      "sheets",
      "core",
      "PF2eCharacterBridge.ts",
    ), "utf8");
    expect(source).not.toContain("UniqueMechanicsKernel");
    expect(source).not.toContain("UniqueMechanicsLegacy");
  });
});
