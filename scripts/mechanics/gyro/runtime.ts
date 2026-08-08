import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";
import type { GyroExecutionMode } from "./state.js";

export async function executeGyroAction(
  actor: Actor | null | undefined,
  actionId: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  const explicit = Array.isArray(payload.args) ? payload.args : [];
  const techniqueId = actionId === "technique"
    ? String(payload.techniqueId ?? explicit[0] ?? "steel-ball")
    : actionId;
  const mode = String(payload.mode ?? explicit[1] ?? "stable") as GyroExecutionMode;
  return UniqueMechanicsKernel.useGyroTechnique(actor, techniqueId, mode);
}
