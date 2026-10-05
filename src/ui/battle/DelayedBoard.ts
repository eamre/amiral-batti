import type { Scheduler } from "../../infrastructure/clientPorts";
import type { BoardSide } from "../app/screenRules";

/**
 * Decides which board is on the screen, but waits a moment before it changes boards.
 * Without the wait, the turn would pass the moment a shot is fired and the board would flip
 * away before the player had seen where his shot went.
 *
 * The first board is shown at once. After that, a change happens only if the wish
 * for the new board is still there when the delay is over.
 */
export class DelayedBoard {
  private wanted: BoardSide | undefined;
  private current: BoardSide | undefined;
  /** Each wish gets a number; a delayed change checks that its number is still the latest. */
  private latestWish = 0;

  constructor(
    private readonly delayMilliseconds: number,
    private readonly schedule: Scheduler,
    private readonly onChange: (side: BoardSide) => void,
  ) {}

  get shown(): BoardSide | undefined {
    return this.current;
  }

  want(side: BoardSide): void {
    if (this.current === undefined) {
      this.wanted = side;
      this.show(side);
      return;
    }
    if (side === this.wanted) {
      return;
    }

    this.wanted = side;
    const wish = ++this.latestWish;

    if (side === this.current) {
      return;
    }
    this.schedule(() => {
      if (wish === this.latestWish) {
        this.show(side);
      }
    }, this.delayMilliseconds);
  }

  private show(side: BoardSide): void {
    this.current = side;
    this.onChange(side);
  }
}
