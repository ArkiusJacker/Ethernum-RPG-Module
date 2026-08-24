import type { EncounterAnalysisInput, EncounterParticipant } from "./EncounterAnalyzerTypes.js";

interface CombatantLike {
  id?: string | null;
  name?: string | null;
  actor?: Actor | null;
  token?: { disposition?: number } | null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function collection<T>(value: unknown): T[] {
  return value && typeof (value as Iterable<T>)[Symbol.iterator] === "function" ? Array.from(value as Iterable<T>) : [];
}

function actorLevel(actor: Actor): number {
  const source = actor as Actor & { level?: number; system?: unknown };
  const system = record(source.system);
  const parsed = Number(source.level ?? record(record(system.details).level).value ?? record(system.level).value ?? system.level);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(30, Math.floor(parsed))) : 0;
}

function participant(actor: Actor, id: string, disposition: EncounterParticipant["disposition"]): EncounterParticipant {
  return { id, name: actor.name, level: actorLevel(actor), disposition };
}

export class PF2eEncounterSource {
  current(): EncounterAnalysisInput {
    const combat = (game as Game & { combat?: { id?: string | null; name?: string | null; combatants?: Iterable<CombatantLike>; system?: unknown } | null }).combat;
    const combatants = collection<CombatantLike>(combat?.combatants).filter(entry => entry.actor);
    let party = combatants
      .filter(entry => (entry.actor?.type as string) === "character")
      .map(entry => participant(entry.actor!, String(entry.id ?? entry.actor!.id), "party"));
    const enemies = combatants
      .filter(entry => (entry.actor?.type as string) === "npc" && Number(entry.token?.disposition) !== 1)
      .map(entry => participant(entry.actor!, String(entry.id ?? entry.actor!.id), "enemy"));
    if (party.length === 0) {
      party = collection<User & { character?: Actor | null }>(game.users)
        .filter(user => !user.isGM && user.character)
        .map(user => participant(user.character!, String(user.character!.id), "party"));
    }
    const combatSystem = record(combat?.system);
    const prepared = Number(combatSystem.xp ?? record(combatSystem.encounter).xp);
    return {
      party,
      enemies,
      ...(Number.isFinite(prepared) && prepared >= 0 ? { preparedXp: prepared } : {}),
      encounterName: String(combat?.name ?? "Encontro atual"),
    };
  }
}
