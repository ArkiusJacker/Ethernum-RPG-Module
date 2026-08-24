import type {
  GeneratedMechanicComponent,
  GeneratedMechanicKind,
  NPCMechanicAnalysis,
  NPCMechanicRole,
} from "./GeneratedNPCMechanicTypes.js";

export interface NPCMechanicTemplateContext {
  analysis: NPCMechanicAnalysis;
  primaryRole: NPCMechanicRole;
  damageType: string;
  damageFormula: string;
  dc: number;
}

export interface NPCMechanicTemplate {
  id: string;
  kind: GeneratedMechanicKind;
  powerCost: number;
  roles: NPCMechanicRole[];
  traits?: string[];
  build: (context: NPCMechanicTemplateContext) => Omit<GeneratedMechanicComponent, "id" | "templateId" | "experimental" | "powerCost">;
}

function flavored(context: NPCMechanicTemplateContext, fallback: string): string {
  const trait = context.analysis.traits.find(value => ["fire", "electricity", "undead", "construct", "shadow", "water", "air", "plant", "demon", "dragon", "swarm"].includes(value));
  return trait ? `${fallback} (${trait})` : fallback;
}

export const NPC_MECHANIC_TEMPLATES: readonly NPCMechanicTemplate[] = [
  {
    id: "aura-template", kind: "passive", powerCost: 2,
    roles: ["controller", "caster", "boss"], traits: ["undead", "shadow", "demon", "dragon", "swarm"],
    build: context => ({
      kind: "passive", name: `[TESTE] Aura de ${flavored(context, "Pressão")}`,
      summary: "Uma aura telegráfica força inimigos próximos a decidir entre recuar ou resistir.",
      requirements: "O NPC está consciente.",
      effect: `Uma criatura inimiga que entrar ou começar o turno a 10 pés faz um teste de Vontade CD ${context.dc}. Em uma falha, fica frightened 1 até o fim do turno. Após o teste, fica imune a esta aura por 1 minuto.`,
      actionCost: "passive", traits: ["aura", "emotion", "mental"],
      operation: { save: { type: "will", dc: context.dc, basic: false }, condition: { slug: "frightened", value: 1, durationRounds: 1 } },
    }),
  },
  {
    id: "charge-template", kind: "active", powerCost: 2,
    roles: ["brute", "skirmisher", "boss"],
    build: context => ({
      kind: "active", name: "[TESTE] Investida Telegrafada",
      summary: "Avanço agressivo com rota visível e janela de contra-ataque.",
      requirements: "O NPC consegue percorrer ao menos 10 pés em linha razoavelmente direta.",
      effect: `O NPC Strides até duas vezes e então faz um Strike corpo a corpo. Se acertar, causa ${context.damageFormula} de dano ${context.damageType} adicional. Até o início do próximo turno, fica off-guard e não pode usar esta ação novamente.`,
      actionCost: 2, cooldownRounds: 1, traits: ["move", "attack"],
      operation: { damage: { formula: context.damageFormula, type: context.damageType }, movement: { distance: 50, mode: "stride" } },
    }),
  },
  {
    id: "reaction-template", kind: "reaction", powerCost: 2,
    roles: ["defender", "brute", "boss"],
    build: context => ({
      kind: "reaction", name: "[TESTE] Reação Instintiva",
      summary: "Resposta limitada a uma abertura clara do oponente.",
      trigger: "Uma criatura ao alcance erra um Strike contra o NPC.",
      effect: "O NPC Steps e pode fazer um Strike corpo a corpo contra a criatura que ativou a reação. O Strike sofre -2 de penalidade circunstancial.",
      actionCost: "reaction", traits: ["attack"],
    }),
  },
  {
    id: "counter-template", kind: "reaction", powerCost: 2,
    roles: ["caster", "controller", "support"],
    build: context => ({
      kind: "reaction", name: "[TESTE] Contrapulso",
      summary: "Interferência reativa que troca consistência por controle.",
      trigger: "Uma criatura a 30 pés conclui uma ação com o trait concentrate ou manipulate.",
      effect: `A criatura faz um teste de Fortitude CD ${context.dc}. Em uma falha, fica off-guard até o início do próximo turno do NPC; em falha crítica, também fica slowed 1 por 1 rodada. A criatura fica imune por 10 minutos.`,
      actionCost: "reaction", traits: ["concentrate"],
      operation: { save: { type: "fortitude", dc: context.dc, basic: false }, condition: { slug: "off-guard", value: 1, durationRounds: 1 } },
    }),
  },
  {
    id: "mark-template", kind: "active", powerCost: 2,
    roles: ["artillery", "skirmisher", "controller"],
    build: context => ({
      kind: "active", name: "[TESTE] Marca de Pressão",
      summary: "Escolhe um alvo e anuncia de onde virá a próxima ameaça.",
      effect: "Escolha uma criatura visível a 60 pés. Até o fim do próximo turno, o primeiro Strike do NPC contra ela ignora lesser cover. A marca termina após esse Strike e só uma criatura pode estar marcada.",
      actionCost: 1, traits: ["concentrate", "visual"],
    }),
  },
  {
    id: "resource-template", kind: "passive", powerCost: 2,
    roles: ["caster", "support", "boss"],
    build: context => ({
      kind: "passive", name: "[TESTE] Reserva Volátil",
      summary: "Um recurso pequeno e visível limita os efeitos mais fortes do NPC.",
      effect: "O NPC inicia o encontro com 2 cargas de Reserva. Uma vez por turno, pode gastar 1 carga após usar uma ação gerada para aumentar a CD dela em 1. As cargas não são recuperadas durante o encontro.",
      actionCost: "passive", limitedUses: 2, traits: [],
      operation: { resource: { name: "Reserva", maximum: 2, spend: 1 } },
    }),
  },
  {
    id: "phase-template", kind: "phase", powerCost: 3,
    roles: ["boss", "hybrid", "defender"],
    build: context => ({
      kind: "phase", name: "[TESTE] Segunda Leitura",
      summary: "Mudança de comportamento ao ficar ferido, sem conceder um turno extra.",
      trigger: "A primeira vez que o NPC fica com metade dos PV máximos ou menos.",
      effect: "No início do próximo turno, o NPC pode Step como ação livre. Até o fim do encontro, seu deslocamento aumenta em 5 pés, mas sua CA é reduzida em 1.",
      actionCost: "free", limitedUses: 1, traits: [],
      operation: { movement: { distance: 5, mode: "step" } },
    }),
  },
  {
    id: "finisher-template", kind: "phase", powerCost: 3,
    roles: ["brute", "artillery", "boss"],
    build: context => ({
      kind: "phase", name: "[TESTE] Golpe de Ruptura",
      summary: "Finalizador anunciado, limitado e arriscado.",
      requirements: "O NPC está com metade dos PV máximos ou menos.",
      effect: `Uma vez por encontro, o NPC prepara o golpe e fica off-guard. No começo do próximo turno, se ainda puder agir, criaturas em uma linha de 30 pés fazem Reflexos CD ${context.dc}; sofrem ${context.damageFormula} de dano ${context.damageType} básico.`,
      actionCost: 2, limitedUses: 1, traits: ["concentrate"],
      operation: { save: { type: "reflex", dc: context.dc, basic: true }, damage: { formula: context.damageFormula, type: context.damageType } },
    }),
  },
  {
    id: "summon-template", kind: "active", powerCost: 3,
    roles: ["caster", "support", "boss"], traits: ["demon", "undead", "plant", "construct"],
    build: context => ({
      kind: "active", name: "[TESTE] Reforço Vinculado",
      summary: "Convoca apoio com duração e frequência limitadas.",
      effect: `Uma vez por encontro, o NPC convoca uma criatura de nível ${Math.max(-1, context.analysis.level - 4)} em um espaço livre a 30 pés. Ela age após o NPC e desaparece após 3 rodadas ou ao chegar a 0 PV.`,
      actionCost: 3, limitedUses: 1, traits: ["concentrate", "summon"],
    }),
  },
  {
    id: "hazard-template", kind: "active", powerCost: 2,
    roles: ["artillery", "controller", "caster"],
    build: context => ({
      kind: "active", name: "[TESTE] Ponto de Ruptura",
      summary: "Perigo localizado que exige reposicionamento.",
      effect: `Escolha uma explosão de 10 pés a até 60 pés. A área fica claramente marcada até o início do próximo turno do NPC; então criaturas nela fazem Reflexos CD ${context.dc} e sofrem ${context.damageFormula} de dano ${context.damageType} básico.`,
      actionCost: 2, cooldownRounds: 2, traits: ["concentrate"],
      operation: { save: { type: "reflex", dc: context.dc, basic: true }, damage: { formula: context.damageFormula, type: context.damageType } },
    }),
  },
  {
    id: "movement-template", kind: "active", powerCost: 2,
    roles: ["skirmisher", "artillery", "hybrid"],
    build: context => ({
      kind: "active", name: "[TESTE] Passagem Cortante",
      summary: "Reposicionamento que não concede dano gratuito.",
      effect: "O NPC Strides até seu deslocamento. Durante esse movimento pode atravessar o espaço de uma criatura, mas deve terminar em um espaço livre. Cada criatura atravessada pode usar uma reação para Step.",
      actionCost: 1, cooldownRounds: 1, traits: ["move"],
      operation: { movement: { distance: Math.max(20, ...context.analysis.speeds.map(speed => speed.value)), mode: "reposition" } },
    }),
  },
  {
    id: "zone-template", kind: "passive", powerCost: 2,
    roles: ["defender", "controller", "support"],
    build: context => ({
      kind: "passive", name: "[TESTE] Zona de Domínio",
      summary: "O posicionamento do NPC define uma pequena área de influência.",
      effect: "Enquanto o NPC não tiver se movido desde o início do turno, quadrados adjacentes são terreno difícil para inimigos. O efeito termina imediatamente quando o NPC se move ou fica unconscious.",
      actionCost: "passive", traits: [],
    }),
  },
  {
    id: "escalation-template", kind: "phase", powerCost: 3,
    roles: ["boss", "caster", "controller"],
    build: context => ({
      kind: "phase", name: "[TESTE] Escalada Instável",
      summary: "A ameaça cresce em troca de uma defesa visivelmente menor.",
      trigger: "No início do turno enquanto estiver com metade dos PV máximos ou menos.",
      effect: `O NPC recebe um marcador de Escalada, até 3. Cada marcador acrescenta 1 ao dano dos Strikes e reduz a CA do NPC em 1. Todos os marcadores terminam quando o NPC fica unconscious.`,
      actionCost: "passive", traits: [],
    }),
  },
] as const;

export function templateScore(template: NPCMechanicTemplate, context: NPCMechanicTemplateContext): number {
  let score = 1;
  if (template.roles.includes(context.primaryRole)) score += 6;
  for (const role of context.analysis.roles.slice(0, 3)) if (template.roles.includes(role.role)) score += Math.round(role.weight * 10);
  for (const trait of template.traits ?? []) if (context.analysis.traits.includes(trait)) score += 5;
  if (template.id === "summon-template" && context.analysis.level < 3) score = 0;
  return score;
}
