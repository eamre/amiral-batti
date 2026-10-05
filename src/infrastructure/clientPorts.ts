// What the client needs from the outside world. Each one is a plain interface, so tests can fake it.

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
