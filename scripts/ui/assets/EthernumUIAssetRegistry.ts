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

export interface EthernumUIAssetVisualMetadata {
  preferredWidth?: number;
  preferredHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  opticalScale?: number;
  opacity?: number;
  fit?: "contain" | "cover" | "fill";
  contentInset?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

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
  visual: EthernumUIAssetVisualMetadata;
}

const ROOT = "modules/ethernum-rpg-module/assets/ui/ethernum";

export const ETHERNUM_UI_ASSET_DEFINITIONS = Object.freeze([
  { id: "ETH-UI-01", path: `${ROOT}/corners/ornamental-corner.webp`, sourceFilename: "ETH-UI-01-ethernum-ornamental-corner.png", type: "corner", sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 640, runtimeHeight: 640, rotatable: true, visual: { preferredWidth: 260, preferredHeight: 260, minWidth: 120, minHeight: 120, maxWidth: 360, maxHeight: 360, opticalScale: 1.18, opacity: 0.94, fit: "contain", contentInset: { top: 10, right: 10, bottom: 10, left: 10 } } },
  { id: "ETH-UI-02", path: `${ROOT}/frames/panel-edge-divider.webp`, sourceFilename: "ETH-UI-02-ethernum-panel-edge-divider.png", type: "frame", sourceWidth: 2087, sourceHeight: 101, runtimeWidth: 1536, runtimeHeight: 74, repeatable: true, visual: { preferredWidth: 760, preferredHeight: 36, minWidth: 260, minHeight: 18, maxWidth: 1536, maxHeight: 48, opticalScale: 1, opacity: 0.9, fit: "fill", contentInset: { top: 16, right: 2, bottom: 16, left: 2 } } },
  { id: "ETH-UI-03", path: `${ROOT}/instruments/rank-ring.webp`, sourceFilename: "ETH-UI-03-ethernum-rank-ring.png", type: "instrument", sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 420, runtimeHeight: 420, visual: { preferredWidth: 124, preferredHeight: 124, minWidth: 72, minHeight: 72, maxWidth: 144, maxHeight: 144, opticalScale: 1.08, opacity: 1, fit: "contain", contentInset: { top: 5, right: 5, bottom: 5, left: 5 } } },
  { id: "ETH-UI-04", path: `${ROOT}/instruments/hp-monitor-frame.webp`, sourceFilename: "ETH-UI-04-ethernum-hp-monitor-frame.png", type: "instrument", sourceWidth: 1707, sourceHeight: 420, runtimeWidth: 1536, runtimeHeight: 378, visual: { preferredWidth: 410, preferredHeight: 112, minWidth: 280, minHeight: 80, maxWidth: 560, maxHeight: 142, opticalScale: 1, opacity: 1, fit: "fill", contentInset: { top: 19, right: 6, bottom: 17, left: 6 } } },
  { id: "ETH-UI-05", path: `${ROOT}/frames/portrait-frame.webp`, sourceFilename: "ETH-UI-05-ethernum-portrait-frame.png", type: "frame", sourceWidth: 981, sourceHeight: 1125, runtimeWidth: 420, runtimeHeight: 482, visual: { preferredWidth: 150, preferredHeight: 172, minWidth: 82, minHeight: 94, maxWidth: 174, maxHeight: 200, opticalScale: 1.04, opacity: 1, fit: "contain", contentInset: { top: 8, right: 9, bottom: 9, left: 9 } } },
  { id: "ETH-UI-06", path: `${ROOT}/tabs/tab-frame-inactive.webp`, sourceFilename: "ETH-UI-06-ethernum-tab-frame-inactive.png", type: "tab", sourceWidth: 2069, sourceHeight: 274, runtimeWidth: 1024, runtimeHeight: 136, repeatable: true, visual: { preferredWidth: 154, preferredHeight: 58, minWidth: 108, minHeight: 48, maxWidth: 220, maxHeight: 68, opticalScale: 1, opacity: 0.82, fit: "fill", contentInset: { top: 12, right: 8, bottom: 12, left: 8 } } },
  { id: "ETH-UI-07", path: `${ROOT}/tabs/tab-frame-active.webp`, sourceFilename: "ETH-UI-07-ethernum-tab-frame-active.png", type: "tab", sourceWidth: 2172, sourceHeight: 275, runtimeWidth: 1024, runtimeHeight: 130, repeatable: true, visual: { preferredWidth: 154, preferredHeight: 58, minWidth: 108, minHeight: 48, maxWidth: 220, maxHeight: 68, opticalScale: 1, opacity: 1, fit: "fill", contentInset: { top: 12, right: 8, bottom: 12, left: 8 } } },
  { id: "ETH-UI-08-A", path: `${ROOT}/overlays/rune-overlay-a.webp`, sourceFilename: "ETH-UI-08-A-ethernum-rune-overlay.png", type: "overlay", sourceWidth: 1677, sourceHeight: 938, runtimeWidth: 1344, runtimeHeight: 752, rotatable: true, visual: { preferredWidth: 900, preferredHeight: 504, minWidth: 480, minHeight: 269, maxWidth: 1344, maxHeight: 752, opticalScale: 1, opacity: 0.095, fit: "cover" } },
  { id: "ETH-UI-08-B", path: `${ROOT}/overlays/rune-overlay-b.webp`, sourceFilename: "ETH-UI-08-B-ethernum-rune-overlay.png", type: "overlay", sourceWidth: 1677, sourceHeight: 938, runtimeWidth: 1344, runtimeHeight: 752, rotatable: true, visual: { preferredWidth: 900, preferredHeight: 504, minWidth: 480, minHeight: 269, maxWidth: 1344, maxHeight: 752, opticalScale: 1, opacity: 0.075, fit: "cover" } },
  { id: "ETH-UI-09", path: `${ROOT}/resources/resource-gem-filled.webp`, sourceFilename: "ETH-UI-09-ethernum-resource-gem-filled.png", type: "resource", sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 160, runtimeHeight: 160, repeatable: true, tintable: true, visual: { preferredWidth: 32, preferredHeight: 32, minWidth: 20, minHeight: 20, maxWidth: 38, maxHeight: 38, opticalScale: 1.14, opacity: 1, fit: "contain", contentInset: { top: 14, right: 14, bottom: 14, left: 14 } } },
  { id: "ETH-UI-10", path: `${ROOT}/resources/resource-gem-empty.webp`, sourceFilename: "ETH-UI-10-ethernum-resource-gem-empty.png", type: "resource", sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 160, runtimeHeight: 160, repeatable: true, visual: { preferredWidth: 32, preferredHeight: 32, minWidth: 20, minHeight: 20, maxWidth: 38, maxHeight: 38, opticalScale: 1.14, opacity: 0.82, fit: "contain", contentInset: { top: 14, right: 14, bottom: 14, left: 14 } } },
  { id: "ETH-UI-11", path: `${ROOT}/accents/skill-row-accent.webp`, sourceFilename: "ETH-UI-11-ethernum-skill-row-accent-marker.png", type: "accent", sourceWidth: 246, sourceHeight: 1059, runtimeWidth: 96, runtimeHeight: 413, repeatable: true, tintable: true, visual: { preferredWidth: 20, preferredHeight: 72, minWidth: 14, minHeight: 50, maxWidth: 24, maxHeight: 90, opticalScale: 1, opacity: 0.9, fit: "fill" } },
  { id: "ETH-UI-12", path: `${ROOT}/icons/small-icon-frame.webp`, sourceFilename: "ETH-UI-12-ethernum-small-icon-frame.png", type: "icon", sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 160, runtimeHeight: 160, repeatable: true, visual: { preferredWidth: 42, preferredHeight: 42, minWidth: 30, minHeight: 30, maxWidth: 50, maxHeight: 50, opticalScale: 1.08, opacity: 1, fit: "contain", contentInset: { top: 9, right: 9, bottom: 9, left: 9 } } },
  { id: "ETH-UI-13", path: `${ROOT}/accents/ornamental-divider.webp`, sourceFilename: "ETH-UI-13-ethernum-ornamental-divider.png", type: "accent", sourceWidth: 1565, sourceHeight: 165, runtimeWidth: 1024, runtimeHeight: 108, visual: { preferredWidth: 620, preferredHeight: 66, minWidth: 220, minHeight: 28, maxWidth: 1024, maxHeight: 108, opticalScale: 1, opacity: 0.86, fit: "fill", contentInset: { top: 12, right: 2, bottom: 12, left: 2 } } },
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
  const visual = (id: string) => resolveEthernumUIAsset(id)?.visual ?? {};
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
    visual: Object.freeze({
      corner: visual("ETH-UI-01"),
      panelEdge: visual("ETH-UI-02"),
      rankRing: visual("ETH-UI-03"),
      hpMonitor: visual("ETH-UI-04"),
      portraitFrame: visual("ETH-UI-05"),
      tabInactive: visual("ETH-UI-06"),
      tabActive: visual("ETH-UI-07"),
      runeOverlayA: visual("ETH-UI-08-A"),
      runeOverlayB: visual("ETH-UI-08-B"),
      resourceGem: visual("ETH-UI-09"),
      skillAccent: visual("ETH-UI-11"),
      iconFrame: visual("ETH-UI-12"),
      divider: visual("ETH-UI-13"),
    }),
  });
}

export const EthernumUIAssetRegistry = Object.freeze({
  version: ETHERNUM_UI_ASSET_PACK_VERSION,
  definitions: ETHERNUM_UI_ASSET_DEFINITIONS,
  resolve: resolveEthernumUIAsset,
  resolvePath: resolveEthernumUIAssetPath,
  viewModel: createEthernumUIAssetViewModel,
});
