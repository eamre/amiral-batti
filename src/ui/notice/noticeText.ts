import type { ConnectionStatus } from "../../infrastructure/clientState";
import type { ErrorCode } from "../../shared/protocol";

// The words of what the app tells the player on its own: how the connection is, what went wrong.
// Every word the player reads is in a texts file; the rest of the code deals in codes.
// The `Record` types make the compiler ask for a text whenever a new code is added.

export const connectionText: Record<ConnectionStatus, string> = {
  connecting: "bağlanıyor…",
  online: "bağlı",
  offline: "bağlantı yok",
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
  "no-name": "Önce adını yaz.",
  "bad-message": "Geçersiz istek.",
};

export const presenceText = {
  opponentOffline: "Rakibin bağlantısı koptu. Dönmesi bekleniyor…",
};
