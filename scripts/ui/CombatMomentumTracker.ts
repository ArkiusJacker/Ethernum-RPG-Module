import { ETHERNUM } from "../config.js";
import {
  CombatMomentumSystem,
  type CombatMomentumState,
} from "../table/CombatMomentumSystem.js";

const TRACKER_MINIMIZED_KEY = "combatTrackerMinimized";
const TRACKER_POSITION_KEY = "combatTrackerPosition";
const TRACKER_TAB_KEY = "combatTrackerTab";

type TrackerTab = "player" | "gm";

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
  }).map(user => String(user.name ?? "Jogador"));
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
  return `
    <div class="ethernum-combat-stats" aria-label="Resultados deste combate">
      <span title="Falhas"><small>F</small><strong>${state.stats.failures}</strong></span>
      <span title="Falhas críticas"><small>FC</small><strong>${state.stats.criticalFailures}</strong></span>
      <span title="Sucessos"><small>S</small><strong>${state.stats.successes}</strong></span>
      <span title="Sucessos críticos"><small>SC</small><strong>${state.stats.criticalSuccesses}</strong></span>
      <span title="Resultados 1 naturais"><small>1</small><strong>${state.stats.natural1s}</strong></span>
      <span title="Resultados 20 naturais"><small>20</small><strong>${state.stats.natural20s}</strong></span>
    </div>`;
}

function mechanicStatusHTML(state: CombatMomentumState): string {
  const fidesStatus = state.fides.armed
    ? "Pronto para o próximo ataque"
    : state.fides.charges <= 0
      ? "Sem cargas até as preparações diárias"
      : `${state.fides.markers}/3 falhas consecutivas`;
  const fulgorStatus = state.fulgor.active
    ? `${state.fulgor.chainCount}/${state.fulgor.maxChain} contra ${escapeHTML(state.fulgor.targetName || "o mesmo alvo")}`
    : "Aguardando 20 natural";
  return `
    <div class="ethernum-combat-mechanics">
      <section class="fides${state.fides.armed ? " ready" : ""}">
        <header>
          <span><i class="fas fa-gem"></i> Momentum Fides</span>
          <small>${state.fides.charges}/3 cargas</small>
        </header>
        <div class="ethernum-fides-track">${fidesMarkerHTML(state)}</div>
        <div class="ethernum-fides-charges">${fidesChargeHTML(state)}</div>
        <p>${fidesStatus}</p>
      </section>
      <section class="fulgor${state.fulgor.active ? " active" : ""}">
        <header>
          <span><i class="fas fa-bolt"></i> Fulgor Negro</span>
          <small>${state.stats.fulgorTriggers} gatilho(s)</small>
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
          <span>${game.combat?.started ? `Combate · Rodada ${game.combat.round ?? 0}` : "Fora de combate"}</span>
        </div>
      </div>
      ${mechanicStatusHTML(state)}
      <div class="ethernum-combat-actions">
        <button type="button" data-action="momentum" ${momentumDisabled ? "disabled" : ""}
          title="Executar Momentum Fides">
          <i class="fas fa-gem"></i><span>Momentum</span>
        </button>
        <button type="button" data-action="fulgor" ${fulgorDisabled ? "disabled" : ""}
          title="Executar o ataque livre de Fulgor Negro">
          <i class="fas fa-bolt"></i><span>Fulgor</span>
        </button>
      </div>
      ${statsHTML(state)}
      <footer>
        <span>${state.lastResult.label ? `Último: ${escapeHTML(state.lastResult.label)}${state.lastResult.natural ? ` · d20 ${state.lastResult.natural}` : ""}` : "Nenhum ataque registrado neste combate"}</span>
        <small>Fides ${state.stats.fidesUses} · Conversões ${state.stats.fidesConversions} · Extensões ${state.stats.fulgorExtensions}</small>
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
        <em class="${state.fulgor.active ? "active" : ""}" title="Estado do Fulgor Negro">
          <i class="fas fa-bolt"></i>${state.fulgor.active ? `${state.fulgor.chainCount}/${state.fulgor.maxChain}` : "0"}
        </em>
      </header>
      <div class="ethernum-combat-gm-state">
        <div>
          <small>Fides</small>
          <span>${fidesMarkerHTML(state)}</span>
        </div>
        <div>
          <small>Cargas</small>
          <strong>${state.fides.charges}/3</strong>
        </div>
        ${statsHTML(state)}
      </div>
      <div class="ethernum-combat-gm-controls">
        <button type="button" data-action="marker-down" title="Remover uma marca de Fides">
          <i class="fas fa-minus"></i>
        </button>
        <button type="button" data-action="marker-up" title="Adicionar uma marca de Fides">
          <i class="fas fa-plus"></i>
        </button>
        <button type="button" data-action="end-fulgor" title="Encerrar Fulgor Negro" ${state.fulgor.active ? "" : "disabled"}>
          <i class="fas fa-ban"></i>
        </button>
        <button type="button" data-action="reset-combat-actor" title="Limpar rastreio deste combate">
          <i class="fas fa-rotate-left"></i>
        </button>
        <button type="button" data-action="reset-daily-actor" title="Restaurar preparações diárias">
          <i class="fas fa-sun"></i>
        </button>
      </div>
    </article>`;
}

function emptyPlayerHTML(): string {
  return `
    <div class="ethernum-combat-empty">
      <i class="fas fa-user-slash"></i>
      <strong>Nenhum personagem disponível</strong>
      <span>Atribua um personagem ao usuário ou controle um token que você possua.</span>
    </div>`;
}

export class CombatMomentumTracker {
  private static root: HTMLElement | null = null;
  private static renderQueued = false;

  static initialize(): void {
    Hooks.on("controlToken", () => this.queueRender());
    Hooks.on("updateActor", () => this.queueRender());
    Hooks.on("createActor", () => this.queueRender());
    Hooks.on("deleteActor", () => this.queueRender());
    Hooks.on("updateCombat", () => this.queueRender());
    Hooks.on("createCombat", () => this.queueRender());
    Hooks.on("deleteCombat", () => this.queueRender());
    Hooks.on("canvasReady", () => this.queueRender());
    window.addEventListener("resize", () => this.queueRender());
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
          ui.notifications?.error("Não foi possível concluir a ação do tracker.");
        });
      });
    });
  }

  private static render(): void {
    if (game.system?.id !== "pf2e") return;
    const root = this.ensureRoot();
    const minimized = this.isMinimized();
    const tab = this.getTab();
    root.className = `ethernum-combat-tracker${minimized ? " minimized" : ""}`;
    this.applyPosition(root);

    if (minimized) {
      const actor = getPlayerActor();
      const state = actor ? CombatMomentumSystem.getState(actor) : null;
      root.innerHTML = `
        <button type="button" class="ethernum-combat-tracker-toggle"
          title="Abrir rastreador de combate">
          <i class="fas ${state?.fulgor.active ? "fa-bolt" : state?.fides.armed ? "fa-gem" : "fa-crosshairs"}"></i>
          ${state ? `<span>${state.fides.markers}</span>` : ""}
        </button>`;
    } else {
      const playerActor = getPlayerActor();
      const trackedActors = game.user?.isGM ? getTrackedActors() : [];
      const tabs = game.user?.isGM ? `
        <nav class="ethernum-combat-tracker-tabs" aria-label="Visão do rastreador">
          <button type="button" data-tab="player" class="${tab === "player" ? "active" : ""}">
            <i class="fas fa-user"></i><span>Jogador</span>
          </button>
          <button type="button" data-tab="gm" class="${tab === "gm" ? "active" : ""}">
            <i class="fas fa-users-gear"></i><span>Mestre</span>
          </button>
        </nav>` : "";
      const body = tab === "gm" && game.user?.isGM ? `
        <section class="ethernum-combat-gm">
          <div class="ethernum-combat-gm-toolbar">
            <span>${trackedActors.length} personagem(ns)</span>
            <button type="button" data-global-action="reset-combat" title="Limpar dados do combate">
              <i class="fas fa-rotate-left"></i><span>Combate</span>
            </button>
            <button type="button" data-global-action="reset-daily" title="Aplicar preparações diárias">
              <i class="fas fa-sun"></i><span>Diário</span>
            </button>
          </div>
          <div class="ethernum-combat-gm-list">
            ${trackedActors.length ? trackedActors.map(gmActorRowHTML).join("") : emptyPlayerHTML()}
          </div>
        </section>` : playerActor ? playerPanelHTML(playerActor) : emptyPlayerHTML();
      root.innerHTML = `
        <header class="ethernum-combat-tracker-header">
          <div>
            <strong>Rastreador de Combate</strong>
            <span>Momentum Fides · Fulgor Negro</span>
          </div>
          <button type="button" class="ethernum-combat-tracker-toggle" title="Minimizar rastreador">
            <i class="fas fa-minus"></i>
          </button>
        </header>
        ${tabs}
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
    }

    root.querySelector(".ethernum-combat-tracker-toggle")?.addEventListener("click", () => {
      if (root.dataset.dragged === "true") {
        root.dataset.dragged = "false";
        return;
      }
      this.setMinimized(!this.isMinimized());
    });
    this.activateDrag(root);
  }
}
