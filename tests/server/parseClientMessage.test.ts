import { describe, expect, it } from "vitest";
import { parseClientMessage } from "../../src/server/parseClientMessage";

function parse(message: unknown) {
  return parseClientMessage(JSON.stringify(message));
}

const validShip = { kind: "boat", row: 8, column: 0, quarterTurns: 0 };

describe("parseClientMessage", () => {
  describe("create", () => {
    it("accepts a name and rules", () => {
      const rules = { fleetPreset: "russian", allowTouching: true };

      expect(parse({ type: "create", name: "Emre", rules })).toEqual({
        type: "create",
        name: "Emre",
        rules,
      });
    });

    it.each([
      ["a missing name", { type: "create", rules: { fleetPreset: "classic", allowTouching: false } }],
      ["a name that is not text", { type: "create", name: 5, rules: { fleetPreset: "classic", allowTouching: false } }],
      ["missing rules", { type: "create", name: "Emre" }],
      ["an unknown fleet preset", { type: "create", name: "Emre", rules: { fleetPreset: "huge", allowTouching: false } }],
      ["allowTouching that is not a boolean", { type: "create", name: "Emre", rules: { fleetPreset: "classic", allowTouching: "no" } }],
    ])("rejects %s", (_reason, message) => {
      expect(parse(message)).toBeUndefined();
    });
  });

  describe("join", () => {
    it("accepts a code and a name, and tidies the code", () => {
      expect(parse({ type: "join", code: " ab3k ", name: "Ayse" })).toEqual({
        type: "join",
        code: "AB3K",
        name: "Ayse",
      });
    });

    it("rejects a code that is not text", () => {
      expect(parse({ type: "join", code: 1234, name: "Ayse" })).toBeUndefined();
    });

    it("rejects a missing name", () => {
      expect(parse({ type: "join", code: "AB3K" })).toBeUndefined();
    });
  });

  describe("rejoin", () => {
    it("accepts a code and a token", () => {
      expect(parse({ type: "rejoin", code: "ab3k", token: "secret" })).toEqual({
        type: "rejoin",
        code: "AB3K",
        token: "secret",
      });
    });

    it("rejects a missing token", () => {
      expect(parse({ type: "rejoin", code: "AB3K" })).toBeUndefined();
    });
  });

  describe("ready", () => {
    it("accepts a list of ship placements", () => {
      expect(parse({ type: "ready", ships: [validShip] })).toEqual({
        type: "ready",
        ships: [validShip],
      });
    });

    it("drops fields it does not know", () => {
      const result = parse({ type: "ready", ships: [{ ...validShip, cheat: true }] });

      expect(result).toEqual({ type: "ready", ships: [validShip] });
    });

    it.each([
      ["ships that are not a list", { type: "ready", ships: "boat" }],
      ["a ship of an unknown kind", { type: "ready", ships: [{ ...validShip, kind: "ufo" }] }],
      ["a row that is not an integer", { type: "ready", ships: [{ ...validShip, row: 1.5 }] }],
      ["a column that is text", { type: "ready", ships: [{ ...validShip, column: "0" }] }],
      ["quarter turns that are missing", { type: "ready", ships: [{ kind: "boat", row: 0, column: 0 }] }],
      ["a ship that is not an object", { type: "ready", ships: [7] }],
    ])("rejects %s", (_reason, message) => {
      expect(parse(message)).toBeUndefined();
    });

    it("rejects one bad ship among good ones", () => {
      expect(parse({ type: "ready", ships: [validShip, { kind: "boat" }] })).toBeUndefined();
    });

    it("rejects an absurd number of ships", () => {
      const ships = Array.from({ length: 31 }, () => validShip);

      expect(parse({ type: "ready", ships })).toBeUndefined();
    });
  });

  describe("fire", () => {
    it("accepts a cell", () => {
      expect(parse({ type: "fire", cell: { row: 3, column: 4 } })).toEqual({
        type: "fire",
        cell: { row: 3, column: 4 },
      });
    });

    it("accepts a cell outside the board; the game refuses it later", () => {
      expect(parse({ type: "fire", cell: { row: -1, column: 99 } })).toBeDefined();
    });

    it.each([
      ["a missing cell", { type: "fire" }],
      ["a cell with a decimal", { type: "fire", cell: { row: 1.5, column: 0 } }],
      ["a cell with text", { type: "fire", cell: { row: "1", column: 0 } }],
      ["a null cell", { type: "fire", cell: null }],
    ])("rejects %s", (_reason, message) => {
      expect(parse(message)).toBeUndefined();
    });
  });

  describe("rematch", () => {
    it("accepts the message", () => {
      expect(parse({ type: "rematch" })).toEqual({ type: "rematch" });
    });
  });

  describe("anything else", () => {
    it.each([
      ["text that is not JSON", "not json {"],
      ["JSON that is not an object", "42"],
      ["a list", "[1, 2]"],
      ["null", "null"],
      ["an unknown type", '{"type":"hack"}'],
      ["an object without a type", "{}"],
    ])("rejects %s", (_reason, raw) => {
      expect(parseClientMessage(raw)).toBeUndefined();
    });
  });
});
