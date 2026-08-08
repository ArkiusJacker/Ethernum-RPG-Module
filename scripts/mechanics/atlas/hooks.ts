import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export async function onAtlasCombatUpdate(combat: Combat): Promise<void> {
  await UniqueMechanicsKernel.handleCombatTurnAdvance(combat);
}

export async function onAtlasRest(actor: Actor, rest: "short" | "long"): Promise<void> {
  if (rest === "long") await UniqueMechanicsKernel.atlasLongRestReset(actor);
  else await UniqueMechanicsKernel.atlasShortRestReset(actor);
}
