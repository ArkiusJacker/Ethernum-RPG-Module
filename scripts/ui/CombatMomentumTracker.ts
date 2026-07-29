import { ETHERNUM } from "../config.js";
import {
  CombatMomentumSystem,
  type CombatMomentumState,
} from "../table/CombatMomentumSystem.js";
import {
  isCombatTrackerEnabled,
  isCombatTrackerOnlyInCombat,
  getCombatAnimationMode,
  shouldShowCombatTrackerStats,
} from "../settings.js";
import {
  CombatTurnTimer,
  getTimerSnapshot,
  timerNow,
} from "../combat/CombatTurnTimer.js";

const TRACKER_MINIMIZED_KEY = "combatTrackerMinimized";
const TRACKER_POSITION_KEY = "combatTrackerPosition";
const TRACKER_TAB_KEY = "combatTrackerTab";

export type TrackerTab = "player" | "gm";

export function shouldShowTimerAdministration(isGM: boolean, tab: TrackerTab): boolean {
  return isGM && tab === "gm";
}

interface TrackedActor {
  actor: Actor;
  owners: string[];
}

function storageKey(suffix: string): string {
  const worldId = String((game as unknown as { world?: { id?: string } }).world?.id ?? "world");
  const userId = String(game.user?.id ?? "user");
  return `${ETHERNUM.MODULE_NAME}.${worldId}.${userId}.${suffix}`;
}

function escapeHTML(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character] ?? character));
}

function t(key: string): string {
  return game.i18n!.localize(`ETHERNUM.CombatTracker.${key}`);
}

function tf(key: string, data: Record<string, string | number>): string {
  return game.i18n!.format(`ETHERNUM.CombatTracker.${key}`, data);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isOwned(actor: Actor): boolean {
  return Boolean(game.user?.isGM || (actor as Actor & { isOwner?: boolean }).isOwner);
}

function getAssignedCharacter(user: User): Actor | null {
  return (user as User & { character?: Actor | null }).character ?? null;
}

function getOwnerNames(actor: Actor): string[] {
  const names = Array.from(game.users ?? []).filter(user => {
    if (user.isGM) return false;
    if (getAssignedCharacter(user)?.id === actor.id) return true;
    const permissions = actor as Actor & {
      testUserPermission?: (target: User, level: string | number) => boolean;
    };
    return permissions.testUserPermission?.(user, "OWNER") ?? false;
  }).map(user => String(user.name ?? t("Player")));
  return Array.from(new Set(names));
}

function getTrackedActors(): TrackedActor[] {
  return Array.from(game.actors ?? [])
    .filter(actor => (actor.type as string) === "character")
    .map(actor => ({ actor, owners: getOwnerNames(actor) }))
    .filter(entry => entry.owners.length > 0)
    .sort((left, right) => String(left.actor.name).localeCompare(String(right.actor.name), "pt-BR"));
}

function getPlayerActor(): Actor | null {
  const controlled = canvas?.tokens?.controlled?.[0]?.actor;
  if (controlled && (controlled.type as string) === "character" && isOwned(controlled)) return controlled;
  const assigned = game.user ? getAssignedCharacter(game.user) : null;
  if (assigned && (assigned.type as string) === "character" && isOwned(assigned)) return assigned;
  return getTrackedActors().find(entry => isOwned(entry.actor))?.actor ?? null;
}

function fidesMarkerHTML(state: CombatMomentumState): string {
  return Array.from({ length: 3 }, (_, index) => `
    <span class="ethernum-fides-marker${index < state.fides.markers ? " active" : ""}" aria-hidden="true">
      <i class="fas fa-gem"></i>
    </span>`).join("");
}

function fidesChargeHTML(state: CombatMomentumState): string {
  return Array.from({ length: 3 }, (_, index) => `
    <span class="ethernum-fides-charge${index < state.fides.charges ? " active" : ""}" aria-hidden="true"></span>`).join("");
}

function statsHTML(state: CombatMomentumState): string {
  if (!shouldShowCombatTrackerStats()) return "";
  return `
    <div class="ethernum-combat-stats" aria-label="${t("Stats.Results")}">
      <span title="${t("Stats.Failures")}"><small>F</small><strong>${state.stats.failures}</strong></span>
      <span title="${t("Stats.CriticalFailures")}"><small>CF</small><strong>${state.stats.criticalFailures}</strong></span>
      <span title="${t("Stats.Successes")}"><small>S</small><strong>${state.stats.successes}</strong></span>
      <span title="${t("Stats.CriticalSuccesses")}"><small>CS</small><strong>${state.stats.criticalSuccesses}</strong></span>
      <span title="${t("Stats.Natural1")}"><small>1</small><strong>${state.stats.natural1s}</strong></span>
      <span title="${t("Stats.Natural20")}"><small>20</small><strong>${state.stats.natural20s}</strong></span>
    </div>`;
}

function currentCombatantName(): string {
  const combatant = (game.combat as (Combat & {
    combatant?: { name?: string; actor?: Actor };
  }) | null)?.combatant;
  return String(combatant?.name ?? combatant?.actor?.name ?? game.i18n!.localize("ETHERNUM.CombatTimer.NoCombatant"));
}

function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function timerSeverity(remaining: number, duration: number): "normal" | "warning" | "critical" | "expired" {
  if (remaining <= 0) return "expired";
  const ratio = duration > 0 ? remaining / duration : 1;
  if (ratio <= 0.1) return "critical";
  if (ratio <= 0.25) return "warning";
  return "normal";
}

function timerHeaderHTML(showDetails: boolean): string {
  const combat = game.combat;
  if (!combat) {
    return `
      <div class="ethernum-combat-timer-summary ${showDetails ? "detailed" : "compact"} disabled" data-timer-root
        aria-label="${game.i18n!.localize("ETHERNUM.CombatTimer.NoCombat")}">
        <i class="fas fa-stopwatch"></i>
        <div>
          <strong data-timer-value>--:--</strong>
          ${showDetails ? `<span data-timer-status>${game.i18n!.localize("ETHERNUM.CombatTimer.NoCombat")}</span>` : ""}
        </div>
      </div>`;
  }
  const snapshot = getTimerSnapshot(CombatTurnTimer.getState(combat), timerNow());
  const state = snapshot.state;
  const severity = timerSeverity(snapshot.remainingSeconds, state.durationSeconds);
  const statusKey = state.enabled
    ? snapshot.status
    : "disabled";
  return `
    <div class="ethernum-combat-timer-summary ${showDetails ? "detailed" : "compact"} ${severity}" data-timer-root
      aria-label="${game.i18n!.localize("ETHERNUM.CombatTimer.Title")}">
      <i class="fas ${snapshot.status === "paused" ? "fa-pause" : snapshot.expired ? "fa-triangle-exclamation" : "fa-stopwatch"}"></i>
      <div>
        <strong data-timer-value>${formatTimer(snapshot.remainingSeconds)}</strong>
        ${showDetails
          ? `<span data-timer-status>${game.i18n!.localize(`ETHERNUM.CombatTimer.Status.${statusKey}`)}</span>`
          : ""}
      </div>
      ${showDetails
        ? `<small title="${escapeHTML(currentCombatantName())}">${game.i18n!.localize("ETHERNUM.CombatTimer.Turn")}: ${escapeHTML(currentCombatantName())}</small>`
        : ""}
    </div>`;
}

function timerControlsHTML(showControls: boolean): string {
  const combat = game.combat;
  if (!showControls || !combat || !game.user?.isGM) return "";
  const state = CombatTurnTimer.getState(combat);
  const durationUnit = state.durationSeconds >= 60 && state.durationSeconds % 60 === 0
    ? "minutes"
    : "seconds";
  const durationValue = durationUnit === "minutes"
    ? state.durationSeconds / 60
    : state.durationSeconds;
  return `
    <section class="ethernum-combat-timer-admin" aria-label="${game.i18n!.localize("ETHERNUM.CombatTimer.Title")}">
      <div class="ethernum-combat-timer-duration">
        <span>${game.i18n!.localize("ETHERNUM.CombatTimer.Duration")}</span>
        <div>
          <input type="number" data-timer-duration min="1" max="86400" value="${durationValue}"
            aria-label="${game.i18n!.localize("ETHERNUM.CombatTimer.Duration")}" />
          <select data-timer-unit aria-label="${game.i18n!.localize("ETHERNUM.CombatTimer.Unit")}">
            <option value="seconds"${durationUnit === "seconds" ? " selected" : ""}>${game.i18n!.localize("ETHERNUM.CombatTimer.Seconds")}</option>
            <option value="minutes"${durationUnit === "minutes" ? " selected" : ""}>${game.i18n!.localize("ETHERNUM.CombatTimer.Minutes")}</option>
          </select>
          <button type="button" data-timer-action="duration" title="${game.i18n!.localize("ETHERNUM.CombatTimer.ApplyDuration")}"><i class="fas fa-check"></i></button>
        </div>
      </div>
      <div class="ethernum-combat-timer-actions">
        ${state.running
          ? `<button type="button" data-timer-action="pause" title="${game.i18n!.localize("ETHERNUM.CombatTimer.Pause")}"><i class="fas fa-pause"></i></button>`
          : `<button type="button" data-timer-action="${state.enabled ? "resume" : "start"}" title="${game.i18n!.localize(state.enabled ? "ETHERNUM.CombatTimer.Resume" : "ETHERNUM.CombatTimer.Start")}"><i class="fas fa-play"></i></button>`}
        <button type="button" data-timer-action="reset" title="${game.i18n!.localize("ETHERNUM.CombatTimer.Reset")}"><i class="fas fa-rotate-left"></i></button>
        <button type="button" data-timer-action="advance" title="${game.i18n!.localize("ETHERNUM.CombatTimer.Advance")}"><i class="fas fa-forward-step"></i></button>
        <button type="button" data-timer-action="auto" class="${state.autoAdvance ? "active" : ""}" title="${game.i18n!.localize("ETHERNUM.CombatTimer.AutoAdvance")}"><i class="fas fa-forward-fast"></i></button>
        <button type="button" data-timer-action="disable" title="${game.i18n!.localize("ETHERNUM.CombatTimer.Disable")}"><i class="fas fa-power-off"></i></button>
      </div>
    </section>`;
}

function mechanicStatusHTML(state: CombatMomentumState): string {
  const fidesStatus = state.fides.armed
    ? t("Fides.Ready")
    : state.fides.charges <= 0
      ? t("Fides.NoCharges")
      : tf("Fides.Markers", { markers: state.fides.markers });
  const fulgorStatus = state.fulgor.active
    ? tf("Fulgor.Chain", {
      current: state.fulgor.chainCount,
      max: state.fulgor.maxChain,
      target: escapeHTML(state.fulgor.targetName || t("Fulgor.SameTarget")),
    })
    : t("Fulgor.Waiting");
  return `
    <div class="ethernum-combat-mechanics">
      <section class="fides${state.fides.armed ? " ready" : ""}">
        <header>
          <span><i class="fas fa-gem"></i> Momentum Fides</span>
          <small>${tf("Fides.Charges", { charges: state.fides.charges })}</small>
        </header>
        <div class="ethernum-fides-track">${fidesMarkerHTML(state)}</div>
        <div class="ethernum-fides-charges">${fidesChargeHTML(state)}</div>
        <p>${fidesStatus}</p>
      </section>
      <section class="fulgor${state.fulgor.active ? " active" : ""}">
        <header>
          <span><i class="fas fa-bolt"></i> Fulgor Negro</span>
          <small>${tf("Fulgor.Triggers", { triggers: state.stats.fulgorTriggers })}</small>
        </header>
        <p>${fulgorStatus}</p>
        <div class="ethernum-fulgor-progress" style="--fulgor-progress: ${
          state.fulgor.active && state.fulgor.maxChain > 0
            ? Math.round((state.fulgor.chainCount / state.fulgor.maxChain) * 100)
            : 0
        }%"><i></i></div>
      </section>
    </div>`;
}

function playerPanelHTML(actor: Actor): string {
  const state = CombatMomentumSystem.getState(actor);
  const momentumDisabled = !state.fides.armed;
  const fulgorDisabled = !state.fulgor.active;
  return `
    <section class="ethernum-combat-player" data-actor-id="${escapeHTML(actor.id)}">
      <div class="ethernum-combat-actor-heading">
        <img src="${escapeHTML(actor.img)}" alt="" />
        <div>
          <strong>${escapeHTML(actor.name)}</strong>
          <span>${game.combat?.started ? tf("CombatRound", { round: game.combat.round ?? 0 }) : t("OutsideCombat")}</span>
        </div>
      </div>
      ${mechanicStatusHTML(state)}
      <div class="ethernum-combat-actions">
        <button type="button" data-action="momentum" ${momentumDisabled ? "disabled" : ""}
          title="${t("Actions.UseFides")}">
          <i class="fas fa-gem"></i><span>Momentum</span>
        </button>
        <button type="button" data-action="fulgor" ${fulgorDisabled ? "disabled" : ""}
          title="${t("Actions.UseFulgor")}">
          <i class="fas fa-bolt"></i><span>Fulgor</span>
        </button>
      </div>
      ${statsHTML(state)}
      <footer>
        <span>${state.lastResult.label ? tf("LastResult", { result: escapeHTML(state.lastResult.label), natural: state.lastResult.natural ? ` · d20 ${state.lastResult.natural}` : "" }) : t("NoAttacks")}</span>
        <small>${tf("Summary", { fides: state.stats.fidesUses, conversions: state.stats.fidesConversions, extensions: state.stats.fulgorExtensions })}</small>
      </footer>
    </section>`;
}

function gmActorRowHTML(entry: TrackedActor): string {
  const { actor, owners } = entry;
  const state = CombatMomentumSystem.getState(actor);
  return `
    <article class="ethernum-combat-gm-row" data-actor-id="${escapeHTML(actor.id)}">
      <header>
        <img src="${escapeHTML(actor.img)}" alt="" />
        <div>
          <strong>${escapeHTML(actor.name)}</strong>
          <span>${escapeHTML(owners.join(", "))}</span>
        </div>
        <em class="${state.fulgor.active ? "active" : ""}" title="${t("Fulgor.State")}">
          <i class="fas fa-bolt"></i>${state.fulgor.active ? `${state.fulgor.chainCount}/${state.fulgor.maxChain}` : "0"}
        </em>
      </header>
      <div class="ethernum-combat-gm-state">
        <div>
          <small>Fides</small>
          <span>${fidesMarkerHTML(state)}</span>
        </div>
        <div>
          <small>${t("Fides.ChargeLabel")}</small>
          <strong>${state.fides.charges}/3</strong>
        </div>
        ${statsHTML(state)}
      </div>
      <div class="ethernum-combat-gm-controls">
        <button type="button" data-action="marker-down" title="${t("Actions.RemoveMarker")}">
          <i class="fas fa-minus"></i>
        </button>
        <button type="button" data-action="marker-up" title="${t("Actions.AddMarker")}">
          <i class="fas fa-plus"></i>
        </button>
        <button type="button" data-action="end-fulgor" title="${t("Actions.EndFulgor")}" ${state.fulgor.active ? "" : "disabled"}>
          <i class="fas fa-ban"></i>
        </button>
        <button type="button" data-action="reset-combat-actor" title="${t("Actions.ResetCombatActor")}">
          <i class="fas fa-rotate-left"></i>
        </button>
        <button type="button" data-action="reset-daily-actor" title="${t("Actions.ResetDailyActor")}">
          <i class="fas fa-sun"></i>
        </button>
      </div>
    </article>`;
}

function emptyPlayerHTML(): string {
  return `
    <div class="ethernum-combat-empty">
      <i class="fas fa-user-slash"></i>
      <strong>${t("Empty.Title")}</strong>
      <span>${t("Empty.Hint")}</span>
    </div>`;
}

export class CombatMomentumTracker {
  private static root: HTMLElement | null = null;
  private static renderQueued = false;
  private static timerInterval: number | null = null;

  static initialize(): void {
    Hooks.on("controlToken", () => this.queueRender());
    Hooks.on("updateActor", (_actor: Actor, changed: Record<string, unknown>) => {
      if (JSON.stringify(changed ?? {}).includes("combatMomentum")) this.queueRender();
    });
    Hooks.on("createActor", () => this.queueRender());
    Hooks.on("deleteActor", () => this.queueRender());
    Hooks.on("updateCombat", () => this.queueRender());
    Hooks.on("createCombat", () => this.queueRender());
    Hooks.on("deleteCombat", () => this.queueRender());
    Hooks.on("canvasReady", () => this.queueRender());
    window.addEventListener("resize", () => this.queueRender());
    window.addEventListener("ethernum-client-settings-changed", () => this.queueRender());
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
    this.root.className = "ethernum-combat-tracker";
    document.body.appendChild(this.root);
    return this.root;
  }

  private static removeRoot(): void {
    this.root?.remove();
    this.root = null;
    if (this.timerInterval !== null) window.clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  private static isMinimized(): boolean {
    return localStorage.getItem(storageKey(TRACKER_MINIMIZED_KEY)) === "true";
  }

  private static setMinimized(minimized: boolean): void {
    localStorage.setItem(storageKey(TRACKER_MINIMIZED_KEY), String(minimized));
    this.render();
  }

  private static getTab(): TrackerTab {
    if (!game.user?.isGM) return "player";
    return localStorage.getItem(storageKey(TRACKER_TAB_KEY)) === "gm" ? "gm" : "player";
  }

  private static setTab(tab: TrackerTab): void {
    localStorage.setItem(storageKey(TRACKER_TAB_KEY), tab);
    this.render();
  }

  private static restoreDefaultPosition(): void {
    localStorage.removeItem(storageKey(TRACKER_POSITION_KEY));
    if (this.root) {
      this.root.style.left = "";
      this.root.style.top = "";
      this.root.style.right = "";
      this.root.style.bottom = "";
    }
    this.queueRender();
  }

  private static getPosition(): { left: number; top: number } | null {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey(TRACKER_POSITION_KEY)) ?? "null") as {
        left?: number;
        top?: number;
      } | null;
      if (typeof parsed?.left === "number" && typeof parsed.top === "number") {
        return { left: parsed.left, top: parsed.top };
      }
    } catch {
      return null;
    }
    return null;
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
    const handle = root.querySelector<HTMLElement>(".ethernum-combat-tracker-header, .ethernum-combat-tracker-toggle");
    handle?.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      const startX = event.clientX;
      const startY = event.clientY;
      const rect = root.getBoundingClientRect();
      let moved = false;
      const onMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        root.style.left = `${clamp(rect.left + dx, 8, window.innerWidth - root.offsetWidth - 8)}px`;
        root.style.top = `${clamp(rect.top + dy, 8, window.innerHeight - root.offsetHeight - 8)}px`;
        root.style.right = "auto";
        root.style.bottom = "auto";
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const next = root.getBoundingClientRect();
        localStorage.setItem(storageKey(TRACKER_POSITION_KEY), JSON.stringify({ left: next.left, top: next.top }));
        if (moved) root.dataset.dragged = "true";
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  }

  private static actorFromElement(element: Element): Actor | null {
    const actorId = element.closest<HTMLElement>("[data-actor-id]")?.dataset.actorId;
    return actorId ? game.actors?.get(actorId) as Actor | null ?? null : null;
  }

  private static activateActions(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>("[data-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        const actor = this.actorFromElement(button) ?? getPlayerActor();
        const execute = async () => {
          if (action === "momentum") await CombatMomentumSystem.useMomentumFides(actor);
          if (action === "fulgor") await CombatMomentumSystem.useFulgorNegro(actor);
          if (!actor) return;
          if (action === "marker-down") await CombatMomentumSystem.adjustFidesMarkers(actor, -1);
          if (action === "marker-up") await CombatMomentumSystem.adjustFidesMarkers(actor, 1);
          if (action === "end-fulgor") await CombatMomentumSystem.endFulgor(actor);
          if (action === "reset-combat-actor") await CombatMomentumSystem.resetCombat(actor);
          if (action === "reset-daily-actor") await CombatMomentumSystem.dailyReset(actor);
          this.queueRender();
        };
        void execute().catch(error => {
          console.error(`Ethernum RPG Module | Falha na ação do tracker: ${action ?? "desconhecida"}`, error);
          ui.notifications?.error(t("Errors.ActionFailed"));
        });
      });
    });
  }

  private static activateTimerActions(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>("[data-timer-action]").forEach(button => {
      button.addEventListener("click", () => {
        const combat = game.combat;
        if (!combat) return;
        const action = button.dataset.timerAction;
        const execute = async () => {
          if (action === "duration") {
            const amount = Number(root.querySelector<HTMLInputElement>("[data-timer-duration]")?.value ?? 60);
            const unit = root.querySelector<HTMLSelectElement>("[data-timer-unit]")?.value;
            const durationSeconds = amount * (unit === "minutes" ? 60 : 1);
            await game.settings!.set(ETHERNUM.MODULE_NAME, "combatTimerPreferredDuration", durationSeconds);
            await CombatTurnTimer.setDuration(combat, durationSeconds);
          }
          if (action === "start") await CombatTurnTimer.start(combat);
          if (action === "pause") await CombatTurnTimer.pause(combat);
          if (action === "resume") await CombatTurnTimer.resume(combat);
          if (action === "reset") await CombatTurnTimer.reset(combat);
          if (action === "advance") await CombatTurnTimer.advanceNow(combat);
          if (action === "auto") {
            const state = CombatTurnTimer.getState(combat);
            await CombatTurnTimer.setAutoAdvance(combat, !state.autoAdvance);
          }
          if (action === "disable") await CombatTurnTimer.disable(combat);
          this.queueRender();
        };
        void execute().catch(error => {
          console.error(`Ethernum RPG Module | Timer action failed: ${action ?? "unknown"}`, error);
          ui.notifications?.error(game.i18n!.localize("ETHERNUM.CombatTimer.Errors.ActionFailed"));
        });
      });
    });
  }

  private static updateTimerDOM(): void {
    const combat = game.combat;
    const timerRoot = this.root?.querySelector<HTMLElement>("[data-timer-root]");
    if (!combat || !timerRoot) return;
    const snapshot = getTimerSnapshot(CombatTurnTimer.getState(combat), timerNow());
    const value = timerRoot.querySelector<HTMLElement>("[data-timer-value]");
    const status = timerRoot.querySelector<HTMLElement>("[data-timer-status]");
    if (value) value.textContent = formatTimer(snapshot.remainingSeconds);
    if (status) {
      status.textContent = game.i18n!.localize(`ETHERNUM.CombatTimer.Status.${snapshot.status}`);
    }
    timerRoot.classList.remove("normal", "warning", "critical", "expired");
    timerRoot.classList.add(timerSeverity(snapshot.remainingSeconds, snapshot.state.durationSeconds));
  }

  private static startTimerTicker(): void {
    if (this.timerInterval !== null) window.clearInterval(this.timerInterval);
    this.timerInterval = null;
    if (!this.root?.querySelector("[data-timer-root]")) return;
    this.timerInterval = window.setInterval(() => this.updateTimerDOM(), 500);
  }

  private static render(): void {
    if (game.system?.id !== "pf2e") return;
    if (!isCombatTrackerEnabled() || (isCombatTrackerOnlyInCombat() && !game.combat?.started)) {
      this.removeRoot();
      return;
    }
    const root = this.ensureRoot();
    const minimized = this.isMinimized();
    const tab = this.getTab();
    root.className = `ethernum-combat-tracker animation-${getCombatAnimationMode()}${minimized ? " minimized" : ""}`;
    this.applyPosition(root);

    if (minimized) {
      const actor = getPlayerActor();
      const state = actor ? CombatMomentumSystem.getState(actor) : null;
      root.innerHTML = `
        <button type="button" class="ethernum-combat-tracker-toggle"
          title="${t("Open")}">
          <i class="fas ${state?.fulgor.active ? "fa-bolt" : state?.fides.armed ? "fa-gem" : "fa-crosshairs"}"></i>
          ${state ? `<span>${state.fides.markers}</span>` : ""}
        </button>`;
    } else {
      const playerActor = getPlayerActor();
      const trackedActors = game.user?.isGM ? getTrackedActors() : [];
      const showGMView = shouldShowTimerAdministration(Boolean(game.user?.isGM), tab);
      const tabs = game.user?.isGM ? `
        <nav class="ethernum-combat-tracker-tabs" aria-label="${t("View")}">
          <button type="button" data-tab="player" class="${tab === "player" ? "active" : ""}">
            <i class="fas fa-user"></i><span>${t("Tabs.Player")}</span>
          </button>
          <button type="button" data-tab="gm" class="${tab === "gm" ? "active" : ""}">
            <i class="fas fa-users-gear"></i><span>${t("Tabs.GM")}</span>
          </button>
        </nav>` : "";
      const body = showGMView ? `
        <section class="ethernum-combat-gm">
          <div class="ethernum-combat-gm-toolbar">
            <span>${tf("CharacterCount", { count: trackedActors.length })}</span>
            <button type="button" data-global-action="reset-combat" title="${t("Actions.ResetCombat")}">
              <i class="fas fa-rotate-left"></i><span>${t("Actions.Combat")}</span>
            </button>
            <button type="button" data-global-action="reset-daily" title="${t("Actions.ResetDaily")}">
              <i class="fas fa-sun"></i><span>${t("Actions.Daily")}</span>
            </button>
          </div>
          <div class="ethernum-combat-gm-list">
            ${trackedActors.length ? trackedActors.map(gmActorRowHTML).join("") : emptyPlayerHTML()}
          </div>
        </section>` : playerActor ? playerPanelHTML(playerActor) : emptyPlayerHTML();
      root.innerHTML = `
        <header class="ethernum-combat-tracker-header">
          <div class="ethernum-combat-tracker-title">
            <strong>${t("Title")}</strong>
            <span>Momentum Fides · Fulgor Negro</span>
          </div>
          ${timerHeaderHTML(showGMView)}
          <button type="button" class="ethernum-combat-tracker-position-reset" title="${game.i18n!.localize("ETHERNUM.CombatTracker.RestorePosition")}">
            <i class="fas fa-location-crosshairs"></i>
          </button>
          <button type="button" class="ethernum-combat-tracker-toggle" title="${t("Minimize")}">
            <i class="fas fa-minus"></i>
          </button>
        </header>
        ${tabs}
        ${timerControlsHTML(showGMView)}
        <div class="ethernum-combat-tracker-body">${body}</div>`;

      root.querySelectorAll<HTMLElement>("[data-tab]").forEach(button => {
        button.addEventListener("click", () => this.setTab(button.dataset.tab === "gm" ? "gm" : "player"));
      });
      root.querySelector('[data-global-action="reset-combat"]')?.addEventListener("click", () => {
        void CombatMomentumSystem.resetAllCombat().then(() => this.queueRender());
      });
      root.querySelector('[data-global-action="reset-daily"]')?.addEventListener("click", () => {
        void CombatMomentumSystem.resetAllDaily().then(() => this.queueRender());
      });
      this.activateActions(root);
      this.activateTimerActions(root);
      root.querySelector(".ethernum-combat-tracker-position-reset")?.addEventListener("click", () => {
        this.restoreDefaultPosition();
      });
    }

    root.querySelector(".ethernum-combat-tracker-toggle")?.addEventListener("click", () => {
      if (root.dataset.dragged === "true") {
        root.dataset.dragged = "false";
        return;
      }
      this.setMinimized(!this.isMinimized());
    });
    this.activateDrag(root);
    this.startTimerTicker();
  }
}
