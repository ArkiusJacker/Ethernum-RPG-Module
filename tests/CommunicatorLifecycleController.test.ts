import { describe, expect, it } from "vitest";
import {
  COMMUNICATOR_LIFECYCLE_STATES,
  CommunicatorLifecycleController,
} from "../scripts/communicator/CommunicatorLifecycleController.js";

describe("CommunicatorLifecycleController", () => {
  it("uses only the bounded lifecycle states and completes normal transitions explicitly", async () => {
    expect(COMMUNICATOR_LIFECYCLE_STATES).toEqual([
      "idle",
      "opening",
      "open",
      "closing",
      "minimized",
    ]);

    const controller = new CommunicatorLifecycleController();
    const opening = controller.open();

    expect(opening).toMatchObject({
      status: "started",
      token: 1,
      supersededToken: null,
      transition: { token: 1, from: "idle", state: "opening", target: "open" },
      snapshot: { state: "opening", settledState: "idle", targetState: "open" },
    });
    expect(controller.complete(1)).toMatchObject({ status: "completed", state: "open" });
    await expect(opening.completion).resolves.toMatchObject({ status: "completed", state: "open" });

    const minimizing = controller.minimize();
    expect(minimizing.transition).toMatchObject({ token: 2, state: "closing", target: "minimized" });
    controller.complete(2);
    expect(controller.getState()).toEqual({
      state: "minimized",
      settledState: "minimized",
      targetState: null,
      transitionToken: 2,
      activeToken: null,
    });
  });

  it("supersedes rapid conflicting requests and ignores out-of-order completions", async () => {
    const controller = new CommunicatorLifecycleController();
    const opening = controller.open();
    const closing = controller.close();
    const reopening = controller.open();

    expect([opening.token, closing.token, reopening.token]).toEqual([1, 2, 3]);
    expect(closing).toMatchObject({
      status: "started",
      supersededToken: 1,
      transition: { from: "opening", state: "closing", target: "idle" },
    });
    expect(reopening).toMatchObject({
      status: "started",
      supersededToken: 2,
      transition: { from: "closing", state: "opening", target: "open" },
    });
    await expect(opening.completion).resolves.toMatchObject({
      status: "superseded",
      token: 1,
      supersededBy: 2,
    });
    await expect(closing.completion).resolves.toMatchObject({
      status: "superseded",
      token: 2,
      supersededBy: 3,
    });

    expect(controller.complete(1)).toMatchObject({ status: "stale", state: "opening" });
    expect(controller.complete(2)).toMatchObject({ status: "stale", state: "opening" });
    expect(controller.getState()).toMatchObject({ state: "opening", activeToken: 3 });
    expect(controller.complete(3)).toMatchObject({ status: "completed", state: "open" });
    await expect(reopening.completion).resolves.toMatchObject({ status: "completed", state: "open" });
  });

  it("coalesces duplicate intent without allocating another token or completion", async () => {
    const controller = new CommunicatorLifecycleController();
    const first = controller.open();
    const duplicate = controller.open();

    expect(duplicate).toMatchObject({ status: "coalesced", token: 1, supersededToken: null });
    expect(duplicate.transition).toBe(first.transition);
    expect(duplicate.completion).toBe(first.completion);
    expect(controller.getState().transitionToken).toBe(1);

    controller.complete(1);
    await expect(duplicate.completion).resolves.toMatchObject({ status: "completed", token: 1 });

    const alreadyOpen = controller.open();
    expect(alreadyOpen).toMatchObject({ status: "unchanged", token: null, transition: null });
    await expect(alreadyOpen.completion).resolves.toMatchObject({ status: "unchanged", state: "open" });
    expect(controller.getState().transitionToken).toBe(1);
  });

  it("cancels only the matching active token and rolls back to the last settled state", async () => {
    const controller = new CommunicatorLifecycleController("open");
    const closing = controller.minimize();

    expect(controller.cancel(999)).toMatchObject({ status: "stale", state: "closing" });
    expect(controller.cancel(closing.token!)).toMatchObject({
      status: "cancelled",
      token: 1,
      state: "open",
    });
    await expect(closing.completion).resolves.toMatchObject({ status: "cancelled", state: "open" });
    expect(controller.complete(closing.token!)).toMatchObject({ status: "stale", state: "open" });
    expect(controller.getState()).toMatchObject({
      state: "open",
      settledState: "open",
      targetState: null,
      activeToken: null,
    });
  });

  it("keeps minimized reversal deterministic while an opening animation is in flight", async () => {
    const controller = new CommunicatorLifecycleController("minimized");
    const opening = controller.open();
    const minimizing = controller.minimize();

    expect(minimizing).toMatchObject({
      status: "started",
      token: 2,
      supersededToken: 1,
      transition: { from: "opening", state: "closing", target: "minimized" },
    });
    await expect(opening.completion).resolves.toMatchObject({ status: "superseded", supersededBy: 2 });
    controller.complete(2);
    expect(controller.getState()).toMatchObject({ state: "minimized", settledState: "minimized" });
  });

  it("settles idle and minimized changes immediately with monotonic tokens", async () => {
    const controller = new CommunicatorLifecycleController();
    const minimized = controller.minimize();
    const idle = controller.close();

    expect(minimized).toMatchObject({ status: "completed", token: 1, transition: null });
    expect(idle).toMatchObject({ status: "completed", token: 2, transition: null });
    await expect(minimized.completion).resolves.toMatchObject({ status: "completed", token: 1 });
    await expect(idle.completion).resolves.toMatchObject({ status: "completed", token: 2 });
    expect(controller.getState()).toEqual({
      state: "idle",
      settledState: "idle",
      targetState: null,
      transitionToken: 2,
      activeToken: null,
    });
  });

  it("rejects runtime values outside the finite state and intent sets", () => {
    expect(() => new CommunicatorLifecycleController("opening" as "idle"))
      .toThrow(RangeError);
    const controller = new CommunicatorLifecycleController();
    expect(() => controller.request("toggle" as "open"))
      .toThrow(RangeError);
    expect(controller.getState()).toMatchObject({ state: "idle", transitionToken: 0 });
  });
});
