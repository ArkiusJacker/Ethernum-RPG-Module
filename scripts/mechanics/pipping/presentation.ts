import {
  resolvePippingActionFormula,
  resolveScalingProgression,
  type PippingScalingValue,
} from "./actions.js";
import {
  resolvePippingTargetSpec,
  type PippingAreaDefinition,
  type PippingActionDefinition,
  type PippingAutomationMode,
  type PippingMechanicalEffect,
  type PippingOutcomeDefinition,
} from "./progression.js";
import type { PippingDegreeOfSuccess } from "./rules.js";
import type { PippingExpression, PippingTier } from "./state.js";

export type PippingSummaryTone = "neutral" | "positive" | "danger" | "automation";

export interface PippingActionSummaryEntry {
  id: string;
  label: string;
  value: string;
  icon?: string;
  tone?: PippingSummaryTone;
  tooltip?: string;
}

export interface PippingScalingSheetEntry {
  id: string;
  label: string;
  current: string;
  next?: {
    level: number;
    value: string;
  };
  maximum?: {
    level?: number;
    value: string;
  };
}

export interface PippingAutomationSheetEntry {
  component: string;
  mode: PippingAutomationMode;
  note?: string;
}

export interface PippingOutcomeSheetEntry {
  degree: PippingDegreeOfSuccess;
  label: string;
  text: string;
}

export interface PippingDetailEntry {
  id: string;
  label?: string;
  value: string;
  tone?: PippingSummaryTone;
}

export interface PippingDetailSection {
  id: string;
  label: string;
  entries: PippingDetailEntry[];
}

export interface PippingActionHeader {
  symbol: string;
  actionLabel: string;
  actionType: string;
  name: string;
  pulseCost: string;
  expression?: string;
  traits: string[];
  tier: string;
  minimumLevel: string;
  frequency?: string;
}

export interface PippingActivationPresentation {
  label: string;
  actionType: string;
  pulseCost: string;
  optionalCosts: string[];
  frequency?: string;
}

export interface PippingTargetingPresentation {
  target: string;
  range?: string;
  area?: string;
  origin?: string;
}

export interface PippingResolutionPresentation {
  defense?: string;
  dc?: number;
  basic?: boolean;
  incapacitation?: boolean;
}

export type PippingLocalizer = (
  key: string,
  replacements?: Readonly<Record<string, string | number>>,
) => string;

export interface PippingPresentationContext {
  actorLevel: number;
  tier: PippingTier;
  dc: number;
  charismaModifier: number;
  isGM: boolean;
  localize?: PippingLocalizer;
}

export interface PippingResolvedActionPresentation {
  name: string;
  flavor: string;
  header: PippingActionHeader;
  activation: PippingActivationPresentation;
  targeting: PippingTargetingPresentation;
  resolution?: PippingResolutionPresentation;
  summaryEntries: PippingActionSummaryEntry[];
  outcomes: PippingOutcomeSheetEntry[];
  scalingEntries: PippingScalingSheetEntry[];
  durationEntries: string[];
  requirementEntries: string[];
  automationEntries: PippingAutomationSheetEntry[];
  details: PippingDetailSection[];
}

interface PippingActionFallback {
  name: string;
  effect: string;
  note: string;
  fixedRange?: number;
  rangeScaling?: PippingScalingValue;
  targetOverride?: string;
  duration?: string[];
}

const ACTION_FALLBACKS: Record<string, PippingActionFallback> = {
  "animated-shadow": {
    name: "Sombra Animada",
    effect: "Posiciona a sombra de Pipping como uma extensão tática no campo.",
    note: "Uma vez por rodada, a sombra pode deixar um inimigo adjacente Off-Guard contra o Strike de um aliado.",
    duration: ["Permanece até ser reposicionada ou removida."],
  },
  "mirrored-shadows": {
    name: "Sombras Espelhadas",
    effect: "Cria imagens que desviam ataques e retaliam quando são destruídas.",
    note: "Cada ataque contra Pipping realiza o teste simples indicado antes de atingir uma imagem.",
    duration: ["Permanece até todas as imagens serem destruídas ou a preparação diária ser reiniciada."],
  },
  "dark-whisper": {
    name: "Sussurro das Trevas",
    effect: "O alvo recebe +1 de bônus circunstancial no próximo ataque ou salvamento.",
    note: "Em luz fraca ou escuridão, o custo pode ser intensificado para aumentar o bônus para +2.",
    fixedRange: 30,
    targetOverride: "1 aliado voluntário",
    duration: [
      "Consumido no primeiro ataque ou salvamento realizado pelo alvo.",
      "Se não for consumido, termina no início do próximo turno de Pipping.",
    ],
  },
  "void-echoes": {
    name: "Ecos do Vazio",
    effect: "Recupera 1 Pulso Sombrio quando o gatilho da reação é atendido.",
    note: "A reação pode ser usada somente uma vez por rodada.",
    fixedRange: 30,
    duration: ["Instantâneo."],
  },
  "living-night-song": {
    name: "Canção da Noite Viva",
    effect: "Cria escuridão mágica que protege aliados e enfraquece defesas inimigas contra Pipping.",
    note: "A composição precisa ser sustentada a cada rodada para permanecer ativa.",
    duration: ["Sustentada; termina quando não for sustentada."],
  },
  "ruin-note": {
    name: "Nota de Ruína",
    effect: "Causa dano de vazio; na falha crítica também aplica Frightened 1.",
    note: "O dano é resolvido por um salvamento básico de Vontade.",
    fixedRange: 30,
    duration: ["Dano instantâneo; Frightened segue as regras normais da condição."],
  },
  "restoring-pulse": {
    name: "Pulso Restaurador",
    effect: "Restaura PV de uma criatura viva voluntária e pode reduzir Frightened em luz fraca ou escuridão.",
    note: "A redução de Frightened exige que o requisito de iluminação seja atendido.",
    fixedRange: 30,
    duration: ["Cura instantânea; a redução de condição é imediata."],
  },
  "broken-meter": {
    name: "Compasso Quebrado",
    effect: "Força movimento seguro e deixa o alvo Off-Guard em uma falha.",
    note: "O movimento forçado exige confirmação do mestre antes de alterar a posição do token.",
    fixedRange: 30,
    duration: ["Off-Guard e o bloqueio de reações terminam no início do próximo turno de Pipping."],
  },
  "shadow-form": {
    name: "Forma das Sombras",
    effect: "Teleporta Pipping entre áreas válidas de luz fraca ou escuridão.",
    note: "O destino deve ser confirmado no canvas e respeitar o alcance atual.",
    rangeScaling: {
      base: 30,
      baseLevel: 5,
      increase: 30,
      everyLevels: 1,
      maximum: 120,
      increaseLevels: [9, 17],
    },
    duration: ["Instantâneo."],
  },
  "void-touch": {
    name: "Toque do Vazio",
    effect: "Causa dano de vazio e pode aplicar dano persistente e Enfeebled 1.",
    note: "O dano inicial usa Fortitude básico; os efeitos adicionais dependem do grau de sucesso.",
    fixedRange: 30,
    duration: ["Dano inicial instantâneo; dano persistente segue as regras da condição.", "Enfeebled dura 1 rodada."],
  },
  "black-order-mantle": {
    name: "Manto da Ordem Negra",
    effect: "Reduz a instância de dano que acionou a reação e pode conceder PV temporários.",
    note: "Os PV temporários são concedidos somente quando o alvo está na escuridão da Noite Viva.",
    fixedRange: 30,
    duration: ["A redução vale apenas para a instância que acionou a reação; PV temporários seguem as regras normais."],
  },
  "shadow-resonance": {
    name: "Ressonância Sombria",
    effect: "Faz o agressor enfrentar Vontade, podendo aplicar Frightened e bloquear reações.",
    note: "A reação exige que o agressor tenha atingido o aliado protegido.",
    fixedRange: 30,
    duration: ["O bloqueio de reações termina no início do próximo turno de Pipping."],
  },
  "night-emanation": {
    name: "Emanação da Noite",
    effect: "Causa dano de vazio ou frio a inimigos na emanação e pode aplicar Enfeebled.",
    note: "A geometria parte do token de Pipping e inclui somente inimigos dentro da emanação.",
    duration: ["Dano instantâneo; Enfeebled dura 1 rodada."],
  },
  "requiem-persist": {
    name: "Réquiem dos Que Persistem",
    effect: "Cura até três aliados e concede +1 de status ao próximo salvamento.",
    note: "O bônus é consumido pelo primeiro salvamento antes de expirar.",
    fixedRange: 30,
    duration: ["Cura instantânea; o bônus expira no início do próximo turno de Pipping."],
  },
  "shadow-king": {
    name: "Sombra-Rei",
    effect: "Cria um domínio centrado na Sombra Animada, com terreno difícil para inimigos.",
    note: "A área usa a posição da Sombra Animada como origem, não a posição de Pipping.",
    duration: ["A área persiste até ser removida; condições aplicadas duram 1 rodada."],
  },
  "ending-chorus": {
    name: "Coro do Fim",
    effect: "Causa dano de vazio em um cone e pode aplicar Frightened e Stupefied.",
    note: "Somente criaturas dentro do cone confirmado são alvos.",
    duration: ["Dano instantâneo; Stupefied dura 1 rodada."],
  },
  "gentle-night-liturgy": {
    name: "Liturgia da Noite Mansa",
    effect: "Cura aliados na emanação e permite reduzir uma condição escolhida.",
    note: "Cada alvo escolhe entre Frightened, Sickened ou Stupefied para reduzir em 1.",
    duration: ["Cura e redução de condição são instantâneas."],
  },
  "abyss-voice": {
    name: "Voz do Abismo",
    effect: "Força uma ou duas ações válidas do próximo turno do alvo.",
    note: "O texto do comando e as ações válidas exigem confirmação do mestre.",
    fixedRange: 30,
    duration: ["As ações comandadas são consumidas até o fim do próximo turno do alvo."],
  },
  "beyond-form": {
    name: "Além da Forma",
    effect: "Concede voo, passagem por espaços de criaturas e resistência 15, exceto contra força e espírito.",
    note: "A passagem por objetos permanece assistida e exige confirmação do mestre.",
    duration: ["Termina no início do próximo turno de Pipping."],
  },
  "dead-sun-epitaph": {
    name: "Epitáfio do Sol Morto",
    effect: "Causa dano de vazio ou frio em uma explosão e cria escuridão mágica persistente.",
    note: "A explosão e a escuridão usam o mesmo ponto escolhido no canvas.",
    duration: ["Dano inicial instantâneo; escuridão por 1 minuto; dano persistente segue as regras da condição."],
  },
  "night-refuses-end": {
    name: "A Noite Recusa o Fim",
    effect: "Impede a morte do alvo, restaura PV, evita o aumento de Wounded e aplica Doomed 1.",
    note: "A reação só pode ser usada quando o alvo chegaria a 0 PV ou sofreria um efeito de morte.",
    fixedRange: 30,
    duration: ["A cura e a prevenção são imediatas; Doomed segue as regras normais da condição."],
  },
  "forbidden-performance": {
    name: "A Performance Proibida",
    effect: "Concede Quickened limitado aos aliados e impõe efeitos mentais aos inimigos na emanação.",
    note: "Quickened permite apenas Step, Stride, Strike ou Sustain conforme a definição da habilidade.",
    duration: ["Quickened, Slowed e demais efeitos duram 1 rodada, salvo indicação do grau de sucesso."],
  },
};

const DEGREE_ORDER: PippingDegreeOfSuccess[] = [
  "criticalSuccess",
  "success",
  "failure",
  "criticalFailure",
];

const ROMAN_TIERS: Record<PippingTier, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
};

const CONDITION_LABELS: Record<string, string> = {
  "off-guard": "Off-Guard",
  "no-reactions": "sem reações",
  "frightened-1": "Frightened 1",
  "frightened-2": "Frightened 2",
  "stupefied-1": "Stupefied 1",
  "slowed-1": "Slowed 1",
  "slowed-2": "Slowed 2",
  "enfeebled-1": "Enfeebled 1",
  "enfeebled-2": "Enfeebled 2",
};

const PIPPING_PRESENTATION_KEY = "ETHERNUM.Unique.Pipping.Presentation";

const DURATION_LABELS: Record<string, string> = {
  "1-round": "1 rodada",
  "1-minute": "1 minuto",
  "end-of-target-turn": "até o fim do turno do alvo",
  "persistent": "persistente",
  "sustained": "sustentada",
  "start-of-pipping-next-turn": "até o início do próximo turno de Pipping",
};

const REQUIREMENT_LABELS: Record<string, string> = {
  "ally-would-take-damage": "Gatilho: Pipping ou um aliado seria atingido por dano.",
  "attack-reaction": "A reação contra um ataque precisa ser declarada pelo jogador.",
  "canvas-placement": "Escolha e confirme uma posição válida no canvas.",
  "command-text": "O comando precisa ser válido e confirmado pelo mestre.",
  "failed-occult-or-unique-save": "Gatilho: uma criatura falha contra magia ocultista ou habilidade única.",
  "frightened-reduction-requires-dim-light-or-darkness": "A redução de Frightened exige luz fraca ou escuridão.",
  "forced-movement": "O movimento forçado precisa ser confirmado antes de alterar a posição do token.",
  "intensify-dim-light-or-darkness": "Intensificar exige luz fraca ou escuridão.",
  "object-passage-assisted": "Atravessar objetos exige confirmação do mestre.",
  "persistent-area-template": "A Sombra Animada deve estar posicionada e a área persistente deve ser confirmada.",
  "protected-ally-was-hit": "Gatilho: o aliado protegido foi atingido.",
  "sustain-each-round": "A composição precisa ser sustentada a cada rodada.",
  "target-chooses-condition-reduction": "Cada alvo escolhe qual condição elegível será reduzida.",
  "target-would-reach-zero-hp-or-gain-death-effect": "Gatilho: o alvo chegaria a 0 PV ou receberia um efeito de morte.",
  "trigger-message-id": "A reação precisa estar associada ao evento que produziu o gatilho.",
  "valid-reaction-trigger": "O mestre confirma que o gatilho da reação é válido.",
  "valid-teleport-destination": "O destino deve estar no alcance e em luz fraca ou escuridão.",
};

const EFFECT_LABELS: Record<string, string> = {
  "ally-darkness-vision": "Visão dos aliados na escuridão",
  "ally-quickened-limited-actions": "Quickened limitado dos aliados",
  "animated-shadow-placement": "Posicionamento da Sombra Animada",
  "basic-save-damage": "Dano do salvamento básico",
  "commanded-actions-tracker": "Controle das ações comandadas",
  "doomed": "Aplicação de Doomed",
  "enemy-only-difficult-terrain": "Terreno difícil para inimigos",
  "enemy-save-penalty-against-pipping": "Penalidade nos salvamentos inimigos",
  "fly-speed-equals-land-speed": "Deslocamento de voo",
  "healing": "Cura",
  "independent-magical-darkness": "Escuridão mágica persistente",
  "mirrored-shadow-images": "Imagens sombrias",
  "move-through-creature-spaces": "Movimento por espaços de criaturas",
  "next-ally-strike-off-guard": "Off-Guard no próximo Strike aliado",
  "next-attack-or-save": "Bônus no próximo ataque ou salvamento",
  "next-save-bonus": "Bônus no próximo salvamento",
  "object-passage": "Passagem por objetos",
  "prevent-wounded-from-triggering-event": "Prevenção do aumento de Wounded",
  "recover-pulse": "Recuperação de Pulso Sombrio",
  "reduce-chosen-condition": "Redução da condição escolhida",
  "reduce-frightened": "Redução de Frightened",
  "reduce-triggering-damage-instance": "Redução da instância de dano",
  "resistance-all-except-force-spirit": "Resistência, exceto força e espírito",
  "retaliation-void-d6-per-tier": "Retaliação das imagens",
  "simple-check-dc-5": "Teste simples CD 5",
  "teleport": "Seleção e execução do teleporte",
  "temporary-hp-in-darkness": "PV temporários na escuridão",
};

const OUTCOME_NOTE_LABELS: Record<string, string> = {
  "persistent-same-type-2d6": "Aplica 2d6 de dano persistente do mesmo tipo.",
  "persistent-same-type-4d6": "Aplica 4d6 de dano persistente do mesmo tipo.",
  "persistent-void-1d6": "Aplica 1d6 de dano persistente de vazio.",
  "persistent-void-2d6": "Aplica 2d6 de dano persistente de vazio.",
};

const CONSUMPTION_LABELS: Record<string, string> = {
  "commanded-action": "ação comandada",
  "first-attack-or-save": "primeiro ataque ou salvamento",
  "first-save": "primeiro salvamento",
  "next-ally-strike": "próximo Strike aliado",
  "triggering-damage": "dano que acionou a reação",
};

function replaceTokens(
  value: string,
  replacements: Readonly<Record<string, string | number>>,
): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replaceAll(`{${key}}`, String(replacement)),
    value,
  );
}

export function presentPippingText(
  localize: PippingLocalizer | undefined,
  key: string,
  fallback: string,
  replacements: Readonly<Record<string, string | number>> = {},
): string {
  const localized = localize?.(key, replacements);
  const value = localized && localized !== key ? localized : fallback;
  return replaceTokens(value, replacements);
}

function presentationText(
  localize: PippingLocalizer | undefined,
  key: string,
  fallback: string,
  replacements: Readonly<Record<string, string | number>> = {},
): string {
  return presentPippingText(localize, `${PIPPING_PRESENTATION_KEY}.${key}`, fallback, replacements);
}

function keyedPresentationText(
  localize: PippingLocalizer | undefined,
  group: string,
  id: string,
  fallback: string,
  replacements: Readonly<Record<string, string | number>> = {},
): string {
  return presentationText(localize, `${group}.${id}`, fallback, replacements);
}

function actionFallback(action: PippingActionDefinition): PippingActionFallback {
  return ACTION_FALLBACKS[action.id] ?? {
    name: action.id.split("-").map(part => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" "),
    effect: "Resolve o efeito descrito pela habilidade.",
    note: "Consulte os componentes mecânicos abaixo para a resolução.",
  };
}

function actionTypeLabel(
  action: PippingActionDefinition,
  localize: PippingLocalizer | undefined,
): string {
  if (action.actions === "reaction") {
    return presentPippingText(localize, "ETHERNUM.Unique.Pipping.ActionTypes.reaction", "Reação");
  }
  if (action.actions === "free") {
    return presentPippingText(localize, "ETHERNUM.Unique.Pipping.ActionTypes.free", "Ação livre");
  }
  if (action.actions === "passive") {
    return presentPippingText(localize, "ETHERNUM.Unique.Pipping.ActionTypes.passive", "Passivo");
  }
  return presentationText(
    localize,
    action.actions === 1 ? "Activation.OneAction" : "Activation.MultipleActions",
    action.actions === 1 ? "{count} ação" : "{count} ações",
    { count: action.actions },
  );
}

function actionSymbol(action: PippingActionDefinition): string {
  if (typeof action.actions === "number") return "◆".repeat(action.actions);
  if (action.actions === "reaction") return "↶";
  if (action.actions === "free") return "◇";
  return "●";
}

function actionTypeName(action: PippingActionDefinition): string {
  if (action.actionType === "reaction") return "reaction";
  if (action.actionType === "free") return "free";
  if (action.actionType === "passive") return "passive";
  return "action";
}

function pulseCostLabel(cost: number, localize: PippingLocalizer | undefined): string {
  return presentationText(localize, "Units.PulseCost", "{cost} PS", { cost });
}

function expressionLabel(
  expression: PippingExpression | undefined,
  localize: PippingLocalizer | undefined,
): string | undefined {
  if (!expression) return undefined;
  const fallbacks: Record<PippingExpression, string> = {
    destruction: "Destruição",
    order: "Ordem",
    chaos: "Caos",
  };
  return presentPippingText(
    localize,
    `ETHERNUM.Unique.Pipping.Expressions.${expression}`,
    fallbacks[expression],
  );
}

function frequencyLabel(
  action: PippingActionDefinition,
  localize: PippingLocalizer | undefined,
): string | undefined {
  const frequency = action.frequencyDefinition;
  if (!frequency) return undefined;
  const interval = frequency.interval === "day" ? "Day" : "Round";
  const quantity = frequency.uses === 1 ? "Once" : "Multiple";
  const fallback = frequency.uses === 1
    ? `1 vez por ${frequency.interval === "day" ? "dia" : "rodada"}`
    : `${frequency.uses} vezes por ${frequency.interval === "day" ? "dia" : "rodada"}`;
  return presentationText(
    localize,
    `Frequency.${quantity}Per${interval}`,
    fallback,
    { uses: frequency.uses },
  );
}

function formatFeet(value: number, localize: PippingLocalizer | undefined): string {
  return presentationText(localize, "Units.Feet", "{value} pés", { value });
}

function targetMaximumLabel(
  action: PippingActionDefinition,
  localize: PippingLocalizer | undefined,
  resolvedMaximum?: number,
): string {
  const fallback = actionFallback(action);
  const target = action.targets;
  if (!target) {
    return action.area
      ? presentationText(localize, "Targets.CreaturesInArea", "Criaturas na área")
      : presentationText(localize, "Targets.NoDirectTarget", "Sem alvo direto");
  }
  const maximum = resolvedMaximum ?? target.maximum;
  switch (target.type) {
    case "self":
      return presentationText(localize, "Targets.Self", "Pipping");
    case "ally":
      return maximum === 1
        ? presentationText(localize, "Targets.OneWillingAlly", fallback.targetOverride ?? "1 aliado voluntário")
        : presentationText(
          localize,
          "Targets.UpToWillingAllies",
          "até {maximum} aliados voluntários",
          { maximum: maximum ?? 1 },
        );
    case "allies":
      return maximum
        ? presentationText(localize, "Targets.UpToAllies", "até {maximum} aliados", { maximum })
        : presentationText(localize, "Targets.AlliesInArea", "aliados na área");
    case "enemy":
      return maximum === 1
        ? presentationText(localize, "Targets.OneEnemy", "1 inimigo")
        : presentationText(localize, "Targets.UpToEnemies", "até {maximum} inimigos", { maximum: maximum ?? 1 });
    case "enemies":
      return maximum
        ? presentationText(localize, "Targets.UpToEnemies", "até {maximum} inimigos", { maximum })
        : presentationText(localize, "Targets.EnemiesInArea", "inimigos na área");
    case "creature":
      return maximum === 1
        ? presentationText(localize, "Targets.OneCreature", "1 criatura")
        : presentationText(localize, "Targets.UpToCreatures", "até {maximum} criaturas", { maximum: maximum ?? 1 });
    case "creatures":
      return maximum
        ? presentationText(localize, "Targets.UpToCreatures", "até {maximum} criaturas", { maximum })
        : presentationText(localize, "Targets.CreaturesInAreaLower", "criaturas na área");
  }
}

function resolvedRangeScaling(action: PippingActionDefinition): PippingScalingValue | undefined {
  const fallback = actionFallback(action);
  return action.targets?.range ?? action.range ?? fallback.rangeScaling;
}

function areaTypeLabel(
  action: PippingActionDefinition,
  localize: PippingLocalizer | undefined,
): string | undefined {
  const area = resolvePippingTargetSpec(
    action,
    action.requiredLevel,
    action.requiredTier,
  ).area;
  if (!area) return undefined;
  const fallbacks = {
    burst: "explosão de {size} pés",
    cone: "cone de {size} pés",
    darkness: "escuridão de {size} pés",
    emanation: "emanação de {size} pés",
  };
  return presentationText(
    localize,
    `Areas.Required.${area.type}`,
    fallbacks[area.type],
    { size: area.size },
  );
}

function resolvedAreaLabel(
  area: { type: PippingAreaDefinition["type"]; size: number } | undefined,
  localize: PippingLocalizer | undefined,
): string | undefined {
  if (!area) return undefined;
  const fallbacks = {
    burst: "Explosão de {size} pés",
    cone: "Cone de {size} pés",
    darkness: "Escuridão de {size} pés",
    emanation: "Emanação de {size} pés",
  };
  return presentationText(
    localize,
    `Areas.Display.${area.type}`,
    fallbacks[area.type],
    { size: area.size },
  );
}

function originLabel(
  origin: PippingAreaDefinition["origin"] | undefined,
  localize: PippingLocalizer | undefined,
): string | undefined {
  if (!origin) return undefined;
  const fallbacks = {
    shadow: "Sombra Animada",
    point: "ponto escolhido e confirmado",
    self: "token de Pipping",
  };
  return presentationText(
    localize,
    `Origins.${origin}`,
    fallbacks[origin],
  );
}

function defenseLabel(
  defense: PippingActionDefinition["defense"],
  localize: PippingLocalizer | undefined,
): string | undefined {
  if (!defense) return undefined;
  const fallbacks = {
    fortitude: "Fortitude",
    reflex: "Reflexos",
    will: "Vontade",
  };
  return presentPippingText(
    localize,
    `ETHERNUM.Unique.Pipping.Defenses.${defense}`,
    fallbacks[defense],
  );
}

function durationLabel(
  duration: string | undefined,
  localize: PippingLocalizer | undefined,
): string | undefined {
  if (!duration) return undefined;
  const fallback = DURATION_LABELS[duration] ?? duration.replaceAll("-", " ");
  return keyedPresentationText(localize, "Durations", duration, fallback);
}

function formatScalingEntry(
  id: string,
  label: string,
  scaling: PippingScalingValue,
  actorLevel: number,
  format: (value: number) => string,
): PippingScalingSheetEntry {
  const progression = resolveScalingProgression(scaling, actorLevel);
  return {
    id,
    label,
    current: format(progression.current),
    ...(progression.nextIncrease
      ? {
        next: {
          level: progression.nextIncrease.level,
          value: format(progression.nextIncrease.value),
        },
      }
      : {}),
    ...(progression.maximum === undefined
      ? {}
      : {
        maximum: {
          ...(progression.maximumLevel === undefined ? {} : { level: progression.maximumLevel }),
          value: format(progression.maximum),
        },
      }),
  };
}

function effectLabel(
  effectId: string,
  localize: PippingLocalizer | undefined,
): string {
  return keyedPresentationText(
    localize,
    "Effects",
    effectId,
    EFFECT_LABELS[effectId] ?? effectId.replaceAll("-", " "),
  );
}

function conditionLabel(
  conditionId: string,
  localize: PippingLocalizer | undefined,
): string {
  return keyedPresentationText(
    localize,
    "Conditions",
    conditionId,
    CONDITION_LABELS[conditionId] ?? conditionId.replaceAll("-", " "),
  );
}

function effectScalingEntry(
  action: PippingActionDefinition,
  effect: PippingMechanicalEffect,
  context: PippingPresentationContext,
): PippingScalingSheetEntry | null {
  const value = effect.value;
  if (typeof value === "object" && value !== null && "base" in value) {
    return formatScalingEntry(
      effect.id,
      effectLabel(effect.id, context.localize),
      value,
      context.actorLevel,
      resolved => effect.id === "mirrored-shadow-images"
        ? presentationText(
          context.localize,
          resolved === 1 ? "Scaling.OneImage" : "Scaling.MultipleImages",
          resolved === 1 ? "{value} imagem" : "{value} imagens",
          { value: resolved },
        )
        : String(resolved),
    );
  }
  if (value === "tier") {
    return {
      id: effect.id,
      label: effectLabel(effect.id, context.localize),
      current: presentationText(
        context.localize,
        "Scaling.TemporaryHP",
        "{value} PV temporários",
        { value: context.tier },
      ),
      maximum: {
        value: presentationText(
          context.localize,
          "Scaling.MaximumTemporaryHP",
          "5 PV temporários no Tier V",
        ),
      },
    };
  }
  if (typeof value === "number") {
    return {
      id: effect.id,
      label: effectLabel(effect.id, context.localize),
      current: String(value),
    };
  }
  return null;
}

export function buildPippingScalingEntries(
  action: PippingActionDefinition,
  context: PippingPresentationContext,
): PippingScalingSheetEntry[] {
  const entries: PippingScalingSheetEntry[] = [];
  const formula = resolvePippingActionFormula(
    action.formulaId,
    context.actorLevel,
    context.charismaModifier,
    context.tier,
  );
  if (formula) {
    const purpose = action.formula?.purpose;
    entries.push({
      id: "formula",
      label: presentationText(
        context.localize,
        purpose === "healing"
          ? "Scaling.Healing"
          : purpose === "reduction"
            ? "Scaling.Reduction"
            : "Scaling.Damage",
        purpose === "healing" ? "Cura" : purpose === "reduction" ? "Redução" : "Dano",
      ),
      current: formula.current,
      ...(formula.nextIncrease
        ? { next: { level: formula.nextIncrease.level, value: formula.nextIncrease.formula } }
        : {}),
      ...(formula.maximum ? { maximum: { ...formula.maximum, value: formula.maximum.formula } } : {}),
    });
  }

  const rangeScaling = resolvedRangeScaling(action);
  if (rangeScaling) {
    entries.push(formatScalingEntry(
      "range",
      presentationText(context.localize, "Labels.Range", "Alcance"),
      rangeScaling,
      context.actorLevel,
      value => formatFeet(value, context.localize),
    ));
  }
  if (action.area) {
    entries.push(formatScalingEntry(
      "area",
      presentationText(context.localize, "Labels.Area", "Área"),
      action.area.size,
      context.actorLevel,
      value => formatFeet(value, context.localize),
    ));
  }
  for (const effect of action.effects) {
    const entry = effectScalingEntry(action, effect, context);
    if (entry) entries.push(entry);
  }

  if (action.id === "dark-whisper") {
    entries.push(
      {
        id: "base-bonus",
        label: presentationText(context.localize, "Scaling.NormalBonus", "Bônus normal"),
        current: presentationText(context.localize, "Scaling.PlusOneCircumstance", "+1 circunstancial"),
      },
      {
        id: "intensified-bonus",
        label: presentationText(context.localize, "Scaling.IntensifiedBonus", "Bônus intensificado"),
        current: presentationText(context.localize, "Scaling.PlusTwoCircumstance", "+2 circunstancial"),
      },
    );
  }
  if (action.id === "mirrored-shadows") {
    entries.push({
      id: "retaliation",
      label: presentationText(context.localize, "Scaling.Retaliation", "Retaliação"),
      current: `${context.tier}d6`,
      maximum: {
        value: presentationText(context.localize, "Scaling.MaximumRetaliation", "5d6 no Tier V"),
      },
    });
  }
  if (action.damage?.persistent) {
    entries.push({
      id: "persistent-damage",
      label: presentationText(context.localize, "Scaling.PersistentDamage", "Dano persistente"),
      current: presentationText(
        context.localize,
        "Scaling.PersistentDamageValues",
        "Falha {failure}; falha crítica {criticalFailure}",
        {
          failure: action.damage.persistent.failure,
          criticalFailure: action.damage.persistent.criticalFailure,
        },
      ),
    });
  }

  return entries.length > 0
    ? entries
    : [{
      id: "fixed-effect",
      label: presentationText(context.localize, "Labels.Scaling", "Scaling"),
      current: presentationText(context.localize, "Scaling.FixedEffect", "Efeito fixo"),
    }];
}

function outcomeDefinitionText(
  outcome: PippingOutcomeDefinition | undefined,
  localize: PippingLocalizer | undefined,
): string[] {
  if (!outcome) return [];
  const parts: string[] = [];
  if (outcome.movementFeet) {
    parts.push(presentationText(
      localize,
      "Outcomes.ForcedMovement",
      "movimento forçado de {distance} pés",
      { distance: outcome.movementFeet },
    ));
  }
  if (outcome.conditions?.length) {
    parts.push(presentationText(
      localize,
      "Outcomes.AppliesConditions",
      "aplica {conditions}",
      { conditions: outcome.conditions.map(condition => conditionLabel(condition, localize)).join(", ") },
    ));
  }
  if (outcome.commandedActions) {
    parts.push(presentationText(
      localize,
      outcome.commandedActions === 1 ? "Outcomes.CommandsOneAction" : "Outcomes.CommandsMultipleActions",
      outcome.commandedActions === 1
        ? "comanda {count} ação"
        : "comanda {count} ações",
      { count: outcome.commandedActions },
    ));
  }
  if (outcome.duration) {
    parts.push(presentationText(
      localize,
      "Outcomes.Duration",
      "duração: {duration}",
      { duration: durationLabel(outcome.duration, localize) ?? outcome.duration },
    ));
  }
  if (outcome.notes?.length) {
    parts.push(...outcome.notes.map(note =>
      keyedPresentationText(
        localize,
        "OutcomeNotes",
        note,
        OUTCOME_NOTE_LABELS[note] ?? note.replaceAll("-", " "),
      ),
    ));
  }
  return parts;
}

function basicSaveText(
  degree: PippingDegreeOfSuccess,
  localize: PippingLocalizer | undefined,
): string {
  const fallbacks: Record<PippingDegreeOfSuccess, string> = {
    criticalSuccess: "Nenhum dano.",
    success: "Metade do dano.",
    failure: "Dano completo.",
    criticalFailure: "Dano dobrado.",
  };
  return keyedPresentationText(localize, "BasicSave", degree, fallbacks[degree]);
}

function degreeLabel(
  degree: PippingDegreeOfSuccess,
  localize: PippingLocalizer | undefined,
): string {
  const fallbacks: Record<PippingDegreeOfSuccess, string> = {
    criticalSuccess: "Sucesso crítico",
    success: "Sucesso",
    failure: "Falha",
    criticalFailure: "Falha crítica",
  };
  return presentPippingText(
    localize,
    `ETHERNUM.Unique.Pipping.Degrees.${degree}`,
    fallbacks[degree],
  );
}

export function buildPippingOutcomeEntries(
  action: PippingActionDefinition,
  localize?: PippingLocalizer,
): PippingOutcomeSheetEntry[] {
  if (!action.save) return [];
  return DEGREE_ORDER.map(degree => {
    const parts = action.save?.basic && action.damage ? [basicSaveText(degree, localize)] : [];
    parts.push(...outcomeDefinitionText(action.outcomes?.[degree], localize));
    if (action.damage?.persistent && degree === "failure") {
      parts.push(presentationText(
        localize,
        "Outcomes.PersistentDamage",
        "Dano persistente {formula}.",
        { formula: action.damage.persistent.failure },
      ));
    }
    if (action.damage?.persistent && degree === "criticalFailure") {
      parts.push(presentationText(
        localize,
        "Outcomes.PersistentDamage",
        "Dano persistente {formula}.",
        { formula: action.damage.persistent.criticalFailure },
      ));
    }
    return {
      degree,
      label: degreeLabel(degree, localize),
      text: parts.length > 0
        ? parts.join(" ")
        : presentationText(localize, "Outcomes.NoEffect", "Nenhum efeito."),
    };
  });
}

export function buildPippingDurationEntries(
  action: PippingActionDefinition,
  localize?: PippingLocalizer,
): string[] {
  const fallback = actionFallback(action);
  const entries = new Set((fallback.duration ?? []).map((entry, index) =>
    keyedPresentationText(localize, `ActionDurations.${action.id}`, String(index + 1), entry),
  ));
  const areaDuration = durationLabel(action.area?.duration, localize);
  if (areaDuration) {
    entries.add(presentationText(
      localize,
      "DurationEntries.Area",
      "Área: {duration}.",
      { duration: areaDuration },
    ));
  }
  for (const effect of action.effects) {
    const duration = durationLabel(effect.duration, localize);
    if (duration) {
      entries.add(presentationText(
        localize,
        "DurationEntries.Effect",
        "{effect}: {duration}.",
        { effect: effectLabel(effect.id, localize), duration },
      ));
    }
    if (effect.consumesOn) {
      const consumption = keyedPresentationText(
        localize,
        "Consumption",
        effect.consumesOn,
        CONSUMPTION_LABELS[effect.consumesOn] ?? effect.consumesOn.replaceAll("-", " "),
      );
      entries.add(presentationText(
        localize,
        "DurationEntries.ConsumedOn",
        "Consumido no {trigger}.",
        { trigger: consumption },
      ));
    }
  }
  return entries.size > 0
    ? [...entries]
    : [presentationText(
      localize,
      "DurationEntries.Default",
      "Instantâneo, salvo indicação específica do efeito.",
    )];
}

export function buildPippingRequirementEntries(
  action: PippingActionDefinition,
  localize?: PippingLocalizer,
): string[] {
  if (action.requirements.length === 0) {
    return [presentationText(localize, "Requirements.None", "Nenhum requisito adicional.")];
  }
  return action.requirements.map(requirement => {
    const label = keyedPresentationText(
      localize,
      "Requirements.Items",
      requirement.id,
      REQUIREMENT_LABELS[requirement.id] ?? requirement.id.replaceAll("-", " "),
    );
    if (requirement.confirmation === "gm") {
      return presentationText(
        localize,
        "Requirements.WithGMConfirmation",
        "{requirement} Confirmação do mestre.",
        { requirement: label },
      );
    }
    if (requirement.confirmation === "player") {
      return presentationText(
        localize,
        "Requirements.WithPlayerConfirmation",
        "{requirement} Confirmação do jogador.",
        { requirement: label },
      );
    }
    return label;
  });
}

function targetAutomation(
  action: PippingActionDefinition,
  localize: PippingLocalizer | undefined,
): PippingAutomationSheetEntry {
  const selfOnly = action.targets?.type === "self" && !action.area;
  return selfOnly
    ? {
      component: presentationText(localize, "Automation.Components.TargetSelection", "Seleção de alvo"),
      mode: "automatic",
      note: presentationText(localize, "Automation.Notes.SelfTarget", "O alvo é o próprio Pipping."),
    }
    : {
      component: action.area
        ? presentationText(localize, "Automation.Components.AreaAndTargetSelection", "Seleção da área e dos alvos")
        : presentationText(localize, "Automation.Components.TargetSelection", "Seleção de alvo"),
      mode: "assisted",
      note: action.area
        ? presentationText(
          localize,
          "Automation.Notes.ConfirmAreaGeometry",
          "A posição ou geometria precisa ser confirmada no canvas.",
        )
        : presentationText(
          localize,
          "Automation.Notes.ConfirmValidTargets",
          "O jogador confirma os alvos válidos.",
        ),
    };
}

export function buildPippingAutomationEntries(
  action: PippingActionDefinition,
  localize?: PippingLocalizer,
): PippingAutomationSheetEntry[] {
  if (action.id === "dark-whisper") {
    return [
      {
        component: presentationText(localize, "Automation.Components.TargetSelection", "Seleção do alvo"),
        mode: "assisted",
        note: presentationText(localize, "Automation.Notes.ChooseValidAlly", "O jogador escolhe um aliado válido."),
      },
      {
        component: presentationText(
          localize,
          "Automation.Components.NormalOrIntensifiedChoice",
          "Escolha normal ou intensificada",
        ),
        mode: "automatic",
        note: presentationText(localize, "Automation.Notes.ResolvedByDialog", "Resolvida por diálogo."),
      },
      {
        component: presentationText(localize, "Automation.Components.EffectApplication", "Aplicação do efeito"),
        mode: "automatic",
      },
      {
        component: presentationText(localize, "Automation.Components.FirstCheckConsumption", "Consumo no primeiro teste"),
        mode: "automatic",
      },
      {
        component: presentationText(localize, "Automation.Components.Expiration", "Expiração"),
        mode: "automatic",
      },
    ];
  }

  const entries: PippingAutomationSheetEntry[] = [targetAutomation(action, localize)];
  if (action.save) {
    entries.push({
      component: presentationText(localize, "Automation.Components.SaveRoll", "Rolagem de salvamento"),
      mode: "automatic",
      note: presentationText(
        localize,
        "Automation.Notes.SaveAPI",
        "Usa a API PF2e; fallback simplificado é identificado quando necessário.",
      ),
    });
  }
  if (action.damage) {
    entries.push({
      component: presentationText(localize, "Automation.Components.Damage", "Dano"),
      mode: "automatic",
      note: presentationText(
        localize,
        "Automation.Notes.DamageAPI",
        "Automático quando a API PF2e de dano estiver disponível.",
      ),
    });
  }
  if (action.healing) {
    entries.push({
      component: presentationText(localize, "Automation.Components.Healing", "Cura"),
      mode: "automatic",
    });
  }
  for (const effect of action.effects) {
    entries.push({
      component: effectLabel(effect.id, localize),
      mode: effect.automation,
      ...(effect.automation === "assisted"
        ? {
          note: presentationText(
            localize,
            "Automation.Notes.AssistedEffect",
            "Requer seleção, decisão ou confirmação durante a resolução.",
          ),
        }
        : {}),
    });
  }
  if (entries.length === 1) {
    entries.push({
      component: presentationText(localize, "Automation.Components.EffectResolution", "Resolução do efeito"),
      mode: action.automationMode,
      ...(action.automationMode === "assisted"
        ? {
          note: presentationText(
            localize,
            "Automation.Notes.ResolutionConfirmation",
            "A resolução solicita confirmação.",
          ),
        }
        : {}),
    });
  }
  return entries;
}

function buildActivation(
  action: PippingActionDefinition,
  localize: PippingLocalizer | undefined,
): PippingActivationPresentation {
  const optionalCosts = action.optionalPulseCosts.map(optional => {
    const fallbackLabel = presentationText(localize, "Labels.Intensified", "Intensificado");
    const label = presentPippingText(localize, optional.labelKey, fallbackLabel);
    return presentationText(
      localize,
      "Activation.OptionalTotalCost",
      "{label}: {cost} no total",
      {
        label,
        cost: pulseCostLabel(action.pulseCost + optional.pulseCost, localize),
      },
    );
  });
  const frequency = frequencyLabel(action, localize);
  return {
    label: actionTypeLabel(action, localize),
    actionType: actionTypeName(action),
    pulseCost: pulseCostLabel(action.pulseCost, localize),
    optionalCosts,
    ...(frequency ? { frequency } : {}),
  };
}

function buildTargeting(
  action: PippingActionDefinition,
  context: PippingPresentationContext,
): PippingTargetingPresentation {
  const resolved = resolvePippingTargetSpec(action, context.actorLevel, context.tier);
  const area = resolvedAreaLabel(resolved.area, context.localize);
  const origin = originLabel(resolved.area?.origin, context.localize);
  return {
    target: targetMaximumLabel(action, context.localize, resolved.maximum),
    ...(resolved.range === 0 ? {} : { range: formatFeet(resolved.range, context.localize) }),
    ...(area ? { area } : {}),
    ...(origin ? { origin } : {}),
  };
}

function buildResolution(
  action: PippingActionDefinition,
  context: PippingPresentationContext,
): PippingResolutionPresentation | undefined {
  if (!action.save) return undefined;
  return {
    defense: defenseLabel(action.save.type, context.localize),
    dc: context.dc,
    basic: action.save.basic,
    incapacitation: Boolean(action.save.incapacitation),
  };
}

function primaryDuration(
  durationEntries: string[],
  localize: PippingLocalizer | undefined,
): string {
  return durationEntries[0] ?? presentationText(localize, "Durations.Instant", "Instantâneo.");
}

function automationModeLabel(
  mode: PippingAutomationMode,
  localize: PippingLocalizer | undefined,
): string {
  const fallbacks: Record<PippingAutomationMode, string> = {
    automatic: "Automática",
    assisted: "Assistida",
    manual: "Manual",
  };
  return presentPippingText(
    localize,
    `ETHERNUM.Unique.Pipping.Automation.${mode}`,
    fallbacks[mode],
  );
}

function buildSummaryEntries(
  action: PippingActionDefinition,
  context: PippingPresentationContext,
  targeting: PippingTargetingPresentation,
  resolution: PippingResolutionPresentation | undefined,
  scalingEntries: PippingScalingSheetEntry[],
  durationEntries: string[],
): PippingActionSummaryEntry[] {
  if (action.id === "dark-whisper") {
    return [
      {
        id: "effect",
        label: presentationText(context.localize, "Labels.Effect", "Efeito"),
        value: presentationText(context.localize, "Scaling.PlusOneCircumstance", "+1 circunstancial"),
        tone: "positive",
      },
      {
        id: "intensified",
        label: presentationText(context.localize, "Labels.Intensified", "Intensificado"),
        value: presentationText(context.localize, "Scaling.PlusTwoCircumstance", "+2 circunstancial"),
        tone: "positive",
        tooltip: presentationText(
          context.localize,
          "Tooltips.DarkWhisperIntensified",
          "Gasta 1 PS adicional em luz fraca ou escuridão.",
        ),
      },
      {
        id: "target",
        label: presentationText(context.localize, "Labels.Target", "Alvo"),
        value: presentationText(
          context.localize,
          "Summary.TargetAtRange",
          "{target} a {range}",
          { target: targeting.target, range: targeting.range ?? "" },
        ),
        tone: "neutral",
      },
      {
        id: "duration",
        label: presentationText(context.localize, "Labels.Duration", "Duração"),
        value: durationLabel("start-of-pipping-next-turn", context.localize)
          ?? "até o início do próximo turno de Pipping",
        tone: "neutral",
        tooltip: presentationText(
          context.localize,
          "Tooltips.DarkWhisperDuration",
          "O efeito termina antes se for consumido pelo primeiro ataque ou salvamento.",
        ),
      },
    ];
  }

  const fallback = actionFallback(action);
  const localizedEffect = presentPippingText(context.localize, action.flavorKey, fallback.effect);
  const entries: PippingActionSummaryEntry[] = [
    {
      id: "effect",
      label: presentationText(context.localize, "Labels.Effect", "Efeito"),
      value: localizedEffect,
      tone: "neutral",
    },
  ];
  const formula = scalingEntries.find(entry => entry.id === "formula");
  if (formula) {
    entries.push({
      id: "formula",
      label: formula.label,
      value: formula.current,
      tone: action.damage ? "danger" : "positive",
    });
  }
  if (targeting.area) {
    entries.push({
      id: "area",
      label: presentationText(context.localize, "Labels.Area", "Área"),
      value: targeting.area,
      tone: "neutral",
    });
  } else {
    const atRange = targeting.range
      ? presentationText(
        context.localize,
        "Summary.TargetAtRange",
        "{target} a {range}",
        { target: targeting.target, range: targeting.range },
      )
      : targeting.target;
    entries.push({
      id: "target",
      label: presentationText(context.localize, "Labels.Target", "Alvo"),
      value: atRange,
      tone: "neutral",
    });
  }
  if (resolution?.defense) {
    entries.push({
      id: "save",
      label: presentationText(context.localize, "Labels.Save", "Salvamento"),
      value: presentationText(
        context.localize,
        resolution.basic ? "Summary.BasicSave" : "Summary.Save",
        resolution.basic ? "{defense} CD {dc} básico" : "{defense} CD {dc}",
        { defense: resolution.defense, dc: context.dc },
      ),
      tone: "danger",
      ...(resolution.basic
        ? {
          tooltip: presentationText(
            context.localize,
            "Tooltips.BasicSave",
            "Salvamento básico: sucesso crítico sem dano, sucesso metade, falha dano completo e falha crítica dano dobrado.",
          ),
        }
        : {}),
    });
  }
  if (action.frequencyDefinition) {
    entries.push({
      id: "frequency",
      label: presentationText(context.localize, "Labels.Frequency", "Frequência"),
      value: frequencyLabel(action, context.localize) ?? "",
      tone: "neutral",
    });
  } else {
    entries.push({
      id: "duration",
      label: presentationText(context.localize, "Labels.Duration", "Duração"),
      value: primaryDuration(durationEntries, context.localize),
      tone: "neutral",
    });
  }
  entries.push({
    id: "automation",
    label: presentPippingText(
      context.localize,
      "ETHERNUM.Unique.Pipping.Automation.Label",
      "Automação",
    ),
    value: automationModeLabel(action.automationMode, context.localize),
    tone: "automation",
    tooltip: action.automationMode === "automatic"
      ? presentationText(
        context.localize,
        "Tooltips.AutomationAutomatic",
        "O módulo resolve este componente automaticamente.",
      )
      : action.automationMode === "assisted"
        ? presentationText(
          context.localize,
          "Tooltips.AutomationAssisted",
          "O módulo solicita uma escolha ou confirmação durante a resolução.",
        )
        : presentationText(
          context.localize,
          "Tooltips.AutomationManual",
          "O jogador ou mestre resolve este componente manualmente.",
        ),
  });
  return entries.slice(0, 6);
}

function detailSection(
  id: string,
  label: string,
  values: string[],
  tone?: PippingSummaryTone,
): PippingDetailSection | null {
  const filtered = values.filter(value => value.trim().length > 0);
  return filtered.length === 0
    ? null
    : {
      id,
      label,
      entries: filtered.map((value, index) => ({ id: `${id}-${index + 1}`, value, ...(tone ? { tone } : {}) })),
    };
}

function formatScalingDetail(
  entry: PippingScalingSheetEntry,
  localize: PippingLocalizer | undefined,
): string {
  const replacements = {
    label: entry.label,
    current: entry.current,
    nextLevel: entry.next?.level ?? "",
    nextValue: entry.next?.value ?? "",
    maximumLevel: entry.maximum?.level ?? "",
    maximumValue: entry.maximum?.value ?? "",
  };
  if (entry.next && entry.maximum?.level !== undefined) {
    return presentationText(
      localize,
      "ScalingDetail.CurrentNextMaximumAtLevel",
      "{label}: atual {current}; próximo aumento no nível {nextLevel}: {nextValue}; máximo no nível {maximumLevel}: {maximumValue}.",
      replacements,
    );
  }
  if (entry.next && entry.maximum) {
    return presentationText(
      localize,
      "ScalingDetail.CurrentNextMaximum",
      "{label}: atual {current}; próximo aumento no nível {nextLevel}: {nextValue}; máximo: {maximumValue}.",
      replacements,
    );
  }
  if (entry.next) {
    return presentationText(
      localize,
      "ScalingDetail.CurrentNext",
      "{label}: atual {current}; próximo aumento no nível {nextLevel}: {nextValue}.",
      replacements,
    );
  }
  if (entry.maximum?.level !== undefined) {
    return presentationText(
      localize,
      "ScalingDetail.CurrentMaximumAtLevel",
      "{label}: atual {current}; máximo no nível {maximumLevel}: {maximumValue}.",
      replacements,
    );
  }
  if (entry.maximum) {
    return presentationText(
      localize,
      "ScalingDetail.CurrentMaximum",
      "{label}: atual {current}; máximo: {maximumValue}.",
      replacements,
    );
  }
  return presentationText(
    localize,
    "ScalingDetail.Current",
    "{label}: atual {current}.",
    replacements,
  );
}

function automationDetail(
  entry: PippingAutomationSheetEntry,
  localize: PippingLocalizer | undefined,
): string {
  const replacements = {
    component: entry.component,
    mode: automationModeLabel(entry.mode, localize),
    note: entry.note ?? "",
  };
  return entry.note
    ? presentationText(
      localize,
      "Automation.DetailWithNote",
      "{component}: {mode}. {note}",
      replacements,
    )
    : presentationText(
      localize,
      "Automation.Detail",
      "{component}: {mode}",
      replacements,
    );
}

function buildDetails(
  action: PippingActionDefinition,
  context: PippingPresentationContext,
  activation: PippingActivationPresentation,
  targeting: PippingTargetingPresentation,
  resolution: PippingResolutionPresentation | undefined,
  outcomes: PippingOutcomeSheetEntry[],
  scalingEntries: PippingScalingSheetEntry[],
  durationEntries: string[],
  requirementEntries: string[],
  automationEntries: PippingAutomationSheetEntry[],
): PippingDetailSection[] {
  const fallback = actionFallback(action);
  const localizedEffect = presentPippingText(context.localize, action.flavorKey, fallback.effect);
  const activationValues = [
    activation.label,
    presentationText(
      context.localize,
      "Details.NormalCost",
      "Custo normal: {cost}",
      { cost: activation.pulseCost },
    ),
    ...activation.optionalCosts.map(cost => presentationText(
      context.localize,
      "Details.OptionalCost",
      "Custo opcional: {cost}",
      { cost },
    )),
    ...(activation.frequency
      ? [presentationText(
        context.localize,
        "Details.Frequency",
        "Frequência: {frequency}",
        { frequency: activation.frequency },
      )]
      : []),
  ];
  const targetingValues = [
    presentationText(
      context.localize,
      "Details.Target",
      "Alvo: {target}",
      { target: targeting.target },
    ),
    ...(targeting.range
      ? [presentationText(
        context.localize,
        "Details.Range",
        "Alcance: {range}",
        { range: targeting.range },
      )]
      : []),
    ...(action.id === "dark-whisper"
      ? [presentationText(
        context.localize,
        "Details.DarkWhisperSelfTarget",
        "Pode selecionar o próprio Pipping quando permitido pela regra.",
      )]
      : []),
  ];
  const areaValues = [
    ...(targeting.area
      ? [presentationText(
        context.localize,
        "Details.Area",
        "Área: {area}",
        { area: targeting.area },
      )]
      : []),
    ...(targeting.origin
      ? [presentationText(
        context.localize,
        "Details.Origin",
        "Origem: {origin}",
        { origin: targeting.origin },
      )]
      : []),
  ];
  const resolutionValues = resolution
    ? [
      presentationText(
        context.localize,
        "Details.DefenseAgainstDC",
        "Defesa: {defense} contra CD {dc}.",
        {
          defense: resolution.defense
            ?? presentationText(context.localize, "Details.UndefinedDefense", "não definida"),
          dc: resolution.dc ?? context.dc,
        },
      ),
      ...(resolution.basic
        ? [presentationText(context.localize, "Details.BasicSave", "Salvamento básico.")]
        : []),
      ...(resolution.incapacitation
        ? [presentationText(
          context.localize,
          "Details.IncapacitationTrait",
          "Possui o trait Incapacitação.",
        )]
        : []),
    ]
    : [];
  const localizedNotes = action.detailKeys.map(key =>
    presentPippingText(context.localize, key, fallback.note),
  );
  const sections = [
    detailSection(
      "activation",
      presentationText(context.localize, "Sections.Activation", "Ativação"),
      activationValues,
    ),
    detailSection(
      "targeting",
      presentationText(context.localize, "Sections.Targeting", "Alvo e alcance"),
      targetingValues,
    ),
    detailSection(
      "area",
      presentationText(context.localize, "Sections.Area", "Área"),
      areaValues,
    ),
    detailSection(
      "resolution",
      presentationText(context.localize, "Sections.Resolution", "Salvamento ou teste"),
      resolutionValues,
    ),
    detailSection(
      "effect",
      presentationText(context.localize, "Sections.MainEffect", "Efeito principal"),
      [localizedEffect],
      action.damage ? "danger" : "neutral",
    ),
    detailSection(
      "outcomes",
      presentationText(context.localize, "Sections.Outcomes", "Graus de sucesso"),
      outcomes.map(outcome => presentationText(
        context.localize,
        "Details.Outcome",
        "{degree}: {result}",
        { degree: outcome.label, result: outcome.text },
      )),
    ),
    detailSection(
      "scaling",
      presentationText(context.localize, "Sections.Scaling", "Scaling"),
      scalingEntries.map(entry => formatScalingDetail(entry, context.localize)),
    ),
    detailSection(
      "duration",
      presentationText(context.localize, "Sections.Duration", "Duração e expiração"),
      durationEntries,
    ),
    detailSection(
      "requirements",
      presentationText(context.localize, "Sections.Requirements", "Requisitos e gatilhos"),
      requirementEntries,
    ),
    detailSection(
      "automation",
      presentationText(context.localize, "Sections.Automation", "Automação"),
      automationEntries.map(entry => automationDetail(entry, context.localize)),
      "automation",
    ),
    detailSection(
      "notes",
      presentationText(context.localize, "Sections.Notes", "Observações especiais"),
      localizedNotes,
    ),
    context.isGM
      ? detailSection(
        "gm",
        presentationText(context.localize, "Sections.GMDiagnostics", "Diagnóstico do mestre"),
        [
          presentationText(
            context.localize,
            "Diagnostics.Action",
            "Ação: {action}",
            { action: action.id },
          ),
          presentationText(
            context.localize,
            "Diagnostics.Effects",
            "Efeitos: {effects}",
            {
              effects: action.effects.map(effect => effect.id).join(", ")
                || presentationText(
                  context.localize,
                  "Diagnostics.NoDeclarativeEffects",
                  "nenhum efeito declarativo",
                ),
            },
          ),
          presentationText(
            context.localize,
            "Diagnostics.GeometricOrigin",
            "Origem geométrica: {origin}",
            {
              origin: targeting.origin
                ?? presentationText(context.localize, "Diagnostics.NotApplicable", "não aplicável"),
            },
          ),
          presentationText(
            context.localize,
            "Diagnostics.AutomationFallback",
            "Fallback de automação: {mode}",
            { mode: automationModeLabel(action.automationMode, context.localize) },
          ),
        ],
      )
      : null,
  ];
  return sections.filter((section): section is PippingDetailSection => section !== null);
}

export function buildPippingActionPresentation(
  action: PippingActionDefinition,
  context: PippingPresentationContext,
): PippingResolvedActionPresentation {
  const fallback = actionFallback(action);
  const name = presentPippingText(context.localize, action.nameKey, fallback.name);
  const flavor = presentPippingText(context.localize, action.flavorKey, fallback.effect);
  const activation = buildActivation(action, context.localize);
  const targeting = buildTargeting(action, context);
  const resolution = buildResolution(action, context);
  const outcomes = buildPippingOutcomeEntries(action, context.localize);
  const scalingEntries = buildPippingScalingEntries(action, context);
  const durationEntries = buildPippingDurationEntries(action, context.localize);
  const requirementEntries = buildPippingRequirementEntries(action, context.localize);
  const automationEntries = buildPippingAutomationEntries(action, context.localize);
  const summaryEntries = buildSummaryEntries(
    action,
    context,
    targeting,
    resolution,
    scalingEntries,
    durationEntries,
  );
  const frequency = frequencyLabel(action, context.localize);
  const expression = expressionLabel(action.expression, context.localize);
  const header: PippingActionHeader = {
    symbol: actionSymbol(action),
    actionLabel: activation.label,
    actionType: activation.actionType,
    name,
    pulseCost: activation.pulseCost,
    ...(expression ? { expression } : {}),
    traits: action.traits.map(trait =>
      presentPippingText(
        context.localize,
        `ETHERNUM.Unique.Pipping.Traits.${trait}`,
        trait,
      ),
    ),
    tier: presentationText(
      context.localize,
      "Header.Tier",
      "Tier {tier}",
      { tier: ROMAN_TIERS[action.requiredTier] },
    ),
    minimumLevel: presentationText(
      context.localize,
      "Header.MinimumLevel",
      "Nível {level}",
      { level: action.requiredLevel },
    ),
    ...(frequency ? { frequency } : {}),
  };
  return {
    name,
    flavor,
    header,
    activation,
    targeting,
    ...(resolution ? { resolution } : {}),
    summaryEntries,
    outcomes,
    scalingEntries,
    durationEntries,
    requirementEntries,
    automationEntries,
    details: buildDetails(
      action,
      context,
      activation,
      targeting,
      resolution,
      outcomes,
      scalingEntries,
      durationEntries,
      requirementEntries,
      automationEntries,
    ),
  };
}

export function describePippingAreaAtRequiredLevel(
  action: PippingActionDefinition,
  localize?: PippingLocalizer,
): string | undefined {
  return areaTypeLabel(action, localize);
}
