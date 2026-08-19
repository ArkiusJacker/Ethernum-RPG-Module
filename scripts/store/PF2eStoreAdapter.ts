import { ETHERNUM } from "../config.js";
import { normalizeCoins, parseCompanyStorePrice } from "./CompanyStoreModel.js";
import type { CompanyStoreBalanceDTO, CompanyStoreCoins } from "./CompanyStoreTypes.js";

export const PF2E_STORE_PHYSICAL_ITEM_TYPES = new Set([
  "ammo", "armor", "backpack", "book", "consumable", "equipment", "kit",
  "shield", "treasure", "weapon",
]);

export interface StoreActorDocument {
  id?: string | null;
  uuid?: string | null;
  name?: string | null;
  type?: string;
  inventory?: {
    coins?: unknown;
    currency?: unknown;
    removeCoins?: (coins: unknown, options?: { byValue?: boolean }) => Promise<boolean>;
    addCoins?: (coins: unknown, options?: { combineStacks?: boolean }) => Promise<unknown>;
    add?: (item: unknown, options?: { stack?: boolean; render?: boolean }) => Promise<unknown[]>;
  };
  items?: Iterable<StoreItemDocument>;
  testUserPermission?: (user: User, level: string | number) => boolean;
  deleteEmbeddedDocuments?: (type: string, ids: string[], options?: Record<string, unknown>) => Promise<unknown>;
  createEmbeddedDocuments?: (type: string, sources: unknown[], options?: Record<string, unknown>) => Promise<unknown[]>;
  getFlag?: (scope: string, key: string) => unknown;
  [key: string]: unknown;
}

export interface StoreItemDocument {
  id?: string | null;
  uuid?: string | null;
  name?: string | null;
  img?: string;
  type?: string;
  level?: number;
  rarity?: string;
  price?: unknown;
  system?: Record<string, unknown>;
  visible?: boolean;
  flags?: Record<string, unknown>;
  toObject?: (...args: unknown[]) => Record<string, unknown>;
  testUserPermission?: (user: User, level: string | number) => boolean;
  getFlag?: (scope: string, key: string) => unknown;
  delete?: (options?: Record<string, unknown>) => Promise<unknown>;
  [key: string]: unknown;
}

interface PF2eCoinsLike {
  copperValue?: number;
  pp?: number;
  gp?: number;
  sp?: number;
  cp?: number;
  toObject?: () => Record<string, number>;
  toString?: (options?: Record<string, unknown>) => string;
}

interface PF2eCoinsConstructor {
  new(value?: unknown): PF2eCoinsLike;
  fromPrice?(price: unknown, quantity: number): PF2eCoinsLike;
  fromString?(value: string, quantity?: number): PF2eCoinsLike;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function collection<T>(value: unknown): T[] {
  if (!value || typeof (value as Iterable<T>)[Symbol.iterator] !== "function") return [];
  return Array.from(value as Iterable<T>);
}

function integer(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function coinsConstructor(): PF2eCoinsConstructor | null {
  return ((game as Game & { pf2e?: { Coins?: PF2eCoinsConstructor } }).pf2e?.Coins) ?? null;
}

function denominationLabel(denomination: "pp" | "gp" | "sp" | "cp"): string {
  const key = `PF2E.CurrencyAbbreviations.${denomination}`;
  const localized = game.i18n?.localize(key);
  return localized && localized !== key ? localized : denomination.toUpperCase();
}

export function formatCompanyCoins(coins: CompanyStoreCoins): string {
  const parts = (["pp", "gp", "sp", "cp"] as const)
    .flatMap(denomination => coins[denomination] > 0
      ? [`${coins[denomination]} ${denominationLabel(denomination)}`]
      : []);
  return parts.join(" · ") || `0 ${denominationLabel("cp")}`;
}

export function canObserveStoreDocument(document: StoreActorDocument | StoreItemDocument | null, user: User | null): boolean {
  if (!document || !user) return false;
  if (user.isGM) return true;
  if (typeof document.testUserPermission === "function") {
    try { return document.testUserPermission(user, "OBSERVER"); } catch { return false; }
  }
  return document.visible === true;
}

export function canOwnStoreActor(actor: StoreActorDocument | null, user: User | null): boolean {
  if (!actor || !user || actor.type !== "character") return false;
  if (user.isGM) return true;
  if (typeof actor.testUserPermission !== "function") return false;
  try { return actor.testUserPermission(user, "OWNER"); } catch { return false; }
}

export class PF2eStoreAdapter {
  async resolveItem(uuid: string): Promise<StoreItemDocument | null> {
    try { return await fromUuid(uuid as Parameters<typeof fromUuid>[0]) as unknown as StoreItemDocument | null; } catch { return null; }
  }

  async resolveActor(uuid: string): Promise<StoreActorDocument | null> {
    try {
      const document = await fromUuid(uuid as Parameters<typeof fromUuid>[0]) as unknown as StoreActorDocument | null;
      return document?.type === "character" ? document : null;
    } catch {
      return null;
    }
  }

  isPhysicalItem(item: StoreItemDocument | null): boolean {
    return Boolean(item?.type && PF2E_STORE_PHYSICAL_ITEM_TYPES.has(item.type));
  }

  resolvePrice(item: StoreItemDocument, priceOverride?: string): CompanyStoreCoins | null {
    const Coins = coinsConstructor();
    if (priceOverride) {
      const parsed = parseCompanyStorePrice(priceOverride);
      if (!parsed) return null;
      if (Coins?.fromString) return normalizeCoins(Coins.fromString(priceOverride));
      return parsed;
    }
    const price = item.price ?? record(item.system).price;
    if (Coins?.fromPrice) return normalizeCoins(Coins.fromPrice(price, 1));
    const priceRecord = record(price);
    return parseCompanyStorePrice(priceRecord.value ?? record(record(item.system).price).value);
  }

  balance(actor: StoreActorDocument | null): CompanyStoreBalanceDTO {
    const source = actor?.inventory?.coins ?? actor?.inventory?.currency;
    const sourceRecord = record(source);
    const available = Boolean(actor?.inventory && (
      Number.isFinite(Number(sourceRecord.copperValue))
      || ["pp", "gp", "sp", "cp"].some(key => key in sourceRecord)
    ));
    const coins = available ? normalizeCoins(source) : normalizeCoins({});
    return {
      ...coins,
      available,
      label: available ? formatCompanyCoins(coins) : "Saldo indisponível",
      denominations: (["pp", "gp", "sp", "cp"] as const).map(id => ({
        id,
        label: denominationLabel(id),
        value: coins[id],
      })),
    };
  }

  async removeCoins(actor: StoreActorDocument, coins: CompanyStoreCoins): Promise<boolean> {
    if (!actor.inventory?.removeCoins) throw new Error("PF2e currency removal is unavailable for this Actor.");
    return actor.inventory.removeCoins({ pp: coins.pp, gp: coins.gp, sp: coins.sp, cp: coins.cp }, { byValue: true });
  }

  async addCoins(actor: StoreActorDocument, coins: CompanyStoreCoins): Promise<void> {
    if (!actor.inventory?.addCoins) throw new Error("PF2e currency refund is unavailable for this Actor.");
    await actor.inventory.addCoins({ pp: coins.pp, gp: coins.gp, sp: coins.sp, cp: coins.cp });
  }

  async grantItem(actor: StoreActorDocument, item: StoreItemDocument, transactionId: string): Promise<string[]> {
    const source = item.toObject ? item.toObject() : foundry.utils.deepClone(item as Record<string, unknown>);
    delete source._id;
    const flags = record(source.flags);
    const moduleFlags = record(flags[ETHERNUM.MODULE_NAME]);
    source.flags = {
      ...flags,
      [ETHERNUM.MODULE_NAME]: {
        ...moduleFlags,
        companyStoreTransactionId: transactionId,
      },
    };
    const created = actor.inventory?.add
      ? await actor.inventory.add(source, { stack: false, render: true })
      : await actor.createEmbeddedDocuments?.("Item", [source], { render: true }) ?? [];
    const ids = created.flatMap(document => {
      const id = (document as { id?: string | null }).id;
      return id ? [id] : [];
    });
    if (ids.length === 0) throw new Error("PF2e did not return the granted Item.");
    return ids;
  }

  async deleteGrantedItems(actor: StoreActorDocument, itemIds: readonly string[]): Promise<void> {
    if (itemIds.length === 0) return;
    if (actor.deleteEmbeddedDocuments) {
      await actor.deleteEmbeddedDocuments("Item", [...itemIds], { render: true });
      return;
    }
    const documents = collection<StoreItemDocument>(actor.items).filter(item => item.id && itemIds.includes(item.id));
    await Promise.all(documents.map(item => item.delete?.({ render: false })));
  }

  transactionItemIds(actor: StoreActorDocument, transactionId: string): string[] {
    return collection<StoreItemDocument>(actor.items).flatMap(item => {
      let value: unknown;
      try {
        value = item.getFlag?.(ETHERNUM.MODULE_NAME, "companyStoreTransactionId")
          ?? record(record(item.flags)[ETHERNUM.MODULE_NAME]).companyStoreTransactionId;
      } catch {
        value = undefined;
      }
      return value === transactionId && item.id ? [item.id] : [];
    });
  }

  itemPresentation(item: StoreItemDocument): {
    name: string;
    image?: string;
    description?: string;
    level?: number;
    rarity?: string;
    rarityLabel?: string;
  } {
    const system = record(item.system);
    const description = String(record(system.description).value ?? "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1_500);
    const level = integer(item.level ?? record(system.level).value ?? system.level);
    const rarity = String(item.rarity ?? record(system.traits).rarity ?? "").trim();
    const rarityKey = rarity ? `PF2E.Trait${rarity[0]?.toUpperCase()}${rarity.slice(1)}` : "";
    const localizedRarity = rarityKey ? game.i18n?.localize(rarityKey) : "";
    return {
      name: String(item.name ?? "Item PF2e"),
      ...(item.img ? { image: item.img } : {}),
      ...(description ? { description } : {}),
      ...(level > 0 ? { level } : {}),
      ...(rarity ? { rarity } : {}),
      ...(localizedRarity && localizedRarity !== rarityKey ? { rarityLabel: localizedRarity } : rarity ? { rarityLabel: rarity } : {}),
    };
  }
}
