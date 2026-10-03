import type { GameView } from "./GameView";

/** What one player is allowed to know about the room. It never contains tokens. */
export interface RoomView {
  readonly code: string;
  readonly yourName: string;
  readonly opponentName?: string;
  readonly youWantRematch: boolean;
  readonly opponentWantsRematch: boolean;
  readonly game: GameView;
}
