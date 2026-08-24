const MODULE_ID = "ethernum-rpg-module";

export type ChatMessageVariant = "ethernum" | "concordia" | "neutral";

export interface ChatMessagePresentationSource {
  messageFlags?: unknown;
  actorCore?: unknown;
}

const PRESENTATION_CLASS = "ethernum-chat-presentation";
const VARIANT_CLASSES = [
  "ethernum-chat-presentation--ethernum",
  "ethernum-chat-presentation--concordia",
] as const;

let initialized = false;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
}

function knownVariant(value: unknown): ChatMessageVariant | undefined {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["ethernum", "ethernum-company", "company"].includes(normalized)) return "ethernum";
  if (normalized === "concordia") return "concordia";
  if (["neutral", "pf2e", "none"].includes(normalized)) return "neutral";
  return undefined;
}

/** Normalizes public core and presentation values without consulting Foundry state. */
export function normalizeChatMessageVariant(value: unknown): ChatMessageVariant {
  return knownVariant(value) ?? "neutral";
}

/** Returns whether the message carries any Ethernum module-owned flag payload. */
export function hasEthernumMessageFlags(messageFlags: unknown): boolean {
  const flags = asRecord(messageFlags);
  return Object.prototype.hasOwnProperty.call(flags, MODULE_ID);
}

function explicitMessageVariant(messageFlags: unknown): ChatMessageVariant | undefined {
  const moduleFlags = asRecord(asRecord(messageFlags)[MODULE_ID]);
  const presentation = asRecord(moduleFlags.presentation);
  const chatPresentation = asRecord(moduleFlags.chatPresentation);
  const uniqueMechanics = asRecord(moduleFlags.uniqueMechanics);

  const candidates = [
    moduleFlags.chatVariant,
    moduleFlags.variant,
    moduleFlags.core,
    moduleFlags.activeCore,
    moduleFlags.campaignCore,
    typeof moduleFlags.presentation === "string" ? moduleFlags.presentation : undefined,
    presentation.variant,
    presentation.core,
    typeof moduleFlags.chatPresentation === "string" ? moduleFlags.chatPresentation : undefined,
    chatPresentation.variant,
    chatPresentation.core,
    uniqueMechanics.activeCore,
    uniqueMechanics.core,
  ];

  for (const candidate of candidates) {
    const variant = knownVariant(candidate);
    if (variant) return variant;
  }
  return undefined;
}

/**
 * Resolves presentation without reading content or PF2e roll data.
 * Message flags take precedence over the actor core; old module messages fall
 * back to Ethernum Company when they have no core metadata.
 */
export function resolveChatMessageVariant(source: ChatMessagePresentationSource): ChatMessageVariant {
  const explicit = explicitMessageVariant(source.messageFlags);
  if (explicit) return explicit;

  const actorVariant = knownVariant(source.actorCore);
  if (actorVariant) return actorVariant;

  return hasEthernumMessageFlags(source.messageFlags) ? "ethernum" : "neutral";
}

export function chatMessagePresentationClasses(variant: ChatMessageVariant): string[] {
  return variant === "neutral"
    ? []
    : [PRESENTATION_CLASS, `${PRESENTATION_CLASS}--${variant}`];
}

function actorCore(actor: Actor | null): unknown {
  if (!actor) return undefined;

  try {
    const mechanics = asRecord(actor.getFlag(MODULE_ID, "uniqueMechanics"));
    if (mechanics.activeCore !== undefined) return mechanics.activeCore;
  } catch {
    // A synthetic or partially initialized actor may not expose module flags yet.
  }

  const flags = asRecord((actor as Actor & { flags?: unknown }).flags);
  return asRecord(asRecord(flags[MODULE_ID]).uniqueMechanics).activeCore;
}

function messageActor(message: ChatMessage): Actor | null {
  const direct = (message as ChatMessage & { actor?: Actor | null }).actor;
  if (direct) return direct;

  const actorId = (message as ChatMessage & { speaker?: { actor?: string | null } }).speaker?.actor;
  return actorId ? (game.actors?.get(actorId) as Actor | undefined) ?? null : null;
}

function renderElement(html: JQuery<HTMLElement> | HTMLElement): HTMLElement | null {
  if (html instanceof HTMLElement) return html;
  return html.get(0) ?? null;
}

export function applyChatMessagePresentation(element: HTMLElement, variant: ChatMessageVariant): void {
  element.classList.remove(PRESENTATION_CLASS, ...VARIANT_CLASSES);
  delete element.dataset.ethernumChatVariant;

  const classes = chatMessagePresentationClasses(variant);
  if (classes.length === 0) return;
  element.classList.add(...classes);
  element.dataset.ethernumChatVariant = variant;
}

/** Registers the non-invasive chat presentation hook once per client. */
export function initChatMessagePresentation(): void {
  if (initialized) return;
  initialized = true;

  const hook = Number((game as Game & { release?: { generation?: number } }).release?.generation) >= 13
    ? "renderChatMessageHTML"
    : "renderChatMessage";
  Hooks.on(hook as "renderChatMessage", (message: ChatMessage, html: JQuery<HTMLElement> | HTMLElement) => {
    const element = renderElement(html);
    if (!element) return;

    const variant = resolveChatMessageVariant({
      messageFlags: (message as ChatMessage & { flags?: unknown }).flags,
      actorCore: actorCore(messageActor(message)),
    });
    applyChatMessagePresentation(element, variant);
  });
}
