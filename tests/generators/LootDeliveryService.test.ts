import { afterEach, describe, expect, it, vi } from "vitest";
import { LootDeliveryService } from "../../scripts/generators/loot/LootDeliveryService.js";
import { normalizeLootApplicationData } from "../../scripts/generators/loot/LootApplicationRepository.js";
import type { LootManifest } from "../../scripts/generators/loot/LootGeneratorTypes.js";

const manifest: LootManifest = {
  manifestId: "loot-test",
  seed: "seed",
  input: { partyLevel: 3, partySize: 4, encounterLevel: 3, minimumItemLevel: 1, maximumItemLevel: 4, rarities: ["common"], categories: ["consumable"], types: [], traits: [], allowedSources: ["world"], budgetCopper: 500, seed: "seed" },
  items: [{ uuid: "Item.elixir", name: "Elixir", level: 2, rarity: "common", category: "consumable", type: "consumable", traits: [], sourceId: "world", sourceLabel: "World", priceCopper: 300, quantity: 1, subtotalCopper: 300 }],
  spentCopper: 300,
  currencyCopper: 200,
  totalCopper: 500,
  candidateCount: 1,
  warnings: [],
  generatedAt: 1_000,
};

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("transactional loot delivery", () => {
  it("publishes a sanitized, attributable manifest card without applying it", async () => {
    const create = vi.fn(async (source: Record<string, unknown>) => ({ id: "message-1", ...source }));
    vi.stubGlobal("game", { user: { isGM: true }, i18n: { localize: (key: string) => key.split(".").at(-1) } });
    vi.stubGlobal("ChatMessage", { create, getSpeaker: vi.fn(() => ({ alias: "Ethernum" })) });
    const service = new LootDeliveryService({} as never, {} as never);

    await expect(service.postToChat(manifest)).resolves.toBe("message-1");
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0]).toMatchObject({ flags: { "ethernum-rpg-module": { lootManifestId: "loot-test" } } });
    expect(String(create.mock.calls[0]?.[0]?.content)).toContain("Manifesto de Loot");
  });

  it("creates real items and coins once for a persistent application id", async () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    let ledger = normalizeLootApplicationData({});
    const repository = { initialize: vi.fn(async () => ledger), read: vi.fn(async () => ledger), write: vi.fn(async value => (ledger = normalizeLootApplicationData(value))) };
    const actor = { uuid: "Actor.loot", name: "Loot Chest", type: "loot" };
    const item = { uuid: "Item.elixir", name: "Elixir", type: "consumable" };
    const adapter = {
      resolveLootActor: vi.fn(async () => actor), resolveItem: vi.fn(async () => item), isPhysicalItem: vi.fn(() => true),
      grantItem: vi.fn(async () => ["created-1"]), addCoins: vi.fn(async () => undefined), deleteGrantedItems: vi.fn(), removeCoins: vi.fn(),
    };
    const service = new LootDeliveryService(repository as never, adapter as never, () => 1_100);
    const input = { applicationId: "application-1", actorUuid: "Actor.loot", manifest };
    await expect(service.apply(input)).resolves.toMatchObject({ state: "completed", itemCount: 1, currencyCopper: 200 });
    await expect(service.apply(input)).resolves.toMatchObject({ state: "completed" });
    expect(adapter.grantItem).toHaveBeenCalledTimes(1);
    expect(adapter.addCoins).toHaveBeenCalledTimes(1);
    expect(ledger.applications).toHaveLength(1);
  });

  it("rolls back created items when a later operation fails", async () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    let ledger = normalizeLootApplicationData({});
    const repository = { read: vi.fn(async () => ledger), write: vi.fn(async value => (ledger = normalizeLootApplicationData(value))) };
    const adapter = {
      resolveLootActor: vi.fn(async () => ({ uuid: "Actor.loot", name: "Loot", type: "loot" })),
      resolveItem: vi.fn(async () => ({ uuid: "Item.elixir", name: "Elixir", type: "consumable" })), isPhysicalItem: vi.fn(() => true),
      grantItem: vi.fn(async () => ["created-1"]), addCoins: vi.fn(async () => { throw new Error("coin failure"); }),
      deleteGrantedItems: vi.fn(async () => undefined), removeCoins: vi.fn(async () => undefined),
    };
    const service = new LootDeliveryService(repository as never, adapter as never, () => 1_100);
    await expect(service.apply({ applicationId: "application-2", actorUuid: "Actor.loot", manifest })).resolves.toMatchObject({ state: "rolledBack" });
    expect(adapter.deleteGrantedItems).toHaveBeenCalledWith(expect.anything(), ["created-1"]);
  });

  it("rejects a tampered budget before touching an Actor", async () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const repository = { read: vi.fn(), write: vi.fn() };
    const adapter = { resolveLootActor: vi.fn() };
    const service = new LootDeliveryService(repository as never, adapter as never);
    const tampered = { ...manifest, currencyCopper: manifest.currencyCopper + 1 };

    await expect(service.apply({ applicationId: "bad", actorUuid: "Actor.loot", manifest: tampered })).rejects.toThrow("orçamento");
    expect(adapter.resolveLootActor).not.toHaveBeenCalled();
  });
});
