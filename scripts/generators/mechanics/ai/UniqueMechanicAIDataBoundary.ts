import type { GeneratedMechanicComponent, GeneratedNPCMechanicDefinition, NPCMechanicAnalysis } from "../GeneratedNPCMechanicTypes.js";
import type { UniqueMechanicAIOptions, UniqueMechanicAISafeInput } from "./UniqueMechanicAITypes.js";
import { UNIQUE_MECHANIC_AI_SCHEMA_VERSION } from "./UniqueMechanicAITypes.js";

export const UNIQUE_MECHANIC_AI_DATA_FIELDS = Object.freeze([
  "Nome, nível, traits, tamanho e deslocamentos do NPC",
  "Strikes, fórmulas e tipos de dano",
  "Conjuração, ações e reações do NPC",
  "Papéis mecânicos ponderados",
  "Complexidade, idioma e tema informado pelo GM",
  "Prévia determinística atualmente visível",
]);

export const UNIQUE_MECHANIC_AI_EXCLUDED_DATA = Object.freeze([
  "Journals e notas secretas do mestre",
  "Conversas privadas e mensagens de jogadores",
  "Inventários ou fichas de outros Actors",
  "Exportações do mundo, cenas e documentos não relacionados",
  "Credenciais, tokens e segredos de provedor",
]);

function componentText(component: GeneratedMechanicComponent | undefined) {
  if (!component) return undefined;
  return {
    name: component.name,
    summary: component.summary,
    ...(component.trigger ? { trigger: component.trigger } : {}),
    ...(component.requirements ? { requirements: component.requirements } : {}),
    effect: component.effect,
  };
}

function safeTheme(value: string | undefined): string | undefined {
  const theme = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
  return theme || undefined;
}

export function buildUniqueMechanicAISafeInput(
  analysis: NPCMechanicAnalysis,
  definition: GeneratedNPCMechanicDefinition,
  options: UniqueMechanicAIOptions,
): UniqueMechanicAISafeInput {
  const theme = safeTheme(options.theme);
  return {
    schemaVersion: UNIQUE_MECHANIC_AI_SCHEMA_VERSION,
    mode: options.mode,
    context: {
      npc: {
        name: analysis.actorName,
        level: analysis.level,
        traits: [...analysis.traits],
        size: analysis.size,
        movement: analysis.speeds.map(speed => ({ type: speed.type, value: speed.value })),
        attacks: analysis.strikes.map(strike => ({
          name: strike.name,
          ranged: strike.ranged,
          reach: strike.reach,
          damageFormula: strike.damageFormula,
          damageTypes: [...strike.damageTypes],
          traits: [...strike.traits],
        })),
        damageTypes: [...analysis.damageTypes],
        spellcasting: analysis.spellcasting,
        actions: [...analysis.actions],
        reactions: [...analysis.reactions],
        roles: analysis.roles.map(role => ({ ...role, reasons: [...role.reasons] })),
      },
      request: {
        complexity: definition.complexity,
        ...(theme ? { theme } : {}),
        language: String(options.language ?? "pt-BR").slice(0, 20),
      },
      deterministicDraft: {
        name: definition.name,
        ...(definition.description ? { description: definition.description } : {}),
        components: {
          ...(definition.passive ? { passive: componentText(definition.passive)! } : {}),
          ...(definition.active ? { active: componentText(definition.active)! } : {}),
          ...(definition.reaction ? { reaction: componentText(definition.reaction)! } : {}),
          ...(definition.phase ? { phase: componentText(definition.phase)! } : {}),
        },
      },
    },
  };
}
