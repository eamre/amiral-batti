import { describe, expect, it } from "vitest";
import { Board } from "../../src/domain/Board";
import { Position } from "../../src/domain/Position";

describe("Board.contains", () => {
  const board = new Board(10);

  it("tahtanın ortasındaki konum içeridedir", () => {
    expect(board.contains(new Position(5, 5))).toBe(true);
  });

  it("dört köşe de içeridedir", () => {
    expect(board.contains(new Position(0, 0))).toBe(true);
    expect(board.contains(new Position(0, 9))).toBe(true);
    expect(board.contains(new Position(9, 0))).toBe(true);
    expect(board.contains(new Position(9, 9))).toBe(true);
  });

  it("negatif satır ya da sütun dışarıdadır", () => {
    expect(board.contains(new Position(-1, 3))).toBe(false);
    expect(board.contains(new Position(3, -1))).toBe(false);
  });

  it("boyuta eşit ya da büyük satır ya da sütun dışarıdadır", () => {
    expect(board.contains(new Position(10, 3))).toBe(false);
    expect(board.contains(new Position(3, 10))).toBe(false);
  });
});