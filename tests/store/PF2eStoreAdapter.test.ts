import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ETHERNUM } from "../../scripts/config.js";
import {
  PF2eStoreAdapter,
  type StoreActorDocument,
  type StoreItemDocument,
} from "../../scripts/store/PF2eStoreAdapter.js";
import type { CompanyStoreCoins } from "../../scripts/store/CompanyStoreTypes.js";

const mixedCoins: CompanyStoreCoins = { pp: 1, gp: 2, sp: 3, cp: 4, copperValue: 1_234 };

describe("PF2eStoreAdapter", () => {
  beforeEach(() => {
    vi.stubGlobal("game", {
      pf2e: {},
      i18n: { localize: (key: string) => key },
    });
    vi.stubGlobal("foundry", {
      utils: { deepClone: <T>(value: T): T => structuredClone(value) },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("reads mixed PF2e coin balances without creating a second wallet", () => {
    const actor = {
      type: "character",
      inventory: { coins: { pp: 1, gp: 2, sp: 3, cp: 4 } },
    } as StoreActorDocument;

    expect(new PF2eStoreAdapter().balance(actor)).toMatchObject({
      ...mixedCoins,
      available: true,
      label: "1 PP · 2 GP · 3 SP · 4 CP",
    });
    expect(new PF2eStoreAdapter().balance(null)).toMatchObject({ available: false, copperValue: 0 });
  });

  it("resolves mixed-denomination prices from the PF2e item source", () => {
    const item = { system: { price: { value: "1 pp + 2 gp, 3 sp 4 cp" } } } as StoreItemDocument;
    expect(new PF2eStoreAdapter().resolvePrice(item)).toEqual(mixedCoins);
    expect(new PF2eStoreAdapter().resolvePrice(item, "4 gp + 5 sp")).toEqual({
      pp: 0,
      gp: 4,
      sp: 5,
      cp: 0,
      copperValue: 450,
    });
  });

  it("delegates debit and refund to the PF2e inventory APIs", async () => {
    const removeCoins = vi.fn().mockResolvedValue(true);
    const addCoins = vi.fn().mockResolvedValue(undefined);
    const actor = { type: "character", inventory: { removeCoins, addCoins } } as StoreActorDocument;
    const adapter = new PF2eStoreAdapter();

    await expect(adapter.removeCoins(actor, mixedCoins)).resolves.toBe(true);
    expect(removeCoins).toHaveBeenCalledWith(
      { pp: 1, gp: 2, sp: 3, cp: 4 },
      { byValue: true },
    );

    await expect(adapter.addCoins(actor, mixedCoins)).resolves.toBeUndefined();
    expect(addCoins).toHaveBeenCalledWith({ pp: 1, gp: 2, sp: 3, cp: 4 });
  });

  it("grants an isolated item, disables stacking, and stamps the transaction flag", async () => {
    const source = {
      _id: "source-id",
      name: "Night Blade",
      system: { quantity: 1 },
      flags: {
        existingScope: { retained: true },
        [ETHERNUM.MODULE_NAME]: { retainedModuleFlag: true },
      },
    };
    const add = vi.fn().mockResolvedValue([{ id: "granted-item" }]);
    const actor = { type: "character", inventory: { add } } as StoreActorDocument;
    const item = { type: "weapon", toObject: vi.fn(() => structuredClone(source)) } as StoreItemDocument;

    await expect(new PF2eStoreAdapter().grantItem(actor, item, "tx-123")).resolves.toEqual(["granted-item"]);
    expect(add).toHaveBeenCalledOnce();
    const [grantedSource, options] = add.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(options).toEqual({ stack: false, render: true });
    expect(grantedSource).not.toHaveProperty("_id");
    expect(grantedSource.flags).toEqual({
      existingScope: { retained: true },
      [ETHERNUM.MODULE_NAME]: {
        retainedModuleFlag: true,
        companyStoreTransactionId: "tx-123",
      },
    });
    expect(source._id).toBe("source-id");
  });

  it("finds only items stamped with the requested transaction", () => {
    const actor = {
      type: "character",
      items: [
        { id: "by-method", getFlag: () => "tx-target" },
        { id: "by-flags", flags: { [ETHERNUM.MODULE_NAME]: { companyStoreTransactionId: "tx-target" } } },
        { id: "other", flags: { [ETHERNUM.MODULE_NAME]: { companyStoreTransactionId: "tx-other" } } },
        { id: "broken", getFlag: () => { throw new Error("unavailable"); } },
      ],
    } as StoreActorDocument;

    expect(new PF2eStoreAdapter().transactionItemIds(actor, "tx-target")).toEqual(["by-method", "by-flags"]);
  });

  it("deletes granted item ids through the Actor rollback API", async () => {
    const deleteEmbeddedDocuments = vi.fn().mockResolvedValue([]);
    const actor = { type: "character", deleteEmbeddedDocuments } as StoreActorDocument;
    const adapter = new PF2eStoreAdapter();

    await adapter.deleteGrantedItems(actor, ["item-a", "item-b"]);
    expect(deleteEmbeddedDocuments).toHaveBeenCalledWith("Item", ["item-a", "item-b"], { render: true });

    await adapter.deleteGrantedItems(actor, []);
    expect(deleteEmbeddedDocuments).toHaveBeenCalledOnce();
  });

  it("falls back to document deletion when the Actor rollback API is unavailable", async () => {
    const deleteA = vi.fn().mockResolvedValue(undefined);
    const deleteB = vi.fn().mockResolvedValue(undefined);
    const actor = {
      type: "character",
      items: [
        { id: "item-a", delete: deleteA },
        { id: "item-b", delete: deleteB },
      ],
    } as StoreActorDocument;

    await new PF2eStoreAdapter().deleteGrantedItems(actor, ["item-b"]);
    expect(deleteA).not.toHaveBeenCalled();
    expect(deleteB).toHaveBeenCalledWith({ render: false });
  });
});
