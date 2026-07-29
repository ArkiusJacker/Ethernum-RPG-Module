import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPippingAnimationDefinition,
  PIPPING_ANIMATION_ACTION_IDS,
  PIPPING_ANIMATION_DEFINITIONS,
  PippingAnimationService,
  type PippingAnimationContext,
  type PippingAnimationDriver,
} from "../scripts/mechanics/pipping/animations.js";
import { PIPPING_ACTIONS } from "../scripts/mechanics/pipping/progression.js";

function context(
  overrides: Partial<PippingAnimationContext> = {},
): PippingAnimationContext {
  return {
    actionId: "ruin-note",
    expression: "destruction",
    sourceActorUuid: "Actor.pipping",
    sourceTokenUuid: "Scene.scene.Token.pipping",
    targetActorUuids: [],
    targetTokenUuids: [],
    tier: 3,
    intensity: 2,
    mode: "full",
    ...overrides,
  };
}

const skippedDriver: PippingAnimationDriver = async () => ({ played: false });

afterEach(async () => {
  await PippingAnimationService.shutdown();
  vi.restoreAllMocks();
});

describe("Pipping animation definitions", () => {
  it("defines every current Pipping action exactly once", () => {
    const mechanicalIds = PIPPING_ACTIONS.map(action => action.id).sort();
    const animationIds = [...PIPPING_ANIMATION_ACTION_IDS].sort();

    expect(animationIds).toEqual(mechanicalIds);
    expect(Object.keys(PIPPING_ANIMATION_DEFINITIONS).sort()).toEqual(mechanicalIds);
  });

  it("gives every action its own visual and safe fallback", () => {
    for (const actionId of PIPPING_ANIMATION_ACTION_IDS) {
      const definition = getPippingAnimationDefinition(actionId);
      expect(definition).not.toBeNull();
      expect(definition?.id).toBe(actionId);
      expect(definition?.fallbackClass).toContain(actionId);
      expect(definition?.colors).toHaveLength(3);
      expect(definition?.sequencerDatabaseKeys.length).toBeGreaterThan(0);
      expect(definition?.jb2aDatabaseKeys.length).toBeGreaterThan(0);
    }
    expect(getPippingAnimationDefinition("unknown-action")).toBeNull();
  });

  it("keeps persistent visuals explicit in their definitions", () => {
    expect(PIPPING_ANIMATION_DEFINITIONS["animated-shadow"].persistent).toBe(true);
    expect(PIPPING_ANIMATION_DEFINITIONS["living-night-song"].persistent).toBe(true);
    expect(PIPPING_ANIMATION_DEFINITIONS["shadow-king"].persistent).toBe(true);
    expect(PIPPING_ANIMATION_DEFINITIONS["beyond-form"].persistent).toBe(true);
    expect(PIPPING_ANIMATION_DEFINITIONS["ruin-note"].persistent).toBe(false);
  });
});

describe("Pipping animation modes and fallbacks", () => {
  it("does not call any visual driver when animations are off", async () => {
    const driver = vi.fn<PippingAnimationDriver>();

    await expect(PippingAnimationService.playAction(context({
      mode: "off",
      environment: {
        sequencer: driver,
        jb2a: driver,
        pixi: driver,
        dom: driver,
      },
    }))).resolves.toBeUndefined();

    expect(driver).not.toHaveBeenCalled();
  });

  it("uses reduced mode when configured directly", async () => {
    const sequencer = vi.fn<PippingAnimationDriver>(async request => {
      expect(request.mode).toBe("reduced");
      expect(request.durationMs).toBeLessThan(650);
      return { played: true };
    });

    await PippingAnimationService.playAction(context({
      mode: "reduced",
      environment: { sequencer },
    }));

    expect(sequencer).toHaveBeenCalledOnce();
  });

  it("honors prefers-reduced-motion even when full mode was requested", async () => {
    const sequencer = vi.fn<PippingAnimationDriver>(async request => {
      expect(request.mode).toBe("reduced");
      return { played: true };
    });

    await PippingAnimationService.playAction(context({
      mode: "full",
      environment: {
        prefersReducedMotion: () => true,
        sequencer,
      },
    }));

    expect(sequencer).toHaveBeenCalledOnce();
  });

  it("allows an explicit context override for reduced-motion detection", async () => {
    const sequencer = vi.fn<PippingAnimationDriver>(async request => {
      expect(request.mode).toBe("full");
      return { played: true };
    });

    await PippingAnimationService.playAction(context({
      prefersReducedMotion: false,
      environment: {
        prefersReducedMotion: () => true,
        sequencer,
      },
    }));

    expect(sequencer).toHaveBeenCalledOnce();
  });

  it("walks Sequencer, JB2A, PIXI and DOM in fallback order", async () => {
    const calls: string[] = [];
    const sequencer = vi.fn<PippingAnimationDriver>(async () => {
      calls.push("sequencer");
      return { played: false };
    });
    const jb2a = vi.fn<PippingAnimationDriver>(async () => {
      calls.push("jb2a");
      return { played: false };
    });
    const pixi = vi.fn<PippingAnimationDriver>(async () => {
      calls.push("pixi");
      return { played: true };
    });
    const dom = vi.fn<PippingAnimationDriver>(async () => {
      calls.push("dom");
      return { played: true };
    });

    await PippingAnimationService.playAction(context({
      environment: { sequencer, jb2a, pixi, dom },
    }));

    expect(calls).toEqual(["sequencer", "jb2a", "pixi"]);
    expect(dom).not.toHaveBeenCalled();
  });

  it("works safely without Sequencer, JB2A, canvas, DOM or token", async () => {
    await expect(PippingAnimationService.playAction(context({
      sourceTokenUuid: undefined,
      targetTokenUuids: [],
      templateUuid: undefined,
      environment: {
        sequencer: skippedDriver,
        jb2a: skippedDriver,
        pixi: skippedDriver,
        dom: skippedDriver,
      },
    }))).resolves.toBeUndefined();
  });

  it("never rejects the mechanic when every visual layer fails", async () => {
    const diagnostics: string[] = [];
    const brokenDriver: PippingAnimationDriver = async () => {
      throw new Error("visual failure");
    };

    await expect(PippingAnimationService.playAction(context({
      diagnostics: diagnostic => diagnostics.push(`${diagnostic.layer}:${diagnostic.status}`),
      environment: {
        sequencer: brokenDriver,
        jb2a: brokenDriver,
        pixi: brokenDriver,
        dom: brokenDriver,
      },
    }))).resolves.toBeUndefined();

    expect(diagnostics).toEqual([
      "sequencer:failed",
      "jb2a:failed",
      "pixi:failed",
      "dom:failed",
      "undefined:skipped",
    ]);
  });
});

describe("Pipping animation context and cleanup", () => {
  it("passes multiple visible targets and a template to the selected driver", async () => {
    const documents: Record<string, unknown> = {
      "Scene.scene.Token.pipping": { object: { visible: true, center: { x: 10, y: 20 } } },
      "Scene.scene.Token.one": { object: { visible: true, center: { x: 30, y: 40 } } },
      "Scene.scene.Token.two": { object: { visible: true, center: { x: 50, y: 60 } } },
      "Scene.scene.MeasuredTemplate.area": {
        object: { visible: true, center: { x: 70, y: 80 } },
      },
    };
    const sequencer = vi.fn<PippingAnimationDriver>(async request => {
      expect(request.source).not.toBeNull();
      expect(request.targets).toHaveLength(2);
      expect(request.template).not.toBeNull();
      return { played: true };
    });

    await PippingAnimationService.playAction(context({
      targetTokenUuids: ["Scene.scene.Token.one", "Scene.scene.Token.two"],
      templateUuid: "Scene.scene.MeasuredTemplate.area",
      environment: {
        resolveUuid: async uuid => documents[uuid] ?? null,
        sequencer,
      },
    }));

    expect(sequencer).toHaveBeenCalledOnce();
  });

  it("does not reveal hidden targets to visual drivers", async () => {
    const sequencer = vi.fn<PippingAnimationDriver>(async request => {
      expect(request.targets).toHaveLength(1);
      return { played: true };
    });

    await PippingAnimationService.playAction(context({
      targetTokenUuids: ["Token.visible", "Token.hidden"],
      environment: {
        resolveUuid: async uuid => ({
          object: {
            visible: uuid !== "Token.hidden",
            center: { x: 10, y: 10 },
          },
        }),
        sequencer,
      },
    }));

    expect(sequencer).toHaveBeenCalledOnce();
  });

  it("replaces, stops and cleans persistent effects by document UUID", async () => {
    const cleanup = vi.fn(async () => undefined);
    const sequencer = vi.fn<PippingAnimationDriver>(async () => ({
      played: true,
      cleanup,
    }));
    const persistentContext = context({
      actionId: "living-night-song",
      expression: undefined,
      targetActorUuids: ["Actor.ally"],
      persistentId: "pipping-night-aura",
      environment: { sequencer },
    });

    await PippingAnimationService.playPersistent(persistentContext);
    expect(PippingAnimationService.activePersistentIds()).toEqual(["pipping-night-aura"]);

    await PippingAnimationService.playPersistent(persistentContext);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(PippingAnimationService.activePersistentIds()).toEqual(["pipping-night-aura"]);

    await PippingAnimationService.cleanupForDocument("Actor.ally");
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(PippingAnimationService.activePersistentIds()).toEqual([]);
  });

  it("swallows persistent cleanup failures", async () => {
    const sequencer: PippingAnimationDriver = async () => ({
      played: true,
      cleanup: async () => {
        throw new Error("cleanup failure");
      },
    });

    await PippingAnimationService.playPersistent(context({
      actionId: "beyond-form",
      persistentId: "pipping-beyond-form",
      environment: { sequencer },
    }));

    await expect(
      PippingAnimationService.stopPersistent("pipping-beyond-form"),
    ).resolves.toBeUndefined();
    expect(PippingAnimationService.activePersistentIds()).toEqual([]);
  });
});
