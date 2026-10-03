import type {
  CellDto,
  ClientMessage,
  ErrorCode,
  RoomRulesDto,
  RoomViewDto,
  ServerMessage,
  ShipPlacementDto,
  ShotDto,
} from "../shared/protocol";

// ---- What the client needs from the outside world ----

export interface SocketHandlers {
  onOpen(): void;
  onMessage(text: string): void;
  onClose(): void;
}

export interface ClientSocket {
  send(text: string): void;
  close(): void;
}

export type SocketFactory = (handlers: SocketHandlers) => ClientSocket;

/** Where the client keeps the way back to its seat, so a page refresh does not lose the game. */
export interface Session {
  readonly code: string;
  readonly token: string;
}

export interface SessionStore {
  load(): Session | undefined;
  save(session: Session): void;
  clear(): void;
}

export type Scheduler = (action: () => void, delayMilliseconds: number) => void;

// ---- What the client tells the screen ----

export type ConnectionStatus = "connecting" | "online" | "offline";

export interface ClientState {
  readonly status: ConnectionStatus;
  readonly room?: RoomViewDto;
  readonly opponentOnline: boolean;
}

export interface ClientFailure {
  readonly code: ErrorCode;
  readonly message: string;
}

export interface ClientListener {
  stateChanged(state: ClientState): void;
  shotFired(shot: ShotDto): void;
  failed(failure: ClientFailure): void;
}

export interface GameClientOptions {
  readonly createSocket: SocketFactory;
  readonly store: SessionStore;
  readonly schedule: Scheduler;
  readonly listener: ClientListener;
}

const RECONNECT_DELAY_MILLISECONDS = 1_500;

const SERVER_MESSAGE_TYPES: readonly string[] = ["entered", "state", "shot", "presence", "error"];

/**
 * The browser's side of the conversation with the server.
 * It keeps the connection alive, remembers the seat, and turns messages into a state.
 */
export class GameClient {
  private socket: ClientSocket | undefined;
  private state: ClientState = { status: "connecting", opponentOnline: false };
  private isRejoining = false;
  private isStopped = false;

  constructor(private readonly options: GameClientOptions) {}

  get currentState(): ClientState {
    return this.state;
  }

  start(): void {
    this.connect();
  }

  stop(): void {
    this.isStopped = true;
    this.socket?.close();
  }

  // ---- Commands. Each one says whether it could be sent. ----

  create(name: string, rules: RoomRulesDto): boolean {
    return this.send({ type: "create", name, rules });
  }

  join(code: string, name: string): boolean {
    return this.send({ type: "join", code, name });
  }

  ready(ships: readonly ShipPlacementDto[]): boolean {
    return this.send({ type: "ready", ships });
  }

  fire(cell: CellDto): boolean {
    return this.send({ type: "fire", cell });
  }

  rematch(): boolean {
    return this.send({ type: "rematch" });
  }

  /** Walks away from the room for good: the seat is forgotten here, not only the connection. */
  leave(): void {
    this.options.store.clear();
    this.update({ room: undefined, opponentOnline: false });
    this.socket?.close();
  }

  private connect(): void {
    this.update({ status: "connecting" });
    this.socket = this.options.createSocket({
      onOpen: () => this.handleOpen(),
      onMessage: (text) => this.handleMessage(text),
      onClose: () => this.handleClose(),
    });
  }

  private handleOpen(): void {
    this.update({ status: "online" });

    const session = this.options.store.load();

    if (session !== undefined) {
      this.isRejoining = true;
      this.send({ type: "rejoin", code: session.code, token: session.token });
    }
  }

  private handleClose(): void {
    this.socket = undefined;
    this.update({ status: "offline", opponentOnline: false });

    if (!this.isStopped) {
      this.options.schedule(() => this.connect(), RECONNECT_DELAY_MILLISECONDS);
    }
  }

  private handleMessage(text: string): void {
    const message = parseServerMessage(text);

    if (message === undefined) {
      return;
    }

    switch (message.type) {
      case "entered":
        this.isRejoining = false;
        this.options.store.save({ code: message.room.code, token: message.token });
        this.update({ room: message.room, opponentOnline: message.opponentOnline });
        return;
      case "state":
        this.update({ room: message.room });
        return;
      case "presence":
        this.update({ opponentOnline: message.opponentOnline });
        return;
      case "shot":
        this.options.listener.shotFired(message.shot);
        return;
      case "error":
        this.handleError(message.code, message.message);
        return;
    }
  }

  private handleError(code: ErrorCode, message: string): void {
    if (this.isRejoining && code === "no-such-room") {
      this.isRejoining = false;
      this.options.store.clear();
      this.update({ room: undefined, opponentOnline: false });
    }
    this.options.listener.failed({ code, message });
  }

  private send(message: ClientMessage): boolean {
    if (this.state.status !== "online" || this.socket === undefined) {
      return false;
    }

    this.socket.send(JSON.stringify(message));
    return true;
  }

  private update(changes: Partial<ClientState>): void {
    this.state = { ...this.state, ...changes };
    this.options.listener.stateChanged(this.state);
  }
}

function parseServerMessage(text: string): ServerMessage | undefined {
  try {
    const value: unknown = JSON.parse(text);

    if (typeof value === "object" && value !== null && "type" in value) {
      return SERVER_MESSAGE_TYPES.includes(String(value.type)) ? (value as ServerMessage) : undefined;
    }
  } catch {
    // Not JSON: nothing to do with it.
  }
  return undefined;
}
