export type Player = "first" | "second";

export function opponentOf(player: Player): Player {
  return player === "first" ? "second" : "first";
}