export type CharacterSaveSlug = "fortitude" | "reflex" | "will";

type RollOptions = Record<string, unknown>;

interface PreparedRoll {
  roll?: (options?: RollOptions) => Promise<unknown> | unknown;
  check?: PreparedRoll;
}

interface PreparedStrike {
  id?: string;
  slug?: string;
  label?: string;
  item?: { id?: string; uuid?: string };
  variants?: Array<{ roll?: (options?: RollOptions) => Promise<unknown> | unknown }>;
  damage?: (options?: RollOptions) => Promise<unknown> | unknown;
  critical?: (options?: RollOptions) => Promise<unknown> | unknown;
  use?: (options?: RollOptions) => Promise<unknown> | unknown;
  execute?: (options?: RollOptions) => Promise<unknown> | unknown;
  roll?: (options?: RollOptions) => Promise<unknown> | unknown;
}

type PF2eActorActions = Actor & {
  isOwner: boolean;
  skills?: Record<string, PreparedRoll>;
  saves?: Record<string, PreparedRoll>;
  perception?: PreparedRoll;
  system: Actor["system"] & { actions?: PreparedStrike[] };
  items: Actor["items"] & { get?: (id: string) => Item | undefined };
};

type PF2eItemActions = Item & {
  consume?: () => Promise<unknown> | unknown;
  roll?: (options?: RollOptions) => Promise<unknown> | unknown;
  toMessage?: (options?: RollOptions) => Promise<unknown> | unknown;
};

function updateDocument(document: Actor | Item, changed: Record<string, unknown>): Promise<unknown> {
  const update = document.update as unknown as (data: Record<string, unknown>) => Promise<unknown>;
  return update.call(document, changed);
}

function localize(key: string, fallback: string): string {
  const value = game.i18n?.localize(key);
  return value && value !== key ? value : fallback;
}

export function canUseCharacterActions(actor: Actor): boolean {
  return Boolean(game.user?.isGM || (actor as PF2eActorActions).isOwner);
}

function assertCanUse(actor: Actor): void {
  if (canUseCharacterActions(actor)) return;
  const message = localize(
    "ETHERNUM.CharacterSheet.Errors.Permission",
    "You do not have permission to perform this action.",
  );
  ui.notifications?.warn(message);
  throw new Error(message);
}

function preparedRoll(statistic: PreparedRoll | undefined, options: RollOptions): Promise<unknown> {
  const roller = statistic?.check?.roll ?? statistic?.roll;
  const receiver = statistic?.check?.roll ? statistic.check : statistic;
  if (typeof roller !== "function") {
    throw new Error(localize(
      "ETHERNUM.CharacterSheet.Errors.RollUnavailable",
      "The PF2e prepared roll is not available.",
    ));
  }
  return Promise.resolve(roller.call(receiver, options));
}

function getItem(actor: Actor, itemId: string): PF2eItemActions {
  const item = (actor as PF2eActorActions).items?.get?.(itemId) as PF2eItemActions | undefined;
  if (!item) throw new Error(`Ethernum | PF2e item not found: ${itemId}`);
  return item;
}

function getStrike(actor: Actor, strikeId: string): PreparedStrike {
  const actions = (actor as PF2eActorActions).system?.actions ?? [];
  const strike = actions.find(action => [
    action.id,
    action.slug,
    action.item?.id,
    action.item?.uuid,
  ].some(value => value === strikeId));
  if (!strike) throw new Error(`Ethernum | PF2e prepared Strike not found: ${strikeId}`);
  return strike;
}

function getPreparedAction(actor: Actor, actionId: string): PreparedStrike | undefined {
  return ((actor as PF2eActorActions).system?.actions ?? []).find(action => [
    action.id,
    action.slug,
    action.item?.id,
    action.item?.uuid,
  ].some(value => value === actionId));
}

export const PF2eCharacterActions = {
  canUse: canUseCharacterActions,

  async rollSkill(actor: Actor, slug: string, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    return preparedRoll((actor as PF2eActorActions).skills?.[slug], options);
  },

  async rollSave(actor: Actor, slug: CharacterSaveSlug, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    return preparedRoll((actor as PF2eActorActions).saves?.[slug], options);
  },

  async rollPerception(actor: Actor, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    return preparedRoll((actor as PF2eActorActions).perception, options);
  },

  async rollInitiative(actor: Actor, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    const initiative = (actor as Actor & { initiative?: PreparedRoll }).initiative;
    return preparedRoll(initiative, options);
  },

  async rollStrike(actor: Actor, strikeId: string, mapIndex = 0, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    const strike = getStrike(actor, strikeId);
    const variant = strike.variants?.[Math.max(0, Math.min(2, Math.trunc(mapIndex)))];
    if (typeof variant?.roll !== "function") {
      throw new Error(localize(
        "ETHERNUM.CharacterSheet.Errors.StrikeUnavailable",
        "The PF2e prepared Strike is not available.",
      ));
    }
    return Promise.resolve(variant.roll(options));
  },

  async rollStrikeDamage(actor: Actor, strikeId: string, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    const strike = getStrike(actor, strikeId);
    if (typeof strike.damage !== "function") throw new Error("Ethernum | PF2e Strike damage is unavailable.");
    return Promise.resolve(strike.damage(options));
  },

  async rollStrikeCriticalDamage(actor: Actor, strikeId: string, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    const strike = getStrike(actor, strikeId);
    if (typeof strike.critical !== "function") throw new Error("Ethernum | PF2e critical damage is unavailable.");
    return Promise.resolve(strike.critical(options));
  },

  openItem(actor: Actor, itemId: string): unknown {
    const item = getItem(actor, itemId);
    return item.sheet?.render(true);
  },

  async useItem(actor: Actor, itemId: string, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    const item = getItem(actor, itemId);
    if (typeof item.consume === "function") return item.consume();
    if (typeof item.roll === "function") return item.roll(options);
    if (typeof item.toMessage === "function") return item.toMessage(options);
    return item.sheet?.render(true);
  },

  async useAction(actor: Actor, actionId: string, itemId = "", options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    const action = getPreparedAction(actor, actionId);
    if (typeof action?.use === "function") return action.use(options);
    if (typeof action?.execute === "function") return action.execute(options);
    if (typeof action?.roll === "function") return action.roll(options);
    if (itemId) return this.useItem(actor, itemId, options);
    throw new Error(localize(
      "ETHERNUM.CharacterSheet.Errors.ActionUnavailable",
      "The PF2e prepared action is not available.",
    ));
  },

  async setQuantity(actor: Actor, itemId: string, quantity: number): Promise<unknown> {
    assertCanUse(actor);
    return updateDocument(getItem(actor, itemId), { "system.quantity": Math.max(0, Math.trunc(quantity)) });
  },

  async toggleEquipped(actor: Actor, itemId: string, equipped: boolean): Promise<unknown> {
    assertCanUse(actor);
    const item = getItem(actor, itemId) as PF2eItemActions & {
      system?: { equipped?: { carryType?: string } };
    };
    const current = item.system?.equipped?.carryType;
    const carryType = equipped ? (current === "held" ? "held" : "worn") : "stowed";
    return updateDocument(item, { "system.equipped.carryType": carryType });
  },

  async toggleInvested(actor: Actor, itemId: string, invested: boolean): Promise<unknown> {
    assertCanUse(actor);
    return updateDocument(getItem(actor, itemId), { "system.equipped.invested": invested });
  },

  async updateHP(actor: Actor, value: number): Promise<unknown> {
    assertCanUse(actor);
    return updateDocument(actor, { "system.attributes.hp.value": Math.max(0, Math.trunc(value)) });
  },

  async updateHeroPoints(actor: Actor, value: number): Promise<unknown> {
    assertCanUse(actor);
    return updateDocument(actor, { "system.resources.heroPoints.value": Math.max(0, Math.min(3, Math.trunc(value))) });
  },
};
