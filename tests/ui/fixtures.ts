import type { GameViewDto, RoomViewDto } from "../../src/shared/protocol";

/** A game view in the middle of a battle, where it is the viewer's turn and nothing has happened yet. */
export function gameView(changes: Partial<GameViewDto> = {}): GameViewDto {
  return {
    you: "first",
    phase: "battle",
    settings: { boardSize: 10, fleetPreset: "classic", allowTouching: false, turnSeconds: 20 },
    wins: { first: 0, second: 0 },
    youAreReady: true,
    opponentIsReady: true,
    yourTurn: true,
    secondsLeft: 20,
    yourShips: [
      { cells: [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }], quarterTurns: 0 },
      { cells: [{ row: 5, column: 5 }, { row: 6, column: 5 }], quarterTurns: 3 },
    ],
    shotsAtYou: [],
    yourShots: [],
    sunkEnemyShips: [],
    knownEmptyEnemyCells: [],
    knownEmptyOwnCells: [],
    ...changes,
  };
}

export function roomView(changes: Partial<RoomViewDto> = {}): RoomViewDto {
  return {
    code: "ABCD",
    yourName: "Ahmet",
    opponentName: "Ayse",
    youWantRematch: false,
    opponentWantsRematch: false,
    game: gameView(),
    ...changes,
  };
}
