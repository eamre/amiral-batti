import { Position } from "../domain/Position";
import type { Ship } from "../domain/Ship";
import { FleetEditor } from "./FleetEditor";
import { dragOrigin, type BoardPoint } from "./shipDrag";

/** A ship that a finger is holding. */
interface Grip {
  readonly index: number;
  /** The cell of the ship that was touched; it stays under the finger while the ship is dragged. */
  readonly grabbedAt: Position;
  readonly start: BoardPoint;
  /** How far, in cells, the finger must go before a touch becomes a drag. */
  readonly threshold: number;
  readonly moved: boolean;
  /** The fleet as it would be if the finger were lifted now. Undefined while the finger is off the board. */
  readonly preview: FleetEditor | undefined;
}

/**
 * What happens between the finger touching the board and leaving it again:
 *   touch a ship and lift         → the ship turns
 *   touch a ship, move, and lift  → the ship moves (unless it is let go outside the board)
 *
 * It knows nothing about screens: points are in cells, as `dragOrigin` wants them.
 * Like the editor, it is immutable: every step returns a new session.
 */
export class PlacementSession {
  static start(editor: FleetEditor): PlacementSession {
    return new PlacementSession(editor, undefined);
  }

  private constructor(
    /** The fleet as the player has arranged it so far. A drag does not change it until it ends. */
    readonly editor: FleetEditor,
    private readonly grip: Grip | undefined,
  ) {}

  /** The fleet to draw: the arranged one, or, while a ship is being dragged, how it would look. */
  get shown(): FleetEditor {
    return this.grip?.preview ?? this.editor;
  }

  /** The ship that is being dragged on the board right now. */
  get draggingIndex(): number | undefined {
    return this.grip?.preview === undefined ? undefined : this.grip.index;
  }

  press(point: BoardPoint, threshold: number): PlacementSession {
    const cell = new Position(Math.floor(point.row), Math.floor(point.column));
    const index = this.editor.shipAt(cell);

    if (index === undefined) {
      return this;
    }
    return new PlacementSession(this.editor, {
      index,
      grabbedAt: cell,
      start: point,
      threshold,
      moved: false,
      preview: undefined,
    });
  }

  drag(point: BoardPoint): PlacementSession {
    const { grip } = this;

    if (grip === undefined) {
      return this;
    }
    if (!grip.moved && distanceInCells(grip.start, point) < grip.threshold) {
      return this;
    }

    const origin = dragOrigin(this.shipOf(grip.index), grip.grabbedAt, point, this.editor.settings.boardSize);
    const preview = origin === undefined ? undefined : this.editor.moveTo(grip.index, origin);

    return new PlacementSession(this.editor, { ...grip, moved: true, preview });
  }

  release(point: BoardPoint): PlacementSession {
    const { grip } = this;

    if (grip === undefined) {
      return this;
    }

    // The place where the finger is lifted counts, even if no move was reported on the way.
    const last = this.drag(point).grip ?? grip;

    if (!last.moved) {
      return new PlacementSession(this.editor.rotate(last.index), undefined);
    }
    return new PlacementSession(last.preview ?? this.editor, undefined);
  }

  cancel(): PlacementSession {
    return new PlacementSession(this.editor, undefined);
  }

  private shipOf(index: number): Ship {
    const item = this.editor.ships[index];

    if (item === undefined) {
      throw new RangeError(`There is no ship number ${index}.`);
    }
    return item.ship;
  }
}

function distanceInCells(a: BoardPoint, b: BoardPoint): number {
  return Math.hypot(a.row - b.row, a.column - b.column);
}
