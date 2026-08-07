import { PIPPING_SHADOW_ASSETS, selectPippingShadowVariant } from "./assets.js";
import type {
  PippingShadowManifestation,
  PippingTier,
} from "./state.js";

export interface PippingShadowPlacement {
  x: number;
  y: number;
}

export interface PippingAreaPlacement {
  center: PippingShadowPlacement;
  direction: number;
}

export interface PippingAreaPlacementOptions {
  actionId: string;
  nameKey: string;
  areaType: "burst" | "cone";
  areaSize: number;
  maximumRange: number;
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
      apply?: (point: PippingShadowPlacement) => PippingShadowPlacement;
      a?: number;
      d?: number;
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

function worldPointToClient(
  point: PippingShadowPlacement,
  view: HTMLCanvasElement,
  currentCanvas: PlacementCanvas,
): PippingShadowPlacement {
  const rect = view.getBoundingClientRect();
  const screen = currentCanvas.app?.renderer?.screen;
  const screenWidth = Math.max(1, Number(screen?.width ?? rect.width));
  const screenHeight = Math.max(1, Number(screen?.height ?? rect.height));
  const rendererPoint = currentCanvas.stage?.worldTransform?.apply?.(point) ?? point;
  return {
    x: rect.left + rendererPoint.x * (rect.width / screenWidth),
    y: rect.top + rendererPoint.y * (rect.height / screenHeight),
  };
}

function confirmAreaPlacement(
  options: PippingAreaPlacementOptions,
  distance: number,
): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (accepted: boolean) => {
      if (settled) return;
      settled = true;
      resolve(accepted);
    };
    new Dialog({
      title: localize(
        "ETHERNUM.Unique.Pipping.AreaPlacement.ConfirmTitle",
        "Confirmar área",
      ),
      content: `
        <div class="ethernum-pipping-area-confirmation">
          <i class="fas ${options.areaType === "cone" ? "fa-bullhorn" : "fa-circle-dot"}"></i>
          <div>
            <strong>${game.i18n!.localize(options.nameKey)}</strong>
            <p>${game.i18n!.format("ETHERNUM.Unique.Pipping.AreaPlacement.ConfirmBody", {
              area: options.areaSize,
              distance: Math.round(distance),
            })}</p>
          </div>
        </div>`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: localize("ETHERNUM.Unique.Pipping.AreaPlacement.Confirm", "Confirmar"),
          callback: () => finish(true),
        },
        cancel: {
          icon: '<i class="fas fa-xmark"></i>',
          label: localize("ETHERNUM.Unique.Pipping.AreaPlacement.Cancel", "Cancelar"),
          callback: () => finish(false),
        },
      },
      default: "confirm",
      close: () => finish(false),
    }).render(true);
  });
}

export async function requestPippingAreaPlacement(
  actor: Actor,
  options: PippingAreaPlacementOptions,
): Promise<PippingAreaPlacement | null> {
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

  const gridSize = Math.max(1, Number(
    currentCanvas.scene?.grid?.size ?? currentCanvas.grid?.size ?? 100,
  ));
  const gridDistance = Math.max(1, Number(currentCanvas.scene?.grid?.distance ?? 5));
  const rect = view.getBoundingClientRect();
  const screenWidth = Math.max(1, Number(
    currentCanvas.app?.renderer?.screen?.width ?? rect.width,
  ));
  const worldScale = Math.abs(Number(currentCanvas.stage?.worldTransform?.a ?? 1));
  const clientScale = rect.width / screenWidth;
  const areaRadiusPixels = options.areaSize / gridDistance * gridSize * worldScale * clientScale;
  const preview = document.createElement("div");
  preview.className = `ethernum-pipping-area-placement-preview area-${options.areaType}`;
  preview.innerHTML = `
    <div class="ethernum-pipping-area-shape"></div>
    <span></span>`;
  preview.style.setProperty("--pipping-area-radius", `${Math.max(8, areaRadiusPixels)}px`);
  document.body.append(preview);

  let active = true;
  let latestCenter = source;
  let latestDirection = 0;
  let latestDistance = 0;
  let latestValid = true;
  const cleanup = () => {
    if (!active) return;
    active = false;
    view.removeEventListener("pointermove", onMove, true);
    view.removeEventListener("pointerdown", onPointerDown, true);
    view.removeEventListener("contextmenu", onContextMenu, true);
    window.removeEventListener("keydown", onKeyDown, true);
    preview.remove();
  };

  const updatePreview = (event: PointerEvent) => {
    const cursor = clientPointToWorld(event, view, currentCanvas);
    latestDirection = Math.atan2(cursor.y - source.y, cursor.x - source.x) * (180 / Math.PI);
    latestCenter = options.areaType === "cone" ? source : cursor;
    latestDistance = pippingCanvasDistance(source, latestCenter, gridSize, gridDistance);
    latestValid = options.areaType === "cone" || pippingPlacementWithinRange(
      source,
      latestCenter,
      options.maximumRange,
      gridSize,
      gridDistance,
    );
    const clientCenter = options.areaType === "cone"
      ? worldPointToClient(source, view, currentCanvas)
      : { x: event.clientX, y: event.clientY };
    preview.style.left = `${clientCenter.x}px`;
    preview.style.top = `${clientCenter.y}px`;
    preview.style.setProperty("--pipping-area-direction", `${latestDirection}deg`);
    preview.classList.toggle("invalid", !latestValid);
    const label = preview.querySelector("span");
    if (label) {
      label.textContent = options.areaType === "cone"
        ? game.i18n!.format("ETHERNUM.Unique.Pipping.AreaPlacement.ConePreview", {
          area: options.areaSize,
        })
        : game.i18n!.format(
          latestValid
            ? "ETHERNUM.Unique.Pipping.AreaPlacement.BurstPreview"
            : "ETHERNUM.Unique.Pipping.AreaPlacement.OutOfRange",
          {
            area: options.areaSize,
            distance: Math.round(latestDistance),
            range: options.maximumRange,
          },
        );
    }
  };

  let resolvePlacement: (placement: PippingAreaPlacement | null) => void = () => {};
  const result = new Promise<PippingAreaPlacement | null>(resolve => {
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
        "ETHERNUM.Unique.Pipping.AreaPlacement.OutOfRange",
        {
          area: options.areaSize,
          distance: Math.round(latestDistance),
          range: options.maximumRange,
        },
      ));
      return;
    }
    const selected: PippingAreaPlacement = {
      center: { ...latestCenter },
      direction: latestDirection,
    };
    const selectedDistance = latestDistance;
    cleanup();
    void confirmAreaPlacement(options, selectedDistance)
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
  ui.notifications?.info(localize(
    "ETHERNUM.Unique.Pipping.AreaPlacement.Instructions",
    "Mova o cursor, clique para escolher a área e confirme. Clique direito ou Esc cancela.",
  ));
  return result;
}
