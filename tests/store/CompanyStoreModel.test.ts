import { describe, expect, it } from "vitest";
import {
  coinsFromCopper,
  createDefaultCompanyStoreData,
  mergeWorldItems,
  normalizeCompanyStoreData,
  normalizeCompanyStoreEntry,
  parseCompanyStorePrice,
  transactionFingerprint,
} from "../../scripts/store/CompanyStoreModel.js";

describe("CompanyStoreModel", () => {
  it("normalizes store entries conservatively and preserves extensions", () => {
    const entry = normalizeCompanyStoreEntry({
      version: 0,
      revision: -4,
      id: "  Rare Blade / Alpha  ",
      itemUuid: "Compendium.pf2e.equipment-srd.Item.rare-blade",
      priceOverride: " 1 pp + 2 gp ",
      stock: "3.9",
      minimumRank: "2",
      allowedRegions: [" Stonesour ", "STONESOUR", "Concordia"],
      requiredFlags: [" Licensed ", "INVALID FLAG", "licensed"],
      transactionMode: "unexpected",
      featured: true,
      customMetadata: { source: "test" },
    });

    expect(entry).toEqual({
      version: 1,
      revision: 0,
      id: "rare-blade-alpha",
      itemUuid: "Compendium.pf2e.equipment-srd.Item.rare-blade",
      priceOverride: "1 pp + 2 gp",
      stock: 3,
      minimumRank: 2,
      allowedRegions: ["stonesour", "concordia"],
      requiredFlags: ["licensed"],
      transactionMode: "approval",
      featured: true,
      enabled: true,
      customMetadata: { source: "test" },
    });
    expect(normalizeCompanyStoreEntry({ id: "", itemUuid: "Item.missing" })).toBeNull();
    expect(normalizeCompanyStoreEntry({ id: "valid", itemUuid: "Item.bad\npath" })).toBeNull();
  });

  it("normalizes the store, de-duplicates entry ids, and preserves compatible data", () => {
    const store = normalizeCompanyStoreData({
      schemaVersion: 99,
      revision: "7",
      customRegistryVersion: "legacy",
      entries: [
        { id: "blade", itemUuid: "Item.old", transactionMode: "automatic" },
        { id: "blade", itemUuid: "Item.current", transactionMode: "approval", enabled: false },
        { id: "", itemUuid: "Item.invalid" },
      ],
      transactions: [{ id: "invalid-without-required-fields" }],
      authorizations: {
        "Actor.hero": { rank: "3", region: " Stonesour ", flags: ["Licensed", "bad flag"], updatedAt: "25" },
      },
    });

    expect(store).toMatchObject({
      schemaVersion: 1,
      revision: 7,
      customRegistryVersion: "legacy",
      transactions: [],
      authorizations: {
        "Actor.hero": {
          actorUuid: "Actor.hero",
          rank: 3,
          region: "stonesour",
          flags: ["licensed"],
          updatedAt: 25,
        },
      },
    });
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0]).toMatchObject({ id: "blade", itemUuid: "Item.current", enabled: false });
  });

  it("parses mixed PF2e denominations and normalizes copper values", () => {
    expect(parseCompanyStorePrice("1 pp + 2 gp, 3 sp 4 cp")).toEqual({
      pp: 1,
      gp: 2,
      sp: 3,
      cp: 4,
      copperValue: 1_234,
    });
    expect(parseCompanyStorePrice("12")).toEqual({ pp: 0, gp: 12, sp: 0, cp: 0, copperValue: 1_200 });
    expect(parseCompanyStorePrice("0 cp")).toEqual({ pp: 0, gp: 0, sp: 0, cp: 0, copperValue: 0 });
    expect(coinsFromCopper(1_234)).toEqual({ pp: 1, gp: 2, sp: 3, cp: 4, copperValue: 1_234 });
    expect(parseCompanyStorePrice("1 gp plus unknown")).toBeNull();
    expect(parseCompanyStorePrice("-1 gp")).toBeNull();
  });

  it("imports world items once and remains idempotent", () => {
    const initial = createDefaultCompanyStoreData();
    initial.entries.push({
      version: 1,
      revision: 0,
      id: "world-existing",
      itemUuid: "Item.existing",
      transactionMode: "automatic",
      featured: false,
      enabled: true,
    });

    const first = mergeWorldItems(initial, ["Item.existing", "Item.new", "Item.new"], 100);
    const second = mergeWorldItems(first, ["Item.later"], 200);

    expect(first.revision).toBe(1);
    expect(first.entries.map(entry => entry.itemUuid)).toEqual(["Item.existing", "Item.new"]);
    expect(first.migration).toMatchObject({
      worldItemsImportedAt: 100,
      importedItemUuids: ["Item.existing", "Item.new"],
    });
    expect(second).toEqual(first);
    expect(initial.migration).toBeUndefined();
    expect(initial.entries).toHaveLength(1);
  });

  it("builds deterministic, unambiguous transaction fingerprints", () => {
    const payload = { requesterId: "User.a", actorUuid: "Actor.hero", entryId: "blade" };
    const fingerprint = transactionFingerprint(payload);

    expect(fingerprint).toBe("User.a\u001fActor.hero\u001fblade\u001f1");
    expect(transactionFingerprint(payload)).toBe(fingerprint);
    expect(transactionFingerprint({ ...payload, requesterId: "User.b" })).not.toBe(fingerprint);
    expect(transactionFingerprint({ ...payload, actorUuid: "Actor.other" })).not.toBe(fingerprint);
    expect(transactionFingerprint({ ...payload, entryId: "shield" })).not.toBe(fingerprint);
  });

  it("normalizes recovery evidence safely for existing world data", () => {
    const store = normalizeCompanyStoreData({
      transactions: [{
        id: "store-recovery", fingerprint: "fingerprint", requesterId: "User.a", actorUuid: "Actor.hero",
        actorName: "Hero", entryId: "blade", requestMessageUuid: "ChatMessage.1", itemUuid: "Item.blade",
        itemName: "Blade", transactionMode: "automatic", state: "recoveryRequired", price: { gp: 5 },
        priceLabel: "5 gp", createdItemIds: [], createdAt: 10, updatedAt: 20,
        recovery: { debit: "confirmed", delivery: "unsupported-value", stock: "unchanged" },
        recoveryResolution: { outcome: "rolledBack", note: "manual check", resolvedAt: 30, resolvedBy: "User.gm" },
      }],
    });

    expect(store.transactions[0]).toMatchObject({
      recovery: { debit: "confirmed", delivery: "ambiguous", stock: "unchanged" },
      recoveryResolution: { outcome: "rolledBack", note: "manual check", resolvedAt: 30, resolvedBy: "User.gm" },
    });
  });
});
