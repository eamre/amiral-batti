import type { ShipKind } from "../../domain/ShipDefinition";
import type { Player } from "../../domain/Player";
import type { ShotDto } from "../../shared/protocol";

// The words of the battle. Every word the player reads is in a texts file; the rest of the code deals in codes.
// The `Record` types make the compiler ask for a text whenever a new code is added.

export const battleText = {
  ownWaters: "Filon",
  enemyWaters: "Düşman suları",
  enemyFleet: "Düşman filosu",
  shipsLeft: (left: number, total: number): string => `${left} / ${total}`,
  sunkSuffix: "battı",
  timer: (seconds: number): string => `⏱ ${seconds}`,
  score: (yours: number, theirs: number, opponentName: string | undefined): string =>
    `Sen ${yours} – ${theirs} ${opponentName ?? "Rakip"}`,
  rematchAsk: "Tekrar oyna",
  rematchWait: "Rakip bekleniyor…",
  rematchAccept: "Rövanşı kabul et",
  fleetsShow: "Filoları göster",
  fleetsTitle: "Oyunun son durumu",
  fleetsOwn: "Senin filon",
  fleetsEnemy: "Rakibin filosu",
  fleetsClose: "Kapat",
};

export const shipName: Record<ShipKind, string> = {
  carrier: "Uçak gemisi",
  cruiser: "Kruvazör",
  submarine: "Denizaltı",
  destroyer: "Muhrip",
  boat: "Bot",
  dinghy: "Sandal",
  tanker: "Tanker",
  battleship: "Zırhlı",
};

/** What the player is told about the shot that has just been fired, by him or at him. */
export function shotText(shot: ShotDto, you: Player, opponentName: string | undefined): string {
  const opponent = opponentName ?? "Rakip";
  const size = shot.sunkShip?.length ?? 0;
  const isYours = shot.shooter === you;

  const base = isYours
    ? { miss: "Iskaladın.", hit: "Vurdun!", sunk: `${size} karelik gemiyi batırdın!` }[shot.outcome]
    : {
        miss: `${opponent} ıskaladı.`,
        hit: `${opponent} vurdu!`,
        sunk: `${opponent} ${size} karelik gemini batırdı!`,
      }[shot.outcome];

  return shot.wasRandom ? `Süre doldu, rastgele atıldı: ${base}` : base;
}
