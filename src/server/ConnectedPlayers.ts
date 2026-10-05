import type { ServerMessage } from "../shared/protocol";

/** One browser, as the server sees it. The real one is a WebSocket; tests use a fake. */
export interface Connection {
  send(message: ServerMessage): void;
  close(): void;
}

/** Where a browser sits: which room, and with which token it proves it owns the seat. */
export interface Seat {
  readonly code: string;
  readonly token: string;
}

/**
 * Who is connected right now, and where each of them sits. It knows nothing about the game:
 * it only answers "who is in this room?" and carries messages to them.
 */
export class ConnectedPlayers {
  private readonly seats = new Map<Connection, Seat>();

  seat(connection: Connection, seat: Seat): void {
    this.seats.set(connection, seat);
  }

  /** The seat the browser had, if it had one. The seat itself stays in the room: the player can come back. */
  release(connection: Connection): Seat | undefined {
    const seat = this.seats.get(connection);

    this.seats.delete(connection);
    return seat;
  }

  seatOf(connection: Connection): Seat | undefined {
    return this.seats.get(connection);
  }

  hasAnyoneIn(code: string): boolean {
    return this.connectionsIn(code).length > 0;
  }

  /** Is there somebody in the room besides the owner of this token? */
  hasAnyoneBesides(code: string, token: string): boolean {
    return this.connectionsIn(code).some(([, seat]) => seat.token !== token);
  }

  /** Tells everybody in the room the same thing. */
  sendToRoom(code: string, message: ServerMessage, except?: Connection): void {
    this.sendToEach(code, () => message, except);
  }

  /** Tells everybody in the room something that depends on where he sits. */
  sendToEach(code: string, messageFor: (seat: Seat) => ServerMessage, except?: Connection): void {
    for (const [connection, seat] of this.connectionsIn(code)) {
      if (connection !== except) {
        connection.send(messageFor(seat));
      }
    }
  }

  /** Only one browser per seat: a new one pushes the old one out. */
  closeOthersAt(code: string, token: string): void {
    for (const [connection, seat] of this.connectionsIn(code)) {
      if (seat.token === token) {
        this.seats.delete(connection);
        connection.close();
      }
    }
  }

  private connectionsIn(code: string): [Connection, Seat][] {
    return [...this.seats].filter(([, seat]) => seat.code === code);
  }
}
