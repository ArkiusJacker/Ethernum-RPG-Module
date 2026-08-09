import type { CharacterSheetMotionMode } from "./CharacterSheetMotionService.js";

export type CharacterSheetFeedbackKind =
  | "roll"
  | "damage"
  | "healing"
  | "resource-spend"
  | "resource-recover";

export interface CharacterSheetFeedbackTarget {
  action?: string;
  itemId?: string;
  entryId?: string;
  resource?: string;
}

interface CharacterSheetFeedbackRequest {
  kind: CharacterSheetFeedbackKind;
  target?: CharacterSheetFeedbackTarget;
}

function escapeAttribute(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function buildCharacterSheetFeedbackSelector(target: CharacterSheetFeedbackTarget = {}): string | null {
  const attributes = [
    target.action ? `[data-action="${escapeAttribute(target.action)}"]` : "",
    target.itemId ? `[data-item-id="${escapeAttribute(target.itemId)}"]` : "",
    target.entryId ? `[data-entry-id="${escapeAttribute(target.entryId)}"]` : "",
    target.resource ? `[data-resource="${escapeAttribute(target.resource)}"]` : "",
  ].filter(Boolean);
  return attributes.length > 0 ? attributes.join("") : null;
}

export function characterSheetFeedbackDuration(
  kind: CharacterSheetFeedbackKind,
  motion: CharacterSheetMotionMode,
): number {
  if (motion === "off") return 0;
  const full = kind === "healing" ? 360 : kind === "damage" ? 300 : kind === "roll" ? 240 : 300;
  return motion === "reduced" ? Math.min(140, Math.round(full * 0.4)) : full;
}

export class CharacterSheetInteractionFeedback {
  #pending: CharacterSheetFeedbackRequest | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;

  queue(kind: CharacterSheetFeedbackKind, target?: CharacterSheetFeedbackTarget): void {
    this.#pending = { kind, target };
  }

  play(
    root: HTMLElement | null,
    kind: CharacterSheetFeedbackKind,
    motion: CharacterSheetMotionMode,
    target?: CharacterSheetFeedbackTarget,
  ): void {
    if (!root || motion === "off") return;
    const selector = buildCharacterSheetFeedbackSelector(target);
    const subject = selector ? root.querySelector<HTMLElement>(selector) : null;
    const className = `ecs-feedback-${kind}`;
    root.classList.remove(
      "ecs-feedback-roll",
      "ecs-feedback-damage",
      "ecs-feedback-healing",
      "ecs-feedback-resource-spend",
      "ecs-feedback-resource-recover",
    );
    subject?.classList.remove(className);
    // Force a style flush so repeated actions replay the same short feedback.
    void root.offsetWidth;
    root.classList.add(className);
    subject?.classList.add(className);
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      root.classList.remove(className);
      subject?.classList.remove(className);
      this.#timer = null;
    }, characterSheetFeedbackDuration(kind, motion));
  }

  restore(root: HTMLElement | null, motion: CharacterSheetMotionMode): void {
    const pending = this.#pending;
    this.#pending = null;
    if (pending) this.play(root, pending.kind, motion, pending.target);
  }

  destroy(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    this.#pending = null;
  }
}
