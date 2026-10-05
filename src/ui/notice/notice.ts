import type { Scheduler } from "../../infrastructure/clientPorts";
import type { ClientState } from "../../infrastructure/clientState";
import type { ErrorCode } from "../../shared/protocol";
import { h } from "../dom/h";
import { errorText, presenceText } from "./noticeText";

/** How long a complaint stays on the screen. */
const COMPLAINT_MILLISECONDS = 4_000;

export interface Notice {
  readonly element: HTMLElement;
  /** Tell it what the client knows now; it decides whether there is something to say. */
  showState(state: ClientState): void;
  /** Say what the server refused. It goes away by itself after a while. */
  complain(code: ErrorCode): void;
}

/**
 * The line under the header, where the app speaks for itself. A complaint about a refused
 * move comes first and then goes away; when there is none, it says if the opponent is gone.
 */
export function createNotice(schedule: Scheduler): Notice {
  const element = h("p", { class: "notice", attrs: { role: "status", "data-role": "notice" } });
  let state: ClientState | undefined;
  let complaint = "";
  let latestComplaint = 0;

  function show(): void {
    element.textContent = complaint !== "" ? complaint : state === undefined ? "" : presenceNotice(state);
  }

  return {
    element,
    showState(next) {
      state = next;
      show();
    },
    complain(code) {
      const mine = ++latestComplaint;

      complaint = errorText[code];
      show();
      schedule(() => {
        // Only the latest complaint may take the notice away.
        if (mine === latestComplaint) {
          complaint = "";
          show();
        }
      }, COMPLAINT_MILLISECONDS);
    },
  };
}

/** The opponent's connection matters only while ours works, and only once he has come. */
function presenceNotice(state: ClientState): string {
  const opponentHasLeft = state.room?.opponentName !== undefined && !state.opponentOnline;

  return state.status === "online" && opponentHasLeft ? presenceText.opponentOffline : "";
}
