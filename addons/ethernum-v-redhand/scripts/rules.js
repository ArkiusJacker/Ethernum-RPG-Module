const AUDIO_ROOT = "modules/ethernum-v-redhand/audio/";
const AUDIO_EXTENSIONS = /\.(?:mp3|ogg|wav|webm|flac)$/i;

export function isSafeSfxPath(value) {
  const path = String(value ?? "").replaceAll("\\", "/");
  if (!path.startsWith(AUDIO_ROOT) || path.startsWith("//") || /[?#%]/.test(path)) return false;
  const relative = path.slice(AUDIO_ROOT.length);
  if (!relative || relative.split("/").some(part => !part || part === "." || part === "..")) return false;
  if (relative.split("/").some(part => !/^[a-z0-9 _().'-]+$/i.test(part))) return false;
  return AUDIO_EXTENSIONS.test(path);
}

export function claimEncounterGlitch(encounter, eventId) {
  if (!encounter || !eventId) return { duplicate: true, cartridgeGranted: false };
  if ((encounter.log ?? []).some(entry => entry.eventId === eventId)) {
    return { duplicate: true, cartridgeGranted: false };
  }
  const first = !(encounter.log ?? []).some(entry => entry.glitch || Number(entry.result) === 1);
  const cartridgeGranted = first && !encounter.cartridge;
  if (cartridgeGranted) {
    encounter.cartridge = true;
    encounter.cartridgeSpent = false;
  }
  return { duplicate: false, cartridgeGranted };
}

export function createKeyedMutex() {
  const tails = new Map();
  return async function run(key, operation) {
    const previous = tails.get(key) ?? Promise.resolve();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const tail = previous.catch(() => {}).then(() => gate);
    tails.set(key, tail);
    await previous.catch(() => {});
    try {
      return await operation();
    } finally {
      release();
      if (tails.get(key) === tail) tails.delete(key);
    }
  };
}

export function consumeTrackedAmmo(encounter, { eventId, weaponName, hand = null } = {}) {
  if (!encounter || !eventId || !weaponName) return { consumed: false, reason: "invalid" };
  encounter.processedStrikeMessages ??= [];
  if (encounter.processedStrikeMessages.includes(eventId)) return { consumed: false, duplicate: true };
  encounter.processedStrikeMessages.push(eventId);
  if (encounter.processedStrikeMessages.length > 100) encounter.processedStrikeMessages.splice(0, encounter.processedStrikeMessages.length - 100);
  const ammo = encounter.ammo?.[weaponName];
  if (!ammo) return { consumed: false, reason: "untracked" };
  if (ammo.kind === "pair") {
    if (!(hand in ammo) || Number(ammo[hand]) <= 0) return { consumed: false, reason: "empty", ammo };
    ammo[hand] = Number(ammo[hand]) - 1;
    return { consumed: true, ammo, remaining: ammo[hand], hand };
  }
  if (!Number.isFinite(Number(ammo.rounds)) || Number(ammo.rounds) <= 0) return { consumed: false, reason: "empty", ammo };
  ammo.rounds = Number(ammo.rounds) - 1;
  return { consumed: true, ammo, remaining: ammo.rounds };
}

export function migrateVState(state, saved, { weaponFor, isUltimateName = () => false } = {}) {
  const originalVersion = Number(saved?.schemaVersion ?? 1);
  if (originalVersion < 2) {
    const oldCurrent = state.encounter.current;
    if (oldCurrent?.ultimateSelect || oldCurrent?.isUltimate) {
      oldCurrent.result = 1;
    } else if (oldCurrent && Number(oldCurrent.result) >= 1 && Number(oldCurrent.result) <= 19) {
      const migratedResult = Number(oldCurrent.result) + 1;
      state.encounter.current = { ...weaponFor(oldCurrent.mode, migratedResult, state), mode: oldCurrent.mode, result: migratedResult };
    }
    state.encounter.log = (state.encounter.log ?? []).map(entry => {
      const wasUltimate = entry.result === 20 && (entry.name === "Glitch / Ultimate Select" || isUltimateName(entry.name));
      return wasUltimate ? { ...entry, result: 1 } : Number(entry.result) >= 1 && Number(entry.result) <= 19
        ? { ...entry, result: Number(entry.result) + 1 }
        : entry;
    });
    state.schemaVersion = 2;
  }
  if (originalVersion < 3) {
    // A legacy free-standing bonus button had no originating Strike to verify.
    state.encounter.pendingUltimateBonus = null;
    state.encounter.log = (state.encounter.log ?? []).map((entry, index) => ({
      ...entry,
      eventId: entry.eventId ?? `legacy-${entry.at ?? "entry"}-${index}`,
      glitch: entry.glitch ?? Number(entry.result) === 1,
      selectedUltimate: entry.selectedUltimate ?? null,
    }));
    state.schemaVersion = 3;
  }
  if (originalVersion < 4) {
    state.encounter.processedStrikeMessages = [];
    state.schemaVersion = 4;
  }
  state.encounter.processedStrikeMessages ??= [];
  return state;
}

export function classifyStrikeOutcome(context = {}, flavor = "") {
  const candidates = [context.outcome, context.degreeOfSuccess, context.roll?.degreeOfSuccess, context.check?.degreeOfSuccess];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      if (candidate >= 3) return "critical";
      if (candidate >= 2) return "success";
      if (candidate >= 0) return "failure";
    }
    const value = String(candidate ?? "").toLowerCase().replace(/[\s_-]/g, "");
    if (["criticalsuccess", "criticalhit", "critsuccess", "crithit"].includes(value)) return "critical";
    if (["success", "hit"].includes(value)) return "success";
    if (["criticalfailure", "failure", "miss", "failurecritical"].includes(value)) return "failure";
  }
  const text = String(flavor ?? "").toLowerCase();
  if (/critical\s*(?:hit|success)|critical-hit|acerto crítico|sucesso crítico/.test(text)) return "critical";
  if (/\b(?:miss|failure|falha|erro crítico|critical failure)\b/.test(text)) return "failure";
  if (/(?:\(|\b)(?:hit|success|acerto|sucesso)(?:\)|\b)/.test(text)) return "success";
  return "unknown";
}
