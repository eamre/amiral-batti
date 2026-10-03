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
  it("is one smooth hull: its curves are drawn with many short sides", () => {
    const { hull } = shipArt(horizontal(2, 1, 3));

    expect(hull).toHaveLength(1);
    expect(hull[0]!.length).toBeGreaterThanOrEqual(16);
  });

  it("is the same on both sides of its middle line", () => {
    const [hull] = shipArt(horizontal(2, 1, 4)).hull;
    const mirrored = hull!.map((point) => ({ x: point.x, y: 5 - point.y }));

    for (const point of mirrored) {
      expect(hull!.some((other) => Math.hypot(other.x - point.x, other.y - point.y) < 1e-9)).toBe(true);
    }
  });

  it("narrows to a point toward the bow: its last stretch is thin", () => {
    const [hull] = shipArt(horizontal(2, 1, 3)).hull;
    const widthAt = (from: number, to: number) => {
      const ys = hull!.filter((point) => point.x >= from && point.x <= to).map((point) => point.y);
      return Math.max(...ys) - Math.min(...ys);
    };

    // The sides keep their full width up to where the bow begins to curve in (3.25).
    expect(widthAt(1.5, 3.3)).toBeGreaterThan(0.6);
    expect(widthAt(3.9, 4)).toBeLessThan(0.2);
  });

  it("keeps the bow full: three quarters of the way in, the side is still more than 0.28 from the middle line", () => {
    const [hull] = shipArt(horizontal(2, 1, 3)).hull;
    const topSide = hull!.filter((point) => point.y < 2.5 && point.x > 3.25);
    const nearest = topSide.reduce((best, point) => (Math.abs(point.x - 3.6) < Math.abs(best.x - 3.6) ? point : best));

    expect(2.5 - nearest.y).toBeGreaterThan(0.28);
  });

  it("draws each corner of the stern with several short sides", () => {
    const [hull] = shipArt(horizontal(2, 1, 3)).hull;
    const sternEdge = Math.min(...hull!.map((point) => point.x));

    expect(hull!.filter((point) => point.x < sternEdge + 0.081)).toHaveLength(8);
  });

  it("has rounded corners at the stern: no point sits on the sharp corner", () => {
    const [hull] = shipArt(horizontal(2, 1, 3)).hull;
    const sternEdge = Math.min(...hull!.map((point) => point.x));
    const top = Math.min(...hull!.map((point) => point.y));

    expect(hull!.some((point) => Math.hypot(point.x - sternEdge, point.y - top) < 0.02)).toBe(false);
    // ... though the stern is still a straight edge between them.
    expect(hull!.filter((point) => point.x === sternEdge)).toHaveLength(2);
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

    expect(tip.x).toBeCloseTo(3.95);
    expect(tip.y).toBeCloseTo(2.5);
  });

  it("points its bow down when it stands", () => {
    const [hull] = shipArt(vertical(0, 4, 3)).hull;
    const tip = hull!.reduce((best, point) => (point.y > best.y ? point : best));

    expect(tip.x).toBeCloseTo(4.5);
    expect(tip.y).toBeCloseTo(2.95);
  });

  it("points its bow to the left when it was turned half way", () => {
    const [hull] = shipArt(horizontal(2, 1, 3), 2).hull;
    const tip = hull!.reduce((best, point) => (point.x < best.x ? point : best));

    expect(tip.x).toBeCloseTo(1.05);
    expect(tip.y).toBeCloseTo(2.5);
  });

  it("points its bow up when it stands and was turned three quarters", () => {
    const [hull] = shipArt(vertical(0, 4, 3), 3).hull;
    const tip = hull!.reduce((best, point) => (point.y < best.y ? point : best));

    expect(tip.x).toBeCloseTo(4.5);
    expect(tip.y).toBeCloseTo(0.05);
  });

  it("ignores a turn count that does not fit the way the ship lies: the cells win", () => {
    const [hull] = shipArt(horizontal(2, 1, 3), 1).hull;
    const tip = hull!.reduce((best, point) => (point.x > best.x ? point : best));

    expect(tip.x).toBeCloseTo(3.95);
  });

  it("keeps the cabin of a two-cell ship toward the stern, on whichever side the stern is", () => {
    const [toTheRight] = shipArt(horizontal(0, 0, 2), 0).cabins;
    const [toTheLeft] = shipArt(horizontal(0, 0, 2), 2).cabins;

    expect(toTheRight!.x + toTheRight!.width / 2).toBeCloseTo(0.7);
    expect(toTheLeft!.x + toTheLeft!.width / 2).toBeCloseTo(1.3);
  });

  it.each([
    [0, "x", 5.95],
    [1, "y", 5.95],
    [2, "x", 5.05],
    [3, "y", 5.05],
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
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 2],
    [5, 3],
  ])("a ship of %i cells has %i cabins", (length, cabins) => {
    expect(shipArt(horizontal(0, 0, length)).cabins).toHaveLength(cabins);
  });

  it("lets the cabin of a one-cell ship stand in the middle of the hull, clear of the bow", () => {
    const [cabin] = shipArt([{ row: 5, column: 5 }]).cabins;

    expect(cabin!.x).toBeGreaterThan(5.2);
    expect(cabin!.x + cabin!.width).toBeLessThan(5.7);
  });

  it("gives every cabin a window in its middle that is smaller than the cabin", () => {
    const { cabins, windows } = shipArt(horizontal(4, 0, 5));

    expect(windows).toHaveLength(cabins.length);
    cabins.forEach((cabin, index) => {
      const window = windows[index]!;

      expect(window.x + window.width / 2).toBeCloseTo(cabin.x + cabin.width / 2);
      expect(window.y + window.height / 2).toBeCloseTo(cabin.y + cabin.height / 2);
      expect(window.x - cabin.x).toBeCloseTo(0.1);
      expect(window.y - cabin.y).toBeCloseTo(0.1);
      expect(window.width).toBeCloseTo(cabin.width - 0.2);
      expect(window.height).toBeCloseTo(cabin.height - 0.2);
    });
  });

  it("draws a line along the middle of the deck, from the stern to short of the bow", () => {
    const { deckLines } = shipArt(horizontal(2, 1, 3));

    expect(deckLines).toHaveLength(1);
    expect(deckLines[0]!.from.y).toBeCloseTo(2.5);
    expect(deckLines[0]!.to.y).toBeCloseTo(2.5);
    expect(deckLines[0]!.from.x).toBeGreaterThan(1.1);
    expect(deckLines[0]!.to.x).toBeLessThan(3.8);
    expect(deckLines[0]!.to.x).toBeGreaterThan(3.3);
  });

  it("draws the deck line of a standing ship up and down, and of a ship turned around the same", () => {
    const [standing] = shipArt(vertical(0, 4, 3), 1).deckLines;
    const [turned] = shipArt(horizontal(2, 1, 3), 2).deckLines;
    const [facingRight] = shipArt(horizontal(2, 1, 3), 0).deckLines;

    expect(standing!.from.x).toBeCloseTo(4.5);
    expect(standing!.to.x).toBeCloseTo(4.5);
    // The line stops short of the bow, wherever the bow is.
    expect(turned!.to.x).toBeLessThan(turned!.from.x);
    // Turned around, it is the mirror image about the middle of the ship (x = 2.5).
    expect(turned!.to.x).toBeCloseTo(5 - facingRight!.to.x);
    expect(turned!.from.x).toBeCloseTo(5 - facingRight!.from.x);
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

  it("has no cabins, windows or deck line", () => {
    expect(shipArt(tShaped).cabins).toHaveLength(0);
    expect(shipArt(tShaped).windows).toHaveLength(0);
    expect(shipArt(tShaped).deckLines).toHaveLength(0);
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
