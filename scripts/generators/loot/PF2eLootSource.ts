import { PF2E_STORE_PHYSICAL_ITEM_TYPES } from "../../store/PF2eStoreAdapter.js";
import { parseCompanyStorePrice } from "../../store/CompanyStoreModel.js";
import type { LootCandidate, LootCategory, LootRarity } from "./LootGeneratorTypes.js";

interface IndexedItem {
  _id?: string | null;
  id?: string | null;
  uuid?: string | null;
  name?: string | null;
  img?: string | null;
  type?: string | null;
  level?: number;
  rarity?: string;
  price?: unknown;
  system?: unknown;
}

interface ItemPack {
  collection?: string;
  documentName?: string;
  metadata?: { id?: string; label?: string; type?: string };
  getIndex?: (options?: { fields?: string[] }) => Promise<Iterable<IndexedItem>>;
}

export interface LootSourceOption { id: string; label: string; }

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function collection<T>(value: unknown): T[] {
  return value && typeof (value as Iterable<T>)[Symbol.iterator] === "function" ? Array.from(value as Iterable<T>) : [];
}

function integer(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(30, Math.floor(parsed))) : 0;
}

function priceCopper(value: unknown): number {
  const input = record(value);
  for (const candidate of [value, input.value, record(input.value).value]) {
    const parsed = parseCompanyStorePrice(candidate);
    if (parsed?.copperValue) return parsed.copperValue;
  }
  return 0;
}

function rarity(value: unknown): LootRarity {
  const normalized = String(value ?? "common").trim().toLowerCase();
  return (["common", "uncommon", "rare", "unique"] as const).includes(normalized as LootRarity)
    ? normalized as LootRarity
    : "common";
}

function category(type: string): LootCategory {
  if (type === "treasure") return "treasure";
  if (type === "consumable" || type === "ammo") return "consumable";
  return "permanent";
}

export function lootCandidateFromDocument(
  document: IndexedItem,
  sourceId: string,
  sourceLabel: string,
  fallbackUuid = "",
): LootCandidate | null {
  const type = String(document.type ?? "").trim();
  const name = String(document.name ?? "").trim().slice(0, 240);
  const uuid = String(document.uuid ?? fallbackUuid).trim().slice(0, 300);
  if (!name || !uuid || !PF2E_STORE_PHYSICAL_ITEM_TYPES.has(type)) return null;
  const system = record(document.system);
  const traits = record(system.traits);
  const traitValues = Array.isArray(traits.value) ? traits.value.map(String).filter(Boolean).slice(0, 40) : [];
  return {
    uuid,
    name,
    ...(document.img ? { image: String(document.img) } : {}),
    level: integer(document.level ?? record(system.level).value ?? system.level),
    rarity: rarity(document.rarity ?? traits.rarity),
    category: category(type),
    type,
    traits: traitValues,
    sourceId,
    sourceLabel,
    priceCopper: priceCopper(document.price ?? system.price),
  };
}

export class PF2eLootSource {
  sourceOptions(): LootSourceOption[] {
    return [
      { id: "world", label: "Itens do mundo" },
      ...this.packs().map(pack => ({ id: this.packId(pack), label: pack.metadata?.label ?? this.packId(pack) })),
    ].filter(source => Boolean(source.id));
  }

  async listCandidates(allowedSources: readonly string[] = []): Promise<LootCandidate[]> {
    const allowed = new Set(allowedSources);
    const includeAll = allowed.size === 0;
    const candidates: LootCandidate[] = [];
    if (includeAll || allowed.has("world")) {
      for (const item of collection<IndexedItem>((game as Game & { items?: Iterable<IndexedItem> }).items)) {
        const candidate = lootCandidateFromDocument(item, "world", "Itens do mundo");
        if (candidate) candidates.push(candidate);
      }
    }
    for (const pack of this.packs()) {
      const id = this.packId(pack);
      if (!includeAll && !allowed.has(id)) continue;
      const index = await pack.getIndex?.({ fields: ["name", "img", "type", "system.level.value", "system.traits", "system.price"] });
      for (const item of collection<IndexedItem>(index)) {
        const itemId = String(item._id ?? item.id ?? "").trim();
        const uuid = item.uuid ?? (itemId ? `Compendium.${id}.${itemId}` : "");
        const candidate = lootCandidateFromDocument(item, id, pack.metadata?.label ?? id, String(uuid));
        if (candidate) candidates.push(candidate);
      }
    }
    return Array.from(new Map(candidates.map(candidate => [candidate.uuid, candidate])).values());
  }

  private packs(): ItemPack[] {
    return collection<ItemPack>((game as Game & { packs?: Iterable<ItemPack> }).packs)
      .filter(pack => (pack.documentName ?? pack.metadata?.type) === "Item" && Boolean(pack.getIndex));
  }

  private packId(pack: ItemPack): string {
    return String(pack.collection ?? pack.metadata?.id ?? "").trim();
  }
}
