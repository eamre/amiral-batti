// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { enemyWatersModel, ownWatersModel } from "../../../src/ui/board/boardModel";
import { viewBoxOf } from "../../../src/ui/board/boardLabels";
import { renderBoard } from "../../../src/ui/board/boardView";
import { gameView } from "../fixtures";

const noop = () => undefined;

function enemyBoard(changes = {}, canFire = true, onFire = noop) {
  const model = enemyWatersModel(gameView(changes), canFire);
  return { model, board: renderBoard(model, { label: "Düşman suları", onFire }) };
}

describe("renderBoard", () => {
  it("is as wide and high as the board has cells", () => {
    const { board } = enemyBoard();

    expect(board.getAttribute("viewBox")).toBe(viewBoxOf(10));
  });

  it("labels the rows with letters and the columns with numbers", () => {
    const { board } = enemyBoard();

    expect([...board.querySelectorAll(".board__labels text")].map((label) => label.textContent).join("")).toBe(
      "ABCDEFGHIJ12345678910",
    );
  });

  it("carries a name for those who cannot see it", () => {
    const { board } = enemyBoard();

    expect(board.getAttribute("aria-label")).toBe("Düşman suları");
  });

  it("draws each ship of the model", () => {
    const board = renderBoard(ownWatersModel(gameView()), { label: "Filon", onFire: noop });

    expect(board.querySelectorAll(".ship")).toHaveLength(2);
  });

  it("draws the bow of an own ship on the side it was turned to", () => {
    const board = renderBoard(ownWatersModel(gameView()), { label: "Filon", onFire: noop });
    const [facingRight, facingUp] = [...board.querySelectorAll(".ship__body polygon")].map((hull) =>
      hull.getAttribute("points"),
    );

    expect(facingRight).toContain("2.95,0.5");
    expect(facingUp).toContain("5.5,5.05");
  });

  it("draws the bow of a sunk ship of the opponent on the side it stood", () => {
    const sunk = [{ row: 1, column: 1 }, { row: 1, column: 2 }, { row: 1, column: 3 }];
    const { board } = enemyBoard({ sunkEnemyShips: [{ cells: sunk, quarterTurns: 2 }] });

    expect(board.querySelector(".ship__body polygon")?.getAttribute("points")).toContain("1.05,1.5");
  });

  it("draws a sunk ship as sunk", () => {
    const sunk = [{ row: 1, column: 1 }, { row: 1, column: 2 }];
    const { board } = enemyBoard({ sunkEnemyShips: [{ cells: sunk, quarterTurns: 0 }] });

    expect(board.querySelectorAll(".ship--sunk")).toHaveLength(1);
  });
});

describe("renderBoard: marks", () => {
  const shots = [
    { cell: { row: 1, column: 1 }, hit: true },
    { cell: { row: 2, column: 2 }, hit: false },
    { cell: { row: 3, column: 3 }, hit: false },
  ];

  it("crosses the cells that were hit", () => {
    const { board } = enemyBoard({ yourShots: shots });

    expect(board.querySelectorAll(".mark--hit")).toHaveLength(1);
  });

  it("keeps the cross small: its arms cover less than 30% of the width of the cell", () => {
    const { board } = enemyBoard({ yourShots: shots });
    const ends = [...board.querySelectorAll(".mark--hit line")].flatMap((line) =>
      ["x1", "x2"].map((name) => Number(line.getAttribute(name)) - 1),
    );

    expect(Math.max(...ends) - Math.min(...ends)).toBeLessThan(0.3);
    expect(Math.min(...ends)).toBeGreaterThanOrEqual(0.35);
  });

  it("dots the cells that were missed", () => {
    const { board } = enemyBoard({ yourShots: shots });

    expect(board.querySelectorAll(".mark--water")).toHaveLength(2);
  });

  it("dots the cells that are known to be empty exactly like the ones that were missed", () => {
    const missed = enemyBoard({ yourShots: [{ cell: { row: 5, column: 5 }, hit: false }] }).board;
    const knownEmpty = enemyBoard({ knownEmptyEnemyCells: [{ row: 5, column: 5 }] }).board;

    expect(knownEmpty.querySelector(".mark--water")?.outerHTML).toBe(missed.querySelector(".mark--water")?.outerHTML);
  });

  it("marks a cross on a sunk ship", () => {
    const sunk = [{ row: 1, column: 1 }, { row: 1, column: 2 }];
    const hits = sunk.map((cell) => ({ cell, hit: true }));
    const { board } = enemyBoard({ yourShots: hits, sunkEnemyShips: [{ cells: sunk, quarterTurns: 0 }] });

    expect(board.querySelectorAll(".mark--hit.mark--sunk")).toHaveLength(2);
  });

  it("puts a mark on the cell it belongs to", () => {
    const { board } = enemyBoard({ yourShots: [shots[1]!] });
    const mark = board.querySelector(".mark--water");

    expect(mark?.getAttribute("data-row")).toBe("2");
    expect(mark?.getAttribute("data-column")).toBe("2");
  });
});

describe("renderBoard: firing", () => {
  it("offers a target on every cell that can be fired at", () => {
    const { model, board } = enemyBoard();

    expect(board.querySelectorAll(".target")).toHaveLength(model.cells.filter((c) => c.canFire).length);
    expect(board.querySelectorAll(".target").length).toBeGreaterThan(0);
  });

  it("offers no target on a cell that was fired at", () => {
    const { board } = enemyBoard({ yourShots: [{ cell: { row: 2, column: 3 }, hit: false }] });

    expect(board.querySelector('.target[data-row="2"][data-column="3"]')).toBeNull();
  });

  it("offers no target at all when the viewer cannot fire", () => {
    const { board } = enemyBoard({}, false);

    expect(board.querySelectorAll(".target")).toHaveLength(0);
  });

  it("offers no target on the own waters", () => {
    const board = renderBoard(ownWatersModel(gameView()), { label: "Filon", onFire: noop });

    expect(board.querySelectorAll(".target")).toHaveLength(0);
  });

  it("names each target by its cell", () => {
    const { board } = enemyBoard();

    expect(board.querySelector('.target[data-row="3"][data-column="2"]')?.getAttribute("aria-label")).toBe("D3");
  });

  it("fires at the cell that was clicked", () => {
    const onFire = vi.fn();
    const { board } = enemyBoard({}, true, onFire);

    board.querySelector('.target[data-row="2"][data-column="3"]')?.dispatchEvent(new Event("click"));

    expect(onFire).toHaveBeenCalledWith({ row: 2, column: 3 });
  });

  it.each(["Enter", " "])("fires at the focused cell when %j is pressed", (key) => {
    const onFire = vi.fn();
    const { board } = enemyBoard({}, true, onFire);

    board.querySelector('.target[data-row="4"][data-column="4"]')?.dispatchEvent(new KeyboardEvent("keydown", { key }));

    expect(onFire).toHaveBeenCalledWith({ row: 4, column: 4 });
  });

  it("ignores other keys", () => {
    const onFire = vi.fn();
    const { board } = enemyBoard({}, true, onFire);

    board.querySelector('.target[data-row="4"][data-column="4"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    expect(onFire).not.toHaveBeenCalled();
  });
});
