import { ETHERNUM } from "../../config.js";
import type {
  GeneratedMechanicComponent,
  GeneratedNPCMechanicActorState,
  GeneratedNPCMechanicApplicationInput,
  GeneratedNPCMechanicApplicationResult,
  GeneratedNPCMechanicAppliedState,
  GeneratedNPCMechanicRevertInput,
} from "../../generators/mechanics/GeneratedNPCMechanicTypes.js";
import { GENERATED_NPC_MECHANIC_SCHEMA_VERSION } from "../../generators/mechanics/GeneratedNPCMechanicTypes.js";
import { validateGeneratedNPCMechanicDefinition } from "../../generators/mechanics/GeneratedNPCMechanicValidator.js";
import { analyzePF2eNPC } from "../../generators/mechanics/PF2eNPCMechanicSource.js";

const FLAG = "generatedNPCMechanic";
type Data = Record<string, unknown>;

function record(value: unknown): Data {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
}

function list<T>(value: unknown): T[] {
  return value && typeof (value as Iterable<T>)[Symbol.iterator] === "function" ? Array.from(value as Iterable<T>) : [];
}

function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stateFrom(value: unknown): GeneratedNPCMechanicActorState {
  const source = record(value);
  if (source.schemaVersion !== GENERATED_NPC_MECHANIC_SCHEMA_VERSION) return { schemaVersion: GENERATED_NPC_MECHANIC_SCHEMA_VERSION };
  const current = record(source.current) as unknown as GeneratedNPCMechanicAppliedState;
  try {
    if (current?.definition) validateGeneratedNPCMechanicDefinition(current.definition);
  } catch {
    return { schemaVersion: GENERATED_NPC_MECHANIC_SCHEMA_VERSION };
  }
  return clone(source) as unknown as GeneratedNPCMechanicActorState;
}

function actionType(component: GeneratedMechanicComponent): { value: string; actions: number | null } {
  if (component.actionCost === "reaction") return { value: "reaction", actions: null };
  if (component.actionCost === "free") return { value: "free", actions: null };
  if (component.actionCost === "passive") return { value: "passive", actions: null };
  return { value: "action", actions: component.actionCost };
}

function inlineOperations(component: GeneratedMechanicComponent): string {
  const operation = component.operation;
  if (!operation) return "";
  const rows: string[] = [];
  if (operation.save) {
    const basic = operation.save.basic ? "|basic" : "";
    rows.push(`<p><strong>Teste:</strong> @Check[${operation.save.type}|dc:${operation.save.dc}${basic}]</p>`);
  }
  if (operation.damage) rows.push(`<p><strong>Dano:</strong> @Damage[${operation.damage.formula}[${operation.damage.type}]]</p>`);
  if (operation.condition) rows.push(`<p><strong>Condição:</strong> ${escapeHtml(operation.condition.slug)} ${operation.condition.value} por ${operation.condition.durationRounds} rodada(s).</p>`);
  if (operation.resource) rows.push(`<p><strong>Recurso:</strong> ${escapeHtml(operation.resource.name)} ${operation.resource.maximum}; custo ${operation.resource.spend}.</p>`);
  return rows.join("");
}

export function generatedNPCMechanicItemSource(
  component: GeneratedMechanicComponent,
  applicationId: string,
): Data {
  const nativeAction = actionType(component);
  const details = [
    `<p>${escapeHtml(component.summary)}</p>`,
    component.trigger ? `<p><strong>Gatilho:</strong> ${escapeHtml(component.trigger)}</p>` : "",
    component.requirements ? `<p><strong>Requisitos:</strong> ${escapeHtml(component.requirements)}</p>` : "",
    `<p><strong>Efeito:</strong> ${escapeHtml(component.effect)}</p>`,
    component.cooldownRounds ? `<p><strong>Recarga:</strong> ${component.cooldownRounds} rodada(s).</p>` : "",
    component.limitedUses ? `<p><strong>Usos:</strong> ${component.limitedUses} por encontro.</p>` : "",
    inlineOperations(component),
    `<p><em>Template experimental ${escapeHtml(component.templateId)}. Revise antes da sessão.</em></p>`,
  ].join("");
  return {
    name: component.name,
    type: "action",
    img: component.kind === "reaction" ? "icons/svg/wing.svg" : component.kind === "phase" ? "icons/svg/upgrade.svg" : component.kind === "passive" ? "icons/svg/aura.svg" : "icons/svg/sword.svg",
    system: {
      actionType: { value: nativeAction.value },
      actions: { value: nativeAction.actions },
      category: component.kind === "passive" ? "defensive" : "offensive",
      description: { value: details, gm: "" },
      traits: { value: component.traits, rarity: "unique", otherTags: [] },
      rules: [],
    },
    flags: {
      [ETHERNUM.MODULE_NAME]: {
        generatedNPCMechanic: true,
        generatedNPCMechanicApplicationId: applicationId,
        generatedNPCMechanicComponentId: component.id,
        generatedNPCMechanicTemplateId: component.templateId,
      },
    },
  };
}

function itemApplicationId(item: Item): string {
  const flags = record((item as Item & { flags?: unknown }).flags);
  return String(record(flags[ETHERNUM.MODULE_NAME]).generatedNPCMechanicApplicationId ?? "");
}

function itemSource(item: Item): Data {
  const source = (item as Item & { toObject?: () => unknown }).toObject?.() ?? item;
  return clone(record(source));
}

function actorItems(actor: Actor): Item[] {
  return list<Item>((actor as Actor & { items?: Iterable<Item> }).items);
}

function generatedItems(actor: Actor, applied?: GeneratedNPCMechanicAppliedState): Item[] {
  if (!applied) return [];
  const ids = new Set(applied.itemIds);
  return actorItems(actor).filter(item => item.id && ids.has(item.id) && itemApplicationId(item) === applied.applicationId);
}

async function createItems(actor: Actor, sources: Data[], keepId = false): Promise<Item[]> {
  return (actor as Actor & {
    createEmbeddedDocuments: (name: "Item", data: Data[], operation?: Data) => Promise<Item[]>;
  }).createEmbeddedDocuments("Item", sources, { render: false, keepId });
}

async function deleteItems(actor: Actor, items: Item[]): Promise<void> {
  const ids = items.flatMap(item => item.id ? [item.id] : []);
  if (ids.length === 0) return;
  await (actor as Actor & {
    deleteEmbeddedDocuments: (name: "Item", ids: string[], operation?: Data) => Promise<unknown>;
  }).deleteEmbeddedDocuments("Item", ids, { render: false });
}

async function resolveNPC(actorUuid: string): Promise<Actor> {
  const direct = list<Actor>((game as Game & { actors?: Iterable<Actor> }).actors).find(actor => actor.uuid === actorUuid || actor.id === actorUuid);
  const document = direct ?? (typeof fromUuid === "function"
    ? await (fromUuid as unknown as (uuid: string) => Promise<unknown>)(actorUuid)
    : null);
  if (!(document instanceof Actor) || (document.type as string) !== "npc") throw new Error("NPC PF2e de destino não foi encontrado.");
  return document;
}

async function restoreFlag(actor: Actor, raw: unknown): Promise<void> {
  if (raw === undefined) await actor.unsetFlag(ETHERNUM.MODULE_NAME, FLAG);
  else await (actor.setFlag as unknown as (scope: string, key: string, value: unknown) => Promise<unknown>)(
    ETHERNUM.MODULE_NAME,
    FLAG,
    clone(raw),
  );
}

export class GeneratedNPCMechanicService {
  getState(actor: Actor): GeneratedNPCMechanicActorState {
    return stateFrom(actor.getFlag(ETHERNUM.MODULE_NAME, FLAG));
  }

  hasManualProtection(actor: Actor): boolean {
    const raw = actor.getFlag(ETHERNUM.MODULE_NAME, FLAG);
    if (raw === undefined || raw === null) return false;
    const state = this.getState(actor);
    if (!state.current) {
      const keys = Object.keys(record(raw)).filter(key => key !== "schemaVersion");
      return keys.length > 0;
    }
    return state.current.definition.source === "manual";
  }

  async apply(input: GeneratedNPCMechanicApplicationInput): Promise<GeneratedNPCMechanicApplicationResult> {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode aplicar mecânicas geradas.");
    if (!/^[a-z0-9][a-z0-9:_-]{5,200}$/i.test(input.applicationId)) throw new Error("ID de aplicação inválido.");
    const actor = await resolveNPC(input.actorUuid);
    const definition = validateGeneratedNPCMechanicDefinition(input.definition);
    if (definition.metadata.actorUuid !== actor.uuid) throw new Error("A prévia foi gerada para outro NPC.");
    if (analyzePF2eNPC(actor).fingerprint !== definition.metadata.actorFingerprint) throw new Error("O NPC mudou após a prévia. Gere a mecânica novamente antes de aplicar.");
    const rawBefore = actor.getFlag(ETHERNUM.MODULE_NAME, FLAG);
    const stateBefore = this.getState(actor);
    if (stateBefore.current?.applicationId === input.applicationId) {
      return { applicationId: input.applicationId, actorUuid: actor.uuid!, actorName: actor.name, state: "duplicate", itemIds: [...stateBefore.current.itemIds] };
    }
    if (this.hasManualProtection(actor) && input.replaceManual !== true) throw new Error("Há uma mecânica manual protegida. Confirme explicitamente a substituição.");
    const previousItems = generatedItems(actor, stateBefore.current);
    const previousSources = previousItems.map(itemSource);
    const components = [definition.passive, definition.active, definition.reaction, definition.phase].filter(Boolean) as GeneratedMechanicComponent[];
    let created: Item[] = [];
    try {
      await deleteItems(actor, previousItems);
      created = await createItems(actor, components.map(componentValue => generatedNPCMechanicItemSource(componentValue, input.applicationId)));
      const itemIds = created.flatMap(item => item.id ? [item.id] : []);
      if (itemIds.length !== components.length) throw new Error("O PF2e não criou todos os Items da mecânica.");
      await actor.setFlag(ETHERNUM.MODULE_NAME, FLAG, {
        schemaVersion: GENERATED_NPC_MECHANIC_SCHEMA_VERSION,
        current: { applicationId: input.applicationId, appliedAt: Date.now(), definition: clone(definition), itemIds },
        rollback: { capturedAt: Date.now(), previous: stateBefore.current, itemSources: previousSources, rawState: clone(rawBefore) },
      } satisfies GeneratedNPCMechanicActorState);
      return { applicationId: input.applicationId, actorUuid: actor.uuid!, actorName: actor.name, state: "completed", itemIds };
    } catch (error) {
      await deleteItems(actor, created);
      if (previousSources.length > 0) await createItems(actor, previousSources, true);
      await restoreFlag(actor, rawBefore);
      throw error;
    }
  }

  async revert(input: GeneratedNPCMechanicRevertInput): Promise<GeneratedNPCMechanicApplicationResult> {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode reverter mecânicas geradas.");
    const actor = await resolveNPC(input.actorUuid);
    const rawBefore = actor.getFlag(ETHERNUM.MODULE_NAME, FLAG);
    const state = this.getState(actor);
    if (state.lastRevertedApplicationId === input.applicationId) {
      return { applicationId: input.applicationId, actorUuid: actor.uuid!, actorName: actor.name, state: "duplicate", itemIds: [] };
    }
    if (!state.current || state.current.applicationId !== input.applicationId || !state.rollback) throw new Error("A aplicação informada não é a última mecânica reversível deste NPC.");
    const currentItems = generatedItems(actor, state.current);
    const currentSources = currentItems.map(itemSource);
    let restored: Item[] = [];
    try {
      await deleteItems(actor, currentItems);
      if (state.rollback.itemSources.length > 0) restored = await createItems(actor, state.rollback.itemSources, true);
      await restoreFlag(actor, state.rollback.rawState);
      return {
        applicationId: input.applicationId,
        actorUuid: actor.uuid!,
        actorName: actor.name,
        state: "reverted",
        itemIds: restored.flatMap(item => item.id ? [item.id] : []),
      };
    } catch (error) {
      await deleteItems(actor, restored);
      if (currentSources.length > 0) await createItems(actor, currentSources, true);
      await restoreFlag(actor, rawBefore);
      throw error;
    }
  }
}

let service: GeneratedNPCMechanicService | null = null;
export function getGeneratedNPCMechanicService(): GeneratedNPCMechanicService {
  return service ??= new GeneratedNPCMechanicService();
}
