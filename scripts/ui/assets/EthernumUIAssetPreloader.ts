import {
  ETHERNUM_UI_ASSET_DEFINITIONS,
  resolveEthernumUIAsset,
  type EthernumUIAssetDefinition,
} from "./EthernumUIAssetRegistry.js";

export type EthernumUIAssetLoadStatus = "idle" | "loading" | "loaded" | "missing";

export interface EthernumUIAssetLoadReport {
  loaded: string[];
  missing: string[];
  pending: string[];
}

const CRITICAL_IDS = ["ETH-UI-01", "ETH-UI-03", "ETH-UI-04", "ETH-UI-05", "ETH-UI-06", "ETH-UI-07"];
const statuses = new Map<string, EthernumUIAssetLoadStatus>(
  ETHERNUM_UI_ASSET_DEFINITIONS.map(asset => [asset.id, "idle"]),
);
const requests = new Map<string, Promise<EthernumUIAssetLoadStatus>>();

type ImageFactory = () => HTMLImageElement;

function browserImage(): HTMLImageElement {
  return new Image();
}

function load(asset: EthernumUIAssetDefinition, imageFactory: ImageFactory): Promise<EthernumUIAssetLoadStatus> {
  const current = statuses.get(asset.id);
  if (current === "loaded" || current === "missing") return Promise.resolve(current);
  const existing = requests.get(asset.id);
  if (existing) return existing;

  statuses.set(asset.id, "loading");
  const request = new Promise<EthernumUIAssetLoadStatus>(resolve => {
    const image = imageFactory();
    image.onload = () => {
      statuses.set(asset.id, "loaded");
      resolve("loaded");
    };
    image.onerror = () => {
      statuses.set(asset.id, "missing");
      resolve("missing");
    };
    image.src = asset.path;
  });
  requests.set(asset.id, request);
  return request;
}

export async function preloadEthernumUIAssets(
  ids: readonly string[] = CRITICAL_IDS,
  imageFactory: ImageFactory = browserImage,
): Promise<EthernumUIAssetLoadReport> {
  const assets = ids.flatMap(id => {
    const asset = resolveEthernumUIAsset(id);
    return asset ? [asset] : [];
  });
  await Promise.all(assets.map(asset => load(asset, imageFactory)));
  return getEthernumUIAssetLoadReport();
}

export function preloadAllEthernumUIAssets(imageFactory: ImageFactory = browserImage) {
  return preloadEthernumUIAssets(ETHERNUM_UI_ASSET_DEFINITIONS.map(asset => asset.id), imageFactory);
}

export function getEthernumUIAssetLoadReport(): EthernumUIAssetLoadReport {
  const ids = ETHERNUM_UI_ASSET_DEFINITIONS.map(asset => asset.id);
  return {
    loaded: ids.filter(id => statuses.get(id) === "loaded"),
    missing: ids.filter(id => statuses.get(id) === "missing"),
    pending: ids.filter(id => !["loaded", "missing"].includes(statuses.get(id) ?? "idle")),
  };
}

export function bindEthernumUIAssetFallbacks(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>("img[data-ui-asset]").forEach(image => {
    const component = image.closest<HTMLElement>("[data-asset-component]") ?? image;
    const markLoaded = () => {
      image.classList.add("is-asset-ready");
      image.classList.remove("is-asset-missing");
      component.classList.add("is-asset-ready");
      component.classList.remove("is-asset-missing");
    };
    const markMissing = () => {
      image.classList.add("is-asset-missing");
      image.classList.remove("is-asset-ready");
      component.classList.add("is-asset-missing");
      component.classList.remove("is-asset-ready");
    };
    image.addEventListener("load", markLoaded, { once: true });
    image.addEventListener("error", markMissing, { once: true });
    if (image.complete) (image.naturalWidth > 0 ? markLoaded : markMissing)();
  });
}

export function resetEthernumUIAssetPreloader(): void {
  requests.clear();
  ETHERNUM_UI_ASSET_DEFINITIONS.forEach(asset => statuses.set(asset.id, "idle"));
}

export const EthernumUIAssetPreloader = Object.freeze({
  criticalIds: CRITICAL_IDS,
  preloadCritical: preloadEthernumUIAssets,
  preloadAll: preloadAllEthernumUIAssets,
  report: getEthernumUIAssetLoadReport,
  bindFallbacks: bindEthernumUIAssetFallbacks,
  reset: resetEthernumUIAssetPreloader,
});
