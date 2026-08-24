import type { UniqueMechanicAIDraft, UniqueMechanicAIDraftComponent } from "./UniqueMechanicAITypes.js";
import { UNIQUE_MECHANIC_AI_SCHEMA_VERSION } from "./UniqueMechanicAITypes.js";

type Data = Record<string, unknown>;

export class UniqueMechanicAIValidationError extends Error {
  constructor(message: string, readonly code: "INVALID_JSON" | "SCHEMA_FAILURE") {
    super(message);
    this.name = "UniqueMechanicAIValidationError";
  }
}

function record(value: unknown, label: string): Data {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new UniqueMechanicAIValidationError(`${label} deve ser um objeto JSON.`, "SCHEMA_FAILURE");
  return value as Data;
}

function keys(value: Data, allowed: readonly string[], label: string): void {
  const extras = Object.keys(value).filter(key => !allowed.includes(key));
  if (extras.length > 0) throw new UniqueMechanicAIValidationError(`${label} contém campos não permitidos: ${extras.join(", ")}.`, "SCHEMA_FAILURE");
}

function text(value: unknown, maximum: number, label: string): string {
  if (typeof value !== "string") throw new UniqueMechanicAIValidationError(`${label} deve ser texto.`, "SCHEMA_FAILURE");
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > maximum) throw new UniqueMechanicAIValidationError(`${label} está vazio ou excede ${maximum} caracteres.`, "SCHEMA_FAILURE");
  return normalized;
}

function optionalText(value: unknown, maximum: number, label: string): string | undefined {
  return value === undefined ? undefined : text(value, maximum, label);
}

function component(value: unknown, label: string): UniqueMechanicAIDraftComponent | undefined {
  if (value === undefined) return undefined;
  const source = record(value, label);
  keys(source, ["name", "summary", "trigger", "requirements", "effect"], label);
  const trigger = optionalText(source.trigger, 700, `${label}.trigger`);
  const requirements = optionalText(source.requirements, 700, `${label}.requirements`);
  return {
    name: text(source.name, 160, `${label}.name`),
    summary: text(source.summary, 500, `${label}.summary`),
    ...(trigger ? { trigger } : {}),
    ...(requirements ? { requirements } : {}),
    effect: text(source.effect, 2_500, `${label}.effect`),
  };
}

function textList(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 8) throw new UniqueMechanicAIValidationError(`${label} deve ter no máximo 8 textos.`, "SCHEMA_FAILURE");
  return value.map((entry, index) => text(entry, 500, `${label}[${index}]`));
}

function parse(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.length > 64_000) throw new UniqueMechanicAIValidationError("Resposta JSON do provedor excede 64 KB.", "INVALID_JSON");
  try {
    return JSON.parse(value);
  } catch {
    throw new UniqueMechanicAIValidationError("O provedor não retornou JSON válido.", "INVALID_JSON");
  }
}

export function validateUniqueMechanicAIDraft(value: unknown): UniqueMechanicAIDraft {
  const source = record(parse(value), "Resposta de IA");
  keys(source, ["schemaVersion", "name", "concept", "passive", "active", "reaction", "phase", "reasoningSummary", "warnings"], "Resposta de IA");
  if (source.schemaVersion !== UNIQUE_MECHANIC_AI_SCHEMA_VERSION) throw new UniqueMechanicAIValidationError("Versão do draft de IA não é suportada.", "SCHEMA_FAILURE");
  const passive = component(source.passive, "passive");
  const active = component(source.active, "active");
  const reaction = component(source.reaction, "reaction");
  const phase = component(source.phase, "phase");
  const reasoningSummary = textList(source.reasoningSummary, "reasoningSummary");
  const warnings = textList(source.warnings, "warnings");
  return {
    schemaVersion: UNIQUE_MECHANIC_AI_SCHEMA_VERSION,
    name: text(source.name, 180, "name"),
    concept: text(source.concept, 1_000, "concept"),
    ...(passive ? { passive } : {}),
    ...(active ? { active } : {}),
    ...(reaction ? { reaction } : {}),
    ...(phase ? { phase } : {}),
    ...(reasoningSummary ? { reasoningSummary } : {}),
    ...(warnings ? { warnings } : {}),
  };
}
