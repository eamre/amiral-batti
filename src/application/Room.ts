import type { Player } from "../domain/Player";
import { opponentOf } from "../domain/Player";
import type { Position } from "../domain/Position";
import type { RandomSource } from "../domain/random";
import type { ShipPlacement } from "./buildFleet";
import { Game, type ShotReport } from "./Game";
import { GameRuleError } from "./GameRuleError";
import type { GameSettings } from "./GameSettings";
import { viewFor as gameViewFor } from "./GameView";
import type { RoomView } from "./RoomView";

const PLAYERS: readonly Player[] = ["first", "second"];
const MAX_NAME_LENGTH = 16;
const DEFAULT_NAME = "Player";

/** A person sitting at the table. The token is his secret: whoever knows it, is him. */
export interface Seat {
  readonly name: string;
  readonly token: string;
}

export interface RoomShot {
  readonly room: Room;
  readonly shot: ShotReport;
}

interface RoomState {
  readonly code: string;
  readonly seats: Readonly<Partial<Record<Player, Seat>>>;
  readonly game: Game;
  readonly rematchVotes: Readonly<Record<Player, boolean>>;
}

const NO_VOTES: Readonly<Record<Player, boolean>> = { first: false, second: false };

/**
 * A table for two: who sits where, the game they play, and whether they want a rematch.
 * It knows nothing about connections. Players are recognised by their token.
 * Like Game it is immutable: every change returns a new Room.
 */
export class Room {
  static open(code: string, settings: GameSettings, creator: Seat): Room {
    return new Room({
      code,
      seats: { first: cleanSeat(creator) },
      game: Game.create(settings),
      rematchVotes: NO_VOTES,
    });
  }

  private constructor(private readonly state: RoomState) {}

  get code(): string {
    return this.state.code;
  }

  get game(): Game {
    return this.state.game;
  }

  seatOf(token: string): Player | undefined {
    return PLAYERS.find((player) => this.state.seats[player]?.token === token);
  }

  join(joiner: Seat): Room {
    if (this.state.seats.second !== undefined) {
      throw new GameRuleError("room-full", "This room already has two players.");
    }

    return this.with({ seats: { ...this.state.seats, second: cleanSeat(joiner) } });
  }

  markReady(token: string, placements: readonly ShipPlacement[], now: number): Room {
    const player = this.playerWith(token);

    return this.with({ game: this.game.markReady(player, placements, now) });
  }

  fire(token: string, position: Position, now: number): RoomShot {
    const player = this.playerWith(token);
    const shot = this.game.fire(player, position, now);

    return { room: this.with({ game: shot.game }), shot };
  }

  fireIfTimeIsUp(now: number, random: RandomSource): RoomShot | undefined {
    const shot = this.game.fireIfTimeIsUp(now, random);

    return shot === undefined ? undefined : { room: this.with({ game: shot.game }), shot };
  }

  /** Both players have to ask for it; then the next round starts. */
  voteForRematch(token: string): Room {
    const player = this.playerWith(token);

    if (this.game.phase !== "finished") {
      throw new GameRuleError("wrong-phase", "A rematch can only be asked for after the round.");
    }

    const rematchVotes = { ...this.state.rematchVotes, [player]: true };

    if (rematchVotes.first && rematchVotes.second) {
      return this.with({ game: this.game.nextRound(), rematchVotes: NO_VOTES });
    }
    return this.with({ rematchVotes });
  }

  viewFor(token: string, now: number): RoomView {
    const player = this.playerWith(token);
    const opponent = opponentOf(player);

    return {
      code: this.code,
      yourName: this.nameOf(player),
      opponentName: this.state.seats[opponent]?.name,
      youWantRematch: this.state.rematchVotes[player],
      opponentWantsRematch: this.state.rematchVotes[opponent],
      game: gameViewFor(this.game, player, now),
    };
  }

  private nameOf(player: Player): string {
    return this.state.seats[player]?.name ?? DEFAULT_NAME;
  }

  private playerWith(token: string): Player {
    const player = this.seatOf(token);

    if (player === undefined) {
      throw new GameRuleError("unknown-player", "Nobody in this room has that token.");
    }
    return player;
  }

  private with(changes: Partial<RoomState>): Room {
    return new Room({ ...this.state, ...changes });
  }
}

function cleanSeat(seat: Seat): Seat {
  const name = seat.name.trim().slice(0, MAX_NAME_LENGTH);

  return { name: name === "" ? DEFAULT_NAME : name, token: seat.token };
}
