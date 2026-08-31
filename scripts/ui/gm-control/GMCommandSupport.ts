import { getAdministrativeCommunicatorService } from "../../administration/AdministrativeCommunicatorService.js";
import type { AdministrativeCommand } from "../../administration/AdministrativeCommunicatorTypes.js";
import { showModernFormDialog, showModernJsonDialog } from "./ModernDialogService.js";

export type GMControlDomainCommandHandler = (
  action: string,
  payload: Readonly<Record<string, string>>,
) => Promise<boolean>;

export function actors(): Actor[] {
  return (Array.from(game.actors ?? []) as Actor[]).filter(actor => (actor.type as string) === "character");
}

export function allActors(): Actor[] {
  return Array.from(game.actors ?? []) as Actor[];
}

export function users(): User[] {
  return Array.from(game.users ?? []) as User[];
}

export function collection<T>(value: unknown): T[] {
  if (!value || typeof (value as Iterable<T>)[Symbol.iterator] !== "function") return [];
  return Array.from(value as Iterable<T>);
}

export function actorByUuid(uuid: string | undefined): Actor | undefined {
  return uuid ? allActors().find(actor => actor.uuid === uuid) : undefined;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function field(data: FormData, name: string): string {
  return String(data.get(name) ?? "").trim();
}

export function csv(value: string): string[] {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

export function informationUnlocks(value: string): Map<string, number> {
  return new Map(csv(value).flatMap(entry => {
    const [id, raw] = entry.split(":").map(part => part.trim());
    const level = Math.max(0, Math.min(5, Math.floor(Number(raw))));
    return id && Number.isFinite(level) ? [[id, level] as const] : [];
  }));
}

export function randomId(prefix: string): string {
  return `${prefix}-${foundry.utils.randomID(24)}`;
}

export function actorLevel(actor: Actor): number {
  const source = actor as Actor & { level?: number; system?: Record<string, unknown> };
  const system = source.system ?? {};
  const details = system.details && typeof system.details === "object" ? system.details as Record<string, unknown> : {};
  const levelData = details.level && typeof details.level === "object" ? details.level as Record<string, unknown> : {};
  const parsed = Number(source.level ?? levelData.value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export async function formDialog(
  title: string,
  body: string,
  confirmLabel = "Confirmar",
): Promise<FormData | null> {
  return showModernFormDialog(title, body, { confirmLabel });
}

export async function runCommand(command: AdministrativeCommand): Promise<void> {
  const result = await getAdministrativeCommunicatorService().command(command);
  ui.notifications?.info(result.message);
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function showJson(title: string, value: unknown): void {
  showModernJsonDialog(title, value);
}

type FoundryFilePickerInstance = { render(force?: boolean): unknown };
type FoundryFilePickerConstructor = new (options: {
  type: "folder";
  activeSource: "data";
  current: string;
  callback: (path: string) => void;
}) => FoundryFilePickerInstance;

function filePickerConstructor(): FoundryFilePickerConstructor | null {
  const root = globalThis as typeof globalThis & {
    FilePicker?: FoundryFilePickerConstructor;
    foundry?: { applications?: { apps?: { FilePicker?: { implementation?: FoundryFilePickerConstructor } } } };
  };
  return root.foundry?.applications?.apps?.FilePicker?.implementation ?? root.FilePicker ?? null;
}

export function contractDocumentMigrationDialog(initialPath: string, filename: string): Promise<FormData | null> {
  return showModernFormDialog("Migrar relatório legado", `
    <p class="ethernum-command-dialog__notice"><i class="fas fa-folder-tree"></i> Escolha uma pasta no Data Folder. O arquivo legado será copiado sem sobrescrever conteúdo existente.</p>
    <label>Caminho portátil de destino<input name="selectedPath" value="${escapeHtml(initialPath)}" required></label>
    <button type="button" data-contract-file-picker><i class="fas fa-folder-open"></i><span>Selecionar pasta no Foundry</span></button>
    <label><input type="checkbox" name="confirm"> Confirmo a criação da cópia e a troca da referência ativa.</label>
  `, {
    confirmLabel: "Migrar documento",
    confirmIcon: "fa-solid fa-file-import",
    onRender: form => {
      const input = form.elements.namedItem("selectedPath") as HTMLInputElement | null;
      form.querySelector<HTMLButtonElement>("[data-contract-file-picker]")?.addEventListener("click", () => {
        const Picker = filePickerConstructor();
        if (!Picker) {
          ui.notifications?.error("O FilePicker do Foundry não está disponível.");
          return;
        }
        const current = String(input?.value ?? initialPath).replace(/\/[^/]*$/, "");
        new Picker({
          type: "folder",
          activeSource: "data",
          current,
          callback: directory => {
            if (input) input.value = `${String(directory).replace(/\/$/, "")}/${filename}`;
          },
        }).render(true);
      });
    },
  });
}
