import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPippingAnimationDatabaseValidationCache,
  PIPPING_ANIMATION_DEFINITIONS,
  PippingAnimationService,
  type PippingAnimationDatabaseEnvironment,
  type PippingAnimationDriver,
  type PippingHoverAnimationContext,
  validatePippingAnimationDatabase,
} from "../scripts/mechanics/pipping/animations.js";

class FakeSequence {}

function hoverContext(
  overrides: Partial<PippingHoverAnimationContext> = {},
): PippingHoverAnimationContext {
  return {
    actionId: "ruin-note",
    expression: "destruction",
    sourceActorUuid: "Actor.pipping",
    sourceTokenUuid: "Scene.scene.Token.pipping",
    cardId: "ruin-note-card",
    userId: "User.player",
    tier: 3,
    intensity: 2,
    mode: "full",
    canvasPreview: true,
    ...overrides,
  };
}

function databaseEnvironment(
  availableKeys: readonly string[] = [],
  overrides: Partial<PippingAnimationDatabaseEnvironment> = {},
): {
  environment: PippingAnimationDatabaseEnvironment;
  entryExists: ReturnType<typeof vi.fn>;
} {
  const available = new Set(availableKeys);
  const entryExists = vi.fn(async (key: string) => available.has(key));
  return {
    environment: {
      sequenceConstructor: FakeSequence,
      database: { entryExists },
      databaseViewerAvailable: true,
      pixiAvailable: true,
      domAvailable: true,
      ...overrides,
    },
    entryExists,
  };
}

const skippedDriver: PippingAnimationDriver = async () => ({ played: false });

afterEach(async () => {
  await PippingAnimationService.shutdown();
  clearPippingAnimationDatabaseValidationCache();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Pipping animation database diagnostics", () => {
  it("reports missing Sequencer and JB2A with the expected local fallback", async () => {
    const diagnostic = await validatePippingAnimationDatabase({
      environment: {
        sequenceConstructor: null,
        database: null,
        databaseViewerAvailable: false,
        pixiAvailable: true,
        domAvailable: true,
      },
    });
    const action = diagnostic.actions.find(candidate => candidate.actionId === "ruin-note");

    expect(diagnostic.sequencerAvailable).toBe(false);
    expect(diagnostic.databaseAvailable).toBe(false);
    expect(diagnostic.databaseViewerAvailable).toBe(false);
    expect(diagnostic.jb2aAvailable).toBe(false);
    expect(diagnostic.fallbackLayer).toBe("pixi");
    expect(action).toMatchObject({
      selectedKey: null,
      selectedSource: null,
      expectedLayer: "pixi",
    });
  });

  it("detects the legacy canvas effects layer as a PIXI fallback", async () => {
    vi.stubGlobal("PIXI", { Graphics: class {} });
    vi.stubGlobal("canvas", { effects: { addChild: vi.fn() } });

    const diagnostic = await validatePippingAnimationDatabase({
      environment: {
        sequenceConstructor: null,
        database: null,
        databaseViewerAvailable: false,
        domAvailable: false,
      },
    });

    expect(diagnostic.pixiAvailable).toBe(true);
    expect(diagnostic.fallbackLayer).toBe("pixi");
  });

  it("selects the first valid JB2A key and reports Database Viewer", async () => {
    const [firstKey] = PIPPING_ANIMATION_DEFINITIONS["ruin-note"].jb2aDatabaseKeys;
    const { environment } = databaseEnvironment([firstKey]);
    const diagnostic = await validatePippingAnimationDatabase({ environment });
    const action = diagnostic.actions.find(candidate => candidate.actionId === "ruin-note");

    expect(diagnostic.sequencerAvailable).toBe(true);
    expect(diagnostic.databaseViewerAvailable).toBe(true);
    expect(diagnostic.jb2aAvailable).toBe(true);
    expect(action?.jb2a).toEqual([
      { key: firstKey, position: 1, available: true },
      {
        key: PIPPING_ANIMATION_DEFINITIONS["ruin-note"].jb2aDatabaseKeys[1],
        position: 2,
        available: false,
      },
    ]);
    expect(action).toMatchObject({
      selectedKey: firstKey,
      selectedSource: "jb2a",
      expectedLayer: "jb2a",
    });
  });

  it("falls through to the second JB2A key when the first is absent", async () => {
    const [, secondKey] = PIPPING_ANIMATION_DEFINITIONS["ruin-note"].jb2aDatabaseKeys;
    const { environment } = databaseEnvironment([secondKey]);
    const diagnostic = await validatePippingAnimationDatabase({ environment });
    const action = diagnostic.actions.find(candidate => candidate.actionId === "ruin-note");

    expect(action?.jb2a[0]).toMatchObject({ position: 1, available: false });
    expect(action?.jb2a[1]).toEqual({
      key: secondKey,
      position: 2,
      available: true,
    });
    expect(action).toMatchObject({
      selectedKey: secondKey,
      selectedSource: "jb2a",
      expectedLayer: "jb2a",
    });
  });

  it("uses an Ethernum key only when it is actually registered", async () => {
    const [ethernumKey] =
      PIPPING_ANIMATION_DEFINITIONS["ruin-note"].sequencerDatabaseKeys;
    const [jb2aKey] = PIPPING_ANIMATION_DEFINITIONS["ruin-note"].jb2aDatabaseKeys;
    const { environment } = databaseEnvironment([ethernumKey, jb2aKey]);
    const diagnostic = await validatePippingAnimationDatabase({ environment });
    const action = diagnostic.actions.find(candidate => candidate.actionId === "ruin-note");

    expect(action).toMatchObject({
      selectedKey: ethernumKey,
      selectedSource: "ethernum",
      expectedLayer: "sequencer",
    });
  });

  it("caches the complete validation for the current session", async () => {
    const { environment, entryExists } = databaseEnvironment();
    const first = await validatePippingAnimationDatabase({ environment });
    const checksAfterFirstValidation = entryExists.mock.calls.length;
    const second = await validatePippingAnimationDatabase({ environment });

    expect(checksAfterFirstValidation).toBeGreaterThan(0);
    expect(second).toBe(first);
    expect(entryExists).toHaveBeenCalledTimes(checksAfterFirstValidation);
  });
});

describe("Pipping local hover previews", () => {
  it("waits for continuous hover and runs only a local, cleanup-capable preview", async () => {
    vi.useFakeTimers();
    const cleanup = vi.fn(async () => undefined);
    const jb2a = vi.fn<PippingAnimationDriver>(async request => {
      expect(request.localOnly).toBe(true);
      expect(request.targets).toEqual([]);
      expect(request.template).toBeNull();
      return { played: true, cleanup };
    });
    const [jb2aKey] = PIPPING_ANIMATION_DEFINITIONS["ruin-note"].jb2aDatabaseKeys;
    const { environment: databaseValidation } = databaseEnvironment([jb2aKey]);
    const socketEmit = vi.fn();
    const chatCreate = vi.fn();
    const actorUpdate = vi.fn();
    vi.stubGlobal("game", {
      user: { id: "User.player" },
      socket: { emit: socketEmit },
      actors: { update: actorUpdate },
    });
    vi.stubGlobal("ChatMessage", { create: chatCreate });

    const handle = await PippingAnimationService.startHoverPreview(hoverContext({
      environment: {
        resolveUuid: async () => ({
          object: { visible: true, center: { x: 100, y: 120 } },
        }),
        sequencer: skippedDriver,
        jb2a,
        pixi: skippedDriver,
        dom: skippedDriver,
      },
      databaseValidation: { environment: databaseValidation },
    }));

    expect(jb2a).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(449);
    expect(jb2a).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(jb2a).toHaveBeenCalledOnce();
    expect(PippingAnimationService.activeHoverPreviewIds()).toEqual([handle.id]);
    expect(socketEmit).not.toHaveBeenCalled();
    expect(chatCreate).not.toHaveBeenCalled();
    expect(actorUpdate).not.toHaveBeenCalled();

    await handle.stop();
    await handle.stop();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(PippingAnimationService.activeHoverPreviewIds()).toEqual([]);
  });

  it("cancels a pending preview without invoking any canvas driver", async () => {
    vi.useFakeTimers();
    const driver = vi.fn<PippingAnimationDriver>(async () => ({
      played: true,
      cleanup: vi.fn(),
    }));
    const handle = await PippingAnimationService.startHoverPreview(hoverContext({
      environment: {
        resolveUuid: async () => ({ object: { visible: true, center: { x: 1, y: 1 } } }),
        sequencer: driver,
        jb2a: driver,
        pixi: driver,
        dom: driver,
      },
    }));

    await handle.stop();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(driver).not.toHaveBeenCalled();
    expect(PippingAnimationService.activeHoverPreviewIds()).toEqual([]);
  });

  it("keeps one preview per card and one canvas preview per user", async () => {
    vi.useFakeTimers();
    const first = await PippingAnimationService.startHoverPreview(hoverContext());
    const replacement = await PippingAnimationService.startHoverPreview(hoverContext());

    expect(PippingAnimationService.activeHoverPreviewIds()).toEqual([replacement.id]);

    const otherCard = await PippingAnimationService.startHoverPreview(hoverContext({
      cardId: "void-touch-card",
      actionId: "void-touch",
    }));

    expect(PippingAnimationService.activeHoverPreviewIds()).toEqual([otherCard.id]);
    await first.stop();
    await replacement.stop();
    await otherCard.stop();
  });

  it("applies cooldown before replaying a card canvas preview", async () => {
    vi.useFakeTimers();
    const pixi = vi.fn<PippingAnimationDriver>(async () => ({
      played: true,
      cleanup: vi.fn(),
    }));
    const environment = {
      resolveUuid: async (): Promise<unknown> => ({
        object: { visible: true, center: { x: 10, y: 10 } },
      }),
      sequencer: skippedDriver,
      jb2a: skippedDriver,
      pixi,
      dom: skippedDriver,
    };
    const validation = {
      environment: {
        sequenceConstructor: null,
        database: null,
        pixiAvailable: true,
        domAvailable: true,
      },
    };

    const first = await PippingAnimationService.startHoverPreview(hoverContext({
      environment,
      databaseValidation: validation,
    }));
    await vi.advanceTimersByTimeAsync(450);
    expect(pixi).toHaveBeenCalledTimes(1);
    await first.stop();

    const second = await PippingAnimationService.startHoverPreview(hoverContext({
      environment,
      databaseValidation: validation,
    }));
    await vi.advanceTimersByTimeAsync(450);
    expect(pixi).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(350);
    expect(pixi).toHaveBeenCalledTimes(2);
    await second.stop();
  });

  it("cleans previews associated with a closed or deleted document", async () => {
    vi.useFakeTimers();
    const handle = await PippingAnimationService.startHoverPreview(hoverContext());

    expect(PippingAnimationService.activeHoverPreviewIds()).toEqual([handle.id]);
    await PippingAnimationService.cleanupForDocument("Actor.pipping");
    await vi.advanceTimersByTimeAsync(1_000);

    expect(PippingAnimationService.activeHoverPreviewIds()).toEqual([]);
  });
});
