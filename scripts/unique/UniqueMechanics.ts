import { ETHERNUM } from '../config.js';

export type UniqueMechanicProfileId = "" | "gyro-spin" | "bayle-dragon" | "pipping-night" | "kaitake" | "cinerio" | "ailan";
export type GyroMainAttribute = "dex" | "wis";
export type GyroProficiencyRank = "trained" | "expert" | "master" | "legendary";
export type GyroExecutionMode = "stable" | "forced" | "corpse" | "perfect";

export const GYRO_PROFILE_ID: UniqueMechanicProfileId = "gyro-spin";
export const BAYLE_PROFILE_ID: UniqueMechanicProfileId = "bayle-dragon";
export const PIPPING_PROFILE_ID: UniqueMechanicProfileId = "pipping-night";
export const PLACEHOLDER_PROFILE_IDS = ["kaitake", "cinerio", "ailan"] as const;
export const GYRO_SPINBALL_ASSET = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/spinball.png`;
export const ETHERNUM_COMPANY_LOGO_ASSET = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/company-logo.png`;

export interface UniqueMechanicsState {
  activeProfile: UniqueMechanicProfileId;
  profiles: Record<string, unknown>;
}

export interface GyroSpinState {
  currentSP: number;
  maxSPOverride?: number;
  mainAttribute: GyroMainAttribute;
  proficiencyRank: GyroProficiencyRank;
  sacredScars: number;
  corpsePartNumber: number;
  torsoBonus: boolean;
  heartRegen: boolean;
  absoluteReady: boolean;
  unlockedIkons: string[];
  activeDeviation?: string;
  activeDeviationCombatId?: string;
  proportionMarkTargetId?: string;
  spGainedThisRound?: number;
  lastSPRoundKey?: string;
  lastBallBreakerTurnKey?: string;
}

type GyroTechniqueCategory = "technique" | "ikon" | "ball-breaker" | "final";

interface GyroTechnique {
  id: string;
  name: string;
  cost: number;
  source: string;
  category?: GyroTechniqueCategory;
  actions: string;
  description: string;
  technical?: string[];
  options: string[];
  details?: string[];
  defaultMode: GyroExecutionMode;
  requiredLevel?: number;
  requiredIkon?: string;
  requiredCorpseParts?: number;
  requiresAllCorpseParts?: boolean;
  requiresSacredScars?: number;
  requiresAbsolute?: boolean;
  gmOnly?: boolean;
  narrativeOnly?: boolean;
  frequency?: string;
  attachedToStrike?: boolean;
  roll?: {
    label: string;
    kind: "healing" | "damage";
    damageType?: string;
    formula: (actor: Actor, state: GyroSpinState) => string;
    note?: string;
  };
}

interface GyroIkon {
  id: string;
  num: string;
  piece: string;
  title: string;
  tier: "normal" | "legendary" | "transcendental";
  unlock: string;
  passives: string[];
  actives: Array<{ name: string; cost: number; text: string }>;
  transcendence: { name: string; cost: number; text: string };
}

interface GyroRank {
  id: string;
  num: string;
  name: string;
  range: string;
  minSP: number;
  maxSP: number | null;
  control: string;
  text: string;
}

interface GyroDeviation {
  roll: number;
  name: string;
  text: string;
  combatEffect: string;
}

interface GyroTechniqueSheetData extends GyroTechnique {
  canAfford: boolean;
  unlocked: boolean;
  usable: boolean;
  lockReason: string;
  systemNotes: string[];
  executionModes: Array<{
    id: GyroExecutionMode;
    label: string;
    dcLabel: string;
    available: boolean;
    reason: string;
    selected: boolean;
  }>;
  rollLabel?: string;
  rollFormula?: string;
  rollNote?: string;
}

interface GyroTechniqueGroup {
  id: string;
  label: string;
  icon: string;
  hint: string;
  techniques: GyroTechniqueSheetData[];
}

interface BayleStage {
  stage: number;
  roman: string;
  name: string;
  minLevel: number;
  title: string;
  subtitle: string;
  rageBonus: number;
  lightningDC: number;
  lightningCharges: number;
  breath?: { formula: string; dc: number };
  passives: string[];
  awakening: string[];
  collapse: string[];
  actions: Array<{
    id: string;
    name: string;
    tag: string;
    requirement: string;
    text: string;
    formula?: string;
  }>;
}

export interface BayleDragonState {
  stage: number;
  ardor: number;
  rageActive: boolean;
  awakeningActive: boolean;
  lightningChargesUsed: number;
  breathUsed: boolean;
  roarUsed: boolean;
  lancesUsed: boolean;
  closureUsed: boolean;
}

interface PippingAbility {
  id: string;
  name: string;
  tag: string;
  cost: string;
  aspect: string;
  text: string;
  details: string[];
}

export interface PippingNightState {
  pulse: number;
  tier: number;
  livingNightActive: boolean;
  mirroredShadows: number;
}

const PROFICIENCY_RANK_BONUS: Record<GyroProficiencyRank, number> = {
  trained: 2,
  expert: 4,
  master: 6,
  legendary: 8,
};

const LEVEL_BASED_DCS: Record<number, number> = {
  0: 14,
  1: 15,
  2: 16,
  3: 18,
  4: 19,
  5: 20,
  6: 22,
  7: 23,
  8: 24,
  9: 26,
  10: 27,
  11: 28,
  12: 30,
  13: 31,
  14: 32,
  15: 34,
  16: 35,
  17: 36,
  18: 38,
  19: 39,
  20: 40,
};

const DEFAULT_UNIQUE_STATE: UniqueMechanicsState = {
  activeProfile: "",
  profiles: {},
};

const DEFAULT_GYRO_STATE: GyroSpinState = {
  currentSP: 0,
  mainAttribute: "dex",
  proficiencyRank: "trained",
  sacredScars: 0,
  corpsePartNumber: 1,
  torsoBonus: false,
  heartRegen: false,
  absoluteReady: false,
  unlockedIkons: [],
};

const DEFAULT_BAYLE_STATE: BayleDragonState = {
  stage: 1,
  ardor: 0,
  rageActive: false,
  awakeningActive: false,
  lightningChargesUsed: 0,
  breathUsed: false,
  roarUsed: false,
  lancesUsed: false,
  closureUsed: false,
};

const DEFAULT_PIPPING_STATE: PippingNightState = {
  pulse: 2,
  tier: 1,
  livingNightActive: false,
  mirroredShadows: 0,
};

export const PIPPING_ABILITIES: PippingAbility[] = [
  {
    id: "animated-shadow",
    name: "Sombra Animada",
    tag: "Passivo Permanente",
    cost: "Sem custo",
    aspect: "Véu",
    text: "A sombra de Pipping se move independente e funciona como extensão silenciosa da vontade dele, criando pressão tática mesmo quando ele não ocupa o espaço.",
    details: [
      "A sombra deve ser representada por marcador, template ou token auxiliar a critério do mestre.",
      "Flanqueio Sombrio: 1 vez por rodada, se aliado e sombra estão adjacentes ao mesmo inimigo, o próximo ataque desse aliado deixa o alvo off-guard contra ele.",
      "A sombra se estende até 10 pés em qualquer direção e não ocupa espaço físico real.",
      "Luz intensa suprime a sombra por 1 rodada, mas não a destrói.",
    ],
  },
  {
    id: "mirrored-shadows",
    name: "Sombras Espelhadas",
    tag: "2 ações",
    cost: "1 PS",
    aspect: "Véu / Vazio",
    text: "Convoca silhuetas negras adjacentes que confundem mira, puxam agressão e punem ataques mal direcionados.",
    details: [
      "Número de sombras: 2 + 1 por Tier desbloqueado.",
      "Cada sombra tem CA 10 + nível de Pipping e 1 HP.",
      "Quando uma sombra é destruída por ataque não área/splash, o atacante sofre 1d6 de energia negativa; se for imune, converta para frio.",
      "Enquanto houver sombra em campo, Pipping recebe +1 circunstância na CA contra ataques à distância.",
      "O dano de sombra aumenta para 2d6 no Tier 3 e 3d6 no Tier 4.",
    ],
  },
  {
    id: "dark-whisper",
    name: "Sussurro das Trevas",
    tag: "1 ação",
    cost: "1 PS",
    aspect: "Véu / Voz",
    text: "Um aliado a 30 pés que possa ouvi-lo recebe bônus pela linguagem da noite.",
    details: [
      "Até o início do próximo turno de Pipping, o aliado recebe +1 circunstância no próximo ataque ou saving throw.",
      "Se o aliado estiver em escuridão completa, o bônus sobe para +2.",
      "Se o bônus transformar falha em sucesso, Pipping recupera 1 PS, no máximo 1 vez por rodada.",
    ],
  },
  {
    id: "void-echoes",
    name: "Ecos do Vazio",
    tag: "Reação",
    cost: "Sem custo",
    aspect: "Vazio",
    text: "Quando uma criatura falha num save contra habilidade ou magia de Pipping, a noite devolve Pulso.",
    details: [
      "Gatilho: criatura a 30 pés falha ou falha criticamente num save contra habilidade ou magia de Pipping.",
      "Pipping recupera 1 PS.",
      "Frequência: 1 vez por rodada.",
      "O tracker automático cobre acertos de ataque; falhas em saves ainda dependem de macro/manual por enquanto.",
    ],
  },
  {
    id: "living-night-song",
    name: "Canção da Noite Viva",
    tag: "2 ações",
    cost: "1 PS inicial",
    aspect: "Composição / Véu / Vazio / Voz",
    text: "Pipping performa a noite: a escuridão se adensa e protege quem conhece seu ritmo.",
    details: [
      "Área: 30 pés de presença, com 10 pés de escuridão mágica para inimigos.",
      "Duração: sustentada com ação livre, máximo 1 minuto.",
      "A área é difícil para inimigos que dependem de visão comum, conforme decisão do mestre.",
      "Aliados na área recebem +1 circunstância contra medo e efeitos de visão.",
      "Quando Pipping acerta um ataque enquanto a Canção está ativa, o tracker pode recuperar 1 PS até o máximo.",
    ],
  },
];

function gyroMedicinalHealingFormula(actor: Actor, state: GyroSpinState): string {
  const dice = Math.max(1, Math.ceil(getActorLevel(actor) / 2));
  const mod = getPF2EAbilityMod(actor, state.mainAttribute);
  return `${dice}d6${mod >= 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`}`;
}

function gyroRicochetImpactFormula(actor: Actor): string {
  const dice = Math.max(1, Math.min(5, Math.floor((getActorLevel(actor) - 1) / 4) + 1));
  return `${dice}d6`;
}

export const GYRO_RANKS: GyroRank[] = [
  {
    id: "stable",
    num: "I",
    name: "Rotação Estável",
    range: "0-3 SP",
    minSP: 0,
    maxSP: 3,
    control: "Sem teste",
    text: "Técnicas básicas e IKONs de 1-2 SP. Sem risco de Desvio.",
  },
  {
    id: "elevated",
    num: "II",
    name: "Rotação Elevada",
    range: "4-6 SP",
    minSP: 4,
    maxSP: 6,
    control: "Forçada: CD por nível -2",
    text: "Rotação Forçada disponível a partir do nível 3. Técnicas agressivas começam a cobrar risco.",
  },
  {
    id: "sacred",
    num: "III",
    name: "Rotação Sagrada",
    range: "7-10 SP",
    minSP: 7,
    maxSP: 10,
    control: "Cadáver: CD por nível + Parte/3",
    text: "A rotação alcança frequência compatível com o Cadáver Santo. Se Gyro não possuir uma Parte/IKON sincronizada, esta frequência permanece instável e não libera o modo Cadáver.",
  },
  {
    id: "perfect",
    num: "IV",
    name: "Rotação Perfeita",
    range: "11+ SP",
    minSP: 11,
    maxSP: null,
    control: "Perfeita: CD por nível +2",
    text: "O eixo se alinha com o universo. Disponível no nível 9+ ou por liberação narrativa.",
  },
  {
    id: "absolute",
    num: "V",
    name: "Rotação Absoluta",
    range: "Condição extrema",
    minSP: 0,
    maxSP: null,
    control: "9 SP + Cicatriz",
    text: "A espiral que alcança Deus. Ativável apenas por condição narrativa.",
  },
];

export const GYRO_TECHNIQUES: GyroTechnique[] = [
  {
    id: "steel-ball",
    name: "Esfera de Aço",
    cost: 0,
    source: "Técnica",
    category: "technique",
    actions: "1 ação",
    description: "Gyro lança uma esfera de aço em rotação limpa, usando a técnica base que alimenta toda a Via da Rotação Sagrada.",
    technical: [
      "Resolva como Strike à distância com a Steel Ball equipada ou com o item que representa a esfera.",
      "Ao acertar um Strike com esta técnica, Gyro ganha +1 SP pelo tracker automático.",
      "Se a mesa resolver ricochete simples sem usar Ricochete Espiral, o mestre pode exigir linha plausível de quique e aplicar cobertura normalmente.",
    ],
    options: [
      "Causa dano normal ao acertar",
      "Gera +1 SP ao acertar",
      "Pode ricochetear gastando 1 SP adicional",
    ],
    defaultMode: "stable",
  },
  {
    id: "spiral-ricochet",
    name: "Ricochete Espiral",
    cost: 1,
    source: "Técnica",
    category: "technique",
    actions: "1 ação",
    description: "A esfera conversa com o cenário antes de atingir o alvo, mudando o ângulo de entrada como se o campo inteiro fosse parte da mão de Gyro.",
    technical: [
      "Use quando houver parede, chão, arma, escudo, criatura ou obstáculo que justifique uma linha de ricochete.",
      "Pode atacar um alvo com cobertura parcial/maior; cobertura total exige caminho plausível aprovado pelo mestre.",
      "Se houver alvo secundário, faça um segundo Strike com -2 ou use a rolagem opcional de dano reduzido do módulo.",
      "O dano secundário padrão é metade do dano do Strike principal, arredondado para baixo.",
    ],
    options: [
      "Acertar alvo com cobertura total ou parcial",
      "Mudar o ângulo do ataque",
      "Atacar segundo alvo com dano reduzido: aplique -2 no ataque do ricochete e metade do dano do Strike principal, arredondando para baixo.",
      "Forçar inimigo a mudar posição",
    ],
    defaultMode: "forced",
    requiredLevel: 3,
    roll: {
      label: "Impacto secundário opcional",
      kind: "damage",
      damageType: "bludgeoning",
      formula: gyroRicochetImpactFormula,
      note: "Use esta rolagem apenas quando a mesa preferir resolver o alvo secundário separadamente. Regra padrão: -2 no ataque e metade do dano do Strike principal.",
    },
  },
  {
    id: "medicinal-spin",
    name: "Rotação Medicinal",
    cost: 2,
    source: "Técnica",
    category: "technique",
    actions: "2 ações",
    description: "Gyro deixa a esfera vibrar contra o corpo ferido até ossos, músculos e circulação reencontrarem o compasso correto.",
    technical: [
      "Escolha um alvo. Se houver alvo marcado no Foundry, o módulo usa esse alvo; sem alvo, Gyro trata a si mesmo.",
      "Cura 1d6 por rank equivalente de personagem: nível 1-2 = 1d6, 3-4 = 2d6, 5-6 = 3d6, e assim por diante, mais o modificador principal da Rotação.",
      "O módulo aplica a cura diretamente no HP quando consegue atualizar o ator alvo; se não tiver permissão, deixa a rolagem no chat.",
      "Também pode estabilizar ou acordar aliado com 1 HP, conforme decisão do mestre.",
    ],
    options: [
      "Cura 1d6 por rank equivalente de nível de personagem + modificador principal. Ex.: nível 3 = 2d6 + mod; nível 5 = 3d6 + mod.",
      "Remover Sangrando",
      "Reduzir uma penalidade física em 1",
      "Acordar aliado inconsciente com 1 HP",
      "Estabilizar criatura morrendo",
      "Não cura veneno, doença mística ou corrupção divina sem uma Parte do Cadáver.",
    ],
    defaultMode: "forced",
    requiredLevel: 3,
    roll: {
      label: "Cura da Rotação Medicinal",
      kind: "healing",
      formula: gyroMedicinalHealingFormula,
      note: "Scaling inspirado em heightening de PF2e: +1d6 a cada novo rank equivalente de personagem.",
    },
  },
  {
    id: "rotating-jaw",
    name: "Mandíbula Giratória",
    cost: 2,
    source: "Técnica",
    category: "technique",
    actions: "1 ação",
    description: "Gyro acerta cabeça, pescoço ou mandíbula com uma vibração que desencaixa o ritmo motor do alvo por um instante cruel.",
    technical: [
      "Requer que um Strike de Steel Ball tenha acertado ou que o mestre aprove o acerto narrativo na região.",
      "O alvo faz Fortitude contra a CD de Spin de Gyro.",
      "Falha: escolha 1 efeito. Falha crítica: aplique 2 efeitos.",
      "O módulo anuncia a CD e o alvo escolhido; aplicação de condição fica sob controle do mestre por enquanto.",
    ],
    options: [
      "Falha: escolha 1 efeito: Stupefied 1 até o fim do próximo turno de Gyro; -2 de circunstância no próximo ataque do alvo; ou o alvo perde a reação até o início do próximo turno dele.",
      "Falha crítica: aplique 2 efeitos da lista.",
      "Sucesso crítico: o alvo fica imune à Mandíbula Giratória por 24 horas ou até o fim da cena, conforme preferência da mesa.",
    ],
    defaultMode: "forced",
    requiredLevel: 3,
  },
  {
    id: "proportion-mark",
    name: "Marca da Proporção",
    cost: 1,
    source: "Técnica",
    category: "technique",
    actions: "1 ação",
    description: "Gyro grava uma proporção invisível no alvo, uma pequena assinatura vibratória que a esfera reconhece mesmo no caos.",
    technical: [
      "Escolha um alvo. O módulo registra o token/ator como alvo marcado quando possível.",
      "O primeiro ataque de esfera contra o alvo marcado recebe +2 conforme decisão do mestre.",
      "Acertar o alvo marcado gera +1 SP adicional além do +1 SP normal de acerto.",
      "A marca dura 1 cena ou até ser substituída por outra Marca da Proporção.",
    ],
    options: [
      "Gyro sente a direção do alvo",
      "Primeiro ataque de esfera recebe +2",
      "Acertar o alvo marcado gera +1 SP adicional",
      "Técnicas do Cadáver Santo têm efeito melhorado",
    ],
    defaultMode: "stable",
    requiredLevel: 3,
  },
  {
    id: "calculated-trajectory",
    name: "Trajetória Calculada",
    cost: 2,
    source: "IKON I",
    category: "ikon",
    actions: "1 ação",
    description: "Os Olhos do Cadáver Santo mostram uma linha que não parecia existir, e Gyro corrige o lançamento antes do mundo perceber.",
    technical: [
      "Reduz cobertura em 1 passo contra o próximo Strike de Steel Ball desta ação.",
      "Cobertura total só pode ser contornada com linha plausível de ricochete aprovada pelo mestre.",
      "Use modo Cadáver: exige IKON sincronizado e teste de Controle quando a rotação pedir.",
    ],
    options: [],
    defaultMode: "corpse",
    requiredIkon: "I",
  },
  {
    id: "trajectory-perfect",
    name: "Trajetória Perfeita",
    cost: 3,
    source: "IKON I",
    category: "ikon",
    actions: "ação livre",
    description: "Por um breve intervalo, o caminho da esfera vira uma frase completa: entrada, desvio, retorno e punição.",
    technical: [
      "Dura 1 rodada.",
      "O próximo Ricochete Espiral ou Trajetória Calculada reduz cobertura em 1 passo adicional.",
      "Pode encadear 1 alvo adicional distinto, com dano secundário reduzido conforme Ricochete Espiral.",
      "Frequência: 1 vez por rodada.",
    ],
    options: [],
    defaultMode: "corpse",
    requiredIkon: "I",
    requiredLevel: 3,
    frequency: "1 vez por rodada",
  },
  {
    id: "paralyzing-frequency",
    name: "Freq. Paralisante",
    cost: 2,
    source: "IKON II",
    category: "ikon",
    actions: "1 ação",
    description: "A esfera canta na frequência errada para o corpo do alvo, transformando passo em tropeço e impulso em peso.",
    technical: [
      "Escolha um alvo a alcance da Steel Ball ou dentro da cena autorizada pelo mestre.",
      "O alvo faz Fortitude contra a CD de Spin.",
      "Falha: velocidade reduzida pela metade até o fim do próximo turno de Gyro.",
      "Falha crítica: alvo fica imobilizado até o fim do próximo turno de Gyro ou recebe Slowed 1, à escolha do mestre.",
    ],
    options: [],
    defaultMode: "corpse",
    requiredIkon: "II",
    requiredLevel: 5,
  },
  {
    id: "battle-cadence",
    name: "Cadência de Batalha",
    cost: 5,
    source: "IKON III",
    category: "ikon",
    actions: "2 ações",
    description: "O Coração que Não Para entra no mesmo compasso de Gyro, e cada técnica passa a nascer com menos desperdício.",
    technical: [
      "Duração: 1 minuto.",
      "Habilidades de Rotação custam -1 SP, mínimo 0.",
      "Não reduz custos narrativos ou limitações de frequência.",
      "A duração deve ser acompanhada pelo mestre ou por efeito temporário externo.",
    ],
    options: [],
    defaultMode: "corpse",
    requiredIkon: "III",
    requiredLevel: 10,
  },
  {
    id: "axial-spin",
    name: "Rotação Axial",
    cost: 3,
    source: "IKON IV",
    category: "ikon",
    actions: "reação",
    description: "Gyro gira o eixo do próprio corpo e deixa o projétil perder o centro, como se a distância fosse torcida.",
    technical: [
      "Gatilho: Gyro é alvo de ataque físico à distância ou projétil semelhante.",
      "Frequência: 1 vez por rodada.",
      "Escolha +2 CA contra o ataque ou redução de dano igual a 2 + nível de Gyro.",
      "Se a redução zerar o dano, Gyro pode ricochetear como resposta narrativa/Strike autorizado pelo mestre.",
    ],
    options: [],
    defaultMode: "corpse",
    requiredIkon: "IV",
    requiredLevel: 6,
  },
  {
    id: "breaker-recharge",
    name: "Recarga do Quebrador",
    cost: 6,
    source: "IKON VIII",
    category: "ball-breaker",
    actions: "2 ações",
    description: "A Caveira recorda o caminho do golpe impossível e reabre espaço para o Ball Breaker voltar à cena.",
    technical: [
      "Recarrega o uso narrativo do Ball Breaker Devastador ou remove o bloqueio local de turno/cena definido pelo mestre.",
      "Não remove o limite de 1 uso por turno do Ball Breaker: Requiem.",
      "Exige IKON VIII sincronizado.",
    ],
    options: [],
    defaultMode: "perfect",
    requiredIkon: "VIII",
    requiredLevel: 11,
  },
  {
    id: "ball-breaker-requiem",
    name: "Ball Breaker: Requiem",
    cost: 8,
    source: "IKON VIII",
    category: "ball-breaker",
    actions: "2 ações",
    description: "Gyro prende uma sentença de rotação à esfera: não é só impacto, é o corpo do alvo sendo cobrado pelo tempo que tentou negar.",
    technical: [
      "Faça um Strike com Steel Ball como parte desta atividade de 2 ações.",
      "Se acertar, além do dano normal da Steel Ball, o alvo sofre 6d10 de dano de força.",
      "O ataque ignora resistência física/força até o nível de Gyro.",
      "Imunidades só podem ser afetadas em clímax narrativo ou com aprovação do mestre.",
      "Frequência: 1 vez por turno.",
    ],
    options: [],
    defaultMode: "perfect",
    requiredIkon: "VIII",
    requiredLevel: 12,
    frequency: "1 vez por turno",
    attachedToStrike: true,
    roll: {
      label: "Dano de força do Requiem",
      kind: "damage",
      damageType: "force",
      formula: () => "6d10",
      note: "Role apenas se o Strike de Steel Ball anexado acertar.",
    },
  },
  {
    id: "saints-hand",
    name: "Mão do Santo",
    cost: 10,
    source: "IKON IX",
    category: "ikon",
    actions: "ação livre",
    description: "A Alma do Santo corrige a mão de Gyro por três batidas, emprestando memória sagrada onde ainda faltava domínio.",
    technical: [
      "Duração: 3 rodadas.",
      "1 vez por rodada, Gyro trata uma técnica como desbloqueada.",
      "Ele ainda paga SP, respeita frequência e faz o Controle exigido pelo modo de execução.",
      "Não desbloqueia Rotação Absoluta sem liberação narrativa do mestre.",
    ],
    options: [],
    defaultMode: "perfect",
    requiredIkon: "IX",
    requiredLevel: 13,
  },
  {
    id: "absolute-rotation",
    name: "Rotação Absoluta",
    cost: 9,
    source: "Técnica Final",
    category: "final",
    actions: "GM / narrativo",
    description: "A espiral toca a regra por trás da cena. Quando isso acontece, o combate deixa de ser só combate.",
    technical: [
      "Uso narrativo, normalmente 1 vez por arco.",
      "Altera uma regra da cena em clímax aprovado pelo mestre.",
      "Requer nível alto, todas as Partes/IKONs relevantes, Cicatriz Sagrada e Rotação Absoluta pronta.",
      "Não é botão comum de combate e permanece visível para o GM mesmo bloqueada.",
    ],
    options: [],
    defaultMode: "perfect",
    requiredLevel: 17,
    requiresAllCorpseParts: true,
    requiresSacredScars: 1,
    requiresAbsolute: true,
    gmOnly: true,
    narrativeOnly: true,
  },
];

const GYRO_TECHNIQUE_GROUP_DEFS: Array<Omit<GyroTechniqueGroup, "techniques"> & { category: GyroTechniqueCategory }> = [
  {
    id: "techniques",
    category: "technique",
    label: "Técnicas",
    icon: "fas fa-circle-notch",
    hint: "Fundação da rotação: cura, marcação, ricochete e ataques que alimentam SP.",
  },
  {
    id: "ikons",
    category: "ikon",
    label: "IKONs do Cadáver Santo",
    icon: "fas fa-cross",
    hint: "Técnicas liberadas por Partes/IKONs sincronizadas.",
  },
  {
    id: "ball-breaker",
    category: "ball-breaker",
    label: "Ball Breaker",
    icon: "fas fa-burst",
    hint: "Golpes de ápice ligados à Caveira e à memória plena da rotação.",
  },
  {
    id: "final",
    category: "final",
    label: "Rotação Absoluta",
    icon: "fas fa-infinity",
    hint: "Recursos narrativos de clímax para uso controlado pelo mestre.",
  },
];

export const GYRO_IKONS: GyroIkon[] = [
  {
    id: "I",
    num: "I",
    piece: "Olhos",
    title: "Trajetória Revelada",
    tier: "normal",
    unlock: "Palma dos Olhos",
    passives: ["Trajetória Natural", "Olho do Ricochete"],
    actives: [{ name: "Trajetória Calculada", cost: 2, text: "Reduz cobertura em 1 passo." }],
    transcendence: { name: "Trajetória Perfeita", cost: 3, text: "Ataques calculados por 1 rodada." },
  },
  {
    id: "II",
    num: "II",
    piece: "Orelha",
    title: "Frequência da Rotação",
    tier: "normal",
    unlock: "Palma das Frequências",
    passives: ["Eco da Rotação"],
    actives: [
      { name: "Freq. Paralisante", cost: 2, text: "Reduz ou zera velocidade." },
      { name: "Freq. Perturbadora", cost: 2, text: "Pressiona concentração." },
      { name: "Freq. Reveladora", cost: 2, text: "Revela ilusões e invisíveis." },
    ],
    transcendence: { name: "Ressonância Total", cost: 4, text: "Aplica as três Frequências." },
  },
  {
    id: "III",
    num: "III",
    piece: "Coração",
    title: "Coração que Não Para",
    tier: "legendary",
    unlock: "Palma do Pulso",
    passives: ["Pulso Perpétuo", "Cadência Passiva", "Ball Breaker Embrionário"],
    actives: [{ name: "Cadência de Batalha", cost: 5, text: "Reduz custos de Rotação." }],
    transcendence: { name: "Coração que Não Para", cost: 6, text: "Estabiliza ao cair a 0 HP." },
  },
  {
    id: "IV",
    num: "IV",
    piece: "Espinha",
    title: "Eixo do Universo",
    tier: "legendary",
    unlock: "Palma do Eixo",
    passives: ["Ancoragem Giroscópica", "Ball Breaker Evoluído"],
    actives: [{ name: "Rotação Axial", cost: 3, text: "Deflecte projéteis físicos." }],
    transcendence: { name: "Eixo Absoluto", cost: 5, text: "Ancoragem ilimitada por 1 rodada." },
  },
  {
    id: "V",
    num: "V",
    piece: "Braços",
    title: "Impacto Composto",
    tier: "normal",
    unlock: "Palma da Força",
    passives: ["Impacto Composto", "Peso Giroscópico"],
    actives: [],
    transcendence: { name: "Rotação Amplificada", cost: 3, text: "Próximo ataque recebe +1 dado da arma ou +1d6/+2d6 de força por nível." },
  },
  {
    id: "VI",
    num: "VI",
    piece: "Pernas",
    title: "Passo Giroscópico",
    tier: "normal",
    unlock: "Palma do Impulso",
    passives: ["Carga em Rotação", "Derrubada Giroscópica"],
    actives: [],
    transcendence: { name: "Momentum Absoluto", cost: 2, text: "Movimento extremo em rotação." },
  },
  {
    id: "VII",
    num: "VII",
    piece: "Torso",
    title: "Núcleo da Rotação",
    tier: "legendary",
    unlock: "Palma do Centro",
    passives: ["Núcleo Expandido"],
    actives: [{ name: "Saturação da Rotação", cost: 0, text: "1x por descanso longo." }],
    transcendence: { name: "Núcleo Ardente", cost: 5, text: "Aumenta a pressão da Rotação." },
  },
  {
    id: "VIII",
    num: "VIII",
    piece: "Caveira",
    title: "Ball Breaker Pleno",
    tier: "legendary",
    unlock: "Palma da Memória",
    passives: ["Ball Breaker Pleno", "Quebrador de Essência"],
    actives: [{ name: "Recarga do Quebrador", cost: 6, text: "Recarrega o Ball Breaker Devastador." }],
    transcendence: { name: "Ball Breaker: Requiem", cost: 8, text: "Ataque que envelhece a alma." },
  },
  {
    id: "IX",
    num: "IX",
    piece: "Alma do Santo",
    title: "Memória do Santo",
    tier: "transcendental",
    unlock: "Palma da Presença",
    passives: ["Memória Viva", "Escudo da Alma"],
    actives: [{ name: "Consulta Sagrada", cost: 0, text: "1x por descanso longo." }],
    transcendence: { name: "Mão do Santo", cost: 10, text: "Acesso total por 3 turnos." },
  },
];

export const GYRO_DEVIATIONS: GyroDeviation[] = [
  {
    roll: 1,
    name: "Retorno Violento",
    text: "A esfera volta contra Gyro e a técnica falha.",
    combatEffect: "Gyro sofre 1d6 de dano de força por 2 níveis, fica off-guard até o início do próximo turno e perde 1 SP adicional.",
  },
  {
    roll: 2,
    name: "Colapso do Eixo",
    text: "A rotação colapsa completamente.",
    combatEffect: "SP atual vira 0. Até gastar 2 ações para Recentrar a Rotação, Gyro não pode usar técnicas com custo de SP.",
  },
  {
    roll: 3,
    name: "Ângulo Aberto",
    text: "A esfera rasga uma trajetória perigosa no campo.",
    combatEffect: "A técnica falha e o mestre escolhe um alvo ou objeto adjacente afetado por efeito menor. Gyro não pode ganhar SP até o fim do próximo turno.",
  },
  {
    roll: 4,
    name: "Pulso do Cadáver",
    text: "A Parte do Cadáver Santo exige preço.",
    combatEffect: "Gyro fica drained 1 ou clumsy 1 até o fim da cena, à escolha do mestre. Se não possuir Parte, fica slowed 1 por 1 rodada.",
  },
  {
    roll: 5,
    name: "Mão Travada",
    text: "A mão perde o ritmo fino da esfera.",
    combatEffect: "Até o fim do combate, a primeira técnica de Spin em cada rodada custa +1 SP. Uma atividade de 2 ações remove esse desvio.",
  },
  {
    roll: 6,
    name: "Espiral Exposta",
    text: "A Rotação abre demais o eixo de Gyro.",
    combatEffect: "Gyro fica slowed 1 no próximo turno e sofre -2 no próximo Controle de Spin deste combate.",
  },
];

export const BAYLE_STAGES: BayleStage[] = [
  {
    stage: 1,
    roman: "I",
    name: "Pele, Sangue e Coração",
    minLevel: 3,
    title: "Pele, Sangue e Coração Dracônico",
    subtitle: "O corpo aceita o primeiro ritmo de dragão: defesa, sangue quente e Ardor.",
    rageBonus: 4,
    lightningDC: 17,
    lightningCharges: 1,
    passives: [
      "Pele Dracônica: resistência 3 a fogo e eletricidade.",
      "+1 CA contra ataques físicos não mágicos, conforme decisão do mestre.",
      "+1 em Fortitude contra venenos, doenças e efeitos físicos extremos.",
      "Handwraps Integradas: +1 potency, Striking e dano desarmado apropriado ao estágio.",
    ],
    awakening: [
      "Ativar Despertar custa 3 Ardor e dura enquanto Bayle estiver em Rage.",
      "Chama dos Dragões: Strikes desarmados causam +1d4 fogo.",
      "Eletricidade de Placidusax: ação livre ao acertar, Fortitude CD 17 ou Stunned 1. 1 carga por Despertar.",
      "Rage Dracônico: bônus total de dano da Rage sobe para +4.",
    ],
    collapse: [
      "Rage termina com Despertar ativo: Drained 1 + Fatigued normal.",
      "Encerramento Dracônico usado: Drained 2.",
    ],
    actions: [
      {
        id: "placidusax-lightning",
        name: "Eletricidade de Placidusax",
        tag: "Ação livre",
        requirement: "Despertar ativo e Strike acertou",
        text: "Fortitude CD 17 ou Stunned 1. 1 carga por Despertar.",
      },
      {
        id: "draconic-closure",
        name: "Encerramento Dracônico",
        tag: "Golpe final",
        requirement: "Rage + Despertar",
        text: "Dado do Strike sobe um passo. Dano elemental extra = 2 x rodadas restantes da Rage, máximo 20. No E1/E2 o Despertar termina e não pode ser reativado neste combate.",
      },
    ],
  },
  {
    stage: 2,
    roman: "II",
    name: "Garras e Movimento",
    minLevel: 6,
    title: "Garras e Movimento",
    subtitle: "O corpo aprende a avançar como predador, sem abandonar as defesas do primeiro estágio.",
    rageBonus: 6,
    lightningDC: 18,
    lightningCharges: 1,
    passives: [
      "Mantém Pele Dracônica, resistências e Handwraps Integradas.",
      "Garras Integradas: dano desarmado pode alternar para corte quando fizer sentido narrativo.",
      "+10 pés de velocidade enquanto em Rage.",
      "Instinto de Investida: após mover 10 pés antes do Strike, adiciona +1d6 de dano uma vez por turno.",
    ],
    awakening: [
      "Chama dos Dragões aumenta para +2d4 fogo.",
      "Eletricidade de Placidusax: Fortitude CD 18 ou Stunned 1. 1 carga por Despertar.",
      "Rage Dracônico: bônus total de dano da Rage sobe para +6.",
      "Movimento em Despertar: +10 pés adicionais, total +20 pés com Rage.",
      "Salto/Ruptura: ignora terreno difícil e reações antes de um Strike 1 vez por Despertar.",
    ],
    collapse: [
      "Rage termina com Despertar ativo: Drained 1 + Fatigued.",
      "Encerramento usado: Drained 2.",
    ],
    actions: [
      {
        id: "placidusax-lightning",
        name: "Eletricidade de Placidusax",
        tag: "Ação livre",
        requirement: "Despertar ativo e Strike acertou",
        text: "Fortitude CD 18 ou Stunned 1. 1 carga por Despertar.",
      },
      {
        id: "draconic-closure",
        name: "Encerramento Dracônico",
        tag: "Golpe final",
        requirement: "Rage + Despertar",
        text: "Dado do Strike sobe um passo e aplica dano elemental extra. No E2 o Despertar ainda é consumido.",
      },
    ],
  },
  {
    stage: 3,
    roman: "III",
    name: "Escama e Espinha",
    minLevel: 8,
    title: "Escama e Espinha",
    subtitle: "A primeira armadura real emerge. A fúria passa a proteger e retaliar.",
    rageBonus: 8,
    lightningDC: 19,
    lightningCharges: 2,
    breath: { formula: "4d6", dc: 19 },
    passives: [
      "Escamas Dracônicas: +2 CA contra ataques físicos não mágicos.",
      "Resistência a fogo e eletricidade aumenta para 9.",
      "+2 circunstância em Intimidação e Demoralize pode melhorar o grau em sucesso, se o mestre aprovar.",
      "Mantém Garras, Passo e Instinto do estágio anterior.",
    ],
    awakening: [
      "Chama dos Dragões aumenta para +3d4 fogo.",
      "Eletricidade de Placidusax: Fortitude CD 19 ou Stunned 1. 2 cargas por Despertar.",
      "Rage Dracônico: bônus total de dano da Rage sobe para +8.",
      "Escamas em Fúria: proteção adicional enquanto o Despertar estiver ativo.",
    ],
    collapse: [
      "Rage termina com Despertar ativo: Drained 1 + Fatigued.",
      "Encerramento usado: Drained 2.",
      "No E3 o Encerramento zera Ardor, mas o Despertar não termina e pode ser reativado.",
    ],
    actions: [
      {
        id: "placidusax-lightning",
        name: "Eletricidade de Placidusax",
        tag: "Ação livre",
        requirement: "Despertar ativo e Strike acertou",
        text: "Fortitude CD 19 ou Stunned 1. 2 cargas por Despertar.",
      },
      {
        id: "bayle-breath",
        name: "Sopro de Bayle",
        tag: "2 ações",
        requirement: "Rage ativa",
        text: "Dano 4d6 fogo, CD 19, 1 vez por Rage. Não requer Despertar.",
        formula: "4d6",
      },
      {
        id: "draconic-closure",
        name: "Encerramento Dracônico",
        tag: "Golpe final",
        requirement: "Rage + Despertar",
        text: "Dado do Strike sobe um passo; Ardor zera, Despertar não termina e Rage continua.",
      },
    ],
  },
  {
    stage: 4,
    roman: "IV",
    name: "O Rugido",
    minLevel: 10,
    title: "O Rugido",
    subtitle: "A presença dracônica ocupa a cena. Bayle já não apenas luta: ele impõe território.",
    rageBonus: 10,
    lightningDC: 20,
    lightningCharges: 2,
    breath: { formula: "5d6", dc: 20 },
    passives: [
      "Escamas Dracônicas e resistências do E3 permanecem.",
      "Garras, Passo, Instinto e Presença seguem ativos.",
      "Durante Rage, a presença de Bayle pressiona inimigos próximos.",
    ],
    awakening: [
      "Eletricidade de Placidusax: Fortitude CD 20 ou Stunned 1. 2 cargas.",
      "Rage Dracônico: bônus total de dano da Rage sobe para +10.",
      "Escamas em Fúria: +1 CA contra todos os ataques durante o Despertar.",
      "Lanças de Placidusax ficam disponíveis 1 vez por Despertar.",
    ],
    collapse: [
      "Rage termina com Despertar ativo: Drained 1 + Fatigued.",
      "Encerramento usado: Drained 2 e encerramento narrativo da explosão dracônica.",
    ],
    actions: [
      {
        id: "placidusax-lightning",
        name: "Eletricidade de Placidusax",
        tag: "Ação livre",
        requirement: "Despertar ativo e Strike acertou",
        text: "Fortitude CD 20 ou Stunned 1. 2 cargas por Despertar.",
      },
      {
        id: "bayle-roar",
        name: "O Rugido",
        tag: "2 ações",
        requirement: "Rage ativa",
        text: "Vontade CD 20. Sucesso crítico: imune 24h. Usável 1 vez por Rage.",
      },
      {
        id: "placidusax-lances",
        name: "Lanças de Placidusax",
        tag: "2 ações",
        requirement: "Despertar ativo",
        text: "Até 3 alvos em 60 pés. Cada lança causa 2d6 eletricidade. MAP -4/-8 em vez de -5/-10. 1 vez por Despertar.",
        formula: "2d6",
      },
      {
        id: "bayle-breath",
        name: "Sopro de Bayle",
        tag: "2 ações",
        requirement: "Rage ativa",
        text: "Dano 5d6 fogo, CD 20, 1 vez por Rage.",
        formula: "5d6",
      },
      {
        id: "draconic-closure",
        name: "Encerramento Dracônico",
        tag: "Golpe final",
        requirement: "Rage + Despertar",
        text: "Ardor zera, Despertar não termina, Rage continua. Colapso com Drained 2.",
      },
    ],
  },
];

// TODO: Automatizar Desvios como efeitos PF2e quando a mesa fechar a regra final:
// Retorno Violento -> Off-Guard; Colapso do Eixo -> bloqueio de técnicas com custo de SP;
// Pulso do Cadáver -> Drained 1 ou Clumsy 1; Espiral Exposta -> Slowed 1 e -2 no próximo Controle de Spin.

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function levelBasedDC(level: number): number {
  const capped = clamp(Math.floor(level), 0, 20);
  return LEVEL_BASED_DCS[capped] ?? LEVEL_BASED_DCS[20];
}

function getActorLevel(actor: Actor): number {
  const system = (actor as unknown as { system?: Record<string, unknown> }).system ?? {};
  const details = asRecord(system.details);
  const level = asRecord(details.level);
  const value = Number(level.value ?? asRecord(system.level).value ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getPF2EAbilityMod(actor: Actor, ability: GyroMainAttribute): number {
  const system = (actor as unknown as { system?: Record<string, unknown> }).system ?? {};
  const abilities = asRecord(system.abilities);
  const abilityData = asRecord(abilities[ability]);
  const mod = Number(abilityData.mod ?? 0);
  return Number.isFinite(mod) ? mod : 0;
}

function getControlledActor(): Actor | null {
  const controlled = canvas?.tokens?.controlled?.[0]?.actor;
  return controlled ?? game.user?.character ?? null;
}

function getActorToken(actor: Actor): Token | null {
  const controlled = canvas?.tokens?.controlled?.find(token => token.actor?.id === actor.id);
  if (controlled) return controlled;
  const activeTokens = typeof actor.getActiveTokens === "function" ? actor.getActiveTokens() : [];
  return activeTokens[0] ?? null;
}

function isSequencerActive(): boolean {
  return Boolean(game.modules?.get("sequencer")?.active && (globalThis as { Sequence?: unknown }).Sequence);
}

function getGyroAnimationFile(variant: "technique" | "deviation" | "status"): string {
  const jb2aModuleId = ["jb2a_patreon", "JB2A_DnD5e", "jb2a_free"].find(moduleId => game.modules?.get(moduleId)?.active);
  const jb2aFiles: Record<typeof variant, string> = {
    technique: "Library/Generic/Magic_Signs/ConjurationCircleComplete_02_Regular_Yellow_800x800.webm",
    deviation: "Library/Generic/Explosion/Explosion_05_Regular_Orange_400x400.webm",
    status: "Library/TMFX/OutPulse/Circle/OutPulse_02_Circle_Normal_500.webm",
  };
  return jb2aModuleId ? `modules/${jb2aModuleId}/${jb2aFiles[variant]}` : GYRO_SPINBALL_ASSET;
}

function getCombatRoundKey(): string | null {
  const combat = game.combat;
  if (!combat) return null;
  return `${combat.id ?? "combat"}:${combat.round ?? 0}`;
}

function getCombatTurnKey(): string | null {
  const combat = game.combat as (Combat & { combatant?: { id?: string }; turn?: number; current?: { combatantId?: string } }) | undefined;
  if (!combat) return null;
  const combatantId = combat.combatant?.id ?? combat.current?.combatantId ?? "no-combatant";
  return `${combat.id ?? "combat"}:${combat.round ?? 0}:${combat.turn ?? 0}:${combatantId}`;
}

function getSPGainCap(actor: Actor): number {
  const level = getActorLevel(actor);
  if (level >= 13) return 4;
  if (level >= 7) return 3;
  return 2;
}

function normalizeProficiencyRank(value: unknown): GyroProficiencyRank {
  if (value === "legendary" || value === 8) return "legendary";
  if (value === "master" || value === 6) return "master";
  if (value === "expert" || value === 4) return "expert";
  return "trained";
}

function normalizeGyroState(raw: unknown): GyroSpinState {
  const state = asRecord(raw);
  return {
    ...DEFAULT_GYRO_STATE,
    currentSP: Number(state.currentSP ?? DEFAULT_GYRO_STATE.currentSP) || 0,
    maxSPOverride: state.maxSPOverride === undefined ? undefined : Number(state.maxSPOverride),
    mainAttribute: state.mainAttribute === "wis" ? "wis" : "dex",
    proficiencyRank: normalizeProficiencyRank(state.proficiencyRank ?? state.proficiencyBonus ?? DEFAULT_GYRO_STATE.proficiencyRank),
    sacredScars: Number(state.sacredScars ?? DEFAULT_GYRO_STATE.sacredScars) || 0,
    corpsePartNumber: clamp(Number(state.corpsePartNumber ?? DEFAULT_GYRO_STATE.corpsePartNumber) || 1, 1, 9),
    torsoBonus: Boolean(state.torsoBonus),
    heartRegen: Boolean(state.heartRegen),
    absoluteReady: Boolean(state.absoluteReady),
    unlockedIkons: Array.isArray(state.unlockedIkons) ? state.unlockedIkons.map(String) : [],
    activeDeviation: typeof state.activeDeviation === "string" ? state.activeDeviation : undefined,
    activeDeviationCombatId: typeof state.activeDeviationCombatId === "string" ? state.activeDeviationCombatId : undefined,
    proportionMarkTargetId: typeof state.proportionMarkTargetId === "string" ? state.proportionMarkTargetId : undefined,
    spGainedThisRound: Number(state.spGainedThisRound ?? 0) || 0,
    lastSPRoundKey: typeof state.lastSPRoundKey === "string" ? state.lastSPRoundKey : undefined,
    lastBallBreakerTurnKey: typeof state.lastBallBreakerTurnKey === "string" ? state.lastBallBreakerTurnKey : undefined,
  };
}

function normalizeBayleState(raw: unknown): BayleDragonState {
  const state = asRecord(raw);
  return {
    ...DEFAULT_BAYLE_STATE,
    stage: clamp(Number(state.stage ?? DEFAULT_BAYLE_STATE.stage) || 1, 1, 4),
    ardor: clamp(Number(state.ardor ?? DEFAULT_BAYLE_STATE.ardor) || 0, 0, 3),
    rageActive: Boolean(state.rageActive),
    awakeningActive: Boolean(state.awakeningActive),
    lightningChargesUsed: clamp(Number(state.lightningChargesUsed ?? 0) || 0, 0, 2),
    breathUsed: Boolean(state.breathUsed),
    roarUsed: Boolean(state.roarUsed),
    lancesUsed: Boolean(state.lancesUsed),
    closureUsed: Boolean(state.closureUsed),
  };
}

function normalizePippingState(raw: unknown): PippingNightState {
  const state = asRecord(raw);
  return {
    ...DEFAULT_PIPPING_STATE,
    pulse: clamp(Number(state.pulse ?? DEFAULT_PIPPING_STATE.pulse) || 0, 0, 6),
    tier: clamp(Number(state.tier ?? DEFAULT_PIPPING_STATE.tier) || 1, 1, 4),
    livingNightActive: Boolean(state.livingNightActive),
    mirroredShadows: clamp(Number(state.mirroredShadows ?? DEFAULT_PIPPING_STATE.mirroredShadows) || 0, 0, 8),
  };
}

function getBayleStageData(stage: number): BayleStage {
  return BAYLE_STAGES.find(item => item.stage === stage) ?? BAYLE_STAGES[0];
}

function sanitizeGyroDeviationState(state: GyroSpinState): GyroSpinState {
  if (!state.activeDeviation) return state;
  const activeCombatId = game.combat?.id;
  if (!activeCombatId || state.activeDeviationCombatId !== activeCombatId) {
    const next = { ...state };
    delete next.activeDeviation;
    delete next.activeDeviationCombatId;
    return next;
  }
  return state;
}

interface EthernumTargetChoice {
  id: string;
  name: string;
  actor: Actor;
  actorKey: string;
}

function escapeHtml(value: unknown): string {
  const text = String(value ?? "");
  const escape = (foundry.utils as { escapeHTML?: (value: string) => string }).escapeHTML;
  if (escape) return escape(text);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getActorKey(actor: Actor): string {
  return String((actor as Actor & { uuid?: string }).uuid ?? actor.id ?? actor.name ?? "");
}

function getTargetChoices(fallbackActor?: Actor | null, includeFallback = false): EthernumTargetChoice[] {
  const targets = Array.from(game.user?.targets ?? []) as Array<{ id?: string; name?: string; actor?: Actor }>;
  const choices = targets
    .filter(token => token.actor)
    .map((token, index): EthernumTargetChoice => {
      const actor = token.actor as Actor;
      return {
        id: String(token.id ?? actor.id ?? index),
        name: String(token.name ?? actor.name ?? `Alvo ${index + 1}`),
        actor,
        actorKey: getActorKey(actor),
      };
    });

  if (choices.length === 0 && includeFallback && fallbackActor) {
    choices.push({
      id: "self",
      name: `${fallbackActor.name ?? "Gyro"} (si mesmo)`,
      actor: fallbackActor,
      actorKey: getActorKey(fallbackActor),
    });
  }

  return choices;
}

async function chooseTargetChoice(title: string, fallbackActor?: Actor | null, includeFallback = false): Promise<EthernumTargetChoice | null> {
  const choices = getTargetChoices(fallbackActor, includeFallback);
  if (choices.length === 0) {
    ui.notifications?.warn("Selecione um alvo no canvas antes de usar esta técnica.");
    return null;
  }
  if (choices.length === 1) return choices[0];

  return new Promise(resolve => {
    let resolved = false;
    const content = `
      <form class="ethernum-target-choice">
        <label>
          <span>Alvo</span>
          <select name="target">
            ${choices.map(choice => `<option value="${escapeHtml(choice.id)}">${escapeHtml(choice.name)}</option>`).join("")}
          </select>
        </label>
      </form>`;
    new Dialog({
      title,
      content,
      buttons: {
        confirm: {
          label: game.i18n!.localize("ETHERNUM.Buttons.Activate"),
          callback: (html: JQuery) => {
            resolved = true;
            const selectedId = String(html.find('[name="target"]').val() ?? "");
            resolve(choices.find(choice => choice.id === selectedId) ?? choices[0]);
          },
        },
        cancel: {
          label: game.i18n!.localize("ETHERNUM.Buttons.Close"),
          callback: () => {
            resolved = true;
            resolve(null);
          },
        },
      },
      close: () => {
        if (!resolved) resolve(null);
      },
    }).render(true);
  });
}

async function applyActorHpDelta(actor: Actor, amount: number): Promise<boolean> {
  const system = asRecord(actor.system);
  const attributes = asRecord(system.attributes);
  const hp = asRecord(attributes.hp);
  const current = Number(hp.value);
  const max = Number(hp.max);
  if (!Number.isFinite(current) || !Number.isFinite(max)) return false;
  await (actor as Actor & { update: (data: Record<string, unknown>, operation?: Record<string, unknown>) => Promise<Actor> })
    .update({ "system.attributes.hp.value": clamp(current + amount, 0, max) });
  return true;
}

function getChatMessageContext(message: ChatMessage): Record<string, unknown> {
  const flags = asRecord((message as ChatMessage & { flags?: unknown }).flags);
  const pf2e = asRecord(flags.pf2e);
  return asRecord(pf2e.context ?? pf2e);
}

function isPF2EAttackRollMessage(message: ChatMessage): boolean {
  const context = getChatMessageContext(message);
  const type = String(context.type ?? context.rollType ?? "");
  if (type === "attack-roll" || type === "strike-attack-roll") return true;
  const domains = Array.isArray(context.domains) ? context.domains.map(String) : [];
  const options = Array.isArray(context.options) ? context.options.map(String) : [];
  return domains.some(domain => domain.includes("attack-roll") || domain.includes("strike"))
    || options.some(option => option === "action:strike" || option.includes("attack"));
}

function isPF2EHitMessage(message: ChatMessage): boolean {
  const flags = asRecord(asRecord((message as ChatMessage & { flags?: unknown }).flags).pf2e);
  const context = getChatMessageContext(message);
  const candidates = [
    flags.outcome,
    flags.degreeOfSuccess,
    context.outcome,
    context.degreeOfSuccess,
    asRecord(context.check).degreeOfSuccess,
    asRecord(context.roll).degreeOfSuccess,
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === "number") return candidate >= 2;
    const value = String(candidate).toLowerCase();
    if (value === "success" || value === "criticalsuccess" || value === "critical-success" || value === "critical success") return true;
    if (value === "failure" || value === "criticalfailure" || value === "critical-failure" || value === "critical failure") return false;
  }
  return false;
}

function getActorFromChatMessage(message: ChatMessage): Actor | null {
  const speaker = (message as ChatMessage & { speaker?: { actor?: string } }).speaker;
  const actorId = speaker?.actor;
  return (actorId ? game.actors?.get(actorId) ?? null : null) as Actor | null;
}

function collectActorRefs(value: unknown, refs = new Set<string>(), depth = 0): Set<string> {
  if (depth > 4 || value === null || value === undefined) return refs;
  if (typeof value === "string") {
    if (value.includes("Actor.") || value.includes(".Actor.") || value.length >= 8) refs.add(value);
    return refs;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectActorRefs(item, refs, depth + 1));
    return refs;
  }
  if (typeof value !== "object") return refs;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("actor") || lowerKey === "target" || lowerKey === "targets" || lowerKey === "token") {
      collectActorRefs(item, refs, depth + 1);
    }
  }
  return refs;
}

function chatMessageTargetRefs(message: ChatMessage): Set<string> {
  const flags = asRecord(asRecord((message as ChatMessage & { flags?: unknown }).flags).pf2e);
  const refs = collectActorRefs(flags.target);
  return collectActorRefs(asRecord(getChatMessageContext(message)).target, refs);
}

function targetRefsIncludeActor(refs: Set<string>, actor: Actor): boolean {
  const actorId = String(actor.id ?? "");
  const actorUuid = getActorKey(actor);
  return Array.from(refs).some(ref => ref === actorId || ref === actorUuid || ref.includes(actorId) || ref.includes(actorUuid));
}

export class UniqueMechanicsSystem {
  static getControlledActor(): Actor | null {
    return getControlledActor();
  }

  static getState(actor: Actor): UniqueMechanicsState {
    const raw = asRecord(actor.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics"));
    const activeProfile = raw.activeProfile === GYRO_PROFILE_ID
      || raw.activeProfile === BAYLE_PROFILE_ID
      || raw.activeProfile === PIPPING_PROFILE_ID
      || PLACEHOLDER_PROFILE_IDS.includes(raw.activeProfile as typeof PLACEHOLDER_PROFILE_IDS[number])
      ? raw.activeProfile
      : "";
    return {
      activeProfile: activeProfile as UniqueMechanicProfileId,
      profiles: asRecord(raw.profiles),
    };
  }

  static async setState(actor: Actor, state: UniqueMechanicsState): Promise<void> {
    await actor.setFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics", state);
  }

  static async setStateQuiet(actor: Actor, state: UniqueMechanicsState): Promise<void> {
    await (actor as Actor & {
      update: (data: Record<string, unknown>, operation?: Record<string, unknown>) => Promise<Actor>;
    }).update({ [`flags.${ETHERNUM.MODULE_NAME}.uniqueMechanics`]: state }, { render: false });
  }

  static getGyroState(actor: Actor): GyroSpinState {
    const state = this.getState(actor);
    return sanitizeGyroDeviationState(normalizeGyroState(state.profiles[GYRO_PROFILE_ID]));
  }

  static getBayleState(actor: Actor): BayleDragonState {
    const state = this.getState(actor);
    return normalizeBayleState(state.profiles[BAYLE_PROFILE_ID]);
  }

  static getPippingState(actor: Actor): PippingNightState {
    const state = this.getState(actor);
    return normalizePippingState(state.profiles[PIPPING_PROFILE_ID]);
  }

  static async setActiveProfile(actor: Actor, profileId: UniqueMechanicProfileId): Promise<void> {
    const state = this.getState(actor);
    state.activeProfile = profileId;
    if (profileId === GYRO_PROFILE_ID && !state.profiles[GYRO_PROFILE_ID]) {
      state.profiles[GYRO_PROFILE_ID] = { ...DEFAULT_GYRO_STATE };
    }
    if (profileId === BAYLE_PROFILE_ID && !state.profiles[BAYLE_PROFILE_ID]) {
      state.profiles[BAYLE_PROFILE_ID] = { ...DEFAULT_BAYLE_STATE };
    }
    if (profileId === PIPPING_PROFILE_ID && !state.profiles[PIPPING_PROFILE_ID]) {
      state.profiles[PIPPING_PROFILE_ID] = { ...DEFAULT_PIPPING_STATE };
    }
    await this.setState(actor, state);
  }

  static async updateGyroState(actor: Actor, patch: Partial<GyroSpinState>): Promise<GyroSpinState> {
    const state = this.getState(actor);
    const current = this.getGyroState(actor);
    const next = normalizeGyroState({ ...current, ...patch });
    next.currentSP = clamp(next.currentSP, 0, this.calculateGyroMaxSP(actor, next));
    if (!next.activeDeviation) {
      delete next.activeDeviation;
      delete next.activeDeviationCombatId;
    }
    if (!Number.isFinite(Number(next.maxSPOverride)) || Number(next.maxSPOverride) <= 0) delete next.maxSPOverride;
    state.activeProfile = GYRO_PROFILE_ID;
    state.profiles[GYRO_PROFILE_ID] = next;
    await this.setStateQuiet(actor, state);
    return next;
  }

  static async updateBayleState(actor: Actor, patch: Partial<BayleDragonState>): Promise<BayleDragonState> {
    const state = this.getState(actor);
    const current = this.getBayleState(actor);
    const next = normalizeBayleState({ ...current, ...patch });
    const stageData = getBayleStageData(next.stage);
    next.lightningChargesUsed = clamp(next.lightningChargesUsed, 0, stageData.lightningCharges);
    if (!next.awakeningActive) {
      next.lightningChargesUsed = 0;
      next.lancesUsed = false;
    }
    state.activeProfile = BAYLE_PROFILE_ID;
    state.profiles[BAYLE_PROFILE_ID] = next;
    await this.setStateQuiet(actor, state);
    return next;
  }

  static async adjustBayleArdor(actor?: Actor | null, amount = 1): Promise<BayleDragonState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getBayleState(target);
    return this.updateBayleState(target, { ardor: clamp(state.ardor + amount, 0, 3) });
  }

  static async setBayleStage(actor?: Actor | null, stage = 1): Promise<BayleDragonState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    return this.updateBayleState(target, {
      stage,
      lightningChargesUsed: 0,
      breathUsed: false,
      roarUsed: false,
      lancesUsed: false,
    });
  }

  static async toggleBayleRage(actor?: Actor | null): Promise<BayleDragonState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getBayleState(target);
    const nextRage = !state.rageActive;
    const next = await this.updateBayleState(target, {
      rageActive: nextRage,
      awakeningActive: nextRage ? state.awakeningActive : false,
      lightningChargesUsed: 0,
      breathUsed: nextRage ? state.breathUsed : false,
      roarUsed: nextRage ? state.roarUsed : false,
      closureUsed: nextRage ? state.closureUsed : false,
    });
    await this.showBayleStatus(target, nextRage ? "Rage Dracônico ativo" : "Rage Dracônico encerrado");
    return next;
  }

  static async toggleBayleAwakening(actor?: Actor | null): Promise<BayleDragonState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getBayleState(target);
    if (!state.awakeningActive && state.ardor < 3) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Bayle.RequiresArdor"));
      return state;
    }
    const nextAwakening = !state.awakeningActive;
    const next = await this.updateBayleState(target, {
      rageActive: nextAwakening ? true : state.rageActive,
      awakeningActive: nextAwakening,
      ardor: nextAwakening ? 0 : state.ardor,
      lightningChargesUsed: 0,
      lancesUsed: false,
    });
    await this.showBayleStatus(target, nextAwakening ? "Despertar Dracônico ativo" : "Despertar Dracônico encerrado");
    return next;
  }

  static async updatePippingState(actor: Actor, patch: Partial<PippingNightState>): Promise<PippingNightState> {
    const state = this.getState(actor);
    const current = this.getPippingState(actor);
    const next = normalizePippingState({ ...current, ...patch });
    state.activeProfile = PIPPING_PROFILE_ID;
    state.profiles[PIPPING_PROFILE_ID] = next;
    await this.setStateQuiet(actor, state);
    return next;
  }

  static async adjustPippingPulse(actor?: Actor | null, amount = 1): Promise<PippingNightState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getPippingState(target);
    return this.updatePippingState(target, { pulse: clamp(state.pulse + amount, 0, 6) });
  }

  static async handlePF2EChatMessage(message: ChatMessage): Promise<void> {
    if (game.system?.id !== "pf2e") return;
    if (!isPF2EAttackRollMessage(message) || !isPF2EHitMessage(message)) return;

    const attacker = getActorFromChatMessage(message);
    const targetRefs = chatMessageTargetRefs(message);

    if (attacker) {
      const attackerProfile = this.getState(attacker).activeProfile;
      if (attackerProfile === GYRO_PROFILE_ID) {
        const gyroState = this.getGyroState(attacker);
        const markedHit = gyroState.proportionMarkTargetId
          ? Array.from(targetRefs).some(ref => ref.includes(gyroState.proportionMarkTargetId as string) || ref === gyroState.proportionMarkTargetId)
          : false;
        await this.gainGyroSP(attacker, markedHit ? 2 : 1, "");
        if (markedHit) ui.notifications?.info(`${attacker.name}: +2 SP por acerto contra alvo marcado.`);
      }
      if (attackerProfile === BAYLE_PROFILE_ID) {
        await this.adjustBayleArdor(attacker, 1);
        ui.notifications?.info(`${attacker.name}: +1 Ardor por acertar.`);
      }
      if (attackerProfile === PIPPING_PROFILE_ID) {
        const pippingState = this.getPippingState(attacker);
        await this.updatePippingState(attacker, { pulse: clamp(pippingState.pulse + 1, 0, 6) });
        ui.notifications?.info(`${attacker.name}: +1 Pulso Sombrio por acertar.`);
      }
    }

    if (targetRefs.size === 0) return;
    for (const actor of game.actors ?? []) {
      if ((actor.type as string) !== "character") continue;
      if (this.getState(actor).activeProfile !== BAYLE_PROFILE_ID) continue;
      if (attacker?.id && actor.id === attacker.id) continue;
      if (!targetRefsIncludeActor(targetRefs, actor)) continue;
      await this.adjustBayleArdor(actor, 1);
      ui.notifications?.info(`${actor.name}: +1 Ardor por ser acertado.`);
    }
  }

  static async showPippingStatus(actor?: Actor | null, title = "Pipping — Expressão da Noite"): Promise<void> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return;
    }
    const state = this.getPippingState(target);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-pipping-chat-card">
          <h3>${title}</h3>
          <p><strong>Tier:</strong> ${state.tier}</p>
          <p><strong>Pulso Sombrio:</strong> ${state.pulse} / 6</p>
          <p><strong>Sombras Espelhadas:</strong> ${state.mirroredShadows}</p>
          <p><strong>Canção da Noite Viva:</strong> ${state.livingNightActive ? "Ativa" : "Inativa"}</p>
        </div>`,
    });
  }

  static calculateGyroMaxSP(actor: Actor, state = this.getGyroState(actor)): number {
    const override = Number(state.maxSPOverride);
    if (Number.isFinite(override) && override > 0) return Math.floor(override);
    return 6 + getActorLevel(actor) + state.unlockedIkons.length + (state.torsoBonus ? 3 : 0);
  }

  static getGyroRank(currentSP: number, state?: GyroSpinState): GyroRank {
    if (state?.absoluteReady) return GYRO_RANKS[4];
    return GYRO_RANKS.find(rank =>
      rank.id !== "absolute"
      && currentSP >= rank.minSP
      && (rank.maxSP === null || currentSP <= rank.maxSP)
    ) ?? GYRO_RANKS[0];
  }

  static getGyroControlDC(actor: Actor, mode: GyroExecutionMode, state = this.getGyroState(actor)): number | null {
    if (mode === "stable") return null;
    const baseDC = levelBasedDC(getActorLevel(actor));
    if (mode === "forced") return baseDC - 2;
    if (mode === "corpse") return baseDC + Math.ceil(clamp(state.corpsePartNumber, 1, 9) / 3);
    return baseDC + 2;
  }

  static canUseGyroExecutionMode(actor: Actor, mode: GyroExecutionMode, state = this.getGyroState(actor)): { available: boolean; reason: string } {
    const level = getActorLevel(actor);
    if (mode === "stable") return { available: true, reason: "" };
    if (mode === "forced") return level >= 3
      ? { available: true, reason: "" }
      : { available: false, reason: game.i18n!.format("ETHERNUM.Unique.Gyro.RequiresLevel", { level: 3 }) };
    if (mode === "corpse") return state.unlockedIkons.length > 0
      ? { available: true, reason: "" }
      : { available: false, reason: game.i18n!.localize("ETHERNUM.Unique.Gyro.RequiresCorpsePart") };
    return level >= 9 || state.absoluteReady
      ? { available: true, reason: "" }
      : { available: false, reason: game.i18n!.format("ETHERNUM.Unique.Gyro.RequiresLevelOrNarrative", { level: 9 }) };
  }

  static getGyroControlBonus(actor: Actor, state = this.getGyroState(actor)): number {
    return getActorLevel(actor)
      + PROFICIENCY_RANK_BONUS[state.proficiencyRank]
      + getPF2EAbilityMod(actor, state.mainAttribute);
  }

  static getGyroTechniqueStatus(
    actor: Actor,
    technique: GyroTechnique,
    state = this.getGyroState(actor),
    isGM = game.user?.isGM ?? false
  ): { unlocked: boolean; lockReasons: string[] } {
    const reasons: string[] = [];
    const level = getActorLevel(actor);
    if (technique.requiredLevel && level < technique.requiredLevel) {
      reasons.push(game.i18n!.format("ETHERNUM.Unique.Gyro.RequiresLevel", { level: technique.requiredLevel }));
    }
    if (technique.requiredIkon && !state.unlockedIkons.includes(technique.requiredIkon)) {
      reasons.push(game.i18n!.format("ETHERNUM.Unique.Gyro.RequiresIkon", { ikon: technique.requiredIkon }));
    }
    if (technique.requiredCorpseParts && state.unlockedIkons.length < technique.requiredCorpseParts) {
      reasons.push(game.i18n!.format("ETHERNUM.Unique.Gyro.RequiresParts", { count: technique.requiredCorpseParts }));
    }
    if (technique.requiresAllCorpseParts && state.unlockedIkons.length < 9) {
      reasons.push(game.i18n!.localize("ETHERNUM.Unique.Gyro.RequiresAllParts"));
    }
    if (technique.requiresSacredScars && state.sacredScars < technique.requiresSacredScars) {
      reasons.push(game.i18n!.format("ETHERNUM.Unique.Gyro.RequiresScars", { count: technique.requiresSacredScars }));
    }
    if (technique.requiresAbsolute && !state.absoluteReady) {
      reasons.push(game.i18n!.localize("ETHERNUM.Unique.Gyro.RequiresAbsolute"));
    }
    if (technique.gmOnly && !isGM) {
      reasons.push(game.i18n!.localize("ETHERNUM.Unique.Gyro.GMOnlyTechnique"));
    }
    return { unlocked: reasons.length === 0, lockReasons: reasons };
  }

  static buildGyroExecutionModes(actor: Actor, state: GyroSpinState, selected: GyroExecutionMode): GyroTechniqueSheetData["executionModes"] {
    const modes: GyroExecutionMode[] = ["stable", "forced", "corpse", "perfect"];
    return modes.map(mode => {
      const gate = this.canUseGyroExecutionMode(actor, mode, state);
      const dc = this.getGyroControlDC(actor, mode, state);
      return {
        id: mode,
        label: game.i18n!.localize(`ETHERNUM.Unique.Gyro.Execution.${mode}`),
        dcLabel: dc === null ? game.i18n!.localize("ETHERNUM.Unique.Gyro.StableNoCheck") : `CD ${dc}`,
        available: gate.available,
        reason: gate.reason,
        selected: mode === selected,
      };
    });
  }

  static async setGyroSP(actor: Actor, value: number): Promise<GyroSpinState> {
    const current = this.getGyroState(actor);
    const maxSP = this.calculateGyroMaxSP(actor, current);
    return this.updateGyroState(actor, { currentSP: clamp(Math.floor(value), 0, maxSP) });
  }

  static async adjustGyroSP(actor: Actor, amount: number, reason = ""): Promise<GyroSpinState> {
    const current = this.getGyroState(actor);
    const next = await this.setGyroSP(actor, current.currentSP + amount);
    if (reason) await this.showGyroStatus(actor, reason);
    return next;
  }

  static async gainGyroSP(actor?: Actor | null, amount = 1, reason = "Ganho de Spin"): Promise<GyroSpinState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getGyroState(target);
    const roundKey = getCombatRoundKey();
    let allowedAmount = amount;
    let patch: Partial<GyroSpinState> = {};
    if (roundKey) {
      const currentRoundGain = state.lastSPRoundKey === roundKey ? state.spGainedThisRound ?? 0 : 0;
      const remaining = Math.max(0, getSPGainCap(target) - currentRoundGain);
      allowedAmount = Math.min(amount, remaining);
      patch = {
        lastSPRoundKey: roundKey,
        spGainedThisRound: currentRoundGain + allowedAmount,
      };
      if (allowedAmount <= 0) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Gyro.SPGainCapped"));
        return state;
      }
    }
    const next = await this.adjustGyroSP(target, allowedAmount, reason);
    if (Object.keys(patch).length > 0) return this.updateGyroState(target, patch);
    return next;
  }

  static async spendGyroSP(actor?: Actor | null, amount = 1, reason = "Gasto de Spin"): Promise<GyroSpinState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getGyroState(target);
    if (state.currentSP < amount) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Gyro.NotEnoughSP"));
      return null;
    }
    return this.adjustGyroSP(target, -amount, reason);
  }

  static async startGyroCombat(actor?: Actor | null): Promise<GyroSpinState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getGyroState(target);
    const openingSP = clamp(2 + getPF2EAbilityMod(target, state.mainAttribute), 0, this.calculateGyroMaxSP(target, state));
    const next = await this.updateGyroState(target, { currentSP: openingSP });
    await this.showGyroStatus(target, game.i18n!.localize("ETHERNUM.Unique.Gyro.CombatStart"));
    return next;
  }

  static async showGyroStatus(actor?: Actor | null, title?: string): Promise<void> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return;
    }
    const state = this.getGyroState(target);
    const maxSP = this.calculateGyroMaxSP(target, state);
    const rank = this.getGyroRank(state.currentSP, state);
    const controlBonus = this.getGyroControlBonus(target, state);
    void this.playGyroSpinAnimation(target, "status");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card">
          <h3>${title ?? game.i18n!.localize("ETHERNUM.Unique.Gyro.Status")}</h3>
          <p><strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.SpinPoints")}:</strong> ${state.currentSP} / ${maxSP}</p>
          <p><strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.RotationRank")}:</strong> ${rank.num} - ${rank.name}</p>
          <p><strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.ControlBonus")}:</strong> +${controlBonus}</p>
          ${state.activeDeviation ? `<p><strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.ActiveDeviation")}:</strong> ${state.activeDeviation}</p>` : ""}
          <p>${rank.text}</p>
        </div>`,
    });
  }

  static async showBayleStatus(actor?: Actor | null, title?: string): Promise<void> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return;
    }
    const state = this.getBayleState(target);
    const stage = getBayleStageData(state.stage);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-bayle-chat-card">
          <h3>${title ?? "Bayle — Corpo Dracônico"}</h3>
          <p><strong>Estágio:</strong> ${stage.roman} — ${stage.name}</p>
          <p><strong>Ardor:</strong> ${state.ardor} / 3</p>
          <p><strong>Rage:</strong> ${state.rageActive ? "Ativa" : "Inativa"} · <strong>Despertar:</strong> ${state.awakeningActive ? "Ativo" : "Inativo"}</p>
          <p><strong>Rage Dracônico:</strong> +${stage.rageBonus} dano total durante Rage.</p>
          <p><strong>Placidusax:</strong> Fortitude CD ${stage.lightningDC}; ${stage.lightningCharges - state.lightningChargesUsed}/${stage.lightningCharges} carga(s) disponíveis.</p>
          <p><strong>Despertar deste estágio:</strong></p>
          <ul>${stage.awakening.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          <p><strong>Colapso/Encerramento:</strong></p>
          <ul>${stage.collapse.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>`,
    });
  }

  static async useBayleAction(actor?: Actor | null, actionId = "placidusax-lightning"): Promise<void> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return;
    }
    const state = this.getBayleState(target);
    const stage = getBayleStageData(state.stage);
    const action = stage.actions.find(item => item.id === actionId);
    if (!action) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Errors.TechniqueNotFound"));
      return;
    }

    if (actionId === "placidusax-lightning") {
      if (!state.awakeningActive) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Bayle.RequiresAwakening"));
        return;
      }
      if (state.lightningChargesUsed >= stage.lightningCharges) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Bayle.NoCharges"));
        return;
      }
      await this.updateBayleState(target, { lightningChargesUsed: state.lightningChargesUsed + 1 });
    }

    if (actionId === "bayle-breath") {
      if (!state.rageActive) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Bayle.RequiresRage"));
        return;
      }
      if (state.breathUsed) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Bayle.OncePerRage"));
        return;
      }
      await this.updateBayleState(target, { breathUsed: true });
    }

    if (actionId === "bayle-roar") {
      if (stage.stage < 4 || !state.rageActive) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Bayle.RequiresRage"));
        return;
      }
      if (state.roarUsed) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Bayle.OncePerRage"));
        return;
      }
      await this.updateBayleState(target, { roarUsed: true });
    }

    if (actionId === "placidusax-lances") {
      if (stage.stage < 4 || !state.awakeningActive) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Bayle.RequiresAwakening"));
        return;
      }
      if (state.lancesUsed) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Bayle.OncePerAwakening"));
        return;
      }
      await this.updateBayleState(target, { lancesUsed: true });
    }

    if (actionId === "draconic-closure") {
      if (!state.rageActive || !state.awakeningActive) {
        ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Bayle.RequiresRageAwakening"));
        return;
      }
      await this.updateBayleState(target, {
        ardor: 0,
        closureUsed: true,
        awakeningActive: stage.stage >= 3,
        lightningChargesUsed: stage.stage >= 3 ? state.lightningChargesUsed : 0,
      });
    }

    if (action.formula) {
      const roll = new Roll(action.formula);
      await roll.evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: target }),
        flavor: [
          `<strong>${action.name}</strong>`,
          action.text,
          actionId === "placidusax-lances" ? "Aplique esta rolagem para cada lança que acertar." : "",
        ].filter(Boolean).join("<br>"),
      });
      return;
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-bayle-chat-card">
          <h3>${action.name}</h3>
          <p><strong>${action.tag}</strong> · ${action.requirement}</p>
          <p>${action.text}</p>
          ${actionId === "draconic-closure" ? `<p><strong>Colapso:</strong> ${stage.collapse.map(item => escapeHtml(item)).join(" · ")}</p>` : ""}
        </div>`,
    });
  }

  static async rollGyroControl(actor?: Actor | null, mode: GyroExecutionMode = "forced"): Promise<Roll | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getGyroState(target);
    const modeGate = this.canUseGyroExecutionMode(target, mode, state);
    if (!modeGate.available) {
      ui.notifications?.warn(modeGate.reason);
      return null;
    }
    const dc = this.getGyroControlDC(target, mode, state);
    if (dc === null) {
      await this.showGyroStatus(target, game.i18n!.localize("ETHERNUM.Unique.Gyro.StableNoCheck"));
      return null;
    }

    const attrMod = getPF2EAbilityMod(target, state.mainAttribute);
    const rankBonus = PROFICIENCY_RANK_BONUS[state.proficiencyRank];
    const actorLevel = getActorLevel(target);
    const bonus = actorLevel + rankBonus + attrMod;
    const roll = new Roll(`1d20 + ${bonus}`);
    await roll.evaluate();
    const success = (roll.total ?? 0) >= dc;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      flavor: [
        `<strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.ControlCheck")}</strong>`,
        `${game.i18n!.localize(`ETHERNUM.Unique.Gyro.Execution.${mode}`)} - CD ${dc}`,
        `${game.i18n!.localize("ETHERNUM.Unique.Gyro.Level")}: ${actorLevel} + ${game.i18n!.localize("ETHERNUM.Unique.Gyro.Proficiency")}: ${rankBonus} + ${state.mainAttribute.toUpperCase()}: ${attrMod}`,
        success ? game.i18n!.localize("ETHERNUM.Unique.Gyro.ControlSuccess") : game.i18n!.localize("ETHERNUM.Unique.Gyro.ControlFailure"),
      ].join("<br>"),
    });
    if (!success) await this.rollGyroDeviation(target);
    return roll;
  }

  static async rollGyroDeviation(actor?: Actor | null): Promise<Roll | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const roll = new Roll("1d6");
    await roll.evaluate();
    const result = GYRO_DEVIATIONS.find(item => item.roll === roll.total);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      flavor: [
        `<strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.Deviation")}</strong>`,
        result ? `<b>${result.name}</b>` : "",
        result?.text ?? "",
        result ? `<em>${result.combatEffect}</em>` : "",
      ].join("<br>"),
    });
    if (result) {
      void this.playGyroSpinAnimation(target, "deviation");
      const combatId = game.combat?.id;
      if (combatId) {
        await this.updateGyroState(target, {
          activeDeviation: `${result.name}: ${result.combatEffect}`,
          activeDeviationCombatId: combatId,
        });
      } else {
        ui.notifications?.info("Desvio rolado fora de combate: efeito registrado no chat, sem persistir na ficha.");
      }
    }
    if (roll.total === 2) await this.setGyroSP(target, 0);
    return roll;
  }

  static async clearGyroDeviation(actor?: Actor | null): Promise<void> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return;
    }
    const state = this.getState(target);
    const gyroState = this.getGyroState(target);
    delete gyroState.activeDeviation;
    delete gyroState.activeDeviationCombatId;
    state.activeProfile = GYRO_PROFILE_ID;
    state.profiles[GYRO_PROFILE_ID] = gyroState;
    await this.setStateQuiet(target, state);
    ui.notifications?.info(game.i18n!.localize("ETHERNUM.Unique.Gyro.DeviationCleared"));
  }

  static async playGyroSpinAnimation(actor?: Actor | null, variant: "technique" | "deviation" | "status" = "technique"): Promise<boolean> {
    const target = actor ?? getControlledActor();
    if (!target || !isSequencerActive()) return false;
    const token = getActorToken(target);
    if (!token) return false;

    const SequenceCtor = (globalThis as { Sequence?: new (options?: Record<string, unknown>) => unknown }).Sequence;
    if (!SequenceCtor) return false;

    try {
      const sequence = new SequenceCtor({ moduleName: ETHERNUM.MODULE_NAME, softFail: true }) as {
        effect: () => Record<string, unknown>;
        play: () => Promise<unknown> | unknown;
      };
      let effect = sequence.effect() as Record<string, unknown>;
      const chain = (method: string, ...args: unknown[]) => {
        const fn = effect[method];
        if (typeof fn === "function") {
          const next = (fn as (...callArgs: unknown[]) => unknown).apply(effect, args);
          if (next && typeof next === "object") effect = next as Record<string, unknown>;
        }
      };

      chain("file", getGyroAnimationFile(variant));
      chain("atLocation", token);
      chain("fadeIn", 150);
      chain("fadeOut", 450);
      chain("duration", variant === "deviation" ? 1600 : 1100);
      chain("opacity", variant === "deviation" ? 0.82 : 0.72);
      chain("scaleToObject", variant === "status" ? 1.45 : 1.2);
      chain("rotateIn", 180, 700);
      chain("scaleIn", 0.45, 250);
      chain("scaleOut", 0.15, 450);
      chain("belowTokens");

      await sequence.play();
      return true;
    } catch (error) {
      console.warn("Ethernum RPG Module | Sequencer animation failed", error);
      return false;
    }
  }

  static async resolveGyroTechniqueOutcome(actor: Actor, technique: GyroTechnique, state: GyroSpinState): Promise<void> {
    if (technique.id === "proportion-mark") {
      const choice = await chooseTargetChoice("Marca da Proporção", actor, false);
      if (!choice) return;
      await this.updateGyroState(actor, { proportionMarkTargetId: choice.actorKey });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="ethernum-unique-chat-card">
            <h3>Marca da Proporção</h3>
            <p><strong>Alvo marcado:</strong> ${escapeHtml(choice.name)}</p>
            <p>O próximo acerto de Steel Ball contra este alvo pode receber +2 e gera +1 SP adicional.</p>
          </div>`,
      });
      void this.playGyroSpinAnimation(choice.actor, "status");
      return;
    }

    if (technique.id === "medicinal-spin") {
      const choice = await chooseTargetChoice("Rotação Medicinal", actor, true);
      if (!choice) return;
      const formula = technique.roll?.formula(actor, state) ?? gyroMedicinalHealingFormula(actor, state);
      const roll = new Roll(formula);
      await roll.evaluate();
      const total = Number(roll.total ?? 0);
      const applied = await applyActorHpDelta(choice.actor, total).catch(error => {
        console.warn("Ethernum RPG Module | Could not apply Gyro healing", error);
        return false;
      });
      void this.playGyroSpinAnimation(choice.actor, "status");
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: [
          "<strong>Rotação Medicinal</strong>",
          `Alvo: ${escapeHtml(choice.name)}`,
          applied ? `Cura aplicada: ${total} HP` : "Sem permissão para aplicar HP automaticamente; use o total da rolagem.",
          technique.roll?.note ?? "",
        ].filter(Boolean).join("<br>"),
      });
      return;
    }

    if (technique.id === "spiral-ricochet") {
      const choice = await chooseTargetChoice("Ricochete Espiral - alvo secundário", actor, false);
      if (!choice || !technique.roll) return;
      const formula = technique.roll.formula(actor, state);
      const roll = new Roll(formula);
      await roll.evaluate();
      const total = Number(roll.total ?? 0);
      const applied = await applyActorHpDelta(choice.actor, -total).catch(error => {
        console.warn("Ethernum RPG Module | Could not apply Gyro ricochet damage", error);
        return false;
      });
      void this.playGyroSpinAnimation(choice.actor, "technique");
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: [
          "<strong>Ricochete Espiral - impacto secundário</strong>",
          `Alvo secundário: ${escapeHtml(choice.name)}`,
          `Tipo: ${technique.roll.damageType ?? "bludgeoning"}`,
          applied ? `Dano aplicado diretamente: ${total}` : "Sem permissão para aplicar HP automaticamente; use o total da rolagem.",
          technique.roll.note ?? "",
        ].filter(Boolean).join("<br>"),
      });
      return;
    }

    if (technique.id === "rotating-jaw" || technique.id === "paralyzing-frequency") {
      const choice = await chooseTargetChoice(technique.name, actor, false);
      const dc = this.getGyroControlDC(actor, technique.defaultMode, state) ?? this.getGyroControlDC(actor, "forced", state);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="ethernum-unique-chat-card">
            <h3>${escapeHtml(technique.name)}</h3>
            ${choice ? `<p><strong>Alvo:</strong> ${escapeHtml(choice.name)}</p>` : ""}
            <p><strong>Salvamento:</strong> Fortitude contra CD ${dc ?? "do mestre"}</p>
            <ul>
              ${(technique.technical ?? technique.options).map(note => `<li>${escapeHtml(note)}</li>`).join("")}
            </ul>
          </div>`,
      });
      if (choice) void this.playGyroSpinAnimation(choice.actor, "status");
      return;
    }

    if (technique.roll) {
      const formula = technique.roll.formula(actor, state);
      const roll = new Roll(formula);
      await roll.evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: [
          `<strong>${escapeHtml(technique.roll.label)}</strong>`,
          technique.roll.damageType ? `${game.i18n!.localize("ETHERNUM.Unique.Gyro.DamageType")}: ${escapeHtml(technique.roll.damageType)}` : "",
          technique.roll.note ?? "",
        ].filter(Boolean).join("<br>"),
      });
    }
  }

  static async useGyroTechnique(
    actor?: Actor | null,
    techniqueId = "steel-ball",
    mode: GyroExecutionMode = "stable"
  ): Promise<void> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return;
    }
    const technique = GYRO_TECHNIQUES.find(item => item.id === techniqueId);
    if (!technique) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Errors.TechniqueNotFound"));
      return;
    }
    const state = this.getGyroState(target);
    const status = this.getGyroTechniqueStatus(target, technique, state, game.user?.isGM ?? false);
    if (!status.unlocked) {
      ui.notifications?.warn(status.lockReasons.join(" | "));
      return;
    }
    const ballBreakerTurnKey = technique.id === "ball-breaker-requiem" ? getCombatTurnKey() : null;
    if (ballBreakerTurnKey && state.lastBallBreakerTurnKey === ballBreakerTurnKey) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Gyro.BallBreakerAlreadyUsed"));
      return;
    }
    const modeGate = this.canUseGyroExecutionMode(target, mode, state);
    if (!modeGate.available) {
      ui.notifications?.warn(modeGate.reason);
      return;
    }
    if (state.currentSP < technique.cost) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Gyro.NotEnoughSP"));
      return;
    }
    await this.updateGyroState(target, { currentSP: state.currentSP - technique.cost });
    if (mode !== "stable") {
      const dc = this.getGyroControlDC(target, mode, state);
      const roll = await this.rollGyroControl(target, mode);
      if (dc !== null && roll && (roll.total ?? 0) < dc) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: target }),
          content: `
            <div class="ethernum-unique-chat-card">
              <h3>${game.i18n!.localize("ETHERNUM.Unique.Gyro.TechniqueLost")}</h3>
              <p>${technique.name}</p>
              <p>${game.i18n!.localize("ETHERNUM.Unique.Gyro.TechniqueLostHint")}</p>
            </div>`,
        });
        return;
      }
    }
    if (ballBreakerTurnKey) await this.updateGyroState(target, { lastBallBreakerTurnKey: ballBreakerTurnKey });
    const nextState = this.getGyroState(target);
    const maxSP = this.calculateGyroMaxSP(target, nextState);
    const rank = this.getGyroRank(nextState.currentSP, nextState);
    void this.playGyroSpinAnimation(target, "technique");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card">
          <h3>${technique.name}</h3>
          <p><strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.ExecutionMode")}:</strong> ${game.i18n!.localize(`ETHERNUM.Unique.Gyro.Execution.${mode}`)}</p>
          <p><strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.SPCost")}:</strong> ${technique.cost}</p>
          <p><strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.SpinPoints")}:</strong> ${nextState.currentSP} / ${maxSP}</p>
          <p><strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.RotationRank")}:</strong> ${rank.name}</p>
          <p>${technique.description}</p>
        </div>`,
    });
    await this.resolveGyroTechniqueOutcome(target, technique, nextState);
  }

  static async showGyroTechniques(actor?: Actor | null): Promise<void> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return;
    }
    const isGM = game.user?.isGM ?? false;
    const data = this.buildSheetData(target, isGM) as {
      gyro: {
        techniques: GyroTechniqueSheetData[];
      };
    };
    const techniques = isGM
      ? data.gyro.techniques
      : data.gyro.techniques.filter(technique => technique.unlocked);
    if (techniques.length === 0) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Gyro.NoUnlockedTechniques"));
      return;
    }

    const content = `
      <div class="ethernum-gyro-tech-dialog">
        ${techniques.map(technique => `
          <section class="ethernum-gyro-tech-dialog-card ${technique.usable ? "" : "disabled"} ${technique.unlocked ? "" : "locked"}">
            <header>
              <span>${technique.cost} SP</span>
              <div>
                <strong>${technique.name}</strong>
                <small>${technique.source} - ${technique.actions}</small>
              </div>
            </header>
            <p>${technique.description}</p>
            ${!technique.unlocked && technique.lockReason ? `<p class="ethernum-gyro-dialog-lock"><i class="fas fa-lock"></i> ${technique.lockReason}</p>` : ""}
            <details class="ethernum-animated-details ethernum-gyro-details">
              <summary>${game.i18n!.localize("ETHERNUM.Unique.Gyro.Details")}</summary>
              <div class="ethernum-gyro-details-body">
                <strong>Descrição em mesa</strong>
                <p>${escapeHtml(technique.description)}</p>
                <ul>
                  ${technique.systemNotes.map(note => `<li>${note}</li>`).join("")}
                </ul>
              </div>
            </details>
            <footer>
              <select class="ethernum-gyro-macro-mode" data-technique-id="${technique.id}">
                ${technique.executionModes.map(mode => `
                  <option value="${mode.id}" ${mode.selected ? "selected" : ""} ${mode.available ? "" : "disabled"}>
                    ${mode.label} - ${mode.dcLabel}
                  </option>
                `).join("")}
              </select>
              <button type="button" class="ethernum-button-small ethernum-gyro-macro-use" data-technique-id="${technique.id}" ${technique.usable ? "" : "disabled"}>
                <i class="fas fa-dice-d20"></i> ${game.i18n!.localize("ETHERNUM.Buttons.Activate")}
              </button>
            </footer>
          </section>
        `).join("")}
      </div>
    `;

    new Dialog({
      title: game.i18n!.localize("ETHERNUM.Unique.Gyro.Techniques"),
      content,
      buttons: { close: { label: game.i18n!.localize("ETHERNUM.Buttons.Close") } },
      render: (html: JQuery) => {
        html.find('.ethernum-gyro-macro-use').on('click', async (ev) => {
          const techniqueId = $(ev.currentTarget).data('technique-id') as string;
          const mode = html.find(`.ethernum-gyro-macro-mode[data-technique-id="${techniqueId}"]`).val() as GyroExecutionMode;
          await this.useGyroTechnique(target, techniqueId, mode);
        });
      },
    }).render(true);
  }

  static buildSheetData(actor: Actor, isGM: boolean): Record<string, unknown> {
    const state = this.getState(actor);
    const gyroState = this.getGyroState(actor);
    const bayleState = this.getBayleState(actor);
    const pippingState = this.getPippingState(actor);
    const actorLevel = getActorLevel(actor);
    const maxSP = this.calculateGyroMaxSP(actor, gyroState);
    const rank = this.getGyroRank(gyroState.currentSP, gyroState);
    const spinPercent = maxSP > 0 ? Math.round((gyroState.currentSP / maxSP) * 100) : 0;
    const executionModes = this.buildGyroExecutionModes(actor, gyroState, "forced");
    const bayleStage = getBayleStageData(bayleState.stage);
    const bayleLightningRemaining = Math.max(0, bayleStage.lightningCharges - bayleState.lightningChargesUsed);
    const gyroTechniques = GYRO_TECHNIQUES.map((technique): GyroTechniqueSheetData => {
      const status = this.getGyroTechniqueStatus(actor, technique, gyroState, isGM);
      const modes = this.buildGyroExecutionModes(actor, gyroState, technique.defaultMode);
      const selectedMode = modes.find(mode => mode.selected);
      const canAfford = gyroState.currentSP >= technique.cost;
      const usable = status.unlocked && canAfford && (selectedMode?.available ?? false);
      const dc = this.getGyroControlDC(actor, technique.defaultMode, gyroState);
      const rollFormula = technique.roll?.formula(actor, gyroState);
      return {
        ...technique,
        category: technique.category ?? "technique",
        canAfford,
        unlocked: status.unlocked,
        usable,
        lockReason: status.lockReasons.join(" | "),
        rollLabel: technique.roll?.label,
        rollFormula,
        rollNote: technique.roll?.note,
        systemNotes: [
          `${game.i18n!.localize("ETHERNUM.Unique.Gyro.Actions")}: ${technique.actions}`,
          `${game.i18n!.localize("ETHERNUM.Unique.Gyro.SPCost")}: ${technique.cost}`,
          ...(technique.roll ? [`${game.i18n!.localize("ETHERNUM.Unique.Gyro.Roll")}: ${technique.roll.label} (${rollFormula})`] : []),
          ...(technique.frequency ? [`${game.i18n!.localize("ETHERNUM.Unique.Gyro.Frequency")}: ${technique.frequency}`] : []),
          ...(technique.attachedToStrike ? [game.i18n!.localize("ETHERNUM.Unique.Gyro.RequiresSteelBallStrike")] : []),
          `${game.i18n!.localize("ETHERNUM.Unique.Gyro.ExecutionMode")}: ${game.i18n!.localize(`ETHERNUM.Unique.Gyro.Execution.${technique.defaultMode}`)}`,
          dc === null
            ? game.i18n!.localize("ETHERNUM.Unique.Gyro.StableNoCheck")
            : `${game.i18n!.localize("ETHERNUM.Unique.Gyro.ControlCheck")}: CD ${dc}`,
          ...(technique.technical ?? []),
          ...(technique.details ?? technique.options),
        ],
        executionModes: modes,
      };
    });

    return {
      activeProfile: state.activeProfile,
      isGM,
      companyLogoAsset: ETHERNUM_COMPANY_LOGO_ASSET,
      profiles: [
        { id: "", label: game.i18n!.localize("ETHERNUM.Unique.Profile.None") },
        { id: GYRO_PROFILE_ID, label: "Gyro Zeppeli - Via da Rotação Sagrada" },
        { id: BAYLE_PROFILE_ID, label: "Bayle, o Horror - Corpo Dracônico" },
        { id: PIPPING_PROFILE_ID, label: "Pipping Baldwin Black - Expressão da Noite" },
        { id: "kaitake", label: "Kaitake - Mecânica em preparação" },
        { id: "cinerio", label: "Cinério - Mecânica em preparação" },
        { id: "ailan", label: "Ailan - Mecânica em preparação" },
      ],
      placeholderProfile: PLACEHOLDER_PROFILE_IDS.includes(state.activeProfile as typeof PLACEHOLDER_PROFILE_IDS[number])
        ? {
          id: state.activeProfile,
          label: state.activeProfile === "kaitake"
            ? "Kaitake"
            : state.activeProfile === "cinerio"
              ? "Cinério"
              : "Ailan",
        }
        : null,
      pipping: {
        state: pippingState,
        pulsePercent: Math.round((pippingState.pulse / 6) * 100),
        shadowCountExpected: 2 + pippingState.tier,
        abilities: PIPPING_ABILITIES,
        macroSlots: [
          "await game.ethernum.macros.setUniqueProfile(\"pipping-night\");",
          "await game.ethernum.macros.showPippingStatus();",
          "await game.ethernum.macros.adjustPippingPulse(1);",
          "await game.ethernum.macros.adjustPippingPulse(-1);",
        ],
      },
      bayle: {
        state: bayleState,
        stage: bayleStage,
        actorLevel,
        ardorPercent: Math.round((bayleState.ardor / 3) * 100),
        lightningRemaining: bayleLightningRemaining,
        stages: BAYLE_STAGES.map(item => ({
          ...item,
          active: item.stage === bayleStage.stage,
          available: actorLevel >= item.minLevel,
        })),
        actions: bayleStage.actions.map(action => {
          const used = (action.id === "placidusax-lightning" && bayleLightningRemaining <= 0)
            || (action.id === "bayle-breath" && bayleState.breathUsed)
            || (action.id === "bayle-roar" && bayleState.roarUsed)
            || (action.id === "placidusax-lances" && bayleState.lancesUsed)
            || (action.id === "draconic-closure" && bayleState.closureUsed && bayleStage.stage < 3);
          const blocked = (action.id === "placidusax-lightning" && !bayleState.awakeningActive)
            || (action.id === "placidusax-lances" && !bayleState.awakeningActive)
            || (action.id === "bayle-breath" && !bayleState.rageActive)
            || (action.id === "bayle-roar" && !bayleState.rageActive)
            || (action.id === "draconic-closure" && (!bayleState.rageActive || !bayleState.awakeningActive));
          return {
            ...action,
            used,
            usable: !used && !blocked,
            blocked,
          };
        }),
        macroSlots: [
          "await game.ethernum.macros.setUniqueProfile(\"bayle-dragon\");",
          "await game.ethernum.macros.showBayleStatus();",
          "await game.ethernum.macros.adjustBayleArdor(1);",
          "await game.ethernum.macros.toggleBayleRage();",
          "await game.ethernum.macros.toggleBayleAwakening();",
          "await game.ethernum.macros.useBayleAction(\"draconic-closure\");",
          "// Seus macros atuais de Rage/Encerramento/Armamento podem chamar estas funções para manter a aba sincronizada.",
        ],
      },
      gyro: {
        state: gyroState,
        maxSP,
        rank,
        spinPercent,
        actorLevel,
        proficiencyRankBonus: PROFICIENCY_RANK_BONUS[gyroState.proficiencyRank],
        controlBonus: this.getGyroControlBonus(actor, gyroState),
        mainAttributeMod: getPF2EAbilityMod(actor, gyroState.mainAttribute),
        spinballAsset: GYRO_SPINBALL_ASSET,
        hasCorpseIkon: gyroState.unlockedIkons.length > 0,
        executionModes,
        techniques: gyroTechniques,
        techniqueGroups: GYRO_TECHNIQUE_GROUP_DEFS.map(group => ({
          ...group,
          techniques: gyroTechniques.filter(technique => (technique.category ?? "technique") === group.category),
        })),
        ikons: GYRO_IKONS.map(ikon => ({
          ...ikon,
          unlocked: gyroState.unlockedIkons.includes(ikon.id),
          tierLabel: game.i18n!.localize(`ETHERNUM.Unique.Gyro.IkonTier.${ikon.tier}`),
        })),
        ranks: GYRO_RANKS.map(item => ({
          ...item,
          active: item.id === rank.id,
        })),
        deviations: GYRO_DEVIATIONS,
      },
    };
  }
}
