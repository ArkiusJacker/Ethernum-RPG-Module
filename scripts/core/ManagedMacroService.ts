import { ETHERNUM } from "../config.js";
import type { ManagedMacroDefinition } from "../mechanics/types.js";

export type { ManagedMacroDefinition } from "../mechanics/types.js";

interface MacroDocumentLike {
  id?: string;
  name?: string;
  command?: string;
  img?: string;
  flags?: Record<string, unknown>;
  getFlag?: (scope: string, key: string) => unknown;
  update: (data: Record<string, unknown>, operation?: Record<string, unknown>) => Promise<unknown>;
}

export interface ManagedMacroReport {
  created: string[];
  updated: string[];
  adopted: string[];
  preservedPersonal: string[];
  preservedModified: string[];
}

function moduleFlags(macro: MacroDocumentLike): Record<string, unknown> {
  const flags = macro.flags?.[ETHERNUM.MODULE_NAME];
  return flags && typeof flags === "object" ? flags as Record<string, unknown> : {};
}

function managedMacroId(macro: MacroDocumentLike): string {
  const fromMethod = macro.getFlag?.(ETHERNUM.MODULE_NAME, "managedMacro");
  const fromData = moduleFlags(macro).managedMacro;
  return typeof (fromMethod ?? fromData) === "string" ? String(fromMethod ?? fromData) : "";
}

function isUserModified(macro: MacroDocumentLike): boolean {
  return Boolean(
    macro.getFlag?.(ETHERNUM.MODULE_NAME, "userModified")
    ?? moduleFlags(macro).userModified,
  );
}

function macroName(definition: ManagedMacroDefinition, personalCollision: boolean): string {
  return personalCollision ? `${definition.name} (Ethernum)` : definition.name;
}

export async function ensureManagedMacros(
  definitions: ManagedMacroDefinition[],
): Promise<ManagedMacroReport> {
  const report: ManagedMacroReport = {
    created: [],
    updated: [],
    adopted: [],
    preservedPersonal: [],
    preservedModified: [],
  };
  if (!game.user?.isGM) return report;

  const macros = Array.from(game.macros ?? []) as unknown as MacroDocumentLike[];
  const ownerPermission = (globalThis as {
    CONST?: { DOCUMENT_OWNERSHIP_LEVELS?: { OWNER?: number } };
  }).CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  const MacroClass = (globalThis as {
    Macro?: {
      create?: (
        data: Record<string, unknown>,
        operation?: Record<string, unknown>,
      ) => Promise<MacroDocumentLike | null>;
    };
  }).Macro;

  for (const definition of definitions) {
    let macro = macros.find(candidate => managedMacroId(candidate) === definition.id);
    let adopted = false;

    if (!macro) {
      const legacyNames = new Set([definition.name, ...(definition.legacyNames ?? [])]);
      const legacyCommands = new Set([definition.command, ...(definition.legacyCommands ?? [])]);
      macro = macros.find(candidate =>
        legacyNames.has(String(candidate.name ?? ""))
        && legacyCommands.has(String(candidate.command ?? "")),
      );
      adopted = Boolean(macro);
    }

    const personalCollision = macros.some(candidate =>
      candidate !== macro
      && candidate.name === definition.name
      && managedMacroId(candidate) === "",
    );

    if (!macro) {
      const created = await MacroClass?.create?.({
        name: macroName(definition, personalCollision),
        type: "script",
        img: definition.img,
        command: definition.command,
        ownership: { default: ownerPermission },
        flags: {
          [ETHERNUM.MODULE_NAME]: {
            managedMacro: definition.id,
          },
        },
      }, { render: false });
      if (created) macros.push(created);
      report.created.push(definition.id);
      if (personalCollision) report.preservedPersonal.push(definition.name);
      continue;
    }

    const userModified = isUserModified(macro);
    const updates: Record<string, unknown> = {
      [`flags.${ETHERNUM.MODULE_NAME}.managedMacro`]: definition.id,
      ownership: { default: ownerPermission },
    };
    if (!userModified) {
      if (macro.command !== definition.command) updates.command = definition.command;
      if (macro.img !== definition.img) updates.img = definition.img;
    } else {
      report.preservedModified.push(definition.id);
    }
    if (personalCollision && macro.name === definition.name) {
      updates.name = macroName(definition, true);
      report.preservedPersonal.push(definition.name);
    }

    await macro.update(updates, { render: false });
    if (adopted) report.adopted.push(definition.id);
    else report.updated.push(definition.id);
  }

  if (report.preservedPersonal.length > 0) {
    ui.notifications?.warn(game.i18n!.localize("ETHERNUM.ManagedMacros.PersonalCollision"));
  }
  return report;
}
