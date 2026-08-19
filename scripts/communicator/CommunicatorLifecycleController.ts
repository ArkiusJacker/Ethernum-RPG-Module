export const COMMUNICATOR_LIFECYCLE_STATES = Object.freeze([
  "idle",
  "opening",
  "open",
  "closing",
  "minimized",
] as const);

export type CommunicatorLifecycleState =
  (typeof COMMUNICATOR_LIFECYCLE_STATES)[number];

export type CommunicatorLifecycleSettledState = Extract<
  CommunicatorLifecycleState,
  "idle" | "open" | "minimized"
>;

export type CommunicatorLifecycleIntent = "open" | "close" | "minimize";

export interface CommunicatorLifecycleSnapshot {
  readonly state: CommunicatorLifecycleState;
  readonly settledState: CommunicatorLifecycleSettledState;
  readonly targetState: CommunicatorLifecycleSettledState | null;
  readonly transitionToken: number;
  readonly activeToken: number | null;
}

export interface CommunicatorLifecycleTransition {
  readonly token: number;
  readonly intent: CommunicatorLifecycleIntent;
  readonly from: CommunicatorLifecycleState;
  readonly state: "opening" | "closing";
  readonly target: CommunicatorLifecycleSettledState;
}

export type CommunicatorLifecycleOperationStatus =
  | "started"
  | "coalesced"
  | "completed"
  | "unchanged";

export type CommunicatorLifecycleCompletionStatus =
  | "completed"
  | "superseded"
  | "cancelled"
  | "unchanged"
  | "stale";

export interface CommunicatorLifecycleCompletion {
  readonly status: CommunicatorLifecycleCompletionStatus;
  readonly token: number | null;
  readonly state: CommunicatorLifecycleState;
  readonly supersededBy?: number;
}

export interface CommunicatorLifecycleOperation {
  readonly status: CommunicatorLifecycleOperationStatus;
  readonly token: number | null;
  readonly supersededToken: number | null;
  readonly transition: CommunicatorLifecycleTransition | null;
  readonly snapshot: CommunicatorLifecycleSnapshot;
  readonly completion: Promise<CommunicatorLifecycleCompletion>;
}

interface ActiveTransition {
  descriptor: CommunicatorLifecycleTransition;
  completion: Promise<CommunicatorLifecycleCompletion>;
  resolve: (completion: CommunicatorLifecycleCompletion) => void;
}

const SETTLED_STATES = new Set<CommunicatorLifecycleSettledState>([
  "idle",
  "open",
  "minimized",
]);

function targetForIntent(
  intent: CommunicatorLifecycleIntent,
): CommunicatorLifecycleSettledState {
  switch (intent) {
    case "open": return "open";
    case "close": return "idle";
    case "minimize": return "minimized";
    default: throw new RangeError(`Invalid communicator lifecycle intent: ${String(intent)}`);
  }
}

/**
 * A side-effect-free lifecycle coordinator. Callers own animation work and must
 * settle it with the matching token; stale animation callbacks are ignored.
 */
export class CommunicatorLifecycleController {
  private currentState: CommunicatorLifecycleState;
  private lastSettledState: CommunicatorLifecycleSettledState;
  private lastToken = 0;
  private active: ActiveTransition | null = null;

  constructor(initialState: CommunicatorLifecycleSettledState = "idle") {
    if (!SETTLED_STATES.has(initialState)) {
      throw new RangeError(`Invalid initial communicator lifecycle state: ${initialState}`);
    }
    this.currentState = initialState;
    this.lastSettledState = initialState;
  }

  getState(): CommunicatorLifecycleSnapshot {
    return Object.freeze({
      state: this.currentState,
      settledState: this.lastSettledState,
      targetState: this.active?.descriptor.target ?? null,
      transitionToken: this.lastToken,
      activeToken: this.active?.descriptor.token ?? null,
    });
  }

  open(): CommunicatorLifecycleOperation {
    return this.request("open");
  }

  close(): CommunicatorLifecycleOperation {
    return this.request("close");
  }

  minimize(): CommunicatorLifecycleOperation {
    return this.request("minimize");
  }

  request(intent: CommunicatorLifecycleIntent): CommunicatorLifecycleOperation {
    const target = targetForIntent(intent);
    const previous = this.active;

    if (previous?.descriptor.target === target) {
      return {
        status: "coalesced",
        token: previous.descriptor.token,
        supersededToken: null,
        transition: previous.descriptor,
        snapshot: this.getState(),
        completion: previous.completion,
      };
    }

    if (!previous && this.currentState === target) {
      const completion = this.completion("unchanged", null);
      return {
        status: "unchanged",
        token: null,
        supersededToken: null,
        transition: null,
        snapshot: this.getState(),
        completion: Promise.resolve(completion),
      };
    }

    const token = this.nextToken();
    const supersededToken = previous?.descriptor.token ?? null;

    // Moving between hidden launcher states has no visual transition to await.
    if (!previous && this.currentState !== "open" && target !== "open") {
      this.currentState = target;
      this.lastSettledState = target;
      const completion = this.completion("completed", token);
      return {
        status: "completed",
        token,
        supersededToken: null,
        transition: null,
        snapshot: this.getState(),
        completion: Promise.resolve(completion),
      };
    }

    const transition: CommunicatorLifecycleTransition = Object.freeze({
      token,
      intent,
      from: this.currentState,
      state: target === "open" ? "opening" : "closing",
      target,
    });
    let resolve!: (completion: CommunicatorLifecycleCompletion) => void;
    const completion = new Promise<CommunicatorLifecycleCompletion>((settle) => {
      resolve = settle;
    });

    this.currentState = transition.state;
    this.active = { descriptor: transition, completion, resolve };

    if (previous) {
      previous.resolve(this.completion("superseded", previous.descriptor.token, token));
    }

    return {
      status: "started",
      token,
      supersededToken,
      transition,
      snapshot: this.getState(),
      completion,
    };
  }

  complete(token: number): CommunicatorLifecycleCompletion {
    const active = this.active;
    if (!active || active.descriptor.token !== token) {
      return this.completion("stale", token);
    }

    this.currentState = active.descriptor.target;
    this.lastSettledState = active.descriptor.target;
    this.active = null;
    const completion = this.completion("completed", token);
    active.resolve(completion);
    return completion;
  }

  cancel(token: number): CommunicatorLifecycleCompletion {
    const active = this.active;
    if (!active || active.descriptor.token !== token) {
      return this.completion("stale", token);
    }

    this.currentState = this.lastSettledState;
    this.active = null;
    const completion = this.completion("cancelled", token);
    active.resolve(completion);
    return completion;
  }

  private nextToken(): number {
    if (this.lastToken >= Number.MAX_SAFE_INTEGER) {
      throw new RangeError("Communicator lifecycle transition token exhausted.");
    }
    this.lastToken += 1;
    return this.lastToken;
  }

  private completion(
    status: CommunicatorLifecycleCompletionStatus,
    token: number | null,
    supersededBy?: number,
  ): CommunicatorLifecycleCompletion {
    return Object.freeze({
      status,
      token,
      state: this.currentState,
      ...(supersededBy === undefined ? {} : { supersededBy }),
    });
  }
}
