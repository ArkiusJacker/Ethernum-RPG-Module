export const PIPPING_CONE_DISTANCE = 30;
export const PIPPING_CONE_ANGLE = 90;

const GEOMETRY_EPSILON = 1e-6;

export interface PippingGeometryPoint {
  x: number;
  y: number;
}

export type PippingGeometryDimensionUnit = "pixels" | "grid" | "distance";

export interface PippingGeometryDimensions {
  width?: number;
  height?: number;
  dimensionUnit?: PippingGeometryDimensionUnit;
}

export type PippingAreaOriginKind = "self" | "shadow" | "point";

export interface PippingAreaOrigin extends PippingGeometryDimensions {
  kind: PippingAreaOriginKind;
  point: PippingGeometryPoint;
  elevation?: number;
}

export interface PippingSquareGridGeometry {
  type: "square";
  gridSize: number;
  gridDistance: number;
}

export interface PippingGridlessGeometry {
  type: "gridless";
  pixelsPerDistance: number;
}

export type PippingSceneGeometry =
  | PippingSquareGridGeometry
  | PippingGridlessGeometry;

export type PippingRadialAreaType = "circle" | "emanation" | "burst";

export interface PippingRadialArea {
  type: PippingRadialAreaType;
  origin: PippingAreaOrigin;
  radius: number;
}

export interface PippingConeArea {
  type: "cone";
  origin: PippingAreaOrigin;
  distance: number;
  direction: number;
  angle?: number;
}

export type PippingAreaGeometry = PippingRadialArea | PippingConeArea;

export interface PippingGeometryToken extends PippingGeometryDimensions {
  id: string;
  center: PippingGeometryPoint;
  disposition: number;
  elevation?: number;
}

export type PippingDispositionMode =
  | "any"
  | "allies"
  | "enemies"
  | "neutral"
  | "include";

export interface PippingDispositionFilter {
  mode: PippingDispositionMode;
  sourceDisposition?: number;
  values?: readonly number[];
  exclude?: readonly number[];
}

export interface PippingAreaCandidateQuery<
  Candidate extends PippingGeometryToken = PippingGeometryToken,
> {
  area: PippingAreaGeometry;
  scene: PippingSceneGeometry;
  candidates: readonly Candidate[];
  disposition?: PippingDispositionFilter;
  excludeIds?: readonly string[];
  elevationTolerance?: number | null;
}

export interface PippingGeometryBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PippingResolvedAreaOrigin {
  kind: PippingAreaOriginKind;
  point: PippingGeometryPoint;
  elevation?: number;
  bounds: PippingGeometryBounds;
}

function assertFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number.`);
  }
  return value;
}

function assertNonNegative(value: number, label: string): number {
  assertFinite(value, label);
  if (value < 0) {
    throw new RangeError(`${label} must not be negative.`);
  }
  return value;
}

function assertPositive(value: number, label: string): number {
  assertFinite(value, label);
  if (value <= 0) {
    throw new RangeError(`${label} must be greater than zero.`);
  }
  return value;
}

export function pippingPixelsPerDistance(scene: PippingSceneGeometry): number {
  if (scene.type === "gridless") {
    return assertPositive(scene.pixelsPerDistance, "pixelsPerDistance");
  }

  return assertPositive(scene.gridSize, "gridSize")
    / assertPositive(scene.gridDistance, "gridDistance");
}

export function pippingDistanceToPixels(
  distance: number,
  scene: PippingSceneGeometry,
): number {
  return assertNonNegative(distance, "distance") * pippingPixelsPerDistance(scene);
}

export function pippingPixelsToDistance(
  pixels: number,
  scene: PippingSceneGeometry,
): number {
  return assertNonNegative(pixels, "pixels") / pippingPixelsPerDistance(scene);
}

export function pippingPointDistance(
  first: PippingGeometryPoint,
  second: PippingGeometryPoint,
  scene: PippingSceneGeometry,
): number {
  const pixels = Math.hypot(
    assertFinite(second.x, "second.x") - assertFinite(first.x, "first.x"),
    assertFinite(second.y, "second.y") - assertFinite(first.y, "first.y"),
  );
  return pippingPixelsToDistance(pixels, scene);
}

function dimensionToPixels(
  value: number | undefined,
  unit: PippingGeometryDimensionUnit,
  scene: PippingSceneGeometry,
  label: string,
): number {
  const dimension = assertNonNegative(value ?? 0, label);
  if (unit === "pixels") return dimension;
  if (unit === "distance") return pippingDistanceToPixels(dimension, scene);
  if (scene.type !== "square") {
    throw new RangeError("Grid dimensions require a square grid.");
  }
  return dimension * assertPositive(scene.gridSize, "gridSize");
}

function boundsFromCenter(
  center: PippingGeometryPoint,
  dimensions: PippingGeometryDimensions,
  scene: PippingSceneGeometry,
): PippingGeometryBounds {
  const unit = dimensions.dimensionUnit ?? "pixels";
  const width = dimensionToPixels(dimensions.width, unit, scene, "width");
  const height = dimensionToPixels(dimensions.height, unit, scene, "height");
  const x = assertFinite(center.x, "center.x");
  const y = assertFinite(center.y, "center.y");
  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
}

export function pippingTokenBounds(
  token: PippingGeometryToken,
  scene: PippingSceneGeometry,
): PippingGeometryBounds {
  return boundsFromCenter(token.center, token, scene);
}

export function resolvePippingAreaOrigin(
  origin: PippingAreaOrigin,
  scene: PippingSceneGeometry,
): PippingResolvedAreaOrigin {
  return {
    kind: origin.kind,
    point: {
      x: assertFinite(origin.point.x, "origin.x"),
      y: assertFinite(origin.point.y, "origin.y"),
    },
    elevation: Number.isFinite(origin.elevation) ? origin.elevation : undefined,
    bounds: boundsFromCenter(origin.point, origin, scene),
  };
}

export function createPippingCone30(
  origin: PippingAreaOrigin,
  direction: number,
  angle = PIPPING_CONE_ANGLE,
): PippingConeArea {
  return {
    type: "cone",
    origin,
    distance: PIPPING_CONE_DISTANCE,
    direction: assertFinite(direction, "direction"),
    angle: assertPositive(angle, "angle"),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function pointInBounds(
  point: PippingGeometryPoint,
  bounds: PippingGeometryBounds,
): boolean {
  return point.x >= bounds.left - GEOMETRY_EPSILON
    && point.x <= bounds.right + GEOMETRY_EPSILON
    && point.y >= bounds.top - GEOMETRY_EPSILON
    && point.y <= bounds.bottom + GEOMETRY_EPSILON;
}

function pointDistanceToBounds(
  point: PippingGeometryPoint,
  bounds: PippingGeometryBounds,
): number {
  const closestX = clamp(point.x, bounds.left, bounds.right);
  const closestY = clamp(point.y, bounds.top, bounds.bottom);
  return Math.hypot(point.x - closestX, point.y - closestY);
}

function boundsDistance(
  first: PippingGeometryBounds,
  second: PippingGeometryBounds,
): number {
  const dx = Math.max(first.left - second.right, second.left - first.right, 0);
  const dy = Math.max(first.top - second.bottom, second.top - first.bottom, 0);
  return Math.hypot(dx, dy);
}

function boundsCorners(bounds: PippingGeometryBounds): PippingGeometryPoint[] {
  return [
    { x: bounds.left, y: bounds.top },
    { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom },
    { x: bounds.left, y: bounds.bottom },
  ];
}

function boundsEdges(
  bounds: PippingGeometryBounds,
): Array<[PippingGeometryPoint, PippingGeometryPoint]> {
  const corners = boundsCorners(bounds);
  return corners.map((corner, index) => [
    corner,
    corners[(index + 1) % corners.length],
  ]);
}

function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function degreeDelta(first: number, second: number): number {
  const delta = Math.abs(normalizeDegrees(first) - normalizeDegrees(second));
  return delta > 180 ? 360 - delta : delta;
}

function pointInConePixels(
  point: PippingGeometryPoint,
  origin: PippingGeometryPoint,
  radius: number,
  direction: number,
  angle: number,
): boolean {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance > radius + GEOMETRY_EPSILON) return false;
  if (distance <= GEOMETRY_EPSILON || angle >= 360) return true;
  const pointDirection = Math.atan2(dy, dx) * (180 / Math.PI);
  return degreeDelta(pointDirection, direction) <= angle / 2 + GEOMETRY_EPSILON;
}

function orientation(
  first: PippingGeometryPoint,
  second: PippingGeometryPoint,
  third: PippingGeometryPoint,
): number {
  return (second.x - first.x) * (third.y - first.y)
    - (second.y - first.y) * (third.x - first.x);
}

function pointOnSegment(
  point: PippingGeometryPoint,
  start: PippingGeometryPoint,
  end: PippingGeometryPoint,
): boolean {
  return Math.abs(orientation(start, end, point)) <= GEOMETRY_EPSILON
    && point.x >= Math.min(start.x, end.x) - GEOMETRY_EPSILON
    && point.x <= Math.max(start.x, end.x) + GEOMETRY_EPSILON
    && point.y >= Math.min(start.y, end.y) - GEOMETRY_EPSILON
    && point.y <= Math.max(start.y, end.y) + GEOMETRY_EPSILON;
}

function segmentsIntersect(
  firstStart: PippingGeometryPoint,
  firstEnd: PippingGeometryPoint,
  secondStart: PippingGeometryPoint,
  secondEnd: PippingGeometryPoint,
): boolean {
  const firstA = orientation(firstStart, firstEnd, secondStart);
  const firstB = orientation(firstStart, firstEnd, secondEnd);
  const secondA = orientation(secondStart, secondEnd, firstStart);
  const secondB = orientation(secondStart, secondEnd, firstEnd);

  if (
    ((firstA > GEOMETRY_EPSILON && firstB < -GEOMETRY_EPSILON)
      || (firstA < -GEOMETRY_EPSILON && firstB > GEOMETRY_EPSILON))
    && ((secondA > GEOMETRY_EPSILON && secondB < -GEOMETRY_EPSILON)
      || (secondA < -GEOMETRY_EPSILON && secondB > GEOMETRY_EPSILON))
  ) {
    return true;
  }

  return (Math.abs(firstA) <= GEOMETRY_EPSILON
      && pointOnSegment(secondStart, firstStart, firstEnd))
    || (Math.abs(firstB) <= GEOMETRY_EPSILON
      && pointOnSegment(secondEnd, firstStart, firstEnd))
    || (Math.abs(secondA) <= GEOMETRY_EPSILON
      && pointOnSegment(firstStart, secondStart, secondEnd))
    || (Math.abs(secondB) <= GEOMETRY_EPSILON
      && pointOnSegment(firstEnd, secondStart, secondEnd));
}

function segmentIntersectsBounds(
  start: PippingGeometryPoint,
  end: PippingGeometryPoint,
  bounds: PippingGeometryBounds,
): boolean {
  if (pointInBounds(start, bounds) || pointInBounds(end, bounds)) return true;
  return boundsEdges(bounds).some(([edgeStart, edgeEnd]) =>
    segmentsIntersect(start, end, edgeStart, edgeEnd));
}

function circleSegmentIntersections(
  center: PippingGeometryPoint,
  radius: number,
  start: PippingGeometryPoint,
  end: PippingGeometryPoint,
): PippingGeometryPoint[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= GEOMETRY_EPSILON) return [];

  const offsetX = start.x - center.x;
  const offsetY = start.y - center.y;
  const linear = 2 * (offsetX * dx + offsetY * dy);
  const constant = offsetX * offsetX + offsetY * offsetY - radius * radius;
  const discriminant = linear * linear - 4 * lengthSquared * constant;
  if (discriminant < -GEOMETRY_EPSILON) return [];

  const root = Math.sqrt(Math.max(0, discriminant));
  const parameters = [
    (-linear - root) / (2 * lengthSquared),
    (-linear + root) / (2 * lengthSquared),
  ];

  return parameters
    .filter((parameter, index) =>
      parameter >= -GEOMETRY_EPSILON
      && parameter <= 1 + GEOMETRY_EPSILON
      && (index === 0 || Math.abs(parameter - parameters[0]) > GEOMETRY_EPSILON))
    .map(parameter => ({
      x: start.x + dx * parameter,
      y: start.y + dy * parameter,
    }));
}

function tokenIntersectsCone(
  bounds: PippingGeometryBounds,
  area: PippingConeArea,
  scene: PippingSceneGeometry,
): boolean {
  const origin = resolvePippingAreaOrigin(area.origin, scene).point;
  const radius = pippingDistanceToPixels(area.distance, scene);
  const direction = normalizeDegrees(assertFinite(area.direction, "direction"));
  const angle = assertPositive(area.angle ?? PIPPING_CONE_ANGLE, "angle");
  if (angle >= 360) {
    return pointDistanceToBounds(origin, bounds) <= radius + GEOMETRY_EPSILON;
  }

  if (boundsCorners(bounds).some(point =>
    pointInConePixels(point, origin, radius, direction, angle))) {
    return true;
  }
  if (pointInBounds(origin, bounds)) return true;

  const rayDirections = [direction - angle / 2, direction + angle / 2];
  for (const rayDirection of rayDirections) {
    const radians = rayDirection * (Math.PI / 180);
    const endpoint = {
      x: origin.x + radius * Math.cos(radians),
      y: origin.y + radius * Math.sin(radians),
    };
    if (segmentIntersectsBounds(origin, endpoint, bounds)) return true;
  }

  return boundsEdges(bounds).some(([start, end]) =>
    circleSegmentIntersections(origin, radius, start, end).some(point =>
      pointInConePixels(point, origin, radius, direction, angle)));
}

export function pippingPointInArea(
  point: PippingGeometryPoint,
  area: PippingAreaGeometry,
  scene: PippingSceneGeometry,
): boolean {
  const resolvedOrigin = resolvePippingAreaOrigin(area.origin, scene);
  if (area.type === "cone") {
    return pointInConePixels(
      point,
      resolvedOrigin.point,
      pippingDistanceToPixels(area.distance, scene),
      area.direction,
      area.angle ?? PIPPING_CONE_ANGLE,
    );
  }

  const radius = pippingDistanceToPixels(area.radius, scene);
  if (area.type === "emanation") {
    return pointDistanceToBounds(point, resolvedOrigin.bounds)
      <= radius + GEOMETRY_EPSILON;
  }
  return Math.hypot(
    point.x - resolvedOrigin.point.x,
    point.y - resolvedOrigin.point.y,
  ) <= radius + GEOMETRY_EPSILON;
}

export function pippingElevationMatches(
  originElevation: number | undefined,
  candidateElevation: number | undefined,
  tolerance?: number | null,
): boolean {
  if (tolerance === undefined || tolerance === null) return true;
  const allowedDifference = assertNonNegative(tolerance, "elevationTolerance");
  if (!Number.isFinite(originElevation) || !Number.isFinite(candidateElevation)) {
    return true;
  }
  return Math.abs((candidateElevation as number) - (originElevation as number))
    <= allowedDifference + GEOMETRY_EPSILON;
}

export function pippingTokenIntersectsArea(
  token: PippingGeometryToken,
  area: PippingAreaGeometry,
  scene: PippingSceneGeometry,
  elevationTolerance?: number | null,
): boolean {
  if (!pippingElevationMatches(
    area.origin.elevation,
    token.elevation,
    elevationTolerance,
  )) {
    return false;
  }

  const tokenBounds = pippingTokenBounds(token, scene);
  if (area.type === "cone") {
    return tokenIntersectsCone(tokenBounds, area, scene);
  }

  const radius = pippingDistanceToPixels(area.radius, scene);
  const origin = resolvePippingAreaOrigin(area.origin, scene);
  if (area.type === "emanation") {
    return boundsDistance(origin.bounds, tokenBounds)
      <= radius + GEOMETRY_EPSILON;
  }
  return pointDistanceToBounds(origin.point, tokenBounds)
    <= radius + GEOMETRY_EPSILON;
}

export function pippingDispositionMatches(
  disposition: number,
  filter?: PippingDispositionFilter,
): boolean {
  if (!filter) return true;
  if (filter.exclude?.includes(disposition)) return false;

  switch (filter.mode) {
    case "any":
      return true;
    case "neutral":
      return disposition === 0;
    case "include":
      return filter.values?.includes(disposition) ?? false;
    case "allies": {
      const source = filter.sourceDisposition;
      return Number.isFinite(source)
        && source !== 0
        && disposition !== 0
        && Math.sign(disposition) === Math.sign(source as number);
    }
    case "enemies": {
      const source = filter.sourceDisposition;
      return Number.isFinite(source)
        && source !== 0
        && disposition !== 0
        && Math.sign(disposition) !== Math.sign(source as number);
    }
  }
}

export function resolvePippingAreaCandidates<
  Candidate extends PippingGeometryToken,
>(query: PippingAreaCandidateQuery<Candidate>): Candidate[] {
  const excluded = new Set(query.excludeIds ?? []);
  return query.candidates.filter(candidate =>
    !excluded.has(candidate.id)
    && pippingDispositionMatches(candidate.disposition, query.disposition)
    && pippingTokenIntersectsArea(
      candidate,
      query.area,
      query.scene,
      query.elevationTolerance,
    ));
}
