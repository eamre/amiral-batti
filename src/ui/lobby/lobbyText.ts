import type { FleetSummary } from "./fleetSummary";

// The words of the lobby. Every word the player reads is in a texts file; the rest of the code deals in codes.

export const lobbyText = {
  nameLabel: "Adın",
  namePlaceholder: "Önce adını yaz",
  createTitle: "Yeni oyun kur",
  createButton: "Oda kur",
  touchingLabel: "Gemiler yan yana olabilsin",
  joinTitle: "Odaya katıl",
  codePlaceholder: "ODA KODU",
  joinButton: "Katıl",
  nameNeeded: "Oda kurmak ya da katılmak için önce adını yaz.",
  joinHint: "Katılırken kurallar odayı kurandan gelir.",
  summary: ({ ships, cells }: FleetSummary): string => `${ships} gemi, ${cells} kare`,
  touchingLockedHint: "Rus filosunda gemiler birbirine değemez; bu kural değişmez.",
  touchingHint: (allowed: boolean): string =>
    allowed
      ? "Gemiler birbirine değebilir."
      : "Gemiler birbirine hiçbir yerden değemez (çapraz da). Bir gemi batınca çevresi otomatik ıska işaretlenir.",
};
