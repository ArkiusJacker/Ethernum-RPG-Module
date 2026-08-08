import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export async function executeAtlasAction(
  actor: Actor | null | undefined,
  actionId: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  if (actionId === "divine-gaze") return UniqueMechanicsKernel.activateAtlasDivineGaze(actor);
  if (actionId === "complete-divine-gaze") {
    const explicit = Array.isArray(payload.args) ? payload.args : [];
    return UniqueMechanicsKernel.completeAtlasDivineGaze(actor, explicit[0] === undefined ? true : Boolean(explicit[0]));
  }
  throw new Error(`Unknown Atlas action: ${actionId}`);
}
