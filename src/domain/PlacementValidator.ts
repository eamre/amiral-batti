import type { Board } from "./Board";
import type { Ship } from "./Ship";

export type PlacementResult = "valid" | "outside" | "overlaps" | "touches";

export class PlacementValidator {
  constructor(
    private readonly board: Board,
    private readonly allowTouching: boolean,
  ) {}

  check(ship: Ship, otherShips: readonly Ship[]): PlacementResult {
    if (!this.board.containsShip(ship)) {
      return "outside";
    }
    if (otherShips.some((other) => ship.overlaps(other))) {
      return "overlaps";
    }
    if (!this.allowTouching && otherShips.some((other) => ship.touches(other))) {
      return "touches";
    }
    return "valid";
  }
}