import { describe, expect, it } from "vitest";
import type { CellDto } from "../../../src/shared/protocol";
import { shipArt, type Polygon } from "../../../src/ui/board/shipArt";

const horizontal = (row: number, column: number, length: number): CellDto[] =>
  Array.from({ length }, (_, offset) => ({ row, column: column + offset }));

const vertical = (row: number, column: number, length: number): CellDto[] =>
  Array.from({ length }, (_, offset) => ({ row: row + offset, column }));

function boundsOf(polygon: Polygon) {
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);

  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

describe("shipArt: a straight ship", () => {
  it("is one hull with a pointed bow", () => {
    const { hull } = shipArt(horizontal(2, 1, 3));

    expect(hull).toHaveLength(1);
    expect(hull[0]).toHaveLength(5);
  });

  it("stays inside its own cells", () => {
    const [hull] = shipArt(horizontal(2, 1, 3)).hull;
    const { left, right, top, bottom } = boundsOf(hull!);

    expect(left).toBeGreaterThan(1);
    expect(right).toBeLessThan(4);
    expect(top).toBeGreaterThan(2);
    expect(bottom).toBeLessThan(3);
  });

  it("points its bow to the right when it lies flat", () => {
    const [hull] = shipArt(horizontal(2, 1, 3)).hull;
    const tip = hull!.reduce((best, point) => (point.x > best.x ? point : best));

    expect(tip.x).toBeCloseTo(3.94);
    expect(tip.y).toBeCloseTo(2.5);
  });

  it("points its bow down when it stands", () => {
    const [hull] = shipArt(vertical(0, 4, 3)).hull;
    const tip = hull!.reduce((best, point) => (point.y > best.y ? point : best));

    expect(tip.x).toBeCloseTo(4.5);
    expect(tip.y).toBeCloseTo(2.94);
  });

  it("points its bow to the left when it was turned half way", () => {
    const [hull] = shipArt(horizontal(2, 1, 3), 2).hull;
    const tip = hull!.reduce((best, point) => (point.x < best.x ? point : best));

    expect(tip.x).toBeCloseTo(1.06);
    expect(tip.y).toBeCloseTo(2.5);
  });

  it("points its bow up when it stands and was turned three quarters", () => {
    const [hull] = shipArt(vertical(0, 4, 3), 3).hull;
    const tip = hull!.reduce((best, point) => (point.y < best.y ? point : best));

    expect(tip.x).toBeCloseTo(4.5);
    expect(tip.y).toBeCloseTo(0.06);
  });

  it("ignores a turn count that does not fit the way the ship lies: the cells win", () => {
    const [hull] = shipArt(horizontal(2, 1, 3), 1).hull;
    const tip = hull!.reduce((best, point) => (point.x > best.x ? point : best));

    expect(tip.x).toBeCloseTo(3.94);
  });

  it("keeps the cabin of a two-cell ship toward the stern, on whichever side the stern is", () => {
    const [toTheRight] = shipArt(horizontal(0, 0, 2), 0).cabins;
    const [toTheLeft] = shipArt(horizontal(0, 0, 2), 2).cabins;

    expect(toTheRight!.x + toTheRight!.width / 2).toBeCloseTo(0.7);
    expect(toTheLeft!.x + toTheLeft!.width / 2).toBeCloseTo(1.3);
  });

  it.each([
    [0, "x", 5.94],
    [1, "y", 5.94],
    [2, "x", 5.06],
    [3, "y", 5.06],
  ] as const)("points the bow of a one-cell ship turned %i quarters to its own side", (turns, axis, tipAt) => {
    const [hull] = shipArt([{ row: 5, column: 5 }], turns).hull;
    const values = hull!.map((point) => point[axis]);
    const farthest = turns < 2 ? Math.max(...values) : Math.min(...values);

    expect(farthest).toBeCloseTo(tipAt);
  });

  it("is a single boat-shaped hull even when it is one cell", () => {
    expect(shipArt([{ row: 5, column: 5 }]).hull).toHaveLength(1);
  });

  it.each([
    [1, 0],
    [2, 1],
    [3, 1],
    [4, 2],
    [5, 3],
  ])("a ship of %i cells has %i cabins", (length, cabins) => {
    expect(shipArt(horizontal(0, 0, length)).cabins).toHaveLength(cabins);
  });

  it("puts every cabin on the middle line of the ship", () => {
    for (const cabin of shipArt(horizontal(4, 0, 5)).cabins) {
      expect(cabin.y + cabin.height / 2).toBeCloseTo(4.5);
    }
  });
});

describe("shipArt: a ship of any other shape", () => {
  const tShaped: CellDto[] = [
    { row: 0, column: 0 },
    { row: 1, column: 0 },
    { row: 2, column: 0 },
    { row: 1, column: 1 },
  ];

  it("is drawn as one block per cell", () => {
    expect(shipArt(tShaped).hull).toHaveLength(4);
  });

  it("has no cabins", () => {
    expect(shipArt(tShaped).cabins).toHaveLength(0);
  });

  it("looks the same whatever the turn count: the cells already show the way it stands", () => {
    expect(shipArt(tShaped, 2)).toEqual(shipArt(tShaped, 0));
  });

  // The T: the stem is cells 0, 1 and 2 (top to bottom), cell 3 is the arm to the right of cell 1.
  it.each([
    ["below", 0, (box: ReturnType<typeof boundsOf>) => box.bottom >= 1],
    ["above", 1, (box: ReturnType<typeof boundsOf>) => box.top <= 1],
    ["to the right", 1, (box: ReturnType<typeof boundsOf>) => box.right >= 1],
    ["to the left", 3, (box: ReturnType<typeof boundsOf>) => box.left <= 1],
  ])("reaches over the edge it shares with a neighbour %s, so no seam shows", (_side, index, reaches) => {
    expect(reaches(boundsOf(shipArt(tShaped).hull[index]!))).toBe(true);
  });

  it("keeps a gap at an edge that has no neighbour", () => {
    const top = boundsOf(shipArt(tShaped).hull[0]!);

    expect(top.top).toBeGreaterThan(0);
    expect(top.left).toBeGreaterThan(0);
    expect(top.right).toBeLessThan(1);
  });
});
