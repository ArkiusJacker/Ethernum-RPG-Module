export interface TokenAnchor {
  sceneId?: string;
  tokenId?: string;
  tokenUuid?: string;
  center: {
    x: number;
    y: number;
  };
}

interface TokenDocumentLike {
  id?: string;
  uuid?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parent?: {
    id?: string;
    grid?: {
      size?: number;
    };
  };
}

function finiteNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * Resolves a token center from document data, including not-yet-rendered hook changes.
 * Canvas placeables can still expose the previous position while updateToken runs.
 */
export function resolveTokenDocumentAnchor(
  document: unknown,
  changed: unknown = {},
  fallbackGridSize = 100,
): TokenAnchor | null {
  if (!document || typeof document !== "object") return null;
  const token = document as TokenDocumentLike;
  const delta = changed && typeof changed === "object"
    ? changed as Partial<TokenDocumentLike>
    : {};
  const x = finiteNumber(delta.x, finiteNumber(token.x, Number.NaN));
  const y = finiteNumber(delta.y, finiteNumber(token.y, Number.NaN));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const width = Math.max(0.01, finiteNumber(delta.width, finiteNumber(token.width, 1)));
  const height = Math.max(0.01, finiteNumber(delta.height, finiteNumber(token.height, 1)));
  const gridSize = Math.max(
    1,
    finiteNumber(token.parent?.grid?.size, finiteNumber(fallbackGridSize, 100)),
  );

  return {
    sceneId: token.parent?.id,
    tokenId: token.id,
    tokenUuid: token.uuid,
    center: {
      x: x + (width * gridSize) / 2,
      y: y + (height * gridSize) / 2,
    },
  };
}
