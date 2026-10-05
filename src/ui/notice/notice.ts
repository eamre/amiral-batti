import type { Scheduler } from "../../infrastructure/clientPorts";
import type { ClientState } from "../../infrastructure/clientState";
import type { ErrorCode } from "../../shared/protocol";
import { h } from "../dom/h";
import { errorText, presenceText } from "./noticeText";

/** How long what the notice was told to say stays on the screen. */
const MESSAGE_MILLISECONDS = 4_000;

export interface Notice {
  readonly element: HTMLElement;
  /** Tell it what the client knows now; it decides whether there is something to say. */
  showState(state: ClientState): void;
  /** Say what the server refused. It goes away by itself after a while. */
  complain(code: ErrorCode): void;
  /** Say that the opponent walked away and the room is closed. It goes away by itself after a while. */
  opponentLeft(): void;
}

/**
 * The line under the header, where the app speaks for itself. What it was told to say (a refused
 * move, an opponent who left) comes first and then goes away; when there is none, it says if the
 * opponent has lost his connection.
 */
export function createNotice(schedule: Scheduler): Notice {
  const element = h("p", { class: "notice", attrs: { role: "status", "data-role": "notice" } });
  let state: ClientState | undefined;
  let message = "";
  let latest = 0;

  function show(): void {
    element.textContent = message !== "" ? message : state === undefined ? "" : presenceNotice(state);
  }

  /** Shows the text for a while. Only the latest text may take the notice away. */
  function say(text: string): void {
    const mine = ++latest;

    message = text;
    show();
    schedule(() => {
      if (mine === latest) {
        message = "";
        show();
      }
    }, MESSAGE_MILLISECONDS);
  }

  return {
    element,
    showState(next) {
      state = next;
      show();
    },
    complain: (code) => say(errorText[code]),
    opponentLeft: () => say(presenceText.opponentLeft),
  };
}

/** The opponent's connection matters only while ours works, and only once he has come. */
function presenceNotice(state: ClientState): string {
  const opponentHasLeft = state.room?.opponentName !== undefined && !state.opponentOnline;

  return state.status === "online" && opponentHasLeft ? presenceText.opponentOffline : "";
}
