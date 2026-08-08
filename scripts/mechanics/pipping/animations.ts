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

export interface PippingAnimationDatabaseCandidate {
  key: string;
  position: number;
  available: boolean;
}

export interface PippingAnimationDatabaseActionDiagnostic {
  actionId: PippingAnimationActionId;
  ethernum: PippingAnimationDatabaseCandidate[];
  jb2a: PippingAnimationDatabaseCandidate[];
  selectedKey: string | null;
  selectedSource: "ethernum" | "jb2a" | null;
  expectedLayer: PippingAnimationLayer;
  fallbackLayer: Extract<PippingAnimationLayer, "pixi" | "dom">;
}

export interface PippingAnimationDatabaseDiagnostic {
  generatedAt: number;
  cache: "session";
  sequencerAvailable: boolean;
  databaseAvailable: boolean;
  databaseViewerAvailable: boolean;
  jb2aAvailable: boolean;
  pixiAvailable: boolean;
  domAvailable: boolean;
  fallbackLayer: Extract<PippingAnimationLayer, "pixi" | "dom">;
  actions: PippingAnimationDatabaseActionDiagnostic[];
}

export interface PippingAnimationDatabaseEnvironment {
  sequenceConstructor?: (new (...args: unknown[]) => Record<string, unknown>) | null;
  database?: unknown;
  databaseViewerAvailable?: boolean;
  pixiAvailable?: boolean;
  domAvailable?: boolean;
}

export interface PippingAnimationDatabaseValidationOptions {
  forceRefresh?: boolean;
  environment?: PippingAnimationDatabaseEnvironment;
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

export interface PippingHoverAnimationContext {
  actionId: string;
  expression?: PippingExpression;
  sourceActorUuid: string;
  sourceTokenUuid?: string;
  cardId: string;
  cardElement?: HTMLElement | null;
  userId?: string;
  tier: number;
  intensity: number;
  mode?: PippingAnimationMode;
  speed?: PippingAnimationSpeed;
  prefersReducedMotion?: boolean;
  canvasPreview?: boolean;
  hoverDelayMs?: number;
  cooldownMs?: number;
  diagnostics?: (diagnostic: PippingAnimationDiagnostic) => void;
  environment?: Partial<PippingAnimationEnvironment>;
  databaseValidation?: PippingAnimationDatabaseValidationOptions;
}

export interface PippingHoverPreviewHandle {
  id: string;
  stop: () => Promise<void>;
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
  localOnly: boolean;
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

interface ActivePippingHoverPreview {
  id: string;
  cardKey: string;
  canvasUserKey?: string;
  context: PippingHoverAnimationContext;
  references: Set<string>;
  timer?: ReturnType<typeof globalThis.setTimeout>;
  cancelled: boolean;
  cleanups: Array<() => void | Promise<void>>;
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
  context: Pick<PippingAnimationContext, "actionId" | "diagnostics">,
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

function databaseViewerIsAvailable(): boolean {
  const root = globalThis as unknown as Record<string, unknown>;
  const sequencer = asRecord(root.Sequencer);
  if (
    sequencer?.DatabaseViewer
    || sequencer?.DatabaseViewerApp
    || root.DatabaseViewer
  ) {
    return true;
  }

  const gameObject = asRecord(root.game);
  const modules = asRecord(gameObject?.modules);
  const get = callable(modules?.get);
  if (!get) return false;
  try {
    const module = asRecord(
      get.call(gameObject?.modules, "sequencer-database-viewer")
      ?? get.call(gameObject?.modules, "sequencer"),
    );
    return Boolean(module?.active && module?.api && asRecord(module.api)?.DatabaseViewer);
  } catch {
    return false;
  }
}

function pixiFallbackIsAvailable(): boolean {
  const root = globalThis as unknown as Record<string, unknown>;
  const pixi = asRecord(root.PIXI);
  const canvasObject = asRecord(root.canvas);
  const layer = asRecord(canvasObject?.interface ?? canvasObject?.effects);
  return typeof pixi?.Graphics === "function" && Boolean(callable(layer?.addChild));
}

let animationDatabaseDiagnosticCache:
  | Promise<PippingAnimationDatabaseDiagnostic>
  | null = null;

async function validateDatabaseCandidates(
  database: unknown,
  keys: readonly string[],
): Promise<PippingAnimationDatabaseCandidate[]> {
  return Promise.all(keys.slice(0, 2).map(async (key, index) => ({
    key,
    position: index + 1,
    available: await databaseEntryExists(database, key),
  })));
}

async function buildAnimationDatabaseDiagnostic(
  environment: PippingAnimationDatabaseEnvironment,
): Promise<PippingAnimationDatabaseDiagnostic> {
  const Constructor = environment.sequenceConstructor !== undefined
    ? environment.sequenceConstructor
    : sequenceConstructor();
  const database = environment.database !== undefined
    ? environment.database
    : sequencerDatabase();
  const databaseAvailable = Boolean(database);
  const sequencerAvailable = Boolean(Constructor && databaseAvailable);
  const databaseViewerAvailable = environment.databaseViewerAvailable
    ?? databaseViewerIsAvailable();
  const pixiAvailable = environment.pixiAvailable ?? pixiFallbackIsAvailable();
  const domAvailable = environment.domAvailable
    ?? (typeof document !== "undefined" && Boolean(document.body));
  const fallbackLayer: Extract<PippingAnimationLayer, "pixi" | "dom"> =
    pixiAvailable ? "pixi" : "dom";

  const actions = await Promise.all(PIPPING_ANIMATION_ACTION_IDS.map(async actionId => {
    const definition = PIPPING_ANIMATION_DEFINITIONS[actionId];
    const ethernum = databaseAvailable
      ? await validateDatabaseCandidates(database, definition.sequencerDatabaseKeys)
      : definition.sequencerDatabaseKeys.slice(0, 2).map((key, index) => ({
        key,
        position: index + 1,
        available: false,
      }));
    const jb2a = databaseAvailable
      ? await validateDatabaseCandidates(database, definition.jb2aDatabaseKeys)
      : definition.jb2aDatabaseKeys.slice(0, 2).map((key, index) => ({
        key,
        position: index + 1,
        available: false,
      }));
    const selectedEthernum = ethernum.find(candidate => candidate.available);
    const selectedJb2a = jb2a.find(candidate => candidate.available);
    const selectedSource = selectedEthernum
      ? "ethernum" as const
      : selectedJb2a
        ? "jb2a" as const
        : null;
    const selectedKey = selectedEthernum?.key ?? selectedJb2a?.key ?? null;
    const expectedLayer: PippingAnimationLayer = selectedSource === "ethernum"
      ? "sequencer"
      : selectedSource === "jb2a"
        ? "jb2a"
        : fallbackLayer;

    return {
      actionId,
      ethernum,
      jb2a,
      selectedKey,
      selectedSource,
      expectedLayer,
      fallbackLayer,
    };
  }));

  return {
    generatedAt: Date.now(),
    cache: "session",
    sequencerAvailable,
    databaseAvailable,
    databaseViewerAvailable,
    jb2aAvailable: actions.some(action => action.jb2a.some(candidate => candidate.available)),
    pixiAvailable,
    domAvailable,
    fallbackLayer,
    actions,
  };
}

export async function validatePippingAnimationDatabase(
  options: PippingAnimationDatabaseValidationOptions = {},
): Promise<PippingAnimationDatabaseDiagnostic> {
  if (options.forceRefresh) animationDatabaseDiagnosticCache = null;
  animationDatabaseDiagnosticCache ??= buildAnimationDatabaseDiagnostic(
    options.environment ?? {},
  );
  return animationDatabaseDiagnosticCache;
}

export function clearPippingAnimationDatabaseValidationCache(): void {
  animationDatabaseDiagnosticCache = null;
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
  keysAlreadyValidated = false,
): Promise<PippingAnimationDriverResult> {
  const Constructor = sequenceConstructor();
  const database = sequencerDatabase();
  if (!Constructor || !database) return { played: false };

  let selectedKey: string | null = keysAlreadyValidated ? keys[0] ?? null : null;
  if (!keysAlreadyValidated) {
    for (const key of keys) {
      if (await databaseEntryExists(database, key)) {
        selectedKey = key;
        break;
      }
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

  let effectCount = 0;
  for (const destination of destinations) {
    const created = asRecord(createEffect.call(sequence));
    if (!created) continue;
    let effect = callChain(created, "file", selectedKey);
    if (request.localOnly) {
      const locally = callable(effect.locally);
      if (!locally) continue;
      effect = asRecord(locally.call(effect)) ?? effect;
    }
    const attachTo = request.persistentId && request.source
      ? callable(effect.attachTo)
      : null;
    if (attachTo) {
      effect = asRecord(attachTo.call(effect, request.source, {
        bindVisibility: true,
        followRotation: false,
      })) ?? effect;
    } else {
      effect = callChain(effect, "atLocation", origin);
    }
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
      effect = callChain(effect, "belowTokens");
      effect = callChain(effect, "name", request.persistentId);
      callChain(effect, "persist", true);
    }
    effectCount += 1;
  }

  if (effectCount === 0) return { played: false };
  await play.call(sequence);
  let cleaned = false;
  const cleanup = request.persistentId
    ? async (): Promise<void> => {
      if (cleaned) return;
      cleaned = true;
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
  const diagnostic = await validatePippingAnimationDatabase();
  const action = diagnostic.actions.find(candidate => candidate.actionId === request.definition.id);
  if (action?.selectedSource !== "ethernum" || !action.selectedKey) {
    return { played: false };
  }
  return playSequencerKeys(request, [action.selectedKey], true);
}

async function defaultJb2aDriver(
  request: PippingAnimationRequest,
): Promise<PippingAnimationDriverResult> {
  const diagnostic = await validatePippingAnimationDatabase();
  const action = diagnostic.actions.find(candidate => candidate.actionId === request.definition.id);
  if (action?.selectedSource !== "jb2a" || !action.selectedKey) {
    return { played: false };
  }
  return playSequencerKeys(request, [action.selectedKey], true);
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

function trackVisualPosition(update: () => void): () => void {
  const root = globalThis as unknown as Record<string, unknown>;
  const canvasObject = asRecord(root.canvas);
  const ticker = asRecord(asRecord(canvasObject?.app)?.ticker);
  const addTicker = callable(ticker?.add);
  const removeTicker = callable(ticker?.remove);
  let active = true;

  if (addTicker && removeTicker) {
    addTicker.call(ticker, update);
    return (): void => {
      if (!active) return;
      active = false;
      removeTicker.call(ticker, update);
    };
  }

  const requestFrame = callable(root.requestAnimationFrame);
  const cancelFrame = callable(root.cancelAnimationFrame);
  if (!requestFrame) return () => undefined;

  let frameId: unknown;
  const frame = (): void => {
    if (!active) return;
    update();
    frameId = requestFrame.call(root, frame);
  };
  frameId = requestFrame.call(root, frame);

  return (): void => {
    if (!active) return;
    active = false;
    if (cancelFrame && frameId !== undefined) cancelFrame.call(root, frameId);
  };
}

function addPixiVisual(
  graphics: Record<string, unknown>,
  request: PippingAnimationRequest,
  canvasObject: Record<string, unknown>,
): boolean {
  const source = asRecord(request.source);
  const sourceParent = asRecord(source?.parent);
  const addChildAt = callable(sourceParent?.addChildAt);
  const getChildIndex = callable(sourceParent?.getChildIndex);

  if (request.persistentId && source && sourceParent && addChildAt && getChildIndex) {
    try {
      const sourceIndex = Number(getChildIndex.call(sourceParent, source));
      if (Number.isFinite(sourceIndex) && sourceIndex >= 0) {
        addChildAt.call(sourceParent, graphics, sourceIndex);
        return true;
      }
    } catch {
      // Fall through to a canvas layer when the token container is rebuilding.
    }
  }

  const preferredLayers = request.persistentId
    ? [canvasObject.background, canvasObject.primary, canvasObject.effects, canvasObject.interface]
    : [canvasObject.interface, canvasObject.effects, canvasObject.primary];
  const layer = preferredLayers.map(asRecord).find(candidate => callable(candidate?.addChild));
  const addChild = callable(layer?.addChild);
  if (!layer || !addChild) return false;
  addChild.call(layer, graphics);
  return true;
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
  const Graphics = pixi?.Graphics;
  if (typeof Graphics !== "function" || !canvasObject) {
    return { played: false };
  }

  const anchor = request.source ?? request.template ?? request.targets[0];
  const origin = objectPoint(anchor);
  if (!origin) return { played: false };
  const graphics = new (Graphics as new () => Record<string, unknown>)();
  const redraw = (): void => {
    const currentOrigin = objectPoint(anchor);
    if (!currentOrigin) return;
    callable(graphics.clear)?.call(graphics);
    const targets = request.targets
      .map(objectPoint)
      .filter((point): point is Point => Boolean(point));
    drawPixiVisual(graphics, request, currentOrigin, targets);
  };
  redraw();
  if (!addPixiVisual(graphics, request, canvasObject)) {
    destroyDisplayObject(graphics);
    return { played: false };
  }

  const stopTracking = request.persistentId && request.source
    ? trackVisualPosition(redraw)
    : () => undefined;
  let cleaned = false;
  const cleanup = async (): Promise<void> => {
    if (cleaned) return;
    cleaned = true;
    stopTracking();
    destroyDisplayObject(graphics);
  };

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
  const anchor = request.source ?? request.template ?? request.targets[0];
  const worldPoint = objectPoint(anchor);
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

  const element = document.createElement("div");
  const size = 54 + request.context.tier * 8;
  element.className = request.definition.fallbackClass;
  element.dataset.pippingAnimationId = request.persistentId ?? request.context.actionId;
  Object.assign(element.style, {
    position: "fixed",
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `${-size / 2}px`,
    marginTop: `${-size / 2}px`,
    pointerEvents: "none",
    zIndex: request.persistentId ? "30" : "70",
    border: `2px solid ${request.definition.colors[2]}`,
    borderRadius: request.definition.visual === "fracture" ? "18% 62% 24% 55%" : "50%",
    boxShadow: `0 0 ${request.mode === "reduced" ? 12 : 30}px ${request.definition.colors[1]}`,
    background: request.definition.asset?.path
      ? `center / contain no-repeat url("${request.definition.asset.path}")`
      : `radial-gradient(circle, ${request.definition.colors[2]}55, ${request.definition.colors[0]}11 70%)`,
    opacity: request.persistentId
      ? request.mode === "reduced" ? "0.38" : "0.52"
      : request.mode === "reduced" ? "0.62" : "0.86",
  });
  if (request.persistentId) {
    const centerCutout = "radial-gradient(circle, transparent 0 36%, #000 52%)";
    element.style.maskImage = centerCutout;
    element.style.webkitMaskImage = centerCutout;
  }
  const updatePosition = (): void => {
    const currentPoint = objectPoint(anchor);
    if (!currentPoint) return;
    const screenPoint = pointToScreen(currentPoint);
    element.style.left = `${screenPoint.x}px`;
    element.style.top = `${screenPoint.y}px`;
  };
  updatePosition();
  document.body.append(element);
  const stopTracking = request.persistentId
    ? trackVisualPosition(updatePosition)
    : () => undefined;

  const animation = callable(element.animate);
  let animationHandle: Record<string, unknown> | null = null;
  if (animation) {
    const fullMotion = request.mode === "full";
    animationHandle = asRecord(animation.call(
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
    ));
  }

  let cleaned = false;
  const cleanup = async (): Promise<void> => {
    if (cleaned) return;
    cleaned = true;
    stopTracking();
    callable(animationHandle?.cancel)?.call(animationHandle);
    element.remove();
  };
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

function hoverReferences(context: PippingHoverAnimationContext): Set<string> {
  return new Set([
    context.sourceActorUuid,
    context.sourceTokenUuid,
  ].filter((value): value is string => Boolean(value)));
}

function currentUserId(): string {
  const root = globalThis as unknown as Record<string, unknown>;
  const gameObject = asRecord(root.game);
  const id = asRecord(gameObject?.user)?.id;
  return typeof id === "string" && id.length > 0 ? id : "local-user";
}

function hoverCardKey(context: PippingHoverAnimationContext): string {
  return `${context.userId ?? currentUserId()}:${context.cardId}`;
}

function createHoverCardCleanup(
  context: PippingHoverAnimationContext,
  definition: PippingAnimationDefinition,
  mode: Exclude<PippingAnimationMode, "off">,
): () => void {
  const element = context.cardElement ?? domActionAnchor(context.actionId);
  if (!element) return () => undefined;

  const previous = {
    outline: element.style.outline,
    boxShadow: element.style.boxShadow,
    filter: element.style.filter,
    transition: element.style.transition,
    previewId: element.getAttribute("data-pipping-hover-preview"),
  };
  element.setAttribute("data-pipping-hover-preview", context.cardId);
  element.style.outline = `2px solid ${definition.colors[2]}`;
  element.style.boxShadow = mode === "reduced"
    ? `0 0 10px ${definition.colors[1]}`
    : `0 0 22px ${definition.colors[1]}, inset 0 0 12px ${definition.colors[0]}`;
  element.style.filter = mode === "reduced" ? "brightness(1.03)" : "brightness(1.08)";
  element.style.transition = "outline-color 120ms ease, box-shadow 120ms ease, filter 120ms ease";

  return () => {
    restoreStyle(element, "outline", previous.outline);
    restoreStyle(element, "boxShadow", previous.boxShadow);
    restoreStyle(element, "filter", previous.filter);
    restoreStyle(element, "transition", previous.transition);
    if (previous.previewId === null) {
      element.removeAttribute("data-pipping-hover-preview");
    } else {
      element.setAttribute("data-pipping-hover-preview", previous.previewId);
    }
  };
}

function hoverAnimationContext(
  context: PippingHoverAnimationContext,
): PippingAnimationContext {
  return {
    actionId: context.actionId,
    expression: context.expression,
    sourceActorUuid: context.sourceActorUuid,
    sourceTokenUuid: context.sourceTokenUuid,
    targetActorUuids: [],
    targetTokenUuids: [],
    tier: context.tier,
    intensity: context.intensity,
    mode: context.mode,
    speed: context.speed,
    prefersReducedMotion: context.prefersReducedMotion,
    diagnostics: context.diagnostics,
    environment: context.environment,
  };
}

export class PippingAnimationService {
  static readonly #active = new Map<string, ActivePippingAnimation>();
  static readonly #hoverActive = new Map<string, ActivePippingHoverPreview>();
  static readonly #hoverByCard = new Map<string, string>();
  static readonly #hoverCanvasByUser = new Map<string, string>();
  static readonly #hoverCooldownUntil = new Map<string, number>();
  static readonly #hookIds = new Map<string, number>();
  static #hoverSequence = 0;

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

  static async startHoverPreview(
    context: PippingHoverAnimationContext,
  ): Promise<PippingHoverPreviewHandle> {
    const id = [
      "pipping-hover",
      context.userId ?? currentUserId(),
      context.cardId,
      ++this.#hoverSequence,
    ].join(":");
    const handle: PippingHoverPreviewHandle = {
      id,
      stop: async (): Promise<void> => this.stopHoverPreview(id),
    };
    const definition = getPippingAnimationDefinition(context.actionId);
    if (!definition) {
      safeDiagnostic(context, { status: "skipped" });
      return handle;
    }

    const environment = environmentFor(hoverAnimationContext(context));
    const mode = effectiveMode(hoverAnimationContext(context), environment);
    if (mode === "off") {
      safeDiagnostic(context, { status: "skipped" });
      return handle;
    }
    this.#ensureCleanupHooks();

    const cardKey = hoverCardKey(context);
    const existingCardPreview = this.#hoverByCard.get(cardKey);
    if (existingCardPreview) await this.stopHoverPreview(existingCardPreview);

    const canvasUserKey = context.canvasPreview
      ? context.userId ?? currentUserId()
      : undefined;
    const existingCanvasPreview = canvasUserKey
      ? this.#hoverCanvasByUser.get(canvasUserKey)
      : undefined;
    if (existingCanvasPreview && existingCanvasPreview !== existingCardPreview) {
      await this.stopHoverPreview(existingCanvasPreview);
    }

    const resolvedDefinition = context.expression && context.expression !== definition.expression
      ? {
        ...definition,
        expression: context.expression,
        colors: EXPRESSION_COLORS[context.expression],
        asset: animationAsset(definition.id, context.expression, definition.fallbackClass),
      }
      : definition;
    const active: ActivePippingHoverPreview = {
      id,
      cardKey,
      canvasUserKey,
      context,
      references: hoverReferences(context),
      cancelled: false,
      cleanups: [createHoverCardCleanup(context, resolvedDefinition, mode)],
    };
    this.#hoverActive.set(id, active);
    this.#hoverByCard.set(cardKey, id);
    if (canvasUserKey) this.#hoverCanvasByUser.set(canvasUserKey, id);

    if (canvasUserKey) {
      const configuredDelay = clamp(context.hoverDelayMs ?? 450, 400, 500);
      const cooldownRemaining = Math.max(
        0,
        (this.#hoverCooldownUntil.get(cardKey) ?? 0) - Date.now(),
      );
      active.timer = globalThis.setTimeout(() => {
        active.timer = undefined;
        void this.#startHoverCanvas(id);
      }, Math.max(configuredDelay, cooldownRemaining));
    }

    return handle;
  }

  static async stopHoverPreview(previewId: string): Promise<void> {
    const active = this.#hoverActive.get(previewId);
    if (!active) return;
    active.cancelled = true;
    this.#hoverActive.delete(previewId);
    if (active.timer !== undefined) globalThis.clearTimeout(active.timer);
    if (this.#hoverByCard.get(active.cardKey) === previewId) {
      this.#hoverByCard.delete(active.cardKey);
    }
    if (
      active.canvasUserKey
      && this.#hoverCanvasByUser.get(active.canvasUserKey) === previewId
    ) {
      this.#hoverCanvasByUser.delete(active.canvasUserKey);
    }
    const cooldownMs = clamp(active.context.cooldownMs ?? 800, 250, 5_000);
    this.#hoverCooldownUntil.set(active.cardKey, Date.now() + cooldownMs);

    for (const cleanup of [...active.cleanups].reverse()) {
      try {
        await cleanup();
      } catch {
        // Hover previews are local visuals and cleanup is always best-effort.
      }
    }
    active.cleanups.length = 0;
    safeDiagnostic(active.context, { status: "cleaned" });
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
    const hoverMatches = [...this.#hoverActive.values()]
      .filter(active => active.references.has(uuid))
      .map(active => active.id);
    await Promise.all([
      ...matches.map(id => this.stopPersistent(id)),
      ...hoverMatches.map(id => this.stopHoverPreview(id)),
    ]);
  }

  static async cleanupAll(): Promise<void> {
    await Promise.all([
      ...[...this.#active.keys()].map(id => this.stopPersistent(id)),
      ...[...this.#hoverActive.keys()].map(id => this.stopHoverPreview(id)),
    ]);
  }

  static async stopAllHoverPreviews(): Promise<void> {
    await Promise.all(
      [...this.#hoverActive.keys()].map(id => this.stopHoverPreview(id)),
    );
  }

  static activePersistentIds(): string[] {
    return [...this.#active.keys()];
  }

  static activeHoverPreviewIds(): string[] {
    return [...this.#hoverActive.keys()];
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
    this.#hoverByCard.clear();
    this.#hoverCanvasByUser.clear();
    this.#hoverCooldownUntil.clear();
  }

  static async #startHoverCanvas(previewId: string): Promise<void> {
    const active = this.#hoverActive.get(previewId);
    if (!active || active.cancelled || !active.canvasUserKey) return;
    const context = active.context;
    const definition = getPippingAnimationDefinition(context.actionId);
    if (!definition) return;

    const animationContext = hoverAnimationContext(context);
    const environment = environmentFor(animationContext);
    const mode = effectiveMode(animationContext, environment);
    if (mode === "off") return;
    const source = await resolveAnimationObject(context.sourceTokenUuid, environment.resolveUuid);
    if (!source || active.cancelled || this.#hoverActive.get(previewId) !== active) return;

    const database = await validatePippingAnimationDatabase(context.databaseValidation);
    if (active.cancelled || this.#hoverActive.get(previewId) !== active) return;
    const databaseAction = database.actions.find(candidate => candidate.actionId === definition.id);
    const resolvedDefinition = context.expression && context.expression !== definition.expression
      ? {
        ...definition,
        expression: context.expression,
        colors: EXPRESSION_COLORS[context.expression],
        asset: animationAsset(definition.id, context.expression, definition.fallbackClass),
      }
      : definition;
    const speed = context.speed ?? "normal";
    const request: PippingAnimationRequest = {
      context: animationContext,
      definition: resolvedDefinition,
      mode,
      speed,
      durationMs: animationDuration(mode, speed, context.intensity),
      persistentId: previewId,
      localOnly: true,
      source,
      targets: [],
      template: null,
    };

    const externalLayers: Array<[PippingAnimationLayer, PippingAnimationDriver]> =
      databaseAction?.selectedSource === "ethernum"
        ? [["sequencer", environment.sequencer]]
        : databaseAction?.selectedSource === "jb2a"
          ? [["jb2a", environment.jb2a]]
          : [];
    const layers: Array<[PippingAnimationLayer, PippingAnimationDriver]> = [
      ...externalLayers,
      ["pixi", environment.pixi],
      ["dom", environment.dom],
    ];

    for (const [layer, driver] of layers) {
      try {
        const result = await normalizeDriverResult(await driver(request));
        if (!result.played || !result.cleanup) continue;
        const current = this.#hoverActive.get(previewId);
        if (!current || current.cancelled) {
          await result.cleanup();
          return;
        }
        current.cleanups.push(result.cleanup);
        safeDiagnostic(context, { layer, status: "played" });
        return;
      } catch (error) {
        safeDiagnostic(context, { layer, status: "failed", error });
      }
    }
    safeDiagnostic(context, { status: "skipped" });
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
      localOnly: false,
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
    register("closeActorSheet", (application: unknown) => {
      const record = asRecord(application);
      const document = asRecord(record?.document ?? record?.actor);
      const uuid = document?.uuid;
      if (typeof uuid === "string") void this.cleanupForDocument(uuid);
    });
    for (const event of ["deleteActor", "deleteToken", "deleteTile", "deleteMeasuredTemplate"]) {
      register(event, (document: unknown) => {
        const uuid = asRecord(document)?.uuid;
        if (typeof uuid === "string") void this.cleanupForDocument(uuid);
      });
    }
  }
}
