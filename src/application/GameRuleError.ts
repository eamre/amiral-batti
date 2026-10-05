export type GameRuleErrorCode =
  | "wrong-phase"
  | "already-ready"
  | "wrong-fleet"
  | "bad-placement"
  | "not-your-turn"
  | "shot-not-allowed"
  | "room-full"
  | "unknown-player"
  | "no-such-room"
  | "not-in-room"
  | "no-name";

/**
 * A player asked for something the rules do not allow.
 * It is not a bug: the caller can show `code` to the player and carry on.
 */
export class GameRuleError extends Error {
  constructor(
    readonly code: GameRuleErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GameRuleError";
  }
}
