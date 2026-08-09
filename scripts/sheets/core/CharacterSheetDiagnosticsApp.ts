import { ETHERNUM } from "../../config.js";
import { CharacterSheetController } from "./CharacterSheetController.js";
import {
  CHARACTER_SHEET_DIAGNOSTICS_TEMPLATE,
  copyCharacterSheetDiagnostics,
  createCharacterSheetDiagnosticsFromController,
  type CharacterSheetDiagnosticsSnapshot,
} from "./CharacterSheetDiagnosticsService.js";
import { PF2eBridgeTelemetry } from "./PF2eBridgeTelemetry.js";

function localize(key: string, fallback: string): string {
  const value = game.i18n?.localize(key);
  return value && value !== key ? value : fallback;
}

async function copySnapshot(snapshot: CharacterSheetDiagnosticsSnapshot): Promise<void> {
  const result = await copyCharacterSheetDiagnostics(snapshot);
  if (result.copied) {
    ui.notifications?.info(localize(
      "ETHERNUM.CharacterSheet.Diagnostics.Copied",
      "Character sheet diagnostic copied.",
    ));
    return;
  }
  ui.notifications?.warn(localize(
    "ETHERNUM.CharacterSheet.Diagnostics.CopyUnavailable",
    "Clipboard access is unavailable. The diagnostic remains visible in this panel.",
  ));
}

export async function openCharacterSheetDiagnostics(actor: Actor): Promise<boolean> {
  if (!game.user?.isGM) {
    ui.notifications?.warn(localize(
      "ETHERNUM.CharacterSheet.Errors.Permission",
      "You do not have permission to perform this action.",
    ));
    return false;
  }

  let controllerDiagnostics = CharacterSheetController.diagnostics(actor);
  if (!controllerDiagnostics) {
    await CharacterSheetController.build(actor);
    controllerDiagnostics = CharacterSheetController.diagnostics(actor);
  }
  if (!controllerDiagnostics) return false;

  const moduleVersion = String(game.modules.get(ETHERNUM.MODULE_NAME)?.version ?? "unknown");
  const snapshot = createCharacterSheetDiagnosticsFromController({
    isGM: true,
    diagnostics: controllerDiagnostics,
    ethernumVersion: moduleVersion,
    telemetry: PF2eBridgeTelemetry.list({ actorId: controllerDiagnostics.actorId }),
    capabilityStatus: controllerDiagnostics.capabilityStatus,
  });
  if (!snapshot) return false;

  const content = await renderTemplate(CHARACTER_SHEET_DIAGNOSTICS_TEMPLATE, snapshot);
  const bindCopy = (html: JQuery<HTMLElement>) => {
    html.find('[data-action="copy-sheet-diagnostics"]').on("click", event => {
      event.preventDefault();
      void copySnapshot(snapshot);
    });
  };

  new Dialog({
    title: localize("ETHERNUM.CharacterSheet.Diagnostics.Title", "Character Sheet Diagnostic"),
    content,
    buttons: {
      copy: {
        icon: '<i class="fas fa-copy"></i>',
        label: localize("ETHERNUM.CharacterSheet.Diagnostics.Copy", "Copy Diagnostic"),
        callback: () => void copySnapshot(snapshot),
      },
      close: {
        icon: '<i class="fas fa-xmark"></i>',
        label: localize("Close", "Close"),
      },
    },
    default: "close",
    render: bindCopy,
  }, {
    classes: ["dialog", "ethernum-character-sheet-diagnostics-dialog"],
    width: 780,
    height: "auto",
  }).render(true);
  return true;
}
