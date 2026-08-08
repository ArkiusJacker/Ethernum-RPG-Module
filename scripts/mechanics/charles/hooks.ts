import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export async function onCharlesCombatUpdate(combat: Combat): Promise<void> {
  await UniqueMechanicsKernel.handleCombatTurnAdvance(combat);
}

export async function onCharlesRest(actor: Actor, rest: "short" | "long"): Promise<void> {
  if (rest === "long") await UniqueMechanicsKernel.charlesLongRestReset(actor);
  else await UniqueMechanicsKernel.charlesShortRestReset(actor);
}
