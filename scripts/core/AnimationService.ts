import { ETHERNUM } from "../config.js";
import { getCombatAnimationMode } from "../settings.js";
import type { CombatMomentumState, CombatVisualEvent } from "../table/CombatMomentumSystem.js";

const EVENT_TTL_MS = 15_000;
const EVENT_CACHE_LIMIT = 200;

function getActorToken(actor: Actor): Token | null {
  const controlled = canvas?.tokens?.controlled?.find(token => token.actor?.id === actor.id);
  if (controlled) return controlled;
  return actor.getActiveTokens?.()[0] ?? null;
}

function eventIcon(event: CombatVisualEvent): string {
  return event.type.startsWith("fides") ? "fa-gem" : "fa-bolt";
}

function eventClass(event: CombatVisualEvent): string {
  return event.type.replace(/[^a-z-]/g, "");
}

function tokenScreenPoint(token: Token): { left: number; top: number } | null {
  const center = (token as Token & { center?: { x: number; y: number } }).center;
  if (!center) return null;
  const stage = canvas?.stage as unknown as {
    worldTransform?: { apply?: (point: { x: number; y: number }) => { x: number; y: number } };
  };
  const transformed = stage?.worldTransform?.apply?.(center) ?? center;
  const view = (canvas?.app as unknown as { view?: HTMLCanvasElement })?.view;
  const rect = view?.getBoundingClientRect();
  return {
    left: (rect?.left ?? 0) + transformed.x,
    top: (rect?.top ?? 0) + transformed.y,
  };
}

export class AnimationService {
  private static processedEventIds = new Set<string>();

  static initialize(): void {
    Hooks.on("updateActor", (actor: Actor, changed: Record<string, unknown>) => {
      if (!JSON.stringify(changed ?? {}).includes("visualEvent")) return;
      this.playLatestCombatEvent(actor);
    });
  }

  static playLatestCombatEvent(actor: Actor): void {
    const state = actor.getFlag(ETHERNUM.MODULE_NAME, "combatMomentum") as CombatMomentumState | undefined;
    const event = state?.visualEvent;
    if (!event || !this.claim(event)) return;
    void this.play(actor, event);
  }

  private static claim(event: CombatVisualEvent): boolean {
    if (!event.id || this.processedEventIds.has(event.id)) return false;
    if (Date.now() - event.at > EVENT_TTL_MS) return false;
    this.processedEventIds.add(event.id);
    while (this.processedEventIds.size > EVENT_CACHE_LIMIT) {
      const oldest = this.processedEventIds.values().next().value as string | undefined;
      if (!oldest) break;
      this.processedEventIds.delete(oldest);
    }
    return true;
  }

  private static async play(actor: Actor, event: CombatVisualEvent): Promise<void> {
    const mode = getCombatAnimationMode();
    if (mode === "off") return;

    const trackerEntry = document.querySelector<HTMLElement>(
      `.ethernum-combat-tracker [data-actor-id="${CSS.escape(String(actor.id ?? ""))}"]`,
    ) ?? document.querySelector<HTMLElement>(".ethernum-combat-tracker");
    trackerEntry?.classList.add("ethernum-combat-event", eventClass(event));
    window.setTimeout(() => trackerEntry?.classList.remove("ethernum-combat-event", eventClass(event)), mode === "full" ? 1100 : 500);

    const token = getActorToken(actor);
    if (mode === "full" && token && await this.trySequencer(token, event)) return;
    if (token) this.playDOMTokenFallback(token, event, mode);
  }

  private static async trySequencer(token: Token, event: CombatVisualEvent): Promise<boolean> {
    const SequenceClass = (globalThis as unknown as {
      Sequence?: new () => {
        effect: () => {
          file: (path: string) => unknown;
          atLocation: (location: unknown) => unknown;
          scale: (value: number) => unknown;
          duration: (value: number) => unknown;
        };
        play: () => Promise<unknown>;
      };
    }).Sequence;
    const jb2aModule = ["jb2a_patreon", "JB2A_DnD5e", "jb2a_free"]
      .find(moduleId => game.modules?.get(moduleId)?.active);
    if (!SequenceClass || !jb2aModule) return false;

    try {
      const path = event.type.startsWith("fides")
        ? `modules/${jb2aModule}/Library/Generic/Magic_Signs/ConjurationCircleComplete_02_Regular_Yellow_800x800.webm`
        : `modules/${jb2aModule}/Library/Generic/Lightning/LightningBall_01_Regular_Blue_400x400.webm`;
      const sequence = new SequenceClass();
      const effect = sequence.effect();
      effect.file(path);
      effect.atLocation(token);
      effect.scale(Math.min(1.5, 0.7 + event.intensity * 0.1));
      effect.duration(900);
      await sequence.play();
      return true;
    } catch (error) {
      console.debug("Ethernum | Sequencer indisponível para animação de combate; usando fallback.", error);
      return false;
    }
  }

  private static playDOMTokenFallback(
    token: Token,
    event: CombatVisualEvent,
    mode: "full" | "reduced",
  ): void {
    const point = tokenScreenPoint(token);
    if (!point) return;
    const effect = document.createElement("div");
    effect.className = `ethernum-token-combat-effect ${eventClass(event)} ${mode}`;
    effect.style.left = `${point.left}px`;
    effect.style.top = `${point.top}px`;
    effect.innerHTML = `<i class="fas ${eventIcon(event)}"></i>`;
    effect.setAttribute("aria-hidden", "true");
    document.body.appendChild(effect);
    window.setTimeout(() => effect.remove(), mode === "full" ? 1000 : 450);
  }
}
