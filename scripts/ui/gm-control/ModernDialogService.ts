export interface ModernFormDialogOptions {
  confirmLabel?: string;
  confirmIcon?: string;
  onRender?: (form: HTMLFormElement) => void;
  secondaryAction?: {
    label: string;
    icon?: string;
    callback: () => void;
  };
}

interface ModernDialogInstance {
  element: HTMLElement;
}

interface ModernDialogButton {
  action: string;
  label: string;
  icon?: string;
  default?: boolean;
  callback?: (
    event: PointerEvent | SubmitEvent,
    button: HTMLButtonElement,
    dialog: ModernDialogInstance,
  ) => unknown;
}

interface ModernDialogConstructor {
  wait(options: {
    window: { title: string };
    classes?: string[];
    content: string;
    buttons: ModernDialogButton[];
    rejectClose?: boolean;
    render?: (event: Event, dialog: ModernDialogInstance) => void;
  }): Promise<unknown>;
}

function modernDialog(): ModernDialogConstructor | null {
  const root = globalThis as typeof globalThis & {
    foundry?: { applications?: { api?: { DialogV2?: ModernDialogConstructor } } };
  };
  return root.foundry?.applications?.api?.DialogV2 ?? null;
}

export function supportsModernDialogs(): boolean {
  return Boolean(modernDialog()?.wait);
}

function formFromDialog(dialog: ModernDialogInstance): HTMLFormElement | null {
  return dialog.element instanceof HTMLFormElement
    ? dialog.element
    : dialog.element.querySelector<HTMLFormElement>("form");
}

export async function showModernFormDialog(
  title: string,
  body: string,
  options: ModernFormDialogOptions = {},
): Promise<FormData | null> {
  const DialogV2 = modernDialog();
  const confirmLabel = options.confirmLabel ?? "Confirmar";
  const confirmIcon = options.confirmIcon ?? "fa-solid fa-check";
  if (DialogV2) {
    const result = await DialogV2.wait({
      window: { title },
      classes: ["ethernum-command-dialog-v2"],
      content: `<div class="ethernum-command-dialog">${body}</div>`,
      buttons: [{
        action: "confirm",
        label: confirmLabel,
        icon: confirmIcon,
        default: true,
        callback: (_event, button) => button.form ? new FormData(button.form) : null,
      }, ...(options.secondaryAction ? [{
        action: "secondary",
        label: options.secondaryAction.label,
        icon: options.secondaryAction.icon,
        callback: () => {
          options.secondaryAction?.callback();
          return null;
        },
      }] : []), {
        action: "cancel",
        label: "Cancelar",
        icon: "fa-solid fa-xmark",
        callback: () => null,
      }],
      rejectClose: false,
      ...(options.onRender ? {
        render: (_event, dialog) => {
          const form = formFromDialog(dialog);
          if (form) options.onRender?.(form);
        },
      } : {}),
    });
    return result instanceof FormData ? result : null;
  }

  return new Promise(resolve => {
    let settled = false;
    const finish = (value: FormData | null): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    new Dialog({
      title,
      content: `<form class="ethernum-command-dialog">${body}</form>`,
      buttons: {
        confirm: {
          icon: `<i class="${confirmIcon}"></i>`,
          label: confirmLabel,
          callback: html => finish(new FormData(html.find("form")[0] as HTMLFormElement)),
        },
        cancel: {
          icon: '<i class="fas fa-xmark"></i>',
          label: "Cancelar",
          callback: () => finish(null),
        },
        ...(options.secondaryAction ? {
          secondary: {
            icon: options.secondaryAction.icon
              ? `<i class="${options.secondaryAction.icon}"></i>`
              : undefined,
            label: options.secondaryAction.label,
            callback: () => {
              options.secondaryAction?.callback();
              finish(null);
            },
          },
        } : {}),
      },
      render: html => {
        const form = html.find("form")[0] as HTMLFormElement | undefined;
        if (form) options.onRender?.(form);
      },
      close: () => finish(null),
      default: "confirm",
    }).render(true);
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function showModernJsonDialog(title: string, value: unknown): void {
  const content = `<pre class="ethernum-gm-json">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
  const DialogV2 = modernDialog();
  if (DialogV2) {
    void DialogV2.wait({
      window: { title },
      classes: ["ethernum-json-dialog-v2"],
      content,
      buttons: [{ action: "close", label: game.i18n?.localize("ETHERNUM.Buttons.Close") ?? "Fechar", icon: "fa-solid fa-xmark", default: true }],
      rejectClose: false,
    });
    return;
  }
  new Dialog({
    title,
    content,
    buttons: { close: { label: game.i18n?.localize("ETHERNUM.Buttons.Close") ?? "Fechar" } },
  }).render(true);
}
