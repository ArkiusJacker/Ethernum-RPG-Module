import {
  accessories,
  cromaActivation,
  cromas,
  decisions,
  martItems,
  phases,
  symptoms,
  ultimates,
  ultimateProfiles,
  wayProfiles,
  weaponsG,
  weaponsS,
} from "./data.js";
import { managedWeapon, rollManifestedStrike, syncVItems } from "./foundry-items.js";

const MODULE_ID = "ethernum-v-redhand";
const BASE_ID = "ethernum-rpg-module";
const PROFILE_ID = "v-redhand";
const PROFILE_LABEL = "V RedHand - Concórdia";
const HIDDEN_NATIVE_CLASS = "vred-native-hidden";
const STATE_PATH = `flags.${MODULE_ID}.state`;
const pendingRenderObservers = new WeakMap();
const boundCoreRoots = new WeakSet();
const DISCOVERIES = [
  ["Piercer Revolver", "ULTRAKILL", "Pistola · 1d6 perfurante fatal d10 · 18 m · capacidade 6", "Lance de Moeda (1 ação): o próximo Strike neste turno ignora cobertura leve e padrão; se acertar, +1d6 precisão."],
  ["Skippy", "Cyberpunk 2077", "Pistola · 1d6 perfurante fatal d10 · 18 m · capacidade 6", "Mira Conversada (1 ação): marca alvo a 18 m e dá +1 circ. ao próximo Strike; acerto marcado +2 precisão. Ao recarregar, Mata ou Pacifista. Enquanto fala, −2 circ. Stealth."],
  ["Faca de Campanha 4CW", "Night City", "A · 1d6 cortante ou perfurante · agile, finesse · 1,5 m", "1/rodada ao acertar: +1 circ. CA até próximo turno. Contra alvo off-guard, ignora 1 resistência física. Entra quando o Mestre decidir."],
];
const WEAPON_ID = name => `weapon:${name}`;

const DEFAULT_STATE = {
  schemaVersion: 2,
  active: true,
  gloveMk: 1,
  corruptedRune: false,
  settings: { forcedRerollEnabled: false, allowT2Accessories: false, cromaStartChoice: "undecided" },
  catalog: { rewrites: [] },
  encounter: { spins: 0, cartridge: false, cartridgeSpent: false, mode: "G", current: null, ammo: {}, cromaUses: {}, cromaAmmo: null, cromaSandevistanState: null, pendingUltimateBonus: null, log: [] },
  daily: {
    tier: 1,
    tax: null,
    draft: [],
    order: null,
    rerollUsed: false,
    accessoryRoll: null,
    accessories: [],
    giftBoxPending: null,
    giftBoxUsed: false,
    cromas: [],
    cromaUses: {},
    camouflageActive: false,
    cromaChangeUsed: false,
    symptoms: [],
  },
};

function clone(value) {
  return structuredClone(value);
}

function stateFor(actor) {
  const saved = actor.getFlag(MODULE_ID, "state") ?? {};
  const state = {
    ...clone(DEFAULT_STATE),
    ...saved,
    settings: { ...DEFAULT_STATE.settings, ...(saved.settings ?? {}) },
    catalog: { ...DEFAULT_STATE.catalog, ...(saved.catalog ?? {}) },
    encounter: { ...DEFAULT_STATE.encounter, ...(saved.encounter ?? {}) },
    daily: { ...DEFAULT_STATE.daily, ...(saved.daily ?? {}) },
  };
  if (Number(saved.schemaVersion ?? 1) < 2) {
    const oldCurrent = state.encounter.current;
    if (oldCurrent?.ultimateSelect || oldCurrent?.isUltimate) {
      oldCurrent.result = 1;
    } else if (oldCurrent && Number(oldCurrent.result) >= 1 && Number(oldCurrent.result) <= 19) {
      const migratedResult = Number(oldCurrent.result) + 1;
      state.encounter.current = { ...weaponFor(oldCurrent.mode, migratedResult, state), mode: oldCurrent.mode, result: migratedResult };
    }
    state.encounter.log = (state.encounter.log ?? []).map(entry => {
      const wasUltimate = entry.result === 20 && (entry.name === "Glitch / Ultimate Select" || ultimates.some(item => item[1] === entry.name));
      return wasUltimate ? { ...entry, result: 1 } : Number(entry.result) >= 1 && Number(entry.result) <= 19
        ? { ...entry, result: Number(entry.result) + 1 }
        : entry;
    });
    state.schemaVersion = 2;
  }
  return state;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function notify(kind, message) {
  ui.notifications?.[kind]?.(message);
}

function isGM() {
  return Boolean(game.user?.isGM);
}

function isOwner(actor) {
  return Boolean(isGM() || actor.isOwner);
}

function canShowForConcórdia(actor) {
  const state = actor.getFlag(BASE_ID, "uniqueMechanics");
  return state?.activeCore === "concordia";
}

function unwrapElement(html, app) {
  const candidate = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  return candidate instanceof HTMLElement ? candidate : null;
}

function getUniqueRoot(container) {
  if (container?.matches?.(".ethernum-unique-tab")) return container;
  return container?.querySelector?.(".ethernum-unique-tab") ?? null;
}

function ensureProfileOption(select) {
  let option = [...select.options].find(entry => entry.value === PROFILE_ID);
  if (!option) {
    option = document.createElement("option");
    option.value = PROFILE_ID;
    option.textContent = PROFILE_LABEL;
    option.dataset.vRedhandOption = "true";
    select.append(option);
  }
  return option;
}

function isVProfileActive(actor) {
  return actor.getFlag(MODULE_ID, "active") === true && stateFor(actor).active !== false;
}

function showNativeProfile(root, actor, selectedProfile = null) {
  const mount = root.querySelector(`[data-v-redhand-host='${MODULE_ID}']`);
  for (const child of root.children) child.classList.remove(HIDDEN_NATIVE_CLASS);
  mount?.remove();
  const select = root.querySelector("select.ethernum-unique-profile");
  if (select) {
    const baseProfile = actor.getFlag(BASE_ID, "uniqueMechanics")?.activeProfile ?? "";
    select.value = selectedProfile ?? baseProfile;
  }
}

function hideNativeProfile(root, mount) {
  for (const child of root.children) {
    if (child === mount || child.matches(".ethernum-core-selector, .ethernum-unique-topbar")) continue;
    child.classList.add(HIDDEN_NATIVE_CLASS);
  }
}

function ensureMount(root, app, actor) {
  let mount = root.querySelector(`[data-v-redhand-host='${MODULE_ID}']`);
  if (mount) return mount;
  mount = document.createElement("div");
  mount.dataset.vRedhandHost = MODULE_ID;
  mount.dataset.vActorId = actor.id ?? "";
  mount.className = "vred-addon-host";
  const topbar = root.querySelector(".ethernum-unique-topbar");
  if (topbar) topbar.after(mount);
  else root.append(mount);
  mount.addEventListener("click", event => void handleAction(event, app, mount, actor));
  mount.addEventListener("change", event => void handleAction(event, app, mount, actor));
  return mount;
}

function mountForActor(actor, fallback) {
  if (fallback?.isConnected && fallback.dataset.vActorId === (actor.id ?? "")) return fallback;
  return [...document.querySelectorAll(".vred-addon-host")]
    .find(candidate => candidate.dataset.vActorId === (actor.id ?? "")) ?? fallback;
}

function renderCurrentProfile(mount, actor, state) {
  const currentMount = mountForActor(actor, mount);
  if (currentMount?.isConnected) renderProfile(currentMount, actor, state);
}

async function handleProfileSelection(event, root, app, actor, select) {
  if (select.dataset.vRedhandBypass === "true") {
    delete select.dataset.vRedhandBypass;
    return;
  }

  if (select.value === PROFILE_ID) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!isGM()) {
      select.value = actor.getFlag(BASE_ID, "uniqueMechanics")?.activeProfile ?? "";
      return;
    }
    const state = stateFor(actor);
    state.active = true;
    try {
      await actor.update({ [`flags.${MODULE_ID}.active`]: true, [STATE_PATH]: state });
      await syncVItems(actor, state);
      const currentRoot = getUniqueRoot(unwrapElement(undefined, app)) ?? root;
      const currentSelect = currentRoot.querySelector("select.ethernum-unique-profile");
      if (currentSelect) currentSelect.value = PROFILE_ID;
      const mount = ensureMount(currentRoot, app, actor);
      hideNativeProfile(currentRoot, mount);
      renderCurrentProfile(mount, actor, state);
    } catch (error) {
      console.error(`[${MODULE_ID}] could not activate V profile`, error);
      notify("error", "Não foi possível ativar o perfil de V.");
      showNativeProfile(root, actor);
    }
    return;
  }

  if (!isVProfileActive(actor) || !isGM()) return;
  const requestedProfile = select.value;
  event.preventDefault();
  event.stopImmediatePropagation();
  const state = stateFor(actor);
  state.active = false;
  try {
    await clearTimedCromaConditions(actor, state, { camouflage: true });
    await actor.update({ [`flags.${MODULE_ID}.active`]: false, [STATE_PATH]: state });
    await syncVItems(actor, state);
    const currentRoot = getUniqueRoot(unwrapElement(undefined, app)) ?? root;
    const currentSelect = currentRoot.querySelector("select.ethernum-unique-profile") ?? select;
    showNativeProfile(currentRoot, actor, requestedProfile);
    currentSelect.dataset.vRedhandBypass = "true";
    currentSelect.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    console.error(`[${MODULE_ID}] could not switch from V profile`, error);
    notify("error", "Não foi possível trocar a mecânica única.");
    select.value = PROFILE_ID;
  }
}

function bindUniqueProfile(root, app, actor) {
  const select = root.querySelector("select.ethernum-unique-profile");
  if (!select) return false;
  ensureProfileOption(select);
  if (select.dataset.vRedhandBound !== "true") {
    select.addEventListener("change", event => {
      void handleProfileSelection(event, root, app, actor, select);
    }, true);
    select.dataset.vRedhandBound = "true";
  }
  if (!boundCoreRoots.has(root)) {
    root.addEventListener("click", event => {
      const coreButton = event.target.closest(".ethernum-core-card[data-core]");
      if (!coreButton || coreButton.dataset.core === "concordia" || !isVProfileActive(actor)) return;
      const state = stateFor(actor);
      state.active = false;
      void actor.update({ [`flags.${MODULE_ID}.active`]: false, [STATE_PATH]: state })
        .then(() => clearTimedCromaConditions(actor, state, { camouflage: true }))
        .then(() => syncVItems(actor, state))
        .catch(error => console.error(`[${MODULE_ID}] could not remove managed items after core switch`, error));
    }, true);
    boundCoreRoots.add(root);
  }
  return true;
}

function integrateUniqueProfile(root, app, actor) {
  if (!canShowForConcórdia(actor) || !bindUniqueProfile(root, app, actor)) return false;
  const select = root.querySelector("select.ethernum-unique-profile");
  if (isVProfileActive(actor)) {
    select.value = PROFILE_ID;
    const mount = ensureMount(root, app, actor);
    hideNativeProfile(root, mount);
    renderProfile(mount, actor, stateFor(actor));
  } else {
    showNativeProfile(root, actor);
  }
  return true;
}

function watchUniqueRender(container, app, actor) {
  const integrate = () => {
    const uniqueRoot = getUniqueRoot(container);
    return uniqueRoot ? integrateUniqueProfile(uniqueRoot, app, actor) : false;
  };
  if (integrate() || pendingRenderObservers.has(container)) return;
  const observer = new MutationObserver(() => {
    if (!integrate()) return;
    observer.disconnect();
    pendingRenderObservers.delete(container);
  });
  pendingRenderObservers.set(container, observer);
  observer.observe(container, { childList: true, subtree: true });
  setTimeout(() => {
    observer.disconnect();
    pendingRenderObservers.delete(container);
  }, 8000);
}

function copperFromPdfPrice(price) {
  if (String(price).toLowerCase() === "grátis") return 0;
  const match = String(price).match(/(\d+)\s*(pc|pp|po)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  return amount * (match[2].toLowerCase() === "po" ? 100 : match[2].toLowerCase() === "pp" ? 10 : 1);
}

function fmtPdfMoney(copper) {
  if (copper >= 100) return `${copper / 100} po`;
  if (copper >= 10) return `${copper / 10} pp`;
  return `${copper} pc`;
}

function actorCopper(actor) {
  const currency = actor.system?.currency;
  if (!currency || typeof currency !== "object") return null;
  return [
    ["cp", 1], ["sp", 10], ["gp", 100], ["pp", 1000],
  ].reduce((sum, [denomination, value]) => sum + Number(currency[denomination] ?? 0) * value, 0);
}

function currencyAfterPurchase(actor, cost) {
  const available = actorCopper(actor);
  if (available === null) throw new Error("Não encontrei a carteira PF2e deste personagem.");
  if (available < cost) throw new Error(`Saldo insuficiente: o pedido custa ${fmtPdfMoney(cost)}.`);
  if (cost === 0) {
    const currency = actor.system.currency;
    return { cp: Number(currency.cp ?? 0), sp: Number(currency.sp ?? 0), gp: Number(currency.gp ?? 0), pp: Number(currency.pp ?? 0) };
  }
  let remaining = available - cost;
  const next = {};
  for (const [key, unit] of [["pp", 1000], ["gp", 100], ["sp", 10], ["cp", 1]]) {
    next[key] = Math.floor(remaining / unit);
    remaining %= unit;
  }
  return next;
}

function updateActor(actor, nextState, currency = null) {
  const update = { [STATE_PATH]: nextState };
  if (currency) {
    for (const denomination of ["cp", "sp", "gp", "pp"]) {
      update[`system.currency.${denomination}`] = currency[denomination];
    }
  }
  return actor.update(update);
}

function capacityFor(form) {
  const meta = form?.meta ?? "";
  if (meta.includes("Par ·")) return { kind: "pair", left: 6, right: 6, reload: "1 ação por pistola" };
  if (meta.includes("Escopeta")) return { kind: "shell", rounds: 2, reload: "1 ação por cartucho" };
  if (meta.includes("Pesada")) return { kind: "bullet", rounds: 3, reload: "1 ação por bala" };
  if (meta.includes("Lancer")) return { kind: "magazine", rounds: 5, reload: "2 ações por pente" };
  if (meta.includes("Pistola")) return { kind: "magazine", rounds: 6, reload: "1 ação, pente completo" };
  return null;
}

function wayFor(mode, text) {
  if (mode === "S") return "drifter";
  if (/Escopeta|Lancer/i.test(text)) return "vanguard";
  if (/Pistola|Par/i.test(text)) return "pistolero";
  if (/Pesada|Rifle|Railgun|Kraber|Sniper/i.test(text) || Number(text.match(/(\d+(?:[.,]\d+)?)\s*m/i)?.[1] ?? 0) >= 24) return "sniper";
  return "vanguard";
}

function weaponFor(mode, result, state) {
  const table = mode === "G" ? weaponsG : weaponsS;
  const slot = result - 1; // d20 2–20 map to the catalogue slots 1–19.
  const rewrite = state.catalog.rewrites.find(entry => entry.mode === mode && Number(entry.slot) === slot);
  const [name, source, meta, effect] = rewrite
    ? DISCOVERIES[rewrite.discovery] ?? table[slot - 1]
    : table[slot - 1];
  const wayId = wayFor(mode, `${meta ?? ""} ${effect ?? ""}`);
  return { name, source, meta, effect, catalogSlot: slot, wayId, wayName: wayProfiles[wayId]?.name ?? "" };
}

function tabStorageKey(actor) {
  return `${MODULE_ID}:tab:${game.user?.id ?? "user"}:${actor.uuid ?? actor.id ?? "actor"}`;
}

function getSectionTab(mount, actor) {
  const allowed = new Set(["status", "boot", "arsenal", "glove", "store", "experiments", "cromas", "campaign"]);
  let stored = mount.dataset.vTab;
  try { stored ??= localStorage.getItem(tabStorageKey(actor)); } catch { /* Storage can be disabled in a private browsing context. */ }
  stored ??= "status";
  return allowed.has(stored) ? stored : "status";
}

function saveSectionTab(mount, actor, tab) {
  mount.dataset.vTab = tab;
  try { localStorage.setItem(tabStorageKey(actor), tab); } catch { /* Storage can be disabled in a private browsing context. */ }
}

function tabButton(id, label, active) {
  return `<button type="button" class="vred-tab ${active ? "active" : ""}" data-v-action="tab" data-tab="${id}">${label}</button>`;
}

function card(title, body, tone = "") {
  return `<article class="vred-card ${tone}"><h4>${title}</h4>${body}</article>`;
}

function renderActivation(mount, actor) {
  mount.innerHTML = `<div class="vred-activation"><div><span class="vred-kicker">ADD-ON CONCÓRDIA</span><h3>V · The RedHand</h3><p>Ative o perfil ARSENAL.EXE neste personagem. Os dados ficarão no namespace próprio do add-on.</p></div><button type="button" class="vred-button primary" data-v-action="activate" ${isGM() ? "" : "disabled"}>Ativar perfil V</button></div>${isGM() ? "" : `<p class="vred-note">Apenas o GM pode ativar o perfil neste Actor.</p>`}`;
}

function renderStatus(state, actor) {
  const form = state.encounter.current;
  const recent = state.encounter.log.at(-1);
  const glove = ["Redhand", "RedCoat", "The Dealer", "Blackwall", "Além de Night City"][Math.max(0, state.gloveMk - 1)];
  return `<div class="vred-grid two">
    ${card("Estado", `<div class="vred-statline"><span>Luva</span><strong>Mk ${state.gloveMk} · ${glove}</strong></div><div class="vred-statline"><span>Tier do Mart</span><strong>T${state.daily.tier}</strong></div><div class="vred-statline"><span>Cromas</span><strong>${state.daily.cromas.length} instalado(s)</strong></div>`, "red")}
    ${card("Encontro", `<div class="vred-statline"><span>Giros</span><strong>${state.encounter.spins}/3</strong></div><div class="vred-statline"><span>Cartucho Ultimate</span><strong>${state.encounter.cartridge ? "Obtido" : "Não obtido"}</strong></div><div class="vred-statline"><span>Re-giro</span><strong>${state.daily.rerollUsed ? "Usado hoje" : "Disponível se habilitado"}</strong></div>`)}
    ${card("Forma manifestada", form ? `<strong>${escapeHtml(form.name)}</strong><p>${escapeHtml(form.meta ?? "")}</p><p>${escapeHtml(form.effect ?? "")}</p>` : `<p>Nenhuma forma ativa. Abra Boot & arsenal para girar.</p>`)}
    ${card("Último registro", recent ? `<span class="vred-badge">${recent.mode === "G" ? "Gunslinger" : "Swordmaster"} · d20 ${recent.result}</span><p><strong>${escapeHtml(recent.name)}</strong></p>` : `<p>O histórico de encontro aparece aqui.</p>`, "gold")}
  </div>
  <div class="vred-callout"><strong>Escopo da automação:</strong> o add-on acompanha escolhas, munição, compras e recibos. Ataques, ações, testes e efeitos PF2e continuam sendo resolvidos pela ficha e pelo GM.</div>
  <div class="vred-control-row">${isGM() ? `<button class="vred-button" data-v-action="new-encounter">Novo encontro</button><button class="vred-button" data-v-action="new-day">Novo dia</button><button class="vred-button danger" data-v-action="deactivate">Desativar V neste personagem</button>` : ""}</div>`;
}

function renderBoot(state) {
  const mode = state.encounter.mode;
  const form = state.encounter.current;
  let current = `<p class="vred-muted">Nenhum resultado ainda. O primeiro giro ocorre com Into the Fray e iniciativa, sem ação adicional.</p>`;
  if (form?.ultimateSelect) {
    current = `<span class="vred-badge gold vred-glitch-badge">1 NATURAL · BRECHA GLITCH</span><h4>A roleta falhou. O Blackwall respondeu.</h4><p>${state.encounter.cartridge ? "O Cartucho já foi obtido. Escolha uma Ultimate para substituir a forma atual; isso não restaura o Cartucho gasto." : "Uma Ultimate/Glitch foi revelada. Escolha uma das 18 armas e receba 1 Cartucho neste encontro."}</p><div class="vred-ultimate-grid">${ultimates.map(item => `<button type="button" class="vred-pick" data-v-action="select-ultimate" data-name="${escapeHtml(item[1])}"><strong>${escapeHtml(item[1])}</strong><small>${item[3]} ações · ${escapeHtml(item[2])}</small></button>`).join("")}</div>`;
  } else if (form?.isUltimate) {
    const profile = ultimateProfiles[form.name];
    const ammo = form.mode === "G" ? state.encounter.ammo[form.name] : null;
    const loaded = !ammo || (ammo.kind === "pair" ? ammo.left > 0 || ammo.right > 0 : ammo.rounds > 0);
    current = `<span class="vred-badge gold vred-glitch-badge">GLITCH · ${escapeHtml(form.source)} · d20 1</span><h4>${escapeHtml(form.name)}</h4><p class="vred-muted">${escapeHtml(form.meta)}</p><p><strong>${escapeHtml(profile?.label ?? "Assinatura Suprema")} · ${profile?.kind === "strike" ? "Strike" : "salvamento/área"} · ${ultimates.find(item => item[1] === form.name)?.[3] ?? 2} ações · 1 Cartucho</strong></p><p>${escapeHtml(profile?.signature ?? form.effect)}</p>${ammo?.kind ? `<div class="vred-ammo"><span>Munição da forma: <strong>${ammo.kind === "pair" ? `${ammo.left}/${ammo.right}` : `${ammo.rounds}/${ammo.max}`}</strong></span></div>` : ""}<div class="vred-control-row"><button class="vred-button primary" data-v-action="use-ultimate" ${!state.encounter.cartridge || state.encounter.cartridgeSpent || !loaded ? "disabled" : ""}>${state.encounter.cartridgeSpent ? "Cartucho gasto neste encontro" : !loaded ? "Recarregue a forma antes de usar" : "Usar assinatura Glitch"}</button><span class="vred-badge">${escapeHtml(form.wayName ?? "Way indisponível")}</span></div>`;
  } else if (form) {
    const ammo = form.mode === "G" ? state.encounter.ammo[form.name] : null;
    const ammoView = ammo?.kind === "pair"
      ? `<div class="vred-ammo"><span>Carregador esquerdo: <strong>${ammo.left}/6</strong></span><button class="vred-button small" data-v-action="fire" data-hand="left" ${ammo.left <= 0 ? "disabled" : ""}>Consumir tiro esquerdo</button><button class="vred-button small" data-v-action="reload" data-hand="left">Recarregar esquerdo · 1 ação</button><span>Carregador direito: <strong>${ammo.right}/6</strong></span><button class="vred-button small" data-v-action="fire" data-hand="right" ${ammo.right <= 0 ? "disabled" : ""}>Consumir tiro direito</button><button class="vred-button small" data-v-action="reload" data-hand="right">Recarregar direito · 1 ação</button></div>`
      : ammo?.kind ? `<div class="vred-ammo"><span>Munição: <strong>${ammo.rounds}/${ammo.max}</strong></span><button class="vred-button small" data-v-action="fire" ${ammo.rounds <= 0 ? "disabled" : ""}>Consumir 1 tiro</button><button class="vred-button small" data-v-action="reload">Recarregar · ${escapeHtml(ammo.reload)}</button></div>`
      : "";
    current = `<span class="vred-badge">${form.mode === "G" ? "Gunslinger" : "Swordmaster"} · d20 ${form.result}</span><h4>${escapeHtml(form.name)}</h4><p class="vred-muted">${escapeHtml(form.source)} · ${escapeHtml(form.meta)}</p><p>${escapeHtml(form.effect)}</p><p class="vred-way-line"><strong>${escapeHtml(form.wayName ?? "Way correspondente")}</strong> · ${escapeHtml(wayProfiles[form.wayId]?.initial ?? "Way/perks ativos na ficha PF2e")}</p>${ammoView}`;
  }
  const canReroll = state.gloveMk >= 3 && state.settings.forcedRerollEnabled && !state.daily.rerollUsed && state.encounter.log.length > 0;
  return `<div class="vred-controls"><div class="vred-segment"><button type="button" data-v-action="mode" data-mode="G" class="${mode === "G" ? "selected" : ""}">Gunslinger</button><button type="button" data-v-action="mode" data-mode="S" class="${mode === "S" ? "selected" : ""}">Swordmaster</button></div><button type="button" class="vred-button primary" data-v-action="spin" ${state.encounter.spins >= 3 ? "disabled" : ""}>Girar d20 · ${state.encounter.spins}/3</button>${isGM() ? `<button type="button" class="vred-button" data-v-action="new-encounter">Novo encontro</button>` : ""}</div>
  <div class="vred-roll-layout"><div class="vred-die" data-die>${form?.result ?? "—"}</div><div class="vred-current">${current}</div></div>
  ${state.encounter.pendingUltimateBonus ? `<div class="vred-callout vred-pending-bonus"><strong>Dano de assinatura pendente · ${escapeHtml(state.encounter.pendingUltimateBonus.name)}</strong><p>Rode depois de confirmar o acerto do Strike; aplique a parcela conforme acerto/crítico da carta.</p><button class="vred-button primary small" data-v-action="roll-ultimate-bonus">Rolar +${escapeHtml(state.encounter.pendingUltimateBonus.formula)} ${escapeHtml(state.encounter.pendingUltimateBonus.damageType)}</button></div>` : ""}
  <div class="vred-grid two" style="margin-top:14px">${card("Re-giro Forçado · proposta / decisão 09", `<p>Mk III+. Uma vez por dia, depois de ver o resultado; aceite o novo d20, inclusive 1 ou 20. O GM aplica um Sintoma.</p><p>Estado: ${state.settings.forcedRerollEnabled ? "experimento habilitado" : "desligado até decisão do GM"} · ${state.daily.rerollUsed ? "usado hoje" : "disponível"}</p><button class="vred-button" data-v-action="forced-reroll" ${!canReroll ? "disabled" : ""}>Forçar re-giro</button>${isGM() ? `<button class="vred-button small" data-v-action="toggle-reroll">${state.settings.forcedRerollEnabled ? "Desabilitar proposta" : "Habilitar proposta"}</button>` : ""}`, "gold")}
  ${card("Glitch / Ultimate", `<p>Um 1 natural abre a revelação Glitch e permite escolher uma das 18 Supremas. O primeiro 1 do encontro concede 1 Cartucho; outros 1 podem trocar a forma, sem restaurá-lo.</p><p>Cartucho: <strong>${!state.encounter.cartridge ? "não obtido" : state.encounter.cartridgeSpent ? "gasto" : "disponível"}</strong></p><p>A arma e as ações da Way ativa aparecem na ficha PF2e; a assinatura Ultimate é acionada neste painel. Escolher outro Glitch atualiza arma e Way.</p>`)}
  ${card("Regras de encontro", `<p>Até 3 giros; cada um depois do primeiro custa 1 ação. Trocar e voltar não recarrega a forma. Boot inclui sacar o vínculo; Pares e formas de duas mãos ocupam ambas as mãos.</p><p>Munição inicial por forma é a proposta do v0.5 e pode ser revisada após a decisão 05.</p>`)}</div>
  <div class="vred-section-title"><span class="vred-kicker">HISTÓRICO DO ENCONTRO</span></div><div class="vred-log">${state.encounter.log.length ? state.encounter.log.slice().reverse().map(entry => `<div><span>${entry.mode === "G" ? "Gunslinger" : "Swordmaster"} · d20 ${entry.result}</span><strong>${escapeHtml(entry.name)}</strong>${entry.note ? `<small>${escapeHtml(entry.note)}</small>` : ""}</div>`).join("") : `<p class="vred-muted">Nenhum giro registrado.</p>`}</div>`;
}

function renderGlove(state) {
  const names = ["Redhand", "RedCoat", "The Dealer", "Blackwall recusada", "Além de Night City"];
  const tiers = [
    "+1 potência, striking, 1 slot", "+2 potência, striking, 2 slots", "+2, greater striking, 2 slots", "+3, greater striking, 3 slots", "+3, major striking, 3 slots",
  ];
  return `<div class="vred-grid two">${card(`Mk ${state.gloveMk} · ${names[state.gloveMk - 1]}`, `<p>${tiers[state.gloveMk - 1]}</p><p>A Luva aplica runas à forma manifestada (incluindo ambas as pistolas dos Pares). Não alcança Cromas nem armas de terceiros.</p>${isGM() ? `<label class="vred-field">Camada da Luva<select data-v-action="set-mk">${names.map((name, i) => `<option value="${i + 1}" ${state.gloveMk === i + 1 ? "selected" : ""}>Mk ${i + 1} · ${name}</option>`).join("")}</select></label>` : ""}`, "red")}
  ${card("Troca de runas", `<p>Runas de propriedade já conhecidas podem ser trocadas em 10 minutos fora de combate. Comprar e gravar runas novas segue as regras normais de PF2e.</p><p>Sem a Luva, V ainda pode girar, mas a forma não recebe as runas. Perder a Luva é um problema de cena.</p>`)}
  ${card("Runa Estática Corrompida · opcional", `<p>Em crítico de ataque, o alvo fica off-guard até o início do próximo turno. Em falha crítica, a forma muda para outra do mesmo modo (novo d20, sem escolha nem Suprema) e o GM aplica Sintoma.</p><p>Remover exige uma cena; Calibração comum não basta.</p><p>Estado: ${state.corruptedRune ? "aceita por V" : "não instalada"}</p>${isGM() ? `<button class="vred-button" data-v-action="toggle-corrupted">${state.corruptedRune ? "Remover da Luva" : "Registrar aceitação da runa"}</button>` : ""}${state.corruptedRune ? `<button class="vred-button" data-v-action="corrupted-jump">Resolver mudança após falha crítica</button>` : ""}`, "gold")}
  ${card("Gatilhos de evolução", `<p>Mk II: componente do Mart T2 ou ajuda de Solven. Mk III: o engrama reconhece a Luva. Mk IV: aceitar a Runa Corrompida é decisão de V. Mk V: reservado ao fim da campanha.</p><p>A progressão é por cenas, não compra automática.</p>`)}</div>`;
}

function tierBudget(tier) {
  return ({ 1: { slots: 1, copper: 50, name: "Balcão" }, 2: { slots: 2, copper: 100, name: "Geladeira" }, 3: { slots: 3, copper: 500, name: "Estoque dos Fundos" }, 4: { slots: 4, copper: 1500, name: "Sem Etiqueta" } })[tier];
}

function draftCosts(state) {
  const mult = state.daily.tax === 1 ? 0.5 : state.daily.tax === 5 ? 2 : 1;
  return state.daily.draft.reduce((sum, index) => sum + Math.ceil((copperFromPdfPrice(martItems[index]?.[2]) ?? 0) * mult), 0);
}

function renderStore(state, actor) {
  const config = tierBudget(state.daily.tier);
  const baseTotal = state.daily.draft.reduce((sum, index) => sum + (copperFromPdfPrice(martItems[index]?.[2]) ?? 0), 0);
  const total = draftCosts(state);
  const money = actorCopper(actor);
  const canSubmit = state.daily.tax !== null && state.daily.draft.length > 0 && !state.daily.order && state.daily.draft.length <= config.slots && baseTotal <= config.copper && total <= config.copper && money !== null && money >= total;
  const items = martItems.map((item, index) => ({ item, index })).filter(({ item }) => Number(item[0].slice(1)) <= state.daily.tier && Number(item[0].slice(1)) <= 4);
  const order = state.daily.order;
  return `<div class="vred-store-summary"><div><span class="vred-kicker">PEDIDO DO DIA · T${state.daily.tier}</span><strong>${config.name}</strong><small>${state.daily.draft.length}/${config.slots} slots · ${fmtPdfMoney(total)}/${fmtPdfMoney(config.copper)}</small></div><div><span class="vred-kicker">CARTEIRA PF2E</span><strong>${money === null ? "indisponível" : fmtPdfMoney(money)}</strong><small>O total do pedido é debitado ao confirmar.</small></div></div>
  <div class="vred-control-row">${isGM() ? `<label class="vred-field">Tier do Pocket.Mart<select data-v-action="set-tier">${[1, 2, 3, 4].map(tier => `<option value="${tier}" ${state.daily.tier === tier ? "selected" : ""}>T${tier} · ${tierBudget(tier).name}</option>`).join("")}</select></label>` : ""}<button class="vred-button" data-v-action="tax-roll" ${state.daily.tax !== null || order ? "disabled" : ""}>${state.daily.tax ? `Taxa do Dia · d6 ${state.daily.tax}` : "Rolar Taxa do Dia · d6"}</button>${state.daily.tax === 6 ? `<button class="vred-button" data-v-action="symptom-roll">Rolar o Sintoma causado pela Taxa 6</button>` : ""}</div>
  <p class="vred-note">Taxa 1: metade do preço. 2–4: preço normal (4 traz recibo estranho). 5: preço dobrado. 6: o GM aplica Sintoma e o item mais barato dura o dobro. Orçamento limita o valor efetivamente pago.</p>
  ${state.daily.tax === null ? `<div class="vred-callout">Role a Taxa antes de fechar o carrinho. A compra registra o recibo e cobra as moedas do próprio Actor PF2e.</div>` : ""}
  ${order ? `<div class="vred-card gold"><h4>Recibo registrado · ${new Date(order.createdAt).toLocaleString()}</h4><p>${order.items.map(index => escapeHtml(martItems[index]?.[1])).join(", ")} · total ${fmtPdfMoney(order.totalCopper)} · Taxa ${order.taxRoll}</p>${Number(order.taxRoll) === 6 && Number.isInteger(order.extendedItemIndex) ? `<p><strong>Duração dobrada:</strong> ${escapeHtml(martItems[order.extendedItemIndex]?.[1])}.</p>` : ""}<p>Os efeitos ficam registrados para consulta e não adicionam modificadores automáticos à ficha.</p></div>` : `<div class="vred-shop-grid">${items.map(({ item, index }) => {
    const itemTier = Number(item[0].slice(1));
    const selected = state.daily.draft.includes(index);
    const rawPrice = copperFromPdfPrice(item[2]);
    const price = rawPrice === null ? item[2] : fmtPdfMoney(Math.ceil(rawPrice * (state.daily.tax === 1 ? 0.5 : state.daily.tax === 5 ? 2 : 1)));
    const disabled = rawPrice === null || (!selected && (state.daily.draft.length >= config.slots || baseTotal + rawPrice > config.copper || total + Math.ceil((rawPrice ?? 0) * (state.daily.tax === 1 ? 0.5 : state.daily.tax === 5 ? 2 : 1)) > config.copper)) || Boolean(state.daily.tax === null);
    return `<article class="vred-card ${selected ? "selected" : ""}"><span class="vred-badge ${itemTier >= 4 ? "red" : ""}">${item[0]} · ${price}</span><h4>${escapeHtml(item[1])}</h4><p>${escapeHtml(item[3])}</p><small>No recibo: ${escapeHtml(item[4])}</small><button class="vred-button small" data-v-action="draft-item" data-index="${index}" ${disabled && !selected ? "disabled" : ""}>${selected ? "Remover do carrinho" : "Adicionar ao carrinho"}</button></article>`;
  }).join("")}</div><div class="vred-control-row"><button class="vred-button primary" data-v-action="confirm-order" ${canSubmit ? "" : "disabled"}>Confirmar pedido e debitar ${fmtPdfMoney(total)}</button><button class="vred-button" data-v-action="clear-draft" ${state.daily.draft.length ? "" : "disabled"}>Limpar carrinho</button></div>`}
  ${state.daily.tier === 4 && isGM() ? state.daily.giftBoxPending
    ? `<div class="vred-card gold"><h4>Caixa Entregue Antes · pendente</h4><p>${escapeHtml(state.daily.giftBoxPending.item)}</p><small>O GM escolheu este item útil para amanhã. Registro ${new Date(state.daily.giftBoxPending.createdAt).toLocaleString()}.</small><div class="vred-control-row"><button class="vred-button" data-v-action="resolve-gift-box">Marcar como entregue</button></div></div>`
    : `<div class="vred-control-row"><label class="vred-field">Caixa Entregue Antes · item para amanhã<input type="text" maxlength="200" data-gift-box-item placeholder="Nome do item ou descrição curta" ${state.daily.giftBoxUsed ? "disabled" : ""}></label><button class="vred-button" data-v-action="gift-box" ${state.daily.giftBoxUsed ? "disabled" : ""}>${state.daily.giftBoxUsed ? "Presente de hoje registrado" : "Registrar presente do GM"}</button></div>` : ""}
  <div class="vred-section-title"><span class="vred-kicker">OS CINCO ANDARES</span></div><div class="vred-grid four">${[1, 2, 3, 4].map(tier => { const info = tierBudget(tier); return `<div class="vred-tier ${tier === state.daily.tier ? "current" : ""}"><strong>T${tier} · ${info.name}</strong><span>${info.slots} slots · ${fmtPdfMoney(info.copper)}</span></div>`; }).join("")}<div class="vred-tier"><strong>T5 · Encomenda</strong><span>Narrativo · reservado à mesa</span></div></div>`;
}

function renderExperiments(state, actor) {
  const accessory = state.daily.accessoryRoll;
  const selectedAccessory = accessory ? accessories[accessory - 1] : null;
  const carried = state.daily.accessories;
  const advanceGift = accessory === 20
    ? isGM()
      ? `<label class="vred-field">Acessório escolhido pelo GM<select data-advance-accessory>${accessories.slice(1, -1).map((item, index) => `<option value="${index + 1}">${escapeHtml(item[0])}</option>`).join("")}</select></label><button class="vred-button" data-v-action="grant-advance-accessory" ${carried.length >= (state.daily.tier >= 4 ? 3 : 2) ? "disabled" : ""}>Registrar como presente do Blackwall</button>`
      : `<p class="vred-note">Entrega Antecipada: o GM escolhe um acessório e o registra como presente, sem cobrança.</p>`
    : "";
  return `<div class="vred-grid two">${card("Prateleira Rotativa · acessórios d20", `<p>Abre no T3 (o GM pode adiantar para T2). Uma rolagem por dia; V compra ou deixa o acessório. Até 2 acessórios carregados, 3 no T4.</p><p>Estado da prateleira: ${selectedAccessory ? `d20 ${accessory} · ${escapeHtml(selectedAccessory[0])} · ${escapeHtml(selectedAccessory[3])}` : "sem rolagem hoje"}</p><div class="vred-control-row"><button class="vred-button primary" data-v-action="accessory-roll" ${accessory || (state.daily.tier < 3 && !state.settings.allowT2Accessories) ? "disabled" : ""}>Rolar acessório d20</button>${isGM() && state.daily.tier < 3 ? `<button class="vred-button small" data-v-action="toggle-t2-accessories">${state.settings.allowT2Accessories ? "Desabilitar acesso T2" : "Adiantar acesso ao T2"}</button>` : ""}${selectedAccessory && copperFromPdfPrice(selectedAccessory[3]) !== null ? `<button class="vred-button" data-v-action="buy-accessory" ${carried.length >= (state.daily.tier >= 4 ? 3 : 2) || carried.includes(accessory - 1) ? "disabled" : ""}>Comprar por ${escapeHtml(selectedAccessory[3])}</button>` : ""}</div>${advanceGift}${carried.length ? `<div class="vred-log">${carried.map(index => `<div><strong>${escapeHtml(accessories[index]?.[0])}</strong>${isOwner(actor) ? `<button class="vred-button small" data-v-action="drop-accessory" data-index="${index}">Descartar</button>` : ""}</div>`).join("")}</div>` : ""}`, "red")}
  ${card("Ruído do Blackwall · d10", `<p>Sintomas são narrativa, sem dano nem condição. Gatilhos incluem Taxa 6, Re-giro, Cromas Importados/Blackwall, falha em instalação e Runa Estática.</p><button class="vred-button" data-v-action="symptom-roll">Rolar Sintoma d10</button>${state.daily.symptoms.length ? `<div class="vred-log">${state.daily.symptoms.slice(-4).reverse().map(entry => `<div><span>d10 ${entry.roll}</span><strong>${escapeHtml(entry.text)}</strong></div>`).join("")}</div>` : ""}`, "gold")}</div>
  ${selectedAccessory ? `<div class="vred-card"><span class="vred-badge">Acessório ${accessory} · ${escapeHtml(selectedAccessory[1])}</span><h4>${escapeHtml(selectedAccessory[0])}</h4><p>${escapeHtml(selectedAccessory[2])}</p><p class="vred-note">No recibo: ${escapeHtml(selectedAccessory[3])}</p></div>` : ""}
  <div class="vred-section-title"><span class="vred-kicker">CATÁLOGO ROTATIVO · 01–20</span></div><div class="vred-catalog-grid">${accessories.map((item, index) => `<article class="vred-card"><span class="vred-badge">d20 ${String(index + 1).padStart(2, "0")} · ${escapeHtml(item[1])}</span><h4>${escapeHtml(item[0])}</h4><p>${escapeHtml(item[2])}</p><small>${escapeHtml(item[3])}</small></article>`).join("")}</div>`;
}

function cromaLoadout(state) {
  return state.daily.cromas.reduce((summary, index) => {
    const croma = cromas[index];
    if (!croma) return summary;
    summary.weight += Number(croma[4]);
    croma[2].split(" + ").forEach(slot => summary.slots.add(slot));
    return summary;
  }, { weight: 0, slots: new Set() });
}

function renderCromas(state) {
  const caps = { 1: 5, 2: 5, 3: 7, 4: 9, 5: 9 };
  const cap = caps[state.daily.tier] ?? 5;
  const loadout = cromaLoadout(state);
  return `<div class="vred-grid two">${card("Integração", `<p>Peso instalado: <strong>${loadout.weight}/${cap}</strong> · limiar do Mart T${state.daily.tier}. Um Croma por slot corporal.</p><p>Slots ocupados: ${loadout.slots.size ? [...loadout.slots].map(escapeHtml).join(", ") : "nenhum"}.</p><p>Instalação e remoção levam 1 hora. O GM registra o resultado do teste nativo de Medicina ou Crafting; este add-on não altera a ficha de perícias.</p>`, "teal")}
  ${card("Instalação", `<p>Common CD 18 · Uncommon CD 22 · Rare CD 27 · Exotic CD 32 · Blackwall sem teste. Falha: instalado com defeito; falha crítica: kit recusado. No máximo uma instalação/troca por dia.</p><p>Trocar não devolve o kit. Depois do terceiro Croma, o custo é narrativo, nunca penalidade automática.</p><p>Troca hoje: ${state.daily.cromaChangeUsed ? "já usada" : "disponível"}.</p><p>Início de campanha (decisão 10): <strong>${state.settings.cromaStartChoice === "undecided" ? "não decidido" : `opção ${state.settings.cromaStartChoice}`}</strong>.</p>${isGM() ? `<label class="vred-field">Croma inicial<select data-v-action="set-start-croma"><option value="undecided" ${state.settings.cromaStartChoice === "undecided" ? "selected" : ""}>Não decidido</option><option value="A" ${state.settings.cromaStartChoice === "A" ? "selected" : ""}>A · Common desde o início</option><option value="B" ${state.settings.cromaStartChoice === "B" ? "selected" : ""}>B · primeiro Croma no T2 (recomendado)</option><option value="C" ${state.settings.cromaStartChoice === "C" ? "selected" : ""}>C · Croma somente no T3</option></select></label>` : ""}`, "gold")}</div>
  <div class="vred-catalog-grid">${cromas.map((croma, index) => {
    const installed = state.daily.cromas.includes(index);
    const slots = croma[2].split(" + ");
    const conflicts = slots.some(slot => loadout.slots.has(slot));
    const overWeight = loadout.weight + Number(croma[4]) > cap;
    const availableTiers = croma[5].match(/T\d/g)?.map(value => Number(value.slice(1))) ?? [];
    const originException = state.daily.tier === 1 && state.settings.cromaStartChoice === "A" && croma[3] === "Common" && [0, 8].includes(index);
    const unlocked = originException || availableTiers.some(tier => state.daily.tier >= tier);
    const allowed = !installed && !state.daily.cromaChangeUsed && !conflicts && !overWeight && unlocked;
    const defect = (state.daily.cromaDefects ?? []).includes(index);
    const activation = cromaActivation[index + 1];
    const uses = activation?.frequency === "encounter" ? Number(state.encounter.cromaUses?.[index] ?? 0) : Number(state.daily.cromaUses?.[index] ?? 0);
    const exhausted = Boolean(activation?.frequency) && uses >= 1;
    const activationButton = installed && activation
      ? index === 5
        ? `<button class="vred-button primary small" data-v-action="use-croma" data-index="${index}">Disparar Braço-Canhão · 1 ação</button><button class="vred-button small" data-v-action="use-croma" data-charge="true" data-index="${index}">Disparo carregado · +1 ação</button>`
        : `<button class="vred-button primary small" data-v-action="use-croma" data-index="${index}" ${exhausted ? "disabled" : ""}>${activation.label} · ${activation.actions ? `${activation.actions} ação` : activation.type === "reaction" ? "Reação" : "ação livre"}${exhausted ? " · usado" : ""}</button>`
      : "";
    const activeEffectControls = index === 3 && state.encounter.cromaSandevistanState === "quickened"
      ? `<button class="vred-button small" data-v-action="finish-sandevistan-turn">Fim do turno · remover quickened e aplicar slowed 1</button>`
      : index === 3 && state.encounter.cromaSandevistanState === "slowed"
        ? `<button class="vred-button small" data-v-action="finish-sandevistan-slowed">Fim do próximo turno · remover slowed 1</button>`
        : index === 7 && state.daily.camouflageActive
          ? `<button class="vred-button small" data-v-action="end-camouflage">Encerrar Camuflagem Óptica</button>`
          : index === 5
            ? `<span class="vred-badge">Munição ${Number(state.encounter.cromaAmmo ?? 3)}/3</span><button class="vred-button small" data-v-action="reload-croma-cannon" ${Number(state.encounter.cromaAmmo ?? 3) >= 3 ? "disabled" : ""}>Recarregar · 1 ação</button>`
            : "";
    const installControls = installed
      ? `<div class="vred-control-row">${activationButton}${activeEffectControls}${isGM() ? `<button class="vred-button small" data-v-action="remove-croma" data-index="${index}" ${state.daily.cromaChangeUsed ? "disabled" : ""}>Remover · kit não retorna</button>` : ""}</div>`
      : !isGM() ? "" : croma[3] === "Blackwall"
        ? `<button class="vred-button small" data-v-action="install-croma" data-outcome="success" data-index="${index}" ${allowed ? "" : "disabled"}>Registrar Croma Blackwall (sem teste)</button>`
        : `<div class="vred-control-row"><button class="vred-button small" data-v-action="install-croma" data-outcome="success" data-index="${index}" ${allowed ? "" : "disabled"}>Registrar sucesso</button><button class="vred-button small" data-v-action="install-croma" data-outcome="failure" data-index="${index}" ${allowed ? "" : "disabled"}>Registrar falha · instala com defeito</button><button class="vred-button small danger" data-v-action="install-croma" data-outcome="critical" data-index="${index}" ${allowed ? "" : "disabled"}>Registrar falha crítica · kit perdido</button></div>`;
    return `<article class="vred-card ${installed ? "selected" : ""}"><span class="vred-badge ${croma[3] === "Blackwall" || croma[3] === "Exotic" ? "red" : ""}">${escapeHtml(croma[0])} · ${escapeHtml(croma[2])} · ${escapeHtml(croma[3])} · Peso ${croma[4]} · ${escapeHtml(croma[5])}${defect ? " · DEFEITO" : ""}</span><h4>${escapeHtml(croma[1])}</h4><p>${escapeHtml(croma[6])}</p><small>Preço sugerido ${escapeHtml(croma[7])} · CD de instalação conforme raridade.${installed ? " Item criado na ficha PF2e; efeitos passivos compatíveis são aplicados enquanto equipado." : ""}</small>${installControls}</article>`;
  }).join("")}</div>`;
}

function rewrittenTable(mode, state) {
  const base = mode === "G" ? weaponsG : weaponsS;
  return base.map((entry, index) => {
    const replacement = state.catalog.rewrites.find(item => item.mode === mode && Number(item.slot) === index + 1);
    if (!replacement) return entry;
    return DISCOVERIES[replacement.discovery] ?? entry;
  });
}

function renderArsenal(state) {
  const rewritesAvailable = Math.max(0, (state.daily.tier >= 3 ? 1 : 0) + (state.daily.tier >= 4 ? 1 : 0));
  const mode = state.encounter.mode;
  const table = rewrittenTable(mode, state);
  return `<div class="vred-controls"><div class="vred-segment"><button type="button" data-v-action="mode" data-mode="G" class="${mode === "G" ? "selected" : ""}">Gunslinger</button><button type="button" data-v-action="mode" data-mode="S" class="${mode === "S" ? "selected" : ""}">Swordmaster</button></div><input class="vred-search" type="search" placeholder="Buscar no catálogo" data-v-search></div>
  <div class="vred-rewrite">${isGM() ? `<label class="vred-field">Trocar resultado 2–20<select data-rewrite-slot>${table.map((entry, index) => `<option value="${index + 1}">d20 ${String(index + 2).padStart(2, "0")} · ${escapeHtml(entry[0])}</option>`).join("")}</select></label><label class="vred-field">Descoberta<select data-rewrite-discovery>${DISCOVERIES.map((item, index) => `<option value="${index}">${escapeHtml(item[0])}</option>`).join("")}</select></label><button class="vred-button" data-v-action="rewrite" ${state.catalog.rewrites.length >= rewritesAvailable ? "disabled" : ""}>Aplicar Reescrita · ${state.catalog.rewrites.length}/${rewritesAvailable}</button>` : `<span>Reescritas: ${state.catalog.rewrites.length}/${rewritesAvailable}</span>`}<p class="vred-note">1 slot no T3, mais 1 no T4. A Descoberta substitui uma arma entre d20 2–20; o 1 natural revela uma Glitch. Cada Reescrita é revertível pelo GM.</p>${state.catalog.rewrites.length ? `<div class="vred-log">${state.catalog.rewrites.map(item => `<div><span>${item.mode === "G" ? "Gunslinger" : "Swordmaster"} · d20 ${String(Number(item.slot) + 1).padStart(2, "0")}</span><strong>${escapeHtml(DISCOVERIES[item.discovery]?.[0])}</strong>${isGM() ? `<button class="vred-button small" data-v-action="remove-rewrite" data-mode="${item.mode}" data-slot="${item.slot}">Reverter</button>` : ""}</div>`).join("")}</div>` : ""}</div>
  <div class="vred-catalog-grid" data-v-catalog>${table.map((entry, index) => `<article class="vred-card" data-v-searchable="${escapeHtml(entry.join(" ").toLowerCase())}"><span class="vred-badge">d20 ${String(index + 2).padStart(2, "0")}</span><h4>${escapeHtml(entry[0])}</h4><small>${escapeHtml(entry[1])} · ${escapeHtml(entry[2])}</small><p>${escapeHtml(entry[3])}</p></article>`).join("")}</div>
  <div class="vred-section-title"><span class="vred-kicker">GLITCH / ULTIMATE SELECT · 1 NATURAL</span></div><div class="vred-grid three">${ultimates.map(item => `<div class="vred-tier"><strong>${escapeHtml(item[0])} · ${escapeHtml(item[1])}</strong><span>${escapeHtml(item[2])} · ${item[3]} ações · cartas completas integradas</span></div>`).join("")}</div>`;
}

function renderCampaign(state) {
  return `<div class="vred-grid three">${phases.map((phase, index) => card(`Fase ${index + 1} · ${escapeHtml(phase[0])}`, `<strong>${escapeHtml(phase[1])}</strong><p>${escapeHtml(phase[2])}</p>`)).join("")}</div>
  <div class="vred-grid two">${card("O item que o Mart nunca vendeu · T5", `<p>Uma fatia de bolo de aniversário. Bianca guardou a fatia, e V ainda não abriu o vídeo. Use uma única vez, na Fase V. Pode ser presente ou isca; quando acontecer, o humor de V some.`, "gold")}${card("Âncoras de família", `<p><strong>Iris:</strong> Kiroshi, aliança, fones.</p><p><strong>Bianca:</strong> Walkman Vazio, Relógio de Casa, Spray e fatia de bolo.</p><p><strong>Richard:</strong> chave, plaqueta e Faca de Campanha 4CW.</p><p><strong>Catherine:</strong> caixa postal e Pedido do Dia; despedida, promessa ou ferida continua em aberto.</p>`, "red")}</div>
  <div class="vred-section-title"><span class="vred-kicker">DECISÕES DO PDF AINDA ABERTAS</span></div><div class="vred-grid two">${decisions.map(row => card(`${row[0]} · ${escapeHtml(row[1])}`, `<p>${escapeHtml(row[2])}</p><p><strong>Pergunta:</strong> ${escapeHtml(row[3])}</p>`, "gold")).join("")}</div>
  <div class="vred-callout">O add-on mantém essas decisões sem resposta. As propostas têm controles explícitos e começam desligadas quando podem alterar a regra.</div>`;
}

function renderProfile(mount, actor, state) {
  const tab = getSectionTab(mount, actor);
  const tabs = [
    ["status", "Resumo"], ["boot", "Boot & giros"], ["arsenal", "Catálogo"],
    ["glove", "Luva"], ["store", "Pocket.Mart"], ["experiments", "Experimentos"],
    ["cromas", "Cromas"], ["campaign", "Campanha"],
  ];
  const renderers = {
    status: () => renderStatus(state, actor), boot: () => renderBoot(state), arsenal: () => renderArsenal(state),
    glove: () => renderGlove(state), store: () => renderStore(state, actor),
    experiments: () => renderExperiments(state, actor), cromas: () => renderCromas(state), campaign: () => renderCampaign(state),
  };
  mount.innerHTML = `<section class="vred-panel" data-v-profile="v-redhand"><header class="vred-header"><div><span class="vred-kicker">MECÂNICA ÚNICA · CONCÓRDIA</span><h3>V <em>REDHAND</em></h3><p>ARSENAL.EXE · Drifter nível 10 · v0.5 Reboot</p></div><div class="vred-header-state"><span class="vred-badge red">MK ${state.gloveMk}</span><span class="vred-badge">GIROS ${state.encounter.spins}/3</span><span class="vred-badge gold">${state.encounter.cartridge ? "CARTUCHO" : "SEM CARTUCHO"}</span></div></header>
  <nav class="vred-nav" aria-label="Painel de V">${tabs.map(([id, label]) => tabButton(id, label, id === tab)).join("")}</nav>
  <div class="vred-body">${renderers[tab]?.() ?? renderers.status()}</div>
  <footer class="vred-footer"><span>Playtest · estado salvo no Actor · add-on ${MODULE_ID}</span><span>${isOwner(actor) ? "Você pode controlar este painel." : "Somente leitura: peça ao GM para ajustar o personagem."}</span>${isGM() ? `<button class="vred-button small danger" data-v-action="deactivate">Desativar perfil V</button>` : ""}</footer>
  </section>`;
  const die = mount.querySelector("[data-die]");
  if (die?.textContent.trim() === "1") die.classList.add("natural-one");
  if (die?.textContent.trim() === "20") die.classList.add("natural-20");
  if (!isGM()) mount.querySelectorAll("button[data-v-action]").forEach(button => {
    if (button.dataset.vAction === "tab") return;
    if (!isOwner(actor)) button.disabled = true;
  });
  const search = mount.querySelector("[data-v-search]");
  if (search) search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    mount.querySelectorAll("[data-v-searchable]").forEach(item => {
      item.hidden = query.length > 0 && !item.dataset.vSearchable.includes(query);
    });
  });
}

async function rollDice(actor, faces, flavor) {
  const roll = await new Roll(`1d${faces}`).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `V · ${flavor}`,
    flags: { [MODULE_ID]: { chatType: "roll", faces, natural: roll.total } },
  });
  return roll.total;
}

function animateDie(mount, result) {
  const die = mount.querySelector("[data-die]");
  if (!die || matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
  die.classList.remove("natural-one", "natural-20");
  die.classList.add("rolling");
  return new Promise(resolve => {
    let frame = 0;
    const interval = setInterval(() => {
      die.textContent = String(Math.floor(Math.random() * 20) + 1);
      if (++frame >= 12) {
        clearInterval(interval);
        die.textContent = String(result);
        die.classList.remove("rolling");
        if (result === 20) die.classList.add("natural-20");
        if (result === 1) die.classList.add("natural-one");
        resolve();
      }
    }, 55);
  });
}

async function chatReceipt(actor, title, lines) {
  const content = `<h3>${escapeHtml(title)}</h3><p>${lines.map(escapeHtml).join("<br>")}</p>`;
  const chatType = /glitch|blackwall/i.test(title) ? "blackwall" : /ultimate|suprema/i.test(title) ? "ultimate" : "receipt";
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), flavor: title, content, flags: { [MODULE_ID]: { chatType } } });
}

async function rollDamageChat(actor, formula, damageType, flavor) {
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `V · ${flavor} · ${formula} ${damageType}`,
    flags: { [MODULE_ID]: { chatType: "ultimate-damage", damageType, formula } },
  });
  return roll.total;
}

async function announceGlitch(actor, state, result) {
  if (result !== 1) return;
  const earlierGlitches = state.encounter.log.filter(entry => entry.result === 1).length;
  await chatReceipt(actor, "BLACKWALL / GLITCH REVELADA", [
    "1 natural. Por um instante, a roleta parece ter falhado.",
    "A tela fica vermelha, o ruído some e uma arma impossível atravessa o Blackwall.",
    earlierGlitches === 1 ? "A mesa recebe a revelação: uma Ultimate à escolha e 1 Cartucho para este encontro." : "A Glitch pode trocar a forma Suprema, mas não restaura um Cartucho já gasto.",
    "Escolha a forma em Boot & giros. A arma e sua Way aparecem na ficha PF2e.",
  ]);
}

function mergeAmmo(state, form) {
  const capacity = capacityFor(form);
  if (!capacity || state.encounter.ammo[form.name]) return;
  state.encounter.ammo[form.name] = capacity.kind === "pair"
    ? { kind: "pair", left: capacity.left, right: capacity.right, reload: capacity.reload }
    : { ...capacity, max: capacity.rounds, rounds: capacity.rounds };
}

function currentAmmo(state) {
  const form = state.encounter.current;
  return form?.mode === "G" ? state.encounter.ammo[form.name] : null;
}

function replaceCurrentWithResult(state, mode, result, note = "") {
  if (result === 1) {
    state.encounter.current = { mode, result, ultimateSelect: true, glitch: true, name: "Glitch / Ultimate Select", source: "BLACKWALL", meta: "1 natural · escolha uma das 18 armas Ultimate", effect: "O erro da roleta revela uma forma impossível." };
    if (!state.encounter.cartridge) {
      state.encounter.cartridge = true;
      state.encounter.cartridgeSpent = false;
    }
    return state.encounter.current;
  }
  const weapon = weaponFor(mode, result, state);
  const form = { mode, result, ...weapon };
  state.encounter.current = form;
  if (mode === "G") mergeAmmo(state, form);
  return { ...form, note };
}

async function persistAndRender(actor, mount, state, currency = null) {
  await updateActor(actor, state, currency);
  try {
    await syncVItems(actor, state);
  } catch (error) {
    console.error(`[${MODULE_ID}] managed PF2e item synchronization failed`, error);
    notify("error", "O estado de V foi salvo, mas alguns itens PF2e não sincronizaram. Confira o console do Foundry.");
  }
  renderCurrentProfile(mount, actor, state);
}

function cromaCanInstall(state, index) {
  const croma = cromas[index];
  if (!croma || state.daily.cromaChangeUsed) return false;
  const loadout = cromaLoadout(state);
  const limit = ({ 1: 5, 2: 5, 3: 7, 4: 9, 5: 9 })[state.daily.tier] ?? 5;
  const slots = croma[2].split(" + ");
  const availableTiers = croma[5].match(/T\d/g)?.map(value => Number(value.slice(1))) ?? [];
  const originException = state.daily.tier === 1 && state.settings.cromaStartChoice === "A" && croma[3] === "Common" && [0, 8].includes(index);
  return !state.daily.cromas.includes(index)
    && (originException || availableTiers.some(tier => state.daily.tier >= tier))
    && !slots.some(slot => loadout.slots.has(slot))
    && loadout.weight + Number(croma[4]) <= limit;
}

function encounterReset(state) {
  state.encounter = clone(DEFAULT_STATE.encounter);
  if (state.daily.cromas.includes(5)) state.encounter.cromaAmmo = 3;
}

async function clearTimedCromaConditions(actor, state, { camouflage = false } = {}) {
  if (state.encounter.cromaSandevistanState === "quickened" && actor.hasCondition?.("quickened")) {
    await actor.decreaseCondition("quickened");
  }
  if (state.encounter.cromaSandevistanState === "slowed" && actor.hasCondition?.("slowed")) {
    await actor.decreaseCondition("slowed");
  }
  state.encounter.cromaSandevistanState = null;
  if (camouflage && state.daily.camouflageActive && actor.hasCondition?.("concealed")) {
    await actor.decreaseCondition("concealed");
    state.daily.camouflageActive = false;
  }
}

function dayReset(state) {
  state.daily = {
    ...state.daily,
    tax: null,
    draft: [],
    order: null,
    rerollUsed: false,
    accessoryRoll: null,
    giftBoxUsed: false,
    cromaUses: {},
    cromaChangeUsed: false,
    symptoms: [],
  };
}

function pushSymptom(state, result) {
  const symptom = symptoms[result - 1];
  state.daily.symptoms.push({ roll: result, text: symptom, at: Date.now() });
  return symptom;
}

function baseTotal(state) {
  return state.daily.draft.reduce((sum, index) => sum + (copperFromPdfPrice(martItems[index]?.[2]) ?? 0), 0);
}

function addableMartItem(state, index) {
  const item = martItems[index];
  const tier = Number(item?.[0]?.slice(1));
  const budget = tierBudget(state.daily.tier);
  if (!item || tier > state.daily.tier || tier > 4 || copperFromPdfPrice(item[2]) === null) return false;
  if (state.daily.draft.includes(index)) return true;
  const count = state.daily.draft.length + 1;
  if (count > budget.slots) return false;
  const base = baseTotal(state) + copperFromPdfPrice(item[2]);
  const currentTax = state.daily.tax === 1 ? 0.5 : state.daily.tax === 5 ? 2 : 1;
  const actual = state.daily.draft.reduce((sum, entry) => sum + Math.ceil(copperFromPdfPrice(martItems[entry][2]) * currentTax), 0)
    + Math.ceil(copperFromPdfPrice(item[2]) * currentTax);
  return base <= budget.copper && actual <= budget.copper;
}

function currentCatalogIndex(mode, slot, state) {
  const old = state.catalog.rewrites.find(entry => entry.mode === mode && Number(entry.slot) === slot);
  return old ? null : (mode === "G" ? weaponsG : weaponsS)[slot - 1]?.[0] ?? null;
}

function buildPayUpdate(actor, state, totalCopper) {
  const currency = currencyAfterPurchase(actor, totalCopper);
  const update = { [STATE_PATH]: state };
  for (const denomination of ["cp", "sp", "gp", "pp"]) {
    update[`system.currency.${denomination}`] = currency[denomination];
  }
  return update;
}

async function handleAction(event, app, mount, actor) {
  const control = event.target.closest("[data-v-action]");
  if (!control || !mount.contains(control)) return;
  if (event.type === "click" && control.matches("select[data-v-action]")) return;
  const action = control.dataset.vAction;
  if (action === "tab") {
    saveSectionTab(mount, actor, control.dataset.tab);
    renderProfile(mount, actor, stateFor(actor));
    return;
  }
  if (action === "mode") {
    if (!isOwner(actor)) return;
    const state = stateFor(actor);
    state.encounter.mode = control.dataset.mode === "S" ? "S" : "G";
    await persistAndRender(actor, mount, state);
    return;
  }
  if (action === "search") return;

  if (!isOwner(actor)) {
    notify("warn", "Você não tem permissão para alterar o perfil de V neste personagem.");
    return;
  }

  let state = stateFor(actor);
  try {
    switch (action) {
      case "activate": {
        if (!isGM()) return;
        state = clone(DEFAULT_STATE);
        await actor.update({ [`flags.${MODULE_ID}.active`]: true, [STATE_PATH]: state });
        await syncVItems(actor, state);
        saveSectionTab(mount, actor, "status");
        renderCurrentProfile(mount, actor, state);
        return;
      }
      case "deactivate": {
        if (!isGM()) return;
        await clearTimedCromaConditions(actor, state, { camouflage: true });
        state.active = false;
        await actor.update({ [`flags.${MODULE_ID}.active`]: false, [STATE_PATH]: state });
        await syncVItems(actor, state);
        const root = getUniqueRoot(unwrapElement(undefined, app)) ?? mount.closest(".ethernum-unique-tab");
        if (root) showNativeProfile(root, actor);
        else mount.remove();
        return;
      }
      case "spin": {
        if (state.encounter.spins >= 3) return;
        control.disabled = true;
        const mode = state.encounter.mode;
        const result = await rollDice(actor, 20, `${mode === "G" ? "Gunslinger" : "Swordmaster"} · Boot / giro`);
        await animateDie(mount, result);
        state = stateFor(actor);
        state.encounter.spins = Math.min(3, state.encounter.spins + 1);
        const form = replaceCurrentWithResult(state, mode, result);
        state.encounter.log.push({ mode, result, name: form.name, at: Date.now() });
        await persistAndRender(actor, mount, state);
        await announceGlitch(actor, state, result);
        return;
      }
      case "select-ultimate": {
        const name = control.dataset.name;
        if (!state.encounter.current?.ultimateSelect || !ultimates.some(item => item[1] === name)) return;
        const profile = ultimateProfiles[name];
        if (!profile) throw new Error(`Não encontrei o perfil mecânico de ${name}.`);
        const meta = `${profile.family} · ${profile.dice}${profile.die} ${profile.damageType}${profile.range ? ` · ${profile.range} m` : ""}`;
        const wayId = wayFor(profile.mode, meta);
        state.encounter.current = {
          mode: profile.mode,
          result: 1,
          isUltimate: true,
          glitch: true,
          name,
          source: `Glitch · ${ultimates.find(item => item[1] === name)?.[0] ?? "Ultimate"}`,
          meta,
          effect: profile.signature,
          wayId,
          wayName: wayProfiles[wayId]?.name ?? "",
        };
        state.encounter.mode = profile.mode;
        mergeAmmo(state, state.encounter.current);
        if (state.encounter.log.length) {
          state.encounter.log[state.encounter.log.length - 1].name = name;
          state.encounter.log[state.encounter.log.length - 1].mode = profile.mode;
        }
        await persistAndRender(actor, mount, state);
        await chatReceipt(actor, `ULTIMATE / ${name}`, [profile.signature, `Arma manifestada e vinculada à ${wayProfiles[wayId]?.name ?? "Way"}. O Cartucho permanece ${state.encounter.cartridgeSpent ? "gasto" : "disponível"}.`]);
        return;
      }
      case "use-ultimate": {
        const form = state.encounter.current;
        const profile = form?.isUltimate ? ultimateProfiles[form.name] : null;
        if (!profile || !state.encounter.cartridge || state.encounter.cartridgeSpent) return;
        const ammo = currentAmmo(state);
        if (ammo?.kind === "pair") {
          const hand = ammo.left > 0 ? "left" : ammo.right > 0 ? "right" : null;
          if (!hand) throw new Error("A arma Glitch está sem munição; recarregue antes de gastar o Cartucho.");
          ammo[hand] -= 1;
        } else if (ammo?.kind) {
          if (ammo.rounds <= 0) throw new Error("A arma Glitch está sem munição; recarregue antes de gastar o Cartucho.");
          ammo.rounds -= 1;
        }
        state.encounter.cartridgeSpent = true;
        if (profile.kind === "strike") {
          state.encounter.pendingUltimateBonus = {
            name: form.name,
            formula: profile.bonus,
            damageType: profile.bonusType,
            createdAt: Date.now(),
          };
        }
        await updateActor(actor, state);
        try { await syncVItems(actor, state); } catch (error) { console.error(`[${MODULE_ID}] ultimate weapon sync failed`, error); }
        const actions = ultimates.find(item => item[1] === form.name)?.[3] ?? 2;
        if (profile.kind === "strike") {
          await chatReceipt(actor, `ULTIMATE / ${profile.label ?? form.name}`, [`${actions} ações · 1 Cartucho. ${profile.signature}`, "Faça o Strike pela arma V na ficha PF2e. Se acertar, use o botão de dano pendente no painel para rolar a parcela adicional."]);
          const struck = await rollManifestedStrike(actor, event);
          if (!struck) notify("warn", "Faça o Strike pela arma manifestada na ficha PF2e; o painel mantém o botão para rolar o dano adicional após um acerto.");
          if (form.name === "Master Sword" && actor.hasCondition?.("frightened")) await actor.decreaseCondition("frightened");
          if (form.name === "Devil Sword Dante") await chatReceipt(actor, "DEVIL SWORD DANTE · DEFESA", ["Após o Strike, acertando ou não, aplique +1 circunstancial à CA até o início do próximo turno."]);
        } else {
          await chatReceipt(actor, `ULTIMATE / ${form.name}`, [`${actions} ações · 1 Cartucho. ${profile.signature}`, `Área/alvos: ${profile.area}. Salvamento: ${profile.defense}. Afeta aliados conforme a carta.`]);
          await rollDamageChat(actor, profile.formula, profile.formulaType, `${form.name} · ${profile.area}`);
        }
        renderCurrentProfile(mount, actor, state);
        return;
      }
      case "roll-ultimate-bonus": {
        const pending = state.encounter.pendingUltimateBonus;
        if (!pending?.formula || !/^(?:\d+)d(?:4|6|8|10|12)$/.test(pending.formula)) return;
        await rollDamageChat(actor, pending.formula, pending.damageType, `${pending.name} · dano adicional`);
        state.encounter.pendingUltimateBonus = null;
        await persistAndRender(actor, mount, state);
        return;
      }
      case "new-encounter": {
        if (!isGM()) return;
        await clearTimedCromaConditions(actor, state);
        encounterReset(state);
        await persistAndRender(actor, mount, state);
        return;
      }
      case "new-day": {
        if (!isGM()) return;
        await clearTimedCromaConditions(actor, state, { camouflage: true });
        dayReset(state);
        await persistAndRender(actor, mount, state);
        return;
      }
      case "forced-reroll": {
        if (state.gloveMk < 3 || !state.settings.forcedRerollEnabled || state.daily.rerollUsed || !state.encounter.log.length) return;
        const previous = state.encounter.log.at(-1);
        const mode = previous.mode;
        const result = await rollDice(actor, 20, "Re-giro Forçado · aceite o novo resultado");
        await animateDie(mount, result);
        state = stateFor(actor);
        state.daily.rerollUsed = true;
        const form = replaceCurrentWithResult(state, mode, result, "Re-giro Forçado; aplicar Sintoma do Blackwall.");
        state.encounter.log.push({ mode, result, name: form.name, note: `Re-giro após d20 ${previous.result}; GM aplica Sintoma.`, at: Date.now() });
        await persistAndRender(actor, mount, state);
        await announceGlitch(actor, state, result);
        notify("warn", "Re-giro registrado. O GM aplica um Sintoma do Blackwall.");
        return;
      }
      case "toggle-reroll": {
        if (!isGM() || state.gloveMk < 3) return;
        state.settings.forcedRerollEnabled = !state.settings.forcedRerollEnabled;
        await persistAndRender(actor, mount, state);
        return;
      }
      case "toggle-corrupted": {
        if (!isGM()) return;
        state.corruptedRune = !state.corruptedRune;
        await persistAndRender(actor, mount, state);
        return;
      }
      case "corrupted-jump": {
        if (!state.corruptedRune || !state.encounter.current || state.encounter.current.ultimateSelect) return;
        const mode = state.encounter.current.mode;
        let result = await rollDice(actor, 20, "Runa Estática · falha crítica; nova forma sem Suprema");
        await animateDie(mount, result);
        while (result === 1) result = await rollDice(actor, 20, "Runa Estática · 1 não abre Glitch");
        state = stateFor(actor);
        const form = replaceCurrentWithResult(state, mode, result, "Runa Estática: mudança involuntária de forma.");
        state.encounter.log.push({ mode, result, name: form.name, note: "Runa Estática; GM aplica Sintoma do Blackwall.", at: Date.now() });
        await persistAndRender(actor, mount, state);
        await announceGlitch(actor, state, result);
        notify("warn", "A forma mudou sem escolha. O GM aplica um Sintoma do Blackwall.");
        return;
      }
      case "set-mk": {
        if (!isGM()) return;
        state.gloveMk = Math.max(1, Math.min(5, Number(control.value) || 1));
        if (state.gloveMk < 3) state.settings.forcedRerollEnabled = false;
        await persistAndRender(actor, mount, state);
        return;
      }
      case "set-start-croma": {
        if (!isGM() || state.daily.cromas.length > 0) return;
        const choice = ["A", "B", "C", "undecided"].includes(control.value) ? control.value : "undecided";
        state.settings.cromaStartChoice = choice;
        await persistAndRender(actor, mount, state);
        return;
      }
      case "set-tier": {
        if (!isGM()) return;
        state.daily.tier = Math.max(1, Math.min(4, Number(control.value) || 1));
        state.daily.draft = [];
        await persistAndRender(actor, mount, state);
        return;
      }
      case "tax-roll": {
        if (state.daily.tax !== null || state.daily.order) return;
        const result = await rollDice(actor, 6, "Taxa do Dia do Pocket.Mart");
        state = stateFor(actor);
        state.daily.tax = result;
        let note = `Taxa ${result}: ${result === 1 ? "preço pela metade" : result === 5 ? "preço dobrado" : result === 6 ? "Sintoma do Blackwall; item mais barato dura o dobro" : "preço normal"}.`;
        if (result === 6) {
          const symptomRoll = await rollDice(actor, 10, "Sintoma causado pela Taxa 6");
          note += ` Sintoma d10 ${symptomRoll}: ${pushSymptom(state, symptomRoll)}`;
        }
        await persistAndRender(actor, mount, state);
        notify(result === 6 ? "warn" : "info", note);
        return;
      }
      case "draft-item": {
        const index = Number(control.dataset.index);
        if (state.daily.draft.includes(index)) state.daily.draft = state.daily.draft.filter(entry => entry !== index);
        else if (addableMartItem(state, index)) state.daily.draft.push(index);
        else return;
        await persistAndRender(actor, mount, state);
        return;
      }
      case "clear-draft": {
        state.daily.draft = [];
        await persistAndRender(actor, mount, state);
        return;
      }
      case "confirm-order": {
        if (!state.daily.draft.length || state.daily.tax === null || state.daily.order) return;
        const config = tierBudget(state.daily.tier);
        const base = baseTotal(state);
        const total = draftCosts(state);
        if (state.daily.draft.length > config.slots || base > config.copper || total > config.copper) throw new Error("O carrinho excede slots ou orçamento deste tier.");
        currencyAfterPurchase(actor, total);
        const extendedItemIndex = state.daily.tax === 6
          ? state.daily.draft.reduce((cheapest, index) => {
            if (cheapest === null) return index;
            const itemPrice = copperFromPdfPrice(martItems[index]?.[2]) ?? Number.POSITIVE_INFINITY;
            const cheapestPrice = copperFromPdfPrice(martItems[cheapest]?.[2]) ?? Number.POSITIVE_INFINITY;
            return itemPrice < cheapestPrice ? index : cheapest;
          }, null)
          : null;
        state.daily.order = { items: [...state.daily.draft], baseCopper: base, totalCopper: total, taxRoll: state.daily.tax, extendedItemIndex, createdAt: Date.now() };
        const items = state.daily.draft.map(index => martItems[index]);
        const receiptLines = items.map(item => `${item[1]} — ${item[3]}`);
        if (Number(state.daily.tax) === 6 && Number.isInteger(extendedItemIndex)) receiptLines.push(`Duração dobrada: ${martItems[extendedItemIndex][1]}`);
        receiptLines.push(`Total debitado: ${fmtPdfMoney(total)} · orçamento base: ${fmtPdfMoney(base)}`);
        await actor.update(buildPayUpdate(actor, state, total));
        await chatReceipt(actor, "POCKET.MART · Pedido confirmado", receiptLines);
        renderCurrentProfile(mount, actor, state);
        notify("info", `Pedido registrado e ${fmtPdfMoney(total)} debitados do Actor PF2e. Buffs ficam como lembrete no recibo.`);
        return;
      }
      case "accessory-roll": {
        if (state.daily.accessoryRoll || (state.daily.tier < 3 && !state.settings.allowT2Accessories)) return;
        const result = await rollDice(actor, 20, "Prateleira Rotativa · acessório do dia");
        state = stateFor(actor);
        state.daily.accessoryRoll = result;
        await persistAndRender(actor, mount, state);
        return;
      }
      case "toggle-t2-accessories": {
        if (!isGM() || state.daily.tier >= 3) return;
        state.settings.allowT2Accessories = !state.settings.allowT2Accessories;
        await persistAndRender(actor, mount, state);
        return;
      }
      case "buy-accessory": {
        const index = Number(state.daily.accessoryRoll) - 1;
        const item = accessories[index];
        const price = copperFromPdfPrice(item?.[3]);
        const max = state.daily.tier >= 4 ? 3 : 2;
        if (!item || price === null || state.daily.accessories.length >= max || state.daily.accessories.includes(index)) throw new Error("Este acessório não pode ser comprado pelo preço indicado, já está carregado ou não há espaço.");
        currencyAfterPurchase(actor, price);
        state.daily.accessories.push(index);
        await actor.update(buildPayUpdate(actor, state, price));
        await chatReceipt(actor, "POCKET.MART · Acessório comprado", [`${item[0]} — ${item[2]}`, `Preço debitado: ${fmtPdfMoney(price)}`]);
        renderCurrentProfile(mount, actor, state);
        return;
      }
      case "drop-accessory": {
        const index = Number(control.dataset.index);
        if (!Number.isInteger(index) || !state.daily.accessories.includes(index)) return;
        state.daily.accessories = state.daily.accessories.filter(entry => entry !== index);
        await persistAndRender(actor, mount, state);
        notify("info", "Acessório descartado. O valor não é reembolsado.");
        return;
      }
      case "grant-advance-accessory": {
        if (!isGM() || state.daily.accessoryRoll !== 20) return;
        const index = Number(mount.querySelector("[data-advance-accessory]")?.value);
        const max = state.daily.tier >= 4 ? 3 : 2;
        if (!Number.isInteger(index) || !accessories[index] || index === 19) return;
        if (state.daily.accessories.length >= max || state.daily.accessories.includes(index)) {
          throw new Error("O acessório já está carregado ou V atingiu o limite de espaços.");
        }
        state.daily.accessories.push(index);
        await persistAndRender(actor, mount, state);
        await chatReceipt(actor, "POCKET.MART · Entrega Antecipada", [`Presente escolhido pelo GM: ${accessories[index][0]}`, "Acessório entregue pelo Blackwall; nenhuma moeda foi cobrada."]);
        return;
      }
      case "gift-box": {
        if (!isGM() || state.daily.tier !== 4 || state.daily.giftBoxUsed || state.daily.giftBoxPending) return;
        const item = mount.querySelector("[data-gift-box-item]")?.value?.trim();
        if (!item) throw new Error("Descreva o item que o GM escolheu para a Caixa Entregue Antes.");
        state.daily.giftBoxPending = { item: item.slice(0, 200), createdAt: Date.now() };
        state.daily.giftBoxUsed = true;
        await persistAndRender(actor, mount, state);
        await chatReceipt(actor, "POCKET.MART · Caixa Entregue Antes", [`Presente do GM para amanhã: ${item}`, "Sem cobrança; efeitos e uso ficam a cargo do GM."]);
        return;
      }
      case "resolve-gift-box": {
        if (!isGM() || !state.daily.giftBoxPending) return;
        const deliveredItem = state.daily.giftBoxPending.item;
        state.daily.giftBoxPending = null;
        await persistAndRender(actor, mount, state);
        await chatReceipt(actor, "POCKET.MART · Caixa entregue", [`Presente entregue: ${deliveredItem}`]);
        return;
      }
      case "symptom-roll": {
        const result = await rollDice(actor, 10, "Sintoma do Blackwall");
        state = stateFor(actor);
        const symptom = pushSymptom(state, result);
        await persistAndRender(actor, mount, state);
        notify("warn", `Sintoma d10 ${result}: ${symptom}`);
        return;
      }
      case "install-croma": {
        if (!isGM()) return;
        const index = Number(control.dataset.index);
        if (!cromaCanInstall(state, index)) return;
        const outcome = control.dataset.outcome;
        state.daily.cromaChangeUsed = true;
        state.daily.cromaOutcomes ??= [];
        state.daily.cromaDefects ??= [];
        const croma = cromas[index];
        state.daily.cromaOutcomes.push({ index, outcome, at: Date.now() });
        if (outcome !== "critical") state.daily.cromas.push(index);
        if (outcome !== "critical" && index === 5) state.encounter.cromaAmmo = 3;
        if (outcome === "failure") state.daily.cromaDefects.push(index);
        const imports = [5, 9, 10, 11].includes(index) || croma[3] === "Blackwall";
        if (imports || outcome !== "success") {
          const symptomRoll = await rollDice(actor, 10, "Ruído de Integração de Croma");
          notify("warn", `Sintoma d10 ${symptomRoll}: ${pushSymptom(state, symptomRoll)}`);
        }
        await persistAndRender(actor, mount, state);
        notify(outcome === "critical" ? "warn" : "info", outcome === "critical" ? "O engrama recusou o Croma; o kit foi perdido." : outcome === "failure" ? "Croma criado na ficha PF2e com defeito até recalibração." : "Croma instalado como item PF2e; efeitos passivos compatíveis estão ativos.");
        return;
      }
      case "use-croma": {
        const index = Number(control.dataset.index);
        const activation = cromaActivation[index + 1];
        if (!activation || !state.daily.cromas.includes(index)) return;
        if (index === 5) {
          const charged = control.dataset.charge === "true";
          const rounds = Number(state.encounter.cromaAmmo ?? 3);
          if (rounds <= 0) throw new Error("O Braço-Canhão está vazio; recarregue antes de disparar.");
          state.encounter.cromaAmmo = rounds - 1;
          await persistAndRender(actor, mount, state);
          const struck = await rollManifestedStrike(actor, event, "croma-weapon", "5");
          if (!struck) notify("warn", "Use o Strike do Braço-Canhão C-06 na ficha PF2e.");
          await chatReceipt(actor, "CROMA / BRAÇO-CANHÃO", [
            charged ? "Disparo carregado: custa +1 ação; no acerto, empurre o alvo 3 m." : "Disparo Buster/Arm: Strike da arma C-06; alcance 18 m.",
            `Munição restante: ${state.encounter.cromaAmmo}/3. A recarga completa custa 1 ação.`,
          ]);
          return;
        }
        if (activation.frequency === "encounter") {
          state.encounter.cromaUses ??= {};
          if (Number(state.encounter.cromaUses[index] ?? 0) >= 1) return;
          state.encounter.cromaUses[index] = Number(state.encounter.cromaUses[index] ?? 0) + 1;
        } else if (activation.frequency === "day") {
          state.daily.cromaUses ??= {};
          if (Number(state.daily.cromaUses[index] ?? 0) >= 1) return;
          state.daily.cromaUses[index] = Number(state.daily.cromaUses[index] ?? 0) + 1;
        }
        if (index === 3) {
          await actor.increaseCondition("quickened");
          state.encounter.cromaSandevistanState = "quickened";
        } else if (index === 7) {
          await actor.increaseCondition("concealed");
          state.daily.camouflageActive = true;
        } else if (index === 8) {
          if (actor.hasCondition?.("sickened")) await actor.decreaseCondition("sickened");
          const temp = Number(actor.system?.attributes?.hp?.temp ?? 0);
          await actor.update({ "system.attributes.hp.temp": Math.max(temp, 5) });
        }
        await persistAndRender(actor, mount, state);
        const cromaName = `${cromas[index][0]} · ${activation.label}`;
        const target = index === 1 ? [...(game.user?.targets ?? [])][0] : null;
        const targetLine = index === 1
          ? target ? `Alvo marcado: ${target.name ?? target.actor?.name ?? "alvo selecionado"}. Aplique o +1 circunstancial somente nos Strikes de fogo contra ele até o próximo turno.` : "Selecione um alvo visível até 18 m e aplique +1 circunstancial aos próximos Strikes de fogo contra ele até o próximo turno."
          : "Uso registrado. Confira no item PF2e os limites e a duração indicados na carta.";
        await chatReceipt(actor, `CROMA / ${cromaName}`, [activation.description, targetLine, index === 3 ? "Quickened foi aplicado na ficha. Depois do turno, aplique slowed 1 até o fim do próximo turno." : ""]);
        return;
      }
      case "reload-croma-cannon": {
        if (!state.daily.cromas.includes(5) || Number(state.encounter.cromaAmmo ?? 3) >= 3) return;
        state.encounter.cromaAmmo = 3;
        await persistAndRender(actor, mount, state);
        await chatReceipt(actor, "CROMA / BRAÇO-CANHÃO RECARREGADO", ["Munição restaurada para 3. Gaste 1 ação para recarregar."]);
        return;
      }
      case "finish-sandevistan-turn": {
        if (state.encounter.cromaSandevistanState !== "quickened") return;
        if (actor.hasCondition?.("quickened")) await actor.decreaseCondition("quickened");
        await actor.increaseCondition("slowed");
        state.encounter.cromaSandevistanState = "slowed";
        await persistAndRender(actor, mount, state);
        await chatReceipt(actor, "CROMA / SANDEVISTAN · SOBRECARGA", ["Quickened removido; slowed 1 aplicado até o fim do próximo turno."]);
        return;
      }
      case "finish-sandevistan-slowed": {
        if (state.encounter.cromaSandevistanState !== "slowed") return;
        if (actor.hasCondition?.("slowed")) await actor.decreaseCondition("slowed");
        state.encounter.cromaSandevistanState = null;
        await persistAndRender(actor, mount, state);
        return;
      }
      case "end-camouflage": {
        if (!state.daily.camouflageActive) return;
        if (actor.hasCondition?.("concealed")) await actor.decreaseCondition("concealed");
        state.daily.camouflageActive = false;
        await persistAndRender(actor, mount, state);
        await chatReceipt(actor, "CROMA / CAMUFLAGEM ENCERRADA", ["Remova Concealed quando a duração acabar, V atacar, Stride duas vezes no turno ou a chuva revelar o traje."]);
        return;
      }
      case "remove-croma": {
        if (!isGM() || state.daily.cromaChangeUsed) return;
        const index = Number(control.dataset.index);
        if (!state.daily.cromas.includes(index)) return;
        if (index === 3 && state.encounter.cromaSandevistanState) {
          if (state.encounter.cromaSandevistanState === "quickened" && actor.hasCondition?.("quickened")) await actor.decreaseCondition("quickened");
          if (state.encounter.cromaSandevistanState === "slowed" && actor.hasCondition?.("slowed")) await actor.decreaseCondition("slowed");
          state.encounter.cromaSandevistanState = null;
        }
        if (index === 7 && state.daily.camouflageActive) {
          if (actor.hasCondition?.("concealed")) await actor.decreaseCondition("concealed");
          state.daily.camouflageActive = false;
        }
        if (index === 5) state.encounter.cromaAmmo = null;
        state.daily.cromas = state.daily.cromas.filter(entry => entry !== index);
        state.daily.cromaDefects = (state.daily.cromaDefects ?? []).filter(entry => entry !== index);
        state.daily.cromaChangeUsed = true;
        await persistAndRender(actor, mount, state);
        notify("info", "Croma removido. O kit não retorna e não pode ser reinstalado até outro dia.");
        return;
      }
      case "rewrite": {
        if (!isGM()) return;
        const slot = Number(mount.querySelector("[data-rewrite-slot]")?.value);
        const discovery = Number(mount.querySelector("[data-rewrite-discovery]")?.value);
        const available = Math.max(0, (state.daily.tier >= 3 ? 1 : 0) + (state.daily.tier >= 4 ? 1 : 0));
        if (!slot || state.catalog.rewrites.length >= available || state.catalog.rewrites.some(item => item.mode === state.encounter.mode && Number(item.slot) === slot)) return;
        const previous = currentCatalogIndex(state.encounter.mode, slot, state);
        if (!previous) return;
        state.catalog.rewrites.push({ mode: state.encounter.mode, slot, discovery, previous, at: Date.now() });
        await persistAndRender(actor, mount, state);
        return;
      }
      case "remove-rewrite": {
        if (!isGM()) return;
        state.catalog.rewrites = state.catalog.rewrites.filter(item => item.mode !== control.dataset.mode || Number(item.slot) !== Number(control.dataset.slot));
        await persistAndRender(actor, mount, state);
        return;
      }
      case "fire": {
        const ammo = currentAmmo(state);
        if (!ammo) return;
        if (ammo.kind === "pair") {
          const hand = control.dataset.hand;
          if (!ammo[hand] || ammo[hand] <= 0) return;
          ammo[hand] -= 1;
        } else {
          if (ammo.rounds <= 0) return;
          ammo.rounds -= 1;
        }
        await persistAndRender(actor, mount, state);
        return;
      }
      case "reload": {
        const ammo = currentAmmo(state);
        if (!ammo) return;
        if (ammo.kind === "pair") ammo[control.dataset.hand] = 6;
        else if (ammo.kind === "shell" || ammo.kind === "bullet") ammo.rounds = Math.min(ammo.max, ammo.rounds + 1);
        else ammo.rounds = ammo.max;
        await persistAndRender(actor, mount, state);
        return;
      }
      default:
        return;
    }
  } catch (error) {
    console.error(`[${MODULE_ID}] action failed`, error);
    notify("error", error instanceof Error ? error.message : "Não foi possível atualizar o perfil de V.");
    renderProfile(mount, actor, stateFor(actor));
  }
}

function baseVersionSupported() {
  const version = game.modules.get(BASE_ID)?.version ?? "0.0.0";
  const [major, minor, patch] = String(version).split(".").map(value => Number.parseInt(value, 10) || 0);
  return major > 3 || (major === 3 && (minor > 8 || (minor === 8 && patch >= 11)));
}

function onRenderActorSheet(app, html) {
  const actor = app.actor ?? app.document;
  if (!actor || actor.type !== "character" || !canShowForConcórdia(actor) || !baseVersionSupported()) return;
  const container = unwrapElement(html, app);
  if (!container) return;
  watchUniqueRender(container, app, actor);
}

Hooks.on("renderCharacterSheetPF2e", onRenderActorSheet);
Hooks.on("renderApplicationV2", onRenderActorSheet);
Hooks.on("renderActorSheet", onRenderActorSheet);
Hooks.on("renderChatMessage", (message, html) => {
  const chatType = message.getFlag(MODULE_ID, "chatType");
  if (!chatType) return;
  const root = unwrapElement(html);
  if (!root) return;
  root.classList.add("vred-chat-message", `vred-chat-${String(chatType).replace(/[^a-z0-9_-]/gi, "")}`);
});
Hooks.on("deleteCombat", combat => {
  if (!isGM()) return;
  for (const actor of game.actors) {
    if (actor.getFlag(MODULE_ID, "active") !== true) continue;
    const state = stateFor(actor);
    void clearTimedCromaConditions(actor, state)
      .then(() => {
        encounterReset(state);
        return updateActor(actor, state);
      })
      .then(() => syncVItems(actor, state))
      .catch(error => console.error(`[${MODULE_ID}] encounter reset failed`, error));
  }
});

Hooks.once("ready", () => {
  const base = game.modules.get(BASE_ID);
  if (!base?.active) notify("error", "V RedHand requer Ethernum RPG Module ativo.");
  else if (!baseVersionSupported()) notify("error", "V RedHand requer Ethernum RPG Module v3.8.11 ou posterior.");
});
