import { ETHERNUM, type Rank, type RuneClassKey, type EtherAttribute } from './config.js';
import { getFECostForRank, getRuneClassDC, getDefaultRuneCost } from './settings.js';

interface EtherSystemState {
  etherMax: number;
  etherCurrent: number;
  etherPower: number;
}

interface FEState {
  current: number;
  total: number;
}

export interface RuneData {
  id: string;
  name: string;
  runeClass: RuneClassKey;
  costType: string;
  costValue: number;
  usesDefaultCost?: boolean;
  effect: string;
  description: string;
  equipped: boolean;
  active: boolean;
  verb?: string;
  noun?: string;
  source?: string;
  [key: string]: unknown;
}

interface RuneClassCost {
  ether: number;
  description: string;
}

interface RankUpResult {
  nextRank: Rank | null;
  cost: number;
  possible: boolean;
}

interface UpgradeResult {
  success: boolean;
  message: string;
  newValue?: number;
  newRank?: Rank;
  feCost?: number;
}

interface OverrideResult {
  success: boolean;
  override: boolean;
  roll?: number;
  dc?: number;
  consequences?: "exhaustion" | "catastrophic";
}

export class EtherSystem {
  attributes: EtherSystemState;

  constructor() {
    this.attributes = { etherMax: 0, etherCurrent: 0, etherPower: 0 };
  }

  calculateMaxEther(actor: Actor): number {
    if (!actor) return 0;

    const etherAttributes = (actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") as Record<string, EtherAttribute> | undefined)
      ?? ETHERNUM.DEFAULT_ETHER_ATTRIBUTES;

    const intValue = etherAttributes.inteligencia?.value ?? 1;
    const sabValue = etherAttributes.sabedoria?.value ?? 1;
    const conValue = etherAttributes.constituicao?.value ?? 1;

    const intRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.inteligencia?.rank ?? "F");
    const sabRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.sabedoria?.rank ?? "F");
    const conRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.constituicao?.rank ?? "F");

    return 10 + (intValue * 2) + sabValue + conValue + (intRankBonus + sabRankBonus + conRankBonus);
  }

  calculateEtherPower(actor: Actor): number {
    if (!actor) return 0;

    const etherAttributes = (actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") as Record<string, EtherAttribute> | undefined)
      ?? ETHERNUM.DEFAULT_ETHER_ATTRIBUTES;
    const maxRuneClass = (actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") as number | undefined) ?? 1;

    const intValue = etherAttributes.inteligencia?.value ?? 1;
    const carValue = etherAttributes.carisma?.value ?? 1;

    const intRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.inteligencia?.rank ?? "F");
    const carRankBonus = ETHERNUM.RANKS.indexOf(etherAttributes.carisma?.rank ?? "F");

    return intValue + carValue + intRankBonus + carRankBonus + (maxRuneClass * 2);
  }

  async longRest(actor: Actor): Promise<number> {
    const maxEther = this.calculateMaxEther(actor);
    await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", maxEther);
    return maxEther;
  }

  canUseRuneClass(actor: Actor, runeClass: number): boolean {
    if (!actor) return false;
    const maxAllowed = (actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") as number | undefined) ?? 1;
    return runeClass <= maxAllowed;
  }
}

export class RuneSystem {
  runes: RuneData[];

  constructor() {
    this.runes = [];
  }

  addRune(rune: Partial<RuneData>): void {
    this.runes.push({
      id: foundry.utils.randomID(),
      name: rune.name ?? "Nova Runa",
      runeClass: (rune.runeClass ?? 1) as RuneClassKey,
      costType: rune.costType ?? "ether",
      costValue: rune.costValue ?? 0,
      effect: rune.effect ?? "",
      description: rune.description ?? "",
      equipped: rune.equipped ?? false,
      active: rune.active ?? true,
      ...rune
    });
  }

  removeRune(runeId: string): void {
    const index = this.runes.findIndex(r => r.id === runeId);
    if (index > -1) this.runes.splice(index, 1);
  }

  // NOTE: The rune cost system will be expanded in future versions.
  static getRuneClassCost(runeClass: number): RuneClassCost {
    const costs: Record<number, RuneClassCost> = {
      1: { ether: 0,   description: "Zero ou Mínimo (Passivo)" },
      2: { ether: 2,   description: "Baixo (Requer resfriamento curto)" },
      3: { ether: 5,   description: "Médio (Teste de Constituição)" },
      4: { ether: 10,  description: "Alto (Dano na Vida Máxima ou Corrupção)" },
      5: { ether: 100, description: "Catastrófico (Vida ou Perda do Personagem)" }
    };
    return costs[runeClass] ?? costs[1];
  }

  static getRuneClassDC(runeClass: RuneClassKey, customDCs: Record<number, number> | null = null): number {
    if (customDCs?.[runeClass]) return customDCs[runeClass];
    return getRuneClassDC(runeClass);
  }

  static async attemptOverride(actor: Actor, targetRuneClass: number): Promise<OverrideResult> {
    const maxAllowed = (actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") as number | undefined) ?? 1;

    if (targetRuneClass <= maxAllowed) return { success: true, override: false };

    const etherAttributes = (actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") as Record<string, EtherAttribute> | undefined)
      ?? ETHERNUM.DEFAULT_ETHER_ATTRIBUTES;
    const conValue = etherAttributes.constituicao?.value ?? 1;
    const conRank = (etherAttributes.constituicao?.rank ?? "F") as Rank;
    const conRankBonus = ETHERNUM.ATTRIBUTE_RANK_BONUS[conRank] ?? 2;

    const dc = this.getRuneClassDC(targetRuneClass as RuneClassKey);
    const roll = new Roll(`1d20 + ${conValue + conRankBonus}`);
    await roll.evaluate();

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `${game.i18n!.localize("ETHERNUM.Override.AttemptTitle")} (DC ${dc})<br>CON: ${conValue} + ${conRankBonus} (${conRank})`
    });

    const success = (roll.total ?? 0) >= dc;
    return {
      success,
      override: true,
      roll: roll.total ?? 0,
      dc,
      consequences: success ? "exhaustion" : "catastrophic"
    };
  }
}

export class FESystem {
  static calculateUpgradeCost(rank: Rank, currentLevel: number, targetLevel: number): number {
    if (targetLevel <= currentLevel) return 0;
    const capped = Math.min(targetLevel, ETHERNUM.MAX_LEVEL);
    return getFECostForRank(rank) * (capped - currentLevel);
  }

  static calculateRankUpCost(currentRank: Rank): RankUpResult {
    const rankIndex = ETHERNUM.RANKS.indexOf(currentRank);
    if (rankIndex >= ETHERNUM.RANKS.length - 1) return { nextRank: null, cost: 0, possible: false };

    const nextRank = ETHERNUM.RANKS[rankIndex + 1];
    return { nextRank, cost: getFECostForRank(nextRank), possible: true };
  }

  static async _upgradeEntity(
    actor: Actor,
    entityKey: string,
    flagKey: string,
    defaultValues: Record<string, EtherAttribute>,
    notFoundKey: string,
    levelsToGain: number
  ): Promise<UpgradeResult> {
    const fe = ((actor.getFlag(ETHERNUM.MODULE_NAME, "fe") as FEState | undefined) ?? { ...ETHERNUM.DEFAULT_FE });
    const entityMap = ((actor.getFlag(ETHERNUM.MODULE_NAME, flagKey) as Record<string, EtherAttribute> | undefined) ?? { ...defaultValues });

    if (!entityMap[entityKey]) return { success: false, message: game.i18n!.localize(notFoundKey) };

    const entity = entityMap[entityKey];
    let currentLevel = entity.value ?? 1;
    let currentRank = entity.rank ?? "F" as Rank;
    let remainingLevels = levelsToGain;
    let totalCost = 0;

    while (remainingLevels > 0) {
      const targetLevel = Math.min(currentLevel + remainingLevels, ETHERNUM.MAX_LEVEL);
      totalCost += this.calculateUpgradeCost(currentRank, currentLevel, targetLevel);
      remainingLevels -= targetLevel - currentLevel;
      currentLevel = targetLevel;

      if (currentLevel >= ETHERNUM.MAX_LEVEL && remainingLevels > 0) {
        const rankUpInfo = this.calculateRankUpCost(currentRank);
        if (!rankUpInfo.possible) break;
        totalCost += rankUpInfo.cost;
        currentRank = rankUpInfo.nextRank!;
        currentLevel = 1;
        remainingLevels--;
      }
    }

    if (fe.current < totalCost) {
      return { success: false, message: game.i18n!.format("ETHERNUM.FE.NotEnough", { cost: totalCost, current: fe.current }), feCost: totalCost };
    }

    entityMap[entityKey] = { value: currentLevel, rank: currentRank, points: entity.points ?? 0 };
    await actor.setFlag(ETHERNUM.MODULE_NAME, "fe", { current: fe.current - totalCost, total: fe.total });
    await actor.setFlag(ETHERNUM.MODULE_NAME, flagKey, entityMap);

    return { success: true, message: game.i18n!.format("ETHERNUM.FE.UpgradeSuccess", { attr: entityKey }), newValue: currentLevel, newRank: currentRank, feCost: totalCost };
  }

  static async upgradeAttribute(actor: Actor, attrKey: string, levelsToGain = 1): Promise<UpgradeResult> {
    if (!actor || !attrKey || levelsToGain < 1) return { success: false, message: game.i18n!.localize("ETHERNUM.FE.InvalidParams") };
    return this._upgradeEntity(actor, attrKey, "etherAttributes", ETHERNUM.DEFAULT_ETHER_ATTRIBUTES, "ETHERNUM.FE.AttributeNotFound", levelsToGain);
  }

  static async upgradeTalent(actor: Actor, talentKey: string, levelsToGain = 1): Promise<UpgradeResult> {
    if (!actor || !talentKey || levelsToGain < 1) return { success: false, message: game.i18n!.localize("ETHERNUM.FE.InvalidParams") };
    return this._upgradeEntity(actor, talentKey, "talents", ETHERNUM.DEFAULT_TALENTS, "ETHERNUM.FE.TalentNotFound", levelsToGain);
  }

  static async addFE(actor: Actor, amount: number): Promise<{ success: boolean; newCurrent?: number; newTotal?: number }> {
    if (!actor || amount <= 0) return { success: false };
    const fe = ((actor.getFlag(ETHERNUM.MODULE_NAME, "fe") as FEState | undefined) ?? { ...ETHERNUM.DEFAULT_FE });
    const newFE = { current: fe.current + amount, total: fe.total + amount };
    await actor.setFlag(ETHERNUM.MODULE_NAME, "fe", newFE);
    return { success: true, newCurrent: newFE.current, newTotal: newFE.total };
  }

  static async setFE(actor: Actor, amount: number): Promise<{ success: boolean; newCurrent?: number }> {
    if (!actor || amount < 0) return { success: false };
    const fe = ((actor.getFlag(ETHERNUM.MODULE_NAME, "fe") as FEState | undefined) ?? { ...ETHERNUM.DEFAULT_FE });
    const newFE = { current: amount, total: Math.max(fe.total, amount) };
    await actor.setFlag(ETHERNUM.MODULE_NAME, "fe", newFE);
    return { success: true, newCurrent: newFE.current };
  }
}

const PF2E_SKILL_MAP: Record<string, string> = {
  investigacao:  "occultism",
  percepcao:     "_perception",
  furtividade:   "stealth",
  atletismo:     "athletics",
  acrobacia:     "acrobatics",
  intimidacao:   "intimidation",
  persuasao:     "diplomacy",
  enganacao:     "deception",
  medicina:      "medicine",
  sobrevivencia: "survival",
  arcanismo:     "arcana",
  religiao:      "religion",
  natureza:      "nature",
  sociedade:     "society",
  ocultismo:     "occultism",
};

const PF2E_ABILITY_MAP: Record<string, string> = {
  forca:        "str",
  destreza:     "dex",
  constituicao: "con",
  inteligencia: "int",
  sabedoria:    "wis",
  carisma:      "cha",
};

export class EthernumDiceCalculator {
  static attributeRankToBonus(rank: Rank): number {
    return ETHERNUM.ATTRIBUTE_RANK_BONUS[rank ?? "F"] ?? 2;
  }

  static talentRankToBonus(rank: Rank): number {
    return ETHERNUM.TALENT_RANK_BONUS[rank ?? "F"] ?? 3;
  }

  static _getPF2ESkillValue(actor: PF2EActor, talentKey: string): number | null {
    const slug = PF2E_SKILL_MAP[talentKey];
    if (!slug) return null;
    if (slug === "_perception") {
      return actor.system?.attributes?.perception?.value
        ?? actor.perception?.value
        ?? null;
    }
    return actor.skills?.[slug]?.value ?? null;
  }

  static _getPF2EAbilityMod(actor: PF2EActor, attributeKey: string): number | null {
    const key = PF2E_ABILITY_MAP[attributeKey];
    if (!key) return null;
    return actor.system?.abilities?.[key]?.mod ?? null;
  }

  static async rollWithTalent(actor: Actor, talentKey: string, attributeKey: string, _options: Record<string, unknown> = {}): Promise<Roll | null> {
    if (!actor) {
      ui.notifications?.error(game.i18n!.localize("ETHERNUM.Errors.NoActor"));
      return null;
    }

    const pf2eActor = actor as unknown as PF2EActor;
    const talents = ((actor.getFlag(ETHERNUM.MODULE_NAME, "talents") as Record<string, EtherAttribute> | undefined) ?? ETHERNUM.DEFAULT_TALENTS);
    const etherAttributes = ((actor.getFlag(ETHERNUM.MODULE_NAME, "etherAttributes") as Record<string, EtherAttribute> | undefined) ?? ETHERNUM.DEFAULT_ETHER_ATTRIBUTES);

    const talent    = talents[talentKey]        ?? { value: 1, rank: "F" as Rank, points: 0 };
    const attribute = etherAttributes[attributeKey] ?? { value: 1, rank: "F" as Rank, points: 0 };

    const talentRankBonus = this.talentRankToBonus(talent.rank);
    const attrRankBonus   = this.attributeRankToBonus(attribute.rank);

    const pf2eSkill   = this._getPF2ESkillValue(pf2eActor, talentKey);
    const pf2eAbility = this._getPF2EAbilityMod(pf2eActor, attributeKey);
    const talentValue = pf2eSkill   !== null ? pf2eSkill   : (talent.value    ?? 1);
    const attrValue   = pf2eAbility !== null ? pf2eAbility : (attribute.value ?? 1);

    const totalBonus = talentValue + talentRankBonus + attrValue + attrRankBonus;
    const roll = new Roll(`1d20 + ${totalBonus}`);
    await roll.evaluate();

    const talentLabel = game.i18n!.localize(`ETHERNUM.Talent.${talentKey}`) || talentKey;
    const attrLabel   = game.i18n!.localize(`ETHERNUM.Attribute.${attributeKey}`) || attributeKey;
    const skillSource = pf2eSkill   !== null ? " (PF2E)" : " (Ethernum)";
    const abilSource  = pf2eAbility !== null ? " (PF2E)" : " (Ethernum)";

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: [
        `<strong>${game.i18n!.localize("ETHERNUM.Calculator.TalentRoll")}</strong>`,
        `${talentLabel}: <b>${talentValue}</b>${skillSource} + ${talentRankBonus} (Rank ${talent.rank})`,
        `${attrLabel}: <b>${attrValue}</b>${abilSource} + ${attrRankBonus} (Rank ${attribute.rank})`,
        `<strong>Total: 1d20 + ${totalBonus}</strong>`,
      ].join("<br>"),
    });

    return roll;
  }

  static async rollRune(actor: Actor, rune: RuneData): Promise<Roll | null> {
    if (!actor || !rune) {
      ui.notifications?.error(game.i18n!.localize("ETHERNUM.Errors.InvalidRune"));
      return null;
    }

    if (!rune.active) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.RuneDisabled"));
      return null;
    }

    const maxAllowed = (actor.getFlag(ETHERNUM.MODULE_NAME, "maxRuneClass") as number | undefined) ?? 1;
    const runeClass  = rune.runeClass ?? 1;

    if (runeClass > maxAllowed) {
      const overrideResult = await RuneSystem.attemptOverride(actor, runeClass);
      if (!overrideResult.success) {
        await this._handleOverrideFailure(actor);
        return null;
      }
      await this._handleOverrideSuccess(actor);
    }

    const etherSystem  = ((actor.getFlag(ETHERNUM.MODULE_NAME, "etherSystem") as Partial<{ etherCurrent: number }> | undefined) ?? {});
    const currentEther = etherSystem.etherCurrent ?? 0;
    const effectiveCostValue = rune.usesDefaultCost
      ? getDefaultRuneCost(runeClass as RuneClassKey)
      : (rune.costValue ?? 0);
    const etherCost    = RuneSystem.getRuneClassCost(runeClass).ether + effectiveCostValue;

    if (currentEther < etherCost && etherCost > 0) {
      ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Errors.NotEnoughEther"));
      return null;
    }

    if (etherCost > 0) {
      await actor.setFlag(ETHERNUM.MODULE_NAME, "etherSystem.etherCurrent", currentEther - etherCost);
    }

    const etherPower = new EtherSystem().calculateEtherPower(actor);
    const roll = new Roll(`1d20 + ${etherPower}`);
    await roll.evaluate();

    const runeClassInfo = ETHERNUM.RUNE_CLASSES[runeClass as RuneClassKey];
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: [
        `<strong>${game.i18n!.localize("ETHERNUM.Rune.Activated")}: ${rune.name}</strong>`,
        `<em>${game.i18n!.localize("ETHERNUM.Rune.Class")}: ${runeClassInfo?.name ?? runeClass}</em>`,
        `${game.i18n!.localize("ETHERNUM.EtherCost")}: ${etherCost}`,
        rune.effect ? `<small>${rune.effect}</small>` : ""
      ].filter(Boolean).join("<br>")
    });

    return roll;
  }

  static async _handleOverrideFailure(actor: Actor): Promise<void> {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="ethernum-override-failure">
          <h3>${game.i18n!.localize("ETHERNUM.Override.FailureTitle")}</h3>
          <p>${game.i18n!.localize("ETHERNUM.Override.FailureDescription")}</p>
          <ul>
            <li>${game.i18n!.localize("ETHERNUM.Override.Consequence1")}</li>
            <li>${game.i18n!.localize("ETHERNUM.Override.Consequence2")}</li>
          </ul>
        </div>`,
    });
    ui.notifications?.error(game.i18n!.localize("ETHERNUM.Override.FailureNotification"));
  }

  static async _handleOverrideSuccess(actor: Actor): Promise<void> {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="ethernum-override-success">
          <h3>${game.i18n!.localize("ETHERNUM.Override.SuccessTitle")}</h3>
          <p>${game.i18n!.localize("ETHERNUM.Override.SuccessDescription")}</p>
          <p><strong>${game.i18n!.localize("ETHERNUM.Override.Exhaustion")}</strong></p>
        </div>`,
    });
    ui.notifications?.warn(game.i18n!.localize("ETHERNUM.Override.SuccessNotification"));
  }
}
