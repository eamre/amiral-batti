import { opponentOf, type Player } from "../../domain/Player";
import type { Scheduler } from "../../infrastructure/clientPorts";
import type { CellDto, RoomViewDto, ShotDto } from "../../shared/protocol";
import { enemyWatersModel, ownWatersModel } from "../board/boardModel";
import { renderBoard, type Ping } from "../board/boardView";
import { isUrgent, secondsShown } from "./countdown";
import { DelayedBoard } from "./DelayedBoard";
import { h } from "../dom/h";
import { enemyFleetStatus } from "./fleetStatus";
import { createFleetsDialog } from "./fleetsDialog";
import { createFleetStrip } from "./fleetStrip";
import { canFireNow, shownBoard, statusOf, type BoardSide } from "../app/screenRules";
import { statusText } from "../texts/statusText";
import { battleText, shotText } from "./battleText";

/** How long the board stays as it was after the turn has passed, so the player sees where his shot went. */
const BOARD_SWITCH_MILLISECONDS = 900;
/** How long the ring of a shot stays: it must be over before the board changes, or the player misses the end of it. */
const PING_MILLISECONDS = 800;

export interface BattleOptions {
  readonly now: () => number;
  readonly schedule: Scheduler;
  readonly onFire: (cell: CellDto) => void;
  readonly onRematch: () => void;
}

export interface BattleView {
  readonly element: HTMLElement;
  /** `receivedAt` is when the room was sent, so the clock can count down from then. */
  update(room: RoomViewDto, receivedAt: number): void;
  showShot(shot: ShotDto): void;
  setOnline(online: boolean): void;
  /** Call it every now and then (a few times a second) so that the clock keeps running. */
  tick(): void;
}

/** The screen of the battle, and of the moment after it: the turn, the clock, one board, the enemy fleet. */
export function createBattle(options: BattleOptions): BattleView {
  let room: RoomViewDto | undefined;
  let receivedAt = 0;
  let online = true;
  let message = "";
  /** The shot that has just landed, until its ring is over. */
  let freshShot: ShotDto | undefined;

  const board = new DelayedBoard(BOARD_SWITCH_MILLISECONDS, options.schedule, () => render());

  const status = h("p", { class: "status__text", attrs: { "data-role": "status" } });
  const timer = h("span", { class: "timer", attrs: { "data-role": "timer" } });
  const messageLine = h("p", { class: "hint", attrs: { "data-role": "message" } });
  const scoreSlot = h("div");
  const boardSlot = h("div", { class: "board-slot" });
  const fleetSlot = h("div", { class: "fleet-slot" });
  const fleets = createFleetsDialog();
  const rematchSlot = h("div", { class: "rematch-slot" });

  function render(): void {
    if (room === undefined) {
      return;
    }
    const { game } = room;
    const opponentName = room.opponentName;

    status.textContent = statusText(statusOf(room), opponentName);
    messageLine.textContent = message;
    scoreSlot.replaceChildren(...scoreLine(room));
    boardSlot.replaceChildren(
      board.shown === "enemy"
        ? renderBoard(enemyWatersModel(game, canFireNow(game, online)), {
            label: battleText.enemyWaters,
            onFire: options.onFire,
            ping: pingOn("enemy", game.you),
          })
        : renderBoard(ownWatersModel(game), {
            label: battleText.ownWaters,
            onFire: options.onFire,
            ping: pingOn("own", game.you),
          }),
    );
    fleetSlot.replaceChildren(createFleetStrip(enemyFleetStatus(game)));
    fleets.update(game);
    rematchSlot.replaceChildren(...rematchButton(room));
    showClock();
  }

  /** The ring of the fresh shot, if that shot landed on the board that is on the screen. */
  function pingOn(side: BoardSide, you: Player): Ping | undefined {
    if (freshShot === undefined || boardOfShot(freshShot, you) !== side) {
      return undefined;
    }
    return { cell: freshShot.cell, hit: freshShot.outcome !== "miss" };
  }

  function showClock(): void {
    const seconds = room && secondsShown(room.game.secondsLeft, receivedAt, options.now());

    timer.textContent = seconds === undefined ? "" : battleText.timer(seconds);
    timer.classList.toggle("timer--urgent", seconds !== undefined && isUrgent(seconds));
  }

  function scoreLine({ game, opponentName }: RoomViewDto): HTMLElement[] {
    const yours = game.wins[game.you];
    const theirs = game.wins[opponentOf(game.you)];

    if (yours + theirs === 0) {
      return [];
    }
    return [h("p", { class: "hint", attrs: { "data-role": "score" } }, battleText.score(yours, theirs, opponentName))];
  }

  function rematchButton(current: RoomViewDto): HTMLElement[] {
    if (current.game.phase !== "finished") {
      return [];
    }
    const label = current.youWantRematch
      ? battleText.rematchWait
      : current.opponentWantsRematch
        ? battleText.rematchAccept
        : battleText.rematchAsk;

    return [
      h(
        "button",
        {
          class: "button button--primary button--narrow",
          attrs: { type: "button", "data-role": "rematch", disabled: current.youWantRematch },
          on: { click: options.onRematch },
        },
        label,
      ),
    ];
  }

  return {
    element: h(
      "div",
      { class: "screen screen--battle" },
      h("section", { class: "card status" }, h("div", { class: "status__row" }, status, timer), messageLine, scoreSlot),
      boardSlot,
      fleetSlot,
      fleets.element,
      rematchSlot,
    ),
    update(next, receivedTime) {
      room = next;
      receivedAt = receivedTime;
      board.want(shownBoard(next.game));
      render();
    },
    showShot(shot) {
      if (room !== undefined) {
        message = shotText(shot, room.game.you, room.opponentName);
        freshShot = shot;
        options.schedule(() => {
          // A newer shot has its own ring, and its own end.
          if (freshShot === shot) {
            freshShot = undefined;
            render();
          }
        }, PING_MILLISECONDS);
        render();
      }
    },
    setOnline(isOnline) {
      online = isOnline;
      render();
    },
    tick: showClock,
  };
}

/** What the viewer shoots lands on the enemy waters; what the opponent shoots lands on his own. */
function boardOfShot(shot: ShotDto, you: Player): BoardSide {
  return shot.shooter === you ? "enemy" : "own";
}
