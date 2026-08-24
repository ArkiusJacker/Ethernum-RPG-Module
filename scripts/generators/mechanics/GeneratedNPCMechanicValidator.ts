import {
  GENERATED_NPC_MECHANIC_SCHEMA_VERSION,
  type GeneratedMechanicComponent,
  type GeneratedNPCMechanicDefinition,
} from "./GeneratedNPCMechanicTypes.js";

const KINDS = new Set(["passive", "active", "reaction", "phase"]);
const COSTS = new Set<unknown>(["passive", "free", "reaction", 1, 2, 3]);
const SAVES = new Set(["fortitude", "reflex", "will"]);
const CONDITIONS = new Set(["frightened", "off-guard", "slowed", "enfeebled", "sickened", "dazzled"]);
const DAMAGE_TYPES = new Set(["acid", "bleed", "bludgeoning", "cold", "electricity", "fire", "force", "mental", "piercing", "poison", "slashing", "sonic", "spirit", "untyped", "vitality", "void"]);
const AI_MODES = new Set(["refine", "alternate", "name", "presentation", "trigger", "phase"]);

function safeText(value: unknown, maximum: number, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} deve ser texto.`);
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > maximum) throw new Error(`${label} está vazio ou excede ${maximum} caracteres.`);
  return normalized;
}

function finiteInteger(value: unknown, minimum: number, maximum: number, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${label} está fora dos limites permitidos.`);
  return parsed;
}

function validateComponent(component: GeneratedMechanicComponent, expectedKind: string): void {
  if (!component || component.kind !== expectedKind || !KINDS.has(component.kind)) throw new Error("Componente gerado possui tipo inválido.");
  if (!/^[a-z0-9][a-z0-9-]{2,100}$/.test(component.id) || !/^[a-z0-9][a-z0-9-]{2,100}$/.test(component.templateId)) throw new Error("Componente gerado possui identificador inválido.");
  if (component.experimental !== true || !component.name.startsWith("[TESTE]")) throw new Error("Templates experimentais devem permanecer marcados como [TESTE].");
  safeText(component.name, 160, "Nome do componente");
  safeText(component.summary, 500, "Resumo do componente");
  safeText(component.effect, 2_500, "Efeito do componente");
  if (component.trigger !== undefined) safeText(component.trigger, 700, "Gatilho do componente");
  if (component.requirements !== undefined) safeText(component.requirements, 700, "Requisito do componente");
  if (!COSTS.has(component.actionCost)) throw new Error("Custo de ação gerado não é permitido.");
  finiteInteger(component.powerCost, 1, 4, "Custo de poder");
  if (component.cooldownRounds !== undefined) finiteInteger(component.cooldownRounds, 1, 10, "Recarga");
  if (component.limitedUses !== undefined) finiteInteger(component.limitedUses, 1, 10, "Usos limitados");
  if (!Array.isArray(component.traits) || component.traits.length > 12 || component.traits.some(trait => !/^[a-z0-9-]{1,80}$/.test(trait))) throw new Error("Traits do componente são inválidos.");
  const operation = component.operation;
  if (!operation) return;
  if (operation.save) {
    if (!SAVES.has(operation.save.type)) throw new Error("Salvamento gerado não é permitido.");
    finiteInteger(operation.save.dc, 10, 60, "CD");
  }
  if (operation.damage) {
    if (!/^\d{1,2}d(?:4|6|8|10|12)(?:\s*[+-]\s*\d{1,3})?$/.test(operation.damage.formula)) throw new Error("Fórmula de dano gerada é inválida.");
    if (!DAMAGE_TYPES.has(operation.damage.type)) throw new Error("Tipo de dano gerado não é permitido.");
    if (component.actionCost === "passive" && !component.trigger) throw new Error("Dano gratuito sem custo ou gatilho não é permitido.");
  }
  if (operation.condition) {
    if (!CONDITIONS.has(operation.condition.slug)) throw new Error("Condição gerada não é permitida.");
    finiteInteger(operation.condition.value, 1, 3, "Valor de condição");
    finiteInteger(operation.condition.durationRounds, 1, 10, "Duração da condição");
  }
  if (operation.movement) finiteInteger(operation.movement.distance, 5, 200, "Deslocamento");
  if (operation.resource) {
    safeText(operation.resource.name, 80, "Nome do recurso");
    finiteInteger(operation.resource.maximum, 1, 10, "Máximo do recurso");
    finiteInteger(operation.resource.spend, 1, operation.resource.maximum, "Custo do recurso");
  }
}

export function validateGeneratedNPCMechanicDefinition(definition: GeneratedNPCMechanicDefinition): GeneratedNPCMechanicDefinition {
  if (!definition || definition.schemaVersion !== GENERATED_NPC_MECHANIC_SCHEMA_VERSION) throw new Error("Versão da mecânica gerada não é suportada.");
  if (!/^[a-z0-9][a-z0-9-]{2,100}$/.test(definition.id)) throw new Error("ID da mecânica gerada é inválido.");
  safeText(definition.name, 180, "Nome da mecânica");
  if (definition.description !== undefined) safeText(definition.description, 1_000, "Descrição da mecânica");
  if (!new Set(["deterministic", "ai-assisted", "manual"]).has(definition.source)) throw new Error("Origem da mecânica gerada é inválida.");
  if (!new Set(["standard", "elite", "boss"]).has(definition.complexity)) throw new Error("Complexidade da mecânica gerada é inválida.");
  const components = [definition.passive, definition.active, definition.reaction, definition.phase].filter(Boolean) as GeneratedMechanicComponent[];
  if (components.length < 2 || components.length > 4) throw new Error("A mecânica gerada deve possuir entre dois e quatro componentes.");
  if (definition.passive) validateComponent(definition.passive, "passive");
  if (definition.active) validateComponent(definition.active, "active");
  if (definition.reaction) validateComponent(definition.reaction, "reaction");
  if (definition.phase) validateComponent(definition.phase, "phase");
  const powerSpent = components.reduce((sum, component) => sum + component.powerCost, 0);
  if (powerSpent !== definition.metadata.powerSpent || powerSpent > definition.metadata.powerBudget) throw new Error("Orçamento de poder da mecânica gerada é inconsistente.");
  if (!new Set(["deterministic-generator", "ai-adapter", "manual"]).has(definition.metadata.origin)) throw new Error("Origem declarativa da mecânica gerada é inválida.");
  if (definition.source === "deterministic" && definition.metadata.origin !== "deterministic-generator") throw new Error("Mecânica determinística possui origem inconsistente.");
  if (definition.source === "ai-assisted") {
    const ai = definition.metadata.ai;
    if (definition.metadata.origin !== "ai-adapter" || !ai || !definition.name.startsWith("[TESTE — AI]")) throw new Error("Mecânica assistida por IA não possui identificação experimental completa.");
    safeText(ai.providerId, 80, "ID do provedor de IA");
    safeText(ai.providerLabel, 120, "Provedor de IA");
    safeText(ai.model, 160, "Modelo de IA");
    if (!AI_MODES.has(ai.mode) || !new Set(["pending", "accepted", "rejected"]).has(ai.decision)) throw new Error("Metadata de decisão da IA é inválida.");
    if (!Number.isFinite(ai.requestedAt) || !Number.isFinite(ai.completedAt) || ai.completedAt < ai.requestedAt) throw new Error("Timestamps da assistência de IA são inválidos.");
    if (ai.decidedAt !== undefined && (!Number.isFinite(ai.decidedAt) || ai.decidedAt < ai.completedAt)) throw new Error("Timestamp de decisão da IA é inválido.");
    if (!Array.isArray(ai.inputFields) || ai.inputFields.length === 0 || ai.inputFields.length > 16 || ai.inputFields.some(value => typeof value !== "string" || value.length > 240)) throw new Error("Limite de dados da IA é inválido.");
    if (!Array.isArray(ai.reasoningSummary) || ai.reasoningSummary.length > 8 || ai.reasoningSummary.some(value => typeof value !== "string" || value.length > 500)) throw new Error("Resumo de raciocínio da IA é inválido.");
  } else if (definition.metadata.ai) {
    throw new Error("Metadata de IA não pode acompanhar uma mecânica não assistida.");
  }
  if (!definition.metadata.actorUuid || !definition.metadata.actorFingerprint || !definition.metadata.seed) throw new Error("Metadata da mecânica gerada está incompleta.");
  if (definition.metadata.templateIds.length !== components.length || new Set(definition.metadata.templateIds).size !== components.length) throw new Error("Lista de templates gerados é inconsistente.");
  return definition;
}
