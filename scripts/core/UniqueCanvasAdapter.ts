import { ETHERNUM } from "../config.js";
import { AutomationAuthority } from "./AutomationAuthority.js";
import {
  getAuthorityApprovalTimeoutMs,
  getEthernumAuthorityBridge,
  initializeEthernumAuthorityBridge,
} from "./EthernumAuthority.js";

export type UniqueCanvasOperation =
  | {
    type: "upsert-arkius-aura";
    sceneId: string;
    sourceTokenId: string;
    templateId?: string;
    radius: number;
  }
  | {
    type: "remove-arkius-aura";
    sceneId: string;
    templateId?: string;
  }
  | {
    type: "create-charles-net";
    sceneId: string;
    sourceTokenId: string;
    radius: number;
    overloaded: boolean;
  }
  | {
    type: "remove-charles-net";
    sceneId: string;
    templateId?: string;
  }
  | {
    type: "create-arkius-solar";
    sceneId: string;
    sourceTokenId: string;
    templateType: "circle" | "cone" | "ray";
    distance: number;
    angle?: number;
    direction: number;
    fillColor: string;
  };

export interface UniqueCanvasResult {
  templateId?: string;
  templateUuid?: string;
  sceneId: string;
  x?: number;
  y?: number;
  distance?: number;
  direction?: number;
  width?: number;
}

interface UniqueCanvasRequest {
  type: "unique-canvas-request";
  requestId: string;
  requesterId: string;
  sourceActorUuid: string;
  operation: UniqueCanvasOperation;
}

interface UniqueCanvasResponse {
  type: "unique-canvas-response";
  requestId: string;
  requesterId: string;
  result?: UniqueCanvasResult | null;
  error?: string;
}

type UniqueCanvasSocketMessage = UniqueCanvasRequest | UniqueCanvasResponse;

interface UniqueCanvasAuthorityPayload {
  sourceActorUuid: string;
  operation: UniqueCanvasOperation;
}

interface TokenDocumentLike {
  id?: string;
  actorId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface TemplateDocumentLike {
  id?: string;
  uuid?: string;
  x?: number;
  y?: number;
  distance?: number;
  direction?: number;
  width?: number;
  update?: (data: Record<string, unknown>, operation?: Record<string, unknown>) => Promise<unknown>;
  getFlag?: (scope: string, key: string) => unknown;
}

interface SceneLike {
  id?: string;
  grid?: { size?: number };
  tokens?: { get?: (id: string) => TokenDocumentLike | undefined };
  templates?: Iterable<TemplateDocumentLike> & {
    contents?: TemplateDocumentLike[];
    get?: (id: string) => TemplateDocumentLike | undefined;
  };
  createEmbeddedDocuments?: (embeddedName: string, data: Record<string, unknown>[]) => Promise<unknown[]>;
  deleteEmbeddedDocuments?: (embeddedName: string, ids: string[]) => Promise<unknown>;
}

const SOCKET_CHANNEL = `module.${ETHERNUM.MODULE_NAME}`;
const REQUEST_TIMEOUT_MS = 12_000;
const ARKIUS_PROFILE_ID = "arkius-jacker";
const CHARLES_PROFILE_ID = "charles";
const ARKIUS_AURA_SLUG = "arkius-aura-cinetica";
const ARKIUS_SOLAR_SLUG = "arkius-exaurir-o-sol";
const CHARLES_NET_SLUG = "charles-rede-de-amortecimento";
const pendingRequests = new Map<string, {
  resolve: (result: UniqueCanvasResult | null) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();
let socketInitialized = false;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getActiveProfile(actor: Actor): string {
  return String(record(actor.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics")).activeProfile ?? "");
}

function expectedProfile(operation: UniqueCanvasOperation): string {
  return operation.type.includes("charles") ? CHARLES_PROFILE_ID : ARKIUS_PROFILE_ID;
}

export function validateUniqueCanvasOperation(
  activeProfile: string,
  operation: UniqueCanvasOperation,
): void {
  if (activeProfile !== expectedProfile(operation)) {
    throw new Error("A operação de canvas não pertence à mecânica ativa do personagem.");
  }
  if (!operation.sceneId) throw new Error("A operação de canvas não possui uma cena válida.");
  if ("sourceTokenId" in operation && !operation.sourceTokenId) {
    throw new Error("A operação de canvas não possui um token de origem válido.");
  }
  if (operation.type === "upsert-arkius-aura") {
    if (!Number.isFinite(operation.radius) || operation.radius < 5 || operation.radius > 60) {
      throw new Error("O raio da Aura Cinética está fora dos limites permitidos.");
    }
  }
  if (operation.type === "create-charles-net") {
    const expectedRadius = operation.overloaded ? 15 : 10;
    if (operation.radius !== expectedRadius) {
      throw new Error("O raio da Rede de Amortecimento não corresponde ao modo escolhido.");
    }
  }
  if (operation.type === "create-arkius-solar") {
    if (!(["circle", "cone", "ray"] as string[]).includes(operation.templateType)) {
      throw new Error("O formato de Exaurir o Sol não é válido.");
    }
    if (!Number.isFinite(operation.distance) || operation.distance < 5 || operation.distance > 90) {
      throw new Error("A distância de Exaurir o Sol está fora dos limites permitidos.");
    }
    if (!Number.isFinite(operation.direction) || operation.direction < -360 || operation.direction > 360) {
      throw new Error("A direção de Exaurir o Sol não é válida.");
    }
    if (operation.templateType === "cone" && operation.angle !== 90) {
      throw new Error("O cone de Exaurir o Sol precisa usar 90 graus.");
    }
    if (!/^#[0-9a-f]{6}$/i.test(operation.fillColor)) {
      throw new Error("A cor do template de Exaurir o Sol não é válida.");
    }
  }
}

function getScene(sceneId: string): SceneLike | null {
  if (canvas?.scene?.id === sceneId) return canvas.scene as unknown as SceneLike;
  return (game.scenes?.get(sceneId) as unknown as SceneLike | undefined) ?? null;
}

function templatesOf(scene: SceneLike): TemplateDocumentLike[] {
  if (Array.isArray(scene.templates?.contents)) return scene.templates.contents;
  return Array.from(scene.templates ?? []);
}

function actorKey(actor: Actor): string {
  return String((actor as Actor & { uuid?: string }).uuid ?? actor.id ?? "");
}

function findManagedTemplate(
  scene: SceneLike,
  actor: Actor,
  slug: string,
  templateId?: string,
): TemplateDocumentLike | undefined {
  const managed = templatesOf(scene).filter(template => (
    template.getFlag?.(ETHERNUM.MODULE_NAME, "uniqueTemplate") === slug
      && template.getFlag?.(ETHERNUM.MODULE_NAME, "actorKey") === actorKey(actor)
  ));
  return managed.find(template => Boolean(templateId && template.id === templateId)) ?? managed[0];
}

function tokenCenter(scene: SceneLike, sourceTokenId: string, actor: Actor): { x: number; y: number } {
  const token = scene.tokens?.get?.(sourceTokenId);
  if (!token || token.actorId !== actor.id) {
    throw new Error("O token de origem não pertence ao personagem solicitante.");
  }
  const x = Number(token.x);
  const y = Number(token.y);
  const width = Number(token.width ?? 1);
  const height = Number(token.height ?? 1);
  const gridSize = Math.max(1, Number(scene.grid?.size ?? 100));
  if (![x, y, width, height].every(Number.isFinite)) {
    throw new Error("O token de origem possui coordenadas inválidas.");
  }
  return {
    x: x + (Math.max(0.01, width) * gridSize) / 2,
    y: y + (Math.max(0.01, height) * gridSize) / 2,
  };
}

function resultFromTemplate(sceneId: string, template: TemplateDocumentLike | undefined): UniqueCanvasResult {
  return {
    sceneId,
    templateId: template?.id,
    templateUuid: template?.uuid,
    x: template?.x,
    y: template?.y,
    distance: template?.distance,
    direction: template?.direction,
    width: template?.width,
  };
}

async function removeManagedTemplate(
  scene: SceneLike,
  actor: Actor,
  slug: string,
  templateId?: string,
): Promise<UniqueCanvasResult> {
  void templateId;
  const ids = templatesOf(scene)
    .filter(template => {
      const managed = template.getFlag?.(ETHERNUM.MODULE_NAME, "uniqueTemplate") === slug
        && template.getFlag?.(ETHERNUM.MODULE_NAME, "actorKey") === actorKey(actor);
      return managed;
    })
    .map(template => template.id)
    .filter((id): id is string => Boolean(id));
  if (ids.length > 0) await scene.deleteEmbeddedDocuments?.("MeasuredTemplate", ids);
  return { sceneId: String(scene.id ?? "") };
}

async function createTemplate(
  scene: SceneLike,
  data: Record<string, unknown>,
): Promise<TemplateDocumentLike | undefined> {
  if (!scene.createEmbeddedDocuments) throw new Error("A cena não permite criar templates.");
  const created = await scene.createEmbeddedDocuments("MeasuredTemplate", [data]);
  return Array.isArray(created) ? created[0] as TemplateDocumentLike | undefined : undefined;
}

async function executeLocally(
  actor: Actor,
  operation: UniqueCanvasOperation,
  requesterId: string,
): Promise<UniqueCanvasResult | null> {
  validateUniqueCanvasOperation(getActiveProfile(actor), operation);
  const scene = getScene(operation.sceneId);
  if (!scene) throw new Error("A cena solicitada não está disponível.");

  if (operation.type === "remove-arkius-aura") {
    return removeManagedTemplate(scene, actor, ARKIUS_AURA_SLUG, operation.templateId);
  }
  if (operation.type === "remove-charles-net") {
    return removeManagedTemplate(scene, actor, CHARLES_NET_SLUG, operation.templateId);
  }

  const center = tokenCenter(scene, operation.sourceTokenId, actor);
  if (operation.type === "upsert-arkius-aura") {
    const existing = findManagedTemplate(scene, actor, ARKIUS_AURA_SLUG, operation.templateId);
    if (existing?.update) {
      await existing.update({ x: center.x, y: center.y, distance: operation.radius }, { render: false });
      return resultFromTemplate(operation.sceneId, existing);
    }
    const created = await createTemplate(scene, {
      t: "circle",
      user: requesterId,
      x: center.x,
      y: center.y,
      distance: operation.radius,
      direction: 0,
      fillColor: "#ff6a1f",
      flags: {
        [ETHERNUM.MODULE_NAME]: {
          uniqueTemplate: ARKIUS_AURA_SLUG,
          actorKey: actorKey(actor),
        },
      },
    });
    return resultFromTemplate(operation.sceneId, created);
  }

  if (operation.type === "create-charles-net") {
    await removeManagedTemplate(scene, actor, CHARLES_NET_SLUG);
    const created = await createTemplate(scene, {
      t: "circle",
      user: requesterId,
      x: center.x,
      y: center.y,
      distance: operation.radius,
      direction: 0,
      fillColor: operation.overloaded ? "#ff6b1a" : "#e0a428",
      flags: {
        [ETHERNUM.MODULE_NAME]: {
          uniqueTemplate: CHARLES_NET_SLUG,
          actorKey: actorKey(actor),
          overloaded: operation.overloaded,
        },
      },
    });
    return resultFromTemplate(operation.sceneId, created);
  }

  const templateData: Record<string, unknown> = {
    t: operation.templateType,
    user: requesterId,
    x: center.x,
    y: center.y,
    distance: operation.distance,
    direction: operation.direction,
    fillColor: operation.fillColor,
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        uniqueTemplate: ARKIUS_SOLAR_SLUG,
        actorKey: actorKey(actor),
      },
    },
  };
  if (operation.templateType === "cone") templateData.angle = operation.angle ?? 90;
  if (operation.templateType === "ray") templateData.width = 5;
  const created = await createTemplate(scene, templateData);
  return resultFromTemplate(operation.sceneId, created);
}

async function resolveActor(uuid: string): Promise<Actor | null> {
  if (!uuid || typeof fromUuid !== "function") return null;
  const document = await (fromUuid as unknown as (value: string) => Promise<unknown>)(uuid);
  return document instanceof Actor ? document : null;
}

async function requesterOwnsActor(request: UniqueCanvasRequest): Promise<boolean> {
  const requester = game.users?.get(request.requesterId);
  if (!requester) return false;
  if (requester.isGM) return true;
  const actor = await resolveActor(request.sourceActorUuid);
  return Boolean(actor?.testUserPermission(requester as User, "OWNER"));
}

async function handleRequest(request: UniqueCanvasRequest): Promise<void> {
  if (!AutomationAuthority.isPrimaryGM()) return;
  let response: UniqueCanvasResponse;
  try {
    if (!await requesterOwnsActor(request)) throw new Error("O jogador não controla o personagem solicitante.");
    const actor = await resolveActor(request.sourceActorUuid);
    if (!actor) throw new Error("O personagem solicitante não foi encontrado.");
    response = {
      type: "unique-canvas-response",
      requestId: request.requestId,
      requesterId: request.requesterId,
      result: await executeLocally(actor, request.operation, request.requesterId),
    };
  } catch (error) {
    response = {
      type: "unique-canvas-response",
      requestId: request.requestId,
      requesterId: request.requesterId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  (game.socket as unknown as {
    emit?: (channel: string, message: UniqueCanvasSocketMessage) => void;
  } | undefined)?.emit?.(SOCKET_CHANNEL, response);
}

function handleResponse(response: UniqueCanvasResponse): void {
  if (response.requesterId !== game.user?.id) return;
  const pending = pendingRequests.get(response.requestId);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingRequests.delete(response.requestId);
  if (response.error) pending.reject(new Error(response.error));
  else pending.resolve(response.result ?? null);
}

export function initializeUniqueCanvasSocket(): void {
  if (socketInitialized) return;
  socketInitialized = true;
  const bridge = initializeEthernumAuthorityBridge();
  bridge.registerHandler<UniqueCanvasAuthorityPayload, UniqueCanvasResult | null>(
    "unique-canvas",
    {
      validate: async ({ request }) => {
        const payload = request.payload;
        const adapterRequest: UniqueCanvasRequest = {
          type: "unique-canvas-request",
          requestId: request.requestId,
          requesterId: request.requesterId,
          sourceActorUuid: payload.sourceActorUuid,
          operation: payload.operation,
        };
        if (!await requesterOwnsActor(adapterRequest)) {
          throw new Error("O jogador não controla o personagem solicitante.");
        }
        const actor = await resolveActor(payload.sourceActorUuid);
        if (!actor) throw new Error("O personagem solicitante não foi encontrado.");
        validateUniqueCanvasOperation(getActiveProfile(actor), payload.operation);
        return { payload };
      },
      execute: async ({ request }) => {
        const actor = await resolveActor(request.payload.sourceActorUuid);
        if (!actor) throw new Error("O personagem solicitante não foi encontrado.");
        return executeLocally(actor, request.payload.operation, request.requesterId);
      },
    },
  );
}

export async function executeUniqueCanvasOperation(
  actor: Actor,
  operation: UniqueCanvasOperation,
): Promise<UniqueCanvasResult | null> {
  validateUniqueCanvasOperation(getActiveProfile(actor), operation);
  const requesterId = game.user?.id;
  if (!requesterId) throw new Error("Não há um usuário ativo para executar a operação de canvas.");
  initializeUniqueCanvasSocket();
  const bridge = getEthernumAuthorityBridge();
  if (!bridge.getPrimaryGM()) {
    return executeLocally(actor, operation, requesterId);
  }

  const payload: UniqueCanvasAuthorityPayload = {
    sourceActorUuid: actor.uuid,
    operation,
  };
  return bridge.request<UniqueCanvasAuthorityPayload, UniqueCanvasResult | null>({
    handlerId: "unique-canvas",
    category: "canvas",
    profileId: getActiveProfile(actor),
    actionId: operation.type,
    sourceActorUuid: actor.uuid,
    summary: operation.type,
    details: operation.sceneId,
    payload,
    approvalTtlMs: getAuthorityApprovalTimeoutMs(),
  });
}
