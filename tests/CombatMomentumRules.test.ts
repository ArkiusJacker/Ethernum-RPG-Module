import { describe, expect, it } from "vitest";
import {
  createDefaultCombatMomentumState,
  createFulgorTrigger,
  createGrantedFulgor,
  resolveFidesAttack,
  resolveFulgorContinuation,
} from "../scripts/table/CombatMomentumSystem.js";

describe("Momentum Fides rules", () => {
  it("arms after three consecutive failed attacks", () => {
    let fides = createDefaultCombatMomentumState().fides;
    for (let failure = 0; failure < 3; failure += 1) {
      fides = resolveFidesAttack(fides, 1).fides;
    }
    expect(fides).toEqual({ markers: 3, charges: 3, armed: true });
  });

  it("clears accumulated markers after a successful attack", () => {
    const resolution = resolveFidesAttack({ markers: 2, charges: 3, armed: false }, 2);
    expect(resolution.fides).toEqual({ markers: 0, charges: 3, armed: false });
    expect(resolution.applied).toBe(false);
  });

  it("consumes one charge and cannot consume it twice", () => {
    const first = resolveFidesAttack({ markers: 3, charges: 3, armed: true }, 1);
    const second = resolveFidesAttack(first.fides, 1);
    expect(first).toMatchObject({
      applied: true,
      converted: true,
      fides: { markers: 0, charges: 2, armed: false },
    });
    expect(second).toMatchObject({
      applied: false,
      fides: { markers: 1, charges: 2, armed: false },
    });
  });
});

describe("Fulgor Negro rules", () => {
  const target = {
    actorRef: "Actor.target",
    tokenRef: "Scene.scene.Token.target",
    name: "Target",
  };

  it("starts only from a natural 20 when a chain is available", () => {
    expect(createFulgorTrigger(19, 4, target, 1, "turn-a")).toBeNull();
    expect(createFulgorTrigger(20, 0, target, 1, "turn-a")).toBeNull();
    expect(createFulgorTrigger(20, 4, target, 1, "turn-a")).toMatchObject({
      active: true,
      chainCount: 0,
      maxChain: 4,
      targetActorRef: target.actorRef,
      mapIncreases: 1,
      turnKey: "turn-a",
    });
  });

  it("allows the GM grant to start without a predefined target", () => {
    expect(createGrantedFulgor(4, "turn-gm")).toEqual({
      active: true,
      chainCount: 0,
      maxChain: 4,
      targetActorRef: "",
      targetTokenRef: "",
      targetName: "",
      mapIncreases: 0,
      turnKey: "turn-gm",
    });
  });

  it.each([
    ["turn change", { sameTurn: false, sameTarget: true, targetStanding: true, effectiveDegree: 2, natural: 20 }, "turn-changed"],
    ["target change", { sameTurn: true, sameTarget: false, targetStanding: true, effectiveDegree: 2, natural: 20 }, "target-changed"],
    ["target defeat", { sameTurn: true, sameTarget: true, targetStanding: false, effectiveDegree: 2, natural: 20 }, "target-defeated"],
    ["miss", { sameTurn: true, sameTarget: true, targetStanding: true, effectiveDegree: 1, natural: 20 }, "miss"],
    ["natural below 17", { sameTurn: true, sameTarget: true, targetStanding: true, effectiveDegree: 2, natural: 16 }, "natural-below-17"],
  ])("ends on %s", (_label, context, reason) => {
    const fulgor = createFulgorTrigger(20, 4, target, 1, "turn-a")!;
    const resolution = resolveFulgorContinuation(fulgor, context);
    expect(resolution.extendsChain).toBe(false);
    expect(resolution.reason).toBe(reason);
    expect(resolution.fulgor.active).toBe(false);
  });

  it("continues on 17+ against the same standing target and respects its limit", () => {
    const fulgor = createFulgorTrigger(20, 2, target, 0, "turn-a")!;
    const first = resolveFulgorContinuation(fulgor, {
      sameTurn: true,
      sameTarget: true,
      targetStanding: true,
      effectiveDegree: 2,
      natural: 17,
    });
    const atLimit = resolveFulgorContinuation(first.fulgor, {
      sameTurn: true,
      sameTarget: true,
      targetStanding: true,
      effectiveDegree: 2,
      natural: 20,
    });
    expect(first).toMatchObject({ extendsChain: true, chainCount: 1 });
    expect(atLimit).toMatchObject({ extendsChain: false, reason: "limit-reached" });
  });
});
