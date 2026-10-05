import type { ClientListener, ClientState } from "../../infrastructure/clientState";
import type { RoomViewDto } from "../../shared/protocol";
import { h } from "../dom/h";
import { createNotice } from "../notice/notice";
import { connectionText } from "../notice/noticeText";
import { createLeaveControl } from "../room/leaveControl";
import type { Muting } from "../sound/sound";
import { createSoundToggle } from "../sound/soundToggle";
import { screenKindOf, type ScreenKind } from "./screenRules";
import { buildScreen, type ScreenContext, type ScreenView } from "./buildScreen";

const APP_TITLE = "Amiral Battı";

/** What the screens need, and the two things only the header uses. */
export interface AppOptions extends ScreenContext {
  /** Walks away from the room for good. Only the header offers it; no screen does. */
  readonly leave: () => void;
  /** The player's choice to hear the game or not. The app only shows and changes it; the sounds are played elsewhere. */
  readonly sound: Muting;
}

export interface App {
  readonly element: HTMLElement;
  /** Give it to the `GameClient`: this is how the app hears what happens. */
  readonly listener: ClientListener;
  /** Call it every now and then (a few times a second) so that the clock of the battle keeps running. */
  tick(): void;
}

/**
 * Puts the screens together: it looks at what the server said, picks the screen that fits
 * (lobby, arranging the fleet, waiting, battle), builds it when the player gets there, and
 * keeps it while he stays. A screen that is kept is never rebuilt, so a ship that a finger
 * is dragging is not taken away because the opponent has come into the room.
 */
export function createApp(options: AppOptions): App {
  let state: ClientState = { status: "connecting", opponentOnline: false };
  let receivedAt = options.now();
  let current: { readonly kind: ScreenKind; readonly view: ScreenView } | undefined;

  const connection = h("span", { class: "connection", attrs: { "data-role": "connection" } });
  const leave = createLeaveControl(options.leave);
  const notice = createNotice(options.schedule);
  const slot = h("div", { class: "screen" });
  const element = h(
    "div",
    { class: "screen" },
    h(
      "header",
      { class: "header" },
      h("h1", { class: "title" }, `⚓ ${APP_TITLE}`),
      h("div", { class: "header__side" }, connection, createSoundToggle(options.sound), leave.element),
    ),
    notice.element,
    slot,
  );

  function render(): void {
    connection.textContent = connectionText[state.status];
    connection.setAttribute("data-state", state.status);

    const kind = screenKindOf(state.room);
    // There is a room to leave from the moment one is joined; the lobby has none.
    leave.setVisible(kind !== "lobby");
    // The page uses this to make a game fit the window while a form may scroll.
    element.setAttribute("data-screen", kind);
    const view = current?.kind === kind ? current.view : switchTo(kind, state.room);

    view.update(state, receivedAt);
    notice.showState(state);
  }

  function switchTo(kind: ScreenKind, room: RoomViewDto | undefined): ScreenView {
    const view = buildScreen(kind, room, options);

    slot.replaceChildren(view.element);
    current = { kind, view };
    return view;
  }

  render();

  return {
    element,
    tick: () => current?.view.tick(),
    listener: {
      stateChanged(next) {
        state = next;
        receivedAt = options.now();
        render();
      },
      shotFired(shot) {
        current?.view.showShot(shot);
      },
      failed(failure) {
        notice.complain(failure.code);
      },
    },
  };
}
