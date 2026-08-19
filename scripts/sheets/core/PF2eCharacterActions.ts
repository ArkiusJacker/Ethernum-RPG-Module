import {
  measurePF2eBridgeOperation,
  type PF2eBridgeTelemetrySource,
} from "./PF2eBridgeTelemetry.js";

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

export type CharacterCarryType = "held" | "worn" | "stowed" | "dropped";

export interface CharacterCarryTypeOptions {
  carryType: CharacterCarryType;
  handsHeld?: number;
  inSlot?: boolean;
}

export interface CharacterCastSpellOptions {
  entryId: string;
  spellId: string;
  rank: number;
  slotId?: number;
}

interface PF2eResource {
  slug?: string;
  value: number;
  max: number;
}

interface PF2eSpellCollection {
  get?: (id: string, options?: { strict?: boolean }) => unknown;
  addSpell?: (spell: Item, options?: { groupId?: number | string }) => Promise<unknown> | unknown;
  entry?: {
    cast?: (spell: unknown, options: { rank: number; slotId?: number }) => Promise<unknown> | unknown;
  };
}

type PF2eActorActions = Actor & {
  isOwner: boolean;
  skills?: Record<string, PreparedRoll>;
  saves?: Record<string, PreparedRoll>;
  perception?: PreparedRoll;
  system: Actor["system"] & { actions?: PreparedStrike[] };
  items: Actor["items"] & { get?: (id: string) => Item | undefined };
  changeCarryType?: (item: Item, options: CharacterCarryTypeOptions) => Promise<unknown> | unknown;
  getResource?: (slug: string) => PF2eResource | null | undefined;
  updateResource?: (slug: string, value: number, options?: Record<string, unknown>) => Promise<unknown> | unknown;
  increaseCondition?: (slug: string, options?: Record<string, unknown>) => Promise<unknown> | unknown;
  decreaseCondition?: (slug: string, options?: Record<string, unknown>) => Promise<unknown> | unknown;
  spellcasting?: {
    collections?: {
      get?: (id: string, options?: { strict?: boolean }) => PF2eSpellCollection | undefined;
    };
  };
};

type PF2eItemActions = Item & {
  consume?: () => Promise<unknown> | unknown;
  roll?: (options?: RollOptions) => Promise<unknown> | unknown;
  toMessage?: (options?: RollOptions) => Promise<unknown> | unknown;
  isInvestable?: boolean;
  isInvested?: boolean;
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

function characterResource(actor: Actor, slug: string): PF2eResource | null {
  const getter = (actor as PF2eActorActions).getResource;
  if (typeof getter !== "function") return null;
  return getter.call(actor, slug) ?? null;
}

function spellCollection(actor: Actor, entryId: string): PF2eSpellCollection | null {
  const collections = (actor as PF2eActorActions).spellcasting?.collections;
  if (typeof collections?.get !== "function") return null;
  return collections.get(entryId) ?? null;
}

function unavailable(key: string, fallback: string): Error {
  return new Error(localize(key, fallback));
}

function actorId(actor: Actor): string {
  return String(actor.id ?? actor.uuid ?? actor.name ?? "actor");
}

function measured<T>(
  actor: Actor,
  operation: string,
  capability: string,
  source: PF2eBridgeTelemetrySource,
  callback: () => T | Promise<T>,
): Promise<T> {
  return measurePF2eBridgeOperation({
    actorId: actorId(actor),
    operation,
    capability,
    source,
  }, callback);
}

export const PF2eCharacterActions = {
  canUse: canUseCharacterActions,

  async rollSkill(actor: Actor, slug: string, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    return measured(actor, "roll-skill", "preparedRoll", "pf2e-prepared",
      () => preparedRoll((actor as PF2eActorActions).skills?.[slug], options));
  },

  async rollSave(actor: Actor, slug: CharacterSaveSlug, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    return measured(actor, "roll-save", "preparedRoll", "pf2e-prepared",
      () => preparedRoll((actor as PF2eActorActions).saves?.[slug], options));
  },

  async rollPerception(actor: Actor, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    return measured(actor, "roll-perception", "preparedRoll", "pf2e-prepared",
      () => preparedRoll((actor as PF2eActorActions).perception, options));
  },

  async rollInitiative(actor: Actor, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    const initiative = (actor as Actor & { initiative?: PreparedRoll }).initiative;
    return measured(actor, "roll-initiative", "preparedRoll", "pf2e-prepared",
      () => preparedRoll(initiative, options));
  },

  async rollStrike(actor: Actor, strikeId: string, mapIndex = 0, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    const strike = getStrike(actor, strikeId);
    const variants = strike.variants ?? [];
    const variant = variants[Math.max(0, Math.min(Math.max(0, variants.length - 1), Math.trunc(mapIndex)))];
    if (typeof variant?.roll !== "function") {
      throw new Error(localize(
        "ETHERNUM.CharacterSheet.Errors.StrikeUnavailable",
        "The PF2e prepared Strike is not available.",
      ));
    }
    return measured(actor, "roll-strike", "strike", "pf2e-prepared", () => variant.roll!(options));
  },

  async rollStrikeDamage(actor: Actor, strikeId: string, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    const strike = getStrike(actor, strikeId);
    if (typeof strike.damage !== "function") throw new Error("Ethernum | PF2e Strike damage is unavailable.");
    return measured(actor, "roll-strike-damage", "strike", "pf2e-prepared", () => strike.damage!(options));
  },

  async rollStrikeCriticalDamage(actor: Actor, strikeId: string, options: RollOptions = {}): Promise<unknown> {
    assertCanUse(actor);
    const strike = getStrike(actor, strikeId);
    if (typeof strike.critical !== "function") throw new Error("Ethernum | PF2e critical damage is unavailable.");
    return measured(actor, "roll-strike-critical", "strike", "pf2e-prepared", () => strike.critical!(options));
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

  async changeCarryType(
    actor: Actor,
    itemId: string,
    options: CharacterCarryTypeOptions,
  ): Promise<unknown> {
    assertCanUse(actor);
    const item = getItem(actor, itemId);
    const operation = (actor as PF2eActorActions).changeCarryType;
    if (typeof operation !== "function") {
      throw unavailable(
        "ETHERNUM.CharacterSheet.Errors.CarryTypeUnavailable",
        "PF2e cannot change this item's carry state from the Ethernum sheet.",
      );
    }
    const normalized: CharacterCarryTypeOptions = {
      carryType: options.carryType,
      ...(options.carryType === "held" && Number.isFinite(options.handsHeld)
        ? { handsHeld: Math.max(1, Math.min(2, Math.trunc(options.handsHeld ?? 1))) }
        : {}),
      ...(options.carryType === "worn" && options.inSlot !== undefined ? { inSlot: options.inSlot } : {}),
    };
    return measured(actor, "carry-type", "carryType", "pf2e-prepared",
      () => operation.call(actor, item, normalized));
  },

  async toggleEquipped(actor: Actor, itemId: string, equipped: boolean): Promise<unknown> {
    const item = getItem(actor, itemId) as PF2eItemActions & {
      system?: { equipped?: { carryType?: string } };
    };
    const current = item.system?.equipped?.carryType;
    const carryType: CharacterCarryType = equipped ? (current === "held" ? "held" : "worn") : "stowed";
    return this.changeCarryType(actor, itemId, { carryType, ...(carryType === "held" ? { handsHeld: 1 } : {}) });
  },

  async toggleInvested(actor: Actor, itemId: string, invested: boolean): Promise<unknown> {
    assertCanUse(actor);
    const item = getItem(actor, itemId);
    if (item.isInvestable !== true) {
      throw unavailable(
        "ETHERNUM.CharacterSheet.Errors.InvestmentUnavailable",
        "PF2e does not consider this item investable.",
      );
    }
    return updateDocument(item, { "system.equipped.invested": invested });
  },

  async castSpell(actor: Actor, options: CharacterCastSpellOptions): Promise<unknown> {
    assertCanUse(actor);
    const collection = spellCollection(actor, options.entryId);
    const spell = collection?.get?.(options.spellId);
    const cast = collection?.entry?.cast;
    if (!collection || !spell || typeof cast !== "function") {
      throw unavailable(
        "ETHERNUM.CharacterSheet.Errors.SpellCastUnavailable",
        "PF2e spell casting is unavailable. Open the original PF2e sheet to continue.",
      );
    }
    const rank = Math.max(0, Math.min(10, Math.trunc(options.rank)));
    return measured(actor, "cast-spell", "spellCast", "pf2e-prepared", () => cast.call(collection.entry, spell, {
      rank,
      ...(Number.isInteger(options.slotId) ? { slotId: options.slotId } : {}),
    }));
  },

  async addSpell(actor: Actor, entryId: string, spell: Item, groupId?: number | string): Promise<unknown> {
    assertCanUse(actor);
    const collection = spellCollection(actor, entryId);
    if (typeof collection?.addSpell !== "function") {
      throw unavailable(
        "ETHERNUM.CharacterSheet.Errors.SpellDropUnavailable",
        "PF2e cannot add this spell from the Ethernum sheet.",
      );
    }
    return measured(actor, "add-spell", "spellCollections", "pf2e-prepared",
      () => collection.addSpell!(spell, groupId === undefined ? {} : { groupId }));
  },

  async increaseCondition(actor: Actor, slug: string, options: Record<string, unknown> = {}): Promise<unknown> {
    assertCanUse(actor);
    const operation = (actor as PF2eActorActions).increaseCondition;
    if (typeof operation !== "function") {
      throw unavailable("ETHERNUM.CharacterSheet.Errors.ConditionUnavailable", "PF2e condition controls are unavailable.");
    }
    return measured(actor, "increase-condition", "conditions", "pf2e-prepared",
      () => operation.call(actor, slug, options));
  },

  async decreaseCondition(actor: Actor, slug: string, options: Record<string, unknown> = {}): Promise<unknown> {
    assertCanUse(actor);
    const operation = (actor as PF2eActorActions).decreaseCondition;
    if (typeof operation !== "function") {
      throw unavailable("ETHERNUM.CharacterSheet.Errors.ConditionUnavailable", "PF2e condition controls are unavailable.");
    }
    return measured(actor, "decrease-condition", "conditions", "pf2e-prepared",
      () => operation.call(actor, slug, options));
  },

  async setResource(actor: Actor, slug: string, value: number): Promise<unknown> {
    assertCanUse(actor);
    const operation = (actor as PF2eActorActions).updateResource;
    const resource = characterResource(actor, slug);
    if (typeof operation !== "function" || !resource) {
      throw unavailable("ETHERNUM.CharacterSheet.Errors.ResourceUnavailable", "PF2e resource controls are unavailable.");
    }
    const next = Math.max(0, Math.min(Number.isFinite(resource.max) ? resource.max : value, Math.trunc(value)));
    return measured(actor, "update-resource", "resources", "pf2e-prepared",
      () => operation.call(actor, slug, next));
  },

  async adjustResource(actor: Actor, slug: string, delta: number): Promise<unknown> {
    const resource = characterResource(actor, slug);
    if (!resource) {
      throw unavailable("ETHERNUM.CharacterSheet.Errors.ResourceUnavailable", "PF2e resource controls are unavailable.");
    }
    return this.setResource(actor, slug, resource.value + Math.trunc(delta));
  },

  async updateHP(actor: Actor, value: number): Promise<unknown> {
    assertCanUse(actor);
    return measured(actor, "update-hp", "actorDocument", "document-fallback",
      () => updateDocument(actor, { "system.attributes.hp.value": Math.max(0, Math.trunc(value)) }));
  },

  async updateHeroPoints(actor: Actor, value: number): Promise<unknown> {
    return this.setResource(actor, "hero-points", value);
  },
};
