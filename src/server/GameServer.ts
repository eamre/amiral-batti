import type { ShotReport } from "../application/Game";
import { GameRuleError } from "../application/GameRuleError";
import { DEFAULT_GAME_SETTINGS, type GameSettings } from "../application/GameSettings";
import type { Room } from "../application/Room";
import { RoomRegistry } from "../application/RoomRegistry";
import { fleetMayTouch } from "../domain/fleetPresets";
import type { RandomSource } from "../domain/random";
import type { ClientMessage, RoomRulesDto } from "../shared/protocol";
import { ConnectedPlayers, type Connection } from "./ConnectedPlayers";
import { parseClientMessage } from "./parseClientMessage";
import { toPlacements, toPosition, toRoomViewDto, toShotDto } from "./wire";

export interface GameServerOptions {
  readonly clock: () => number;
  readonly random: RandomSource;
  readonly newToken: () => string;
}

const ABANDONED_AFTER_MILLISECONDS = 60 * 60 * 1000;

/**
 * Everything the server does, except talking to the network:
 * it reads what the browsers say, changes the rooms, and tells the right browsers.
 */
export class GameServer {
  private readonly registry: RoomRegistry;
  private readonly players = new ConnectedPlayers();

  constructor(private readonly options: GameServerOptions) {
    this.registry = new RoomRegistry(options.random);
  }

  /** A browser sent some text. */
  receive(connection: Connection, raw: string): void {
    const message = parseClientMessage(raw);

    if (message === undefined) {
      connection.send({ type: "error", code: "bad-message", message: "Unreadable message." });
      return;
    }

    try {
      this.handle(connection, message);
    } catch (error) {
      if (!(error instanceof GameRuleError)) {
        throw error;
      }
      connection.send({ type: "error", code: error.code, message: error.message });
    }
  }

  /** A browser went away. Its seat stays: it can come back with its token. */
  disconnect(connection: Connection): void {
    const seat = this.players.release(connection);

    if (seat === undefined) {
      return;
    }

    this.registry.touch(seat.code, this.options.clock());
    this.players.sendToRoom(seat.code, { type: "presence", opponentOnline: false });
  }

  /** Called every second: a player who ran out of time gets a random shot. */
  tick(): void {
    const now = this.options.clock();

    for (const room of this.registry.all()) {
      const result = room.fireIfTimeIsUp(now, this.options.random);

      if (result !== undefined) {
        this.commit(result.room, now);
        this.announceShot(result.room.code, result.shot);
      }
    }
  }

  /** Called now and then: forgets rooms that everybody left long ago. */
  sweep(): string[] {
    return this.registry.removeAbandoned(
      this.options.clock(),
      ABANDONED_AFTER_MILLISECONDS,
      (code) => this.players.hasAnyoneIn(code),
    );
  }

  private handle(connection: Connection, message: ClientMessage): void {
    switch (message.type) {
      case "create":
        return this.create(connection, message.name, message.rules);
      case "join":
        return this.join(connection, message.code, message.name);
      case "rejoin":
        return this.rejoin(connection, message.code, message.token);
      case "ready":
        return this.ready(connection, message);
      case "fire":
        return this.fire(connection, message);
      case "rematch":
        return this.rematch(connection);
      case "leave":
        return this.leave(connection);
    }
  }

  private create(connection: Connection, name: string, rules: RoomRulesDto): void {
    this.disconnect(connection);

    const token = this.options.newToken();
    const room = this.registry.open(settingsFrom(rules), { name, token }, this.options.clock());

    this.sit(connection, room, token);
  }

  private join(connection: Connection, code: string, name: string): void {
    this.disconnect(connection);

    const token = this.options.newToken();
    const now = this.options.clock();
    const room = this.roomWithCode(code).join({ name, token });

    this.registry.save(room, now);
    this.sit(connection, room, token);
    this.sendStateToRoom(room, now, connection);
  }

  private rejoin(connection: Connection, code: string, token: string): void {
    const room = this.roomWithCode(code);

    if (room.seatOf(token) === undefined) {
      throw new GameRuleError("no-such-room", "There is no such room for you.");
    }

    this.disconnect(connection);
    this.players.closeOthersAt(room.code, token);
    this.sit(connection, room, token);
  }

  private ready(connection: Connection, message: Extract<ClientMessage, { type: "ready" }>): void {
    const { room, token, now } = this.contextOf(connection);

    this.commit(room.markReady(token, toPlacements(message.ships), now), now);
  }

  private fire(connection: Connection, message: Extract<ClientMessage, { type: "fire" }>): void {
    const { room, token, now } = this.contextOf(connection);
    const result = room.fire(token, toPosition(message.cell), now);

    this.commit(result.room, now);
    this.announceShot(result.room.code, result.shot);
  }

  private rematch(connection: Connection): void {
    const { room, token, now } = this.contextOf(connection);

    this.commit(room.voteForRematch(token), now);
  }

  /** Walking away for good closes the room. The other player is told, and has no seat left either. */
  private leave(connection: Connection): void {
    const seat = this.players.seatOf(connection);

    if (seat === undefined) {
      return;
    }

    this.players.sendToRoom(seat.code, { type: "opponent-left" }, connection);
    this.players.releaseRoom(seat.code);
    this.registry.remove(seat.code);
  }

  /** The browser takes its seat: it hears the whole truth and the others hear it is back. */
  private sit(connection: Connection, room: Room, token: string): void {
    const now = this.options.clock();

    this.players.seat(connection, { code: room.code, token });
    connection.send({
      type: "entered",
      token,
      room: toRoomViewDto(room.viewFor(token, now)),
      opponentOnline: this.players.hasAnyoneBesides(room.code, token),
    });
    this.players.sendToRoom(room.code, { type: "presence", opponentOnline: true }, connection);
  }

  private commit(room: Room, now: number): void {
    this.registry.save(room, now);
    this.sendStateToRoom(room, now);
  }

  private announceShot(code: string, shot: ShotReport): void {
    this.players.sendToRoom(code, { type: "shot", shot: toShotDto(shot) });
  }

  /** Every browser in the room gets the room as its own player may see it. */
  private sendStateToRoom(room: Room, now: number, except?: Connection): void {
    this.players.sendToEach(
      room.code,
      ({ token }) => ({ type: "state", room: toRoomViewDto(room.viewFor(token, now)) }),
      except,
    );
  }

  private contextOf(connection: Connection): { room: Room; token: string; now: number } {
    const seat = this.players.seatOf(connection);

    if (seat === undefined) {
      throw new GameRuleError("not-in-room", "Create or join a room first.");
    }
    return { room: this.roomWithCode(seat.code), token: seat.token, now: this.options.clock() };
  }

  private roomWithCode(code: string): Room {
    const room = this.registry.find(code);

    if (room === undefined) {
      throw new GameRuleError("no-such-room", "There is no room with that code.");
    }
    return room;
  }
}

function settingsFrom(rules: RoomRulesDto): GameSettings {
  return {
    ...DEFAULT_GAME_SETTINGS,
    fleetPreset: rules.fleetPreset,
    allowTouching: rules.allowTouching && fleetMayTouch(rules.fleetPreset),
  };
}
