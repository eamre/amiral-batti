import type { RandomSource } from "../domain/random";
import { randomInt } from "../domain/random";
import type { GameSettings } from "./GameSettings";
import { Room, type Seat } from "./Room";
import { ROOM_CODE_LENGTH } from "./roomLimits";

// No I, O, 0, 1: they are too easy to mix up when a code is read out loud.
const CODE_ALPHABET = "ABCDEFGHJKLMNPRSTUVYZ23456789";
const MAX_CODE_ATTEMPTS = 100;

interface Entry {
  readonly room: Room;
  readonly lastActivityAt: number;
}

/**
 * All the rooms that exist right now, found by their code.
 * It is the one mutable object of this layer: rooms themselves never change.
 */
export class RoomRegistry {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly random: RandomSource) {}

  open(settings: GameSettings, creator: Seat, now: number): Room {
    const room = Room.open(this.freeCode(), settings, creator);

    this.entries.set(room.code, { room, lastActivityAt: now });
    return room;
  }

  find(code: string): Room | undefined {
    return this.entries.get(code)?.room;
  }

  all(): Room[] {
    return [...this.entries.values()].map((entry) => entry.room);
  }

  /** Remembers the new state of a room and that something just happened in it. */
  save(room: Room, now: number): void {
    this.entries.set(room.code, { room, lastActivityAt: now });
  }

  /** Closes a room at once. */
  remove(code: string): void {
    this.entries.delete(code);
  }

  touch(code: string, now: number): void {
    const entry = this.entries.get(code);

    if (entry !== undefined) {
      this.entries.set(code, { ...entry, lastActivityAt: now });
    }
  }

  /** Forgets rooms that nobody is in and nothing has happened in for a long time. */
  removeAbandoned(
    now: number,
    maxIdleMilliseconds: number,
    isOccupied: (code: string) => boolean,
  ): string[] {
    const removed: string[] = [];

    for (const [code, entry] of this.entries) {
      const isIdle = now - entry.lastActivityAt > maxIdleMilliseconds;

      if (isIdle && !isOccupied(code)) {
        this.entries.delete(code);
        removed.push(code);
      }
    }
    return removed;
  }

  private freeCode(): string {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = this.randomCode();

      if (!this.entries.has(code)) {
        return code;
      }
    }

    throw new Error("Could not find a free room code.");
  }

  private randomCode(): string {
    let code = "";

    for (let index = 0; index < ROOM_CODE_LENGTH; index++) {
      code += CODE_ALPHABET.charAt(randomInt(this.random, CODE_ALPHABET.length));
    }
    return code;
  }
}
