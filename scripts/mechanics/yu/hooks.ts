import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export async function onYuCombatUpdate(combat: Combat): Promise<void> {
  await UniqueMechanicsKernel.handleCombatTurnAdvance(combat);
}

export async function onYuActorUpdate(actor: Actor, changed: unknown): Promise<void> {
  await UniqueMechanicsKernel.handleYuActorUpdate(actor, changed);
}

export async function onYuRest(actor: Actor, rest: "short" | "long"): Promise<void> {
  if (rest === "long") await UniqueMechanicsKernel.yuLongRestReset(actor);
  else await UniqueMechanicsKernel.yuShortRestReset(actor);
}
