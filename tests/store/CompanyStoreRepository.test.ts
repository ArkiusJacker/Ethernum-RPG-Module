import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMPANY_STORE_ADMIN_MARKER_FLAG,
  COMPANY_STORE_DATA_FLAG,
  COMPANY_STORE_PROJECTION_FLAG,
  CompanyStoreRepository,
  type CompanyStoreProjectionData,
  type CompanyStoreRepositoryJournal,
  type CompanyStoreRepositoryUser,
} from "../../scripts/store/CompanyStoreRepository.js";
import type {
  CompanyStoreData,
  CompanyStoreSnapshot,
} from "../../scripts/store/CompanyStoreTypes.js";

const MODULE_ID = "ethernum-rpg-module";

class FakeJournal implements CompanyStoreRepositoryJournal {
  readonly id: string;
  name: string;
  ownership: Record<string, number>;
  flags: Record<string, Record<string, unknown>>;
  deleted = false;
  readonly updateCalls = vi.fn();
  readonly deleteCalls = vi.fn();

  constructor(id: string, data: Record<string, unknown>) {
    this.id = id;
    this.name = String(data.name ?? id);
    this.ownership = structuredClone(data.ownership as Record<string, number> ?? { default: 0 });
    this.flags = structuredClone(data.flags as Record<string, Record<string, unknown>> ?? {});
  }

  getFlag(scope: string, key: string): unknown {
    return this.flags[scope]?.[key];
  }

  async setFlag(scope: string, key: string, value: unknown): Promise<void> {
    this.flags[scope] ??= {};
    this.flags[scope]![key] = structuredClone(value);
  }

  async update(changes: Record<string, unknown>): Promise<void> {
    this.updateCalls(changes);
    if (changes.name !== undefined) this.name = String(changes.name);
    if (changes.ownership !== undefined) {
      this.ownership = structuredClone(changes.ownership as Record<string, number>);
    }
    const prefix = `flags.${MODULE_ID}.`;
    for (const [path, value] of Object.entries(changes)) {
      if (!path.startsWith(prefix)) continue;
      const key = path.slice(prefix.length);
      if (key.startsWith("-=")) {
        delete this.flags[MODULE_ID]?.[key.slice(2)];
      } else {
        await this.setFlag(MODULE_ID, key, value);
      }
    }
  }

  async delete(): Promise<void> {
    this.deleteCalls();
    this.deleted = true;
  }
}

function administrativeData(): CompanyStoreData {
  return {
    schemaVersion: 1,
    revision: 7,
    entries: [{
      version: 1,
      revision: 3,
      id: "restricted-blade",
      itemUuid: "Compendium.pf2e.equipment-srd.Item.secret-blade",
      priceOverride: "7 gp",
      stock: 2,
      minimumRank: 4,
      allowedRegions: ["stonesour"],
      requiredFlags: ["quartermaster"],
      transactionMode: "automatic",
      featured: true,
      enabled: true,
    }],
    transactions: [{
      id: "transaction-secret",
      fingerprint: "player-a\u001fActor.a\u001frestricted-blade\u001f1",
      requesterId: "player-a",
      actorUuid: "Actor.a",
      actorName: "Agent A",
      entryId: "restricted-blade",
      requestMessageUuid: "ChatMessage.request-a",
      itemUuid: "Compendium.pf2e.equipment-srd.Item.secret-blade",
      itemName: "Restricted Blade",
      transactionMode: "automatic",
      state: "received",
      price: { pp: 0, gp: 7, sp: 0, cp: 0, copperValue: 700 },
      priceLabel: "7 gp",
      createdItemIds: [],
      createdAt: 100,
      updatedAt: 100,
    }],
    authorizations: {
      "Actor.a": {
        actorUuid: "Actor.a",
        rank: 4,
        region: "stonesour",
        flags: ["quartermaster"],
        updatedAt: 100,
      },
    },
    migration: {
      worldItemsImportedAt: 100,
      importedItemUuids: ["Compendium.pf2e.equipment-srd.Item.secret-blade"],
    },
  };
}

function publicSnapshot(user: CompanyStoreRepositoryUser): CompanyStoreSnapshot {
  return {
    schemaVersion: 1,
    revision: 7,
    actorId: `actor-${user.id}`,
    actorUuid: `Actor.${user.id}`,
    actorName: String(user.name),
    balance: {
      pp: 0,
      gp: 12,
      sp: 5,
      cp: 0,
      copperValue: 1_250,
      available: true,
      label: "12 gp, 5 sp",
      denominations: [
        { id: "gp", label: "PO", value: 12 },
        { id: "sp", label: "PP", value: 5 },
      ],
    },
    items: [{
      id: "restricted-blade",
      name: "Restricted Blade",
      image: "icons/blade.webp",
      level: 4,
      rarity: "uncommon",
      rarityLabel: "Incomum",
      price: { pp: 0, gp: 7, sp: 0, cp: 0, copperValue: 700 },
      priceLabel: "7 gp",
      stock: 2,
      stockLabel: "2",
      transactionMode: "automatic",
      actionLabel: "Comprar",
      authorizationCode: "authorized",
      authorizationLabel: "Autorizado",
      authorized: true,
      affordable: true,
      available: true,
      featured: true,
      quoteRevision: 3,
    }],
    state: { noActor: false, currencyUnavailable: false, empty: false },
  };
}

function contaminatedSnapshot(user: CompanyStoreRepositoryUser): CompanyStoreSnapshot {
  const snapshot = publicSnapshot(user) as CompanyStoreSnapshot & Record<string, unknown>;
  snapshot.itemUuid = "Compendium.secret.root";
  snapshot.priceOverride = "1 cp";
  snapshot.minimumRank = 99;
  snapshot.allowedRegions = ["secret-region"];
  snapshot.requiredFlags = ["secret-flag"];
  snapshot.transactions = [{ id: "leaked-transaction" }];
  snapshot.authorizations = { "Actor.secret": { flags: ["secret"] } };
  snapshot.migration = { secret: true };
  Object.assign(snapshot.items[0] as unknown as Record<string, unknown>, {
    itemUuid: "Compendium.secret.item",
    priceOverride: "0 cp",
    minimumRank: 99,
    allowedRegions: ["secret-region"],
    requiredFlags: ["secret-flag"],
    transaction: { id: "leaked-item-transaction" },
  });
  return snapshot;
}

function createHarness() {
  const gm: CompanyStoreRepositoryUser = { id: "gm-a", name: "GM", isGM: true, active: true };
  const playerA: CompanyStoreRepositoryUser = { id: "player-a", name: "Player A", isGM: false, active: true };
  const playerB: CompanyStoreRepositoryUser = { id: "player-b", name: "Player B", isGM: false, active: false };
  const current = { user: gm as CompanyStoreRepositoryUser };
  const users = [gm, playerA, playerB];
  const journals: FakeJournal[] = [];
  let sequence = 0;
  const createJournal = vi.fn(async (data: Record<string, unknown>) => {
    const journal = new FakeJournal(`journal-${++sequence}`, data);
    journals.push(journal);
    return journal;
  });
  const repository = new CompanyStoreRepository({
    moduleId: MODULE_ID,
    currentUser: () => current.user,
    users: () => users,
    journals: () => journals.filter(journal => !journal.deleted),
    createJournal,
  });
  return { repository, current, users, journals, createJournal, gm, playerA, playerB };
}

function projectionJournal(journals: FakeJournal[], userId: string): FakeJournal | undefined {
  return journals.find(journal => {
    const payload = journal.getFlag(MODULE_ID, COMPANY_STORE_PROJECTION_FLAG) as CompanyStoreProjectionData | undefined;
    return !journal.deleted && payload?.userId === userId;
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("CompanyStoreRepository", () => {
  it("binds the Foundry v14 Journal document class while creating storage", async () => {
    const gm: CompanyStoreRepositoryUser = { id: "gm-v14", name: "GM", isGM: true, active: true };
    const journals: FakeJournal[] = [];
    const documentClass = {
      create: vi.fn(async function(this: unknown, data: Record<string, unknown>) {
        expect(this).toBe(documentClass);
        const journal = new FakeJournal("journal-v14", data);
        journals.push(journal);
        return journal;
      }),
    };
    vi.stubGlobal("game", { user: gm, users: [gm], journal: journals });
    vi.stubGlobal("CONFIG", { JournalEntry: { documentClass } });
    vi.stubGlobal("JournalEntry", { create: vi.fn(() => { throw new Error("legacy fallback used"); }) });

    const repository = new CompanyStoreRepository();
    await repository.initialize();

    expect(documentClass.create).toHaveBeenCalledOnce();
    expect(journals[0]?.getFlag(MODULE_ID, COMPANY_STORE_ADMIN_MARKER_FLAG)).toMatchObject({
      kind: "administrative",
      schemaVersion: 1,
    });
  });

  it("keeps the versioned administrative Journal GM-only", async () => {
    const world = createHarness();
    await world.repository.initialize();
    await world.repository.writeStore(administrativeData());

    const store = world.journals.find(journal => journal.getFlag(MODULE_ID, COMPANY_STORE_ADMIN_MARKER_FLAG));
    expect(store?.ownership).toEqual({ default: 0 });
    expect(store?.getFlag(MODULE_ID, COMPANY_STORE_ADMIN_MARKER_FLAG)).toEqual({
      kind: "administrative",
      schemaVersion: 1,
    });
    expect(store?.getFlag(MODULE_ID, COMPANY_STORE_DATA_FLAG)).toMatchObject({
      revision: 7,
      entries: [expect.objectContaining({ itemUuid: expect.stringContaining("secret-blade") })],
      transactions: [expect.objectContaining({ id: "transaction-secret" })],
      authorizations: { "Actor.a": expect.objectContaining({ rank: 4 }) },
    });

    world.current.user = world.playerA;
    await expect(world.repository.readStore()).rejects.toThrow(/Somente o Gamemaster/i);
  });

  it("creates isolated OBSERVER projections containing only a sanitized public snapshot", async () => {
    const world = createHarness();
    await world.repository.initialize();
    await world.repository.writeStore(administrativeData());
    await world.repository.synchronizeProjections((user, adminData) => {
      expect(adminData.transactions).toHaveLength(1);
      return contaminatedSnapshot(user);
    });

    const projectionA = projectionJournal(world.journals, world.playerA.id!);
    const projectionB = projectionJournal(world.journals, world.playerB.id!);
    expect(projectionA?.ownership).toEqual({ default: 0, [world.playerA.id!]: 2 });
    expect(projectionB?.ownership).toEqual({ default: 0, [world.playerB.id!]: 2 });
    expect(projectionA?.ownership[world.playerB.id!]).toBeUndefined();
    expect(projectionA?.ownership[world.gm.id!]).toBeUndefined();

    const payload = projectionA?.getFlag(MODULE_ID, COMPANY_STORE_PROJECTION_FLAG) as CompanyStoreProjectionData;
    expect(Object.keys(payload).sort()).toEqual(["kind", "schemaVersion", "snapshot", "userId"]);
    expect(payload.kind).toBe("projection");
    expect(payload.userId).toBe(world.playerA.id);
    expect(payload.snapshot.items[0]).toMatchObject({
      id: "restricted-blade",
      name: "Restricted Blade",
      priceLabel: "7 gp",
      authorizationCode: "authorized",
    });
    const serialized = JSON.stringify(payload);
    for (const forbidden of [
      "itemUuid", "priceOverride", "minimumRank", "allowedRegions", "requiredFlags",
      "transactions", "authorizations", "migration", "leaked-transaction", "secret-region",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(projectionA?.getFlag(MODULE_ID, COMPANY_STORE_DATA_FLAG)).toBeUndefined();
    expect(projectionA?.getFlag(MODULE_ID, COMPANY_STORE_ADMIN_MARKER_FLAG)).toBeUndefined();
  });

  it("allows a player to read only their own projection", async () => {
    const world = createHarness();
    await world.repository.initialize();
    await world.repository.synchronizeProjections((user) => publicSnapshot(user));

    world.current.user = world.playerA;
    expect(world.repository.readProjection()).toMatchObject({ actorName: "Player A" });
    expect(world.repository.readProjection(world.playerA)).toMatchObject({ actorName: "Player A" });
    expect(world.repository.readProjection(world.playerB)).toBeNull();
    expect(world.repository.findProjection(world.playerB.id!)).toBeNull();

    world.current.user = world.playerB;
    expect(world.repository.readProjection()).toMatchObject({ actorName: "Player B" });
    expect(world.repository.readProjection(world.playerA)).toBeNull();
  });

  it("synchronizes idempotently and deletes projections for stale users", async () => {
    const world = createHarness();
    await world.repository.initialize();
    const factory = vi.fn((user: CompanyStoreRepositoryUser) => publicSnapshot(user));

    const first = await world.repository.sync(factory);
    expect(first).toEqual({ created: 2, updated: 0, unchanged: 0, deleted: 0 });
    const projectionA = projectionJournal(world.journals, world.playerA.id!)!;
    const projectionB = projectionJournal(world.journals, world.playerB.id!)!;

    const second = await world.repository.sync(factory);
    expect(second).toEqual({ created: 0, updated: 0, unchanged: 2, deleted: 0 });
    expect(projectionA.updateCalls).not.toHaveBeenCalled();
    expect(projectionB.updateCalls).not.toHaveBeenCalled();

    world.users.splice(world.users.indexOf(world.playerB), 1);
    const afterRemoval = await world.repository.sync(factory);
    expect(afterRemoval).toEqual({ created: 0, updated: 0, unchanged: 1, deleted: 1 });
    expect(projectionB.deleted).toBe(true);
    expect(projectionB.deleteCalls).toHaveBeenCalledOnce();
    expect(projectionA.deleted).toBe(false);
    expect(projectionJournal(world.journals, world.playerB.id!)).toBeUndefined();
  });
});
