export interface PF2eCharacterCapabilities {
  carryType: boolean;
  resources: boolean;
  conditions: boolean;
  spellCollections: boolean;
  spellCast: boolean;
  spellPreparation: boolean;
  dragDrop: boolean;
}

export type PF2eCharacterCapability = keyof PF2eCharacterCapabilities;
export type PF2eBridgeSource = "pf2e-prepared" | "document-fallback" | "foundry-drop" | "drop-delegate";
export type PF2eBridgeFailureReason = "unsupported" | "not-found" | "invalid-input" | "operation-failed";

export interface PF2eBridgeSuccess<T> {
  ok: true;
  value: T;
  source: PF2eBridgeSource;
}

export interface PF2eBridgeFailure {
  ok: false;
  capability: PF2eCharacterCapability;
  reason: PF2eBridgeFailureReason;
  fallback: "open-pf2e-sheet";
  message: string;
  error?: unknown;
}

export type PF2eBridgeResult<T> = PF2eBridgeSuccess<T> | PF2eBridgeFailure;

export interface PF2eCarryTypeOptions {
  carryType: string;
  handsHeld?: number;
  inSlot?: boolean;
}

export interface PF2eSpellCastInput {
  actor: unknown;
  entryId: string;
  spellId: string;
  rank: number;
  slotId?: number;
  options?: Record<string, unknown>;
}

export interface PF2eSpellPreparationInput {
  actor: unknown;
  entryId: string;
  spellId?: string;
  spell?: unknown;
  groupId: string | number;
  slotIndex: number;
}

export interface PF2eSpellUnprepareInput {
  actor: unknown;
  entryId: string;
  groupId: string | number;
  slotIndex: number;
}

export interface PF2eAddSpellInput {
  actor: unknown;
  entryId: string;
  spell: unknown;
  groupId?: string | number;
}

export type PF2eDropResolver = (data: Record<string, unknown>) => unknown | Promise<unknown>;
export type PF2eDropDelegate = (input: {
  actor: unknown;
  event?: unknown;
  data?: Record<string, unknown>;
}) => unknown | Promise<unknown>;

export interface PF2eBridgeCapabilityContext {
  condition?: unknown;
  entryId?: string;
  dropResolver?: PF2eDropResolver;
  dropDelegate?: PF2eDropDelegate;
}

export interface PF2eHandleDropInput {
  actor: unknown;
  event?: unknown;
  data?: unknown;
  delegate?: PF2eDropDelegate;
}

export interface PF2eAddDroppedSpellInput {
  actor: unknown;
  entryId: string;
  dropData: unknown;
  groupId?: string | number;
  resolver?: PF2eDropResolver;
}

type UnknownObject = Record<PropertyKey, unknown>;
type UnknownMethod = (this: unknown, ...args: unknown[]) => unknown;

function object(value: unknown): UnknownObject | null {
  return (typeof value === "object" && value !== null) || typeof value === "function"
    ? value as UnknownObject
    : null;
}

function method(value: unknown, key: PropertyKey): UnknownMethod | null {
  const candidate = object(value)?.[key];
  return typeof candidate === "function" ? candidate as UnknownMethod : null;
}

function success<T>(value: T, source: PF2eBridgeSource): PF2eBridgeSuccess<T> {
  return { ok: true, value, source };
}

function failure(
  capability: PF2eCharacterCapability,
  reason: PF2eBridgeFailureReason,
  message: string,
  error?: unknown,
): PF2eBridgeFailure {
  return {
    ok: false,
    capability,
    reason,
    fallback: "open-pf2e-sheet",
    message,
    ...(error === undefined ? {} : { error }),
  };
}

async function invoke<T>(
  capability: PF2eCharacterCapability,
  source: PF2eBridgeSource,
  receiver: unknown,
  operation: UnknownMethod,
  args: unknown[],
): Promise<PF2eBridgeResult<T>> {
  try {
    return success(await Reflect.apply(operation, receiver, args) as T, source);
  } catch (error) {
    return failure(capability, "operation-failed", `PF2e ${capability} operation failed.`, error);
  }
}

function spellCollectionStore(actor: unknown): unknown {
  return object(object(actor)?.spellcasting)?.collections;
}

function collectionValues(collection: unknown): unknown[] {
  const values = method(collection, "values");
  if (values) {
    try {
      return [...Reflect.apply(values, collection, []) as Iterable<unknown>];
    } catch {
      return [];
    }
  }

  const iterator = method(collection, Symbol.iterator);
  if (!iterator) return [];
  try {
    return [...Reflect.apply(iterator, collection, []) as IterableIterator<unknown>]
      .map(value => Array.isArray(value) && value.length === 2 ? value[1] : value);
  } catch {
    return [];
  }
}

function findSpellCollection(actor: unknown, entryId: string): unknown {
  const store = spellCollectionStore(actor);
  const get = method(store, "get");
  if (get) return Reflect.apply(get, store, [entryId]);

  return collectionValues(store).find(collection => {
    const candidate = object(collection);
    return candidate?.id === entryId || object(candidate?.entry)?.id === entryId;
  });
}

function relevantSpellCollections(actor: unknown, entryId?: string): unknown[] {
  if (entryId) {
    const collection = findSpellCollection(actor, entryId);
    return collection === undefined || collection === null ? [] : [collection];
  }
  return collectionValues(spellCollectionStore(actor));
}

function hasSpellCollectionApi(actor: unknown): boolean {
  const store = spellCollectionStore(actor);
  return Boolean(method(store, "get") || method(store, Symbol.iterator) || method(store, "values"));
}

function explicitOrFoundryDropResolver(explicit?: PF2eDropResolver): PF2eDropResolver | null {
  if (typeof explicit === "function") return explicit;

  const itemClass = object((globalThis as typeof globalThis & { Item?: unknown }).Item);
  const implementation = object(itemClass?.implementation) ?? itemClass;
  const fromDropData = method(implementation, "fromDropData");
  return fromDropData
    ? data => Reflect.apply(fromDropData, implementation, [data])
    : null;
}

function parseDropData(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      return parseDropData(JSON.parse(value));
    } catch {
      return null;
    }
  }

  const candidate = object(value);
  const dataTransfer = object(candidate?.dataTransfer);
  const getData = method(dataTransfer, "getData");
  if (getData) {
    try {
      return parseDropData(Reflect.apply(getData, dataTransfer, ["text/plain"]));
    } catch {
      return null;
    }
  }

  if (!candidate || Array.isArray(value)) return null;
  return candidate as Record<string, unknown>;
}

function validEntryId(entryId: string): boolean {
  return typeof entryId === "string" && entryId.trim().length > 0;
}

function validGroupId(groupId: string | number): boolean {
  return typeof groupId === "string"
    ? groupId.trim().length > 0
    : Number.isInteger(groupId) && groupId >= 0;
}

function validSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0;
}

export function detectPF2eCharacterCapabilities(
  actor: unknown,
  context: PF2eBridgeCapabilityContext = {},
): PF2eCharacterCapabilities {
  const collections = relevantSpellCollections(actor, context.entryId);
  const actorConditions = Boolean(method(actor, "increaseCondition") && method(actor, "decreaseCondition"));
  const documentConditions = Boolean(method(context.condition, "increase") && method(context.condition, "decrease"));

  return {
    carryType: Boolean(method(actor, "changeCarryType")),
    resources: Boolean(method(actor, "getResource") && method(actor, "updateResource")),
    conditions: actorConditions || documentConditions,
    spellCollections: hasSpellCollectionApi(actor),
    spellCast: collections.some(collection => Boolean(method(object(collection)?.entry, "cast"))),
    spellPreparation: collections.some(collection => Boolean(method(collection, "prepareSpell"))),
    dragDrop: Boolean(context.dropDelegate || explicitOrFoundryDropResolver(context.dropResolver)),
  };
}

export async function changeCarryType(
  actor: unknown,
  item: unknown,
  options: PF2eCarryTypeOptions,
): Promise<PF2eBridgeResult<unknown>> {
  const operation = method(actor, "changeCarryType");
  if (!operation) return failure("carryType", "unsupported", "PF2e changeCarryType is unavailable.");
  if (!object(item) || !options || typeof options.carryType !== "string" || !options.carryType.trim()) {
    return failure("carryType", "invalid-input", "A PF2e item and carry type are required.");
  }

  const handsHeld = options.handsHeld ?? 0;
  if (!validSlot(handsHeld)) {
    return failure("carryType", "invalid-input", "handsHeld must be a non-negative integer.");
  }

  return invoke("carryType", "pf2e-prepared", actor, operation, [item, {
    carryType: options.carryType,
    handsHeld,
    inSlot: options.inSlot ?? false,
  }]);
}

export async function getResource(actor: unknown, slug: string): Promise<PF2eBridgeResult<unknown>> {
  const operation = method(actor, "getResource");
  if (!operation) return failure("resources", "unsupported", "PF2e getResource is unavailable.");
  if (!slug?.trim()) return failure("resources", "invalid-input", "A resource slug is required.");

  try {
    const resource = Reflect.apply(operation, actor, [slug]);
    return resource === null || resource === undefined
      ? failure("resources", "not-found", `PF2e resource not found: ${slug}.`)
      : success(resource, "pf2e-prepared");
  } catch (error) {
    return failure("resources", "operation-failed", "PF2e resources operation failed.", error);
  }
}

export async function updateResource(
  actor: unknown,
  slug: string,
  value: number,
  options: Record<string, unknown> = {},
): Promise<PF2eBridgeResult<unknown>> {
  const get = method(actor, "getResource");
  const update = method(actor, "updateResource");
  if (!get || !update) return failure("resources", "unsupported", "PF2e resource APIs are unavailable.");
  if (!slug?.trim() || !Number.isFinite(value)) {
    return failure("resources", "invalid-input", "A resource slug and finite value are required.");
  }

  try {
    const resource = Reflect.apply(get, actor, [slug]);
    if (resource === null || resource === undefined) {
      return failure("resources", "not-found", `PF2e resource not found: ${slug}.`);
    }
  } catch (error) {
    return failure("resources", "operation-failed", "PF2e resources operation failed.", error);
  }

  return invoke("resources", "pf2e-prepared", actor, update, [slug, value, options]);
}

export async function increaseCondition(
  actor: unknown,
  condition: unknown,
  options: Record<string, unknown> = {},
): Promise<PF2eBridgeResult<unknown>> {
  const actorOperation = method(actor, "increaseCondition");
  if (actorOperation) {
    return invoke("conditions", "pf2e-prepared", actor, actorOperation, [condition, options]);
  }

  const documentOperation = method(condition, "increase");
  return documentOperation
    ? invoke("conditions", "document-fallback", condition, documentOperation, [])
    : failure("conditions", "unsupported", "PF2e condition increase APIs are unavailable.");
}

export async function decreaseCondition(
  actor: unknown,
  condition: unknown,
  options: Record<string, unknown> = {},
): Promise<PF2eBridgeResult<unknown>> {
  const actorOperation = method(actor, "decreaseCondition");
  if (actorOperation) {
    return invoke("conditions", "pf2e-prepared", actor, actorOperation, [condition, options]);
  }

  const documentOperation = method(condition, "decrease");
  return documentOperation
    ? invoke("conditions", "document-fallback", condition, documentOperation, [])
    : failure("conditions", "unsupported", "PF2e condition decrease APIs are unavailable.");
}

export async function getSpellCollection(
  actor: unknown,
  entryId: string,
): Promise<PF2eBridgeResult<unknown>> {
  if (!hasSpellCollectionApi(actor)) {
    return failure("spellCollections", "unsupported", "PF2e spellcasting collections are unavailable.");
  }
  if (!validEntryId(entryId)) {
    return failure("spellCollections", "invalid-input", "A spellcasting entry id is required.");
  }

  try {
    const collection = findSpellCollection(actor, entryId);
    return collection === null || collection === undefined
      ? failure("spellCollections", "not-found", `PF2e spellcasting collection not found: ${entryId}.`)
      : success(collection, "pf2e-prepared");
  } catch (error) {
    return failure("spellCollections", "operation-failed", "PF2e spell collection lookup failed.", error);
  }
}

export async function addSpell(input: PF2eAddSpellInput): Promise<PF2eBridgeResult<unknown>> {
  const collectionResult = await getSpellCollection(input.actor, input.entryId);
  if (!collectionResult.ok) return collectionResult;
  const operation = method(collectionResult.value, "addSpell");
  if (!operation) return failure("spellCollections", "unsupported", "PF2e collection.addSpell is unavailable.");
  if (!object(input.spell) || (input.groupId !== undefined && !validGroupId(input.groupId))) {
    return failure("spellCollections", "invalid-input", "A spell and valid group id are required.");
  }

  return invoke("spellCollections", "pf2e-prepared", collectionResult.value, operation, [
    input.spell,
    input.groupId === undefined ? {} : { groupId: input.groupId },
  ]);
}

export async function castSpell(input: PF2eSpellCastInput): Promise<PF2eBridgeResult<unknown>> {
  if (!validEntryId(input.entryId) || !input.spellId?.trim()
    || !Number.isInteger(input.rank) || input.rank < 0 || input.rank > 10
    || (input.slotId !== undefined && !validSlot(input.slotId))) {
    return failure("spellCast", "invalid-input", "Entry, spell, rank, and slot must identify a valid PF2e cast.");
  }

  const collectionResult = await getSpellCollection(input.actor, input.entryId);
  if (!collectionResult.ok) return { ...collectionResult, capability: "spellCast" };
  const collection = collectionResult.value;
  const getSpell = method(collection, "get");
  const cast = method(object(collection)?.entry, "cast");
  if (!getSpell || !cast) {
    return failure("spellCast", "unsupported", "PF2e prepared spell casting is unavailable.");
  }

  try {
    const spell = Reflect.apply(getSpell, collection, [input.spellId]);
    if (spell === null || spell === undefined) {
      return failure("spellCast", "not-found", `PF2e spell not found: ${input.spellId}.`);
    }
    const castOptions = {
      ...(input.options ?? {}),
      rank: input.rank,
      ...(input.slotId === undefined ? {} : { slotId: input.slotId }),
    };
    return invoke("spellCast", "pf2e-prepared", object(collection)?.entry, cast, [spell, castOptions]);
  } catch (error) {
    return failure("spellCast", "operation-failed", "PF2e prepared spell lookup failed.", error);
  }
}

async function preparationSpell(
  collection: unknown,
  spell: unknown,
  spellId: string | undefined,
): Promise<PF2eBridgeResult<unknown>> {
  if (spell !== undefined) return success(spell, "pf2e-prepared");
  if (!spellId?.trim()) {
    return failure("spellPreparation", "invalid-input", "A spell or spell id is required.");
  }

  const get = method(collection, "get");
  if (!get) return failure("spellPreparation", "unsupported", "PF2e collection.get is unavailable.");
  try {
    const resolved = Reflect.apply(get, collection, [spellId]);
    return resolved === null || resolved === undefined
      ? failure("spellPreparation", "not-found", `PF2e spell not found: ${spellId}.`)
      : success(resolved, "pf2e-prepared");
  } catch (error) {
    return failure("spellPreparation", "operation-failed", "PF2e prepared spell lookup failed.", error);
  }
}

export async function prepareSpell(input: PF2eSpellPreparationInput): Promise<PF2eBridgeResult<unknown>> {
  if (!validEntryId(input.entryId) || !validGroupId(input.groupId) || !validSlot(input.slotIndex)) {
    return failure("spellPreparation", "invalid-input", "Entry, group, and slot must identify a PF2e spell slot.");
  }

  const collectionResult = await getSpellCollection(input.actor, input.entryId);
  if (!collectionResult.ok) return { ...collectionResult, capability: "spellPreparation" };
  const operation = method(collectionResult.value, "prepareSpell");
  if (!operation) return failure("spellPreparation", "unsupported", "PF2e collection.prepareSpell is unavailable.");
  const spellResult = await preparationSpell(collectionResult.value, input.spell, input.spellId);
  if (!spellResult.ok) return spellResult;

  return invoke("spellPreparation", "pf2e-prepared", collectionResult.value, operation, [
    spellResult.value,
    input.groupId,
    input.slotIndex,
  ]);
}

export async function unprepareSpell(input: PF2eSpellUnprepareInput): Promise<PF2eBridgeResult<unknown>> {
  if (!validEntryId(input.entryId) || !validGroupId(input.groupId) || !validSlot(input.slotIndex)) {
    return failure("spellPreparation", "invalid-input", "Entry, group, and slot must identify a PF2e spell slot.");
  }

  const collectionResult = await getSpellCollection(input.actor, input.entryId);
  if (!collectionResult.ok) return { ...collectionResult, capability: "spellPreparation" };
  const operation = method(collectionResult.value, "prepareSpell");
  return operation
    ? invoke("spellPreparation", "pf2e-prepared", collectionResult.value, operation, [
      null,
      input.groupId,
      input.slotIndex,
    ])
    : failure("spellPreparation", "unsupported", "PF2e collection.prepareSpell is unavailable.");
}

export async function resolveDroppedItem(
  dropData: unknown,
  resolver?: PF2eDropResolver,
): Promise<PF2eBridgeResult<unknown>> {
  const data = parseDropData(dropData);
  if (!data) return failure("dragDrop", "invalid-input", "Foundry drop data is invalid.");
  const operation = explicitOrFoundryDropResolver(resolver);
  if (!operation) return failure("dragDrop", "unsupported", "Foundry Item.fromDropData is unavailable.");

  try {
    const item = await operation(data);
    return item === null || item === undefined
      ? failure("dragDrop", "not-found", "The dropped Foundry item could not be resolved.")
      : success(item, "foundry-drop");
  } catch (error) {
    return failure("dragDrop", "operation-failed", "Foundry drop resolution failed.", error);
  }
}

export async function handleDrop(input: PF2eHandleDropInput): Promise<PF2eBridgeResult<unknown>> {
  if (typeof input.delegate !== "function") {
    return failure("dragDrop", "unsupported", "A Foundry/PF2e drop delegate is required.");
  }
  const data = input.data === undefined ? undefined : parseDropData(input.data);
  if (input.data !== undefined && !data) {
    return failure("dragDrop", "invalid-input", "Foundry drop data is invalid.");
  }
  return invoke("dragDrop", "drop-delegate", undefined, input.delegate as UnknownMethod, [{
    actor: input.actor,
    event: input.event,
    data,
  }]);
}

export async function addDroppedSpell(input: PF2eAddDroppedSpellInput): Promise<PF2eBridgeResult<unknown>> {
  const itemResult = await resolveDroppedItem(input.dropData, input.resolver);
  if (!itemResult.ok) return itemResult;
  return addSpell({
    actor: input.actor,
    entryId: input.entryId,
    spell: itemResult.value,
    groupId: input.groupId,
  });
}

export const PF2eCharacterBridge = Object.freeze({
  capabilities: detectPF2eCharacterCapabilities,
  changeCarryType,
  getResource,
  updateResource,
  increaseCondition,
  decreaseCondition,
  getSpellCollection,
  addSpell,
  castSpell,
  prepareSpell,
  unprepareSpell,
  resolveDroppedItem,
  handleDrop,
  addDroppedSpell,
});
