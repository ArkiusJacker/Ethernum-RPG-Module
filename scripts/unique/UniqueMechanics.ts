import { ETHERNUM } from '../config.js';

export type UniqueMechanicProfileId = "" | "gyro-spin";
export type GyroMainAttribute = "dex" | "wis";
export type GyroProficiencyRank = "trained" | "expert" | "master" | "legendary";
export type GyroExecutionMode = "stable" | "forced" | "corpse" | "perfect";

export const GYRO_PROFILE_ID: UniqueMechanicProfileId = "gyro-spin";
export const GYRO_SPINBALL_ASSET = `modules/${ETHERNUM.MODULE_NAME}/assets/unique/spinball.png`;

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
  spGainedThisRound?: number;
  lastSPRoundKey?: string;
}

interface GyroTechnique {
  id: string;
  name: string;
  cost: number;
  source: string;
  actions: string;
  description: string;
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
    text: "As Partes do Cadáver respondem quando ao menos um IKON foi liberado.",
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
    actions: "1 ação",
    description: "Ataque básico à distância com as esferas de aço.",
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
    actions: "1 ação",
    description: "A esfera quica em parede, chão, arma, escudo ou criatura.",
    options: [
      "Acertar alvo com cobertura total ou parcial",
      "Mudar o ângulo do ataque",
      "Atacar segundo alvo com dano reduzido",
      "Forçar inimigo a mudar posição",
    ],
    defaultMode: "forced",
    requiredLevel: 3,
  },
  {
    id: "medicinal-spin",
    name: "Rotação Medicinal",
    cost: 2,
    source: "Técnica",
    actions: "2 ações",
    description: "Gyro usa a rotação para corrigir ossos, músculos e fluxo sanguíneo.",
    options: [
      "Curar 1d6 + modificador principal",
      "Remover Sangrando",
      "Reduzir uma penalidade física em 1",
      "Acordar aliado inconsciente com 1 HP",
      "Estabilizar criatura morrendo",
    ],
    defaultMode: "forced",
    requiredLevel: 3,
  },
  {
    id: "rotating-jaw",
    name: "Mandíbula Giratória",
    cost: 2,
    source: "Técnica",
    actions: "1 ação",
    description: "Ao acertar cabeça, pescoço ou mandíbula, o alvo faz Fortitude contra a CD do mestre.",
    options: [
      "-2 em ataques por 1 rodada",
      "Stupefied 1 em falha",
      "Conjuração exige teste simples em falha crítica",
      "Perde a reação até o próximo turno",
      "Fica Vulnerável ao próximo ataque de Spin",
    ],
    defaultMode: "forced",
    requiredLevel: 3,
  },
  {
    id: "proportion-mark",
    name: "Marca da Proporção",
    cost: 1,
    source: "Técnica",
    actions: "1 ação",
    description: "Gyro marca um alvo com vibração invisível por 1 cena.",
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
    actions: "1 ação",
    description: "Reduz cobertura em 1 passo. Cobertura total só pode ser contornada com linha plausível de ricochete.",
    options: [],
    defaultMode: "corpse",
    requiredIkon: "I",
  },
  {
    id: "trajectory-perfect",
    name: "Trajetória Perfeita",
    cost: 3,
    source: "IKON I",
    actions: "ação livre",
    description: "Por 1 rodada, o próximo ricochete de Gyro reduz cobertura em 1 passo e pode encadear 1 alvo adicional distinto.",
    options: [],
    defaultMode: "corpse",
    requiredIkon: "I",
    requiredLevel: 3,
  },
  {
    id: "paralyzing-frequency",
    name: "Freq. Paralisante",
    cost: 2,
    source: "IKON II",
    actions: "1 ação",
    description: "Alvo faz salvo de Constituição. Falha reduz velocidade; falha crítica zera velocidade.",
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
    actions: "2 ações",
    description: "Por 1 minuto, habilidades de Rotação custam -1 SP, mínimo 0.",
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
    actions: "reação",
    description: "1x/rodada: +2 CA contra ataque físico à distância ou reduz dano por 2 + nível. Se reduzir a 0, pode ricochetear.",
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
    actions: "2 ações",
    description: "Recarrega o Ball Breaker Devastador.",
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
    actions: "ação livre",
    description: "6d10 de força. Ignora resistência física/força até o nível de Gyro. Imunidade exige clímax narrativo.",
    options: [],
    defaultMode: "perfect",
    requiredIkon: "VIII",
    requiredLevel: 12,
  },
  {
    id: "saints-hand",
    name: "Mão do Santo",
    cost: 10,
    source: "IKON IX",
    actions: "ação livre",
    description: "Por 3 rodadas, 1x/rodada, Gyro trata uma técnica como desbloqueada, mas ainda paga SP e rola Controle.",
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
    actions: "GM / narrativo",
    description: "1x por arco. Altera uma regra da cena em clímax narrativo. Não é botão comum de combate.",
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
  const jb2aActive = game.modules?.get("JB2A_DnD5e")?.active ?? false;
  const jb2aFiles: Record<typeof variant, string> = {
    technique: "modules/JB2A_DnD5e/Library/Generic/Magic_Signs/ConjurationCircleComplete_02_Regular_Yellow_800x800.webm",
    deviation: "modules/JB2A_DnD5e/Library/Generic/Explosion/Explosion_05_Regular_Orange_400x400.webm",
    status: "modules/JB2A_DnD5e/Library/TMFX/OutPulse/Circle/OutPulse_02_Circle_Normal_500.webm",
  };
  return jb2aActive ? jb2aFiles[variant] : GYRO_SPINBALL_ASSET;
}

function getCombatRoundKey(): string | null {
  const combat = game.combat;
  if (!combat) return null;
  return `${combat.id ?? "combat"}:${combat.round ?? 0}`;
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
    spGainedThisRound: Number(state.spGainedThisRound ?? 0) || 0,
    lastSPRoundKey: typeof state.lastSPRoundKey === "string" ? state.lastSPRoundKey : undefined,
  };
}

export class UniqueMechanicsSystem {
  static getControlledActor(): Actor | null {
    return getControlledActor();
  }

  static getState(actor: Actor): UniqueMechanicsState {
    const raw = asRecord(actor.getFlag(ETHERNUM.MODULE_NAME, "uniqueMechanics"));
    return {
      activeProfile: (raw.activeProfile === GYRO_PROFILE_ID ? GYRO_PROFILE_ID : "") as UniqueMechanicProfileId,
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
    return normalizeGyroState(state.profiles[GYRO_PROFILE_ID]);
  }

  static async setActiveProfile(actor: Actor, profileId: UniqueMechanicProfileId): Promise<void> {
    const state = this.getState(actor);
    state.activeProfile = profileId;
    if (profileId === GYRO_PROFILE_ID && !state.profiles[GYRO_PROFILE_ID]) {
      state.profiles[GYRO_PROFILE_ID] = { ...DEFAULT_GYRO_STATE };
    }
    await this.setState(actor, state);
  }

  static async updateGyroState(actor: Actor, patch: Partial<GyroSpinState>): Promise<GyroSpinState> {
    const state = this.getState(actor);
    const current = this.getGyroState(actor);
    const next = normalizeGyroState({ ...current, ...patch });
    next.currentSP = clamp(next.currentSP, 0, this.calculateGyroMaxSP(actor, next));
    if (!next.activeDeviation) delete next.activeDeviation;
    if (!Number.isFinite(Number(next.maxSPOverride)) || Number(next.maxSPOverride) <= 0) delete next.maxSPOverride;
    state.activeProfile = GYRO_PROFILE_ID;
    state.profiles[GYRO_PROFILE_ID] = next;
    await this.setStateQuiet(actor, state);
    return next;
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
      await this.updateGyroState(target, { activeDeviation: `${result.name}: ${result.combatEffect}` });
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
    const status = this.getGyroTechniqueStatus(target, technique, state);
    if (!status.unlocked) {
      ui.notifications?.warn(status.lockReasons.join(" | "));
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
    const techniques = data.gyro.techniques.filter(technique => technique.unlocked);
    if (techniques.length === 0) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Gyro.NoUnlockedTechniques"));
      return;
    }

    const content = `
      <div class="ethernum-gyro-tech-dialog">
        ${techniques.map(technique => `
          <section class="ethernum-gyro-tech-dialog-card ${technique.usable ? "" : "disabled"}">
            <header>
              <span>${technique.cost} SP</span>
              <div>
                <strong>${technique.name}</strong>
                <small>${technique.source} - ${technique.actions}</small>
              </div>
            </header>
            <p>${technique.description}</p>
            <details>
              <summary>${game.i18n!.localize("ETHERNUM.Unique.Gyro.Details")}</summary>
              <ul>
                ${technique.systemNotes.map(note => `<li>${note}</li>`).join("")}
              </ul>
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
    const actorLevel = getActorLevel(actor);
    const maxSP = this.calculateGyroMaxSP(actor, gyroState);
    const rank = this.getGyroRank(gyroState.currentSP, gyroState);
    const spinPercent = maxSP > 0 ? Math.round((gyroState.currentSP / maxSP) * 100) : 0;
    const executionModes = this.buildGyroExecutionModes(actor, gyroState, "forced");

    return {
      activeProfile: state.activeProfile,
      isGM,
      profiles: [
        { id: "", label: game.i18n!.localize("ETHERNUM.Unique.Profile.None") },
        { id: GYRO_PROFILE_ID, label: "Gyro Zeppeli - Via da Rotação Sagrada" },
      ],
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
        executionModes,
        techniques: GYRO_TECHNIQUES.map((technique): GyroTechniqueSheetData => {
          const status = this.getGyroTechniqueStatus(actor, technique, gyroState, isGM);
          const modes = this.buildGyroExecutionModes(actor, gyroState, technique.defaultMode);
          const selectedMode = modes.find(mode => mode.selected);
          const canAfford = gyroState.currentSP >= technique.cost;
          const usable = status.unlocked && canAfford && (selectedMode?.available ?? false);
          const dc = this.getGyroControlDC(actor, technique.defaultMode, gyroState);
          return {
            ...technique,
            canAfford,
            unlocked: status.unlocked,
            usable,
            lockReason: status.lockReasons.join(" | "),
            systemNotes: [
              `${game.i18n!.localize("ETHERNUM.Unique.Gyro.Actions")}: ${technique.actions}`,
              `${game.i18n!.localize("ETHERNUM.Unique.Gyro.SPCost")}: ${technique.cost}`,
              `${game.i18n!.localize("ETHERNUM.Unique.Gyro.ExecutionMode")}: ${game.i18n!.localize(`ETHERNUM.Unique.Gyro.Execution.${technique.defaultMode}`)}`,
              dc === null
                ? game.i18n!.localize("ETHERNUM.Unique.Gyro.StableNoCheck")
                : `${game.i18n!.localize("ETHERNUM.Unique.Gyro.ControlCheck")}: CD ${dc}`,
              ...(technique.details ?? technique.options),
            ],
            executionModes: modes,
          };
        }),
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
