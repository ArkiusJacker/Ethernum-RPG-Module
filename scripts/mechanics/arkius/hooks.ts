import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export async function onArkiusCombatUpdate(combat: Combat): Promise<void> {
  await UniqueMechanicsKernel.handleCombatTurnAdvance(combat);
}

export async function onArkiusRest(actor: Actor, rest: "short" | "long"): Promise<void> {
  if (rest === "long") await UniqueMechanicsKernel.longRestReset(actor);
  else await UniqueMechanicsKernel.shortRestReset(actor);
}
