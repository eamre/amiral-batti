import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS } from "../../src/application/GameSettings";
import { Room } from "../../src/application/Room";
import { Position } from "../../src/domain/Position";
import {
  toCellDto,
  toPlacements,
  toPosition,
  toRoomViewDto,
  toShotDto,
} from "../../src/server/wire";
import { allShipCells, cellsOfShipAt, placementsFrom } from "../application/fixtures";

const NOW = 1_000;
const AHMET = { name: "Ahmet", token: "token-of-ahmet" };
const AYSE = { name: "Ayse", token: "token-of-ayse" };

function roomInBattle(): Room {
  return Room.open("ABCD", DEFAULT_GAME_SETTINGS, AHMET)
    .join(AYSE)
    .markReady(AHMET.token, placementsFrom(0), NOW)
    .markReady(AYSE.token, placementsFrom(5), NOW);
}

describe("cells", () => {
  it("turns a position into plain data and back", () => {
    const cell = toCellDto(new Position(3, 4));

    expect(cell).toStrictEqual({ row: 3, column: 4 });
    expect(toPosition(cell)).toEqual(new Position(3, 4));
  });
});

describe("toPlacements", () => {
  it("turns the placements of the browser into ship placements", () => {
    const placements = toPlacements([{ kind: "boat", row: 8, column: 5, quarterTurns: 1 }]);

    expect(placements).toEqual([
      { kind: "boat", origin: new Position(8, 5), quarterTurns: 1 },
    ]);
    expect(placements[0]?.origin).toBeInstanceOf(Position);
  });
});

describe("toShotDto", () => {
  it("describes where the shot went and what it did", () => {
    const { shot } = roomInBattle().fire(AHMET.token, new Position(9, 9), NOW);

    expect(toShotDto(shot)).toStrictEqual({
      shooter: "first",
      cell: { row: 9, column: 9 },
      outcome: "miss",
      sunkShip: undefined,
      wasRandom: false,
    });
  });

  it("carries the cells of a ship that has just sunk", () => {
    const boat = cellsOfShipAt(4, 5);
    const room = roomInBattle().fire(AHMET.token, boat[0] as Position, NOW).room;

    const { shot } = room.fire(AHMET.token, boat[1] as Position, NOW);

    expect(toShotDto(shot).outcome).toBe("sunk");
    expect(toShotDto(shot).sunkShip).toStrictEqual([
      { row: 8, column: 5 },
      { row: 8, column: 6 },
    ]);
  });
});

describe("toRoomViewDto", () => {
  it("loses nothing when it travels as JSON", () => {
    const room = roomInBattle().fire(AHMET.token, new Position(0, 5), NOW).room;
    const dto = toRoomViewDto(room.viewFor(AHMET.token, NOW));

    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });

  it("turns every cell into plain data", () => {
    const room = roomInBattle().fire(AHMET.token, new Position(0, 5), NOW).room;

    const dto = toRoomViewDto(room.viewFor(AHMET.token, NOW));

    expect(dto.game.yourShips[0]?.cells[0]).toStrictEqual({ row: 0, column: 0 });
    expect(dto.game.yourShips[0]?.quarterTurns).toBe(0);
    expect(dto.game.yourShots[0]).toStrictEqual({ cell: { row: 0, column: 5 }, hit: true });
  });

  it("carries the turn of a sunk ship of the opponent along with its cells", () => {
    const turnedBoat = { kind: "boat", origin: new Position(7, 9), quarterTurns: 3 } as const;
    const room = Room.open("ABCD", DEFAULT_GAME_SETTINGS, AHMET)
      .join(AYSE)
      .markReady(AHMET.token, placementsFrom(0), NOW)
      .markReady(AYSE.token, [...placementsFrom(5).slice(0, 4), turnedBoat], NOW);
    const fired = [new Position(7, 9), new Position(8, 9)].reduce(
      (current, cell) => current.fire(AHMET.token, cell, NOW).room,
      room,
    );

    const [ship, ...others] = toRoomViewDto(fired.viewFor(AHMET.token, NOW)).game.sunkEnemyShips;

    expect(others).toEqual([]);
    expect(ship?.quarterTurns).toBe(3);
    expect(ship?.cells).toHaveLength(2);
    expect(ship?.cells).toEqual(expect.arrayContaining([{ row: 7, column: 9 }, { row: 8, column: 9 }]));
    // Plain data: no Position objects are left in it.
    expect(JSON.parse(JSON.stringify(ship))).toStrictEqual(ship);
  });

  it("reveals the whole fleet of the opponent only when the game is over, as plain data", () => {
    const over = allShipCells(5).reduce(
      (current, cell) => current.fire(AHMET.token, cell, NOW).room,
      roomInBattle(),
    );

    const during = toRoomViewDto(roomInBattle().viewFor(AHMET.token, NOW)).game;
    const after = toRoomViewDto(over.viewFor(AHMET.token, NOW)).game;

    expect(during.revealedEnemyShips).toEqual([]);
    expect(after.revealedEnemyShips).toHaveLength(5);
    expect(JSON.parse(JSON.stringify(after.revealedEnemyShips))).toStrictEqual(after.revealedEnemyShips);
  });

  it("keeps names, code and rematch votes", () => {
    const dto = toRoomViewDto(roomInBattle().viewFor(AYSE.token, NOW));

    expect(dto.code).toBe("ABCD");
    expect(dto.yourName).toBe("Ayse");
    expect(dto.opponentName).toBe("Ahmet");
    expect(dto.youWantRematch).toBe(false);
  });

  it("still hides the opponent's ships", () => {
    const json = JSON.stringify(toRoomViewDto(roomInBattle().viewFor(AHMET.token, NOW)));

    for (const cell of allShipCells(5)) {
      expect(json).not.toContain(JSON.stringify(cell));
    }
  });
});
