import { ETHERNUM } from '../config.js';
import { GYRO_PROFILE_ID, GYRO_SPINBALL_ASSET, UniqueMechanicsSystem } from '../unique/UniqueMechanics.js';

const HUD_MINIMIZED_KEY = `${ETHERNUM.MODULE_NAME}.gyroHudMinimized`;
const HUD_POSITION_KEY = `${ETHERNUM.MODULE_NAME}.gyroHudPosition`;

function escapeHTML(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] ?? char));
}

function getSelectedActor(): Actor | null {
  return canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
}

function canViewActor(actor: Actor): boolean {
  return Boolean(game.user?.isGM || (actor as Actor & { isOwner?: boolean }).isOwner);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class UniqueMechanicsHud {
  private static root: HTMLElement | null = null;
  private static currentActorId: string | null = null;
  private static renderQueued = false;

  static initialize(): void {
    Hooks.on("controlToken", () => this.queueRender());
    Hooks.on("updateActor", (actor: Actor) => {
      if (!this.currentActorId || actor.id === this.currentActorId) this.queueRender();
    });
    Hooks.on("canvasReady", () => this.queueRender());
    Hooks.on("updateToken", () => this.queueRender());
    Hooks.on("createToken", () => this.queueRender());
    Hooks.on("deleteToken", () => this.queueRender());
    this.queueRender();
  }

  static queueRender(): void {
    if (this.renderQueued) return;
    this.renderQueued = true;
    window.setTimeout(() => {
      this.renderQueued = false;
      this.render();
    }, 50);
  }

  private static ensureRoot(): HTMLElement {
    if (this.root?.isConnected) return this.root;
    this.root = document.createElement("aside");
    this.root.className = "ethernum-gyro-hud";
    document.body.appendChild(this.root);
    return this.root;
  }

  private static isMinimized(): boolean {
    return localStorage.getItem(HUD_MINIMIZED_KEY) === "true";
  }

  private static setMinimized(minimized: boolean): void {
    localStorage.setItem(HUD_MINIMIZED_KEY, String(minimized));
    this.render();
  }

  private static getPosition(): { left: number; top: number } | null {
    try {
      const parsed = JSON.parse(localStorage.getItem(HUD_POSITION_KEY) ?? "null") as { left?: number; top?: number } | null;
      if (typeof parsed?.left === "number" && typeof parsed.top === "number") {
        return parsed as { left: number; top: number };
      }
    } catch { /* no-op */ }
    return null;
  }

  private static setPosition(left: number, top: number): void {
    localStorage.setItem(HUD_POSITION_KEY, JSON.stringify({ left, top }));
  }

  private static applyPosition(root: HTMLElement): void {
    const position = this.getPosition();
    if (!position) {
      root.style.left = "";
      root.style.top = "";
      root.style.right = "";
      root.style.bottom = "";
      return;
    }
    root.style.left = `${clamp(position.left, 8, window.innerWidth - 72)}px`;
    root.style.top = `${clamp(position.top, 8, window.innerHeight - 72)}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
  }

  private static activateDrag(root: HTMLElement): void {
    const handles = root.querySelectorAll<HTMLElement>('.ethernum-gyro-hud-header, .ethernum-gyro-hud-ball');
    handles.forEach(handle => {
      handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const startX = event.clientX;
        const startY = event.clientY;
        const rect = root.getBoundingClientRect();
        let moved = false;

        const onMove = (moveEvent: PointerEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
          const left = clamp(rect.left + dx, 8, window.innerWidth - root.offsetWidth - 8);
          const top = clamp(rect.top + dy, 8, window.innerHeight - root.offsetHeight - 8);
          root.style.left = `${left}px`;
          root.style.top = `${top}px`;
          root.style.right = "auto";
          root.style.bottom = "auto";
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          const nextRect = root.getBoundingClientRect();
          this.setPosition(nextRect.left, nextRect.top);
          if (moved) root.dataset.dragged = "true";
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
    });
  }

  private static render(): void {
    const actor = getSelectedActor();
    if (!actor || (actor.type as string) !== "character" || !canViewActor(actor)) {
      this.root?.remove();
      this.root = null;
      this.currentActorId = null;
      return;
    }

    const uniqueState = UniqueMechanicsSystem.getState(actor);
    if (uniqueState.activeProfile !== GYRO_PROFILE_ID) {
      this.root?.remove();
      this.root = null;
      this.currentActorId = null;
      return;
    }

    this.currentActorId = actor.id ?? null;
    const data = UniqueMechanicsSystem.buildSheetData(actor, game.user?.isGM ?? false) as {
      gyro: {
        state: { currentSP: number; activeDeviation?: string };
        maxSP: number;
        spinPercent: number;
        rank: { id: string; name: string; control: string; text: string };
        controlBonus: number;
        actorLevel: number;
      };
    };
    const gyro = data.gyro;
    const minimized = this.isMinimized();
    const root = this.ensureRoot();
    root.className = `ethernum-gyro-hud gyro-rank-${escapeHTML(gyro.rank.id)}${minimized ? " minimized" : ""}`;
    this.applyPosition(root);

    if (minimized) {
      root.innerHTML = `
        <button type="button" class="ethernum-gyro-hud-ball ethernum-gyro-hud-toggle" title="${escapeHTML(game.i18n!.localize("ETHERNUM.Unique.Gyro.ExpandHud"))}">
          <img src="${GYRO_SPINBALL_ASSET}" alt="" />
          <span>${gyro.state.currentSP}<small>/${gyro.maxSP}</small></span>
        </button>
      `;
    } else {
      root.innerHTML = `
        <header class="ethernum-gyro-hud-header">
          <div>
            <strong>Gyro Zeppeli</strong>
            <span>${escapeHTML(gyro.rank.name)}</span>
          </div>
          <div class="ethernum-gyro-hud-actions">
            <button type="button" class="ethernum-gyro-hud-status" title="${escapeHTML(game.i18n!.localize("ETHERNUM.Unique.Gyro.Status"))}">
              <i class="fas fa-eye"></i>
            </button>
            <button type="button" class="ethernum-gyro-hud-animation" title="${escapeHTML(game.i18n!.localize("ETHERNUM.Unique.Gyro.PlayAnimation"))}">
              <i class="fas fa-magic"></i>
            </button>
            <button type="button" class="ethernum-gyro-hud-toggle" title="${escapeHTML(game.i18n!.localize("ETHERNUM.Unique.Gyro.MinimizeHud"))}">
              <i class="fas fa-minus"></i>
            </button>
          </div>
        </header>
        <div class="ethernum-gyro-hud-body">
          <div class="ethernum-gyro-hud-orb" style="--spin-percent: ${gyro.spinPercent}%">
            <img src="${GYRO_SPINBALL_ASSET}" alt="" />
            <span>${gyro.state.currentSP}<small>/${gyro.maxSP}</small></span>
          </div>
          <div class="ethernum-gyro-hud-info">
            <span>${escapeHTML(game.i18n!.localize("ETHERNUM.Unique.Gyro.Level"))} ${gyro.actorLevel}</span>
            <span>${escapeHTML(game.i18n!.localize("ETHERNUM.Unique.Gyro.ControlBonus"))} +${gyro.controlBonus}</span>
            <strong>${escapeHTML(gyro.rank.control)}</strong>
            <p>${escapeHTML(gyro.rank.text)}</p>
          </div>
        </div>
        ${gyro.state.activeDeviation ? `
          <div class="ethernum-gyro-hud-deviation">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${escapeHTML(gyro.state.activeDeviation)}</span>
            <button type="button" class="ethernum-gyro-hud-clear">${escapeHTML(game.i18n!.localize("ETHERNUM.Unique.Gyro.ClearDeviation"))}</button>
          </div>
        ` : ""}
      `;
    }

    root.querySelectorAll('.ethernum-gyro-hud-toggle').forEach(button => {
      button.addEventListener('click', () => {
        if (root.dataset.dragged === "true") {
          root.dataset.dragged = "false";
          return;
        }
        this.setMinimized(!this.isMinimized());
      });
    });
    root.querySelector('.ethernum-gyro-hud-status')?.addEventListener('click', () => {
      void UniqueMechanicsSystem.showGyroStatus(actor);
    });
    root.querySelector('.ethernum-gyro-hud-animation')?.addEventListener('click', () => {
      void UniqueMechanicsSystem.playGyroSpinAnimation(actor, "status");
    });
    root.querySelector('.ethernum-gyro-hud-clear')?.addEventListener('click', () => {
      void UniqueMechanicsSystem.clearGyroDeviation(actor).then(() => this.queueRender());
    });
    this.activateDrag(root);
  }
}
