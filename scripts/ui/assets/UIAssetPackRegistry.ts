import {
  ETHERNUM_UI_ASSET_DEFINITIONS,
  ETHERNUM_UI_ASSET_PACK_VERSION,
  type EthernumUIAssetDefinition,
} from "./EthernumUIAssetRegistry.js";

export const UI_ASSET_NAMESPACES = ["ETH", "CON", "COM"] as const;
export type UIAssetNamespace = typeof UI_ASSET_NAMESPACES[number];
export type UIAssetPackStatus = "canonical" | "awaiting-canonical-assets";

export interface UIAssetDefinition {
  id: `${UIAssetNamespace}-UI-${string}`;
  path: string;
  sourceFilename?: string;
  type: string;
  visual?: Readonly<Record<string, unknown>>;
}

export interface UIAssetPackDefinition {
  namespace: UIAssetNamespace;
  version: number;
  status: UIAssetPackStatus;
  assets: readonly UIAssetDefinition[];
}

function normalizeEthernumAsset(asset: EthernumUIAssetDefinition): UIAssetDefinition {
  return Object.freeze({
    id: asset.id as UIAssetDefinition["id"],
    path: asset.path,
    sourceFilename: asset.sourceFilename,
    type: asset.type,
    visual: asset.visual as Readonly<Record<string, unknown>>,
  });
}

export const UI_ASSET_PACK_DEFINITIONS = Object.freeze([
  {
    namespace: "ETH",
    version: ETHERNUM_UI_ASSET_PACK_VERSION,
    status: "canonical",
    assets: Object.freeze(ETHERNUM_UI_ASSET_DEFINITIONS.map(normalizeEthernumAsset)),
  },
  { namespace: "CON", version: 0, status: "awaiting-canonical-assets", assets: Object.freeze([]) },
  { namespace: "COM", version: 0, status: "awaiting-canonical-assets", assets: Object.freeze([]) },
] satisfies readonly UIAssetPackDefinition[]);

const PACKS = new Map(UI_ASSET_PACK_DEFINITIONS.map(pack => [pack.namespace, pack]));
const ASSETS = new Map(UI_ASSET_PACK_DEFINITIONS.flatMap(pack => pack.assets.map(asset => [asset.id, asset] as const)));

export function parseUIAssetNamespace(id: unknown): UIAssetNamespace | null {
  if (typeof id !== "string") return null;
  const match = /^(ETH|CON|COM)-UI-/.exec(id.trim().toUpperCase());
  return match?.[1] as UIAssetNamespace | undefined ?? null;
}

export function resolveUIAssetPack(namespace: unknown): UIAssetPackDefinition | undefined {
  if (typeof namespace !== "string") return undefined;
  return PACKS.get(namespace.trim().toUpperCase() as UIAssetNamespace);
}

export function resolveUIAsset(id: unknown): UIAssetDefinition | undefined {
  if (typeof id !== "string") return undefined;
  return ASSETS.get(id.trim().toUpperCase() as UIAssetDefinition["id"]);
}

export function resolveUIAssetPath(id: unknown): string {
  return resolveUIAsset(id)?.path ?? "";
}

export const UIAssetPackRegistry = Object.freeze({
  namespaces: UI_ASSET_NAMESPACES,
  packs: UI_ASSET_PACK_DEFINITIONS,
  parseNamespace: parseUIAssetNamespace,
  resolvePack: resolveUIAssetPack,
  resolve: resolveUIAsset,
  resolvePath: resolveUIAssetPath,
});
