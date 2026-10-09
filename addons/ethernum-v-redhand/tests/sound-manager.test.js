import { describe, expect, it, vi } from "vitest";
import { createVSoundManager } from "../scripts/sound-manager.js";

function fakeSound() {
  return {
    fade: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    addEventListener: vi.fn(),
  };
}

describe("V RedHand sound manager", () => {
  it("deduplicates playback IDs and updates volume on already playing sounds", async () => {
    const sound = fakeSound();
    const playBackend = vi.fn(async () => sound);
    const manager = createVSoundManager(playBackend);
    await manager.play({ id: "loop-v", soundId: "gui-loop", src: "modules/v/audio/loop.mp3", loop: true, audience: "v", defaultVolume: 0.8 });
    await manager.play({ id: "loop-v", soundId: "gui-loop", src: "modules/v/audio/loop.mp3", loop: true, audience: "v", defaultVolume: 0.8 });
    expect(playBackend).toHaveBeenCalledTimes(1);
    await manager.setLocalVolume(0.5);
    expect(sound.fade).toHaveBeenLastCalledWith(0.4, expect.objectContaining({ duration: 120 }));
    await manager.setMasterCap(0.2);
    expect(sound.fade).toHaveBeenLastCalledWith(0.2, expect.objectContaining({ duration: 120 }));
  });

  it("stops an individual sound or all shared sounds without stopping local playback", async () => {
    const sounds = [fakeSound(), fakeSound(), fakeSound()];
    const manager = createVSoundManager(vi.fn(async () => sounds.shift()));
    await manager.play({ id: "private", soundId: "private", src: "a.mp3", audience: "self" });
    const shared = await manager.play({ id: "shared", soundId: "shared", src: "b.mp3", audience: "all" });
    await manager.stopAll({ sharedOnly: true });
    expect(shared.stop).toHaveBeenCalledOnce();
    expect(manager.isPlaying("private")).toBe(true);
    expect(manager.isPlaying("shared")).toBe(false);
    await manager.stopAll();
    expect(manager.size).toBe(0);
  });
});
