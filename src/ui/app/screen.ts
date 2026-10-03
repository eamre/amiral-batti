import type { GameViewDto, RoomViewDto } from "../../shared/protocol";

export type BoardSide = "own" | "enemy";

/** What the line under the title says. The screen turns each code into words. */
export type StatusCode =
  | "waiting-for-opponent"
  | "arrange-fleet"
  | "opponent-is-arranging"
  | "your-turn"
  | "opponent-turn"
  | "you-won"
  | "you-lost";

/**
 * There is one board on the screen. It shows the enemy waters while the viewer has something
 * to do there, and his own fleet otherwise.
 */
export function shownBoard(game: GameViewDto): BoardSide {
  if (game.phase === "placing") {
    return "own";
  }
  if (game.phase === "finished") {
    return game.winner === game.you ? "enemy" : "own";
  }
  return game.yourTurn ? "enemy" : "own";
}

/** Which screen the player is on. The app builds a screen when it changes and keeps it while it stays. */
export type ScreenKind = "lobby" | "placement" | "waiting" | "battle";

export function screenKindOf(room: RoomViewDto | undefined): ScreenKind {
  if (room === undefined) {
    return "lobby";
  }
  if (room.game.phase === "placing") {
    return room.game.youAreReady ? "waiting" : "placement";
  }
  return "battle";
}

export function statusOf(room: RoomViewDto): StatusCode {
  const { game } = room;

  if (game.phase === "placing") {
    if (room.opponentName === undefined) {
      return "waiting-for-opponent";
    }
    if (!game.youAreReady) {
      return "arrange-fleet";
    }
    return "opponent-is-arranging";
  }

  if (game.phase === "finished") {
    return game.winner === game.you ? "you-won" : "you-lost";
  }
  return game.yourTurn ? "your-turn" : "opponent-turn";
}

export function canFireNow(game: GameViewDto, isOnline: boolean): boolean {
  return isOnline && game.phase === "battle" && game.yourTurn;
}
