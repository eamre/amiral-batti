import { describe, expect, it } from "vitest";
import { Position } from "../../src/domain/Position";
import { ShipShape } from "../../src/domain/ShipShape";

/** Konumları "satır,sütun" yazısına çevirip sıralar; sıraya bakmadan karşılaştırabilmek için. */
const toCoordinates = (positions: readonly Position[]) =>
  positions.map((p) => `${p.row},${p.column}`).sort();

describe("ShipShape", () => {
  it("düz gemi verilen uzunlukta yatay bir çubuktur", () => {
    const shape = ShipShape.straight(3);
    expect(toCoordinates(shape.cells)).toEqual(["0,0", "0,1", "0,2"]);
  });

  it("uzunluk, kare sayısına eşittir", () => {
    expect(ShipShape.straight(4).length).toBe(4);
  });

  it("kareler her zaman sol üst köşeye yaslanır", () => {
    const shape = new ShipShape([new Position(3, 4), new Position(3, 5)]);
    expect(toCoordinates(shape.cells)).toEqual(["0,0", "0,1"]);
  });

  it("T şeklinin kolu da sol üste göre ayarlanır", () => {
    const shape = new ShipShape([
      new Position(5, 2),
      new Position(6, 2),
      new Position(7, 2),
      new Position(6, 3),
    ]);

    expect(toCoordinates(shape.cells)).toEqual(["0,0", "1,0", "1,1", "2,0"]);
  });

  it("karesiz gemi olmaz", () => {
    expect(() => new ShipShape([])).toThrow();
  });

  describe("rotatedClockwise", () => {
    // ← yeni grup, eski describe'ın içinde
    const tShape = () =>
      new ShipShape([
        new Position(0, 0),
        new Position(1, 0),
        new Position(2, 0),
        new Position(1, 1),
      ]);

    it("yatay düz gemi dikey olur", () => {
      const rotated = ShipShape.straight(3).rotatedClockwise();

      expect(toCoordinates(rotated.cells)).toEqual(["0,0", "1,0", "2,0"]);
    });

    it("düz gemi iki kez dönünce yine yatay olur", () => {
      const rotated = ShipShape.straight(3)
        .rotatedClockwise()
        .rotatedClockwise();

      expect(toCoordinates(rotated.cells)).toEqual(["0,0", "0,1", "0,2"]);
    });

    it("T şekli saat yönünde dönünce kolu aşağı bakar", () => {
      const rotated = tShape().rotatedClockwise();

      expect(toCoordinates(rotated.cells)).toEqual([
        "0,0",
        "0,1",
        "0,2",
        "1,1",
      ]);
    });

    it("dört kez dönünce başlangıç şekline geri gelir", () => {
      const rotated = tShape()
        .rotatedClockwise()
        .rotatedClockwise()
        .rotatedClockwise()
        .rotatedClockwise();

      expect(toCoordinates(rotated.cells)).toEqual(
        toCoordinates(tShape().cells),
      );
    });

    it("döndürmek asıl şekli değiştirmez", () => {
      const original = ShipShape.straight(3);

      original.rotatedClockwise();

      expect(toCoordinates(original.cells)).toEqual(["0,0", "0,1", "0,2"]);
    });
  });

  describe("height and width", () => {
    it("is one row high and as wide as its length for a straight ship", () => {
      const shape = ShipShape.straight(3);

      expect(shape.height).toBe(1);
      expect(shape.width).toBe(3);
    });

    it("swaps height and width after a quarter turn", () => {
      const shape = ShipShape.straight(3).rotatedClockwise();

      expect(shape.height).toBe(3);
      expect(shape.width).toBe(1);
    });
  });
});
