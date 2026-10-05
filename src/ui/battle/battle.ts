import { opponentOf } from "../../domain/Player";
import type { Scheduler } from "../../infrastructure/GameClient";
import type { CellDto, RoomViewDto, ShotDto } from "../../shared/protocol";
import { enemyWatersModel, ownWatersModel } from "../board/boardModel";
import { renderBoard } from "../board/boardView";
import { isUrgent, secondsShown } from "./countdown";
import { DelayedBoard } from "./DelayedBoard";
import { h } from "../dom/h";
import { enemyFleetStatus } from "./fleetStatus";
import { createFleetsDialog } from "./fleetsDialog";
import { createFleetStrip } from "./fleetStrip";
import { canFireNow, shownBoard, statusOf } from "../app/screen";
import { battleText, shotText, statusText } from "../texts/texts";

/** How long the board stays as it was after the turn has passed, so the player sees where his shot went. */
const BOARD_SWITCH_MILLISECONDS = 900;

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

  const board = new DelayedBoard(BOARD_SWITCH_MILLISECONDS, options.schedule, () => render());

  const status = h("p", { class: "status__text", attrs: { "data-role": "status" } });
  const timer = h("span", { class: "timer", attrs: { "data-role": "timer" } });
  const messageLine = h("p", { class: "hint", attrs: { "data-role": "message" } });
  const scoreSlot = h("div");
  const boardSlot = h("div", { class: "board-slot" });
  const fleetSlot = h("div");
  const fleets = createFleetsDialog();
  const rematchSlot = h("div");

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
          })
        : renderBoard(ownWatersModel(game), { label: battleText.ownWaters, onFire: options.onFire }),
    );
    fleetSlot.replaceChildren(createFleetStrip(enemyFleetStatus(game)));
    fleets.update(game);
    rematchSlot.replaceChildren(...rematchButton(room));
    showClock();
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
          class: "button button--primary button--block",
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
      { class: "screen" },
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
