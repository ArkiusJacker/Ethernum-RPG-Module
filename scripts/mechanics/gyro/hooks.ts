import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export async function onGyroCombatUpdate(combat: Combat): Promise<void> {
  await UniqueMechanicsKernel.handleCombatTurnAdvance(combat);
}
