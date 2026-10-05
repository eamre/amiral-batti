import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS } from "../../src/application/GameSettings";
import { RoomRegistry } from "../../src/application/RoomRegistry";

const NOW = 1_000;
const HOUR = 60 * 60 * 1000;
const AHMET = { name: "Ahmet", token: "token-of-ahmet" };

// A random source that never repeats a value, so every code differs.
function varyingRandom(): () => number {
  let step = 0;

  return () => {
    step += 1;
    return (step * 0.618033988749) % 1;
  };
}

function registry(): RoomRegistry {
  return new RoomRegistry(varyingRandom());
}

describe("RoomRegistry", () => {
  describe("open", () => {
    it("opens a room with a code of four letters and digits that are easy to read", () => {
      const room = registry().open(DEFAULT_GAME_SETTINGS, AHMET, NOW);

      expect(room.code).toMatch(/^[ABCDEFGHJKLMNPRSTUVYZ2-9]{4}$/);
    });

    it("gives every room its own code", () => {
      const rooms = registry();

      const codes = Array.from({ length: 50 }, () =>
        rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW).code,
      );

      expect(new Set(codes).size).toBe(50);
    });

    it("gives up when it cannot find a free code", () => {
      const rooms = new RoomRegistry(() => 0);
      rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);

      expect(() => rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW)).toThrow();
    });

    it("seats the creator in the new room", () => {
      const room = registry().open(DEFAULT_GAME_SETTINGS, AHMET, NOW);

      expect(room.seatOf(AHMET.token)).toBe("first");
    });
  });

  describe("find", () => {
    it("finds an open room by its code", () => {
      const rooms = registry();
      const room = rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);

      expect(rooms.find(room.code)).toBe(room);
    });

    it("finds nothing for a code nobody opened", () => {
      expect(registry().find("ZZZZ")).toBeUndefined();
    });
  });

  describe("save", () => {
    it("replaces the room with its newer state", () => {
      const rooms = registry();
      const room = rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);
      const joined = room.join({ name: "Ayse", token: "token-of-ayse" });

      rooms.save(joined, NOW);

      expect(rooms.find(room.code)).toBe(joined);
    });
  });

  describe("all", () => {
    it("lists every room", () => {
      const rooms = registry();
      rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);
      rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);

      expect(rooms.all()).toHaveLength(2);
    });
  });

  describe("remove", () => {
    it("forgets a room at once", () => {
      const rooms = registry();
      const room = rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);

      rooms.remove(room.code);

      expect(rooms.find(room.code)).toBeUndefined();
      expect(rooms.all()).toEqual([]);
    });

    it("leaves the other rooms alone", () => {
      const rooms = registry();
      const closed = rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);
      const kept = rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);

      rooms.remove(closed.code);

      expect(rooms.find(kept.code)).toBe(kept);
    });

    it("does not mind a code nobody opened", () => {
      expect(() => registry().remove("NONE")).not.toThrow();
    });
  });

  describe("removeAbandoned", () => {
    it("removes a room that nobody is in and that has been quiet for too long", () => {
      const rooms = registry();
      const room = rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);

      const removed = rooms.removeAbandoned(NOW + HOUR + 1, HOUR, () => false);

      expect(removed).toEqual([room.code]);
      expect(rooms.find(room.code)).toBeUndefined();
    });

    it("keeps a room that was active recently", () => {
      const rooms = registry();
      const room = rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);

      rooms.removeAbandoned(NOW + HOUR, HOUR, () => false);

      expect(rooms.find(room.code)).toBe(room);
    });

    it("keeps a quiet room while somebody is still in it", () => {
      const rooms = registry();
      const room = rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);

      rooms.removeAbandoned(NOW + 5 * HOUR, HOUR, () => true);

      expect(rooms.find(room.code)).toBe(room);
    });

    it("counts a save as activity", () => {
      const rooms = registry();
      const room = rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);
      rooms.save(room, NOW + 2 * HOUR);

      rooms.removeAbandoned(NOW + 2 * HOUR + 1, HOUR, () => false);

      expect(rooms.find(room.code)).toBe(room);
    });

    it("counts a touch as activity", () => {
      const rooms = registry();
      const room = rooms.open(DEFAULT_GAME_SETTINGS, AHMET, NOW);
      rooms.touch(room.code, NOW + 2 * HOUR);

      rooms.removeAbandoned(NOW + 2 * HOUR + 1, HOUR, () => false);

      expect(rooms.find(room.code)).toBe(room);
    });
  });
});
