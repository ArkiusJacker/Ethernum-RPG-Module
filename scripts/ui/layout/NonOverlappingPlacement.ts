export type PlacementDirection = "right" | "left" | "above" | "below";

export interface PlacementRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right?: number;
  bottom?: number;
}

export interface PlacementViewport {
  width: number;
  height: number;
}

export interface ResolveNonOverlappingPositionInput {
  movingRect: PlacementRect;
  obstacleRect: PlacementRect;
  viewport: PlacementViewport;
  margin: number;
  preferredOrder?: readonly PlacementDirection[];
}

export interface PlacementResult {
  left: number;
  top: number;
  strategy: "preserved" | PlacementDirection | "minimum-intersection";
  intersectionArea: number;
  compactRequired: boolean;
}

interface NormalizedRect extends PlacementRect {
  right: number;
  bottom: number;
}

const DEFAULT_ORDER: readonly PlacementDirection[] = ["right", "left", "above", "below"];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function rectAt(rect: PlacementRect, left: number, top: number): NormalizedRect {
  const width = Math.max(0, Number(rect.width) || 0);
  const height = Math.max(0, Number(rect.height) || 0);
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function normalized(rect: PlacementRect): NormalizedRect {
  return rectAt(rect, Number(rect.left) || 0, Number(rect.top) || 0);
}

export function rectangleIntersectionArea(left: PlacementRect, right: PlacementRect): number {
  const a = normalized(left);
  const b = normalized(right);
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

export function resolveNonOverlappingPosition({
  movingRect,
  obstacleRect,
  viewport,
  margin,
  preferredOrder = DEFAULT_ORDER,
}: ResolveNonOverlappingPositionInput): PlacementResult {
  const moving = normalized(movingRect);
  const obstacle = normalized(obstacleRect);
  const safeMargin = Math.max(0, Number(margin) || 0);
  const maxLeft = Math.max(safeMargin, viewport.width - moving.width - safeMargin);
  const maxTop = Math.max(safeMargin, viewport.height - moving.height - safeMargin);
  const place = (left: number, top: number) => rectAt(
    moving,
    clamp(Math.round(left), safeMargin, maxLeft),
    clamp(Math.round(top), safeMargin, maxTop),
  );
  const current = place(moving.left, moving.top);
  const currentArea = rectangleIntersectionArea(current, obstacle);
  if (currentArea === 0) {
    return { left: current.left, top: current.top, strategy: "preserved", intersectionArea: 0, compactRequired: false };
  }

  const candidates: Record<PlacementDirection, NormalizedRect> = {
    right: place(obstacle.right + safeMargin, moving.top),
    left: place(obstacle.left - moving.width - safeMargin, moving.top),
    above: place(moving.left, obstacle.top - moving.height - safeMargin),
    below: place(moving.left, obstacle.bottom + safeMargin),
  };
  for (const direction of preferredOrder) {
    const candidate = candidates[direction];
    if (candidate && rectangleIntersectionArea(candidate, obstacle) === 0) {
      return { left: candidate.left, top: candidate.top, strategy: direction, intersectionArea: 0, compactRequired: false };
    }
  }

  const fallbackCandidates = [
    current,
    ...preferredOrder.map(direction => candidates[direction]),
    place(safeMargin, safeMargin),
    place(maxLeft, safeMargin),
    place(safeMargin, maxTop),
    place(maxLeft, maxTop),
  ];
  const best = fallbackCandidates.reduce((selected, candidate) =>
    rectangleIntersectionArea(candidate, obstacle) < rectangleIntersectionArea(selected, obstacle)
      ? candidate
      : selected,
  );
  const intersectionArea = rectangleIntersectionArea(best, obstacle);
  return {
    left: best.left,
    top: best.top,
    strategy: "minimum-intersection",
    intersectionArea,
    compactRequired: intersectionArea > 0,
  };
}
