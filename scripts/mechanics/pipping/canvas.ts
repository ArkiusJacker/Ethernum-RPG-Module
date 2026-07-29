import { ETHERNUM } from "../../config.js";
import { AutomationAuthority } from "../../core/AutomationAuthority.js";
import {
  selectPippingShadowVariant,
  type PippingShadowVariant,
} from "./assets.js";
import { normalizePippingState } from "./state.js";
import type {
  PippingNightState,
  PippingShadowManifestation,
} from "./state.js";

interface TokenLike {
  id?: string;
  actor?: Actor;
  center?: { x: number; y: number };
  document?: { uuid?: string };
}

interface SceneLike {
  id?: string;
  grid?: { size?: number };
  templates?: {
    get?: (id: string) => TemplateDocumentLike | undefined;
    contents?: TemplateDocumentLike[];
  };
  tiles?: { contents?: TileDocumentLike[] };
  createEmbeddedDocuments?: (
    embeddedName: string,
    data: Record<string, unknown>[],
  ) => Promise<unknown[]>;
  deleteEmbeddedDocuments?: (embeddedName: string, ids: string[]) => Promise<unknown>;
}

interface TemplateDocumentLike {
  id?: string;
  uuid?: string;
  update?: (data: Record<string, unknown>) => Promise<unknown>;
  getFlag?: (scope: string, key: string) => unknown;
}

interface TileDocumentLike {
  id?: string;
  getFlag?: (scope: string, key: string) => unknown;
}

export interface PippingDarknessTemplateReference {
  templateId: string;
  templateUuid: string;
  sourceTokenUuid?: string;
  [key: string]: unknown;
}

interface PippingCanvasContext {
  sceneId?: string;
  sourceTokenId?: string;
  sourceTokenUuid?: string;
  sourceCenter?: { x: number; y: number };
}

type PippingCanvasOperation = PippingCanvasContext & (
  {
    type: "sync-template";
    state: PippingNightState;
    radius: number;
  }
  | {
    type: "remove-template";
    state: PippingNightState;
  }
  | {
    type: "spawn-shadows";
    state: PippingNightState;
    count: number;
    kind: PippingShadowManifestation["kind"];
  }
  | {
    type: "remove-shadows";
    state: PippingNightState;
    kind?: PippingShadowManifestation["kind"];
  }
);

interface PippingCanvasRequest {
  type: "pipping-canvas-request";
  requestId: string;
  requesterId: string;
  actorUuid: string;
  operation: PippingCanvasOperation;
}

interface PippingCanvasResponse {
  type: "pipping-canvas-response";
  requestId: string;
  requesterId: string;
  result?: unknown;
  error?: string;
}

type PippingCanvasSocketMessage = PippingCanvasRequest | PippingCanvasResponse;

const SOCKET_CHANNEL = `module.${ETHERNUM.MODULE_NAME}`;
const pendingCanvasRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();
let canvasSocketInitialized = false;

function getScene(sceneId?: string): SceneLike | null {
  if (sceneId && canvas?.scene?.id !== sceneId) {
    return (game.scenes?.get(sceneId) as unknown as SceneLike | undefined) ?? null;
  }
  return (canvas?.scene as unknown as SceneLike | undefined) ?? null;
}

function getActorToken(actor: Actor, context: PippingCanvasContext = {}): TokenLike | null {
  if (context.sourceCenter) {
    return {
      id: context.sourceTokenId,
      actor,
      center: context.sourceCenter,
      document: { uuid: context.sourceTokenUuid },
    };
  }
  const tokenLayer = canvas?.tokens as unknown as {
    controlled?: TokenLike[];
    placeables?: TokenLike[];
  } | undefined;
  const controlled = tokenLayer?.controlled?.find(token => token.actor?.id === actor.id);
  if (controlled) return controlled;
  const activeTokens = typeof actor.getActiveTokens === "function"
    ? actor.getActiveTokens() as unknown as TokenLike[]
    : [];
  return activeTokens[0]
    ?? tokenLayer?.placeables?.find(token => token.actor?.id === actor.id)
    ?? null;
}

function templateBelongsToActor(template: TemplateDocumentLike, actor: Actor): boolean {
  return template.getFlag?.(ETHERNUM.MODULE_NAME, "pippingActorId") === actor.id;
}

function findPippingTemplate(
  scene: SceneLike,
  actor: Actor,
  state: PippingNightState,
): TemplateDocumentLike | undefined {
  if (state.darkness.templateId) {
    const byId = scene.templates?.get?.(state.darkness.templateId);
    if (byId && templateBelongsToActor(byId, actor)) return byId;
  }
  return scene.templates?.contents?.find(template => templateBelongsToActor(template, actor));
}

async function syncPippingLivingNightTemplateLocally(
  actor: Actor,
  state: PippingNightState,
  radius = state.darkness.radius,
  context: PippingCanvasContext = {},
): Promise<PippingDarknessTemplateReference | null> {
  const scene = getScene(context.sceneId);
  const token = getActorToken(actor, context);
  if (!scene?.createEmbeddedDocuments || !token?.center) return null;

  const sourceTokenUuid = token.document?.uuid;
  const existing = findPippingTemplate(scene, actor, state);
  const data = {
    x: token.center.x,
    y: token.center.y,
    distance: radius,
    t: "circle",
    fillColor: "#32114f",
    borderColor: "#b36cff",
    texture: null,
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        uniqueMechanics: true,
        pippingLivingNight: true,
        pippingActorId: actor.id,
        sourceTokenUuid,
      },
    },
  };

  if (existing?.id && existing.update) {
    await existing.update(data);
    return {
      templateId: existing.id,
      templateUuid: existing.uuid ?? `Scene.${scene.id}.MeasuredTemplate.${existing.id}`,
      sourceTokenUuid,
    };
  }

  const [created] = await scene.createEmbeddedDocuments("MeasuredTemplate", [data]);
  const document = created as TemplateDocumentLike | undefined;
  if (!document?.id) return null;
  return {
    templateId: document.id,
    templateUuid: document.uuid ?? `Scene.${scene.id}.MeasuredTemplate.${document.id}`,
    sourceTokenUuid,
  };
}

async function removePippingLivingNightTemplateLocally(
  actor: Actor,
  state: PippingNightState,
  context: PippingCanvasContext = {},
): Promise<void> {
  const scene = getScene(context.sceneId);
  if (!scene?.deleteEmbeddedDocuments) return;
  const ids = new Set<string>();
  if (state.darkness.templateId) {
    const candidate = scene.templates?.get?.(state.darkness.templateId);
    if (candidate?.id && templateBelongsToActor(candidate, actor)) ids.add(candidate.id);
  }
  for (const template of scene.templates?.contents ?? []) {
    if (template.id && templateBelongsToActor(template, actor)) ids.add(template.id);
  }
  if (ids.size > 0) {
    await scene.deleteEmbeddedDocuments("MeasuredTemplate", [...ids]);
  }
}

function shadowTileData(
  actor: Actor,
  token: TokenLike,
  variant: PippingShadowVariant,
  kind: PippingShadowManifestation["kind"],
  index: number,
  count: number,
  random: () => number,
  scene: SceneLike,
): Record<string, unknown> {
  const gridSize = Math.max(50, Number(scene?.grid?.size ?? 100));
  const width = Math.round(gridSize * (kind === "animated" ? 1.35 : 1.1));
  const height = Math.round(width * 1.5);
  const angle = ((Math.PI * 2) / Math.max(1, count)) * index + random() * 0.45;
  const radius = gridSize * (kind === "animated" ? 1.2 : 0.82);
  const center = token.center ?? { x: 0, y: 0 };
  return {
    x: Math.round(center.x + Math.cos(angle) * radius - width / 2),
    y: Math.round(center.y + Math.sin(angle) * radius - height / 2),
    width,
    height,
    alpha: kind === "animated" ? 0.72 : 0.52,
    rotation: Math.round((random() - 0.5) * 10),
    overhead: false,
    hidden: false,
    locked: false,
    sort: 100,
    texture: {
      src: variant.asset,
      scaleX: 1,
      scaleY: 1,
      fit: "contain",
      anchorX: 0.5,
      anchorY: 0.5,
    },
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        uniqueMechanics: true,
        pippingShadow: true,
        pippingActorId: actor.id,
        pippingShadowKind: kind,
        pippingShadowVariant: variant.expression,
      },
    },
  };
}

async function removePippingShadowManifestationsLocally(
  actor: Actor,
  state: PippingNightState,
  kind?: PippingShadowManifestation["kind"],
  context: PippingCanvasContext = {},
): Promise<PippingShadowManifestation[]> {
  const scene = getScene(context.sceneId);
  if (!scene?.deleteEmbeddedDocuments) return state.shadowManifestations;
  const ids = new Set<string>();
  for (const tile of scene.tiles?.contents ?? []) {
    const actorId = tile.getFlag?.(ETHERNUM.MODULE_NAME, "pippingActorId");
    const tileKind = tile.getFlag?.(ETHERNUM.MODULE_NAME, "pippingShadowKind");
    if (tile.id && actorId === actor.id && (!kind || tileKind === kind)) ids.add(tile.id);
  }
  if (ids.size > 0) await scene.deleteEmbeddedDocuments("Tile", [...ids]);
  return state.shadowManifestations.filter(entry =>
    entry.sceneId !== scene.id || (kind ? entry.kind !== kind : false)
  );
}

async function spawnPippingShadowManifestationsLocally(
  actor: Actor,
  state: PippingNightState,
  count: number,
  kind: PippingShadowManifestation["kind"],
  random: () => number = Math.random,
  context: PippingCanvasContext = {},
): Promise<PippingShadowManifestation[]> {
  const scene = getScene(context.sceneId);
  const token = getActorToken(actor, context);
  if (!scene?.id || !scene.createEmbeddedDocuments || !token?.center) {
    throw new Error("Pipping requires an active token on the current scene to manifest shadows.");
  }

  const retained = await removePippingShadowManifestationsLocally(actor, state, kind, context);
  const variants = Array.from({ length: Math.max(1, Math.floor(count)) }, () =>
    selectPippingShadowVariant(random)
  );
  const created = await scene.createEmbeddedDocuments(
    "Tile",
    variants.map((variant, index) =>
      shadowTileData(actor, token, variant, kind, index, variants.length, random, scene)
    ),
  ) as TileDocumentLike[];

  return [
    ...retained,
    ...created.flatMap((tile, index) => {
      const id = tile.id;
      const variant = variants[index];
      return id && variant
        ? [{
          id,
          sceneId: scene.id!,
          variant: variant.expression,
          kind,
        }]
        : [];
    }),
  ].slice(-12);
}

async function resolveActor(uuid: string): Promise<Actor | null> {
  if (!uuid || typeof fromUuid !== "function") return null;
  const document = await (fromUuid as unknown as (documentUuid: string) => Promise<unknown>)(uuid);
  return document instanceof Actor ? document : null;
}

async function requesterOwnsActor(request: PippingCanvasRequest): Promise<boolean> {
  const requester = game.users?.get(request.requesterId);
  if (!requester) return false;
  if (requester.isGM) return true;
  const actor = await resolveActor(request.actorUuid);
  return Boolean(actor?.testUserPermission(requester as User, "OWNER"));
}

function actorUsesPipping(actor: Actor): boolean {
  const unique = actor.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics") as {
    activeProfile?: unknown;
  } | undefined;
  return unique?.activeProfile === "pipping-night";
}

function validateCanvasOperation(actor: Actor, operation: PippingCanvasOperation): void {
  if (!actorUsesPipping(actor)) {
    throw new Error("The requested canvas operation does not belong to an active Pipping actor.");
  }
  if (operation.type === "sync-template") {
    if (!Number.isFinite(operation.radius) || operation.radius < 5 || operation.radius > 30) {
      throw new Error("The Pipping darkness radius is outside the allowed range.");
    }
  }
  if (operation.type === "spawn-shadows") {
    if (!Number.isInteger(operation.count) || operation.count < 1 || operation.count > 4) {
      throw new Error("The Pipping shadow count is outside the allowed range.");
    }
  }
}

function validatedRemoteCanvasOperation(
  actor: Actor,
  operation: PippingCanvasOperation,
): PippingCanvasOperation {
  if (!operation.sceneId || !operation.sourceTokenId) {
    throw new Error("The Pipping canvas request has no source scene or token.");
  }
  const scene = game.scenes?.get(operation.sceneId) as unknown as {
    grid?: { size?: number };
    tokens?: {
      get?: (id: string) => {
        actorId?: string;
        uuid?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      } | undefined;
    };
  } | undefined;
  const token = scene?.tokens?.get?.(operation.sourceTokenId);
  if (!token || token.actorId !== actor.id) {
    throw new Error("The Pipping source token is not owned by the source actor.");
  }
  const gridSize = Math.max(1, Number(scene?.grid?.size ?? 100));
  const x = Number(token.x ?? 0);
  const y = Number(token.y ?? 0);
  const width = Math.max(1, Number(token.width ?? 1));
  const height = Math.max(1, Number(token.height ?? 1));
  return {
    ...operation,
    state: normalizePippingState(operation.state),
    sourceTokenUuid: token.uuid,
    sourceCenter: {
      x: x + (width * gridSize) / 2,
      y: y + (height * gridSize) / 2,
    },
  };
}

async function executeCanvasOperationLocally(
  actor: Actor,
  operation: PippingCanvasOperation,
): Promise<unknown> {
  switch (operation.type) {
    case "sync-template":
      return syncPippingLivingNightTemplateLocally(
        actor,
        operation.state,
        operation.radius,
        operation,
      );
    case "remove-template":
      await removePippingLivingNightTemplateLocally(actor, operation.state, operation);
      return null;
    case "spawn-shadows":
      return spawnPippingShadowManifestationsLocally(
        actor,
        operation.state,
        operation.count,
        operation.kind,
        Math.random,
        operation,
      );
    case "remove-shadows":
      return removePippingShadowManifestationsLocally(
        actor,
        operation.state,
        operation.kind,
        operation,
      );
  }
}

async function handleCanvasRequest(request: PippingCanvasRequest): Promise<void> {
  if (!AutomationAuthority.isPrimaryGM()) return;
  const socket = game.socket as unknown as {
    emit?: (channel: string, message: PippingCanvasSocketMessage) => void;
  } | undefined;
  if (!socket?.emit) return;
  let response: PippingCanvasResponse;
  try {
    if (!await requesterOwnsActor(request)) {
      throw new Error("Requester does not own the Pipping actor.");
    }
    const actor = await resolveActor(request.actorUuid);
    if (!actor) throw new Error("Pipping actor was not found.");
    validateCanvasOperation(actor, request.operation);
    const operation = validatedRemoteCanvasOperation(actor, request.operation);
    response = {
      type: "pipping-canvas-response",
      requestId: request.requestId,
      requesterId: request.requesterId,
      result: await executeCanvasOperationLocally(actor, operation),
    };
  } catch (error) {
    response = {
      type: "pipping-canvas-response",
      requestId: request.requestId,
      requesterId: request.requesterId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  socket.emit(SOCKET_CHANNEL, response);
}

function handleCanvasResponse(response: PippingCanvasResponse): void {
  if (response.requesterId !== game.user?.id) return;
  const pending = pendingCanvasRequests.get(response.requestId);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingCanvasRequests.delete(response.requestId);
  if (response.error) pending.reject(new Error(response.error));
  else pending.resolve(response.result);
}

export function initializePippingCanvasSocket(): void {
  if (canvasSocketInitialized) return;
  const socket = game.socket as unknown as {
    on?: (
      channel: string,
      callback: (message: PippingCanvasSocketMessage) => void,
    ) => void;
  } | undefined;
  if (!socket?.on) return;
  canvasSocketInitialized = true;
  socket.on(SOCKET_CHANNEL, message => {
    if (message?.type === "pipping-canvas-request") {
      void handleCanvasRequest(message);
    } else if (message?.type === "pipping-canvas-response") {
      handleCanvasResponse(message);
    }
  });
}

async function executeCanvasOperation(
  actor: Actor,
  operation: PippingCanvasOperation,
): Promise<unknown> {
  const sourceToken = getActorToken(actor);
  const contextualOperation: PippingCanvasOperation = {
    ...operation,
    sceneId: operation.sceneId ?? canvas?.scene?.id,
    sourceTokenId: operation.sourceTokenId ?? sourceToken?.id,
    sourceTokenUuid: operation.sourceTokenUuid ?? sourceToken?.document?.uuid,
    sourceCenter: operation.sourceCenter ?? sourceToken?.center,
  };
  if (AutomationAuthority.isPrimaryGM() || !AutomationAuthority.getPrimaryGM()) {
    return executeCanvasOperationLocally(actor, contextualOperation);
  }
  initializePippingCanvasSocket();
  const socket = game.socket as unknown as {
    emit?: (channel: string, message: PippingCanvasSocketMessage) => void;
  } | undefined;
  const requesterId = game.user?.id;
  if (!socket?.emit || !requesterId) throw new Error("No active GM canvas authority is available.");
  const requestId = foundry.utils.randomID();
  const response = new Promise<unknown>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCanvasRequests.delete(requestId);
      reject(new Error("The primary GM did not answer the Pipping canvas request."));
    }, 12_000);
    pendingCanvasRequests.set(requestId, { resolve, reject, timeout });
  });
  socket.emit(SOCKET_CHANNEL, {
    type: "pipping-canvas-request",
    requestId,
    requesterId,
    actorUuid: actor.uuid,
    operation: contextualOperation,
  });
  return response;
}

export async function syncPippingLivingNightTemplate(
  actor: Actor,
  state: PippingNightState,
  radius = state.darkness.radius,
): Promise<PippingDarknessTemplateReference | null> {
  return await executeCanvasOperation(actor, {
    type: "sync-template",
    state,
    radius,
  }) as PippingDarknessTemplateReference | null;
}

export async function removePippingLivingNightTemplate(
  actor: Actor,
  state: PippingNightState,
): Promise<void> {
  await executeCanvasOperation(actor, { type: "remove-template", state });
}

export async function removePippingShadowManifestations(
  actor: Actor,
  state: PippingNightState,
  kind?: PippingShadowManifestation["kind"],
): Promise<PippingShadowManifestation[]> {
  return await executeCanvasOperation(actor, {
    type: "remove-shadows",
    state,
    kind,
  }) as PippingShadowManifestation[];
}

export async function spawnPippingShadowManifestations(
  actor: Actor,
  state: PippingNightState,
  count: number,
  kind: PippingShadowManifestation["kind"],
): Promise<PippingShadowManifestation[]> {
  return await executeCanvasOperation(actor, {
    type: "spawn-shadows",
    state,
    count,
    kind,
  }) as PippingShadowManifestation[];
}
