import { ETHERNUM, type CampaignCoreId } from '../config.js';

export type UniqueMechanicProfileId = ""
  | "gyro-spin"
  | "bayle-dragon"
  | "pipping-night"
  | "kaitake"
  | "cinerio"
  | "ailan"
  | "arkius-jacker"
  | "atlas-sidarta"
  | "charles"
  | "morgana"
  | "yu-jiu-ji-tae"
  | "unluck";
export type GyroMainAttribute = "dex" | "wis";
export type GyroProficiencyRank = "trained" | "expert" | "master" | "legendary";
export type GyroExecutionMode = "stable" | "forced" | "corpse" | "perfect";

export const GYRO_PROFILE_ID: UniqueMechanicProfileId = "gyro-spin";
export const BAYLE_PROFILE_ID: UniqueMechanicProfileId = "bayle-dragon";
export const PIPPING_PROFILE_ID: UniqueMechanicProfileId = "pipping-night";
export const ARKIUS_JACKER_PROFILE_ID: UniqueMechanicProfileId = "arkius-jacker";
export const YU_JIU_JI_TAE_PROFILE_ID: UniqueMechanicProfileId = "yu-jiu-ji-tae";
export const ETHERNUM_COMPANY_CORE_ID: CampaignCoreId = "ethernum-company";
export const CONCORDIA_CORE_ID: CampaignCoreId = "concordia";
export const ETHERNUM_PLACEHOLDER_PROFILE_IDS = ["kaitake", "cinerio", "ailan"] as const;
export const CONCORDIA_PLACEHOLDER_PROFILE_IDS = ["atlas-sidarta", "charles", "morgana", "unluck"] as const;
export const PLACEHOLDER_PROFILE_IDS = [...ETHERNUM_PLACEHOLDER_PROFILE_IDS, ...CONCORDIA_PLACEHOLDER_PROFILE_IDS] as const;
export const GYRO_SPINBALL_ASSET = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/spinball.png`;
export const ETHERNUM_COMPANY_LOGO_ASSET = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/company-logo.png`;
export const ARKIUS_FRAME_WIDE_ASSET = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/concordia/arkius-frame-16-9.png`;
export const ARKIUS_FRAME_TALL_ASSET = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/concordia/arkius-frame-9-16.png`;
export const ARKIUS_FRAME_BALANCED_ASSET = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/concordia/arkius-frame-4-3.png`;
export const ARKIUS_ICON_ASSET = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/concordia/arkius-icon.png`;
const GYRO_PROPORTION_MARK_EFFECT_SLUG = "gyro-marca-da-proporcao-proximo-strike";
const ARKIUS_NUCLEO_EFFECT_SLUG = "arkius-nucleo-em-brasas";
const ARKIUS_BRASAS_CLUMSY_EFFECT_SLUG = "arkius-sintonia-brasas-desajeitado";
const ARKIUS_END_CLUMSY_EFFECT_SLUG = "arkius-nucleo-encerrado-desajeitado";
const ARKIUS_DRAINED_EFFECT_SLUG = "arkius-exaurir-o-sol-drenado";
const ARKIUS_FIRE_METAL_LOCK_EFFECT_SLUG = "arkius-impulsos-fogo-metal-bloqueados";
const ARKIUS_KINETIC_AURA_EFFECT_SLUG = "arkius-aura-cinetica";
const ARKIUS_THERMAL_NIMBUS_EFFECT_SLUG = "arkius-thermal-nimbus";
const ARKIUS_NUCLEO_MAX_ROUNDS = 10;
const ARKIUS_KINETIC_AURA_DISTANCE = 10;
const YU_RAGE_EFFECT_SLUG = "yu-rage-in-the-flesh";
const YU_COLLAPSE_DRAINED_EFFECT_SLUG = "yu-colapso-neural-drenado";
const YU_COLLAPSE_ENFEEBLED_EFFECT_SLUG = "yu-colapso-neural-enfeebled";
const YU_FLURRY_FEAR_EFFECT_SLUG = "yu-sobrecarga-de-medo";
const YU_RAGE_MAX_ROUNDS = 10;

export interface UniqueMechanicsState {
  activeCore: CampaignCoreId;
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

export type ArkiusAttunement = "none" | "fluxo" | "brasas";
export type ArkiusSolarAreaId = "emanation" | "cone" | "line";
export type ArkiusConcordiaAspect = "chains" | "ruby" | "convergence";

export interface ArkiusJackerState {
  nucleoEmBrasas: {
    active: boolean;
    usesSpent: number;
    maxUses: number;
    startedRound?: number;
    startedTurn?: number;
    combatId?: string;
    remainingRounds: number;
    attunement: ArkiusAttunement;
    pendingFluxoReduction: boolean;
    pendingBrasasDamage: boolean;
    selectedSolarArea: ArkiusSolarAreaId;
    fluxoUsedTurnKey?: string;
    brasasUsedTurnKey?: string;
    lastCombatTurnKey?: string;
    firstFireMetalProcUsed: boolean;
    endedPenaltyActive: boolean;
    fireMetalImpulsesLocked: boolean;
    exaurirUsed: boolean;
  };
  kineticAura: {
    active: boolean;
    radius: number;
    templateId?: string;
  };
  thermalNimbus: {
    active: boolean;
    fireAuraJunction: boolean;
    appliedTurnKeys: Record<string, string>;
  };
  concordiaAspect: ArkiusConcordiaAspect;
  bracoEvolutivo: {
    chargesSpent: number;
    maxCharges: number;
    resistanceFormula: string;
    level13Unlocked: boolean;
    level17Unlocked: boolean;
  };
}

export interface YuRageState {
  active: boolean;
  usesSpent: number;
  maxUses: number;
  remainingRounds: number;
  combatId?: string;
  lastCombatTurnKey?: string;
  emergencyTriggered: boolean;
  collapseDrainedActive: boolean;
  collapseEnfeebledActive: boolean;
}

type PartialArkiusJackerState = {
  nucleoEmBrasas?: Partial<ArkiusJackerState["nucleoEmBrasas"]>;
  kineticAura?: Partial<ArkiusJackerState["kineticAura"]>;
  thermalNimbus?: Partial<ArkiusJackerState["thermalNimbus"]>;
  concordiaAspect?: ArkiusConcordiaAspect;
  bracoEvolutivo?: Partial<ArkiusJackerState["bracoEvolutivo"]>;
};

type PartialYuRageState = Partial<YuRageState>;

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
  activeCore: ETHERNUM_COMPANY_CORE_ID,
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

const DEFAULT_ARKIUS_STATE: ArkiusJackerState = {
  nucleoEmBrasas: {
    active: false,
    usesSpent: 0,
    maxUses: 2,
    remainingRounds: 0,
    attunement: "none",
    pendingFluxoReduction: false,
    pendingBrasasDamage: false,
    selectedSolarArea: "emanation",
    firstFireMetalProcUsed: false,
    endedPenaltyActive: false,
    fireMetalImpulsesLocked: false,
    exaurirUsed: false,
  },
  kineticAura: {
    active: false,
    radius: ARKIUS_KINETIC_AURA_DISTANCE,
  },
  thermalNimbus: {
    active: false,
    fireAuraJunction: false,
    appliedTurnKeys: {},
  },
  concordiaAspect: "chains",
  bracoEvolutivo: {
    chargesSpent: 0,
    maxCharges: 2,
    resistanceFormula: "2d6 + 5",
    level13Unlocked: false,
    level17Unlocked: false,
  },
};

const DEFAULT_YU_STATE: YuRageState = {
  active: false,
  usesSpent: 0,
  maxUses: 1,
  remainingRounds: 0,
  emergencyTriggered: false,
  collapseDrainedActive: false,
  collapseEnfeebledActive: false,
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

function asStringRecord(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
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

function getActorHpSnapshot(actor: Actor): { value: number; max: number } | null {
  const attributes = asRecord(asRecord(actor.system).attributes);
  const hp = asRecord(attributes.hp);
  const value = Number(hp.value);
  const max = Number(hp.max);
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return null;
  return { value, max };
}

async function tryIncreaseActorCondition(actor: Actor, condition: string, value: number): Promise<boolean> {
  const pf2eActor = actor as Actor & {
    increaseCondition?: (condition: string, options?: Record<string, unknown>) => Promise<unknown>;
  };
  if (typeof pf2eActor.increaseCondition !== "function") return false;
  try {
    await pf2eActor.increaseCondition(condition, { value });
    return true;
  } catch (error) {
    console.warn(`Ethernum RPG Module | Could not increase condition ${condition}`, error);
    return false;
  }
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

function getArkiusAnimationFiles(area: ArkiusSolarArea): { charge: string; release: string } | null {
  const jb2aModuleId = ["jb2a_patreon", "JB2A_DnD5e", "jb2a_free"].find(moduleId => game.modules?.get(moduleId)?.active);
  if (!jb2aModuleId) return null;
  const releaseByArea: Record<ArkiusSolarAreaId, string> = {
    emanation: "Library/Generic/Explosion/Explosion_05_Regular_Orange_400x400.webm",
    cone: "Library/Generic/Fire/FireCone_01_Regular_Orange_30ft.webm",
    line: "Library/Generic/Fire/FireBolt_01_Regular_Orange_30ft.webm",
  };
  return {
    charge: `modules/${jb2aModuleId}/Library/Generic/Particles/ParticlesOutward01_01_Regular_Orange_400x400.webm`,
    release: `modules/${jb2aModuleId}/${releaseByArea[area.id]}`,
  };
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

function getCombatTurnKeyFor(combat: Combat): string {
  const combatData = combat as Combat & { combatant?: { id?: string }; turn?: number; current?: { combatantId?: string } };
  const combatantId = combatData.combatant?.id ?? combatData.current?.combatantId ?? "no-combatant";
  return `${combat.id ?? "combat"}:${combat.round ?? 0}:${combatData.turn ?? 0}:${combatantId}`;
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

export function normalizeCampaignCore(value: unknown): CampaignCoreId {
  return value === CONCORDIA_CORE_ID ? CONCORDIA_CORE_ID : ETHERNUM_COMPANY_CORE_ID;
}

function getProfileCore(profileId: UniqueMechanicProfileId | string): CampaignCoreId | null {
  if (profileId === "") return null;
  if (
    profileId === GYRO_PROFILE_ID
    || profileId === BAYLE_PROFILE_ID
    || profileId === PIPPING_PROFILE_ID
    || ETHERNUM_PLACEHOLDER_PROFILE_IDS.includes(profileId as typeof ETHERNUM_PLACEHOLDER_PROFILE_IDS[number])
  ) return ETHERNUM_COMPANY_CORE_ID;
  if (
    profileId === ARKIUS_JACKER_PROFILE_ID
    || profileId === YU_JIU_JI_TAE_PROFILE_ID
    || CONCORDIA_PLACEHOLDER_PROFILE_IDS.includes(profileId as typeof CONCORDIA_PLACEHOLDER_PROFILE_IDS[number])
  ) return CONCORDIA_CORE_ID;
  return null;
}

function profileBelongsToCore(profileId: UniqueMechanicProfileId | string, coreId: CampaignCoreId): boolean {
  if (profileId === "") return true;
  return getProfileCore(profileId) === coreId;
}

function isKnownProfile(profileId: unknown): profileId is UniqueMechanicProfileId {
  return typeof profileId === "string" && (
    profileId === ""
    || profileId === GYRO_PROFILE_ID
    || profileId === BAYLE_PROFILE_ID
    || profileId === PIPPING_PROFILE_ID
    || profileId === ARKIUS_JACKER_PROFILE_ID
    || profileId === YU_JIU_JI_TAE_PROFILE_ID
    || PLACEHOLDER_PROFILE_IDS.includes(profileId as typeof PLACEHOLDER_PROFILE_IDS[number])
  );
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

function normalizeArkiusAttunement(value: unknown): ArkiusAttunement {
  return value === "fluxo" || value === "brasas" ? value : "none";
}

function normalizeArkiusSolarAreaId(value: unknown): ArkiusSolarAreaId {
  return value === "cone" || value === "line" || value === "emanation" ? value : "emanation";
}

function normalizeArkiusConcordiaAspect(value: unknown): ArkiusConcordiaAspect {
  return value === "ruby" || value === "convergence" || value === "chains" ? value : "chains";
}

function normalizeArkiusState(raw: unknown): ArkiusJackerState {
  const state = asRecord(raw);
  const nucleo = asRecord(state.nucleoEmBrasas);
  const kineticAura = asRecord(state.kineticAura);
  const thermalNimbus = asRecord(state.thermalNimbus);
  const braco = asRecord(state.bracoEvolutivo);
  const startedRound = Number(nucleo.startedRound);
  const startedTurn = Number(nucleo.startedTurn);
  const maxUses = clamp(Number(nucleo.maxUses ?? DEFAULT_ARKIUS_STATE.nucleoEmBrasas.maxUses) || 2, 1, 9);
  const maxCharges = clamp(Number(braco.maxCharges ?? DEFAULT_ARKIUS_STATE.bracoEvolutivo.maxCharges) || 2, 1, 9);
  return {
    nucleoEmBrasas: {
      ...DEFAULT_ARKIUS_STATE.nucleoEmBrasas,
      active: Boolean(nucleo.active),
      usesSpent: clamp(Number(nucleo.usesSpent ?? DEFAULT_ARKIUS_STATE.nucleoEmBrasas.usesSpent) || 0, 0, maxUses),
      maxUses,
      startedRound: Number.isFinite(startedRound) ? startedRound : undefined,
      startedTurn: Number.isFinite(startedTurn) ? startedTurn : undefined,
      combatId: typeof nucleo.combatId === "string" ? nucleo.combatId : undefined,
      remainingRounds: clamp(Number(nucleo.remainingRounds ?? 0) || 0, 0, ARKIUS_NUCLEO_MAX_ROUNDS),
      attunement: normalizeArkiusAttunement(nucleo.attunement),
      pendingFluxoReduction: Boolean(nucleo.pendingFluxoReduction),
      pendingBrasasDamage: Boolean(nucleo.pendingBrasasDamage),
      selectedSolarArea: normalizeArkiusSolarAreaId(nucleo.selectedSolarArea),
      fluxoUsedTurnKey: typeof nucleo.fluxoUsedTurnKey === "string" ? nucleo.fluxoUsedTurnKey : undefined,
      brasasUsedTurnKey: typeof nucleo.brasasUsedTurnKey === "string" ? nucleo.brasasUsedTurnKey : undefined,
      lastCombatTurnKey: typeof nucleo.lastCombatTurnKey === "string" ? nucleo.lastCombatTurnKey : undefined,
      firstFireMetalProcUsed: Boolean(nucleo.firstFireMetalProcUsed),
      endedPenaltyActive: Boolean(nucleo.endedPenaltyActive),
      fireMetalImpulsesLocked: Boolean(nucleo.fireMetalImpulsesLocked),
      exaurirUsed: Boolean(nucleo.exaurirUsed),
    },
    kineticAura: {
      ...DEFAULT_ARKIUS_STATE.kineticAura,
      active: Boolean(kineticAura.active),
      radius: clamp(Number(kineticAura.radius ?? ARKIUS_KINETIC_AURA_DISTANCE) || ARKIUS_KINETIC_AURA_DISTANCE, 5, 60),
      templateId: typeof kineticAura.templateId === "string" ? kineticAura.templateId : undefined,
    },
    thermalNimbus: {
      ...DEFAULT_ARKIUS_STATE.thermalNimbus,
      active: Boolean(thermalNimbus.active),
      fireAuraJunction: Boolean(thermalNimbus.fireAuraJunction),
      appliedTurnKeys: asStringRecord(thermalNimbus.appliedTurnKeys),
    },
    concordiaAspect: normalizeArkiusConcordiaAspect(state.concordiaAspect),
    bracoEvolutivo: {
      ...DEFAULT_ARKIUS_STATE.bracoEvolutivo,
      chargesSpent: clamp(Number(braco.chargesSpent ?? DEFAULT_ARKIUS_STATE.bracoEvolutivo.chargesSpent) || 0, 0, maxCharges),
      maxCharges,
      resistanceFormula: typeof braco.resistanceFormula === "string" ? braco.resistanceFormula : DEFAULT_ARKIUS_STATE.bracoEvolutivo.resistanceFormula,
      level13Unlocked: Boolean(braco.level13Unlocked),
      level17Unlocked: Boolean(braco.level17Unlocked),
    },
  };
}

function normalizeYuState(raw: unknown): YuRageState {
  const state = asRecord(raw);
  const maxUses = clamp(Number(state.maxUses ?? DEFAULT_YU_STATE.maxUses) || 1, 1, 3);
  return {
    ...DEFAULT_YU_STATE,
    active: Boolean(state.active),
    usesSpent: clamp(Number(state.usesSpent ?? DEFAULT_YU_STATE.usesSpent) || 0, 0, maxUses),
    maxUses,
    remainingRounds: clamp(Number(state.remainingRounds ?? DEFAULT_YU_STATE.remainingRounds) || 0, 0, YU_RAGE_MAX_ROUNDS),
    combatId: typeof state.combatId === "string" ? state.combatId : undefined,
    lastCombatTurnKey: typeof state.lastCombatTurnKey === "string" ? state.lastCombatTurnKey : undefined,
    emergencyTriggered: Boolean(state.emergencyTriggered),
    collapseDrainedActive: Boolean(state.collapseDrainedActive),
    collapseEnfeebledActive: Boolean(state.collapseEnfeebledActive),
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

export interface ArkiusSolarArea {
  id: ArkiusSolarAreaId;
  label: string;
  distance: number;
  templateType: "circle" | "cone" | "ray";
  angle?: number;
}

export interface ArkiusSolarData {
  formula: string;
  baseFormula: string;
  extraDice: number;
  extraDie: string;
  remainingRoundsUsed: number;
  dc: number;
  dcLabel: string;
  drainedValue: number;
  areas: ArkiusSolarArea[];
}

interface ArkiusTemplateResult {
  area: ArkiusSolarArea;
  templateDocument: unknown | null;
  origin: { x: number; y: number };
  direction: number;
  width: number;
}

interface ArkiusSolarTarget {
  id: string;
  name: string;
  actor: Actor;
  token: {
    id?: string;
    name?: string;
    actor?: Actor;
    center?: { x: number; y: number };
    document?: { disposition?: number; rotation?: number };
  };
  distance: number;
}

interface ArkiusSolarTargetResult {
  name: string;
  saveTotal: number;
  natural: number;
  degree: "Sucesso crítico" | "Sucesso" | "Falha" | "Falha crítica";
  baseDamage: number;
  weaknessDamage: number;
  weaknessLabels: string[];
  damageApplied: number;
  applied: boolean;
}

interface ArkiusFluxoConsumption {
  abilityName: string;
  originalActions: number;
  reducedActions: number;
  auto: boolean;
}

interface ArkiusBrasasConsumption {
  abilityName: string;
  baseFormula: string;
  correctedFormula: string;
  baseDie: string;
  boostedDie: string;
  damageType: string;
  auto: boolean;
}

interface ArkiusBrasasFormula {
  baseFormula: string;
  correctedFormula: string;
  baseDie: string;
  boostedDie: string;
  diceCount: number;
  totalDice: number;
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

function getActorClassOrKineticDC(actor: Actor): number {
  const system = asRecord(actor.system);
  const attributes = asRecord(system.attributes);
  const classDC = asRecord(attributes.classDC);
  const classDCValue = Number(classDC.value ?? classDC.dc);
  if (Number.isFinite(classDCValue) && classDCValue > 0) return classDCValue;

  const proficiencies = asRecord(system.proficiencies);
  const classDCs = asRecord(proficiencies.classDCs);
  const kineticist = asRecord(classDCs.kineticist ?? classDCs.kinetic ?? classDCs.class);
  const kineticDC = Number(kineticist.dc ?? kineticist.value);
  if (Number.isFinite(kineticDC) && kineticDC > 0) return kineticDC;

  const spellcasting = asRecord(system.spellcasting);
  const primal = asRecord(spellcasting.primal);
  const primalDC = Number(primal.dc ?? primal.value);
  if (Number.isFinite(primalDC) && primalDC > 0) return primalDC;

  return levelBasedDC(getActorLevel(actor));
}

function getArkiusSolarData(actor: Actor, state: ArkiusJackerState): ArkiusSolarData {
  const level = getActorLevel(actor);
  const remainingRoundsUsed = clamp(state.nucleoEmBrasas.remainingRounds || 1, 1, 6);
  const dc = getActorClassOrKineticDC(actor);
  if (level >= 17) {
    return {
      formula: `10d10 + ${remainingRoundsUsed}d10`,
      baseFormula: "10d10",
      extraDice: remainingRoundsUsed,
      extraDie: "d10",
      remainingRoundsUsed,
      dc,
      dcLabel: `CD ${dc}`,
      drainedValue: 3,
      areas: [
        { id: "emanation", label: "Emanação 30 ft", distance: 30, templateType: "circle" },
        { id: "cone", label: "Cone 30 ft", distance: 30, templateType: "cone", angle: 90 },
        { id: "line", label: "Linha 90 ft", distance: 90, templateType: "ray" },
      ],
    };
  }
  if (level >= 13) {
    return {
      formula: `8d10 + ${remainingRoundsUsed}d8`,
      baseFormula: "8d10",
      extraDice: remainingRoundsUsed,
      extraDie: "d8",
      remainingRoundsUsed,
      dc,
      dcLabel: `CD ${dc}`,
      drainedValue: 2,
      areas: [
        { id: "emanation", label: "Emanação 25 ft", distance: 25, templateType: "circle" },
        { id: "cone", label: "Cone 15 ft", distance: 15, templateType: "cone", angle: 90 },
        { id: "line", label: "Linha 60 ft", distance: 60, templateType: "ray" },
      ],
    };
  }
  return {
    formula: `6d10 + ${remainingRoundsUsed}d6`,
    baseFormula: "6d10",
    extraDice: remainingRoundsUsed,
    extraDie: "d6",
    remainingRoundsUsed,
    dc,
    dcLabel: `CD ${dc}`,
    drainedValue: 2,
    areas: [
      { id: "emanation", label: "Emanação 20 ft", distance: 20, templateType: "circle" },
      { id: "cone", label: "Cone 15 ft", distance: 15, templateType: "cone", angle: 90 },
      { id: "line", label: "Linha 30 ft", distance: 30, templateType: "ray" },
    ],
  };
}

function getActorUniqueEffects(actor: Actor, slugs: string[]): Item[] {
  const slugSet = new Set(slugs);
  return Array.from((actor.items ?? []) as Collection<Item>).filter(item => {
    const itemData = item as Item & { slug?: string; getFlag?: (scope: string, key: string) => unknown };
    const slug = itemData.slug ?? String(asRecord(item.system).slug ?? "");
    const flag = itemData.getFlag?.(ETHERNUM.MODULE_NAME, "uniqueEffect");
    return slugSet.has(slug) || slugSet.has(String(flag ?? ""));
  });
}

async function removeActorUniqueEffects(actor: Actor, slugs: string[]): Promise<void> {
  const effects = getActorUniqueEffects(actor, slugs);
  await Promise.all(effects.map(effect => effect.delete()));
}

async function createActorEffect(actor: Actor, data: Record<string, unknown>): Promise<void> {
  await (actor as Actor & {
    createEmbeddedDocuments: (embeddedName: "Item", data: Record<string, unknown>[], operation?: Record<string, unknown>) => Promise<Item[]>;
  }).createEmbeddedDocuments("Item", [data], { render: false });
}

function buildArkiusEffectData(
  name: string,
  slug: string,
  description: string,
  rules: Array<Record<string, unknown>> = [],
  duration: Record<string, unknown> = { value: -1, unit: "unlimited", sustained: false, expiry: null }
): Record<string, unknown> {
  return {
    name,
    type: "effect",
    img: ARKIUS_ICON_ASSET,
    system: {
      slug,
      description: { value: description },
      level: { value: 9 },
      duration,
      tokenIcon: { show: true },
      traits: { value: ["fire", "metal", "primal"] },
      rules,
    },
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        uniqueEffect: slug,
      },
    },
  };
}

async function applyArkiusNucleoEffect(actor: Actor): Promise<void> {
  await removeActorUniqueEffects(actor, [ARKIUS_NUCLEO_EFFECT_SLUG]);
  await createActorEffect(actor, buildArkiusEffectData(
    "Núcleo em Brasas",
    ARKIUS_NUCLEO_EFFECT_SLUG,
    [
      "<p><strong>Force a Marca:</strong> +1 status na CA enquanto a postura estiver ativa.</p>",
      "<p>Impulsos de Fogo recebem traço Metal e impulsos de Metal recebem traço Fogo.</p>",
      "<p>Perde imunidade/resistência a Gelo e Eletricidade e ganha fraqueza 5 a ambos enquanto a postura estiver ativa.</p>",
    ].join(""),
    [
      {
        key: "FlatModifier",
        selector: "ac",
        type: "status",
        value: 1,
        label: "Núcleo em Brasas",
      },
      {
        key: "Weakness",
        type: "cold",
        value: 5,
        label: "Núcleo em Brasas - Gelo",
      },
      {
        key: "Weakness",
        type: "electricity",
        value: 5,
        label: "Núcleo em Brasas - Eletricidade",
      },
    ],
    { value: ARKIUS_NUCLEO_MAX_ROUNDS, unit: "rounds", sustained: false, expiry: "turn-start" }
  ));
}

async function applyArkiusNarrativeEffect(actor: Actor, slug: string, name: string, description: string): Promise<void> {
  await removeActorUniqueEffects(actor, [slug]);
  await createActorEffect(actor, buildArkiusEffectData(name, slug, description, []));
}

async function applyArkiusKineticAuraEffect(actor: Actor, radius: number): Promise<void> {
  await removeActorUniqueEffects(actor, [ARKIUS_KINETIC_AURA_EFFECT_SLUG]);
  await createActorEffect(actor, buildArkiusEffectData(
    "Aura Cinética — Jacker",
    ARKIUS_KINETIC_AURA_EFFECT_SLUG,
    `<p>Aura cinética ativa em ${radius} pés. Use o template no canvas como área visual/status para efeitos cinéticos de Jacker.</p>`,
    [],
    { value: -1, unit: "unlimited", sustained: false, expiry: null }
  ));
}

function buildYuEffectData(
  name: string,
  slug: string,
  description: string,
  rules: Array<Record<string, unknown>> = [],
  duration: Record<string, unknown> = { value: -1, unit: "unlimited", sustained: false, expiry: null }
): Record<string, unknown> {
  return {
    name,
    type: "effect",
    img: "icons/svg/terror.svg",
    system: {
      slug,
      description: { value: description },
      level: { value: 1 },
      duration,
      tokenIcon: { show: true },
      traits: { value: ["mental", "emotion", "fear"] },
      rules,
    },
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        uniqueEffect: slug,
      },
    },
  };
}

async function applyYuRageEffect(actor: Actor): Promise<void> {
  await removeActorUniqueEffects(actor, [YU_RAGE_EFFECT_SLUG]);
  await createActorEffect(actor, buildYuEffectData(
    "Rage in the Flesh",
    YU_RAGE_EFFECT_SLUG,
    [
      "<p><strong>Imunidade narrativa:</strong> Yu fica imune a Frightened enquanto a postura estiver ativa.</p>",
      "<p><strong>Força Bruta:</strong> Strikes desarmados ganham +1 dado de dano, +1 dano e +1 status na CA.</p>",
      "<p><strong>Resistência Mental:</strong> resistência 5 a dano mental.</p>",
    ].join(""),
    [
      {
        key: "FlatModifier",
        selector: "ac",
        type: "status",
        value: 1,
        label: "Rage in the Flesh",
      },
      {
        key: "Resistance",
        type: "mental",
        value: 5,
        label: "Rage in the Flesh",
      },
    ],
    { value: YU_RAGE_MAX_ROUNDS, unit: "rounds", sustained: false, expiry: "turn-start" }
  ));
}

async function applyYuNarrativeEffect(
  actor: Actor,
  slug: string,
  name: string,
  description: string,
  duration: Record<string, unknown> = { value: -1, unit: "unlimited", sustained: false, expiry: null }
): Promise<void> {
  await removeActorUniqueEffects(actor, [slug]);
  await createActorEffect(actor, buildYuEffectData(name, slug, description, [], duration));
}

async function applyYuCollapseEffects(actor: Actor): Promise<void> {
  await removeActorUniqueEffects(actor, [YU_RAGE_EFFECT_SLUG, YU_COLLAPSE_DRAINED_EFFECT_SLUG, YU_COLLAPSE_ENFEEBLED_EFFECT_SLUG]);
  await applyYuNarrativeEffect(
    actor,
    YU_COLLAPSE_DRAINED_EFFECT_SLUG,
    "Colapso Neural — Drenado 1",
    "<p>Ao término de Rage in the Flesh, Yu sofre Drenado 1 até o próximo descanso curto de 10 minutos.</p>"
  );
  await applyYuNarrativeEffect(
    actor,
    YU_COLLAPSE_ENFEEBLED_EFFECT_SLUG,
    "Colapso Neural — Enfeebled 2",
    "<p>Ao término de Rage in the Flesh, Yu sofre Enfeebled 2 por 1 minuto completo.</p>",
    { value: 1, unit: "minutes", sustained: false, expiry: "turn-start" }
  );
}

function getSceneMeasuredTemplates(): Array<Record<string, unknown> & { id?: string; getFlag?: (scope: string, key: string) => unknown }> {
  const templates = (canvas?.scene as unknown as { templates?: Iterable<unknown> })?.templates;
  return Array.from(templates ?? []) as Array<Record<string, unknown> & { id?: string; getFlag?: (scope: string, key: string) => unknown }>;
}

async function removeArkiusKineticAuraTemplate(actor: Actor, templateId?: string): Promise<void> {
  const scene = canvas?.scene as unknown as { deleteEmbeddedDocuments?: (embeddedName: string, ids: string[]) => Promise<unknown[]> } | undefined;
  if (!scene?.deleteEmbeddedDocuments) return;
  const actorKey = getActorKey(actor);
  const ids = getSceneMeasuredTemplates()
    .filter(template => {
      const sameTemplate = templateId && template.id === templateId;
      const sameAura = template.getFlag?.(ETHERNUM.MODULE_NAME, "uniqueTemplate") === ARKIUS_KINETIC_AURA_EFFECT_SLUG;
      const sameActor = template.getFlag?.(ETHERNUM.MODULE_NAME, "actorKey") === actorKey;
      return sameTemplate || (sameAura && sameActor);
    })
    .map(template => template.id)
    .filter((id): id is string => typeof id === "string");
  if (ids.length > 0) await scene.deleteEmbeddedDocuments("MeasuredTemplate", ids);
}

function findArkiusKineticAuraTemplate(actor: Actor, templateId?: string): (Record<string, unknown> & { id?: string; update?: (data: Record<string, unknown>, operation?: Record<string, unknown>) => Promise<unknown>; getFlag?: (scope: string, key: string) => unknown }) | null {
  const actorKey = getActorKey(actor);
  const template = getSceneMeasuredTemplates().find(template => {
    const sameTemplate = templateId && template.id === templateId;
    const sameAura = template.getFlag?.(ETHERNUM.MODULE_NAME, "uniqueTemplate") === ARKIUS_KINETIC_AURA_EFFECT_SLUG;
    const sameActor = template.getFlag?.(ETHERNUM.MODULE_NAME, "actorKey") === actorKey;
    return sameTemplate || (sameAura && sameActor);
  });
  return (template ?? null) as (Record<string, unknown> & { id?: string; update?: (data: Record<string, unknown>, operation?: Record<string, unknown>) => Promise<unknown>; getFlag?: (scope: string, key: string) => unknown }) | null;
}

async function createArkiusKineticAuraTemplate(actor: Actor, radius: number): Promise<string | undefined> {
  const token = getActorToken(actor) as (Token & { center?: { x: number; y: number } }) | null;
  const scene = canvas?.scene as { createEmbeddedDocuments?: (embeddedName: string, data: Record<string, unknown>[]) => Promise<unknown[]> } | undefined;
  if (!token?.center || !scene?.createEmbeddedDocuments) return undefined;
  await removeArkiusKineticAuraTemplate(actor);
  const created = await scene.createEmbeddedDocuments("MeasuredTemplate", [{
    t: "circle",
    user: game.user?.id,
    x: token.center.x,
    y: token.center.y,
    distance: radius,
    direction: 0,
    fillColor: "#ff6a1f",
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        uniqueTemplate: ARKIUS_KINETIC_AURA_EFFECT_SLUG,
        actorKey: getActorKey(actor),
      },
    },
  }]);
  const template = Array.isArray(created) ? asRecord(created[0]) : {};
  return typeof template.id === "string" ? template.id : undefined;
}

async function syncArkiusKineticAuraTemplate(actor: Actor): Promise<string | undefined> {
  const state = normalizeArkiusState(asRecord(UniqueMechanicsSystem.getState(actor).profiles)[ARKIUS_JACKER_PROFILE_ID]);
  if (!state.kineticAura.active) return undefined;
  const token = getActorToken(actor) as (Token & { center?: { x: number; y: number } }) | null;
  if (!token?.center) return state.kineticAura.templateId;
  const template = findArkiusKineticAuraTemplate(actor, state.kineticAura.templateId);
  if (!template?.update) return createArkiusKineticAuraTemplate(actor, state.kineticAura.radius);
  await template.update({
    x: token.center.x,
    y: token.center.y,
    distance: state.kineticAura.radius,
  }, { render: false });
  return template.id ?? state.kineticAura.templateId;
}

function getSelectedArkiusSolarArea(data: ArkiusSolarData, state: ArkiusJackerState): ArkiusSolarArea {
  return data.areas.find(area => area.id === state.nucleoEmBrasas.selectedSolarArea) ?? data.areas[0];
}

async function confirmArkiusSolarExecution(area: ArkiusSolarArea, data: ArkiusSolarData): Promise<boolean> {
  return new Promise(resolve => {
    let resolved = false;
    const content = `
      <form class="ethernum-arkius-area-choice">
        <p><strong>Área selecionada:</strong> ${escapeHtml(area.label)}</p>
        <p><strong>Dano:</strong> ${escapeHtml(data.formula)} · <strong>Defesa:</strong> Reflexos básico ${escapeHtml(data.dcLabel)}.</p>
        <p>O módulo criará o template primeiro. Ajuste a área no canvas, confirme, e só então os alvos serão detectados para salvamento e dano.</p>
      </form>`;
    new Dialog({
      title: "Exaurir o Sol",
      content,
      buttons: {
        confirm: {
          label: game.i18n!.localize("ETHERNUM.Buttons.Activate"),
          callback: () => {
            resolved = true;
            resolve(true);
          },
        },
        cancel: {
          label: game.i18n!.localize("ETHERNUM.Buttons.Close"),
          callback: () => {
            resolved = true;
            resolve(false);
          },
        },
      },
      close: () => {
        if (!resolved) resolve(false);
      },
    }).render(true);
  });
}

async function createArkiusSolarTemplate(actor: Actor, area: ArkiusSolarArea): Promise<ArkiusTemplateResult | null> {
  const token = getActorToken(actor) as (Token & { center?: { x: number; y: number }; document?: { rotation?: number } }) | null;
  const scene = canvas?.scene as { createEmbeddedDocuments?: (embeddedName: string, data: Record<string, unknown>[]) => Promise<unknown[]> } | undefined;
  if (!token?.center || !scene?.createEmbeddedDocuments) return null;
  const userColor = String((game.user as unknown as { color?: string })?.color ?? "#d94122");
  const direction = Number(token.document?.rotation ?? 0) || 0;
  const templateData: Record<string, unknown> = {
    t: area.templateType,
    user: game.user?.id,
    x: token.center.x,
    y: token.center.y,
    distance: area.distance,
    direction,
    fillColor: userColor,
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        uniqueTemplate: "arkius-exaurir-o-sol",
      },
    },
  };
  if (area.templateType === "cone") templateData.angle = area.angle ?? 90;
  if (area.templateType === "ray") templateData.width = 5;
  const created = await scene.createEmbeddedDocuments("MeasuredTemplate", [templateData]);
  return {
    area,
    templateDocument: Array.isArray(created) ? created[0] ?? null : null,
    origin: { x: token.center.x, y: token.center.y },
    direction,
    width: 5,
  };
}

function syncArkiusTemplateResultFromDocument(template: ArkiusTemplateResult): ArkiusTemplateResult {
  const doc = asRecord(template.templateDocument);
  const x = Number(doc.x ?? template.origin.x);
  const y = Number(doc.y ?? template.origin.y);
  const direction = Number(doc.direction ?? template.direction);
  const width = Number(doc.width ?? template.width);
  const distance = Number(doc.distance ?? template.area.distance);
  return {
    ...template,
    area: {
      ...template.area,
      distance: Number.isFinite(distance) && distance > 0 ? distance : template.area.distance,
    },
    origin: {
      x: Number.isFinite(x) ? x : template.origin.x,
      y: Number.isFinite(y) ? y : template.origin.y,
    },
    direction: Number.isFinite(direction) ? direction : template.direction,
    width: Number.isFinite(width) && width > 0 ? width : template.width,
  };
}

async function waitForArkiusTemplateAdjustment(template: ArkiusTemplateResult | null, area: ArkiusSolarArea): Promise<ArkiusTemplateResult | null> {
  if (!template) return null;
  return new Promise(resolve => {
    let resolved = false;
    const content = `
      <form class="ethernum-arkius-area-choice">
        <p><strong>${escapeHtml(area.label)}</strong> criado no canvas.</p>
        <p>Mova, rotacione ou redimensione o template como precisar. Depois confirme para detectar alvos e rolar Reflexos básico.</p>
      </form>`;
    new Dialog({
      title: "Ajustar área - Exaurir o Sol",
      content,
      buttons: {
        confirm: {
          label: "Confirmar área",
          callback: () => {
            resolved = true;
            resolve(syncArkiusTemplateResultFromDocument(template));
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

function getCanvasGridScale(): { size: number; distance: number } {
  const grid = (canvas as unknown as { grid?: { size?: number }; scene?: { grid?: { size?: number; distance?: number } } } | undefined);
  const size = Number(grid?.grid?.size ?? grid?.scene?.grid?.size ?? 100);
  const distance = Number(grid?.scene?.grid?.distance ?? 5);
  return {
    size: Number.isFinite(size) && size > 0 ? size : 100,
    distance: Number.isFinite(distance) && distance > 0 ? distance : 5,
  };
}

function pixelsToSceneDistance(pixels: number): number {
  const { size, distance } = getCanvasGridScale();
  return (pixels / size) * distance;
}

function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function angleDelta(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return diff > 180 ? 360 - diff : diff;
}

function tokenCenterInArkiusArea(center: { x: number; y: number }, template: ArkiusTemplateResult): boolean {
  const { area, origin } = template;
  const dxPixels = center.x - origin.x;
  const dyPixels = center.y - origin.y;
  const dx = pixelsToSceneDistance(dxPixels);
  const dy = pixelsToSceneDistance(dyPixels);
  const distance = Math.hypot(dx, dy);
  if (area.templateType === "circle") return distance <= area.distance;

  const angleToTarget = normalizeDegrees(Math.atan2(dy, dx) * (180 / Math.PI));
  const direction = normalizeDegrees(template.direction);
  if (area.templateType === "cone") {
    return distance <= area.distance && angleDelta(direction, angleToTarget) <= ((area.angle ?? 90) / 2);
  }

  const radians = direction * (Math.PI / 180);
  const forward = dx * Math.cos(radians) + dy * Math.sin(radians);
  const lateral = Math.abs(-dx * Math.sin(radians) + dy * Math.cos(radians));
  return forward >= 0 && forward <= area.distance && lateral <= (template.width / 2);
}

function findArkiusSolarTargets(actor: Actor, template: ArkiusTemplateResult | null): ArkiusSolarTarget[] {
  if (!template) return [];
  const sourceToken = getActorToken(actor) as { id?: string } | null;
  const tokens = Array.from(((canvas as unknown as { tokens?: { placeables?: unknown[] } })?.tokens?.placeables ?? [])) as ArkiusSolarTarget["token"][];
  return tokens
    .filter(token => token.actor && token.actor.id !== actor.id && token.id !== sourceToken?.id && token.center)
    .filter(token => tokenCenterInArkiusArea(token.center as { x: number; y: number }, template))
    .map((token, index): ArkiusSolarTarget => ({
      id: String(token.id ?? token.actor?.id ?? index),
      name: String(token.name ?? token.actor?.name ?? `Alvo ${index + 1}`),
      actor: token.actor as Actor,
      token,
      distance: pixelsToSceneDistance(Math.hypot((token.center?.x ?? template.origin.x) - template.origin.x, (token.center?.y ?? template.origin.y) - template.origin.y)),
    }));
}

function getTokenLikeActor(token: unknown): Actor | null {
  const direct = asRecord(token);
  const object = asRecord(direct.object);
  return (direct.actor ?? object.actor ?? null) as Actor | null;
}

function getTokenLikeCenter(token: unknown): { x: number; y: number } | null {
  const direct = asRecord(token);
  const object = asRecord(direct.object);
  const directCenter = asRecord(direct.center);
  const objectCenter = asRecord(object.center);
  const centerX = Number(directCenter.x ?? objectCenter.x);
  const centerY = Number(directCenter.y ?? objectCenter.y);
  if (Number.isFinite(centerX) && Number.isFinite(centerY)) return { x: centerX, y: centerY };

  const x = Number(direct.x ?? object.x);
  const y = Number(direct.y ?? object.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const gridSize = getCanvasGridScale().size;
  const width = Number(direct.width ?? object.width ?? 1) || 1;
  const height = Number(direct.height ?? object.height ?? 1) || 1;
  return {
    x: x + (width * gridSize) / 2,
    y: y + (height * gridSize) / 2,
  };
}

function getTokenLikeDisposition(token: unknown): number {
  const direct = asRecord(token);
  const object = asRecord(direct.object);
  const document = asRecord(direct.document ?? object.document);
  const value = Number(direct.disposition ?? document.disposition ?? object.disposition);
  return Number.isFinite(value) ? value : 0;
}

function getCanvasTokenPlaceables(): unknown[] {
  return Array.from(((canvas as unknown as { tokens?: { placeables?: unknown[] } })?.tokens?.placeables ?? []));
}

function tokensAreAllied(sourceToken: unknown, targetToken: unknown): boolean {
  const sourceActor = getTokenLikeActor(sourceToken);
  const targetActor = getTokenLikeActor(targetToken);
  if (!sourceActor || !targetActor) return false;
  if (sourceActor.id === targetActor.id) return true;
  const sourceDisposition = getTokenLikeDisposition(sourceToken);
  const targetDisposition = getTokenLikeDisposition(targetToken);
  return sourceDisposition !== 0 && sourceDisposition === targetDisposition;
}

function tokenInArkiusKineticAura(sourceToken: unknown, targetToken: unknown, radius: number): boolean {
  const sourceCenter = getTokenLikeCenter(sourceToken);
  const targetCenter = getTokenLikeCenter(targetToken);
  if (!sourceCenter || !targetCenter) return false;
  const distance = pixelsToSceneDistance(Math.hypot(targetCenter.x - sourceCenter.x, targetCenter.y - sourceCenter.y));
  return distance <= radius;
}

async function confirmArkiusSolarTargets(targets: ArkiusSolarTarget[], area: ArkiusSolarArea): Promise<ArkiusSolarTarget[]> {
  if (targets.length === 0) {
    ui.notifications?.info("Exaurir o Sol: nenhum token detectado na área. O dano ficará para resolução manual, se necessário.");
    return [];
  }

  return new Promise(resolve => {
    let resolved = false;
    const content = `
      <form class="ethernum-arkius-target-choice">
        <p>Confirme os alvos dentro de <strong>${escapeHtml(area.label)}</strong>. Só os marcados receberão rolagem de Reflexos básico e dano automático.</p>
        <div class="ethernum-arkius-target-list">
          ${targets.map(target => `
            <label>
              <input type="checkbox" name="target" value="${escapeHtml(target.id)}" checked />
              <span>${escapeHtml(target.name)} <small>${Math.round(target.distance)} ft</small></span>
            </label>
          `).join("")}
        </div>
        <p class="hint">Fraquezas de Fogo, Metal e Área são somadas quando o PF2e expõe esse dado no ator. Resistências e imunidades ainda podem exigir conferência do mestre.</p>
      </form>`;
    new Dialog({
      title: "Exaurir o Sol - alvos",
      content,
      buttons: {
        confirm: {
          label: "Aplicar em selecionados",
          callback: (html: JQuery) => {
            resolved = true;
            const selected = new Set(html.find('input[name="target"]:checked').toArray().map(input => String((input as HTMLInputElement).value)));
            resolve(targets.filter(target => selected.has(target.id)));
          },
        },
        skip: {
          label: "Sem aplicação automática",
          callback: () => {
            resolved = true;
            resolve([]);
          },
        },
      },
      close: () => {
        if (!resolved) resolve([]);
      },
    }).render(true);
  });
}

function getActorSaveModifier(actor: Actor, save: "reflex" | "will"): number {
  const system = asRecord(actor.system);
  const saves = asRecord(system.saves);
  const saveData = asRecord(saves[save]);
  const check = asRecord(saveData.check);
  const candidates = [saveData.total, saveData.totalModifier, saveData.mod, saveData.value, check.total, check.totalModifier, check.mod];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function getRollNaturalD20(roll: Roll): number {
  const dice = (roll as Roll & { dice?: Array<{ total?: number; results?: Array<{ result?: number }> }> }).dice ?? [];
  const first = dice[0];
  const total = Number(first?.total ?? first?.results?.[0]?.result);
  return Number.isFinite(total) ? total : 0;
}

function getBasicSaveDegree(total: number, dc: number, natural: number): ArkiusSolarTargetResult["degree"] {
  let rank = total >= dc + 10 ? 3 : total >= dc ? 2 : total <= dc - 10 ? 0 : 1;
  if (natural === 20) rank = Math.min(3, rank + 1);
  if (natural === 1) rank = Math.max(0, rank - 1);
  if (rank >= 3) return "Sucesso crítico";
  if (rank === 2) return "Sucesso";
  if (rank === 1) return "Falha";
  return "Falha crítica";
}

function getBasicSaveDamage(totalDamage: number, degree: ArkiusSolarTargetResult["degree"]): number {
  if (degree === "Sucesso crítico") return 0;
  if (degree === "Sucesso") return Math.floor(totalDamage / 2);
  if (degree === "Falha crítica") return totalDamage * 2;
  return totalDamage;
}

function readNumericWeaknessValue(entry: Record<string, unknown>): number {
  const candidates = [
    entry.value,
    entry.amount,
    entry.modifier,
    asRecord(entry.value).value,
    asRecord(entry.amount).value,
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return Math.floor(value);
  }
  return 0;
}

interface ArkiusWeaknessOptions {
  fire?: boolean;
  metal?: boolean;
  area?: boolean;
}

function getArkiusTriggeredWeaknesses(actor: Actor, options: ArkiusWeaknessOptions = { fire: true, metal: true, area: true }): { total: number; labels: string[] } {
  const system = asRecord(actor.system);
  const attributes = asRecord(system.attributes);
  const weaknessesRaw = asRecord(attributes.weaknesses);
  const entries = Array.isArray(attributes.weaknesses)
    ? attributes.weaknesses as unknown[]
    : Object.values(weaknessesRaw);
  const values: Record<"Fogo" | "Metal" | "Área", number> = {
    Fogo: 0,
    Metal: 0,
    Área: 0,
  };

  for (const entryRaw of entries) {
    const entry = asRecord(entryRaw);
    const haystack = Array.from(collectLowercaseStrings(entry)).join(" ");
    const triggersFire = Boolean(options.fire) && (haystack.includes("fire") || haystack.includes("fogo"));
    const triggersMetal = Boolean(options.metal) && haystack.includes("metal");
    const triggersArea = Boolean(options.area) && (haystack.includes("area") || haystack.includes("área") || haystack.includes("aoe"));
    if (!triggersFire && !triggersMetal && !triggersArea) continue;

    const value = readNumericWeaknessValue(entry);
    if (value <= 0) continue;
    if (triggersFire) values.Fogo = Math.max(values.Fogo, value);
    if (triggersMetal) values.Metal = Math.max(values.Metal, value);
    if (triggersArea) values.Área = Math.max(values.Área, value);
  }

  const labels = Object.entries(values)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => `${label} ${value}`);
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  return { total, labels };
}

async function resolveArkiusSolarTargetSaves(targets: ArkiusSolarTarget[], dc: number, totalDamage: number): Promise<ArkiusSolarTargetResult[]> {
  const results: ArkiusSolarTargetResult[] = [];
  for (const target of targets) {
    const modifier = getActorSaveModifier(target.actor, "reflex");
    const roll = new Roll(`1d20 + ${modifier}`);
    await roll.evaluate();
    const saveTotal = Number(roll.total ?? 0);
    const natural = getRollNaturalD20(roll);
    const degree = getBasicSaveDegree(saveTotal, dc, natural);
    const baseDamage = getBasicSaveDamage(totalDamage, degree);
    const weakness = baseDamage > 0 ? getArkiusTriggeredWeaknesses(target.actor) : { total: 0, labels: [] as string[] };
    const damageApplied = baseDamage + weakness.total;
    let applied = damageApplied <= 0;
    if (damageApplied > 0) {
      applied = await applyActorHpDelta(target.actor, -damageApplied).catch(error => {
        console.warn("Ethernum RPG Module | Could not apply Arkius solar damage", error);
        return false;
      });
    }
    results.push({
      name: target.name,
      saveTotal,
      natural,
      degree,
      baseDamage,
      weaknessDamage: weakness.total,
      weaknessLabels: weakness.labels,
      damageApplied,
      applied,
    });
  }
  return results;
}

function buildArkiusSolarChatCard(
  actor: Actor,
  solar: ArkiusSolarData,
  area: ArkiusSolarArea,
  damageTotal: number,
  targetResults: ArkiusSolarTargetResult[],
  templateCreated: boolean
): string {
  const targetRows = targetResults.length > 0
    ? targetResults.map(result => `
      <li>
        <strong>${escapeHtml(result.name)}</strong>
        <span>${escapeHtml(result.degree)} (${result.saveTotal}${result.natural ? `, d20 ${result.natural}` : ""})</span>
        <em>${result.damageApplied} dano${result.weaknessDamage > 0 ? ` (${result.baseDamage} + ${result.weaknessDamage} fraqueza)` : ""}${result.applied ? "" : " - ajuste manual"}</em>
        ${result.weaknessLabels.length > 0 ? `<small>Fraquezas: ${result.weaknessLabels.map(escapeHtml).join(", ")}</small>` : ""}
      </li>
    `).join("")
    : `<li><strong>Sem aplicação automática</strong><span>Resolva alvos manualmente se necessário.</span><em>${templateCreated ? "Template criado" : "Template manual"}</em></li>`;

  return `
    <div class="ethernum-arkius-solar-chat-card">
      <header>
        <span>Concórdia · Arkius Jacker</span>
        <h2>EXAURIR O SOL</h2>
        <p>O núcleo se apaga para que o campo queime.</p>
      </header>
      <section class="solar-result">
        <div><span>Dano</span><strong>${damageTotal}</strong><small>${escapeHtml(solar.formula)}</small></div>
        <div><span>Área</span><strong>${escapeHtml(area.label)}</strong><small>${templateCreated ? "Template criado" : "Crie/ajuste manualmente"}</small></div>
        <div><span>Defesa</span><strong>Reflexos básico</strong><small>${escapeHtml(solar.dcLabel)} cinética</small></div>
      </section>
      <section class="solar-targets">
        <h3>Alvos afetados</h3>
        <ul>${targetRows}</ul>
      </section>
      <footer>
        <strong>${escapeHtml(actor.name ?? "Arkius")}</strong>
        <span>Rodadas usadas: ${solar.remainingRoundsUsed}</span>
        <span>Desajeitado 2 · Drenado ${solar.drainedValue} · Fogo/Metal bloqueados</span>
        <p>O sol interno foi exaurido. O corpo continua de pé, mas o núcleo está vazio. Resistências, imunidades e fraquezas podem precisar de conferência manual.</p>
      </footer>
    </div>`;
}

interface ArkiusThermalNimbusResult {
  sourceName: string;
  targetName: string;
  baseDamage: number;
  junctionDamage: number;
  weaknessDamage: number;
  weaknessLabels: string[];
  totalDamage: number;
  applied: boolean;
  trigger: string;
}

function getArkiusThermalNimbusDamage(actor: Actor): number {
  return Math.max(1, Math.floor(getActorLevel(actor) / 2));
}

function buildArkiusThermalNimbusChatCard(result: ArkiusThermalNimbusResult): string {
  const parts = [
    `${result.baseDamage} Thermal Nimbus`,
    result.junctionDamage > 0 ? `${result.junctionDamage} fraqueza da Aura Junction` : "",
    result.weaknessDamage > 0 ? `${result.weaknessDamage} fraqueza` : "",
  ].filter(Boolean);
  return `
    <div class="ethernum-unique-chat-card ethernum-concordia-chat-card ethernum-arkius-thermal-card">
      <h3>Thermal Nimbus</h3>
      <p><strong>${escapeHtml(result.targetName)}</strong> sofre <strong>${result.totalDamage}</strong> de dano de fogo.</p>
      <p><strong>Origem:</strong> ${escapeHtml(result.sourceName)} · <strong>Gatilho:</strong> ${escapeHtml(result.trigger)}</p>
      <p><strong>Cálculo:</strong> ${parts.map(escapeHtml).join(" + ")}</p>
      ${result.weaknessLabels.length > 0 ? `<p><strong>Fraquezas aplicadas:</strong> ${result.weaknessLabels.map(escapeHtml).join(", ")}</p>` : ""}
      ${result.applied ? "" : "<p><strong>Ajuste manual:</strong> o HP automático não pôde ser alterado.</p>"}
    </div>`;
}

async function showArkiusThermalNimbusResult(source: Actor, result: ArkiusThermalNimbusResult): Promise<void> {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: source }),
    flags: { [ETHERNUM.MODULE_NAME]: { uniqueMechanics: "arkius-thermal-nimbus" } } as Record<string, unknown>,
    content: buildArkiusThermalNimbusChatCard(result),
  });
}

function getNextDamageDieStep(baseDie: string): string {
  const steps = ["d4", "d6", "d8", "d10", "d12"];
  const normalized = baseDie.toLowerCase().replace(/^1/, "");
  const index = steps.indexOf(normalized);
  return steps[Math.min(steps.length - 1, Math.max(0, index) + 1)] ?? "d10";
}

function sanitizeDamageFormula(formula: string, fallback = "3d8"): string {
  const cleaned = formula
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\ddD+\-*/().\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned && /\d*d(4|6|8|10|12)\b/i.test(cleaned) ? cleaned : fallback;
}

function boostArkiusBrasasFormula(baseFormula: string, fallbackDie = "d8"): ArkiusBrasasFormula {
  const sanitized = sanitizeDamageFormula(baseFormula, `3${fallbackDie}`);
  const dicePattern = /(\d*)d(4|6|8|10|12)\b/gi;
  let firstDieBoosted = false;
  let baseDie = fallbackDie;
  let boostedDie = getNextDamageDieStep(fallbackDie);
  let diceCount = 0;
  let totalDice = 0;
  const correctedFormula = sanitized.replace(dicePattern, (_match, countText: string, facesText: string) => {
    const count = Math.max(1, parseInt(countText || "1") || 1);
    const die = `d${facesText}`.toLowerCase();
    const nextDie = getNextDamageDieStep(die);
    const nextCount = firstDieBoosted ? count : count + 1;
    if (!firstDieBoosted) {
      baseDie = die;
      boostedDie = nextDie;
      firstDieBoosted = true;
    }
    diceCount += count;
    totalDice += nextCount;
    return `${nextCount}${nextDie}`;
  });

  if (!firstDieBoosted) {
    const fallbackBoosted = getNextDamageDieStep(fallbackDie);
    return {
      baseFormula: `1${fallbackDie}`,
      correctedFormula: `2${fallbackBoosted}`,
      baseDie: fallbackDie,
      boostedDie: fallbackBoosted,
      diceCount: 1,
      totalDice: 2,
    };
  }

  return {
    baseFormula: sanitized,
    correctedFormula,
    baseDie,
    boostedDie,
    diceCount,
    totalDice,
  };
}

async function promptArkiusFluxoConsumption(): Promise<ArkiusFluxoConsumption | null> {
  return new Promise(resolve => {
    let resolved = false;
    const content = `
      <form class="ethernum-arkius-area-choice">
        <label><span>Habilidade</span><input type="text" name="ability" value="Impulso Cinético" /></label>
        <label><span>Custo original</span>
          <select name="actions">
            <option value="1">1 ação</option>
            <option value="2" selected>2 ações</option>
            <option value="3">3 ações</option>
          </select>
        </label>
      </form>`;
    new Dialog({
      title: "Consumir Sintonia de Fluxo",
      content,
      buttons: {
        confirm: {
          label: "Consumir",
          callback: (html: JQuery) => {
            resolved = true;
            const abilityName = String(html.find('[name="ability"]').val() ?? "Impulso Cinético").trim() || "Impulso Cinético";
            const originalActions = clamp(parseInt(String(html.find('[name="actions"]').val())) || 2, 1, 3);
            resolve({
              abilityName,
              originalActions,
              reducedActions: Math.max(1, originalActions - 1),
              auto: false,
            });
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

async function promptArkiusBrasasConsumption(defaultBaseDie = "d8"): Promise<ArkiusBrasasConsumption | null> {
  return new Promise(resolve => {
    let resolved = false;
    const defaultFormula = `3${defaultBaseDie}`;
    const content = `
      <form class="ethernum-arkius-area-choice">
        <label><span>Habilidade</span><input type="text" name="ability" value="Elemental Blast" /></label>
        <label><span>Fórmula base</span><input type="text" name="baseFormula" value="${escapeHtml(defaultFormula)}" /></label>
        <label><span>Tipo narrativo</span>
          <select name="damageType">
            <option value="fogo">Fogo</option>
            <option value="metal">Metal</option>
            <option value="fogo/metal">Fogo/Metal</option>
          </select>
        </label>
      </form>`;
    new Dialog({
      title: "Consumir Sintonia de Brasas",
      content,
      buttons: {
        confirm: {
          label: "Rolar fórmula corrigida",
          callback: (html: JQuery) => {
            resolved = true;
            const abilityName = String(html.find('[name="ability"]').val() ?? "Elemental Blast").trim() || "Elemental Blast";
            const formulas = boostArkiusBrasasFormula(String(html.find('[name="baseFormula"]').val() ?? defaultFormula), defaultBaseDie);
            resolve({
              abilityName,
              baseFormula: formulas.baseFormula,
              correctedFormula: formulas.correctedFormula,
              baseDie: formulas.baseDie,
              boostedDie: formulas.boostedDie,
              damageType: String(html.find('[name="damageType"]').val() ?? "fogo/metal"),
              auto: false,
            });
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

function getChatMessageContext(message: ChatMessage): Record<string, unknown> {
  const flags = asRecord((message as ChatMessage & { flags?: unknown }).flags);
  const pf2e = asRecord(flags.pf2e);
  return asRecord(pf2e.context ?? pf2e);
}

function isEthernumGeneratedMessage(message: ChatMessage): boolean {
  const flags = asRecord((message as ChatMessage & { flags?: unknown }).flags);
  return Boolean(asRecord(flags[ETHERNUM.MODULE_NAME]).uniqueMechanics);
}

function isPF2EAttackRollMessage(message: ChatMessage): boolean {
  const context = getChatMessageContext(message);
  const type = String(context.type ?? context.rollType ?? "");
  if (type.includes("damage")) return false;
  if (type === "attack-roll" || type === "strike-attack-roll") return true;
  if (type && type !== "check") return false;
  const domains = Array.isArray(context.domains) ? context.domains.map(String) : [];
  return domains.some(domain => domain.includes("attack-roll"));
}

function isPF2EDamageRollMessage(message: ChatMessage): boolean {
  const context = getChatMessageContext(message);
  const type = String(context.type ?? context.rollType ?? "").toLowerCase();
  if (type.includes("damage")) return true;
  const domains = Array.isArray(context.domains) ? context.domains.map(value => String(value).toLowerCase()) : [];
  return domains.some(domain => domain.includes("damage"));
}

function collectLowercaseStrings(value: unknown, strings = new Set<string>(), depth = 0): Set<string> {
  if (depth > 6 || value === null || value === undefined) return strings;
  if (typeof value === "string") {
    strings.add(value.toLowerCase());
    return strings;
  }
  if (typeof value === "number" || typeof value === "boolean") return strings;
  if (Array.isArray(value)) {
    value.forEach(item => collectLowercaseStrings(item, strings, depth + 1));
    return strings;
  }
  if (typeof value !== "object") return strings;
  Object.values(value as Record<string, unknown>).forEach(item => collectLowercaseStrings(item, strings, depth + 1));
  return strings;
}

function getArkiusChatActionLabel(message: ChatMessage): string {
  const context = getChatMessageContext(message);
  const flags = asRecord((message as ChatMessage & { flags?: unknown }).flags);
  const candidates = [
    context.title,
    context.name,
    asRecord(context.item).name,
    asRecord(context.origin).name,
    asRecord(asRecord(flags.pf2e).item).name,
    (message as ChatMessage & { flavor?: string }).flavor,
  ];
  for (const candidate of candidates) {
    const text = String(candidate ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text && !text.includes("Actor.")) return text.slice(0, 80);
  }
  return "Habilidade elegível";
}

function isArkiusEligibleImpulseChatMessage(message: ChatMessage, options: { fluxo?: boolean } = {}): boolean {
  const flags = asRecord((message as ChatMessage & { flags?: unknown }).flags);
  const strings = collectLowercaseStrings({ flags, context: getChatMessageContext(message) });
  const joined = Array.from(strings).join(" ");
  if (options.fluxo && (joined.includes("overflow") || joined.includes("explosão elemental") || joined.includes("explosao elemental"))) {
    return false;
  }
  return joined.includes("elemental blast")
    || joined.includes("elemental-blast")
    || joined.includes("impulse")
    || joined.includes("impulso")
    || joined.includes("kinetic")
    || joined.includes("cinético")
    || joined.includes("cinetico")
    || joined.includes("fire")
    || joined.includes("fogo")
    || joined.includes("metal");
}

function detectDamageDieFromChatMessage(message: ChatMessage): string {
  const rolls = (message as ChatMessage & { rolls?: Roll[] }).rolls ?? [];
  const candidates = [
    ...rolls.map(roll => String((roll as Roll & { formula?: string }).formula ?? "")),
    String((message as ChatMessage & { content?: string }).content ?? ""),
    JSON.stringify(getChatMessageContext(message)),
  ];
  for (const candidate of candidates) {
    const matches = Array.from(candidate.matchAll(/\b\d*d(4|6|8|10|12)\b/gi));
    if (matches.length > 0) return `d${matches[0][1]}`;
  }
  return "d8";
}

function detectDamageFormulaFromChatMessage(message: ChatMessage): string {
  const rolls = (message as ChatMessage & { rolls?: Roll[] }).rolls ?? [];
  for (const roll of rolls) {
    const formula = String((roll as Roll & { formula?: string }).formula ?? "").trim();
    if (/\d*d(4|6|8|10|12)\b/i.test(formula)) return sanitizeDamageFormula(formula);
  }

  const candidates = [
    String((message as ChatMessage & { content?: string }).content ?? ""),
    JSON.stringify(getChatMessageContext(message)),
  ];
  for (const candidate of candidates) {
    const match = candidate.match(/(?:\d*d(?:4|6|8|10|12)(?:\s*[+\-]\s*\d+)*)/i);
    if (match?.[0]) return sanitizeDamageFormula(match[0]);
  }
  return "3d8";
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

function refreshActorMechanicsViews(actor: Actor): void {
  window.setTimeout(() => {
    try {
      (actor as Actor & { sheet?: Application }).sheet?.render(false);
      for (const app of Object.values(ui.windows ?? {})) {
        const actorApp = app as Application & { actor?: Actor };
        if (actorApp.actor?.id === actor.id) actorApp.render(false);
      }
      const appInstances = (foundry.applications as unknown as {
        instances?: Map<string, Application> | Set<Application>;
      }).instances;
      if (appInstances) {
        const values = "values" in appInstances ? appInstances.values() : [];
        for (const app of values as Iterable<Application>) {
          const actorApp = app as Application & { actor?: Actor };
          if (actorApp.actor?.id === actor.id) actorApp.render(false);
        }
      }
    } catch (error) {
      console.warn("Ethernum RPG Module | Could not refresh unique mechanics views", error);
    }
  }, 75);
}

export class UniqueMechanicsSystem {
  static getControlledActor(): Actor | null {
    return getControlledActor();
  }

  static getState(actor: Actor): UniqueMechanicsState {
    const raw = asRecord(actor.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics"));
    const activeCore = normalizeCampaignCore(raw.activeCore);
    const rawProfile = isKnownProfile(raw.activeProfile) ? raw.activeProfile : "";
    const activeProfile = profileBelongsToCore(rawProfile, activeCore) ? rawProfile : "";
    return {
      activeCore,
      activeProfile,
      profiles: asRecord(raw.profiles),
    };
  }

  static getActiveCore(actor: Actor): CampaignCoreId {
    return this.getState(actor).activeCore;
  }

  static async setState(actor: Actor, state: UniqueMechanicsState): Promise<void> {
    await actor.setFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics", state);
  }

  static async setStateQuiet(actor: Actor, state: UniqueMechanicsState): Promise<void> {
    await (actor as Actor & {
      update: (data: Record<string, unknown>, operation?: Record<string, unknown>) => Promise<Actor>;
    }).update({ [`flags.${ETHERNUM.MODULE_NAME}.uniqueMechanics`]: state }, { render: false });
  }

  static async removeGyroProportionMarkAttackEffect(actor: Actor): Promise<void> {
    const items = Array.from((actor.items ?? []) as Collection<Item>);
    const effects = items.filter(item => {
      const itemData = item as Item & { slug?: string; getFlag?: (scope: string, key: string) => unknown };
      const slug = itemData.slug ?? String(asRecord(item.system).slug ?? "");
      return slug === GYRO_PROPORTION_MARK_EFFECT_SLUG
        || itemData.getFlag?.(ETHERNUM.MODULE_NAME, "uniqueEffect") === "gyro-proportion-mark-attack";
    });
    await Promise.all(effects.map(effect => effect.delete()));
  }

  static async applyGyroProportionMarkAttackEffect(actor: Actor, target: EthernumTargetChoice): Promise<void> {
    await this.removeGyroProportionMarkAttackEffect(actor);
    const level = getActorLevel(actor);
    const effectData = {
      name: "Marca da Proporção — próximo Strike",
      type: "effect",
      img: GYRO_SPINBALL_ASSET,
      system: {
        slug: GYRO_PROPORTION_MARK_EFFECT_SLUG,
        description: {
          value: `<p>O próximo Strike de Steel Ball recebe +2 de circunstância contra ${escapeHtml(target.name)}. O alvo marcado continua sincronizado para ganho extra de SP.</p>`,
        },
        level: { value: level },
        duration: { value: -1, unit: "unlimited", sustained: false, expiry: null },
        tokenIcon: { show: true },
        traits: { value: [] },
        rules: [
          {
            key: "FlatModifier",
            selector: "strike-attack-roll",
            type: "circumstance",
            value: 2,
            label: "Marca da Proporção",
          },
        ],
      },
      flags: {
        [ETHERNUM.MODULE_NAME]: {
          uniqueEffect: "gyro-proportion-mark-attack",
          targetActorKey: target.actorKey,
        },
      },
    };
    await (actor as Actor & {
      createEmbeddedDocuments: (embeddedName: "Item", data: Record<string, unknown>[], operation?: Record<string, unknown>) => Promise<Item[]>;
    }).createEmbeddedDocuments("Item", [effectData], { render: false });
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

  static getArkiusState(actor: Actor): ArkiusJackerState {
    const state = this.getState(actor);
    return normalizeArkiusState(state.profiles[ARKIUS_JACKER_PROFILE_ID]);
  }

  static getYuState(actor: Actor): YuRageState {
    const state = this.getState(actor);
    return normalizeYuState(state.profiles[YU_JIU_JI_TAE_PROFILE_ID]);
  }

  static async setActiveProfile(actor: Actor, profileId: UniqueMechanicProfileId): Promise<void> {
    const state = this.getState(actor);
    const profileCore = getProfileCore(profileId);
    if (profileCore) state.activeCore = profileCore;
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
    if (profileId === ARKIUS_JACKER_PROFILE_ID && !state.profiles[ARKIUS_JACKER_PROFILE_ID]) {
      state.profiles[ARKIUS_JACKER_PROFILE_ID] = foundry.utils.deepClone(DEFAULT_ARKIUS_STATE);
    }
    if (profileId === YU_JIU_JI_TAE_PROFILE_ID && !state.profiles[YU_JIU_JI_TAE_PROFILE_ID]) {
      state.profiles[YU_JIU_JI_TAE_PROFILE_ID] = { ...DEFAULT_YU_STATE };
    }
    await this.setState(actor, state);
  }

  static async setActiveCore(actor: Actor, coreId: CampaignCoreId): Promise<void> {
    const state = this.getState(actor);
    const nextCore = normalizeCampaignCore(coreId);
    state.activeCore = nextCore;
    if (!profileBelongsToCore(state.activeProfile, nextCore)) state.activeProfile = "";
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
    state.activeCore = ETHERNUM_COMPANY_CORE_ID;
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
    state.activeCore = ETHERNUM_COMPANY_CORE_ID;
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
    state.activeCore = ETHERNUM_COMPANY_CORE_ID;
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

  static async updateArkiusState(actor: Actor, patch: PartialArkiusJackerState): Promise<ArkiusJackerState> {
    const state = this.getState(actor);
    const current = this.getArkiusState(actor);
    const next = normalizeArkiusState({
      ...current,
      nucleoEmBrasas: {
        ...current.nucleoEmBrasas,
        ...(patch.nucleoEmBrasas ?? {}),
      },
      kineticAura: {
        ...current.kineticAura,
        ...(patch.kineticAura ?? {}),
      },
      thermalNimbus: {
        ...current.thermalNimbus,
        ...(patch.thermalNimbus ?? {}),
      },
      concordiaAspect: patch.concordiaAspect ?? current.concordiaAspect,
      bracoEvolutivo: {
        ...current.bracoEvolutivo,
        ...(patch.bracoEvolutivo ?? {}),
      },
    });
    state.activeCore = CONCORDIA_CORE_ID;
    state.activeProfile = ARKIUS_JACKER_PROFILE_ID;
    state.profiles[ARKIUS_JACKER_PROFILE_ID] = next;
    await this.setStateQuiet(actor, state);
    return next;
  }

  static async updateYuState(actor: Actor, patch: PartialYuRageState): Promise<YuRageState> {
    const state = this.getState(actor);
    const current = this.getYuState(actor);
    const next = normalizeYuState({ ...current, ...patch });
    state.activeCore = CONCORDIA_CORE_ID;
    state.activeProfile = YU_JIU_JI_TAE_PROFILE_ID;
    state.profiles[YU_JIU_JI_TAE_PROFILE_ID] = next;
    await this.setStateQuiet(actor, state);
    return next;
  }

  static async showConcordiaArkiusStatus(actor?: Actor | null, title = "Arkius Jacker — Núcleo em Brasas"): Promise<void> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return;
    }
    await this.setActiveProfile(target, ARKIUS_JACKER_PROFILE_ID);
    const state = this.getArkiusState(target);
    const solar = getArkiusSolarData(target, state);
    const area = getSelectedArkiusSolarArea(solar, state);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-concordia-chat-card">
          <h3>${escapeHtml(title)}</h3>
          <p><strong>Núcleo:</strong> ${state.nucleoEmBrasas.active ? "Ativo" : "Inativo"} · <strong>Usos:</strong> ${state.nucleoEmBrasas.usesSpent}/${state.nucleoEmBrasas.maxUses}</p>
          <p><strong>Rodadas restantes:</strong> ${state.nucleoEmBrasas.remainingRounds} · <strong>Sintonia:</strong> ${state.nucleoEmBrasas.attunement}</p>
          <p><strong>Pendências:</strong> Fluxo ${state.nucleoEmBrasas.pendingFluxoReduction ? "armado" : "não"} · Brasas ${state.nucleoEmBrasas.pendingBrasasDamage ? "armada" : "não"}.</p>
          <p><strong>Exaurir o Sol:</strong> ${solar.formula}, ${escapeHtml(area.label)}, Reflexos básico ${solar.dcLabel}.</p>
          <p><strong>Braço Evolutivo:</strong> ${state.bracoEvolutivo.maxCharges - state.bracoEvolutivo.chargesSpent}/${state.bracoEvolutivo.maxCharges} carga(s), resistência ${escapeHtml(state.bracoEvolutivo.resistanceFormula)}.</p>
        </div>`,
    });
  }

  static async activateNucleoEmBrasas(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (state.nucleoEmBrasas.active) {
      ui.notifications?.info("Núcleo em Brasas já está ativo.");
      return state;
    }
    if (state.nucleoEmBrasas.usesSpent >= state.nucleoEmBrasas.maxUses) {
      ui.notifications?.warn("Núcleo em Brasas sem usos até o próximo descanso longo.");
      return state;
    }
    const combat = game.combat;
    const turnKey = getCombatTurnKey() ?? undefined;
    const next = await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        active: true,
        usesSpent: state.nucleoEmBrasas.usesSpent + 1,
        startedRound: combat?.round ?? undefined,
        startedTurn: (combat as (Combat & { turn?: number }) | undefined)?.turn,
        combatId: combat?.id,
        remainingRounds: ARKIUS_NUCLEO_MAX_ROUNDS,
        attunement: "none",
        pendingFluxoReduction: false,
        pendingBrasasDamage: false,
        lastCombatTurnKey: turnKey,
        firstFireMetalProcUsed: false,
        exaurirUsed: false,
      },
    });
    await applyArkiusNucleoEffect(target).catch(error => {
      console.warn("Ethernum RPG Module | Could not apply Arkius Núcleo effect", error);
      ui.notifications?.warn("Núcleo em Brasas ativado, mas o efeito PF2e não pôde ser criado.");
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-concordia-chat-card">
          <h3>Force a Marca: Núcleo em Brasas</h3>
          <p><strong>Ativação:</strong> 1 ação · <strong>Duração:</strong> até 1 minuto.</p>
          <p>+1 status na CA, Fogo recebe Metal, Metal recebe Fogo, e o primeiro impulso/ataque Fogo ou Metal causa 2d6 de fogo persistente.</p>
          <p><strong>Risco:</strong> enquanto ativa, o efeito tenta aplicar fraqueza 5 a Gelo e Eletricidade; perda de imunidade/resistência fica para conferência do mestre.</p>
        </div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async endNucleoEmBrasas(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (!state.nucleoEmBrasas.active) {
      ui.notifications?.info("Núcleo em Brasas já está inativo.");
      return state;
    }
    await removeActorUniqueEffects(target, [ARKIUS_NUCLEO_EFFECT_SLUG]);
    await applyArkiusNarrativeEffect(
      target,
      ARKIUS_END_CLUMSY_EFFECT_SLUG,
      "Desajeitado 2 — Núcleo Encerrado",
      "<p>Núcleo em Brasas foi encerrado. Arkius fica Desajeitado 2 até realizar descanso curto de 10 minutos.</p>"
    ).catch(error => console.warn("Ethernum RPG Module | Could not apply Arkius end penalty", error));
    const next = await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        active: false,
        remainingRounds: 0,
        attunement: "none",
        pendingFluxoReduction: false,
        pendingBrasasDamage: false,
        lastCombatTurnKey: undefined,
        endedPenaltyActive: true,
      },
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-concordia-chat-card">
          <h3>Núcleo em Brasas encerrado</h3>
          <p>Arkius recebe <strong>Desajeitado 2</strong> até descanso curto de 10 minutos.</p>
        </div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async toggleNucleoEmBrasas(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    return state.nucleoEmBrasas.active ? this.endNucleoEmBrasas(target) : this.activateNucleoEmBrasas(target);
  }

  static async adjustArkiusNucleoRounds(actor?: Actor | null, amount = 0): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    const next = await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        remainingRounds: clamp(state.nucleoEmBrasas.remainingRounds + amount, 0, ARKIUS_NUCLEO_MAX_ROUNDS),
      },
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async setSintoniaFluxo(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (!state.nucleoEmBrasas.active) {
      ui.notifications?.warn("Ative Núcleo em Brasas antes de escolher Sintonia de Fluxo.");
      return state;
    }
    const turnKey = getCombatTurnKey() ?? "no-combat";
    if (state.nucleoEmBrasas.fluxoUsedTurnKey === turnKey) {
      ui.notifications?.warn("Sintonia de Fluxo já foi usada neste turno.");
      return state;
    }
    const next = await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        attunement: "fluxo",
        pendingFluxoReduction: true,
        pendingBrasasDamage: false,
        fluxoUsedTurnKey: turnKey,
      },
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-concordia-chat-card">
          <h3>Sintonia de Fluxo</h3>
          <p>Uma vez neste turno, reduza em 1 o custo de um Impulso Cinético, mínimo de 1 ação.</p>
          <p><strong>Estado:</strong> redução pendente. Use <strong>Consumir Fluxo</strong> se o PF2e não detectar a habilidade automaticamente.</p>
          <p><strong>Limite:</strong> não funciona em Overflow nem em Explosão Elemental.</p>
        </div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async setSintoniaBrasas(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (!state.nucleoEmBrasas.active) {
      ui.notifications?.warn("Ative Núcleo em Brasas antes de escolher Sintonia de Brasas.");
      return state;
    }
    const turnKey = getCombatTurnKey() ?? "no-combat";
    if (state.nucleoEmBrasas.brasasUsedTurnKey === turnKey) {
      ui.notifications?.warn("Sintonia de Brasas já foi usada neste turno.");
      return state;
    }
    await applyArkiusNarrativeEffect(
      target,
      ARKIUS_BRASAS_CLUMSY_EFFECT_SLUG,
      "Desajeitado 1 — Sintonia de Brasas",
      "<p>Sintonia de Brasas: Desajeitado 1 até o início do próximo turno de Arkius.</p>"
    ).catch(error => console.warn("Ethernum RPG Module | Could not apply Arkius Brasas effect", error));
    const next = await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        attunement: "brasas",
        pendingBrasasDamage: true,
        pendingFluxoReduction: false,
        brasasUsedTurnKey: turnKey,
      },
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-concordia-chat-card">
          <h3>Sintonia de Brasas</h3>
          <p>Uma vez neste turno, um Impulso ou Explosão Elemental de pelo menos 2 ações adiciona +1 dado de dano e aumenta o passo do dado.</p>
          <p><strong>Estado:</strong> dano extra pendente. O módulo tentará detectar a rolagem de dano, ou você pode usar <strong>Consumir Brasas</strong>.</p>
          <p><strong>Sacrifício:</strong> Desajeitado 1 até o início do próximo turno.</p>
        </div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async consumeSintoniaFluxo(actor?: Actor | null, consumption?: Partial<ArkiusFluxoConsumption>): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (!state.nucleoEmBrasas.pendingFluxoReduction) {
      ui.notifications?.warn("Nenhuma Sintonia de Fluxo pendente para consumir.");
      return state;
    }
    const originalActions = clamp(Number(consumption?.originalActions ?? 2) || 2, 1, 3);
    const chosen = consumption?.abilityName
      ? {
        abilityName: consumption.abilityName,
        originalActions,
        reducedActions: Math.max(1, originalActions - 1),
        auto: Boolean(consumption.auto),
      }
      : await promptArkiusFluxoConsumption();
    if (!chosen) return state;
    const next = await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        attunement: "none",
        pendingFluxoReduction: false,
      },
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      flags: { [ETHERNUM.MODULE_NAME]: { uniqueMechanics: "arkius-fluxo" } } as Record<string, unknown>,
      content: `
        <div class="ethernum-unique-chat-card ethernum-concordia-chat-card ethernum-arkius-attunement-card">
          <h3>Sintonia de Fluxo Consumida</h3>
          <p><strong>Habilidade:</strong> ${escapeHtml(chosen.abilityName)}</p>
          <p><strong>Custo:</strong> ${chosen.originalActions} ação(ões) → ${chosen.reducedActions} ação(ões).</p>
          <p>${chosen.auto ? "Detectado automaticamente pelo chat do PF2e." : "Consumo manual registrado para acompanhar o custo de ações."}</p>
        </div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async consumeSintoniaBrasas(actor?: Actor | null, consumption?: Partial<ArkiusBrasasConsumption>): Promise<Roll | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (!state.nucleoEmBrasas.pendingBrasasDamage) {
      ui.notifications?.warn("Nenhuma Sintonia de Brasas pendente para consumir.");
      return null;
    }
    const baseDie = String(consumption?.baseDie ?? "d8");
    const formulas = boostArkiusBrasasFormula(String(consumption?.baseFormula ?? `3${baseDie}`), baseDie);
    const chosen = consumption?.abilityName
      ? {
        abilityName: consumption.abilityName,
        baseFormula: formulas.baseFormula,
        correctedFormula: formulas.correctedFormula,
        baseDie: formulas.baseDie,
        boostedDie: formulas.boostedDie,
        damageType: String(consumption.damageType ?? "fogo/metal"),
        auto: Boolean(consumption.auto),
      }
      : await promptArkiusBrasasConsumption();
    if (!chosen) return null;
    const roll = new Roll(chosen.correctedFormula);
    await roll.evaluate();
    await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        attunement: "none",
        pendingBrasasDamage: false,
      },
    });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      flags: { [ETHERNUM.MODULE_NAME]: { uniqueMechanics: "arkius-brasas" } } as Record<string, unknown>,
      flavor: `
        <div class="ethernum-unique-chat-card ethernum-concordia-chat-card ethernum-arkius-attunement-card">
          <h3>Sintonia de Brasas Consumida</h3>
          <p><strong>Habilidade:</strong> ${escapeHtml(chosen.abilityName)}</p>
          <p><strong>Fórmula corrigida:</strong> ${escapeHtml(chosen.baseFormula)} → ${escapeHtml(chosen.correctedFormula)}.</p>
          <p><strong>Dado:</strong> ${escapeHtml(chosen.baseDie)} → ${escapeHtml(chosen.boostedDie)}; todos os dados sobem um passo e o primeiro grupo ganha +1 dado de ${escapeHtml(chosen.damageType)}.</p>
          <p><strong>Sacrifício:</strong> Desajeitado 1 até o início do próximo turno.</p>
          <p>${chosen.auto ? "Detectado automaticamente pela rolagem de dano do PF2e. Use este total corrigido no lugar do dano base." : "Consumo manual registrado para substituir a fórmula de dano elegível."}</p>
        </div>`,
    });
    refreshActorMechanicsViews(target);
    return roll;
  }

  static async setArkiusSolarArea(actor?: Actor | null, areaId: ArkiusSolarAreaId = "emanation"): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const next = await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        selectedSolarArea: normalizeArkiusSolarAreaId(areaId),
      },
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async setArkiusConcordiaAspect(actor?: Actor | null, aspect: ArkiusConcordiaAspect = "chains"): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const next = await this.updateArkiusState(target, {
      concordiaAspect: normalizeArkiusConcordiaAspect(aspect),
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async clearArkiusKineticAura(actor?: Actor | null, announce = true): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    await removeActorUniqueEffects(target, [ARKIUS_KINETIC_AURA_EFFECT_SLUG, ARKIUS_THERMAL_NIMBUS_EFFECT_SLUG]);
    await removeArkiusKineticAuraTemplate(target, state.kineticAura.templateId).catch(error => {
      console.warn("Ethernum RPG Module | Could not remove Arkius kinetic aura template", error);
    });
    const next = await this.updateArkiusState(target, {
      kineticAura: {
        active: false,
        templateId: undefined,
      },
      thermalNimbus: {
        active: false,
        appliedTurnKeys: {},
      },
    });
    if (announce) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: target }),
        content: `<div class="ethernum-unique-chat-card ethernum-concordia-chat-card"><h3>Aura Cinética encerrada</h3><p>A área cinética de Jacker foi removida do canvas e Thermal Nimbus foi desligada.</p></div>`,
      });
    }
    refreshActorMechanicsViews(target);
    return next;
  }

  static async toggleArkiusKineticAura(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (state.kineticAura.active) {
      return this.clearArkiusKineticAura(target);
    }

    const radius = state.kineticAura.radius || ARKIUS_KINETIC_AURA_DISTANCE;
    const templateId = await createArkiusKineticAuraTemplate(target, radius).catch(error => {
      console.warn("Ethernum RPG Module | Could not create Arkius kinetic aura template", error);
      return undefined;
    });
    await applyArkiusKineticAuraEffect(target, radius).catch(error => {
      console.warn("Ethernum RPG Module | Could not apply Arkius kinetic aura effect", error);
    });
    const next = await this.updateArkiusState(target, {
      kineticAura: {
        active: true,
        radius,
        templateId,
      },
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `<div class="ethernum-unique-chat-card ethernum-concordia-chat-card"><h3>Aura Cinética ativa</h3><p>Área cinética de ${radius} pés criada para Jacker. A aura é independente do Núcleo em Brasas.</p></div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async syncArkiusKineticAuraTemplate(actor?: Actor | null): Promise<string | undefined> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return undefined;
    }
    const templateId = await syncArkiusKineticAuraTemplate(target).catch(error => {
      console.warn("Ethernum RPG Module | Could not sync Arkius kinetic aura template", error);
      return undefined;
    });
    if (templateId) {
      const state = this.getArkiusState(target);
      if (state.kineticAura.templateId !== templateId) {
        await this.updateArkiusState(target, { kineticAura: { templateId } });
      }
    }
    return templateId;
  }

  static async toggleThermalNimbus(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (state.thermalNimbus.active) {
      await removeActorUniqueEffects(target, [ARKIUS_THERMAL_NIMBUS_EFFECT_SLUG]);
      const next = await this.updateArkiusState(target, {
        thermalNimbus: {
          active: false,
          appliedTurnKeys: {},
        },
      });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: target }),
        content: `<div class="ethernum-unique-chat-card ethernum-concordia-chat-card"><h3>Thermal Nimbus encerrada</h3><p>A nuvem térmica deixa de causar dano automático na Aura Cinética.</p></div>`,
      });
      refreshActorMechanicsViews(target);
      return next;
    }

    const radius = state.kineticAura.radius || ARKIUS_KINETIC_AURA_DISTANCE;
    let templateId = state.kineticAura.templateId;
    if (!state.kineticAura.active) {
      templateId = await createArkiusKineticAuraTemplate(target, radius).catch(error => {
        console.warn("Ethernum RPG Module | Could not create Arkius kinetic aura template for Thermal Nimbus", error);
        return undefined;
      });
      await applyArkiusKineticAuraEffect(target, radius).catch(error => {
        console.warn("Ethernum RPG Module | Could not apply Arkius kinetic aura effect for Thermal Nimbus", error);
      });
    } else {
      templateId = await this.syncArkiusKineticAuraTemplate(target) ?? templateId;
    }

    await applyArkiusNarrativeEffect(
      target,
      ARKIUS_THERMAL_NIMBUS_EFFECT_SLUG,
      "Thermal Nimbus",
      `<p>Inimigos que entram ou começam o turno na Aura Cinética sofrem ${getArkiusThermalNimbusDamage(target)} de dano de fogo. Aliados são ignorados pela automação.</p>`
    ).catch(error => console.warn("Ethernum RPG Module | Could not apply Thermal Nimbus effect", error));
    const next = await this.updateArkiusState(target, {
      kineticAura: {
        active: true,
        radius,
        templateId,
      },
      thermalNimbus: {
        active: true,
        appliedTurnKeys: {},
      },
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `<div class="ethernum-unique-chat-card ethernum-concordia-chat-card"><h3>Thermal Nimbus ativa</h3><p>Inimigos na Aura Cinética sofrem dano automático ao entrar ou iniciar o turno nela. Aliados são ignorados.</p></div>`,
    });
    await this.applyThermalNimbusToTokensInAura(target, "ativação");
    refreshActorMechanicsViews(target);
    return next;
  }

  static async toggleGateJunctionFire(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    const next = await this.updateArkiusState(target, {
      thermalNimbus: {
        fireAuraJunction: !state.thermalNimbus.fireAuraJunction,
      },
    });
    ui.notifications?.info(`Gate Junction de Fogo ${next.thermalNimbus.fireAuraJunction ? "ativada" : "desativada"}.`);
    refreshActorMechanicsViews(target);
    return next;
  }

  static async applyThermalNimbusToTokensInAura(actor: Actor, trigger = "aura", turnKeyOverride?: string): Promise<void> {
    const sourceToken = getActorToken(actor);
    if (!sourceToken) return;
    const state = this.getArkiusState(actor);
    if (!state.thermalNimbus.active || !state.kineticAura.active) return;
    for (const token of getCanvasTokenPlaceables()) {
      await this.applyThermalNimbusToToken(actor, token, trigger, turnKeyOverride);
    }
  }

  static async applyThermalNimbusToToken(actor: Actor, targetToken: unknown, trigger = "entrada na aura", turnKeyOverride?: string): Promise<boolean> {
    if (!game.user?.isGM || !game.combat) return false;
    const state = this.getArkiusState(actor);
    if (!state.thermalNimbus.active || !state.kineticAura.active) return false;
    const sourceToken = getActorToken(actor);
    const targetActor = getTokenLikeActor(targetToken);
    if (!sourceToken || !targetActor || targetActor.id === actor.id) return false;
    if (tokensAreAllied(sourceToken, targetToken)) return false;
    if (!tokenInArkiusKineticAura(sourceToken, targetToken, state.kineticAura.radius)) return false;

    const turnKey = turnKeyOverride ?? getCombatTurnKey() ?? `${game.combat.id ?? "combat"}:${game.combat.round ?? 0}`;
    const targetKey = getActorKey(targetActor);
    if (state.thermalNimbus.appliedTurnKeys[targetKey] === turnKey) return false;

    const baseDamage = getArkiusThermalNimbusDamage(actor);
    const junctionDamage = state.thermalNimbus.fireAuraJunction ? getArkiusThermalNimbusDamage(actor) : 0;
    const weakness = getArkiusTriggeredWeaknesses(targetActor, {
      fire: true,
      metal: state.nucleoEmBrasas.active,
    });
    const totalDamage = baseDamage + junctionDamage + weakness.total;
    const applied = await applyActorHpDelta(targetActor, -totalDamage).catch(error => {
      console.warn("Ethernum RPG Module | Could not apply Thermal Nimbus damage", error);
      return false;
    });

    await this.updateArkiusState(actor, {
      thermalNimbus: {
        appliedTurnKeys: {
          ...state.thermalNimbus.appliedTurnKeys,
          [targetKey]: turnKey,
        },
      },
    });
    await showArkiusThermalNimbusResult(actor, {
      sourceName: String(actor.name ?? "Arkius"),
      targetName: String(targetActor.name ?? "Alvo"),
      baseDamage,
      junctionDamage,
      weaknessDamage: weakness.total,
      weaknessLabels: weakness.labels,
      totalDamage,
      applied,
      trigger,
    });
    return true;
  }

  static async markPersistentFireProc(actor?: Actor | null): Promise<Roll | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (!state.nucleoEmBrasas.active) {
      ui.notifications?.warn("Núcleo em Brasas precisa estar ativo para usar o proc de fogo persistente.");
      return null;
    }
    if (state.nucleoEmBrasas.firstFireMetalProcUsed) {
      ui.notifications?.warn("O primeiro proc de fogo persistente já foi marcado neste Núcleo em Brasas.");
      return null;
    }
    const choice = await chooseTargetChoice("Núcleo em Brasas - fogo persistente", target, false);
    const roll = new Roll("2d6");
    await roll.evaluate();
    await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        firstFireMetalProcUsed: true,
      },
    });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      flavor: [
        "<strong>Núcleo em Brasas - fogo persistente</strong>",
        choice ? `Alvo: ${escapeHtml(choice.name)}` : "",
        "Aplique como 2d6 de fogo persistente ao primeiro alvo atingido por impulso ativo ou ataque com traço Fogo/Metal.",
      ].filter(Boolean).join("<br>"),
    });
    refreshActorMechanicsViews(target);
    return roll;
  }

  static async exaurirOSol(actor?: Actor | null): Promise<Roll | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (!state.nucleoEmBrasas.active) {
      ui.notifications?.warn("Exaurir o Sol exige Núcleo em Brasas ativo.");
      return null;
    }
    const solar = getArkiusSolarData(target, state);
    const area = getSelectedArkiusSolarArea(solar, state);
    const confirmed = await confirmArkiusSolarExecution(area, solar);
    if (!confirmed) return null;
    const templateResult = await createArkiusSolarTemplate(target, area).catch(error => {
      console.warn("Ethernum RPG Module | Could not create Arkius solar template", error);
      return null;
    });
    const adjustedTemplate = templateResult
      ? await waitForArkiusTemplateAdjustment(templateResult, area)
      : null;
    if (templateResult && !adjustedTemplate) return null;
    const roll = new Roll(solar.formula);
    await roll.evaluate();
    const finalTemplate = adjustedTemplate ?? templateResult;
    void this.playArkiusExaurirOSolAnimation(target, area, solar, finalTemplate?.templateDocument ?? null);
    const possibleTargets = findArkiusSolarTargets(target, finalTemplate);
    const selectedTargets = await confirmArkiusSolarTargets(possibleTargets, area);
    const targetResults = await resolveArkiusSolarTargetSaves(selectedTargets, solar.dc, Math.max(0, Math.floor(Number(roll.total ?? 0) || 0)));
    await removeActorUniqueEffects(target, [ARKIUS_NUCLEO_EFFECT_SLUG]);
    await applyArkiusNarrativeEffect(
      target,
      ARKIUS_END_CLUMSY_EFFECT_SLUG,
      "Desajeitado 2 — Exaurir o Sol",
      "<p>Exaurir o Sol encerrou Núcleo em Brasas. Arkius fica Desajeitado 2 até descanso curto de 10 minutos.</p>"
    ).catch(error => console.warn("Ethernum RPG Module | Could not apply Arkius clumsy after Exaurir", error));
    await applyArkiusNarrativeEffect(
      target,
      ARKIUS_DRAINED_EFFECT_SLUG,
      `Drenado ${solar.drainedValue} — Exaurir o Sol`,
      `<p>Exaurir o Sol aplica Drenado ${solar.drainedValue} até o próximo descanso longo.</p>`
    ).catch(error => console.warn("Ethernum RPG Module | Could not apply Arkius drained after Exaurir", error));
    await applyArkiusNarrativeEffect(
      target,
      ARKIUS_FIRE_METAL_LOCK_EFFECT_SLUG,
      "Impulsos de Fogo e Metal Bloqueados",
      "<p>Arkius perde acesso a todos os impulsos de Fogo e Metal até realizar descanso curto de 10 minutos.</p>"
    ).catch(error => console.warn("Ethernum RPG Module | Could not apply Arkius lock after Exaurir", error));
    await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        active: false,
        remainingRounds: 0,
        attunement: "none",
        pendingFluxoReduction: false,
        pendingBrasasDamage: false,
        lastCombatTurnKey: undefined,
        endedPenaltyActive: true,
        fireMetalImpulsesLocked: true,
        exaurirUsed: true,
      },
    });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      flags: { [ETHERNUM.MODULE_NAME]: { uniqueMechanics: "arkius-exaurir-o-sol" } } as Record<string, unknown>,
      flavor: buildArkiusSolarChatCard(target, solar, area, Math.max(0, Math.floor(Number(roll.total ?? 0) || 0)), targetResults, Boolean(finalTemplate)),
    });
    refreshActorMechanicsViews(target);
    return roll;
  }

  static async resilienciaReativa(actor?: Actor | null): Promise<Roll | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getArkiusState(target);
    if (state.bracoEvolutivo.chargesSpent >= state.bracoEvolutivo.maxCharges) {
      ui.notifications?.warn("Braço Evolutivo sem cargas até o próximo descanso curto.");
      return null;
    }
    const choice = await chooseTargetChoice("Resiliência Reativa", target, true);
    if (!choice) return null;
    const roll = new Roll(state.bracoEvolutivo.resistanceFormula);
    await roll.evaluate();
    const next = await this.updateArkiusState(target, {
      bracoEvolutivo: {
        chargesSpent: state.bracoEvolutivo.chargesSpent + 1,
      },
    });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      flavor: [
        "<strong>Braço Evolutivo - Resiliência Reativa</strong>",
        `Alvo protegido: ${escapeHtml(choice.name)}`,
        `Cargas restantes: ${next.bracoEvolutivo.maxCharges - next.bracoEvolutivo.chargesSpent}/${next.bracoEvolutivo.maxCharges}`,
        "A resistência vale contra a fonte do dano do ataque ou efeito gatilho. Preencha/aplique a fonte com o mestre.",
      ].join("<br>"),
    });
    refreshActorMechanicsViews(target);
    return roll;
  }

  static async shortRestReset(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    await removeActorUniqueEffects(target, [
      ARKIUS_NUCLEO_EFFECT_SLUG,
      ARKIUS_BRASAS_CLUMSY_EFFECT_SLUG,
      ARKIUS_END_CLUMSY_EFFECT_SLUG,
      ARKIUS_FIRE_METAL_LOCK_EFFECT_SLUG,
      ARKIUS_THERMAL_NIMBUS_EFFECT_SLUG,
    ]);
    const next = await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        active: false,
        remainingRounds: 0,
        attunement: "none",
        pendingFluxoReduction: false,
        pendingBrasasDamage: false,
        lastCombatTurnKey: undefined,
        endedPenaltyActive: false,
        fireMetalImpulsesLocked: false,
      },
      bracoEvolutivo: {
        chargesSpent: 0,
      },
      thermalNimbus: {
        active: false,
        appliedTurnKeys: {},
      },
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-concordia-chat-card">
          <h3>Descanso Curto — Arkius Jacker</h3>
          <p>Desajeitado 2 narrativo limpo, impulsos Fogo/Metal desbloqueados e cargas do Braço Evolutivo restauradas.</p>
        </div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async longRestReset(actor?: Actor | null): Promise<ArkiusJackerState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    await removeActorUniqueEffects(target, [
      ARKIUS_NUCLEO_EFFECT_SLUG,
      ARKIUS_BRASAS_CLUMSY_EFFECT_SLUG,
      ARKIUS_END_CLUMSY_EFFECT_SLUG,
      ARKIUS_FIRE_METAL_LOCK_EFFECT_SLUG,
      ARKIUS_DRAINED_EFFECT_SLUG,
      ARKIUS_THERMAL_NIMBUS_EFFECT_SLUG,
    ]);
    const next = await this.updateArkiusState(target, {
      nucleoEmBrasas: {
        active: false,
        remainingRounds: 0,
        attunement: "none",
        pendingFluxoReduction: false,
        pendingBrasasDamage: false,
        lastCombatTurnKey: undefined,
        endedPenaltyActive: false,
        fireMetalImpulsesLocked: false,
        usesSpent: 0,
        firstFireMetalProcUsed: false,
        exaurirUsed: false,
      },
      bracoEvolutivo: {
        chargesSpent: 0,
      },
      thermalNimbus: {
        active: false,
        appliedTurnKeys: {},
      },
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-concordia-chat-card">
          <h3>Descanso Longo — Arkius Jacker</h3>
          <p>Usos do Núcleo em Brasas restaurados e Drenado narrativo de Exaurir o Sol limpo.</p>
        </div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async handlePF2EChatMessage(message: ChatMessage): Promise<void> {
    if (game.system?.id !== "pf2e") return;
    if (isEthernumGeneratedMessage(message)) return;

    const attacker = getActorFromChatMessage(message);
    const isAttackRoll = isPF2EAttackRollMessage(message);
    const isDamageRoll = isPF2EDamageRollMessage(message);

    if (attacker && this.getState(attacker).activeProfile === ARKIUS_JACKER_PROFILE_ID) {
      const arkiusState = this.getArkiusState(attacker);
      if (
        isAttackRoll
        && arkiusState.nucleoEmBrasas.pendingFluxoReduction
        && isArkiusEligibleImpulseChatMessage(message, { fluxo: true })
      ) {
        await this.consumeSintoniaFluxo(attacker, {
          abilityName: getArkiusChatActionLabel(message),
          originalActions: 2,
          auto: true,
        });
      }
      if (
        isDamageRoll
        && arkiusState.nucleoEmBrasas.pendingBrasasDamage
        && isArkiusEligibleImpulseChatMessage(message)
      ) {
        const baseDie = detectDamageDieFromChatMessage(message);
        const baseFormula = detectDamageFormulaFromChatMessage(message);
        const corrected = boostArkiusBrasasFormula(baseFormula, baseDie);
        await this.consumeSintoniaBrasas(attacker, {
          abilityName: getArkiusChatActionLabel(message),
          baseFormula,
          baseDie,
          correctedFormula: corrected.correctedFormula,
          boostedDie: corrected.boostedDie,
          damageType: "fogo/metal",
          auto: true,
        });
      }
    }

    if (!isAttackRoll) return;

    const targetRefs = chatMessageTargetRefs(message);
    const touchedActors = new Set<Actor>();

    if (attacker && this.getState(attacker).activeProfile === GYRO_PROFILE_ID) {
      await this.removeGyroProportionMarkAttackEffect(attacker);
      touchedActors.add(attacker);
    }

    if (!isPF2EHitMessage(message)) {
      touchedActors.forEach(refreshActorMechanicsViews);
      return;
    }

    if (attacker) {
      const attackerProfile = this.getState(attacker).activeProfile;
      if (attackerProfile === GYRO_PROFILE_ID) {
        const gyroState = this.getGyroState(attacker);
        const markedHit = gyroState.proportionMarkTargetId
          ? Array.from(targetRefs).some(ref => ref.includes(gyroState.proportionMarkTargetId as string) || ref === gyroState.proportionMarkTargetId)
          : false;
        await this.gainGyroSP(attacker, markedHit ? 2 : 1, "");
        if (markedHit) ui.notifications?.info(`${attacker.name}: +2 SP por acerto contra alvo marcado.`);
        touchedActors.add(attacker);
      }
      if (attackerProfile === BAYLE_PROFILE_ID) {
        await this.adjustBayleArdor(attacker, 1);
        ui.notifications?.info(`${attacker.name}: +1 Ardor por acertar.`);
        touchedActors.add(attacker);
      }
      if (attackerProfile === PIPPING_PROFILE_ID) {
        const pippingState = this.getPippingState(attacker);
        await this.updatePippingState(attacker, { pulse: clamp(pippingState.pulse + 1, 0, 6) });
        ui.notifications?.info(`${attacker.name}: +1 Pulso Sombrio por acertar.`);
        touchedActors.add(attacker);
      }
    }

    if (targetRefs.size > 0) {
      for (const actor of game.actors ?? []) {
        if ((actor.type as string) !== "character") continue;
        if (this.getState(actor).activeProfile !== BAYLE_PROFILE_ID) continue;
        if (attacker?.id && actor.id === attacker.id) continue;
        if (!targetRefsIncludeActor(targetRefs, actor)) continue;
        await this.adjustBayleArdor(actor, 1);
        ui.notifications?.info(`${actor.name}: +1 Ardor por ser acertado.`);
        touchedActors.add(actor);
      }
    }
    touchedActors.forEach(refreshActorMechanicsViews);
  }

  static async handleCombatTurnAdvance(combat: Combat): Promise<void> {
    if (!game.user?.isGM) return;
    const combatData = combat as Combat & { combatant?: { actor?: Actor }; turn?: number };
    await this.handleArkiusThermalNimbusTurnStart(combat);
    await this.handleYuCombatTurnAdvance(combat);
    const actor = combatData.combatant?.actor;
    if (!actor || (actor.type as string) !== "character") return;
    if (this.getState(actor).activeProfile !== ARKIUS_JACKER_PROFILE_ID) return;

    const state = this.getArkiusState(actor);
    if (!state.nucleoEmBrasas.active || state.nucleoEmBrasas.combatId !== combat.id) return;

    const turnKey = getCombatTurnKey() ?? `${combat.id ?? "combat"}:${combat.round ?? 0}:${combatData.turn ?? 0}`;
    if (state.nucleoEmBrasas.lastCombatTurnKey === turnKey) return;

    await removeActorUniqueEffects(actor, [ARKIUS_BRASAS_CLUMSY_EFFECT_SLUG]).catch(error => {
      console.warn("Ethernum RPG Module | Could not clear Arkius Brasas turn penalty", error);
    });

    const remainingRounds = Math.max(0, state.nucleoEmBrasas.remainingRounds - 1);
    if (remainingRounds <= 0) {
      await this.endNucleoEmBrasas(actor);
      return;
    }

    await this.updateArkiusState(actor, {
      nucleoEmBrasas: {
        remainingRounds,
        attunement: "none",
        pendingFluxoReduction: false,
        pendingBrasasDamage: false,
        lastCombatTurnKey: turnKey,
      },
    });
    refreshActorMechanicsViews(actor);
  }

  static getActiveThermalNimbusActors(): Actor[] {
    return Array.from(game.actors ?? []).filter(actor => {
      if ((actor.type as string) !== "character") return false;
      if (this.getState(actor).activeProfile !== ARKIUS_JACKER_PROFILE_ID) return false;
      const state = this.getArkiusState(actor);
      return state.thermalNimbus.active && state.kineticAura.active;
    });
  }

  static async handleArkiusThermalNimbusTurnStart(combat: Combat): Promise<void> {
    if (!game.user?.isGM) return;
    const targetToken = (combat as Combat & { combatant?: { token?: unknown; tokenId?: string; actor?: Actor } }).combatant?.token;
    const targetActor = (combat as Combat & { combatant?: { actor?: Actor } }).combatant?.actor;
    if (!targetActor) return;
    const token = targetToken ?? getActorToken(targetActor);
    if (!token) return;
    const turnKey = getCombatTurnKeyFor(combat);
    for (const actor of this.getActiveThermalNimbusActors()) {
      await this.applyThermalNimbusToToken(actor, token, "início do turno", turnKey);
    }
  }

  static async handleTokenUpdate(tokenDocument: unknown, changed: unknown): Promise<void> {
    if (!game.user?.isGM) return;
    const changes = asRecord(changed);
    const moved = "x" in changes || "y" in changes || "elevation" in changes;
    if (!moved) return;
    const movedActor = getTokenLikeActor(tokenDocument);
    for (const actor of this.getActiveThermalNimbusActors()) {
      if (movedActor?.id === actor.id) {
        await this.syncArkiusKineticAuraTemplate(actor);
        await this.applyThermalNimbusToTokensInAura(actor, "aura movida");
      } else {
        await this.applyThermalNimbusToToken(actor, tokenDocument, "entrada na aura");
      }
    }
  }

  static async showYuStatus(actor?: Actor | null, title = "Yu, Jiu Ji Tae — Rage in the Flesh"): Promise<void> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return;
    }
    await this.setActiveProfile(target, YU_JIU_JI_TAE_PROFILE_ID);
    const state = this.getYuState(target);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-yu-chat-card">
          <h3>${escapeHtml(title)}</h3>
          <p><strong>Postura:</strong> ${state.active ? "Ativa" : "Inativa"} · <strong>Usos:</strong> ${state.usesSpent}/${state.maxUses}</p>
          <p><strong>Rodadas restantes:</strong> ${state.remainingRounds}/${YU_RAGE_MAX_ROUNDS} · <strong>Emergência:</strong> ${state.emergencyTriggered ? "acionada" : "disponível se houver uso"}</p>
          <p><strong>Enquanto ativa:</strong> imune a Frightened, resistência mental 5, +1 status na CA e bônus de Força Bruta em Strikes desarmados.</p>
          <p><strong>Colapso:</strong> Drenado 1 até descanso curto e Enfeebled 2 por 1 minuto ao encerrar.</p>
        </div>`,
    });
  }

  static async activateYuRage(actor?: Actor | null, emergency = false): Promise<YuRageState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getYuState(target);
    if (state.active) return state;
    if (state.usesSpent >= state.maxUses) {
      if (!emergency) ui.notifications?.warn("Rage in the Flesh sem usos até o próximo descanso longo.");
      return state;
    }

    const combat = game.combat;
    const turnKey = getCombatTurnKey() ?? undefined;
    const next = await this.updateYuState(target, {
      active: true,
      usesSpent: state.usesSpent + 1,
      remainingRounds: YU_RAGE_MAX_ROUNDS,
      combatId: combat?.id,
      lastCombatTurnKey: turnKey,
      emergencyTriggered: emergency || state.emergencyTriggered,
    });
    await applyYuRageEffect(target).catch(error => {
      console.warn("Ethernum RPG Module | Could not apply Yu Rage effect", error);
      ui.notifications?.warn("Rage in the Flesh ativada, mas o efeito PF2e não pôde ser criado.");
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-yu-chat-card">
          <h3>${emergency ? "Gatilho de Emergência" : "Rage in the Flesh"}</h3>
          <p><strong>Ativação:</strong> ${emergency ? "ação gratuita automática" : "1 ação"} · <strong>Duração:</strong> 1 minuto.</p>
          <p>Yu entra em sobrecarga física: imune a Frightened, resistência mental 5, +1 status na CA e Força Bruta em Strikes desarmados.</p>
          <p><strong>Uso:</strong> ${next.usesSpent}/${next.maxUses} até o próximo descanso longo.</p>
        </div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async endYuRage(actor?: Actor | null): Promise<YuRageState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getYuState(target);
    if (!state.active) return state;
    await applyYuCollapseEffects(target).catch(error => {
      console.warn("Ethernum RPG Module | Could not apply Yu collapse effects", error);
    });
    const next = await this.updateYuState(target, {
      active: false,
      remainingRounds: 0,
      lastCombatTurnKey: undefined,
      collapseDrainedActive: true,
      collapseEnfeebledActive: true,
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-yu-chat-card">
          <h3>Colapso Neural</h3>
          <p>Rage in the Flesh termina. Yu sofre <strong>Drenado 1</strong> até descanso curto e <strong>Enfeebled 2</strong> por 1 minuto.</p>
        </div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async toggleYuRage(actor?: Actor | null): Promise<YuRageState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getYuState(target);
    return state.active ? this.endYuRage(target) : this.activateYuRage(target);
  }

  static async adjustYuRounds(actor?: Actor | null, amount = 0): Promise<YuRageState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getYuState(target);
    const next = await this.updateYuState(target, {
      remainingRounds: clamp(state.remainingRounds + amount, 0, YU_RAGE_MAX_ROUNDS),
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async rollYuFlurryFear(actor?: Actor | null): Promise<Roll | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getYuState(target);
    if (!state.active) {
      ui.notifications?.warn("Rage in the Flesh precisa estar ativa para usar Sobrecarga de Medo.");
      return null;
    }
    const choice = await chooseTargetChoice("Sobrecarga de Medo", target);
    if (!choice) return null;
    const dc = getActorClassOrKineticDC(target);
    const modifier = getActorSaveModifier(choice.actor, "will");
    const roll = new Roll(`1d20 + ${modifier}`);
    await roll.evaluate();
    const total = Number(roll.total ?? 0);
    const natural = getRollNaturalD20(roll);
    const degree = getBasicSaveDegree(total, dc, natural);
    const frightened = degree === "Falha crítica" ? 3 : degree === "Falha" ? 2 : 0;
    let conditionApplied = false;
    if (frightened > 0) {
      conditionApplied = await tryIncreaseActorCondition(choice.actor, "frightened", frightened);
      if (!conditionApplied) {
        await applyYuNarrativeEffect(
          choice.actor,
          YU_FLURRY_FEAR_EFFECT_SLUG,
          `Sobrecarga de Medo — Frightened ${frightened}`,
          `<p>${escapeHtml(choice.name)} falhou contra Sobrecarga de Medo de ${escapeHtml(target.name ?? "Yu")}. Aplique Frightened ${frightened}; criaturas imunes a medo ignoram este efeito.</p>`,
          { value: 1, unit: "rounds", sustained: false, expiry: "turn-end" }
        ).catch(error => console.warn("Ethernum RPG Module | Could not apply Yu fear effect", error));
      }
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card ethernum-yu-chat-card">
          <h3>Sobrecarga de Medo</h3>
          <p><strong>Alvo:</strong> ${escapeHtml(choice.name)} · <strong>Vontade:</strong> ${total}${natural ? ` (d20 ${natural})` : ""} vs CD ${dc}</p>
          <p><strong>Resultado:</strong> ${escapeHtml(degree)}${frightened > 0 ? ` · Frightened ${frightened}${conditionApplied ? " aplicado" : " para aplicar"}` : " · sem efeito"}</p>
          <p>Criaturas imunes a medo ignoram este efeito completamente.</p>
        </div>`,
    });
    return roll;
  }

  static async rollYuStunningFistDamage(actor?: Actor | null): Promise<Roll | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    const state = this.getYuState(target);
    if (!state.active) ui.notifications?.warn("Rage in the Flesh não está ativa; role apenas se o mestre confirmar o gatilho.");
    const roll = new Roll("2d10");
    await roll.evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      flags: { [ETHERNUM.MODULE_NAME]: { uniqueMechanics: "yu-stunning-fist" } } as Record<string, unknown>,
      flavor: `
        <div class="ethernum-unique-chat-card ethernum-yu-chat-card">
          <h3>Stunning Fist — Força Neural</h3>
          <p>Se Stunning Fist foi aplicado com sucesso, o Strike que aplicou causa <strong>+2d10 de dano contundente</strong>.</p>
        </div>`,
    });
    return roll;
  }

  static async yuShortRestReset(actor?: Actor | null): Promise<YuRageState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    await removeActorUniqueEffects(target, [YU_COLLAPSE_DRAINED_EFFECT_SLUG, YU_COLLAPSE_ENFEEBLED_EFFECT_SLUG]);
    const next = await this.updateYuState(target, {
      collapseDrainedActive: false,
      collapseEnfeebledActive: false,
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `<div class="ethernum-unique-chat-card ethernum-yu-chat-card"><h3>Descanso curto — Yu</h3><p>Colapso Neural narrativo limpo. O uso de Rage in the Flesh só retorna no descanso longo.</p></div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async yuLongRestReset(actor?: Actor | null): Promise<YuRageState | null> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }
    await removeActorUniqueEffects(target, [YU_RAGE_EFFECT_SLUG, YU_COLLAPSE_DRAINED_EFFECT_SLUG, YU_COLLAPSE_ENFEEBLED_EFFECT_SLUG]);
    const next = await this.updateYuState(target, {
      active: false,
      usesSpent: 0,
      remainingRounds: 0,
      combatId: undefined,
      lastCombatTurnKey: undefined,
      emergencyTriggered: false,
      collapseDrainedActive: false,
      collapseEnfeebledActive: false,
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `<div class="ethernum-unique-chat-card ethernum-yu-chat-card"><h3>Descanso longo — Yu</h3><p>Rage in the Flesh restaurada e Colapso Neural limpo.</p></div>`,
    });
    refreshActorMechanicsViews(target);
    return next;
  }

  static async handleYuCombatTurnAdvance(combat: Combat): Promise<void> {
    if (!game.user?.isGM) return;
    const combatData = combat as Combat & { combatant?: { actor?: Actor }; turn?: number };
    const actor = combatData.combatant?.actor;
    if (!actor || (actor.type as string) !== "character") return;
    if (this.getState(actor).activeProfile !== YU_JIU_JI_TAE_PROFILE_ID) return;
    const state = this.getYuState(actor);
    if (!state.active || (state.combatId && state.combatId !== combat.id)) return;
    const turnKey = getCombatTurnKeyFor(combat);
    if (state.lastCombatTurnKey === turnKey) return;
    if (state.remainingRounds <= 1) {
      await this.endYuRage(actor);
      return;
    }
    await this.updateYuState(actor, {
      combatId: combat.id ?? undefined,
      remainingRounds: state.remainingRounds - 1,
      lastCombatTurnKey: turnKey,
    });
    refreshActorMechanicsViews(actor);
  }

  static async handleYuActorUpdate(actor: Actor, changed: unknown): Promise<void> {
    if (!game.user?.isGM || (actor.type as string) !== "character") return;
    if (this.getState(actor).activeProfile !== YU_JIU_JI_TAE_PROFILE_ID) return;
    const changedText = JSON.stringify(changed ?? {}).toLowerCase();
    if (!changedText.includes("hp")) return;
    const hp = getActorHpSnapshot(actor);
    if (!hp) return;
    const state = this.getYuState(actor);
    if (state.active && hp.value <= 0) {
      await this.endYuRage(actor);
      return;
    }
    if (!state.active && state.usesSpent < state.maxUses && hp.value > 0 && hp.value <= Math.floor(hp.max * 0.3)) {
      await this.activateYuRage(actor, true);
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

  static async notifyConcordiaArkiusStandby(action: string, actor?: Actor | null): Promise<void> {
    const target = actor ?? getControlledActor();
    if (!target) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return;
    }
    await this.setActiveProfile(target, ARKIUS_JACKER_PROFILE_ID);
    ui.notifications?.info(`${action}: callback legado mantido. A mecânica principal de Arkius agora é Núcleo em Brasas.`);
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

  static async playArkiusExaurirOSolAnimation(
    actor: Actor,
    area: ArkiusSolarArea,
    solar: ArkiusSolarData,
    templateDocument?: unknown | null
  ): Promise<boolean> {
    if (!isSequencerActive()) return false;
    const token = getActorToken(actor);
    if (!token) return false;
    const files = getArkiusAnimationFiles(area);
    if (!files) return false;
    const SequenceCtor = (globalThis as { Sequence?: new (options?: Record<string, unknown>) => unknown }).Sequence;
    if (!SequenceCtor) return false;

    try {
      const sequence = new SequenceCtor({ moduleName: ETHERNUM.MODULE_NAME, softFail: true }) as {
        effect: () => Record<string, unknown>;
        play: () => Promise<unknown> | unknown;
      };
      const chainEffect = (effect: Record<string, unknown>, calls: Array<[string, ...unknown[]]>) => {
        let current = effect;
        for (const [method, ...args] of calls) {
          const fn = current[method];
          if (typeof fn !== "function") continue;
          const next = (fn as (...callArgs: unknown[]) => unknown).apply(current, args);
          if (next && typeof next === "object") current = next as Record<string, unknown>;
        }
      };

      chainEffect(sequence.effect() as Record<string, unknown>, [
        ["file", files.charge],
        ["atLocation", token],
        ["fadeIn", 120],
        ["duration", 1400],
        ["fadeOut", 450],
        ["opacity", 0.78],
        ["scaleToObject", 1.8],
        ["rotateIn", 180, 900],
        ["scaleIn", 0.35, 220],
        ["belowTokens"],
      ]);

      chainEffect(sequence.effect() as Record<string, unknown>, [
        ["file", files.release],
        ["atLocation", templateDocument ?? token],
        ["fadeIn", 80],
        ["delay", 420],
        ["duration", area.id === "emanation" ? 1800 : 1350],
        ["fadeOut", 700],
        ["opacity", 0.86],
        ["scaleToObject", area.id === "emanation" ? Math.max(2, area.distance / 10) : Math.max(1.4, area.distance / 20)],
        ["rotate", area.id === "emanation" ? 0 : undefined],
      ].filter(call => call[1] !== undefined) as Array<[string, ...unknown[]]>);

      void solar;
      await sequence.play();
      return true;
    } catch (error) {
      console.warn("Ethernum RPG Module | Arkius Sequencer animation failed", error);
      return false;
    }
  }

  static async resolveGyroTechniqueOutcome(actor: Actor, technique: GyroTechnique, state: GyroSpinState): Promise<void> {
    if (technique.id === "proportion-mark") {
      const choice = await chooseTargetChoice("Marca da Proporção", actor, false);
      if (!choice) return;
      await this.updateGyroState(actor, { proportionMarkTargetId: choice.actorKey });
      await this.applyGyroProportionMarkAttackEffect(actor, choice);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="ethernum-unique-chat-card">
            <h3>Marca da Proporção</h3>
            <p><strong>Alvo marcado:</strong> ${escapeHtml(choice.name)}</p>
            <p>Um efeito PF2e foi criado em Gyro: o próximo Strike recebe +2 de circunstância. Acertos contra o alvo marcado geram +1 SP adicional.</p>
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
    const arkiusState = this.getArkiusState(actor);
    const yuState = this.getYuState(actor);
    const actorLevel = getActorLevel(actor);
    const maxSP = this.calculateGyroMaxSP(actor, gyroState);
    const rank = this.getGyroRank(gyroState.currentSP, gyroState);
    const spinPercent = maxSP > 0 ? Math.round((gyroState.currentSP / maxSP) * 100) : 0;
    const executionModes = this.buildGyroExecutionModes(actor, gyroState, "forced");
    const bayleStage = getBayleStageData(bayleState.stage);
    const bayleLightningRemaining = Math.max(0, bayleStage.lightningCharges - bayleState.lightningChargesUsed);
    const arkiusSolar = getArkiusSolarData(actor, arkiusState);
    const arkiusSolarSheet = {
      ...arkiusSolar,
      areas: arkiusSolar.areas.map(area => ({
        ...area,
        selected: area.id === arkiusState.nucleoEmBrasas.selectedSolarArea,
        icon: area.id === "emanation" ? "fa-circle-dot" : area.id === "cone" ? "fa-caret-up" : "fa-grip-lines",
      })),
    };
    const arkiusUsesRemaining = Math.max(0, arkiusState.nucleoEmBrasas.maxUses - arkiusState.nucleoEmBrasas.usesSpent);
    const arkiusBracoChargesRemaining = Math.max(0, arkiusState.bracoEvolutivo.maxCharges - arkiusState.bracoEvolutivo.chargesSpent);
    const yuUsesRemaining = Math.max(0, yuState.maxUses - yuState.usesSpent);
    const yuPercent = Math.round((yuState.remainingRounds / YU_RAGE_MAX_ROUNDS) * 100);
    const arkiusAttunementLabels: Record<ArkiusAttunement, string> = {
      none: "Nenhuma",
      fluxo: "Fluxo",
      brasas: "Brasas",
    };
    const arkiusAspects = [
      {
        id: "chains",
        label: "Correntes Douradas",
        icon: "fas fa-link",
        text: "Núcleo negro com correntes e juramentos metálicos.",
        active: arkiusState.concordiaAspect === "chains",
      },
      {
        id: "ruby",
        label: "Escamas Rubras",
        icon: "fas fa-dragon",
        text: "Brasa dracônica, escamas rubras e calor predatório.",
        active: arkiusState.concordiaAspect === "ruby",
      },
      {
        id: "convergence",
        label: "Convergência",
        icon: "fas fa-circle-nodes",
        text: "Corrente, brasa e rubro unidos no mesmo pulso.",
        active: arkiusState.concordiaAspect === "convergence",
      },
    ] satisfies Array<{ id: ArkiusConcordiaAspect; label: string; icon: string; text: string; active: boolean }>;
    const campaignCores = Object.values(ETHERNUM.CAMPAIGN_CORES).map(core => ({
      ...core,
      active: core.id === state.activeCore,
    }));
    const ethernumCompanyProfiles = [
      { id: "", label: game.i18n!.localize("ETHERNUM.Unique.Profile.None") },
      { id: GYRO_PROFILE_ID, label: "Gyro Zeppeli - Via da Rotação Sagrada" },
      { id: BAYLE_PROFILE_ID, label: "Bayle, o Horror - Corpo Dracônico" },
      { id: PIPPING_PROFILE_ID, label: "Pipping Baldwin Black - Expressão da Noite" },
      { id: "kaitake", label: "Kaitake - Mecânica em preparação" },
      { id: "cinerio", label: "Cinério - Mecânica em preparação" },
      { id: "ailan", label: "Ailan - Mecânica em preparação" },
    ];
    const concordiaProfiles = [
      { id: "", label: game.i18n!.localize("ETHERNUM.Unique.Profile.None") },
      { id: ARKIUS_JACKER_PROFILE_ID, label: "Arkius Jacker - Concórdia" },
      { id: "atlas-sidarta", label: "Atlas Sidarta - Mecânica em preparação" },
      { id: "charles", label: "Charles - Mecânica em preparação" },
      { id: "morgana", label: "Morgana - Mecânica em preparação" },
      { id: YU_JIU_JI_TAE_PROFILE_ID, label: "Yu, Jiu Ji Tae - Rage in the Flesh" },
      { id: "unluck", label: "Unluck - Mecânica em preparação" },
    ];
    const placeholderLabels: Record<string, string> = {
      kaitake: "Kaitake",
      cinerio: "Cinério",
      ailan: "Ailan",
      "atlas-sidarta": "Atlas Sidarta",
      charles: "Charles",
      morgana: "Morgana",
      "yu-jiu-ji-tae": "Yu, Jiu Ji Tae",
      unluck: "Unluck",
    };
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
      activeCore: state.activeCore,
      activeProfile: state.activeProfile,
      activeCoreConfig: ETHERNUM.CAMPAIGN_CORES[state.activeCore],
      campaignCores,
      isEthernumCompanyCore: state.activeCore === ETHERNUM_COMPANY_CORE_ID,
      isConcordiaCore: state.activeCore === CONCORDIA_CORE_ID,
      isGM,
      companyLogoAsset: ETHERNUM_COMPANY_LOGO_ASSET,
      profiles: state.activeCore === CONCORDIA_CORE_ID ? concordiaProfiles : ethernumCompanyProfiles,
      placeholderProfile: PLACEHOLDER_PROFILE_IDS.includes(state.activeProfile as typeof PLACEHOLDER_PROFILE_IDS[number])
        ? {
          id: state.activeProfile,
          label: placeholderLabels[state.activeProfile] ?? String(state.activeProfile),
          coreLabel: ETHERNUM.CAMPAIGN_CORES[state.activeCore].shortLabel,
        }
        : null,
      concordia: {
        arkius: {
          state: arkiusState,
          assets: {
            wide: ARKIUS_FRAME_WIDE_ASSET,
            tall: ARKIUS_FRAME_TALL_ASSET,
            balanced: ARKIUS_FRAME_BALANCED_ASSET,
            icon: ARKIUS_ICON_ASSET,
          },
          statusLabel: arkiusState.nucleoEmBrasas.active ? "Ativo" : "Inativo",
          usesRemaining: arkiusUsesRemaining,
          nucleoPercent: Math.round((arkiusState.nucleoEmBrasas.remainingRounds / ARKIUS_NUCLEO_MAX_ROUNDS) * 100),
          maxRounds: ARKIUS_NUCLEO_MAX_ROUNDS,
          kineticAuraLabel: arkiusState.kineticAura.active ? `Aura ${arkiusState.kineticAura.radius} ft` : "Aura inativa",
          thermalNimbusLabel: arkiusState.thermalNimbus.active
            ? `Thermal Nimbus ${getArkiusThermalNimbusDamage(actor)} fogo${arkiusState.thermalNimbus.fireAuraJunction ? " + Junction" : ""}`
            : "Thermal Nimbus inativa",
          aspects: arkiusAspects,
          activeAspectClass: `aspect-${arkiusState.concordiaAspect}`,
          attunementLabel: arkiusAttunementLabels[arkiusState.nucleoEmBrasas.attunement],
          firstProcLabel: arkiusState.nucleoEmBrasas.firstFireMetalProcUsed ? "Usado" : "Disponível",
          solar: arkiusSolarSheet,
          bracoChargesRemaining: arkiusBracoChargesRemaining,
          macroSlots: [
            "await game.ethernum.macros.concordia.arkius.showStatus();",
            "await game.ethernum.macros.concordia.arkius.toggleNucleoEmBrasas();",
            "await game.ethernum.macros.concordia.arkius.setSintoniaFluxo();",
            "await game.ethernum.macros.concordia.arkius.setSintoniaBrasas();",
            "await game.ethernum.macros.concordia.arkius.consumeSintoniaFluxo();",
            "await game.ethernum.macros.concordia.arkius.consumeSintoniaBrasas();",
            "await game.ethernum.macros.concordia.arkius.setSolarArea(\"cone\");",
            "await game.ethernum.macros.concordia.arkius.toggleKineticAura();",
            "await game.ethernum.macros.concordia.arkius.toggleThermalNimbus();",
            "await game.ethernum.macros.concordia.arkius.toggleGateJunctionFire();",
            "await game.ethernum.macros.concordia.arkius.clearThermalNimbusAura();",
            "await game.ethernum.macros.concordia.arkius.markPersistentFireProc();",
            "await game.ethernum.macros.concordia.arkius.exaurirOSol();",
            "await game.ethernum.macros.concordia.arkius.resilienciaReativa();",
            "await game.ethernum.macros.concordia.arkius.shortRestReset();",
            "await game.ethernum.macros.concordia.arkius.longRestReset();",
          ],
        },
        yu: {
          state: yuState,
          statusLabel: yuState.active ? "Ativo" : "Inativo",
          usesRemaining: yuUsesRemaining,
          ragePercent: yuPercent,
          maxRounds: YU_RAGE_MAX_ROUNDS,
          dc: getActorClassOrKineticDC(actor),
          passives: [
            "Imune a Frightened enquanto a postura estiver ativa.",
            "Strikes desarmados ganham +1 dado de dano, +1 dano e +1 status na CA.",
            "Resistência 5 a dano mental.",
          ],
          flurry: [
            "Após Flurry of Blows, escolha um alvo e role Vontade contra sua CD de Classe.",
            "Falha: Frightened 2.",
            "Falha crítica: Frightened 3.",
            "Criaturas imunes a medo ignoram este efeito completamente.",
          ],
          stunning: [
            "Se Stunning Fist for aplicado com sucesso em um dos ataques, o Strike que aplicou causa +2d10 contundente.",
            "Use o botão +2d10 quando o mestre confirmar o gatilho.",
          ],
          collapse: [
            "Ao término da postura, Yu sofre Drenado 1 até o próximo descanso curto de 10 minutos.",
            "Também sofre Enfeebled 2 por 1 minuto completo.",
            "A postura encerra ao cair inconsciente.",
          ],
          macroSlots: [
            "await game.ethernum.macros.concordia.yu.showStatus();",
            "await game.ethernum.macros.concordia.yu.toggleRage();",
            "await game.ethernum.macros.concordia.yu.flurryFear();",
            "await game.ethernum.macros.concordia.yu.stunningFistDamage();",
            "await game.ethernum.macros.concordia.yu.shortRestReset();",
            "await game.ethernum.macros.concordia.yu.longRestReset();",
          ],
        },
      },
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
