import { PIPPING_SHADOW_ASSETS } from "./assets.js";
import type { PippingExpression } from "./state.js";

const MODULE_ID = "ethernum-rpg-module";

export const PIPPING_ANIMATION_ACTION_IDS = [
  "animated-shadow",
  "mirrored-shadows",
  "dark-whisper",
  "void-echoes",
  "living-night-song",
  "ruin-note",
  "restoring-pulse",
  "broken-meter",
  "shadow-form",
  "void-touch",
  "black-order-mantle",
  "shadow-resonance",
  "night-emanation",
  "requiem-persist",
  "shadow-king",
  "ending-chorus",
  "gentle-night-liturgy",
  "abyss-voice",
  "beyond-form",
  "dead-sun-epitaph",
  "night-refuses-end",
  "forbidden-performance",
] as const;

export type PippingAnimationActionId = typeof PIPPING_ANIMATION_ACTION_IDS[number];
export type PippingAnimationMode = "full" | "reduced" | "off";
export type PippingAnimationSpeed = "fast" | "normal" | "cinematic";
export type PippingAnimationLayer = "sequencer" | "jb2a" | "pixi" | "dom";
export type PippingAnimationVisual =
  | "manifestation"
  | "duplicates"
  | "wave"
  | "return"
  | "aura"
  | "projectile"
  | "threads"
  | "fracture"
  | "teleport"
  | "tendril"
  | "shield"
  | "tether"
  | "burst"
  | "chorus"
  | "domain"
  | "cone"
  | "circle"
  | "glyphs"
  | "transformation"
  | "singularity"
  | "rescue"
  | "stage";

export interface PippingAnimationAsset {
  id: string;
  actionId: PippingAnimationActionId;
  expression?: PippingExpression;
  path?: string;
  sequencerDatabaseKey?: string;
  fallbackClass: string;
}

export interface PippingAnimationDefinition {
  id: PippingAnimationActionId;
  visual: PippingAnimationVisual;
  expression?: PippingExpression;
  colors: readonly [string, string, string];
  persistent: boolean;
  fallbackClass: string;
  sequencerDatabaseKeys: readonly string[];
  jb2aDatabaseKeys: readonly string[];
  asset?: PippingAnimationAsset;
}

export interface PippingAnimationDiagnostic {
  actionId: string;
  layer?: PippingAnimationLayer;
  status: "played" | "skipped" | "failed" | "cleaned";
  error?: unknown;
}

export interface PippingAnimationContext {
  actionId: string;
  expression?: PippingExpression;
  sourceActorUuid: string;
  sourceTokenUuid?: string;
  targetActorUuids: string[];
  targetTokenUuids: string[];
  templateUuid?: string;
  tier: number;
  intensity: number;
  damageType?: string;
  mode?: PippingAnimationMode;
  speed?: PippingAnimationSpeed;
  prefersReducedMotion?: boolean;
  persistentId?: string;
  diagnostics?: (diagnostic: PippingAnimationDiagnostic) => void;
  environment?: Partial<PippingAnimationEnvironment>;
}

export interface PippingAnimationDriverResult {
  played: boolean;
  cleanup?: () => void | Promise<void>;
}

export interface PippingAnimationRequest {
  context: PippingAnimationContext;
  definition: PippingAnimationDefinition;
  mode: Exclude<PippingAnimationMode, "off">;
  speed: PippingAnimationSpeed;
  durationMs: number;
  persistentId?: string;
  source: unknown | null;
  targets: unknown[];
  template: unknown | null;
}

export type PippingAnimationDriver = (
  request: PippingAnimationRequest,
) => Promise<PippingAnimationDriverResult | boolean | void>;

export interface PippingAnimationEnvironment {
  prefersReducedMotion: () => boolean;
  resolveUuid: (uuid: string) => Promise<unknown | null>;
  sequencer: PippingAnimationDriver;
  jb2a: PippingAnimationDriver;
  pixi: PippingAnimationDriver;
  dom: PippingAnimationDriver;
}

interface ActivePippingAnimation {
  id: string;
  references: Set<string>;
  cleanup: () => Promise<void>;
}

const EXPRESSION_COLORS: Readonly<Record<PippingExpression | "neutral", readonly [
  string,
  string,
  string,
]>> = {
  destruction: ["#09070d", "#8f1d45", "#d14761"],
  order: ["#08090d", "#8d82a8", "#d6d1df"],
  chaos: ["#08060d", "#8f2ee6", "#e44ecf"],
  neutral: ["#08070d", "#6e3aa8", "#b572e4"],
};

const JB2A_KEYS: Readonly<Record<PippingAnimationVisual, readonly string[]>> = {
  manifestation: ["jb2a.smoke.puff.centered.black", "jb2a.darkness.black"],
  duplicates: ["jb2a.misty_step.02.purple", "jb2a.smoke.puff.centered.black"],
  wave: ["jb2a.music_note.purple", "jb2a.template_circle.out_pulse.01.purple"],
  return: ["jb2a.energy_strands.range.standard.purple", "jb2a.magic_signs.rune.evocation.intro.purple"],
  aura: ["jb2a.template_circle.out_pulse.01.purple", "jb2a.darkness.black"],
  projectile: ["jb2a.magic_missile.purple", "jb2a.energy_beam.normal.purple"],
  threads: ["jb2a.energy_strands.range.standard.purple", "jb2a.healing_generic.400px.purple"],
  fracture: ["jb2a.shatter.purple", "jb2a.impact.004.purple"],
  teleport: ["jb2a.misty_step.02.purple", "jb2a.portals.vertical.vortex.purple"],
  tendril: ["jb2a.energy_strands.range.standard.dark_purple", "jb2a.liquid.splash_side.black"],
  shield: ["jb2a.shield_themed.above.purple", "jb2a.magic_signs.circle.02.abjuration.intro.purple"],
  tether: ["jb2a.energy_beam.normal.purple", "jb2a.chain_lightning.primary.purple"],
  burst: ["jb2a.explosion.04.purple", "jb2a.template_circle.out_pulse.01.purple"],
  chorus: ["jb2a.music_note.purple", "jb2a.template_circle.out_pulse.01.purple"],
  domain: ["jb2a.magic_signs.circle.02.conjuration.loop.purple", "jb2a.darkness.black"],
  cone: ["jb2a.template_cone.purple", "jb2a.thunderwave.centered.purple"],
  circle: ["jb2a.magic_signs.circle.02.abjuration.intro.purple", "jb2a.healing_generic.400px.purple"],
  glyphs: ["jb2a.magic_signs.rune.enchantment.intro.purple", "jb2a.markers.fear.purple"],
  transformation: ["jb2a.misty_step.02.purple", "jb2a.darkness.black"],
  singularity: ["jb2a.explosion.08.purple", "jb2a.darkness.black"],
  rescue: ["jb2a.healing_generic.400px.purple", "jb2a.energy_strands.range.standard.purple"],
  stage: ["jb2a.magic_signs.circle.02.enchantment.loop.purple", "jb2a.template_circle.out_pulse.01.purple"],
};

function animationAsset(
  actionId: PippingAnimationActionId,
  expression: PippingExpression | undefined,
  fallbackClass: string,
): PippingAnimationAsset | undefined {
  if (!expression && actionId !== "animated-shadow" && actionId !== "mirrored-shadows") {
    return undefined;
  }
  const selectedExpression = expression ?? "chaos";
  return {
    id: `pipping-${actionId}-${selectedExpression}`,
    actionId,
    expression,
    path: PIPPING_SHADOW_ASSETS[selectedExpression],
    sequencerDatabaseKey: `ethernum.pipping.${actionId}.${selectedExpression}`,
    fallbackClass,
  };
}

function defineAnimation(
  id: PippingAnimationActionId,
  visual: PippingAnimationVisual,
  options: {
    expression?: PippingExpression;
    persistent?: boolean;
  } = {},
): PippingAnimationDefinition {
  const fallbackClass = `ethernum-pipping-animation-${id}`;
  const expression = options.expression;
  return {
    id,
    visual,
    expression,
    colors: EXPRESSION_COLORS[expression ?? "neutral"],
    persistent: options.persistent ?? false,
    fallbackClass,
    sequencerDatabaseKeys: [
      `ethernum.pipping.${id}.${expression ?? "neutral"}`,
      `ethernum.pipping.${id}`,
    ],
    jb2aDatabaseKeys: JB2A_KEYS[visual],
    asset: animationAsset(id, expression, fallbackClass),
  };
}

export const PIPPING_ANIMATION_DEFINITIONS: Readonly<
  Record<PippingAnimationActionId, PippingAnimationDefinition>
> = {
  "animated-shadow": defineAnimation("animated-shadow", "manifestation", { persistent: true }),
  "mirrored-shadows": defineAnimation("mirrored-shadows", "duplicates", { persistent: true }),
  "dark-whisper": defineAnimation("dark-whisper", "wave"),
  "void-echoes": defineAnimation("void-echoes", "return"),
  "living-night-song": defineAnimation("living-night-song", "aura", { persistent: true }),
  "ruin-note": defineAnimation("ruin-note", "projectile", { expression: "destruction" }),
  "restoring-pulse": defineAnimation("restoring-pulse", "threads", { expression: "order" }),
  "broken-meter": defineAnimation("broken-meter", "fracture", { expression: "chaos" }),
  "shadow-form": defineAnimation("shadow-form", "teleport"),
  "void-touch": defineAnimation("void-touch", "tendril", { expression: "destruction" }),
  "black-order-mantle": defineAnimation("black-order-mantle", "shield", { expression: "order" }),
  "shadow-resonance": defineAnimation("shadow-resonance", "tether", { expression: "chaos" }),
  "night-emanation": defineAnimation("night-emanation", "burst", { expression: "destruction" }),
  "requiem-persist": defineAnimation("requiem-persist", "chorus", { expression: "order" }),
  "shadow-king": defineAnimation("shadow-king", "domain", {
    expression: "chaos",
    persistent: true,
  }),
  "ending-chorus": defineAnimation("ending-chorus", "cone", { expression: "destruction" }),
  "gentle-night-liturgy": defineAnimation("gentle-night-liturgy", "circle", { expression: "order" }),
  "abyss-voice": defineAnimation("abyss-voice", "glyphs", { expression: "chaos" }),
  "beyond-form": defineAnimation("beyond-form", "transformation", { persistent: true }),
  "dead-sun-epitaph": defineAnimation("dead-sun-epitaph", "singularity", {
    expression: "destruction",
    persistent: true,
  }),
  "night-refuses-end": defineAnimation("night-refuses-end", "rescue", { expression: "order" }),
  "forbidden-performance": defineAnimation("forbidden-performance", "stage", {
    expression: "chaos",
  }),
};

export function getPippingAnimationDefinition(
  actionId: string,
): PippingAnimationDefinition | null {
  return actionId in PIPPING_ANIMATION_DEFINITIONS
    ? PIPPING_ANIMATION_DEFINITIONS[actionId as PippingAnimationActionId]
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function callable(value: unknown): ((...args: unknown[]) => unknown) | null {
  return typeof value === "function" ? value as (...args: unknown[]) => unknown : null;
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}

function safeDiagnostic(
  context: PippingAnimationContext,
  diagnostic: Omit<PippingAnimationDiagnostic, "actionId">,
): void {
  const value = { actionId: context.actionId, ...diagnostic };
  try {
    context.diagnostics?.(value);
  } catch {
    // Diagnostics are never part of the mechanical result.
  }
  if (!context.diagnostics && diagnostic.status === "failed") {
    console.debug(`${MODULE_ID} | Pipping animation fallback`, value);
  }
}

function defaultPrefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

async function defaultResolveUuid(uuid: string): Promise<unknown | null> {
  const resolver = callable((globalThis as unknown as Record<string, unknown>).fromUuid);
  if (!resolver) return null;
  try {
    return await resolver(uuid) ?? null;
  } catch {
    return null;
  }
}

function currentUserIsGm(): boolean {
  const gameObject = asRecord((globalThis as unknown as Record<string, unknown>).game);
  return Boolean(asRecord(gameObject?.user)?.isGM);
}

function visibleAnimationObject(documentOrObject: unknown): unknown | null {
  const documentRecord = asRecord(documentOrObject);
  if (!documentRecord) return null;
  const object = asRecord(documentRecord.object) ?? documentRecord;
  if (object.visible === false) return null;
  if (documentRecord.hidden === true && !currentUserIsGm()) return null;
  return object;
}

async function resolveAnimationObject(
  uuid: string | undefined,
  resolver: PippingAnimationEnvironment["resolveUuid"],
): Promise<unknown | null> {
  if (!uuid) return null;
  try {
    return visibleAnimationObject(await resolver(uuid));
  } catch {
    return null;
  }
}

async function databaseEntryExists(database: unknown, key: string): Promise<boolean> {
  const record = asRecord(database);
  const entryExists = callable(record?.entryExists);
  const getEntry = callable(record?.getEntry);
  try {
    if (entryExists) return Boolean(await entryExists.call(database, key));
    if (getEntry) return Boolean(await getEntry.call(database, key));
  } catch {
    return false;
  }
  return false;
}

function sequenceConstructor(): (new (...args: unknown[]) => Record<string, unknown>) | null {
  const root = globalThis as unknown as Record<string, unknown>;
  const sequencer = asRecord(root.Sequencer);
  const candidate = root.Sequence ?? sequencer?.Sequence;
  return typeof candidate === "function"
    ? candidate as new (...args: unknown[]) => Record<string, unknown>
    : null;
}

function sequencerDatabase(): unknown {
  const root = globalThis as unknown as Record<string, unknown>;
  return asRecord(root.Sequencer)?.Database ?? null;
}

function sequenceEffectManager(): Record<string, unknown> | null {
  const root = globalThis as unknown as Record<string, unknown>;
  return asRecord(asRecord(root.Sequencer)?.EffectManager);
}

function callChain(
  receiver: Record<string, unknown>,
  method: string,
  ...args: unknown[]
): Record<string, unknown> {
  const fn = callable(receiver[method]);
  if (!fn) return receiver;
  const result = fn.apply(receiver, args);
  return asRecord(result) ?? receiver;
}

function hasTravel(definition: PippingAnimationDefinition): boolean {
  return [
    "wave",
    "return",
    "projectile",
    "threads",
    "teleport",
    "tendril",
    "tether",
    "rescue",
  ].includes(definition.visual);
}

async function playSequencerKeys(
  request: PippingAnimationRequest,
  keys: readonly string[],
): Promise<PippingAnimationDriverResult> {
  const Constructor = sequenceConstructor();
  const database = sequencerDatabase();
  if (!Constructor || !database) return { played: false };

  let selectedKey: string | null = null;
  for (const key of keys) {
    if (await databaseEntryExists(database, key)) {
      selectedKey = key;
      break;
    }
  }
  if (!selectedKey) return { played: false };

  const origin = request.source ?? request.template ?? request.targets[0] ?? null;
  if (!origin) return { played: false };
  const destinations = request.targets.length > 0 ? request.targets : [origin];
  const sequence = new Constructor({ moduleName: MODULE_ID, softFail: true });
  const createEffect = callable(sequence.effect);
  const play = callable(sequence.play);
  if (!createEffect || !play) return { played: false };

  for (const destination of destinations) {
    const created = asRecord(createEffect.call(sequence));
    if (!created) continue;
    let effect = callChain(created, "file", selectedKey);
    effect = callChain(effect, "atLocation", origin);
    if (destination !== origin && hasTravel(request.definition)) {
      effect = callChain(effect, "stretchTo", destination);
    }
    effect = callChain(effect, "duration", request.durationMs);
    effect = callChain(effect, "opacity", request.mode === "reduced" ? 0.45 : 0.8);
    effect = callChain(
      effect,
      "scale",
      clamp(0.65 + request.context.intensity * 0.12, 0.65, 1.4),
    );
    if (request.persistentId) {
      effect = callChain(effect, "name", request.persistentId);
      callChain(effect, "persist", true);
    }
  }

  await play.call(sequence);
  const cleanup = request.persistentId
    ? async (): Promise<void> => {
      const manager = sequenceEffectManager();
      const endEffects = callable(manager?.endEffects);
      if (endEffects) await endEffects.call(manager, { name: request.persistentId });
    }
    : undefined;
  return { played: true, cleanup };
}

async function defaultSequencerDriver(
  request: PippingAnimationRequest,
): Promise<PippingAnimationDriverResult> {
  return playSequencerKeys(request, request.definition.sequencerDatabaseKeys);
}

async function defaultJb2aDriver(
  request: PippingAnimationRequest,
): Promise<PippingAnimationDriverResult> {
  return playSequencerKeys(request, request.definition.jb2aDatabaseKeys);
}

interface Point {
  x: number;
  y: number;
}

function objectPoint(value: unknown): Point | null {
  const record = asRecord(value);
  const center = asRecord(record?.center);
  const x = Number(center?.x ?? record?.x);
  const y = Number(center?.y ?? record?.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function colorNumber(color: string): number {
  return Number.parseInt(color.replace("#", ""), 16);
}

function drawPixiVisual(
  graphics: Record<string, unknown>,
  request: PippingAnimationRequest,
  origin: Point,
  targets: Point[],
): void {
  const [primary, secondary, accent] = request.definition.colors;
  const intensity = clamp(request.context.intensity, 0.5, 5);
  const radius = 24 + request.context.tier * 7 + intensity * 4;
  const lineStyle = callable(graphics.lineStyle);
  const drawCircle = callable(graphics.drawCircle);
  const drawRect = callable(graphics.drawRoundedRect) ?? callable(graphics.drawRect);
  const moveTo = callable(graphics.moveTo);
  const lineTo = callable(graphics.lineTo);
  const beginFill = callable(graphics.beginFill);
  const endFill = callable(graphics.endFill);

  lineStyle?.call(graphics, request.mode === "reduced" ? 2 : 4, colorNumber(accent), 0.85);
  beginFill?.call(graphics, colorNumber(primary), 0.18);

  if (request.definition.visual === "duplicates") {
    const count = Math.max(2, Math.min(4, Math.round(request.context.intensity)));
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      drawCircle?.call(
        graphics,
        origin.x + Math.cos(angle) * radius,
        origin.y + Math.sin(angle) * radius,
        radius * 0.35,
      );
    }
  } else if (request.definition.visual === "shield") {
    drawRect?.call(graphics, origin.x - radius, origin.y - radius, radius * 2, radius * 2, 12);
  } else {
    drawCircle?.call(graphics, origin.x, origin.y, radius);
    if (["aura", "domain", "circle", "stage", "singularity"].includes(request.definition.visual)) {
      lineStyle?.call(graphics, 2, colorNumber(secondary), 0.7);
      drawCircle?.call(graphics, origin.x, origin.y, radius * 1.45);
    }
  }
  endFill?.call(graphics);

  for (const target of targets) {
    lineStyle?.call(graphics, request.mode === "reduced" ? 2 : 3, colorNumber(secondary), 0.8);
    moveTo?.call(graphics, origin.x, origin.y);
    lineTo?.call(graphics, target.x, target.y);
    drawCircle?.call(graphics, target.x, target.y, Math.max(8, radius * 0.3));
  }
}

function destroyDisplayObject(value: unknown): void {
  const record = asRecord(value);
  const parent = asRecord(record?.parent);
  try {
    callable(parent?.removeChild)?.call(parent, value);
  } catch {
    // The canvas may already be tearing down.
  }
  try {
    callable(record?.destroy)?.call(record, { children: true });
  } catch {
    // Cleanup is best-effort.
  }
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>(resolve => globalThis.setTimeout(resolve, milliseconds));
}

async function defaultPixiDriver(
  request: PippingAnimationRequest,
): Promise<PippingAnimationDriverResult> {
  const root = globalThis as unknown as Record<string, unknown>;
  const pixi = asRecord(root.PIXI);
  const canvasObject = asRecord(root.canvas);
  const layer = asRecord(canvasObject?.interface) ?? asRecord(canvasObject?.effects);
  const Graphics = pixi?.Graphics;
  if (typeof Graphics !== "function" || !layer || !callable(layer.addChild)) {
    return { played: false };
  }

  const origin = objectPoint(request.source ?? request.template ?? request.targets[0]);
  if (!origin) return { played: false };
  const targets = request.targets.map(objectPoint).filter((point): point is Point => Boolean(point));
  const graphics = new (Graphics as new () => Record<string, unknown>)();
  drawPixiVisual(graphics, request, origin, targets);
  layer.addChild && callable(layer.addChild)?.call(layer, graphics);

  const cleanup = async (): Promise<void> => destroyDisplayObject(graphics);
  if (request.persistentId) return { played: true, cleanup };
  await delay(request.durationMs);
  await cleanup();
  return { played: true };
}

function pointToScreen(point: Point): Point {
  const root = globalThis as unknown as Record<string, unknown>;
  const canvasObject = asRecord(root.canvas);
  const stage = asRecord(canvasObject?.stage);
  const transform = asRecord(stage?.worldTransform);
  const apply = callable(transform?.apply);
  const transformed = apply ? asRecord(apply.call(transform, point)) : point;
  const view = canvasObject?.app && asRecord(canvasObject.app)
    ? asRecord(asRecord(canvasObject.app)?.view)
    : null;
  const rect = callable(view?.getBoundingClientRect)?.call(view) as DOMRect | undefined;
  return {
    x: Number(transformed?.x ?? point.x) + Number(rect?.left ?? 0),
    y: Number(transformed?.y ?? point.y) + Number(rect?.top ?? 0),
  };
}

function domActionAnchor(actionId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(
    `[data-pipping-action="${actionId}"], [data-action-id="${actionId}"]`,
  );
}

function restoreStyle(element: HTMLElement, property: keyof CSSStyleDeclaration, value: string): void {
  try {
    (element.style[property] as string) = value;
  } catch {
    // The element may already be detached.
  }
}

async function defaultDomDriver(
  request: PippingAnimationRequest,
): Promise<PippingAnimationDriverResult> {
  if (typeof document === "undefined" || !document.body) return { played: false };
  const worldPoint = objectPoint(request.source ?? request.template ?? request.targets[0]);
  const actionAnchor = domActionAnchor(request.context.actionId);

  if (!worldPoint && actionAnchor) {
    const previousOutline = actionAnchor.style.outline;
    const previousShadow = actionAnchor.style.boxShadow;
    actionAnchor.style.outline = `2px solid ${request.definition.colors[2]}`;
    actionAnchor.style.boxShadow = `0 0 18px ${request.definition.colors[1]}`;
    const cleanup = async (): Promise<void> => {
      restoreStyle(actionAnchor, "outline", previousOutline);
      restoreStyle(actionAnchor, "boxShadow", previousShadow);
    };
    if (request.persistentId) return { played: true, cleanup };
    await delay(request.durationMs);
    await cleanup();
    return { played: true };
  }
  if (!worldPoint) return { played: false };

  const point = pointToScreen(worldPoint);
  const element = document.createElement("div");
  const size = 54 + request.context.tier * 8;
  element.className = request.definition.fallbackClass;
  element.dataset.pippingAnimationId = request.persistentId ?? request.context.actionId;
  Object.assign(element.style, {
    position: "fixed",
    left: `${point.x}px`,
    top: `${point.y}px`,
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `${-size / 2}px`,
    marginTop: `${-size / 2}px`,
    pointerEvents: "none",
    zIndex: "70",
    border: `2px solid ${request.definition.colors[2]}`,
    borderRadius: request.definition.visual === "fracture" ? "18% 62% 24% 55%" : "50%",
    boxShadow: `0 0 ${request.mode === "reduced" ? 12 : 30}px ${request.definition.colors[1]}`,
    background: request.definition.asset?.path
      ? `center / contain no-repeat url("${request.definition.asset.path}")`
      : `radial-gradient(circle, ${request.definition.colors[2]}55, ${request.definition.colors[0]}11 70%)`,
    opacity: request.mode === "reduced" ? "0.62" : "0.86",
  });
  document.body.append(element);

  const animation = callable(element.animate);
  if (animation) {
    const fullMotion = request.mode === "full";
    animation.call(
      element,
      [
        { opacity: 0, transform: "scale(0.35) rotate(0deg)" },
        { opacity: request.mode === "reduced" ? 0.62 : 0.9, transform: "scale(1) rotate(0deg)" },
        {
          opacity: request.persistentId ? 0.72 : 0,
          transform: fullMotion ? "scale(1.35) rotate(18deg)" : "scale(1.05) rotate(0deg)",
        },
      ],
      {
        duration: request.durationMs,
        easing: "ease-out",
        fill: "forwards",
        iterations: request.persistentId && fullMotion ? Infinity : 1,
      },
    );
  }

  const cleanup = async (): Promise<void> => element.remove();
  if (request.persistentId) return { played: true, cleanup };
  await delay(request.durationMs);
  await cleanup();
  return { played: true };
}

const DEFAULT_ENVIRONMENT: PippingAnimationEnvironment = {
  prefersReducedMotion: defaultPrefersReducedMotion,
  resolveUuid: defaultResolveUuid,
  sequencer: defaultSequencerDriver,
  jb2a: defaultJb2aDriver,
  pixi: defaultPixiDriver,
  dom: defaultDomDriver,
};

function environmentFor(context: PippingAnimationContext): PippingAnimationEnvironment {
  return {
    ...DEFAULT_ENVIRONMENT,
    ...context.environment,
  };
}

function effectiveMode(
  context: PippingAnimationContext,
  environment: PippingAnimationEnvironment,
): PippingAnimationMode {
  const configured = context.mode ?? "full";
  if (configured === "off") return "off";
  const reduced = context.prefersReducedMotion ?? environment.prefersReducedMotion();
  return reduced ? "reduced" : configured;
}

function animationDuration(
  mode: Exclude<PippingAnimationMode, "off">,
  speed: PippingAnimationSpeed,
  intensity: number,
): number {
  const speedFactor: Record<PippingAnimationSpeed, number> = {
    fast: 0.7,
    normal: 1,
    cinematic: 1.45,
  };
  const motionFactor = mode === "reduced" ? 0.45 : 1;
  return Math.round(
    clamp(650 + clamp(intensity, 0, 5) * 90, 500, 1_100)
    * speedFactor[speed]
    * motionFactor,
  );
}

async function normalizeDriverResult(
  result: PippingAnimationDriverResult | boolean | void,
): Promise<PippingAnimationDriverResult> {
  if (typeof result === "boolean") return { played: result };
  return result ?? { played: false };
}

function persistentAnimationId(
  context: PippingAnimationContext,
  definition: PippingAnimationDefinition,
): string {
  return context.persistentId
    ?? [
      "pipping",
      definition.id,
      context.sourceActorUuid,
      context.templateUuid ?? context.sourceTokenUuid ?? "effect",
    ].join(":");
}

function animationReferences(context: PippingAnimationContext): Set<string> {
  return new Set([
    context.sourceActorUuid,
    context.sourceTokenUuid,
    context.templateUuid,
    ...context.targetActorUuids,
    ...context.targetTokenUuids,
  ].filter((value): value is string => Boolean(value)));
}

export class PippingAnimationService {
  static readonly #active = new Map<string, ActivePippingAnimation>();
  static readonly #hookIds = new Map<string, number>();

  static async playAction(context: PippingAnimationContext): Promise<void> {
    try {
      await this.#play(context, false);
    } catch (error) {
      safeDiagnostic(context, { status: "failed", error });
    }
  }

  static async playPersistent(context: PippingAnimationContext): Promise<void> {
    try {
      await this.#play(context, true);
    } catch (error) {
      safeDiagnostic(context, { status: "failed", error });
    }
  }

  static async stopPersistent(id: string): Promise<void> {
    const active = this.#active.get(id);
    if (!active) return;
    this.#active.delete(id);
    try {
      await active.cleanup();
    } catch {
      // A failed visual cleanup must not affect Foundry documents.
    }
  }

  static async cleanupForDocument(uuid: string): Promise<void> {
    const matches = [...this.#active.values()]
      .filter(active => active.references.has(uuid))
      .map(active => active.id);
    await Promise.all(matches.map(id => this.stopPersistent(id)));
  }

  static async cleanupAll(): Promise<void> {
    await Promise.all([...this.#active.keys()].map(id => this.stopPersistent(id)));
  }

  static activePersistentIds(): string[] {
    return [...this.#active.keys()];
  }

  static async shutdown(): Promise<void> {
    await this.cleanupAll();
    const hooks = asRecord((globalThis as unknown as Record<string, unknown>).Hooks);
    const off = callable(hooks?.off);
    if (off) {
      for (const [event, id] of this.#hookIds) {
        try {
          off.call(hooks, event, id);
        } catch {
          // Foundry may already have disposed the hook registry.
        }
      }
    }
    this.#hookIds.clear();
  }

  static async #play(context: PippingAnimationContext, persistent: boolean): Promise<void> {
    const definition = getPippingAnimationDefinition(context.actionId);
    if (!definition) {
      safeDiagnostic(context, { status: "skipped" });
      return;
    }
    const environment = environmentFor(context);
    const mode = effectiveMode(context, environment);
    if (mode === "off") {
      safeDiagnostic(context, { status: "skipped" });
      return;
    }
    this.#ensureCleanupHooks();

    const speed = context.speed ?? "normal";
    const persistentId = persistent ? persistentAnimationId(context, definition) : undefined;
    if (persistentId) await this.stopPersistent(persistentId);
    const request: PippingAnimationRequest = {
      context,
      definition: context.expression && context.expression !== definition.expression
        ? {
          ...definition,
          expression: context.expression,
          colors: EXPRESSION_COLORS[context.expression],
          asset: animationAsset(definition.id, context.expression, definition.fallbackClass),
        }
        : definition,
      mode,
      speed,
      durationMs: animationDuration(mode, speed, context.intensity),
      persistentId,
      source: await resolveAnimationObject(context.sourceTokenUuid, environment.resolveUuid),
      targets: (await Promise.all(
        context.targetTokenUuids.map(uuid => resolveAnimationObject(uuid, environment.resolveUuid)),
      )).filter((target): target is unknown => target !== null),
      template: await resolveAnimationObject(context.templateUuid, environment.resolveUuid),
    };

    const layers: Array<[PippingAnimationLayer, PippingAnimationDriver]> = [
      ["sequencer", environment.sequencer],
      ["jb2a", environment.jb2a],
      ["pixi", environment.pixi],
      ["dom", environment.dom],
    ];
    for (const [layer, driver] of layers) {
      try {
        const result = await normalizeDriverResult(await driver(request));
        if (!result.played) continue;
        if (persistentId) {
          this.#active.set(persistentId, {
            id: persistentId,
            references: animationReferences(context),
            cleanup: async (): Promise<void> => {
              try {
                await result.cleanup?.();
              } finally {
                safeDiagnostic(context, { layer, status: "cleaned" });
              }
            },
          });
        }
        safeDiagnostic(context, { layer, status: "played" });
        return;
      } catch (error) {
        safeDiagnostic(context, { layer, status: "failed", error });
      }
    }
    safeDiagnostic(context, { status: "skipped" });
  }

  static #ensureCleanupHooks(): void {
    if (this.#hookIds.size > 0) return;
    const hooks = asRecord((globalThis as unknown as Record<string, unknown>).Hooks);
    const on = callable(hooks?.on);
    if (!on) return;

    const register = (event: string, callback: (...args: unknown[]) => void): void => {
      try {
        const id = Number(on.call(hooks, event, callback));
        if (Number.isFinite(id)) this.#hookIds.set(event, id);
      } catch {
        // Visual lifecycle hooks are optional.
      }
    };
    register("canvasTearDown", () => {
      void this.cleanupAll();
    });
    for (const event of ["deleteActor", "deleteToken", "deleteTile", "deleteMeasuredTemplate"]) {
      register(event, (document: unknown) => {
        const uuid = asRecord(document)?.uuid;
        if (typeof uuid === "string") void this.cleanupForDocument(uuid);
      });
    }
  }
}
