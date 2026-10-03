import { describe, expect, it } from "vitest";
import { Battle } from "../../src/domain/Battle";
import { Board } from "../../src/domain/Board";
import { Fleet } from "../../src/domain/Fleet";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";

const firstPlayersCruiser = new Ship(ShipShape.straight(3), new Position(1, 1));
const secondPlayersBoat = new Ship(ShipShape.straight(2), new Position(3, 0));
const secondPlayersFarBoat = new Ship(
  ShipShape.straight(2),
  new Position(8, 8),
);

function newBattle(allowTouching = false): Battle {
  return new Battle(
    {
      first: new Fleet([firstPlayersCruiser]),
      second: new Fleet([secondPlayersBoat]),
    },
    "first",
    { board: new Board(10), allowTouching },
  );
}

function newBattleWithTwoTargets(allowTouching: boolean): Battle {
  return new Battle(
    {
      first: new Fleet([firstPlayersCruiser]),
      second: new Fleet([secondPlayersBoat, secondPlayersFarBoat]),
    },
    "first",
    { board: new Board(10), allowTouching },
  );
}

function fireAll(battle: Battle, positions: Position[]): Battle {
  return positions.reduce(
    (current, position) => current.fire(position).battle,
    battle,
  );
}

const sinkTheBoat = [new Position(3, 0), new Position(3, 1)];

describe("Battle", () => {
  describe("fire", () => {
    it("keeps the turn after a hit", () => {
      const result = newBattle().fire(new Position(3, 0));

      expect(result.outcome).toBe("hit");
      expect(result.battle.turn).toBe("first");
    });

    it("passes the turn to the opponent after a miss", () => {
      const result = newBattle().fire(new Position(0, 0));

      expect(result.outcome).toBe("miss");
      expect(result.battle.turn).toBe("second");
    });

    it("keeps the turn after sinking a ship", () => {
      const battle = fireAll(newBattle(), [new Position(3, 0)]);

      const result = battle.fire(new Position(3, 1));

      expect(result.outcome).toBe("sunk");
      expect(result.sunkShip).toBe(secondPlayersBoat);
      expect(result.battle.turn).toBe("first");
    });

    it("records the shot on the opponent's fleet", () => {
      const result = newBattle().fire(new Position(0, 0));

      expect(result.battle.fleetOf("second").shotsReceived).toEqual([
        new Position(0, 0),
      ]);
    });

    it("does not change the original battle", () => {
      const battle = newBattle();

      battle.fire(new Position(0, 0));

      expect(battle.turn).toBe("first");
      expect(battle.fleetOf("second").shotsReceived).toHaveLength(0);
    });
  });

  describe("winner", () => {
    it("is undefined at the start", () => {
      expect(newBattle().winner).toBeUndefined();
    });

    it("is the first player after sinking every ship of the second player", () => {
      const battle = fireAll(newBattle(), sinkTheBoat);

      expect(battle.winner).toBe("first");
    });

    it("is the second player after sinking every ship of the first player", () => {
      const battle = fireAll(newBattle(), [
        new Position(0, 0),
        new Position(1, 1),
        new Position(1, 2),
        new Position(1, 3),
      ]);

      expect(battle.winner).toBe("second");
    });
  });

  describe("shots that are not allowed", () => {
    it("allows a shot at a cell that was not shot yet", () => {
      expect(newBattle().canFire(new Position(0, 0))).toBe(true);
    });

    it("does not allow a shot at a cell that was already shot", () => {
      const battle = fireAll(newBattle(), [new Position(3, 0)]);

      expect(battle.canFire(new Position(3, 0))).toBe(false);
    });

    it("does not allow any shot after the game is over", () => {
      const battle = fireAll(newBattle(), sinkTheBoat);

      expect(battle.canFire(new Position(9, 9))).toBe(false);
    });

    it("throws when firing at a cell that was already shot", () => {
      const battle = fireAll(newBattle(), [new Position(3, 0)]);

      expect(() => battle.fire(new Position(3, 0))).toThrow();
    });

    it("throws when firing after the game is over", () => {
      const battle = fireAll(newBattle(), sinkTheBoat);

      expect(() => battle.fire(new Position(9, 9))).toThrow();
    });

    it("does not allow a shot outside the board", () => {
      expect(newBattle().canFire(new Position(10, 0))).toBe(false);
      expect(newBattle().canFire(new Position(0, -1))).toBe(false);
    });
  });

  describe("cells around a sunk ship", () => {
    it("does not allow a shot next to a sunk ship when touching is not allowed", () => {
      const battle = fireAll(newBattleWithTwoTargets(false), sinkTheBoat);

      expect(battle.canFire(new Position(2, 0))).toBe(false);
      expect(battle.canFire(new Position(4, 2))).toBe(false);
      expect(battle.canFire(new Position(5, 5))).toBe(true);
    });

    it("allows a shot next to a sunk ship when touching is allowed", () => {
      const battle = fireAll(newBattleWithTwoTargets(true), sinkTheBoat);

      expect(battle.canFire(new Position(2, 0))).toBe(true);
    });

    it("allows a shot next to a ship that is only damaged", () => {
      const battle = fireAll(newBattleWithTwoTargets(false), [
        new Position(3, 0),
      ]);

      expect(battle.canFire(new Position(2, 0))).toBe(true);
    });

    it("lists the cells around sunk ships as known to be empty", () => {
      const battle = fireAll(newBattleWithTwoTargets(false), sinkTheBoat);

      expect(battle.knownEmptyCellsOf("second")).toContainEqual(
        new Position(2, 0),
      );
      expect(battle.knownEmptyCellsOf("second")).not.toContainEqual(
        new Position(3, 0),
      );
    });

    it("lists nothing when touching is allowed", () => {
      const battle = fireAll(newBattleWithTwoTargets(true), sinkTheBoat);

      expect(battle.knownEmptyCellsOf("second")).toEqual([]);
    });
  });

  describe("fireablePositions", () => {
    it("lists every cell at the start", () => {
      expect(newBattle().fireablePositions()).toHaveLength(100);
    });

    it("leaves out cells that were already shot", () => {
      const battle = fireAll(newBattle(), [new Position(3, 0)]);

      expect(battle.fireablePositions()).toHaveLength(99);
      expect(battle.fireablePositions()).not.toContainEqual(new Position(3, 0));
    });
  });

  describe("fireAtRandom", () => {
    it("fires at the first fireable cell when the random source returns 0", () => {
      const result = newBattle().fireAtRandom(() => 0);

      expect(result.battle.fleetOf("second").shotsReceived).toEqual([
        new Position(0, 0),
      ]);
    });

    it("fires at the last fireable cell when the random source returns almost 1", () => {
      const result = newBattle().fireAtRandom(() => 0.999999);

      expect(result.battle.fleetOf("second").shotsReceived).toEqual([
        new Position(9, 9),
      ]);
    });

    it("never picks a cell that cannot be fired at", () => {
      const battle = fireAll(newBattle(), [
        new Position(0, 0),
        new Position(0, 0),
      ]);

      const result = battle.fireAtRandom(() => 0);

      expect(result.battle.fleetOf("second").shotsReceived).toEqual([
        new Position(0, 0),
        new Position(0, 1),
      ]);
    });

    it("throws when there is nothing left to fire at", () => {
      const battle = fireAll(newBattle(), sinkTheBoat);

      expect(() => battle.fireAtRandom(() => 0)).toThrow();
    });
  });
});
