import { FieldCommunicatorOverlay } from "../FieldCommunicatorOverlay.js";
import type { GMControlDomainCommandHandler } from "./GMCommandSupport.js";

export const handleCommunicatorCommand: GMControlDomainCommandHandler = async (action, payload) => {
  if (action === "preview-player") {
    if (!payload.userId) throw new Error("Selecione um jogador para a pré-visualização.");
    await FieldCommunicatorOverlay.openPreview(payload.userId);
    return true;
  }
  if (action === "open-document") {
    const document = payload.uuid
      ? await fromUuid(payload.uuid as Parameters<typeof fromUuid>[0]) as { sheet?: { render?: (force?: boolean) => unknown } } | null
      : null;
    if (!document?.sheet?.render) throw new Error("Documento indisponível.");
    document.sheet.render(true);
    return true;
  }
  return false;
};
