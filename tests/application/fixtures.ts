import type { ShipPlacement } from "../../src/application/buildFleet";
import { Position } from "../../src/domain/Position";

const KINDS = ["carrier", "cruiser", "submarine", "destroyer", "boat"] as const;
const SHIP_LENGTHS = [5, 4, 3, 3, 2];

/**
 * A classic fleet: five horizontal ships on rows 0, 2, 4, 6 and 8.
 * Starting one player at column 0 and the other at column 5 lets a test
 * tell from a cell whose ship it is.
 */
export function placementsFrom(firstColumn: number): ShipPlacement[] {
  return KINDS.map((kind, index) => ({
    kind,
    origin: new Position(index * 2, firstColumn),
    quarterTurns: 0,
  }));
}

export function cellsOfShipAt(index: number, firstColumn: number): Position[] {
  return Array.from(
    { length: SHIP_LENGTHS[index] ?? 0 },
    (_, offset) => new Position(index * 2, firstColumn + offset),
  );
}

export function allShipCells(firstColumn: number): Position[] {
  return SHIP_LENGTHS.flatMap((_, index) => cellsOfShipAt(index, firstColumn));
}

/** A repeatable random source that looks random (mulberry32). Same seed, same numbers. */
export function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
