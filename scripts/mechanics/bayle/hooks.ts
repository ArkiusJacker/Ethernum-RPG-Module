import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export async function onBayleCombatUpdate(combat: Combat): Promise<void> {
  await UniqueMechanicsKernel.handleCombatTurnAdvance(combat);
}
