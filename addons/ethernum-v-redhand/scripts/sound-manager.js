export function createVSoundManager(playBackend) {
  const active = new Map();
  let localVolume = 0.7;
  let masterCap = 1;

  function targetVolume(record) {
    const cap = record.audience === "self" ? 1 : masterCap;
    return Math.max(0, Math.min(1, record.defaultVolume * localVolume, cap));
  }

  async function setRecordVolume(record) {
    const target = targetVolume(record);
    if (typeof record.sound.fade === "function") {
      await record.sound.fade(target, { duration: 120, type: "linear" });
    } else if (record.sound.gain?.setTargetAtTime && record.sound.context) {
      record.sound.gain.setTargetAtTime(target, record.sound.context.currentTime, 0.04);
    }
  }

  async function stop(id) {
    const record = active.get(id);
    if (!record) return false;
    active.delete(id);
    await record.sound.stop?.({ fade: 120 });
    return true;
  }

  async function stopBySoundId(soundId) {
    const ids = [...active].filter(([, record]) => record.soundId === soundId).map(([id]) => id);
    await Promise.all(ids.map(stop));
    return ids.length;
  }

  async function stopAll({ sharedOnly = false } = {}) {
    const ids = [...active].filter(([, record]) => !sharedOnly || record.audience !== "self").map(([id]) => id);
    await Promise.all(ids.map(stop));
    return ids.length;
  }

  async function play({ id, soundId, src, loop = false, audience = "self", channel = "interface", defaultVolume = 1 }) {
    if (!id || !soundId || !src) throw new Error("Reprodução de áudio precisa de id, soundId e src.");
    if (active.has(id)) return active.get(id).sound;
    const sound = await playBackend({ src, volume: Math.min(defaultVolume, targetVolume({ defaultVolume, audience })), loop, autoplay: true, channel });
    if (!sound) throw new Error("Foundry não retornou uma instância de áudio controlável.");
    const record = { id, soundId, src, sound, loop, audience, defaultVolume };
    active.set(id, record);
    sound.addEventListener?.("end", () => {
      if (active.get(id) === record) active.delete(id);
    }, { once: true });
    return sound;
  }

  async function setLocalVolume(value) {
    localVolume = Math.max(0, Math.min(1, Number(value) || 0));
    await Promise.all([...active.values()].map(setRecordVolume));
  }

  async function setMasterCap(value) {
    masterCap = Math.max(0, Math.min(1, Number(value) || 0));
    await Promise.all([...active.values()].map(setRecordVolume));
  }

  return {
    play,
    stop,
    stopBySoundId,
    stopAll,
    setLocalVolume,
    setMasterCap,
    isPlaying: id => active.has(id),
    isSoundPlaying: soundId => [...active.values()].some(record => record.soundId === soundId),
    get size() { return active.size; },
  };
}
