import { deterministicHash, deterministicId, deterministicRandom } from "../shared/DeterministicRandom.js";
import {
  GENERATED_NPC_MECHANIC_SCHEMA_VERSION,
  GENERATED_NPC_MECHANIC_VERSION,
  type GeneratedMechanicComponent,
  type GeneratedMechanicKind,
  type GeneratedNPCMechanicDefinition,
  type NPCMechanicComplexity,
  type NPCMechanicGenerationInput,
} from "./GeneratedNPCMechanicTypes.js";
import {
  NPC_MECHANIC_TEMPLATES,
  templateScore,
  type NPCMechanicTemplate,
  type NPCMechanicTemplateContext,
} from "./NPCMechanicTemplates.js";
import { validateGeneratedNPCMechanicDefinition } from "./GeneratedNPCMechanicValidator.js";

const BUDGETS: Record<NPCMechanicComplexity, number> = { standard: 4, elite: 6, boss: 9 };
const TRAIT_DAMAGE: Record<string, string> = {
  fire: "fire", electricity: "electricity", undead: "void", shadow: "void", water: "cold",
  air: "electricity", plant: "poison", demon: "fire", dragon: "spirit",
};

function complexity(input: NPCMechanicGenerationInput): NPCMechanicComplexity {
  if (input.complexity && input.complexity !== "auto") return input.complexity;
  const traits = new Set(input.analysis.traits);
  const bossWeight = input.analysis.roles.find(role => role.role === "boss")?.weight ?? 0;
  if (traits.has("unique") || bossWeight >= 0.25) return "boss";
  if (traits.has("elite") || (input.analysis.actions.length >= 3 && input.analysis.reactions.length > 0)) return "elite";
  return "standard";
}

function damageType(input: NPCMechanicGenerationInput): string {
  for (const trait of input.analysis.traits) if (TRAIT_DAMAGE[trait]) return TRAIT_DAMAGE[trait]!;
  return input.analysis.damageTypes.find(type => type && type !== "untyped") ?? "physical";
}

function safeDamageType(type: string): string {
  return type === "physical" ? "bludgeoning" : type;
}

function weightedTemplate(
  kind: GeneratedMechanicKind,
  context: NPCMechanicTemplateContext,
  random: () => number,
  used: ReadonlySet<string>,
  maximumPower: number,
): NPCMechanicTemplate {
  const candidates = NPC_MECHANIC_TEMPLATES.filter(template => template.kind === kind && !used.has(template.id) && template.powerCost <= maximumPower);
  const weighted = candidates.map(template => ({ template, score: templateScore(template, context) })).filter(entry => entry.score > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.score, 0);
  let point = random() * total;
  for (const entry of weighted) {
    point -= entry.score;
    if (point <= 0) return entry.template;
  }
  const fallback = weighted.at(-1)?.template;
  if (!fallback) throw new Error(`Nenhum template ${kind} está disponível.`);
  return fallback;
}

function component(template: NPCMechanicTemplate, context: NPCMechanicTemplateContext, definitionId: string): GeneratedMechanicComponent {
  return {
    id: deterministicId("part", `${definitionId}:${template.id}`),
    templateId: template.id,
    experimental: true,
    powerCost: template.powerCost,
    ...template.build(context),
  };
}

function rolesLabel(input: NPCMechanicGenerationInput): string {
  return input.analysis.roles.slice(0, 2).map(role => role.role).join(" + ") || "hybrid";
}

export function generateNPCMechanic(
  input: NPCMechanicGenerationInput,
  now = Date.now(),
): GeneratedNPCMechanicDefinition {
  const seed = String(input.seed || "ethernum-npc").trim().slice(0, 160) || "ethernum-npc";
  const selectedComplexity = complexity(input);
  const signature = `${input.analysis.actorUuid}|${input.analysis.fingerprint}|${selectedComplexity}|${seed}`;
  const definitionId = deterministicId("npc-mechanic", signature);
  const random = deterministicRandom(signature);
  const primaryRole = input.analysis.roles[0]?.role ?? "hybrid";
  const type = safeDamageType(damageType(input));
  const dice = Math.max(1, Math.min(12, Math.ceil((input.analysis.level + 2) / 3)));
  const context: NPCMechanicTemplateContext = {
    analysis: input.analysis,
    primaryRole,
    damageType: type,
    damageFormula: `${dice}d6`,
    dc: Math.max(14, Math.min(50, input.analysis.level + 16)),
  };
  const required: GeneratedMechanicKind[] = selectedComplexity === "standard"
    ? ["passive", random() >= 0.35 ? "active" : "reaction"]
    : selectedComplexity === "elite"
      ? ["passive", "active", "reaction"]
      : ["passive", "active", "reaction", "phase"];
  const used = new Set<string>();
  const selected: GeneratedMechanicComponent[] = [];
  let spent = 0;
  for (const [index, kind] of required.entries()) {
    const remainingKinds = required.slice(index + 1);
    const reserved = remainingKinds.reduce((sum, remainingKind) => {
      const minimum = Math.min(...NPC_MECHANIC_TEMPLATES.filter(template => template.kind === remainingKind).map(template => template.powerCost));
      return sum + minimum;
    }, 0);
    const template = weightedTemplate(kind, context, random, used, BUDGETS[selectedComplexity] - spent - reserved);
    used.add(template.id);
    const part = component(template, context, definitionId);
    selected.push(part);
    spent += part.powerCost;
  }
  const byKind = Object.fromEntries(selected.map(entry => [entry.kind, entry])) as Partial<Record<GeneratedMechanicKind, GeneratedMechanicComponent>>;
  const warnings: string[] = [];
  if (input.analysis.strikes.length === 0) warnings.push("Nenhum Strike foi detectado; referências a Strike exigem conferência manual.");
  if (input.analysis.spellcasting && !input.analysis.actions.length) warnings.push("Conjuração detectada sem ações auxiliares; revise a economia de ações da prévia.");
  if (input.analysis.traits.length === 0) warnings.push("O NPC não possui traits legíveis; a afinidade temática usa apenas função e estatísticas.");
  const powerBudget = BUDGETS[selectedComplexity];
  const powerSpent = selected.reduce((sum, entry) => sum + entry.powerCost, 0);
  const templateIds = selected.map(entry => entry.templateId);
  const definition: GeneratedNPCMechanicDefinition = {
    id: definitionId,
    schemaVersion: GENERATED_NPC_MECHANIC_SCHEMA_VERSION,
    name: `[TESTE] Protocolo ${rolesLabel(input)} de ${input.analysis.actorName}`,
    description: `Mecânica ${selectedComplexity} gerada offline para ${input.analysis.actorName}.`,
    source: "deterministic",
    complexity: selectedComplexity,
    roles: input.analysis.roles,
    ...(byKind.passive ? { passive: byKind.passive } : {}),
    ...(byKind.active ? { active: byKind.active } : {}),
    ...(byKind.reaction ? { reaction: byKind.reaction } : {}),
    ...(byKind.phase ? { phase: byKind.phase } : {}),
    warnings,
    metadata: {
      origin: "deterministic-generator",
      generatedAt: now,
      generatorVersion: GENERATED_NPC_MECHANIC_VERSION,
      seed,
      actorUuid: input.analysis.actorUuid,
      actorFingerprint: input.analysis.fingerprint,
      templateIds,
      powerBudget,
      powerSpent,
    },
  };
  if (deterministicHash(JSON.stringify(templateIds)) === 0) warnings.push("A semente produziu uma assinatura vazia improvável; regenere para inspeção.");
  return validateGeneratedNPCMechanicDefinition(definition);
}

export interface GeneratedNPCMechanicTextEdit {
  definitionName?: string;
  components?: Partial<Record<GeneratedMechanicKind, Partial<Pick<GeneratedMechanicComponent, "name" | "summary" | "trigger" | "requirements" | "effect">>>>;
}

export function editGeneratedNPCMechanic(
  definition: GeneratedNPCMechanicDefinition,
  edit: GeneratedNPCMechanicTextEdit,
): GeneratedNPCMechanicDefinition {
  const update = (componentValue: GeneratedMechanicComponent | undefined): GeneratedMechanicComponent | undefined => {
    if (!componentValue) return undefined;
    const values = edit.components?.[componentValue.kind];
    return values ? { ...componentValue, ...values } : componentValue;
  };
  return validateGeneratedNPCMechanicDefinition({
    ...definition,
    ...(edit.definitionName ? { name: edit.definitionName } : {}),
    passive: update(definition.passive),
    active: update(definition.active),
    reaction: update(definition.reaction),
    phase: update(definition.phase),
  });
}
