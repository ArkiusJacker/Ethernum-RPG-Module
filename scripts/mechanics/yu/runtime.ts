import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export async function executeYuAction(actor: Actor | null | undefined, actionId: string): Promise<unknown> {
  if (actionId === "rage") return UniqueMechanicsKernel.toggleYuRage(actor);
  if (actionId === "flurry-of-blows") return UniqueMechanicsKernel.useYuFlurryOfBlows(actor);
  if (actionId === "stunning-fist") return UniqueMechanicsKernel.rollYuStunningFistDamage(actor);
  throw new Error(`Unknown Yu action: ${actionId}`);
}
