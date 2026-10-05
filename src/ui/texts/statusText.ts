import type { StatusCode } from "../app/screen";

// The line above the board is shared by the room card and the battle, so its words live here.

/** The line above the board. Only some codes mention the opponent. */
export function statusText(code: StatusCode, opponentName: string | undefined): string {
  const opponent = opponentName ?? "Rakip";

  switch (code) {
    case "waiting-for-opponent":
      return "Rakip bekleniyor…";
    case "arrange-fleet":
      return "Filonu istediğin gibi düzenle, sonra Hazırım'a bas.";
    case "opponent-is-arranging":
      return `${opponent} filosunu düzenliyor…`;
    case "your-turn":
      return "Sıra sende — ateş et!";
    case "opponent-turn":
      return `${opponent} ateş ediyor…`;
    case "you-won":
      return "Kazandın!";
    case "you-lost":
      return "Kaybettin.";
  }
}
