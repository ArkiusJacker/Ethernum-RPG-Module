export const ETHERNUM_UI_ASSET_PACK_VERSION = 1;

export type EthernumUIAssetType =
  | "frame"
  | "corner"
  | "instrument"
  | "tab"
  | "overlay"
  | "resource"
  | "accent"
  | "icon";

export interface EthernumUIAssetDefinition {
  id: string;
  path: string;
  sourceFilename: string;
  type: EthernumUIAssetType;
  sourceWidth: number;
  sourceHeight: number;
  runtimeWidth: number;
  runtimeHeight: number;
  repeatable?: boolean;
  rotatable?: boolean;
  tintable?: boolean;
}

const ROOT = "modules/ethernum-rpg-module/assets/ui/ethernum";

export const ETHERNUM_UI_ASSET_DEFINITIONS = Object.freeze([
  { id: "ETH-UI-01", path: `${ROOT}/corners/ornamental-corner.webp`, sourceFilename: "ETH-UI-01-ethernum-ornamental-corner.png", type: "corner", sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 640, runtimeHeight: 640, rotatable: true },
  { id: "ETH-UI-02", path: `${ROOT}/frames/panel-edge-divider.webp`, sourceFilename: "ETH-UI-02-ethernum-panel-edge-divider.png", type: "frame", sourceWidth: 2087, sourceHeight: 101, runtimeWidth: 1536, runtimeHeight: 74, repeatable: true },
  { id: "ETH-UI-03", path: `${ROOT}/instruments/rank-ring.webp`, sourceFilename: "ETH-UI-03-ethernum-rank-ring.png", type: "instrument", sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 420, runtimeHeight: 420 },
  { id: "ETH-UI-04", path: `${ROOT}/instruments/hp-monitor-frame.webp`, sourceFilename: "ETH-UI-04-ethernum-hp-monitor-frame.png", type: "instrument", sourceWidth: 1707, sourceHeight: 420, runtimeWidth: 1536, runtimeHeight: 378 },
  { id: "ETH-UI-05", path: `${ROOT}/frames/portrait-frame.webp`, sourceFilename: "ETH-UI-05-ethernum-portrait-frame.png", type: "frame", sourceWidth: 981, sourceHeight: 1125, runtimeWidth: 420, runtimeHeight: 482 },
  { id: "ETH-UI-06", path: `${ROOT}/tabs/tab-frame-inactive.webp`, sourceFilename: "ETH-UI-06-ethernum-tab-frame-inactive.png", type: "tab", sourceWidth: 2069, sourceHeight: 274, runtimeWidth: 1024, runtimeHeight: 136, repeatable: true },
  { id: "ETH-UI-07", path: `${ROOT}/tabs/tab-frame-active.webp`, sourceFilename: "ETH-UI-07-ethernum-tab-frame-active.png", type: "tab", sourceWidth: 2172, sourceHeight: 275, runtimeWidth: 1024, runtimeHeight: 130, repeatable: true },
  { id: "ETH-UI-08-A", path: `${ROOT}/overlays/rune-overlay-a.webp`, sourceFilename: "ETH-UI-08-A-ethernum-rune-overlay.png", type: "overlay", sourceWidth: 1677, sourceHeight: 938, runtimeWidth: 1344, runtimeHeight: 752, rotatable: true },
  { id: "ETH-UI-08-B", path: `${ROOT}/overlays/rune-overlay-b.webp`, sourceFilename: "ETH-UI-08-B-ethernum-rune-overlay.png", type: "overlay", sourceWidth: 1677, sourceHeight: 938, runtimeWidth: 1344, runtimeHeight: 752, rotatable: true },
  { id: "ETH-UI-09", path: `${ROOT}/resources/resource-gem-filled.webp`, sourceFilename: "ETH-UI-09-ethernum-resource-gem-filled.png", type: "resource", sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 160, runtimeHeight: 160, repeatable: true, tintable: true },
  { id: "ETH-UI-10", path: `${ROOT}/resources/resource-gem-empty.webp`, sourceFilename: "ETH-UI-10-ethernum-resource-gem-empty.png", type: "resource", sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 160, runtimeHeight: 160, repeatable: true },
  { id: "ETH-UI-11", path: `${ROOT}/accents/skill-row-accent.webp`, sourceFilename: "ETH-UI-11-ethernum-skill-row-accent-marker.png", type: "accent", sourceWidth: 246, sourceHeight: 1059, runtimeWidth: 96, runtimeHeight: 413, repeatable: true, tintable: true },
  { id: "ETH-UI-12", path: `${ROOT}/icons/small-icon-frame.webp`, sourceFilename: "ETH-UI-12-ethernum-small-icon-frame.png", type: "icon", sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 160, runtimeHeight: 160, repeatable: true },
  { id: "ETH-UI-13", path: `${ROOT}/accents/ornamental-divider.webp`, sourceFilename: "ETH-UI-13-ethernum-ornamental-divider.png", type: "accent", sourceWidth: 1565, sourceHeight: 165, runtimeWidth: 1024, runtimeHeight: 108 },
] satisfies readonly EthernumUIAssetDefinition[]);

const ASSETS = new Map(ETHERNUM_UI_ASSET_DEFINITIONS.map(asset => [asset.id, asset]));
const ALIASES = new Map([["ETH-UI-08", "ETH-UI-08-A"]]);

export function resolveEthernumUIAsset(id: string): EthernumUIAssetDefinition | undefined {
  return ASSETS.get(ALIASES.get(id) ?? id);
}

export function resolveEthernumUIAssetPath(id: string): string {
  return resolveEthernumUIAsset(id)?.path ?? "";
}

export function createEthernumUIAssetViewModel() {
  return Object.freeze({
    packVersion: ETHERNUM_UI_ASSET_PACK_VERSION,
    corner: resolveEthernumUIAssetPath("ETH-UI-01"),
    panelEdge: resolveEthernumUIAssetPath("ETH-UI-02"),
    rankRing: resolveEthernumUIAssetPath("ETH-UI-03"),
    hpMonitor: resolveEthernumUIAssetPath("ETH-UI-04"),
    portraitFrame: resolveEthernumUIAssetPath("ETH-UI-05"),
    tabInactive: resolveEthernumUIAssetPath("ETH-UI-06"),
    tabActive: resolveEthernumUIAssetPath("ETH-UI-07"),
    runeOverlayA: resolveEthernumUIAssetPath("ETH-UI-08-A"),
    runeOverlayB: resolveEthernumUIAssetPath("ETH-UI-08-B"),
    resourceFilled: resolveEthernumUIAssetPath("ETH-UI-09"),
    resourceEmpty: resolveEthernumUIAssetPath("ETH-UI-10"),
    skillAccent: resolveEthernumUIAssetPath("ETH-UI-11"),
    iconFrame: resolveEthernumUIAssetPath("ETH-UI-12"),
    divider: resolveEthernumUIAssetPath("ETH-UI-13"),
  });
}

export const EthernumUIAssetRegistry = Object.freeze({
  version: ETHERNUM_UI_ASSET_PACK_VERSION,
  definitions: ETHERNUM_UI_ASSET_DEFINITIONS,
  resolve: resolveEthernumUIAsset,
  resolvePath: resolveEthernumUIAssetPath,
  viewModel: createEthernumUIAssetViewModel,
});
