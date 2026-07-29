const DEFAULT_MESSAGE_CACHE_LIMIT = 1000;

export interface AuthorityUser {
  id?: string | null;
  active?: boolean;
  isGM?: boolean;
}

export function selectPrimaryGM(users: Iterable<AuthorityUser>): AuthorityUser | null {
  return [...users]
    .filter(user => user.active && user.isGM && typeof user.id === "string" && user.id.length > 0)
    .sort((left, right) => {
      const leftId = String(left.id);
      const rightId = String(right.id);
      return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
    })[0] ?? null;
}

export class AutomationAuthority {
  private static processedMessageIds = new Map<string, Set<string>>();

  static getPrimaryGM(): User | null {
    return selectPrimaryGM(game.users ?? []) as User | null;
  }

  static isPrimaryGM(user: User | null | undefined = game.user): boolean {
    const primary = this.getPrimaryGM();
    return Boolean(primary?.id && user?.id === primary.id);
  }

  static canMutate(actor?: Actor | null, allowOwnerFallback = false): boolean {
    const primary = this.getPrimaryGM();
    if (primary) return game.user?.id === primary.id;
    return allowOwnerFallback && Boolean(actor && (actor as Actor & { isOwner?: boolean }).isOwner);
  }

  static claimChatMessage(
    message: ChatMessage,
    scope: string,
    limit = DEFAULT_MESSAGE_CACHE_LIMIT,
  ): boolean {
    const messageId = message.id;
    if (!messageId) {
      console.debug(`Ethernum | Ignorando ChatMessage sem ID no escopo "${scope}".`);
      return false;
    }

    const processed = this.processedMessageIds.get(scope) ?? new Set<string>();
    if (processed.has(messageId)) return false;

    processed.add(messageId);
    while (processed.size > Math.max(10, limit)) {
      const oldest = processed.values().next().value as string | undefined;
      if (!oldest) break;
      processed.delete(oldest);
    }
    this.processedMessageIds.set(scope, processed);
    return true;
  }

  static clearProcessedMessages(scope?: string): void {
    if (scope) this.processedMessageIds.delete(scope);
    else this.processedMessageIds.clear();
  }
}
