import { executeArkiusAction } from "../mechanics/arkius/runtime.js";
import type { ArkiusJackerState } from "../mechanics/arkius/state.js";
import { executeAtlasAction } from "../mechanics/atlas/runtime.js";
import type { AtlasState } from "../mechanics/atlas/state.js";
import { executeBayleAction } from "../mechanics/bayle/runtime.js";
import { executeCharlesAction } from "../mechanics/charles/runtime.js";
import { executeGyroAction } from "../mechanics/gyro/runtime.js";
import type { GyroExecutionMode } from "../mechanics/gyro/state.js";
import { executeYuAction } from "../mechanics/yu/runtime.js";
import type { YuRageState } from "../mechanics/yu/state.js";
import { UniqueMechanicsKernel } from "./internal/UniqueMechanicsKernel.js";

export * from "./internal/UniqueMechanicsKernel.js";

/** Compatibility surface retained for existing macros and third-party integrations. */
export class UniqueMechanicsLegacy extends UniqueMechanicsKernel {
  static override toggleNucleoEmBrasas(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    return executeArkiusAction(actor, "nucleo-em-brasas") as Promise<ArkiusJackerState | null>;
  }

  static override toggleArkiusKineticAura(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    return executeArkiusAction(actor, "aura-cinetica") as Promise<ArkiusJackerState | null>;
  }

  static override toggleThermalNimbus(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    return executeArkiusAction(actor, "thermal-nimbus") as Promise<ArkiusJackerState | null>;
  }

  static override toggleGateJunctionFire(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    return executeArkiusAction(actor, "gate-junction-fire") as Promise<ArkiusJackerState | null>;
  }

  static override useCharlesImpulseClimb(actor?: Actor | null): Promise<void> {
    return executeCharlesAction(actor, "impulse-climb") as Promise<void>;
  }

  static override useCharlesContainmentShot(actor?: Actor | null): Promise<void> {
    return executeCharlesAction(actor, "containment-shot") as Promise<void>;
  }

  static override useCharlesVectorPull(actor?: Actor | null): Promise<void> {
    return executeCharlesAction(actor, "vector-pull") as Promise<void>;
  }

  static override deployCharlesCushioningNet(
    actor?: Actor | null,
    overloaded = false,
  ): Promise<void> {
    return executeCharlesAction(
      actor,
      overloaded ? "overloaded-net" : "cushioning-net",
    ) as Promise<void>;
  }

  static override activateAtlasDivineGaze(actor?: Actor | null): Promise<AtlasState | null> {
    return executeAtlasAction(actor, "divine-gaze") as Promise<AtlasState | null>;
  }

  static override completeAtlasDivineGaze(actor?: Actor | null, announce = true): Promise<AtlasState | null> {
    return executeAtlasAction(actor, "complete-divine-gaze", { args: [announce] }) as Promise<AtlasState | null>;
  }

  static override toggleYuRage(actor?: Actor | null): Promise<YuRageState | null> {
    return executeYuAction(actor, "rage") as Promise<YuRageState | null>;
  }

  static override useYuFlurryOfBlows(actor?: Actor | null): Promise<void> {
    return executeYuAction(actor, "flurry-of-blows") as Promise<void>;
  }

  static override useBayleAction(actor?: Actor | null, actionId = "placidusax-lightning"): Promise<void> {
    return executeBayleAction(actor, actionId) as Promise<void>;
  }

  static override useGyroTechnique(
    actor?: Actor | null,
    techniqueId = "steel-ball",
    mode: GyroExecutionMode = "stable",
  ): Promise<void> {
    return executeGyroAction(actor, techniqueId, { mode }) as Promise<void>;
  }
}
