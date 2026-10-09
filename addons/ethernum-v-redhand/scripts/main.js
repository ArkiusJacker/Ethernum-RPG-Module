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
import { weaponProfileFor, validateUltimateProfileCatalog, validateWeaponProfileCatalog } from "./weapon-profiles.js";
import { claimEncounterGlitch, classifyStrikeOutcome, consumeTrackedAmmo, createKeyedMutex, isSafeSfxPath, migrateVState } from "./rules.js";
import { soundCategories, soundEffects, soundPath } from "./soundbank.js";
import { createVSoundManager } from "./sound-manager.js";

const MODULE_ID = "ethernum-v-redhand";
const BASE_ID = "ethernum-rpg-module";
const PROFILE_ID = "v-redhand";
const PROFILE_LABEL = "V RedHand - Concórdia";
const HIDDEN_NATIVE_CLASS = "vred-native-hidden";
const STATE_PATH = `flags.${MODULE_ID}.state`;
const pendingRenderObservers = new WeakMap();
const pendingItemSyncs = new WeakMap();
const serializeActorAction = createKeyedMutex();
const soundManager = createVSoundManager(options => {
  const helper = globalThis.AudioHelper ?? foundry.audio?.AudioHelper;
  if (!helper?.play) throw new Error("AudioHelper do Foundry não está disponível.");
  return helper.play(options, false);
});
const pendingCurrencyEvents = new WeakMap();
const playedRecallKnowledgeMessages = new Set();
const vSheetApps = new WeakMap();
const boundCoreRoots = new WeakSet();
const twinPromptClaims = new Set();
let VRedHandCharacterSheet = null;
let vSheetRegistered = false;
const DISCOVERIES = [
  ["Piercer Revolver", "ULTRAKILL", "Pistola · 1d6 perfurante fatal d10 · 18 m · capacidade 6", "Lance de Moeda (1 ação): o próximo Strike neste turno ignora cobertura leve e padrão; se acertar, +1d6 precisão."],
  ["Skippy", "Cyberpunk 2077", "Pistola · 1d6 perfurante fatal d10 · 18 m · capacidade 6", "Mira Conversada (1 ação): marca alvo a 18 m e dá +1 circ. ao próximo Strike; acerto marcado +2 precisão. Ao recarregar, Mata ou Pacifista. Enquanto fala, −2 circ. Stealth."],
  ["Faca de Campanha 4CW", "Night City", "A · 1d6 cortante ou perfurante · agile, finesse · 1,5 m", "1/rodada ao acertar: +1 circ. CA até próximo turno. Contra alvo off-guard, ignora 1 resistência física. Entra quando o Mestre decidir."],
];
const WEAPON_ID = name => `weapon:${name}`;

const DEFAULT_STATE = {
  schemaVersion: 4,
  active: true,
  gloveMk: 1,
  corruptedRune: false,
  settings: { forcedRerollEnabled: false, allowT2Accessories: false, cromaStartChoice: "undecided" },
  catalog: { rewrites: [], customSfx: [] },
  encounter: { spins: 0, cartridge: false, cartridgeSpent: false, mode: "G", current: null, ammo: {}, processedStrikeMessages: [], cromaUses: {}, cromaAmmo: null, cromaSandevistanState: null, pendingUltimateBonus: null, log: [] },
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
    catalog: { ...DEFAULT_STATE.catalog, ...(saved.catalog ?? {}), customSfx: [...(saved.catalog?.customSfx ?? [])] },
    encounter: { ...DEFAULT_STATE.encounter, ...(saved.encounter ?? {}) },
    daily: { ...DEFAULT_STATE.daily, ...(saved.daily ?? {}) },
  };
  return migrateVState(state, saved, {
    weaponFor,
    isUltimateName: name => ultimates.some(item => item[1] === name),
  });
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
  return container?.querySelector?.(".ethernum-unique-tab")
    ?? container?.querySelector?.('.ecs-tab-panel[data-tab="unique"]')
    ?? null;
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

function applyVSheetTheme(app, container, actor) {
  const active = isVProfileActive(actor);
  const appElement = unwrapElement(undefined, app);
  const windowElement = container?.matches?.(".application, .app, .window-app")
    ? container
    : container?.closest?.(".application, .app, .window-app")
      ?? (appElement?.matches?.(".application, .app, .window-app") ? appElement : appElement?.closest?.(".application, .app, .window-app"));
  windowElement?.classList.toggle("vred-sheet-window", active);
  if (windowElement) {
    if (active) windowElement.dataset.vRedhandActorId = actor.id ?? "";
    else delete windowElement.dataset.vRedhandActorId;
  }
  const sheet = container?.matches?.(".ethernum-character-sheet")
    ? container
    : container?.closest?.(".ethernum-character-sheet")
      ?? container?.querySelector?.(".ethernum-character-sheet");
  sheet?.classList.toggle("vred-sheet", active);
}

function syncManagedItemsWhenActive(actor) {
  if (!isVProfileActive(actor) || pendingItemSyncs.has(actor)) return;
  const sync = syncVItems(actor, stateFor(actor))
    .catch(error => console.error(`[${MODULE_ID}] managed item sync failed`, error))
    .finally(() => pendingItemSyncs.delete(actor));
  pendingItemSyncs.set(actor, sync);
}

function getEthernumCharacterSheetClass() {
  const actorConfig = CONFIG.Actor ?? {};
  const registrations = actorConfig.sheetClasses?.character ?? {};
  for (const [id, registrationValue] of Object.entries(registrations)) {
    const registration = asObject(registrationValue);
    const sheetClass = registration.cls ?? registration.sheetClass;
    const scope = String(registration.scope ?? registration.namespace ?? id).toLowerCase();
    const name = String(sheetClass?.name ?? "").toLowerCase();
    if (typeof sheetClass === "function" && (scope.includes(BASE_ID) || name.includes("baseethernumcharactersheet"))) {
      return sheetClass;
    }
  }
  return null;
}

function registerVRedHandCharacterSheet() {
  if (vSheetRegistered) return true;
  const BaseSheet = getEthernumCharacterSheetClass();
  if (!BaseSheet) return false;
  const actorSheetBase = Object.getPrototypeOf(BaseSheet.prototype);
  const baseRender = actorSheetBase?.render;
  const actorCollection = foundry.documents?.collections?.Actors;
  if (typeof actorCollection?.registerSheet !== "function") return false;
  VRedHandCharacterSheet = class extends BaseSheet {
    constructor(...args) {
      super(...args);
      this.vRedhandStandalone = true;
    }

    static get defaultOptions() {
      const base = super.defaultOptions;
      return foundry.utils.mergeObject(base, {
        classes: [...(base.classes ?? []), "vred-sheet-window", "vred-standalone-sheet"],
        width: 1380,
        height: 940,
      }, { inplace: false });
    }

    render(force = false, options = {}) {
      // The base sheet redirects to the PF2e sheet when the actor explicitly
      // prefers it. V's separate window must still render its Concórdia shell.
      return typeof baseRender === "function"
        ? baseRender.call(this, force, options)
        : super.render(force, options);
    }

    async getData(options) {
      const data = await super.getData(options);
      if (!canShowForConcórdia(this.actor)) return data;
      data.shell = {
        ...(data.shell ?? {}),
        id: "concordia",
        themeClass: "concordia-character-sheet",
        title: game.i18n?.localize("ETHERNUM.CharacterSheet.Concordia.Title") ?? "Concórdia",
      };
      data.sheetId = "concordia";
      data.configuredMode = "concordia";
      const keys = [
        ["overview", "ETHERNUM.CharacterSheet.Tabs.Character", "fas fa-user"],
        ["combat", "ETHERNUM.CharacterSheet.Tabs.Combat", "fas fa-swords"],
        ["inventory", "ETHERNUM.CharacterSheet.Tabs.Arsenal", "fas fa-shield-halved"],
        ...(data.ui?.tabs?.some(tab => tab.id === "spellcasting")
          ? [["spellcasting", "ETHERNUM.CharacterSheet.Tabs.Magic", "fas fa-wand-sparkles"]]
          : []),
        ["feats", "ETHERNUM.CharacterSheet.Tabs.Feats", "fas fa-award"],
        ["runes", "ETHERNUM.CharacterSheet.Tabs.Runes", "fas fa-gem"],
        ["unique", "ETHERNUM.CharacterSheet.Tabs.Unique", "fas fa-fingerprint"],
        ["effects", "ETHERNUM.CharacterSheet.Tabs.Effects", "fas fa-burst"],
      ];
      const requestedTab = data.ui?.activeTab;
      data.ui = {
        ...(data.ui ?? {}),
        activeTab: keys.some(([id]) => id === requestedTab) ? requestedTab : "overview",
        tabs: keys.map(([id, key, icon]) => ({
          id,
          icon,
          active: id === (keys.some(([tabId]) => tabId === requestedTab) ? requestedTab : "overview"),
          label: game.i18n?.localize(key) ?? key,
        })),
      };
      return data;
    }
  };
  Object.defineProperty(VRedHandCharacterSheet, "name", { value: "VRedHandCharacterSheet" });
  actorCollection.registerSheet(MODULE_ID, VRedHandCharacterSheet, {
    types: ["character"],
    makeDefault: false,
    label: "V RedHand · ARSENAL.EXE",
  });
  vSheetRegistered = true;
  return true;
}

function openVRedHandCharacterSheet(actor) {
  if (!isVProfileActive(actor)) {
    notify("warn", "Ative V RedHand como mecânica única antes de abrir a ficha cyberpunk.");
    return;
  }
  if (!registerVRedHandCharacterSheet() || !VRedHandCharacterSheet) {
    notify("error", "Não encontrei a ficha Concórdia do Ethernum para montar a ficha separada de V.");
    return;
  }
  const existing = vSheetApps.get(actor);
  if (existing) {
    existing.render(true);
    focusVMechanicTab(existing);
    return existing;
  }
  const sheet = new VRedHandCharacterSheet(actor, {
    editable: isOwner(actor),
  });
  vSheetApps.set(actor, sheet);
  const originalClose = sheet.close.bind(sheet);
  sheet.close = async options => {
    vSheetApps.delete(actor);
    stopVSound(actor, "gui-loop", "v", { playbackId: `v-sheet:${actor.id}:gui-loop` });
    return originalClose(options);
  };
  sheet.render(true);
  const state = stateFor(actor);
  const openSound = findSfx(state, "gui-open");
  const loopSound = findSfx(state, "gui-loop");
  if (openSound) void playVSound(actor, openSound, "v").catch(error => console.warn(`[${MODULE_ID}] GUI open SFX blocked`, error));
  if (loopSound) void playVSound(actor, loopSound, "v", { playbackId: `v-sheet:${actor.id}:gui-loop` }).catch(error => console.warn(`[${MODULE_ID}] GUI loop SFX blocked`, error));
  focusVMechanicTab(sheet);
  return sheet;
}

function focusVMechanicTab(app) {
  let attempts = 0;
  const focus = () => {
    const container = unwrapElement(undefined, app);
    const tab = container?.querySelector?.('[data-sheet-tab="unique"], .sheet-navigation [data-tab="ethernum-unique"]');
    if (tab) {
      tab.click();
      return;
    }
    if (++attempts < 12) setTimeout(focus, 80);
  };
  setTimeout(focus, 0);
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
  if (mount) {
    mount.dataset.vRedhandStandalone = app.vRedhandStandalone === true ? "true" : "false";
    return mount;
  }
  mount = document.createElement("div");
  mount.dataset.vRedhandHost = MODULE_ID;
  mount.dataset.vActorId = actor.id ?? "";
  mount.dataset.vRedhandStandalone = app.vRedhandStandalone === true ? "true" : "false";
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
  if (currentMount?.isConnected) {
    renderProfile(currentMount, actor, state, { includeOpenLink: currentMount.dataset.vRedhandStandalone !== "true" });
  }
}

function refreshActorPanels(actor) {
  const state = stateFor(actor);
  for (const mount of document.querySelectorAll(".vred-addon-host")) {
    if (mount.dataset.vActorId !== (actor.id ?? "")) continue;
    renderProfile(mount, actor, state, { includeOpenLink: mount.dataset.vRedhandStandalone !== "true" });
  }
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
      if (app.vRedhandStandalone === true) applyVSheetTheme(app, currentRoot, actor);
      const currentSelect = currentRoot.querySelector("select.ethernum-unique-profile");
      if (currentSelect) currentSelect.value = PROFILE_ID;
      const mount = ensureMount(currentRoot, app, actor);
      hideNativeProfile(currentRoot, mount);
      if (app.vRedhandStandalone === true) renderCurrentProfile(mount, actor, state);
      else renderSheetLauncher(mount, actor);
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
    if (app.vRedhandStandalone === true) applyVSheetTheme(app, currentRoot, actor);
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
  // Newer Concórdia sheets render an empty-state panel without the legacy
  // profile selector when the base module does not know an external profile.
  // The add-on still needs a mount point there so V can be activated directly.
  if (!select) return canShowForConcórdia(actor) || (app.vRedhandStandalone === true && isVProfileActive(actor));
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
        .then(() => { if (app.vRedhandStandalone === true) applyVSheetTheme(app, root, actor); })
        .then(() => clearTimedCromaConditions(actor, state, { camouflage: true }))
        .then(() => syncVItems(actor, state))
        .catch(error => console.error(`[${MODULE_ID}] could not remove managed items after core switch`, error));
    }, true);
    boundCoreRoots.add(root);
  }
  return true;
}

function integrateUniqueProfile(root, app, actor) {
  const standaloneV = Boolean(actor && app.vRedhandStandalone === true && isVProfileActive(actor));
  if ((!canShowForConcórdia(actor) && !standaloneV) || !bindUniqueProfile(root, app, actor)) return false;
  const select = root.querySelector("select.ethernum-unique-profile");
  if (isVProfileActive(actor)) {
    if (select) select.value = PROFILE_ID;
    const mount = ensureMount(root, app, actor);
    hideNativeProfile(root, mount);
    if (app.vRedhandStandalone === true) {
      applyVSheetTheme(app, root, actor);
      renderProfile(mount, actor, stateFor(actor));
    } else {
      renderSheetLauncher(mount, actor, app);
    }
  } else if (!select && !standaloneV) {
    const mount = ensureMount(root, app, actor);
    hideNativeProfile(root, mount);
    renderActivation(mount, actor);
  } else {
    applyVSheetTheme(app, root, actor);
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
  const ultimate = form?.isUltimate ? ultimateProfiles[form.name] : null;
  const profile = ultimate ?? weaponProfileFor(form);
  if (profile?.ammoKind === "pair") return { kind: "pair", left: Number(profile.capacity), right: Number(profile.capacity), reload: profile.reload?.label ?? "1 ação por pistola" };
  if (profile?.capacity && profile?.ammoKind) return { kind: profile.ammoKind, rounds: Number(profile.capacity), reload: profile.reload?.label ?? "1 ação por munição" };
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
  const wayId = weaponProfileFor({ name, mode })?.wayId ?? wayFor(mode, `${meta ?? ""} ${effect ?? ""}`);
  return { name, source, meta, effect, catalogSlot: slot, wayId, wayName: wayProfiles[wayId]?.name ?? "" };
}

function tabStorageKey(actor) {
  return `${MODULE_ID}:tab:${game.user?.id ?? "user"}:${actor.uuid ?? actor.id ?? "actor"}`;
}

function getSectionTab(mount, actor) {
  const allowed = new Set(["status", "boot", "arsenal", "glove", "store", "experiments", "cromas", "sfx", "campaign"]);
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

function getSfxVolume() {
  try {
    const stored = localStorage.getItem(`${MODULE_ID}:sfx-volume`);
    if (stored === null) return 0.7;
    const value = Number(stored);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.7;
  } catch {
    return 0.7;
  }
}

function getSfxMasterCap() {
  try {
    const value = Number(game.settings.get(MODULE_ID, "sfx-master-cap"));
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.7;
  } catch {
    return 0.7;
  }
}

function findSfx(state, id) {
  return [...soundEffects, ...(state.catalog.customSfx ?? [])].find(sound => sound.id === id) ?? null;
}

async function playVSound(actor, sound, audience, { playbackId = null } = {}) {
  if (sound.loop && soundManager.isSoundPlaying(sound.id)) return;
  const source = soundPath(sound);
  const instanceId = playbackId ?? `${game.user?.id ?? "user"}:${foundry.utils.randomID()}`;
  const channel = sound.category === "09_THEMES" ? "music" : "interface";
  const defaultVolume = Number(sound.defaultVolume ?? 1);
  if (audience === "self") {
    return soundManager.play({ id: instanceId, soundId: sound.id, src: source, loop: Boolean(sound.loop), audience: "self", channel, defaultVolume });
  }
  let recipients = [];
  if (audience === "all") {
    recipients = [...game.users].map(user => user.id);
  } else if (audience === "v") {
    const ownerLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
    recipients = [...game.users]
      .filter(user => !user.isGM && actor.testUserPermission?.(user, ownerLevel))
      .map(user => user.id);
    if (!recipients.length) {
      notify("warn", "Não há jogador com permissão de proprietário para receber o áudio de V.");
      return;
    }
  }
  if (!recipients.length || !game.socket?.emit) throw new Error("Não foi possível distribuir o som para a audiência selecionada.");
  const event = {
    action: "play",
    playbackId: instanceId,
    soundId: sound.id,
    src: source,
    loop: Boolean(sound.loop),
    channel,
    defaultVolume,
    audience,
    recipients,
    senderId: game.user?.id,
    sentAt: Date.now(),
  };
  game.socket.emit(`module.${MODULE_ID}`, event);
  if (recipients.includes(game.user?.id)) {
    await soundManager.play({ id: instanceId, soundId: sound.id, src: source, loop: Boolean(sound.loop), audience, channel, defaultVolume });
  }
}

function stopVSound(actor, soundId, audience = "self", { playbackId } = {}) {
  const id = playbackId ?? soundId;
  if (audience === "self") return soundManager.stop(id);
  const recipients = audience === "all"
    ? [...game.users].map(user => user.id)
    : [...game.users]
      .filter(user => !user.isGM && actor.testUserPermission?.(user, CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3))
      .map(user => user.id);
  if (!recipients.length || !game.socket?.emit) return false;
  game.socket.emit(`module.${MODULE_ID}`, { action: "stop", playbackId: id, recipients, sentAt: Date.now() });
  if (recipients.includes(game.user?.id)) void soundManager.stop(id);
  return true;
}

function soundById(id) {
  return soundEffects.find(sound => sound.id === id) ?? null;
}

function announceVSound(soundId, actor, audience = "all") {
  const sound = soundById(soundId);
  if (!sound) return;
  void playVSound(actor, sound, audience).catch(error => {
    console.error(`[${MODULE_ID}] event sound failed`, error);
    notify("warn", `Não foi possível tocar o áudio do evento “${sound.name}”.`);
  });
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
  <div class="vred-control-row">${isGM() ? `<button class="vred-button" data-v-action="new-encounter">Novo encontro</button><button class="vred-button" data-v-action="new-day">Novo dia</button><button class="vred-button danger" data-v-action="reset-v-data">Reiniciar dados de V</button><button class="vred-button danger" data-v-action="deactivate">Desativar V neste personagem</button>` : ""}</div>`;
}

function renderBoot(state) {
  const mode = state.encounter.mode;
  const form = state.encounter.current;
  let current = `<p class="vred-muted">Nenhum resultado ainda. O primeiro giro ocorre com Into the Fray e iniciativa, sem ação adicional.</p>`;
  if (form?.ultimateSelect) {
    current = `<span class="vred-badge gold vred-glitch-badge">1 NATURAL · BRECHA GLITCH</span><h4>A roleta falhou. O Blackwall respondeu.</h4><p>${state.encounter.cartridge ? "O Cartucho já foi obtido. Escolha uma Ultimate para substituir a forma atual; isso não restaura o Cartucho gasto." : `Uma Ultimate/Glitch foi revelada. Escolha uma das ${ultimates.length} armas e receba 1 Cartucho neste encontro.`}</p><div class="vred-ultimate-grid">${ultimates.map(item => `<button type="button" class="vred-pick" data-v-action="select-ultimate" data-name="${escapeHtml(item[1])}"><strong>${escapeHtml(item[1])}</strong><small>${item[3]} ações · ${escapeHtml(item[2])}</small></button>`).join("")}</div>`;
  } else if (form?.isUltimate) {
    const profile = ultimateProfiles[form.name];
    const ammo = form.mode === "G" ? state.encounter.ammo[form.name] : null;
    const loaded = !ammo || (ammo.kind === "pair" ? ammo.left > 0 || ammo.right > 0 : ammo.rounds > 0);
    current = `<span class="vred-badge gold vred-glitch-badge">GLITCH · ${escapeHtml(form.source)} · d20 1</span><h4>${escapeHtml(form.name)}</h4><p class="vred-muted">${escapeHtml(form.meta)}</p><p><strong>${escapeHtml(profile?.label ?? "Assinatura Suprema")} · ${profile?.kind === "strike" ? "Strike" : "salvamento/área"} · ${ultimates.find(item => item[1] === form.name)?.[3] ?? 2} ações · 1 Cartucho</strong></p><p>${escapeHtml(profile?.signature ?? form.effect)}</p>${ammo?.kind ? `<div class="vred-ammo"><span>Munição da forma: <strong>${ammo.kind === "pair" ? `${ammo.left}/${ammo.right}` : `${ammo.rounds}/${ammo.max}`}</strong></span></div>` : ""}<div class="vred-control-row"><button class="vred-button primary" data-v-action="use-ultimate" ${!state.encounter.cartridge || state.encounter.cartridgeSpent || !loaded ? "disabled" : ""}>${state.encounter.cartridgeSpent ? "Cartucho gasto neste encontro" : !loaded ? "Recarregue a forma antes de usar" : "Usar assinatura Glitch"}</button><span class="vred-badge">${escapeHtml(form.wayName ?? "Way indisponível")}</span></div>`;
  } else if (form) {
    const profile = weaponProfileFor(form);
    const ammo = form.mode === "G" ? state.encounter.ammo[form.name] : null;
    const ammoView = ammo?.kind === "pair"
      ? `<div class="vred-ammo"><span>Carregador esquerdo: <strong>${ammo.left}/6</strong></span><button class="vred-button small" data-v-action="reload" data-hand="left">Recarregar esquerdo · 1 ação</button><span>Carregador direito: <strong>${ammo.right}/6</strong></span><button class="vred-button small" data-v-action="reload" data-hand="right">Recarregar direito · 1 ação</button><p>O painel e os itens PF2e consomem uma munição no Strike correspondente.</p></div>`
      : ammo?.kind ? `<div class="vred-ammo"><span>Munição: <strong>${ammo.rounds}/${ammo.max}</strong></span><button class="vred-button small" data-v-action="reload">Recarregar · ${escapeHtml(ammo.reload)}</button><p>Cada Strike PF2e atualiza esta reserva e o item na ficha.</p></div>`
      : "";
    const damageChoice = profile?.damageOptions?.length > 1
      ? `<div class="vred-control-row"><span>Tipo de dano</span>${profile.damageOptions.map(option => `<button class="vred-button small ${profile.damageType === option.type ? "primary" : ""}" data-v-action="select-damage" data-damage-type="${escapeHtml(option.type)}">${escapeHtml(option.label)}</button>`).join("")}</div>`
      : "";
    const specialActions = profile?.specialActions?.length
      ? `<div class="vred-callout"><strong>Ações especiais registradas na ficha PF2e</strong>${profile.specialActions.map(action => `<p>${escapeHtml(action.name)} · ${action.actions} ação(ões): ${escapeHtml(action.description)}</p>`).join("")}</div>`
      : "";
    current = `<span class="vred-badge">${form.mode === "G" ? "Gunslinger" : "Swordmaster"} · d20 ${form.result}</span><h4>${escapeHtml(form.name)}</h4><p class="vred-muted">${escapeHtml(form.source)} · ${escapeHtml(form.meta)}</p><p>${escapeHtml(form.effect)}</p><p class="vred-way-line"><strong>${escapeHtml(form.wayName ?? "Way correspondente")}</strong> · ${escapeHtml(wayProfiles[form.wayId]?.initial ?? "Way/perks ativos na ficha PF2e")}</p>${damageChoice}${specialActions}${ammoView}`;
  }
  const canReroll = state.gloveMk >= 3 && state.settings.forcedRerollEnabled && !state.daily.rerollUsed && state.encounter.log.length > 0;
  return `<div class="vred-controls"><div class="vred-segment"><button type="button" data-v-action="mode" data-mode="G" class="${mode === "G" ? "selected" : ""}">Gunslinger</button><button type="button" data-v-action="mode" data-mode="S" class="${mode === "S" ? "selected" : ""}">Swordmaster</button></div><button type="button" class="vred-button primary" data-v-action="spin" ${state.encounter.spins >= 3 ? "disabled" : ""}>Girar d20 · ${state.encounter.spins}/3</button>${isGM() ? `<button type="button" class="vred-button" data-v-action="new-encounter">Novo encontro</button>` : ""}</div>
  <div class="vred-roll-layout"><div class="vred-die" data-die>${form?.result ?? "—"}</div><div class="vred-current">${current}</div></div>
  ${state.encounter.pendingUltimateBonus ? (() => {
    const pending = state.encounter.pendingUltimateBonus;
    if (pending.status === "ready") return `<div class="vred-callout vred-pending-bonus"><strong>Strike confirmado · ${pending.degree === "critical" ? "crítico" : "acerto"}</strong><p>${escapeHtml(pending.name)} · ${pending.degree === "critical" ? "dano adicional dobrado no crítico" : "dano adicional normal"} · mensagem ${escapeHtml(pending.messageId ?? "PF2e")}</p><button class="vred-button primary small" data-v-action="roll-ultimate-bonus">Rolar +${escapeHtml(pending.formula)} ${escapeHtml(pending.damageType)}${pending.degree === "critical" ? " ×2" : ""}</button></div>`;
    if (pending.status === "needs-confirmation") return `<div class="vred-callout vred-pending-bonus"><strong>Confirme o resultado do Strike</strong><p>Não consegui ler o grau de sucesso da mensagem PF2e. Só libere o dano adicional se a rolagem vinculada foi um acerto.</p><button class="vred-button primary small" data-v-action="confirm-ultimate-hit">Registrar acerto</button><button class="vred-button danger small" data-v-action="cancel-ultimate-bonus">Registrar falha / cancelar</button></div>`;
    return `<div class="vred-callout vred-pending-bonus"><strong>Strike da assinatura aguardando</strong><p>${escapeHtml(pending.name)} · o dano adicional só será liberado após confirmar esta rolagem.</p><button class="vred-button danger small" data-v-action="cancel-ultimate-bonus">Cancelar bônus</button></div>`;
  })() : ""}
  <div class="vred-grid two" style="margin-top:14px">${card("Re-giro Forçado · proposta / decisão 09", `<p>Mk III+. Uma vez por dia, depois de ver o resultado; aceite o novo d20, inclusive 1 ou 20. O GM aplica um Sintoma.</p><p>Estado: ${state.settings.forcedRerollEnabled ? "experimento habilitado" : "desligado até decisão do GM"} · ${state.daily.rerollUsed ? "usado hoje" : "disponível"}</p><button class="vred-button" data-v-action="forced-reroll" ${!canReroll ? "disabled" : ""}>Forçar re-giro</button>${isGM() ? `<button class="vred-button small" data-v-action="toggle-reroll">${state.settings.forcedRerollEnabled ? "Desabilitar proposta" : "Habilitar proposta"}</button>` : ""}`, "gold")}
  ${card("Glitch / Ultimate", `<p>Um 1 natural abre a revelação Glitch e permite escolher uma das ${ultimates.length} Supremas. O primeiro 1 do encontro concede 1 Cartucho; outros 1 podem trocar a forma, sem restaurá-lo.</p><p>Cartucho: <strong>${!state.encounter.cartridge ? "não obtido" : state.encounter.cartridgeSpent ? "gasto" : "disponível"}</strong></p><p>A arma e as ações da Way ativa aparecem na ficha PF2e; a assinatura Ultimate é acionada neste painel. Escolher outro Glitch atualiza arma e Way.</p>`)}
  ${card("Regras de encontro", `<p>Até 3 giros; cada um depois do primeiro custa 1 ação. Trocar e voltar não recarrega a forma. Boot inclui sacar o vínculo; Pares e formas de duas mãos ocupam ambas as mãos.</p><p>Munição inicial por forma é a proposta do v0.5 e pode ser revisada após a decisão 05.</p>`)}</div>
  <div class="vred-section-title"><span class="vred-kicker">HISTÓRICO DO ENCONTRO</span></div><div class="vred-log">${state.encounter.log.length ? state.encounter.log.slice().reverse().map(entry => `<div><span>${entry.mode === "G" ? "Gunslinger" : "Swordmaster"} · d20 ${entry.result}</span><strong>${escapeHtml(entry.name)}</strong>${entry.selectedUltimate ? `<small>Glitch revelada · Ultimate escolhida: ${escapeHtml(entry.selectedUltimate)}</small>` : ""}${entry.note ? `<small>${escapeHtml(entry.note)}</small>` : ""}</div>`).join("") : `<p class="vred-muted">Nenhum giro registrado.</p>`}</div>`;
}

function renderGlove(state) {
  const names = ["Redhand", "RedCoat", "The Dealer", "Blackwall recusada", "Além de Night City"];
  const tiers = [
    "+1 potência, striking, 1 slot", "+2 potência, striking, 2 slots", "+2, greater striking, 2 slots", "+3, greater striking, 3 slots", "+3, major striking, 3 slots",
  ];
  return `<div class="vred-grid two">${card(`Luva Sintonizadora Redhand · Mk ${state.gloveMk} · ${names[state.gloveMk - 1]}`, `<p>${tiers[state.gloveMk - 1]}</p><p>A Luva aplica runas à forma manifestada (incluindo ambas as pistolas dos Pares). Não alcança Cromas nem armas de terceiros.</p>${isGM() ? `<label class="vred-field">Camada da Luva<select data-v-action="set-mk">${names.map((name, i) => `<option value="${i + 1}" ${state.gloveMk === i + 1 ? "selected" : ""}>Mk ${i + 1} · ${name}</option>`).join("")}</select></label>` : ""}`, "red")}
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

function renderSfx(state) {
  const custom = state.catalog.customSfx ?? [];
  const available = [...soundEffects, ...custom];
  return `<div class="vred-sfx-intro"><div><span class="vred-kicker">V SOUNDBANK · ${available.length} ÁUDIOS</span><p>Escolha quem escuta cada som. “Só V” envia apenas aos jogadores que possuem este Actor; “Todos” transmite para a mesa. O slider local muda o volume em reprodução. Os arquivos ficam em <code>modules/ethernum-v-redhand/audio/</code>.</p></div><label class="vred-sfx-volume">Meu volume <input type="range" min="0" max="1" step="0.05" value="${getSfxVolume()}" data-v-sfx-volume></label></div>
  <div class="vred-control-row"><button class="vred-button" data-v-action="stop-my-sounds">Parar todos os meus sons</button>${isGM() ? `<label class="vred-sfx-volume">Limite compartilhado <input type="range" min="0" max="1" step="0.05" value="${getSfxMasterCap()}" data-v-action="set-sfx-master-cap"></label><button class="vred-button danger" data-v-action="stop-shared-audio">Parar áudio para a mesa</button><button class="vred-button primary" data-v-action="play-event-sfx" data-sfx-id="mission-complete">Missão concluída</button><button class="vred-button primary" data-v-action="play-event-sfx" data-sfx-id="level-up">Level up</button>` : ""}</div>
  ${soundCategories.map(([id, label, description]) => {
    const entries = available.filter(sound => sound.category === id);
    return entries.length ? `<section class="vred-sfx-category"><header><div><span class="vred-kicker">${escapeHtml(id)}</span><h4>${escapeHtml(label)}</h4><p>${escapeHtml(description)}</p></div><span class="vred-badge">${entries.length}</span></header><div class="vred-sfx-list">${entries.map(sound => `<article class="vred-sfx-row"><div><strong>${escapeHtml(sound.name)}</strong><small>${sound.path ? escapeHtml(sound.path) : `${escapeHtml(sound.category)}/${escapeHtml(sound.file)}`} · gatilho: ${escapeHtml(sound.trigger ?? "manual")} · ${sound.loop ? "loop" : "som pontual"} · ${soundManager.isSoundPlaying(sound.id) ? "tocando neste cliente" : "parado neste cliente"}</small></div><div class="vred-sfx-actions"><button class="vred-button small" data-v-action="play-sfx" data-sfx-id="${escapeHtml(sound.id)}" data-audience="self">Só eu</button><button class="vred-button small" data-v-action="play-sfx" data-sfx-id="${escapeHtml(sound.id)}" data-audience="v">Só V</button><button class="vred-button small primary" data-v-action="play-sfx" data-sfx-id="${escapeHtml(sound.id)}" data-audience="all">Todos</button><button class="vred-button small" data-v-action="stop-sfx" data-sfx-id="${escapeHtml(sound.id)}">Parar aqui</button>${isGM() && sound.custom ? `<button class="vred-button small danger" data-v-action="remove-sfx" data-sfx-id="${escapeHtml(sound.id)}">Remover</button>` : ""}</div></article>`).join("")}</div></section>` : "";
  }).join("")}
  ${isGM() ? `<section class="vred-card vred-sfx-register"><h4>Adicionar áudio ao banco</h4><p>Copie o arquivo para uma categoria dentro de <code>audio/</code> e registre o caminho abaixo. Os demais clientes precisam ter acesso ao arquivo servido pelo Foundry.</p><div class="vred-sfx-register__fields"><label>Nome<input type="text" data-v-sfx-name placeholder="Nome do efeito"></label><label>Categoria<select data-v-sfx-category>${soundCategories.map(([id,label]) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`).join("")}</select></label><label class="wide">Caminho<input type="text" data-v-sfx-path placeholder="modules/ethernum-v-redhand/audio/00_CORE/meu-som.mp3"></label><button class="vred-button primary" data-v-action="add-sfx">Registrar áudio</button></div></section>` : ""}`;
}

function renderProfile(mount, actor, state, { includeOpenLink = false } = {}) {
  const tab = getSectionTab(mount, actor);
  const tabs = [
    ["status", "Resumo"], ["boot", "Boot & giros"], ["arsenal", "Catálogo"],
    ["glove", "Luva"], ["store", "Pocket.Mart"], ["experiments", "Experimentos"],
    ["cromas", "Cromas"], ["sfx", "SFX"], ["campaign", "Campanha"],
  ];
  const renderers = {
    status: () => renderStatus(state, actor), boot: () => renderBoot(state), arsenal: () => renderArsenal(state),
    glove: () => renderGlove(state), store: () => renderStore(state, actor),
    experiments: () => renderExperiments(state, actor), cromas: () => renderCromas(state), sfx: () => renderSfx(state), campaign: () => renderCampaign(state),
  };
  mount.innerHTML = `<section class="vred-panel" data-v-profile="v-redhand"><header class="vred-header"><div><span class="vred-kicker">MECÂNICA ÚNICA · CONCÓRDIA</span><h3>V <em>REDHAND</em></h3><p>ARSENAL.EXE · regras v0.5 Reboot · extensão v${escapeHtml(game.modules.get(MODULE_ID)?.version ?? "0.3.2")}</p></div><div class="vred-header-state"><span class="vred-badge red">MK ${state.gloveMk}</span><span class="vred-badge">GIROS ${state.encounter.spins}/3</span><span class="vred-badge gold">${state.encounter.cartridge ? "CARTUCHO" : "SEM CARTUCHO"}</span>${includeOpenLink ? `<button type="button" class="vred-button primary small" data-v-action="open-sheet">Abrir ficha individual</button>` : ""}</div></header>
  <nav class="vred-nav" aria-label="Painel de V">${tabs.map(([id, label]) => tabButton(id, label, id === tab)).join("")}</nav>
  <div class="vred-body">${renderers[tab]?.() ?? renderers.status()}</div>
  <footer class="vred-footer"><span>Regras v0.5 Reboot · extensão v${escapeHtml(game.modules.get(MODULE_ID)?.version ?? "0.3.2")} · playtest</span><span>${isOwner(actor) ? "Você pode controlar este painel." : "Somente leitura: peça ao GM para ajustar o personagem."}</span>${isGM() ? `<button class="vred-button small danger" data-v-action="deactivate">Desativar perfil V</button>` : ""}</footer>
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
  const volume = mount.querySelector("[data-v-sfx-volume]");
  volume?.addEventListener("input", () => {
    try { localStorage.setItem(`${MODULE_ID}:sfx-volume`, String(volume.value)); } catch { /* local audio preference only */ }
    void soundManager.setLocalVolume(volume.value);
  });
  const masterCap = mount.querySelector('[data-v-action="set-sfx-master-cap"]');
  masterCap?.addEventListener("input", () => void soundManager.setMasterCap(masterCap.value));
}

function renderSheetLauncher(mount, actor) {
  renderProfile(mount, actor, stateFor(actor), { includeOpenLink: true });
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

async function rollDamageChat(actor, formula, damageType, flavor, multiplier = 1) {
  const totalFormula = multiplier > 1 ? `${multiplier} * (${formula})` : formula;
  const roll = await new Roll(totalFormula).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `V · ${flavor} · ${totalFormula} ${damageType}`,
    flags: { [MODULE_ID]: { chatType: "ultimate-damage", damageType, formula, multiplier } },
  });
  return roll.total;
}

async function announceGlitch(actor, state, result, eventId) {
  if (result !== 1) return;
  const entry = state.encounter.log.find(item => item.eventId === eventId);
  if (!entry || entry.announcedAt) return;
  entry.announcedAt = Date.now();
  await updateActor(actor, state);
  const glitchCount = state.encounter.log.filter(item => item.glitch || item.result === 1).length;
  await chatReceipt(actor, "BLACKWALL / GLITCH REVELADA", [
    "1 natural. Por um instante, a roleta parece ter falhado.",
    "A tela fica vermelha, o ruído some e uma arma impossível atravessa o Blackwall.",
    entry.cartridgeGranted ? "A mesa recebe a revelação: uma Ultimate à escolha e 1 Cartucho para este encontro." : "A Glitch pode trocar a forma Suprema, mas não restaura um Cartucho já gasto.",
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

function replaceCurrentWithResult(state, mode, result, note = "", eventId = `roll-${Date.now()}`) {
  if (result === 1) {
    const glitch = claimEncounterGlitch(state.encounter, eventId);
    state.encounter.current = { mode, result, eventId, ultimateSelect: true, glitch: true, name: "Glitch / Ultimate Select", source: "BLACKWALL", meta: `1 natural · escolha uma das ${ultimates.length} armas Ultimate`, effect: "O erro da roleta revela uma forma impossível." };
    state.encounter.current.cartridgeGranted = glitch.cartridgeGranted;
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
  const control = event.target.closest?.("[data-v-action]");
  if (!control || !mount.contains(control)) return;
  const wasDisabled = control.disabled;
  control.disabled = true;
  try {
    return await serializeActorAction(actor, () => handleActionUnlocked(event, app, mount, actor));
  } finally {
    if (control.isConnected && !wasDisabled) control.disabled = false;
  }
}

async function handleActionUnlocked(event, app, mount, actor) {
  const control = event.target.closest("[data-v-action]");
  if (!control || !mount.contains(control)) return;
  if (event.type === "click" && control.matches("select[data-v-action]")) return;
  const action = control.dataset.vAction;
  if (action === "open-sheet") {
    openVRedHandCharacterSheet(actor);
    return;
  }
  if (action === "play-sfx") {
    if (!isOwner(actor)) return;
    const sound = findSfx(stateFor(actor), control.dataset.sfxId);
    if (!sound) return;
    try {
      const audience = control.dataset.audience ?? "self";
      const playbackId = sound.loop ? `loop:${game.user?.id}:${actor.id}:${sound.id}:${audience}` : null;
      await playVSound(actor, sound, audience, { playbackId });
    } catch (error) {
      console.error(`[${MODULE_ID}] sound playback failed`, error);
      notify("error", `Não foi possível tocar “${sound.name}”. Confira se o arquivo existe no banco de SFX.`);
    }
    return;
  }
  if (action === "stop-sfx") {
    if (!isOwner(actor)) return;
    await soundManager.stopBySoundId(control.dataset.sfxId);
    refreshActorPanels(actor);
    return;
  }
  if (action === "stop-my-sounds") {
    await soundManager.stopAll();
    refreshActorPanels(actor);
    return;
  }
  if (action === "play-event-sfx") {
    if (!isGM() || !["mission-complete", "level-up"].includes(control.dataset.sfxId)) return;
    announceVSound(control.dataset.sfxId, actor, "all");
    return;
  }
  if (action === "stop-shared-audio") {
    if (!isGM()) return;
    await game.settings.set(MODULE_ID, "shared-audio-command", { id: foundry.utils.randomID(), action: "stop-shared" });
    return;
  }
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
        // Activating the profile is not a data reset. Keep encounter/day progress,
        // Luva, rewrites, sounds, Cromas and user settings across reactivation.
        state.active = true;
        state.schemaVersion = DEFAULT_STATE.schemaVersion;
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
        stopVSound(actor, "gui-loop", "v", { playbackId: `v-sheet:${actor.id}:gui-loop` });
        const root = getUniqueRoot(unwrapElement(undefined, app)) ?? mount.closest(".ethernum-unique-tab");
        if (root) showNativeProfile(root, actor);
        else mount.remove();
        return;
      }
      case "reset-v-data": {
        if (!isGM()) return;
        const confirmReset = globalThis.Dialog?.confirm
          ? await Dialog.confirm({
            title: "Reiniciar dados de V?",
            content: "<p>Isso apaga Luva Mk, histórico e estado de encontro/dia, catálogo personalizado, SFX adicionados, Cromas, compras, sintomas e preferências de V.</p><p>Essa ação não pode ser desfeita.</p>",
          })
          : globalThis.confirm?.("Reiniciar todos os dados de V? Isso apaga progresso, histórico, catálogo, SFX, Cromas e compras.") ?? false;
        if (!confirmReset) return;
        state = clone(DEFAULT_STATE);
        state.active = true;
        await actor.update({ [`flags.${MODULE_ID}.active`]: true, [STATE_PATH]: state });
        await syncVItems(actor, state);
        renderCurrentProfile(mount, actor, state);
        notify("info", "Os dados de V foram reiniciados.");
        return;
      }
      case "spin": {
        if (state.encounter.spins >= 3) return;
        control.disabled = true;
        const mode = state.encounter.mode;
        const eventId = foundry.utils.randomID();
        const result = await rollDice(actor, 20, `${mode === "G" ? "Gunslinger" : "Swordmaster"} · Boot / giro`);
        await animateDie(mount, result);
        state = stateFor(actor);
        if (state.encounter.log.some(entry => entry.eventId === eventId) || state.encounter.spins >= 3) return;
        state.encounter.spins = Math.min(3, state.encounter.spins + 1);
        const form = replaceCurrentWithResult(state, mode, result, "", eventId);
        state.encounter.log.push({ eventId, mode, result, name: result === 1 ? "Glitch revelada · Blackwall" : form.name, selectedUltimate: null, glitch: result === 1, cartridgeGranted: result === 1 && Boolean(form.cartridgeGranted), at: Date.now() });
        await persistAndRender(actor, mount, state);
        await announceGlitch(actor, state, result, eventId);
        if (result === 1) announceVSound("blackwall-recalculate", actor, "all");
        return;
      }
      case "select-ultimate": {
        const name = control.dataset.name;
        if (!state.encounter.current?.ultimateSelect || !ultimates.some(item => item[1] === name)) return;
        const profile = ultimateProfiles[name];
        if (!profile) throw new Error(`Não encontrei o perfil mecânico de ${name}.`);
        const glitchEventId = state.encounter.current.eventId;
        const meta = `${profile.family} · ${profile.dice}${profile.die} ${profile.damageType}${profile.range ? ` · ${profile.range} m` : ""}`;
        const wayId = profile.wayId ?? wayFor(profile.mode, meta);
        state.encounter.current = {
          eventId: glitchEventId,
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
        const glitchRecord = state.encounter.log.find(entry => entry.eventId === state.encounter.current.eventId);
        if (glitchRecord) {
          glitchRecord.selectedUltimate = name;
          glitchRecord.selectedAt = Date.now();
        }
        await persistAndRender(actor, mount, state);
        await chatReceipt(actor, `ULTIMATE / ${name}`, [profile.signature, `Arma manifestada e vinculada à ${wayProfiles[wayId]?.name ?? "Way"}. O Cartucho permanece ${state.encounter.cartridgeSpent ? "gasto" : "disponível"}.`]);
        return;
      }
      case "use-ultimate": {
        const form = state.encounter.current;
        const profile = form?.isUltimate ? ultimateProfiles[form.name] : null;
        if (!profile || !state.encounter.cartridge || state.encounter.cartridgeSpent) return;
        const beforeUse = clone(state);
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
            id: foundry.utils.randomID(),
            status: "awaiting-strike",
            name: form.name,
            formula: profile.bonus,
            damageType: profile.bonusType,
            ammoPrepaid: true,
            createdAt: Date.now(),
            expiresAt: Date.now() + 120_000,
            combatId: game.combat?.id ?? null,
            round: game.combat?.round ?? null,
            turn: game.combat?.turn ?? null,
          };
        }
        await updateActor(actor, state);
        try {
          await syncVItems(actor, state);
        } catch (error) {
          await updateActor(actor, beforeUse).catch(() => {});
          throw error;
        }
        const actions = ultimates.find(item => item[1] === form.name)?.[3] ?? 2;
        if (profile.kind === "strike") {
          const pending = state.encounter.pendingUltimateBonus;
          const weapon = actor.items.find(item => item.getFlag?.(MODULE_ID, "managedRole") === "manifested-weapon");
          if (!weapon) {
            await updateActor(actor, beforeUse);
            await syncVItems(actor, beforeUse).catch(() => {});
            throw new Error("A arma da Ultimate não apareceu no inventário; o Cartucho e a munição foram devolvidos.");
          }
          pending.itemId = weapon.id;
          await updateActor(actor, state);
          await chatReceipt(actor, `ULTIMATE / ${profile.label ?? form.name}`, [`${actions} ações · 1 Cartucho. ${profile.signature}`, "A rolagem abaixo fica vinculada ao bônus. O dano adicional só será liberado se o Strike acertar."]);
          const struck = await rollManifestedStrike(actor, event);
          if (!struck) {
            await updateActor(actor, beforeUse);
            await syncVItems(actor, beforeUse).catch(() => {});
            notify("warn", "O PF2e não forneceu o Strike da arma. Cartucho e munição foram devolvidos; tente novamente pela ficha.");
            renderCurrentProfile(mount, actor, beforeUse);
            return;
          }
          announceVSound("relic-malfunction", actor, "v");
          if (form.name === "Master Sword" && actor.hasCondition?.("frightened")) await actor.decreaseCondition("frightened");
          if (form.name === "Devil Sword Dante") await chatReceipt(actor, "DEVIL SWORD DANTE · DEFESA", ["Após o Strike, acertando ou não, aplique +1 circunstancial à CA até o início do próximo turno."]);
        } else {
          await chatReceipt(actor, `ULTIMATE / ${form.name}`, [`${actions} ações · 1 Cartucho. ${profile.signature}`, `Área/alvos: ${profile.area}. Salvamento: ${profile.defense}. Afeta aliados conforme a carta.`]);
          await rollDamageChat(actor, profile.formula, profile.formulaType, `${form.name} · ${profile.area}`);
          announceVSound("relic-malfunction", actor, "v");
        }
        renderCurrentProfile(mount, actor, state);
        return;
      }
      case "roll-ultimate-bonus": {
        const pending = state.encounter.pendingUltimateBonus;
        if (pending?.status !== "ready" || !pending.formula || !/^(?:\d+)d(?:4|6|8|10|12)$/.test(pending.formula)) return;
        if (Date.now() > Number(pending.expiresAt ?? 0)) {
          state.encounter.pendingUltimateBonus = null;
          await persistAndRender(actor, mount, state);
          notify("warn", "O dano adicional expirou; a rolagem vinculada é antiga.");
          return;
        }
        if (pending.combatId && (pending.combatId !== game.combat?.id || pending.round !== game.combat?.round || pending.turn !== game.combat?.turn)) {
          state.encounter.pendingUltimateBonus = null;
          await persistAndRender(actor, mount, state);
          notify("warn", "O turno mudou; o dano adicional pendente expirou.");
          return;
        }
        pending.status = "rolling";
        await updateActor(actor, state);
        try {
          const multiplier = pending.degree === "critical" ? 2 : 1;
          await rollDamageChat(actor, pending.formula, pending.damageType, `${pending.name} · dano adicional${multiplier === 2 ? " · crítico ×2" : ""}`, multiplier);
          state = stateFor(actor);
          state.encounter.pendingUltimateBonus = null;
          await persistAndRender(actor, mount, state);
        } catch (error) {
          state = stateFor(actor);
          if (state.encounter.pendingUltimateBonus?.id === pending.id) {
            state.encounter.pendingUltimateBonus.status = "ready";
            await updateActor(actor, state);
          }
          throw error;
        }
        return;
      }
      case "confirm-ultimate-hit": {
        const pending = state.encounter.pendingUltimateBonus;
        if (pending?.status !== "needs-confirmation") return;
        pending.status = "ready";
        pending.degree = "success";
        pending.confirmedBy = game.user?.id;
        pending.confirmedAt = Date.now();
        await persistAndRender(actor, mount, state);
        return;
      }
      case "cancel-ultimate-bonus": {
        if (!state.encounter.pendingUltimateBonus) return;
        state.encounter.pendingUltimateBonus = null;
        await persistAndRender(actor, mount, state);
        return;
      }
      case "select-damage": {
        const form = state.encounter.current;
        const profile = form && weaponProfileFor(form);
        const damageType = control.dataset.damageType;
        if (!form || !profile?.damageOptions?.some(option => option.type === damageType)) return;
        form.damageChoice = damageType;
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
        const eventId = foundry.utils.randomID();
        const result = await rollDice(actor, 20, "Re-giro Forçado · aceite o novo resultado");
        await animateDie(mount, result);
        state = stateFor(actor);
        state.daily.rerollUsed = true;
        if (state.encounter.log.some(entry => entry.eventId === eventId)) return;
        const form = replaceCurrentWithResult(state, mode, result, "Re-giro Forçado; aplicar Sintoma do Blackwall.", eventId);
        state.encounter.log.push({ eventId, mode, result, name: result === 1 ? "Glitch revelada · Blackwall" : form.name, selectedUltimate: null, glitch: result === 1, cartridgeGranted: result === 1 && Boolean(form.cartridgeGranted), note: `Re-giro após d20 ${previous.result}; GM aplica Sintoma.`, at: Date.now() });
        await persistAndRender(actor, mount, state);
        await announceGlitch(actor, state, result, eventId);
        if (result === 1) announceVSound("blackwall-recalculate", actor, "all");
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
          const struck = await rollManifestedStrike(actor, event, "croma-weapon", "5");
          if (!struck) {
            notify("warn", "Não encontrei o Strike do Braço-Canhão C-06. Munição preservada.");
            return;
          }
          await chatReceipt(actor, "CROMA / BRAÇO-CANHÃO", [
            charged ? "Disparo carregado: custa +1 ação; no acerto, empurre o alvo 3 m." : "Disparo Buster/Arm: Strike da arma C-06; alcance 18 m.",
            "O Strike da arma C-06 consome a munição quando o card PF2e é criado; a recarga completa custa 1 ação.",
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
      case "add-sfx": {
        if (!isGM()) return;
        const name = mount.querySelector("[data-v-sfx-name]")?.value?.trim();
        const category = mount.querySelector("[data-v-sfx-category]")?.value;
        const path = mount.querySelector("[data-v-sfx-path]")?.value?.trim().replaceAll("\\", "/");
        if (!name || !soundCategories.some(([id]) => id === category)) throw new Error("Informe um nome e uma categoria para o áudio.");
        if (!isSafeSfxPath(path)) {
          throw new Error("O caminho precisa apontar para um áudio dentro da pasta audio/ da extensão.");
        }
        state.catalog.customSfx ??= [];
        state.catalog.customSfx.push({ id: `custom-${foundry.utils.randomID()}`, name, category, path, audience: "all", custom: true });
        await persistAndRender(actor, mount, state);
        return;
      }
      case "set-sfx-master-cap": {
        if (!isGM()) return;
        const cap = Math.max(0, Math.min(1, Number(control.value) || 0));
        await game.settings.set(MODULE_ID, "sfx-master-cap", cap);
        await soundManager.setMasterCap(cap);
        renderCurrentProfile(mount, actor, state);
        return;
      }
      case "remove-sfx": {
        if (!isGM()) return;
        state.catalog.customSfx = (state.catalog.customSfx ?? []).filter(sound => sound.id !== control.dataset.sfxId);
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

function registerVSoundSettings() {
  game.settings.register(MODULE_ID, "sfx-master-cap", {
    name: "ARSENAL.EXE · Limite global de volume SFX",
    hint: "Limite máximo enviado para áudio compartilhado; cada ouvinte ainda controla seu próprio volume local.",
    scope: "world",
    config: false,
    type: Number,
    default: 0.7,
  });
  game.settings.register(MODULE_ID, "shared-audio-command", {
    scope: "world",
    config: false,
    type: Object,
    default: { id: "", action: "" },
  });
}

function initializeVSoundRuntime() {
  void soundManager.setLocalVolume(getSfxVolume());
  void soundManager.setMasterCap(getSfxMasterCap());
  game.socket?.on?.(`module.${MODULE_ID}`, message => {
    if (!message || !Array.isArray(message.recipients) || !message.recipients.includes(game.user?.id)) return;
    if (Date.now() - Number(message.sentAt ?? Date.now()) > 30_000) return;
    if (message.action === "stop") {
      void soundManager.stop(String(message.playbackId ?? ""));
      return;
    }
    if (message.action !== "play" || !/^[a-z0-9:_-]{1,160}$/i.test(String(message.playbackId ?? ""))) return;
    if (!isSafeSfxPath(message.src)) return;
    if (!["all", "v"].includes(message.audience) || !["interface", "music"].includes(message.channel)) return;
    void soundManager.play({
      id: message.playbackId,
      soundId: String(message.soundId ?? "shared-sfx"),
      src: message.src,
      loop: Boolean(message.loop),
      audience: message.audience,
      channel: message.channel,
      defaultVolume: Math.max(0, Math.min(1, Number(message.defaultVolume ?? 0.7))),
    }).catch(error => console.error(`[${MODULE_ID}] shared SFX playback failed`, error));
  });
  Hooks.on("updateSetting", (setting, _changes, _options, userId) => {
    if (setting?.key === `${MODULE_ID}.sfx-master-cap`) {
      void soundManager.setMasterCap(getSfxMasterCap());
      return;
    }
    if (setting?.key !== `${MODULE_ID}.shared-audio-command`) return;
    const command = setting.value;
    if (command?.action !== "stop-shared" || !command.id || !game.users.get(userId)?.isGM) return;
    void soundManager.stopAll({ sharedOnly: true });
  });
}

function isRecallKnowledgeMessage(message) {
  const context = asObject(message.flags?.pf2e?.context);
  const sources = [context.action, context.actionSlug, context.slug, context.options, context.rollOptions, context.check?.options];
  return sources.some(source => {
    const values = source instanceof Set ? [...source] : Array.isArray(source) ? source : [source];
    return values.some(value => /(?:^|[:/])recall[-_ ]knowledge(?:$|[:/])/i.test(String(value ?? "")));
  });
}

function currencyUpdateFromChanges(changes) {
  const values = {};
  let touched = false;
  for (const denomination of ["cp", "sp", "gp", "pp"]) {
    const flat = changes?.[`system.currency.${denomination}`];
    const nested = foundry.utils.getProperty(changes, `system.currency.${denomination}`);
    const value = flat ?? nested;
    if (value === undefined) continue;
    touched = true;
    values[denomination] = Number(value);
  }
  return touched ? values : null;
}

Hooks.on("preUpdateActor", (actor, changes, _options, userId) => {
  if (userId !== game.user?.id || actor.type !== "character" || !isVProfileActive(actor)) return;
  const next = currencyUpdateFromChanges(changes);
  if (!next) return;
  const before = { ...actor.system.currency };
  if (Object.entries(next).every(([key, value]) => Number(before[key] ?? 0) === value)) return;
  pendingCurrencyEvents.set(actor, { before, next, userId });
});

Hooks.on("updateActor", (actor, _changes, _options, userId) => {
  if (userId !== game.user?.id) return;
  const pending = pendingCurrencyEvents.get(actor);
  if (!pending || pending.userId !== userId) return;
  pendingCurrencyEvents.delete(actor);
  const applied = Object.entries(pending.next).every(([key, value]) => Number(actor.system.currency?.[key] ?? 0) === value);
  const changed = Object.entries(pending.next).some(([key, value]) => Number(pending.before[key] ?? 0) !== value);
  if (applied && changed) announceVSound("eurodollar-transfer", actor, "v");
});

Hooks.on("updateActor", (actor, _changes, _options, userId) => {
  if (userId === game.user?.id && actor.type === "character" && !isVProfileActive(actor)) {
    void soundManager.stop(`v-sheet:${actor.id}:gui-loop`);
  }
});

Hooks.once("init", registerVSoundSettings);

function onRenderActorSheet(app, html) {
  const actor = app.actor ?? app.document;
  const standaloneV = app.vRedhandStandalone === true && isVProfileActive(actor);
  if (!actor || actor.type !== "character" || (!canShowForConcórdia(actor) && !standaloneV) || !baseVersionSupported()) return;
  const container = unwrapElement(html, app);
  if (!container) return;
  if (app.vRedhandStandalone === true) applyVSheetTheme(app, container, actor);
  if (isVProfileActive(actor)) syncManagedItemsWhenActive(actor);
  watchUniqueRender(container, app, actor);
}

Hooks.once("setup", registerVRedHandCharacterSheet);
Hooks.on("renderCharacterSheetPF2e", onRenderActorSheet);
Hooks.on("renderApplicationV2", onRenderActorSheet);
Hooks.on("renderActorSheet", onRenderActorSheet);

function asObject(value) {
  return value !== null && typeof value === "object" ? value : {};
}

function actorFromUuid(uuid) {
  const match = String(uuid ?? "").match(/(?:^|\.)Actor\.([^.]+)(?:\.Item\.([^.]+))?/);
  if (!match) return null;
  return { actor: game.actors?.get(match[1]) ?? null, itemId: match[2] ?? null };
}

function actorForChatMessage(message, root) {
  const linked = actorFromUuid(root?.querySelector?.('.content-link[data-uuid^="Actor."]')?.dataset.uuid)?.actor;
  if (linked && isVProfileActive(linked)) return linked;
  const direct = message.actor;
  if (direct && isVProfileActive(direct)) return direct;
  const speaker = asObject(message.speaker);
  const actor = speaker.actor ? game.actors?.get(speaker.actor) : null;
  if (actor && isVProfileActive(actor)) return actor;
  if (speaker.scene && speaker.token) {
    const tokenActor = game.scenes?.get(speaker.scene)?.tokens?.get(speaker.token)?.actor;
    if (tokenActor && isVProfileActive(tokenActor)) return tokenActor;
  }

  const flags = asObject(message.flags);
  const pf2e = asObject(flags.pf2e);
  const context = asObject(pf2e.context);
  const origin = asObject(context.origin ?? pf2e.origin);
  const originActor = asObject(origin.actor);
  const fromOrigin = actorFromUuid(origin.uuid ?? origin.actorUuid ?? originActor.uuid ?? originActor.id ?? origin.actor)
    ?? (typeof origin.actor === "string" ? { actor: game.actors?.get(origin.actor) ?? null, itemId: null } : null);
  if (fromOrigin?.actor && isVProfileActive(fromOrigin.actor)) return fromOrigin.actor;
  return direct ?? actor ?? linked ?? fromOrigin?.actor ?? null;
}

function itemFromChatMessage(message, root, actor) {
  const flags = asObject(message.flags);
  const pf2e = asObject(flags.pf2e);
  const context = asObject(pf2e.context);
  const origin = asObject(context.origin ?? pf2e.origin);
  const originItem = asObject(origin.item);
  const origins = [origin.uuid, origin.itemUuid, originItem.uuid, originItem.id, origin.item, root?.querySelector?.('.content-link[data-uuid*=".Item."]')?.dataset.uuid];
  for (const uuid of origins) {
    const parsed = actorFromUuid(uuid);
    if (parsed?.actor && parsed.actor.id === actor?.id && parsed.itemId) {
      const item = actor.items?.get(parsed.itemId);
      if (item) return item;
    }
  }
  const originName = String(originItem.name ?? "");
  if (originName) {
    const byName = actor.items.find(candidate => candidate.name === originName);
    if (byName) return byName;
  }
  const flavor = String(message.flavor ?? "");
  if (/twin colts/i.test(flavor)) {
    const hand = /direita/i.test(flavor) ? "direita" : /esquerda/i.test(flavor) ? "esquerda" : null;
    const key = hand ? `manifested:${hand}` : null;
    const pairWeapon = actor.items.find(candidate => candidate.getFlag?.(MODULE_ID, "managedRole") === "manifested-weapon"
      && (!key || candidate.getFlag?.(MODULE_ID, "managedKey") === key));
    if (pairWeapon) return pairWeapon;
  }
  return null;
}

function isPf2eStrikeRoll(message, root) {
  const context = asObject(message.flags?.pf2e?.context);
  const type = String(context.type ?? context.check?.type ?? "").toLowerCase();
  if (type === "attack-roll") return true;
  return Boolean(message.isRoll && (root.matches?.(".attack-roll, .attack-roll-card")
    || root.querySelector?.(".attack-roll, .attack-roll-card, [data-roll-type='attack-roll']")));
}

async function consumeVStrikeAmmo(message, actor, item) {
  if (!isOwner(actor) || String(message.user?.id ?? message.user ?? "") !== String(game.user?.id ?? "")) return;
  const role = item.getFlag?.(MODULE_ID, "managedRole") ?? item.flags?.[MODULE_ID]?.managedRole;
  const key = String(item.getFlag?.(MODULE_ID, "managedKey") ?? item.flags?.[MODULE_ID]?.managedKey ?? "");
  if (!((role === "manifested-weapon" && stateFor(actor).encounter.current?.mode === "G") || (role === "croma-weapon" && key === "5"))) return;
  const state = stateFor(actor);
  state.encounter.processedStrikeMessages ??= [];
  if (state.encounter.processedStrikeMessages.includes(message.id)) return;
  if (state.encounter.processedStrikeMessages.length > 100) state.encounter.processedStrikeMessages.splice(0, state.encounter.processedStrikeMessages.length - 100);

  const pending = state.encounter.pendingUltimateBonus;
  if (pending?.status === "awaiting-strike" && pending.ammoPrepaid && pending.itemId === item.id) {
    state.encounter.processedStrikeMessages.push(message.id);
    await updateActor(actor, state);
    return;
  }

  let consumed;
  if (role === "croma-weapon") {
    const remaining = Number(state.encounter.cromaAmmo ?? 0);
    state.encounter.processedStrikeMessages.push(message.id);
    if (remaining <= 0) consumed = { consumed: false, reason: "empty" };
    else {
      state.encounter.cromaAmmo = remaining - 1;
      consumed = { consumed: true, remaining: state.encounter.cromaAmmo };
    }
  } else {
    const weaponName = item.name.replace(/ · (?:Esquerda|Direita)$/i, "");
    const hand = /esquerda$/i.test(key) ? "left" : /direita$/i.test(key) ? "right" : null;
    consumed = consumeTrackedAmmo(state.encounter, { eventId: message.id, weaponName, hand });
  }
  if (consumed.duplicate || consumed.reason === "untracked") return;
  if (!consumed.consumed && consumed.reason === "empty") {
    notify("warn", `${item.name} está sem munição. O Strike já rolou; recarregue antes de outro disparo.`);
  }
  await updateActor(actor, state);
  await syncVItems(actor, state);
  refreshActorPanels(actor);
}

function rollsFromMessage(message) {
  const rolls = message.rolls;
  if (Array.isArray(rolls)) return rolls;
  if (Array.isArray(rolls?.contents)) return rolls.contents;
  return rolls ? [rolls] : [];
}

function diceTerms(roll) {
  const found = [];
  const seen = new Set();
  const visit = term => {
    if (!term || typeof term !== "object" || seen.has(term)) return;
    seen.add(term);
    if (Number.isFinite(Number(term.faces)) && Array.isArray(term.results)) {
      for (const result of term.results) {
        if (result?.active === false) continue;
        const value = Number(result?.result ?? result);
        if (Number.isFinite(value)) found.push({ faces: Number(term.faces), value });
      }
    }
    if (Array.isArray(term.terms)) term.terms.forEach(visit);
    if (term.roll) visit(term.roll);
  };
  (roll?.terms ?? []).forEach(visit);
  return found;
}

function textFrom(root, selectors) {
  for (const selector of selectors) {
    const value = root?.querySelector?.(selector)?.textContent?.replace(/\s+/g, " ").trim();
    if (value) return value;
  }
  return "";
}

function addChatDetails(root, message, actor, item, rolls, dice) {
  if (root.querySelector(".vred-chat-details")) return;
  const vFlags = asObject(message.flags?.[MODULE_ID]);
  const pf2eFlags = asObject(message.flags?.pf2e);
  const pf2eCard = Boolean(Object.keys(pf2eFlags).length);
  const bootRoll = Number(vFlags.faces) === 20 && /boot|giro/i.test(String(message.flavor ?? ""));
  const naturalOne = dice.some(entry => entry.faces === 20 && entry.value === 1);
  const naturalTwenty = dice.some(entry => entry.faces === 20 && entry.value === 20);
  const detail = document.createElement("aside");
  detail.className = `vred-chat-details${pf2eCard ? " compact" : ""}`;
  detail.setAttribute("aria-label", "Detalhes da mensagem de V RedHand");

  const header = document.createElement("div");
  header.className = "vred-chat-details__header";
  header.textContent = `ARSENAL.EXE · ${naturalOne && bootRoll ? "GLITCH NA BLACKWALL" : naturalOne ? "D20 NATURAL 1" : naturalTwenty ? "PICO DE SINCRONIA" : pf2eCard ? "LEITURA DE DADOS" : rolls.length ? "REGISTRO DE ROLAGEM" : item ? "ITEM DO ENGRAMA" : "SINAL DE V"}`;
  const summary = document.createElement("div");
  summary.className = "vred-chat-details__summary";
  if (rolls.length) {
    const descriptions = rolls.map(roll => {
      const rollDice = diceTerms(roll);
      const diceText = rollDice.length ? rollDice.map(entry => `d${entry.faces}=${entry.value}`).join(" + ") : "";
      if (pf2eCard) return diceText;
      const formula = String(roll.formula ?? "rolagem");
      const total = Number.isFinite(Number(roll.total)) ? ` · Total ${roll.total}` : "";
      return `${formula}${diceText ? ` · Dados: ${diceText}` : ""}${total}`;
    }).filter(Boolean);
    if (pf2eCard && !descriptions.length) return;
    summary.textContent = descriptions.join(" | ");
  } else if (item) {
    if (pf2eCard) return;
    const itemText = item.system?.description?.value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    summary.textContent = itemText ? itemText.slice(0, 220) : "Item vinculado ao engrama de V.";
  } else {
    if (pf2eCard) return;
    summary.textContent = actor.name ?? "Mensagem de V RedHand";
  }
  detail.append(header, summary);
  const content = root.querySelector(".message-content") ?? root;
  content.prepend(detail);
}

function twinRoundKey(message) {
  if (game.combat) return `combat:${game.combat.id}:${game.combat.round}`;
  return `message:${message.id}`;
}

function attackOutcome(message, root) {
  const context = asObject(message.flags?.pf2e?.context);
  const flavor = `${message.flavor ?? ""} ${textFrom(root, [".flavor-text", ".card-header h3", ".damage-card-flavor"])}`;
  return classifyStrikeOutcome(context, flavor);
}

async function resolvePendingUltimateStrike(message, actor, item, outcome) {
  if (!isOwner(actor) || String(message.user?.id ?? message.user ?? "") !== String(game.user?.id ?? "")) return;
  const state = stateFor(actor);
  const pending = state.encounter.pendingUltimateBonus;
  if (pending?.status !== "awaiting-strike" || !item) return;
  const itemRole = item.getFlag?.(MODULE_ID, "managedRole") ?? item.flags?.[MODULE_ID]?.managedRole;
  if (itemRole !== "manifested-weapon" || item.id !== pending.itemId) return;
  if (Date.now() > Number(pending.expiresAt ?? 0)) {
    state.encounter.pendingUltimateBonus = null;
    await updateActor(actor, state);
    await syncVItems(actor, state);
    refreshActorPanels(actor);
    return;
  }
  if (pending.combatId && (pending.combatId !== game.combat?.id || pending.round !== game.combat?.round || pending.turn !== game.combat?.turn)) {
    state.encounter.pendingUltimateBonus = null;
    await updateActor(actor, state);
    await syncVItems(actor, state);
    refreshActorPanels(actor);
    return;
  }
  pending.messageId = message.id;
  pending.outcome = outcome;
  pending.resolvedAt = Date.now();
  if (outcome === "success" || outcome === "critical") {
    pending.status = "ready";
    pending.degree = outcome;
  } else if (outcome === "failure") {
    state.encounter.pendingUltimateBonus = null;
    await updateActor(actor, state);
    await syncVItems(actor, state);
    refreshActorPanels(actor);
    notify("info", `O Strike de ${pending.name} falhou; o dano adicional foi cancelado.`);
    return;
  } else {
    pending.status = "needs-confirmation";
  }
  await updateActor(actor, state);
  await syncVItems(actor, state);
  refreshActorPanels(actor);
}

function mapIncreases(message) {
  const context = asObject(message.flags?.pf2e?.context);
  const raw = context.options ?? context.rollOptions ?? context.check?.options ?? [];
  const options = raw instanceof Set ? [...raw] : Array.isArray(raw) ? raw : Object.keys(asObject(raw));
  for (const option of options) {
    const match = String(option).match(/map:increases:(\d)/i);
    if (match) return Number(match[1]);
  }
  return null;
}

function appendTwinColtsPrompt(root, message, actor, item, outcome) {
  if (!item || !/twin colts/i.test(item.name ?? "") || !["success", "critical"].includes(outcome) || root.querySelector(".vred-twin-colts-prompt")) return;
  if (String(message.user?.id ?? message.user ?? "") !== String(game.user?.id ?? "")) return;
  const itemKey = String(item.getFlag?.(MODULE_ID, "managedKey") ?? item.flags?.[MODULE_ID]?.managedKey ?? "");
  const otherHand = itemKey.endsWith("esquerda") || /esquerda/i.test(item.name) ? "direita" : "esquerda";
  const state = stateFor(actor);
  state.encounter ??= clone(DEFAULT_STATE.encounter);
  const roundKey = twinRoundKey(message);
  const pending = state.encounter.twinColtsFollowUp;
  if (pending?.roundKey === roundKey) {
    if (pending.messageId !== message.id || pending.status !== "pending") return;
  } else {
    const claimKey = `${actor.uuid ?? actor.id}:${roundKey}`;
    if (twinPromptClaims.has(claimKey)) return;
    twinPromptClaims.add(claimKey);
    const currentMap = mapIncreases(message);
    const maps = currentMap === null ? [1, 2] : currentMap < 2 ? [currentMap + 1] : [];
    if (!maps.length) return;
    state.encounter.twinColtsFollowUp = {
      roundKey,
      messageId: message.id,
      sourceItemId: item.id,
      otherHand,
      maps,
      status: "pending",
    };
    void actor.update({ [STATE_PATH]: state }).catch(error => console.error(`[${MODULE_ID}] Twin Colts prompt state could not be saved`, error));
  }

  const current = state.encounter.twinColtsFollowUp;
  const prompt = document.createElement("aside");
  prompt.className = "vred-twin-colts-prompt";
  const label = document.createElement("strong");
  label.textContent = `Twin Colts · ${outcome === "critical" ? "acerto crítico" : "acerto"}`;
  const text = document.createElement("p");
  text.textContent = `Você pode fazer um Strike imediato com a pistola ${otherHand}, usando a MAP normal da próxima Strike. Limite atual: 1 disparo extra por rodada.`;
  prompt.append(label, text);
  const actionRow = document.createElement("div");
  actionRow.className = "vred-twin-colts-prompt__actions";
  for (const map of current.maps) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vred-button small primary";
    button.dataset.vTwinColts = "true";
    button.dataset.actorId = actor.id;
    button.dataset.otherHand = otherHand;
    button.dataset.map = String(map);
    button.dataset.roundKey = roundKey;
    button.textContent = current.maps.length > 1 ? `Disparar · MAP ${map}` : "Fazer segundo disparo";
    actionRow.append(button);
  }
  prompt.append(actionRow);
  (root.querySelector(".message-content") ?? root).append(prompt);
  if (root.dataset.vredTwinBound !== "true") {
    root.addEventListener("click", event => {
      const button = event.target.closest?.("[data-v-twin-colts]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      void performTwinColtsFollowUp(button, event);
    });
    root.dataset.vredTwinBound = "true";
  }
}

async function performTwinColtsFollowUp(button, event) {
  const actor = game.actors?.get(button.dataset.actorId);
  if (!actor || !isOwner(actor)) return;
  return serializeActorAction(actor, async () => {
    const state = stateFor(actor);
    const pending = state.encounter?.twinColtsFollowUp;
    if (!pending || pending.roundKey !== button.dataset.roundKey || pending.status !== "pending") return;
    if (state.encounter.current?.name !== "Twin Colts") return;
    const key = `manifested:${button.dataset.otherHand}`;
    const weapon = actor.items.find(entry => entry.getFlag?.(MODULE_ID, "managedRole") === "manifested-weapon"
      && entry.getFlag?.(MODULE_ID, "managedKey") === key);
    const strike = actor.system.actions?.find(action => action.item?.id === weapon?.id || action.itemId === weapon?.id);
    const map = Number(button.dataset.map);
    const variant = strike?.variants?.[map];
    if (!variant?.roll) {
      notify("warn", "Não encontrei o Strike da outra pistola para fazer o disparo adicional.");
      return;
    }
    if (Number(state.encounter.ammo?.["Twin Colts"]?.[button.dataset.otherHand === "direita" ? "right" : "left"] ?? 0) <= 0) {
      notify("warn", "A outra pistola está sem munição; recarregue antes do disparo adicional.");
      return;
    }
    pending.status = "used";
    await actor.update({ [STATE_PATH]: state });
    await variant.roll({ event });
  });
}

function decorateVChatMessage(message, html) {
  const root = unwrapElement(html);
  if (!root) return;
  const actor = actorForChatMessage(message, root);
  if (!actor || !isVProfileActive(actor)) return;
  const messageUserId = String(message.user?.id ?? message.user ?? "");
  if (messageUserId === String(game.user?.id ?? "") && isRecallKnowledgeMessage(message) && !playedRecallKnowledgeMessages.has(message.id)) {
    playedRecallKnowledgeMessages.add(message.id);
    if (playedRecallKnowledgeMessages.size > 500) playedRecallKnowledgeMessages.clear();
    announceVSound("scanner-open", actor, "self");
  }
  const chatType = message.getFlag?.(MODULE_ID, "chatType") ?? message.flags?.[MODULE_ID]?.chatType;
  const rolls = rollsFromMessage(message);
  const dice = rolls.flatMap(diceTerms);
  root.classList.add("vred-chat-message", `vred-chat-${String(chatType ?? (rolls.length ? "roll" : "item")).replace(/[^a-z0-9_-]/gi, "")}`);
  const vFlags = asObject(message.flags?.[MODULE_ID]);
  const bootRoll = Number(vFlags.faces) === 20 && /boot|giro/i.test(String(message.flavor ?? ""));
  if (dice.some(entry => entry.faces === 20 && entry.value === 1)) {
    root.classList.add("vred-chat-natural-one");
    if (bootRoll) root.classList.add("vred-chat-blackwall");
  }
  if (dice.some(entry => entry.faces === 20 && entry.value === 20)) root.classList.add("vred-chat-natural-20");
  const item = itemFromChatMessage(message, root, actor);
  const strikeMessage = item && isPf2eStrikeRoll(message, root);
  const outcome = strikeMessage ? attackOutcome(message, root) : "unknown";
  if (item || (!rolls.length && root.querySelector(".content-link[data-uuid*='.Item.']"))) root.classList.add("vred-chat-item");
  addChatDetails(root, message, actor, item, rolls, dice);
  if (strikeMessage) {
    void serializeActorAction(actor, async () => {
      await consumeVStrikeAmmo(message, actor, item);
      await resolvePendingUltimateStrike(message, actor, item, outcome);
      appendTwinColtsPrompt(root, message, actor, item, outcome);
    }).catch(error => console.error(`[${MODULE_ID}] Strike follow-up processing failed`, error));
  }
}

const foundryMajorVersion = Number.parseInt(String(game.version ?? "14").split(".")[0], 10) || 14;
Hooks.on(foundryMajorVersion >= 14 ? "renderChatMessageHTML" : "renderChatMessage", decorateVChatMessage);
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
  registerVRedHandCharacterSheet();
  initializeVSoundRuntime();
  const profileErrors = [
    ...validateWeaponProfileCatalog({ weaponsG, weaponsS, wayProfiles }),
    ...validateUltimateProfileCatalog({ ultimates, profiles: ultimateProfiles, wayProfiles }),
  ];
  if (profileErrors.length) {
    console.error(`[${MODULE_ID}] invalid weapon profile catalog`, profileErrors);
    notify("error", `ARSENAL.EXE encontrou ${profileErrors.length} perfil(is) de arma inválido(s). Confira o console.`);
  }
  const base = game.modules.get(BASE_ID);
  if (!base?.active) notify("error", "V RedHand requer Ethernum RPG Module ativo.");
  else if (!baseVersionSupported()) notify("error", "V RedHand requer Ethernum RPG Module v3.8.11 ou posterior.");
});
