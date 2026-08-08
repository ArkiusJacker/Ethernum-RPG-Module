import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

function args(payload: Record<string, unknown>): unknown[] {
  return Array.isArray(payload.args) ? payload.args : [];
}

export async function executeCharlesAction(
  actor: Actor | null | undefined,
  actionId: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  const explicit = args(payload);
  switch (actionId) {
    case "impulse-climb": return UniqueMechanicsKernel.useCharlesImpulseClimb(actor);
    case "containment-shot": return UniqueMechanicsKernel.useCharlesContainmentShot(actor);
    case "vector-pull": return UniqueMechanicsKernel.useCharlesVectorPull(actor);
    case "cushioning-net": return UniqueMechanicsKernel.deployCharlesCushioningNet(actor, Boolean(explicit[0]));
    case "overloaded-net": return UniqueMechanicsKernel.deployCharlesCushioningNet(actor, true);
    case "craft-imagination": return UniqueMechanicsKernel.useCharlesCraftImagination(actor);
    default: throw new Error(`Unknown Charles action: ${actionId}`);
  }
}
