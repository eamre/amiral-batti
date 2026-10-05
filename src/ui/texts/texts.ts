import type { FleetPresetId } from "../../domain/fleetPresets";
import type { ShipKind } from "../../domain/ShipDefinition";
import type { ConnectionStatus } from "../../infrastructure/GameClient";
import type { Player } from "../../domain/Player";
import type { ErrorCode, ShotDto } from "../../shared/protocol";
import type { FleetSummary } from "./fleetSummary";
import type { StatusCode } from "../app/screen";

// Every word the player reads is in this file. The rest of the code deals in codes.
// The `Record` types make the compiler ask for a text whenever a new code is added.

export const APP_TITLE = "Amiral Battı";

export const connectionText: Record<ConnectionStatus, string> = {
  connecting: "bağlanıyor…",
  online: "bağlı",
  offline: "bağlantı yok",
};

export const presetName: Record<FleetPresetId, string> = {
  classic: "Klasik",
  russian: "Rus",
  standard: "Standart",
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

export const errorText: Record<ErrorCode, string> = {
  "wrong-phase": "Şu an bunu yapamazsın.",
  "already-ready": "Zaten hazırsın.",
  "wrong-fleet": "Filo kurallara uymuyor.",
  "bad-placement": "Gemilerin yerleşimi geçersiz.",
  "not-your-turn": "Sıra sende değil.",
  "shot-not-allowed": "Bu kareye ateş edemezsin.",
  "room-full": "Bu oda dolu.",
  "unknown-player": "Oyuncu bulunamadı.",
  "no-such-room": "Böyle bir oda yok.",
  "not-in-room": "Önce bir odaya girmelisin.",
  "bad-message": "Geçersiz istek.",
};

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

export const lobbyText = {
  nameLabel: "Adın",
  namePlaceholder: "Adın",
  createTitle: "Yeni oyun kur",
  createButton: "Oda kur",
  touchingLabel: "Gemiler yan yana olabilsin",
  joinTitle: "Odaya katıl",
  codePlaceholder: "ODA KODU",
  joinButton: "Katıl",
  joinHint: "Katılırken kurallar odayı kurandan gelir.",
  summary: ({ ships, cells }: FleetSummary): string => `${ships} gemi, ${cells} kare`,
  touchingHint: (allowed: boolean): string =>
    allowed
      ? "Gemiler birbirine değebilir."
      : "Gemiler birbirine hiçbir yerden değemez (çapraz da). Bir gemi batınca çevresi otomatik ıska işaretlenir.",
};

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

export const placementText = {
  hint: "Gemiyi sürükleyip taşı · dokun: döndür",
  fix: "Kırmızı gemiler yerinde duramaz. Onları taşı.",
  board: "Filon",
  shuffle: "Karıştır",
  ready: "Hazırım",
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

export const roomText = {
  code: "Oda kodu",
  send: "Bu kodu arkadaşına söyle ya da gönder.",
  copy: "Kopyala",
};

export const appText = {
  opponentOffline: "Rakibin bağlantısı koptu. Dönmesi bekleniyor…",
  leave: "Odadan çık",
  leaveQuestion: "Odadan çıkmak istediğine emin misin?",
  leaveStay: "Vazgeç",
  leaveConfirm: "Çık",
};

export const soundText = {
  label: "Ses efektleri",
  turnOff: "Sesi kapat",
  turnOn: "Sesi aç",
};
