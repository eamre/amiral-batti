import type { ShipPlacement } from "../application/buildFleet";
import type { ShotReport } from "../application/Game";
import type { GameView } from "../application/GameView";
import type { RoomView } from "../application/RoomView";
import { Position } from "../domain/Position";
import type {
  CellDto,
  GameViewDto,
  RoomViewDto,
  ShipPlacementDto,
  ShotDto,
} from "../shared/protocol";

/** Plain data in, domain objects out (messages from the browser). */
export function toPosition(cell: CellDto): Position {
  return new Position(cell.row, cell.column);
}

export function toPlacements(ships: readonly ShipPlacementDto[]): ShipPlacement[] {
  return ships.map((ship) => ({
    kind: ship.kind,
    origin: new Position(ship.row, ship.column),
    quarterTurns: ship.quarterTurns,
  }));
}

/** Domain objects in, plain data out (messages to the browser). */
export function toCellDto(position: Position): CellDto {
  return { row: position.row, column: position.column };
}

export function toShotDto(shot: ShotReport): ShotDto {
  return {
    shooter: shot.shooter,
    cell: toCellDto(shot.position),
    outcome: shot.outcome,
    sunkShip: shot.sunkShip?.cells.map(toCellDto),
    wasRandom: shot.wasRandom,
  };
}

export function toRoomViewDto(view: RoomView): RoomViewDto {
  return {
    code: view.code,
    yourName: view.yourName,
    opponentName: view.opponentName,
    youWantRematch: view.youWantRematch,
    opponentWantsRematch: view.opponentWantsRematch,
    game: toGameViewDto(view.game),
  };
}

function toGameViewDto(view: GameView): GameViewDto {
  return {
    you: view.you,
    phase: view.phase,
    settings: view.settings,
    wins: view.wins,
    youAreReady: view.youAreReady,
    opponentIsReady: view.opponentIsReady,
    yourTurn: view.yourTurn,
    secondsLeft: view.secondsLeft,
    winner: view.winner,
    yourShips: view.yourShips.map((cells) => cells.map(toCellDto)),
    shotsAtYou: view.shotsAtYou.map(toCellDto),
    yourShots: view.yourShots.map((shot) => ({ cell: toCellDto(shot.position), hit: shot.hit })),
    sunkEnemyShips: view.sunkEnemyShips.map((cells) => cells.map(toCellDto)),
    knownEmptyCells: view.knownEmptyCells.map(toCellDto),
  };
}
