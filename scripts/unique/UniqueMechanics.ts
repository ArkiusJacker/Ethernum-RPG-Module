import { ETHERNUM } from '../config.js';

export type UniqueMechanicProfileId = "" | "gyro-spin";
export type GyroMainAttribute = "dex" | "wis";
export type GyroExecutionMode = "stable" | "forced" | "corpse" | "perfect";

export interface UniqueMechanicsState {
  activeProfile: UniqueMechanicProfileId;
  profiles: Record<string, unknown>;
}

export interface GyroSpinState {
  currentSP: number;
  maxSPOverride?: number;
  mainAttribute: GyroMainAttribute;
  proficiencyBonus: number;
  sacredScars: number;
  corpsePartNumber: number;
  torsoBonus: boolean;
  heartRegen: boolean;
  absoluteReady: boolean;
  unlockedIkons: string[];
}

interface GyroTechnique {
  id: string;
  name: string;
  cost: number;
  source: string;
  description: string;
  options: string[];
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
  text: string;
}

const DEFAULT_UNIQUE_STATE: UniqueMechanicsState = {
  activeProfile: "",
  profiles: {},
};

const DEFAULT_GYRO_STATE: GyroSpinState = {
  currentSP: 0,
  mainAttribute: "dex",
  proficiencyBonus: 2,
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
    control: "Forçada CD 13",
    text: "Rotação Forçada disponível. IKONs de 3-4 SP acessíveis.",
  },
  {
    id: "sacred",
    num: "III",
    name: "Rotação Sagrada",
    range: "7-10 SP",
    minSP: 7,
    maxSP: 10,
    control: "Cadáver CD 15+",
    text: "As Partes do Cadáver respondem. Ball Breaker ganha forma.",
  },
  {
    id: "perfect",
    num: "IV",
    name: "Rotação Perfeita",
    range: "11+ SP",
    minSP: 11,
    maxSP: null,
    control: "Perfeita CD 17",
    text: "O eixo se alinha com o universo. Desvios têm consequências severas.",
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
    description: "Ataque básico à distância com as esferas de aço.",
    options: [
      "Causa dano normal ao acertar",
      "Gera +1 SP ao acertar",
      "Pode ricochetear gastando 1 SP adicional",
    ],
  },
  {
    id: "spiral-ricochet",
    name: "Ricochete Espiral",
    cost: 1,
    source: "Técnica",
    description: "A esfera quica em parede, chão, arma, escudo ou criatura.",
    options: [
      "Acertar alvo com cobertura total ou parcial",
      "Mudar o ângulo do ataque",
      "Atacar segundo alvo com dano reduzido",
      "Forçar inimigo a mudar posição",
    ],
  },
  {
    id: "medicinal-spin",
    name: "Rotação Medicinal",
    cost: 2,
    source: "Técnica",
    description: "Gyro usa a rotação para corrigir ossos, músculos e fluxo sanguíneo.",
    options: [
      "Curar 1d6 + modificador principal",
      "Remover Sangrando",
      "Reduzir uma penalidade física em 1",
      "Acordar aliado inconsciente com 1 HP",
      "Estabilizar criatura morrendo",
    ],
  },
  {
    id: "rotating-jaw",
    name: "Mandíbula Giratória",
    cost: 2,
    source: "Técnica",
    description: "Ao acertar cabeça, pescoço ou mandíbula, o alvo faz salvamento.",
    options: [
      "-2 em ataques por 1 rodada",
      "Magias verbais falham",
      "Perde a reação até o próximo turno",
      "Fica Vulnerável ao próximo ataque de Spin",
    ],
  },
  {
    id: "proportion-mark",
    name: "Marca da Proporção",
    cost: 1,
    source: "Técnica",
    description: "Gyro marca um alvo com vibração invisível por 1 cena.",
    options: [
      "Gyro sente a direção do alvo",
      "Primeiro ataque de esfera recebe +2",
      "Acertar o alvo marcado gera +1 SP adicional",
      "Técnicas do Cadáver Santo têm efeito melhorado",
    ],
  },
  {
    id: "calculated-trajectory",
    name: "Trajetória Calculada",
    cost: 2,
    source: "IKON I",
    description: "Próximo ataque ignora cobertura parcial e total. Ricochete sem desvantagem.",
    options: [],
  },
  {
    id: "paralyzing-frequency",
    name: "Freq. Paralisante",
    cost: 2,
    source: "IKON II",
    description: "Alvo faz salvo de Constituição. Falha reduz velocidade; falha crítica zera velocidade.",
    options: [],
  },
  {
    id: "battle-cadence",
    name: "Cadência de Batalha",
    cost: 5,
    source: "IKON III",
    description: "Por 1 minuto, habilidades de Rotação custam -1 SP, mínimo 0.",
    options: [],
  },
  {
    id: "axial-spin",
    name: "Rotação Axial",
    cost: 3,
    source: "IKON IV",
    description: "Por 1 rodada, 50% de deflectir projéteis físicos; deflectidos voltam ao atacante.",
    options: [],
  },
  {
    id: "breaker-recharge",
    name: "Recarga do Quebrador",
    cost: 6,
    source: "IKON VIII",
    description: "Recarrega o Ball Breaker Devastador.",
    options: [],
  },
  {
    id: "ball-breaker-requiem",
    name: "Ball Breaker: Requiem",
    cost: 8,
    source: "IKON VIII",
    description: "6d10 de força, Atordoado 2 rodadas, ignora resistências e imunidades.",
    options: [],
  },
  {
    id: "saints-hand",
    name: "Mão do Santo",
    cost: 10,
    source: "IKON IX",
    description: "Por 3 turnos, Gyro pode usar qualquer IKON ou técnica sem restrição de Parte.",
    options: [],
  },
  {
    id: "absolute-rotation",
    name: "Rotação Absoluta",
    cost: 9,
    source: "Técnica Final",
    description: "Altera uma regra da cena. Requer 9 Partes ou condição narrativa extrema e 1 Cicatriz Sagrada.",
    options: [],
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
    actives: [{ name: "Trajetória Calculada", cost: 2, text: "Ignora cobertura parcial e total." }],
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
    transcendence: { name: "Rotação Amplificada", cost: 3, text: "Próximo ataque rola dano 3x." },
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
  { roll: 1, text: "A esfera retorna de forma errada. Gyro sofre 1d4 de dano do próprio impacto." },
  { roll: 2, text: "Gyro perde todo o Spin acumulado. A rotação colapsa completamente." },
  { roll: 3, text: "A técnica acerta, mas também afeta um aliado adjacente ou elemento do cenário." },
  { roll: 4, text: "A Parte do Cadáver Santo pulsa e exige custo narrativo." },
  { roll: 5, text: "Gyro fica com -3 no próximo ataque pela rotação desestabilizada." },
  { roll: 6, text: "A Rotação sai perfeita demais: o efeito acontece, mas atrai algo indesejado ao campo." },
];

const GYRO_PROFILE_ID: UniqueMechanicProfileId = "gyro-spin";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

function normalizeGyroState(raw: unknown): GyroSpinState {
  const state = asRecord(raw);
  return {
    ...DEFAULT_GYRO_STATE,
    currentSP: Number(state.currentSP ?? DEFAULT_GYRO_STATE.currentSP) || 0,
    maxSPOverride: state.maxSPOverride === undefined ? undefined : Number(state.maxSPOverride),
    mainAttribute: state.mainAttribute === "wis" ? "wis" : "dex",
    proficiencyBonus: Number(state.proficiencyBonus ?? DEFAULT_GYRO_STATE.proficiencyBonus) || 0,
    sacredScars: Number(state.sacredScars ?? DEFAULT_GYRO_STATE.sacredScars) || 0,
    corpsePartNumber: clamp(Number(state.corpsePartNumber ?? DEFAULT_GYRO_STATE.corpsePartNumber) || 1, 1, 9),
    torsoBonus: Boolean(state.torsoBonus),
    heartRegen: Boolean(state.heartRegen),
    absoluteReady: Boolean(state.absoluteReady),
    unlockedIkons: Array.isArray(state.unlockedIkons) ? state.unlockedIkons.map(String) : [],
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
    state.activeProfile = GYRO_PROFILE_ID;
    state.profiles[GYRO_PROFILE_ID] = next;
    await this.setState(actor, state);
    return next;
  }

  static calculateGyroMaxSP(actor: Actor, state = this.getGyroState(actor)): number {
    const override = Number(state.maxSPOverride);
    if (Number.isFinite(override) && override > 0) return Math.floor(override);
    return getActorLevel(actor) * 3 + (state.torsoBonus ? 6 : 0);
  }

  static getGyroRank(currentSP: number, state?: GyroSpinState): GyroRank {
    if (state?.absoluteReady) return GYRO_RANKS[4];
    return GYRO_RANKS.find(rank =>
      rank.id !== "absolute"
      && currentSP >= rank.minSP
      && (rank.maxSP === null || currentSP <= rank.maxSP)
    ) ?? GYRO_RANKS[0];
  }

  static getGyroControlDC(mode: GyroExecutionMode, corpsePartNumber = 1): number | null {
    if (mode === "stable") return null;
    if (mode === "forced") return 13;
    if (mode === "corpse") return 15 + clamp(corpsePartNumber, 1, 9);
    return 17;
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
    return this.adjustGyroSP(target, amount, reason);
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
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      content: `
        <div class="ethernum-unique-chat-card">
          <h3>${title ?? game.i18n!.localize("ETHERNUM.Unique.Gyro.Status")}</h3>
          <p><strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.SpinPoints")}:</strong> ${state.currentSP} / ${maxSP}</p>
          <p><strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.RotationRank")}:</strong> ${rank.num} - ${rank.name}</p>
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
    const dc = this.getGyroControlDC(mode, state.corpsePartNumber);
    if (dc === null) {
      await this.showGyroStatus(target, game.i18n!.localize("ETHERNUM.Unique.Gyro.StableNoCheck"));
      return null;
    }

    const attrMod = getPF2EAbilityMod(target, state.mainAttribute);
    const bonus = attrMod + state.proficiencyBonus;
    const roll = new Roll(`1d20 + ${bonus}`);
    await roll.evaluate();
    const success = (roll.total ?? 0) >= dc;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: target }),
      flavor: [
        `<strong>${game.i18n!.localize("ETHERNUM.Unique.Gyro.ControlCheck")}</strong>`,
        `${game.i18n!.localize(`ETHERNUM.Unique.Gyro.Execution.${mode}`)} - CD ${dc}`,
        `${state.mainAttribute.toUpperCase()}: ${attrMod} + ${game.i18n!.localize("ETHERNUM.Unique.Gyro.Proficiency")}: ${state.proficiencyBonus}`,
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
        result?.text ?? "",
      ].join("<br>"),
    });
    if (roll.total === 2) await this.setGyroSP(target, 0);
    return roll;
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
    if (state.currentSP < technique.cost) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Unique.Gyro.NotEnoughSP"));
      return;
    }
    await this.updateGyroState(target, { currentSP: state.currentSP - technique.cost });
    if (mode !== "stable") await this.rollGyroControl(target, mode);
    const nextState = this.getGyroState(target);
    const maxSP = this.calculateGyroMaxSP(target, nextState);
    const rank = this.getGyroRank(nextState.currentSP, nextState);
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

  static buildSheetData(actor: Actor, isGM: boolean): Record<string, unknown> {
    const state = this.getState(actor);
    const gyroState = this.getGyroState(actor);
    const maxSP = this.calculateGyroMaxSP(actor, gyroState);
    const rank = this.getGyroRank(gyroState.currentSP, gyroState);
    const spinPercent = maxSP > 0 ? Math.round((gyroState.currentSP / maxSP) * 100) : 0;

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
        mainAttributeMod: getPF2EAbilityMod(actor, gyroState.mainAttribute),
        techniques: GYRO_TECHNIQUES.map(technique => ({
          ...technique,
          canAfford: gyroState.currentSP >= technique.cost,
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
