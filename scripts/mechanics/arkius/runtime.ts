import { UniqueMechanicsKernel } from "../../unique/internal/UniqueMechanicsKernel.js";
import type { ArkiusConcordiaAspect, ArkiusSolarAreaId } from "./state.js";

function args(payload: Record<string, unknown>): unknown[] {
  return Array.isArray(payload.args) ? payload.args : [];
}

export async function executeArkiusAction(
  actor: Actor | null | undefined,
  actionId: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  const explicit = args(payload);
  switch (actionId) {
    case "nucleo-em-brasas": return UniqueMechanicsKernel.toggleNucleoEmBrasas(actor);
    case "sintonia-fluxo": return UniqueMechanicsKernel.setSintoniaFluxo(actor);
    case "sintonia-brasas": return UniqueMechanicsKernel.setSintoniaBrasas(actor);
    case "consume-sintonia-fluxo": return UniqueMechanicsKernel.consumeSintoniaFluxo(actor);
    case "consume-sintonia-brasas": return UniqueMechanicsKernel.consumeSintoniaBrasas(actor);
    case "aura-cinetica": return UniqueMechanicsKernel.toggleArkiusKineticAura(actor);
    case "thermal-nimbus": return UniqueMechanicsKernel.toggleThermalNimbus(actor);
    case "gate-junction-fire": return UniqueMechanicsKernel.toggleGateJunctionFire(actor);
    case "persistent-fire-proc": return UniqueMechanicsKernel.markPersistentFireProc(actor);
    case "exaurir-o-sol": return UniqueMechanicsKernel.exaurirOSol(actor);
    case "resiliencia-reativa": return UniqueMechanicsKernel.resilienciaReativa(actor);
    case "solar-area": return UniqueMechanicsKernel.setArkiusSolarArea(actor, explicit[0] as ArkiusSolarAreaId);
    case "concordia-aspect": return UniqueMechanicsKernel.setArkiusConcordiaAspect(actor, explicit[0] as ArkiusConcordiaAspect);
    default: throw new Error(`Unknown Arkius action: ${actionId}`);
  }
}
