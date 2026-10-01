import { describe, expect, it } from "vitest";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";

/** Konumları "satır,sütun" yazısına çevirip sıralar; sıraya bakmadan karşılaştırabilmek için. */
const toCoordinates = (positions: readonly Position[]) =>
  positions.map((p) => `${p.row},${p.column}`).sort();

describe("Ship", () => {
  const horizontalShip = () => new Ship(ShipShape.straight(3), new Position(2, 4));

  describe("cells", () => {
    it("şeklin karelerini başlangıç konumuna kaydırır", () => {
      expect(toCoordinates(horizontalShip().cells)).toEqual(["2,4", "2,5", "2,6"]);
    });

    it("çeyrek tur döndürülmüş gemi dikey durur, sol üst köşe aynı kalır", () => {
      const vertical = new Ship(ShipShape.straight(3), new Position(2, 4), 1);

      expect(toCoordinates(vertical.cells)).toEqual(["2,4", "3,4", "4,4"]);
    });

    it("T gemisi döndürülünce yeni şeklin kareleri başlangıç konumuna göre yerleşir", () => {
      const t = new ShipShape([new Position(0, 0), new Position(1, 0), new Position(2, 0), new Position(1, 1)]);
      const turned = new Ship(t, new Position(5, 5), 1);

      expect(toCoordinates(turned.cells)).toEqual(["5,5", "5,6", "5,7", "6,6"]);
    });
  });

  describe("occupies", () => {
    it("geminin karesinde true, dışında false döner", () => {
      const ship = horizontalShip();

      expect(ship.occupies(new Position(2, 5))).toBe(true);
      expect(ship.occupies(new Position(3, 5))).toBe(false);
    });
  });

  describe("movedTo", () => {
    it("gemiyi taşır, dönüş sayısını korur", () => {
      const moved = new Ship(ShipShape.straight(2), new Position(0, 0), 1).movedTo(new Position(4, 4));

      expect(moved.quarterTurns).toBe(1);
      expect(toCoordinates(moved.cells)).toEqual(["4,4", "5,4"]);
    });

    it("asıl gemiyi değiştirmez", () => {
      const ship = horizontalShip();

      ship.movedTo(new Position(9, 9));

      expect(ship.origin.equals(new Position(2, 4))).toBe(true);
    });
  });

  describe("rotated", () => {
    it("çeyrek tur sayısını bir artırır, sol üst köşe yerinde kalır", () => {
      const turned = horizontalShip().rotated();

      expect(turned.quarterTurns).toBe(1);
      expect(turned.origin.equals(new Position(2, 4))).toBe(true);
    });

    it("dört kez döndürünce başlangıç durumuna geri gelir", () => {
      const ship = horizontalShip().rotated().rotated().rotated().rotated();

      expect(ship.quarterTurns).toBe(0);
      expect(toCoordinates(ship.cells)).toEqual(["2,4", "2,5", "2,6"]);
    });

    it("iki kez döndürülen düz gemi aynı kareleri kaplar ama burnu ters bakar", () => {
      const ship = horizontalShip().rotated().rotated();

      expect(ship.quarterTurns).toBe(2);
      expect(toCoordinates(ship.cells)).toEqual(["2,4", "2,5", "2,6"]);
    });
  });
});