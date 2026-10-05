import type { ErrorCode, RoomViewDto, ShotDto } from "../shared/protocol";

// What the client tells the screen.

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
  /** The opponent walked away for good: the room is closed and the client has no seat any more. */
  opponentLeft(): void;
}
