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
});
