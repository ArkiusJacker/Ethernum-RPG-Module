import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";

export async function executeBayleAction(
  actor: Actor | null | undefined,
  actionId: string,
): Promise<unknown> {
  const canonicalActionId = {
    "dragon-breath": "bayle-breath",
    "dragon-roar": "bayle-roar",
    "lightning-lances": "placidusax-lances",
    "bayle-closure": "draconic-closure",
  }[actionId] ?? actionId;
  return UniqueMechanicsKernel.useBayleAction(actor, canonicalActionId);
}
