/**
 * The messages the browser and the server send each other (as JSON text).
 * Only plain data lives here: no classes, so what is typed is what travels.
 */
import type { GamePhase } from "../application/Game";
import type { GameRuleErrorCode } from "../application/GameRuleError";
import type { GameSettings } from "../application/GameSettings";
import type { ShotOutcome } from "../domain/Fleet";
import type { FleetPresetId } from "../domain/fleetPresets";
import type { Player } from "../domain/Player";
import type { ShipKind } from "../domain/ShipDefinition";

export interface CellDto {
  readonly row: number;
  readonly column: number;
}

export interface ShipPlacementDto {
  readonly kind: ShipKind;
  readonly row: number;
  readonly column: number;
  readonly quarterTurns: number;
}

/** The rules the creator of a room picks. Everything else comes from the defaults. */
export interface RoomRulesDto {
  readonly fleetPreset: FleetPresetId;
  readonly allowTouching: boolean;
}

// ---- Browser → server. After create, join or rejoin the connection belongs to a seat,
// ---- so the other messages do not repeat the token.

export type ClientMessage =
  | { readonly type: "create"; readonly name: string; readonly rules: RoomRulesDto }
  | { readonly type: "join"; readonly code: string; readonly name: string }
  | { readonly type: "rejoin"; readonly code: string; readonly token: string }
  | { readonly type: "ready"; readonly ships: readonly ShipPlacementDto[] }
  | { readonly type: "fire"; readonly cell: CellDto }
  | { readonly type: "rematch" };

// ---- What one player is allowed to see ----

export interface ShotViewDto {
  readonly cell: CellDto;
  readonly hit: boolean;
}

export interface ShipDto {
  readonly cells: readonly CellDto[];
  readonly quarterTurns: number;
}

export interface GameViewDto {
  readonly you: Player;
  readonly phase: GamePhase;
  readonly settings: GameSettings;
  readonly wins: Readonly<Record<Player, number>>;
  readonly youAreReady: boolean;
  readonly opponentIsReady: boolean;
  readonly yourTurn: boolean;
  readonly secondsLeft?: number;
  readonly winner?: Player;
  readonly yourShips: readonly ShipDto[];
  readonly shotsAtYou: readonly CellDto[];
  readonly yourShots: readonly ShotViewDto[];
  readonly sunkEnemyShips: readonly ShipDto[];
  readonly revealedEnemyShips: readonly ShipDto[];
  readonly knownEmptyEnemyCells: readonly CellDto[];
  readonly knownEmptyOwnCells: readonly CellDto[];
}

export interface RoomViewDto {
  readonly code: string;
  readonly yourName: string;
  readonly opponentName?: string;
  readonly youWantRematch: boolean;
  readonly opponentWantsRematch: boolean;
  readonly game: GameViewDto;
}

/** One shot that has just been fired, for sounds and animations. */
export interface ShotDto {
  readonly shooter: Player;
  readonly cell: CellDto;
  readonly outcome: ShotOutcome;
  readonly sunkShip?: readonly CellDto[];
  readonly wasRandom: boolean;
}

// ---- Server → browser ----

export type ErrorCode = GameRuleErrorCode | "bad-message";

export type ServerMessage =
  /** You sit at a table now. Keep the token: it is how you come back after a disconnect. */
  | {
      readonly type: "entered";
      readonly token: string;
      readonly room: RoomViewDto;
      readonly opponentOnline: boolean;
    }
  /** Something changed. This is the whole truth, so the browser can replace what it had. */
  | { readonly type: "state"; readonly room: RoomViewDto }
  | { readonly type: "shot"; readonly shot: ShotDto }
  | { readonly type: "presence"; readonly opponentOnline: boolean }
  | { readonly type: "error"; readonly code: ErrorCode; readonly message: string };
