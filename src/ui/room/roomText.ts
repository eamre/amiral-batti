// The words of the room card and the way out of the room. Every word the player reads is in a texts file; the rest of the code deals in codes.
// The `Record` types make the compiler ask for a text whenever a new code is added.

export const roomText = {
  code: "Oda kodu",
  send: "Bu kodu arkadaşına söyle ya da gönder.",
  copy: "Kopyala",
  rules: (fleet: string, mayTouch: boolean): string =>
    `Filo: ${fleet} · ${mayTouch ? "Gemiler yan yana olabilir" : "Gemiler yan yana olamaz"}`,
};

export const leaveText = {
  label: "Odadan çık",
  question: "Odadan çıkmak istediğine emin misin?",
  stay: "Vazgeç",
  confirm: "Çık",
};
