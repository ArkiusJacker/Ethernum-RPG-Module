import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export async function syncArkiusCanvas(actor: Actor): Promise<string | undefined> {
  return UniqueMechanicsKernel.syncArkiusKineticAuraTemplate(actor);
}

export async function clearArkiusCanvas(actor: Actor, announce = true): Promise<unknown> {
  return UniqueMechanicsKernel.clearArkiusKineticAura(actor, announce);
}
