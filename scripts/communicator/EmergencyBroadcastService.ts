import { ETHERNUM } from "../config.js";

export const EMERGENCY_BROADCAST_SEVERITIES = ["info", "warning", "critical"] as const;
export type EmergencyBroadcastSeverity = typeof EMERGENCY_BROADCAST_SEVERITIES[number];

export interface EmergencyBroadcastInput {
  broadcastId: string;
  severity: EmergencyBroadcastSeverity;
  title: string;
  message: string;
  recipientIds?: string[];
}

export interface EmergencyBroadcastDTO extends EmergencyBroadcastInput {
  createdAt: number;
  createdBy: string;
  authorName: string;
}

interface BroadcastMessage {
  id?: string | null;
  uuid?: string | null;
  timestamp?: number;
  whisper?: string[];
  flags?: Record<string, unknown>;
  author?: { id?: string | null; name?: string | null; isGM?: boolean };
  user?: { id?: string | null; name?: string | null; isGM?: boolean };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, maximum = 2_000): string {
  return typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maximum) : "";
}
function escaped(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character));
}
function collection<T>(value: unknown): T[] {
  return value && typeof (value as Iterable<T>)[Symbol.iterator] === "function" ? Array.from(value as Iterable<T>) : [];
}

export class EmergencyBroadcastService {
  async send(input: EmergencyBroadcastInput): Promise<EmergencyBroadcastDTO> {
    if (!game.user?.isGM) throw new Error("Somente o Gamemaster pode enviar comunicados de emergência.");
    const broadcastId = text(input.broadcastId, 160);
    const title = text(input.title, 180);
    const message = text(input.message, 2_000);
    const severity = EMERGENCY_BROADCAST_SEVERITIES.includes(input.severity) ? input.severity : "info";
    if (!broadcastId || !title || !message) throw new Error("Comunicado inválido.");
    const duplicate = this.list(250).find(entry => entry.broadcastId === broadcastId);
    if (duplicate) return duplicate;
    const validUsers = new Set(collection<User>(game.users).filter(user => user.active && !user.isGM && user.id).map(user => user.id!));
    const recipients = Array.from(new Set((input.recipientIds ?? []).filter(id => validUsers.has(id))));
    const createdAt = Date.now();
    const dto: EmergencyBroadcastDTO = {
      broadcastId,
      severity,
      title,
      message,
      ...(recipients.length ? { recipientIds: recipients } : {}),
      createdAt,
      createdBy: game.user.id!,
      authorName: game.user.name,
    };
    await ChatMessage.create({
      content: `<section class="ethernum-broadcast ethernum-broadcast--${severity}"><h3>${escaped(title)}</h3><p>${escaped(message)}</p></section>`,
      speaker: ChatMessage.getSpeaker(),
      ...(recipients.length ? { whisper: recipients } : {}),
      flags: { [ETHERNUM.MODULE_NAME]: { fieldCommunicator: { channel: "broadcast" }, emergencyBroadcast: dto } },
    } as never);
    return dto;
  }

  list(
    limit = 100,
    viewerId: string | null | undefined = game.user?.id,
    viewerIsGM = Boolean(game.user?.isGM),
    source?: Iterable<unknown>,
  ): EmergencyBroadcastDTO[] {
    const messages = source ?? (game as Game & { messages?: Iterable<BroadcastMessage> }).messages;
    return collection<BroadcastMessage>(messages)
      .slice(-Math.max(1, Math.min(500, limit)))
      .flatMap(message => {
        if (message.whisper?.length && (!viewerId || !message.whisper.includes(viewerId)) && !viewerIsGM) return [];
        const moduleFlags = record(record(message.flags)[ETHERNUM.MODULE_NAME]);
        const raw = record(moduleFlags.emergencyBroadcast);
        const author = message.author ?? message.user;
        if (!author?.isGM || !text(raw.broadcastId, 160)) return [];
        const severity = EMERGENCY_BROADCAST_SEVERITIES.includes(raw.severity as EmergencyBroadcastSeverity)
          ? raw.severity as EmergencyBroadcastSeverity
          : "info";
        return [{
          broadcastId: text(raw.broadcastId, 160),
          severity,
          title: text(raw.title, 180),
          message: text(raw.message, 2_000),
          ...(Array.isArray(raw.recipientIds) ? { recipientIds: raw.recipientIds.map(value => text(value, 160)).filter(Boolean) } : {}),
          createdAt: Number(raw.createdAt) || Number(message.timestamp) || 0,
          createdBy: text(author.id, 160),
          authorName: text(author.name, 180) || "Gamemaster",
        } satisfies EmergencyBroadcastDTO];
      })
      .sort((left, right) => right.createdAt - left.createdAt);
  }
}

let service: EmergencyBroadcastService | null = null;
export function getEmergencyBroadcastService(): EmergencyBroadcastService { return service ??= new EmergencyBroadcastService(); }
