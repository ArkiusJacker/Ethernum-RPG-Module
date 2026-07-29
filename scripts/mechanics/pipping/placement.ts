import { PIPPING_SHADOW_ASSETS, selectPippingShadowVariant } from "./assets.js";
import type {
  PippingShadowManifestation,
  PippingTier,
} from "./state.js";

export interface PippingShadowPlacement {
  x: number;
  y: number;
}

interface PlacementCanvas {
  app?: {
    renderer?: {
      screen?: {
        width?: number;
        height?: number;
      };
      view?: HTMLCanvasElement;
    };
    view?: HTMLCanvasElement;
  };
  grid?: {
    size?: number;
    getSnappedPoint?: (
      point: PippingShadowPlacement,
      options?: Record<string, unknown>,
    ) => PippingShadowPlacement;
  };
  scene?: {
    grid?: {
      size?: number;
      distance?: number;
    };
  };
  stage?: {
    worldTransform?: {
      applyInverse?: (point: PippingShadowPlacement) => PippingShadowPlacement;
    };
  };
  tokens?: {
    controlled?: Array<{
      actor?: Actor;
      center?: PippingShadowPlacement;
    }>;
    placeables?: Array<{
      actor?: Actor;
      center?: PippingShadowPlacement;
    }>;
  };
}

function localize(key: string, fallback: string): string {
  const value = game.i18n?.localize(key);
  return value && value !== key ? value : fallback;
}

export function pippingShadowRangeForTier(tier: PippingTier): number {
  if (tier >= 5) return 30;
  if (tier >= 3) return 20;
  return 10;
}

export function pippingCanvasDistance(
  source: PippingShadowPlacement,
  target: PippingShadowPlacement,
  gridSize: number,
  gridDistance: number,
): number {
  const pixelDistance = Math.hypot(target.x - source.x, target.y - source.y);
  return pixelDistance / Math.max(1, gridSize) * Math.max(1, gridDistance);
}

export function pippingPlacementWithinRange(
  source: PippingShadowPlacement,
  target: PippingShadowPlacement,
  maximumDistance: number,
  gridSize: number,
  gridDistance: number,
): boolean {
  return pippingCanvasDistance(source, target, gridSize, gridDistance)
    <= maximumDistance + 0.001;
}

function actorTokenCenter(actor: Actor, currentCanvas: PlacementCanvas): PippingShadowPlacement | null {
  const tokens = [
    ...(currentCanvas.tokens?.controlled ?? []),
    ...(currentCanvas.tokens?.placeables ?? []),
  ];
  const token = tokens.find(candidate => candidate.actor?.id === actor.id);
  const x = Number(token?.center?.x);
  const y = Number(token?.center?.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function clientPointToWorld(
  event: PointerEvent,
  view: HTMLCanvasElement,
  currentCanvas: PlacementCanvas,
): PippingShadowPlacement {
  const rect = view.getBoundingClientRect();
  const screen = currentCanvas.app?.renderer?.screen;
  const screenWidth = Math.max(1, Number(screen?.width ?? rect.width));
  const screenHeight = Math.max(1, Number(screen?.height ?? rect.height));
  const rendererPoint = {
    x: (event.clientX - rect.left) * (screenWidth / Math.max(1, rect.width)),
    y: (event.clientY - rect.top) * (screenHeight / Math.max(1, rect.height)),
  };
  const world = currentCanvas.stage?.worldTransform?.applyInverse?.(rendererPoint) ?? rendererPoint;
  const grid = currentCanvas.grid;
  const snapped = grid?.getSnappedPoint?.(world, { mode: 0 });
  if (snapped && Number.isFinite(snapped.x) && Number.isFinite(snapped.y)) return snapped;

  const size = Math.max(1, Number(grid?.size ?? currentCanvas.scene?.grid?.size ?? 100));
  return {
    x: Math.round((world.x - size / 2) / size) * size + size / 2,
    y: Math.round((world.y - size / 2) / size) * size + size / 2,
  };
}

function confirmPlacement(
  kind: PippingShadowManifestation["kind"],
  distance: number,
  maximumDistance: number,
): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (accepted: boolean) => {
      if (settled) return;
      settled = true;
      resolve(accepted);
    };
    const nameKey = kind === "animated"
      ? "ETHERNUM.Unique.Pipping.Actions.AnimatedShadow.Name"
      : "ETHERNUM.Unique.Pipping.Actions.MirroredShadows.Name";
    new Dialog({
      title: game.i18n!.localize("ETHERNUM.Unique.Pipping.Placement.ConfirmTitle"),
      content: `
        <div class="ethernum-pipping-placement-dialog">
          <img src="${PIPPING_SHADOW_ASSETS.order}" alt="" />
          <div>
            <strong>${game.i18n!.localize(nameKey)}</strong>
            <p>${game.i18n!.format("ETHERNUM.Unique.Pipping.Placement.ConfirmBody", {
              distance: Math.round(distance),
              maximum: maximumDistance,
            })}</p>
          </div>
        </div>`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n!.localize("ETHERNUM.Unique.Pipping.Placement.Confirm"),
          callback: () => finish(true),
        },
        cancel: {
          icon: '<i class="fas fa-xmark"></i>',
          label: game.i18n!.localize("ETHERNUM.Unique.Pipping.Placement.Cancel"),
          callback: () => finish(false),
        },
      },
      default: "confirm",
      close: () => finish(false),
    }).render(true);
  });
}

export async function requestPippingShadowPlacement(
  actor: Actor,
  kind: PippingShadowManifestation["kind"],
  tier: PippingTier,
): Promise<PippingShadowPlacement | null> {
  const currentCanvas = canvas as unknown as PlacementCanvas | undefined;
  const view = currentCanvas?.app?.renderer?.view ?? currentCanvas?.app?.view;
  const source = currentCanvas ? actorTokenCenter(actor, currentCanvas) : null;
  if (!currentCanvas || !view || !source) {
    ui.notifications?.warn(localize(
      "ETHERNUM.Unique.Pipping.Errors.RequiresActiveToken",
      "Pipping precisa de um token ativo na cena.",
    ));
    return null;
  }

  const maximumDistance = pippingShadowRangeForTier(tier);
  const gridSize = Math.max(1, Number(
    currentCanvas.scene?.grid?.size ?? currentCanvas.grid?.size ?? 100,
  ));
  const gridDistance = Math.max(1, Number(currentCanvas.scene?.grid?.distance ?? 5));
  const variant = selectPippingShadowVariant();
  const preview = document.createElement("div");
  preview.className = "ethernum-pipping-placement-preview";
  preview.innerHTML = `
    <img src="${variant.asset}" alt="" />
    <span>${game.i18n!.format("ETHERNUM.Unique.Pipping.Placement.Range", {
      range: maximumDistance,
    })}</span>`;
  document.body.append(preview);

  let active = true;
  const cleanup = () => {
    if (!active) return;
    active = false;
    view.removeEventListener("pointermove", onMove, true);
    view.removeEventListener("pointerdown", onPointerDown, true);
    view.removeEventListener("contextmenu", onContextMenu, true);
    window.removeEventListener("keydown", onKeyDown, true);
    preview.remove();
  };

  let latest: PippingShadowPlacement = source;
  let latestDistance = 0;
  let latestValid = true;
  const updatePreview = (event: PointerEvent) => {
    latest = clientPointToWorld(event, view, currentCanvas);
    latestDistance = pippingCanvasDistance(source, latest, gridSize, gridDistance);
    latestValid = pippingPlacementWithinRange(
      source,
      latest,
      maximumDistance,
      gridSize,
      gridDistance,
    );
    preview.classList.toggle("invalid", !latestValid);
    preview.style.left = `${event.clientX}px`;
    preview.style.top = `${event.clientY}px`;
    const label = preview.querySelector("span");
    if (label) {
      label.textContent = game.i18n!.format(
        latestValid
          ? "ETHERNUM.Unique.Pipping.Placement.Distance"
          : "ETHERNUM.Unique.Pipping.Placement.OutOfRange",
        {
          distance: Math.round(latestDistance),
          range: maximumDistance,
        },
      );
    }
  };

  let resolvePlacement: (point: PippingShadowPlacement | null) => void = () => {};
  const result = new Promise<PippingShadowPlacement | null>(resolve => {
    resolvePlacement = resolve;
  });

  const cancel = () => {
    cleanup();
    resolvePlacement(null);
  };
  const onMove = (event: PointerEvent) => updatePreview(event);
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    updatePreview(event);
    if (!latestValid) {
      ui.notifications?.warn(game.i18n!.format(
        "ETHERNUM.Unique.Pipping.Placement.OutOfRange",
        {
          distance: Math.round(latestDistance),
          range: maximumDistance,
        },
      ));
      return;
    }
    const selected = { ...latest };
    const selectedDistance = latestDistance;
    cleanup();
    void confirmPlacement(kind, selectedDistance, maximumDistance)
      .then(confirmed => resolvePlacement(confirmed ? selected : null));
  };
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    cancel();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    cancel();
  };

  view.addEventListener("pointermove", onMove, true);
  view.addEventListener("pointerdown", onPointerDown, true);
  view.addEventListener("contextmenu", onContextMenu, true);
  window.addEventListener("keydown", onKeyDown, true);
  ui.notifications?.info(game.i18n!.localize("ETHERNUM.Unique.Pipping.Placement.Instructions"));
  return result;
}
