import type {
  FieldCommunicatorNotification,
  FieldCommunicatorNotificationPriority,
  FieldCommunicatorNotificationReadState,
} from "./FieldCommunicatorTypes.js";

export const FIELD_COMMUNICATOR_NOTIFICATION_READ_FLAG = "fieldCommunicatorNotificationReads";
export const FIELD_COMMUNICATOR_NOTIFICATION_LIMIT = 100;
const READ_LIMIT = 500;

export type FieldCommunicatorNotificationMode = "all" | "priority" | "off";
export type FieldCommunicatorNotificationSource = Omit<FieldCommunicatorNotification, "read">;

function text(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maximum)
    : "";
}

function timestamp(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function priority(value: unknown): FieldCommunicatorNotificationPriority {
  return value === "critical" || value === "priority" ? value : "normal";
}

export function normalizeNotificationReadState(value: unknown): FieldCommunicatorNotificationReadState {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const ids = Array.isArray(input.ids)
    ? Array.from(new Set(input.ids.map(id => text(id, 220)).filter(Boolean))).slice(-READ_LIMIT)
    : [];
  return { schemaVersion: 1, ids, updatedAt: timestamp(input.updatedAt) };
}

export function buildFieldCommunicatorNotifications(
  sources: readonly FieldCommunicatorNotificationSource[],
  readState: FieldCommunicatorNotificationReadState,
  mode: FieldCommunicatorNotificationMode = "all",
): FieldCommunicatorNotification[] {
  if (mode === "off") return [];
  const read = new Set(readState.ids);
  const deduplicated = new Map<string, FieldCommunicatorNotification>();
  for (const candidate of sources) {
    const id = text(candidate.id, 220);
    const type = text(candidate.type, 80);
    const title = text(candidate.title, 180);
    if (!id || !type || !title) continue;
    const itemPriority = priority(candidate.priority);
    if (mode === "priority" && itemPriority === "normal") continue;
    const body = text(candidate.body, 800);
    const targetAppId = text(candidate.targetAppId, 80);
    const targetId = text(candidate.targetId, 220);
    const createdLabel = text(candidate.createdLabel, 80);
    const item: FieldCommunicatorNotification = {
      id,
      type,
      title,
      ...(body ? { body } : {}),
      createdAt: timestamp(candidate.createdAt),
      ...(createdLabel ? { createdLabel } : {}),
      priority: itemPriority,
      read: read.has(id),
      ...(targetAppId ? { targetAppId } : {}),
      ...(targetId ? { targetId } : {}),
    };
    const previous = deduplicated.get(id);
    if (!previous || item.createdAt >= previous.createdAt) deduplicated.set(id, item);
  }
  return Array.from(deduplicated.values())
    .sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id))
    .slice(0, FIELD_COMMUNICATOR_NOTIFICATION_LIMIT);
}

export function addNotificationReads(
  state: FieldCommunicatorNotificationReadState,
  ids: readonly string[],
  now = Date.now(),
): FieldCommunicatorNotificationReadState {
  const nextIds = Array.from(new Set([
    ...state.ids,
    ...ids.map(id => text(id, 220)).filter(Boolean),
  ])).slice(-READ_LIMIT);
  return { schemaVersion: 1, ids: nextIds, updatedAt: timestamp(now) };
}
