// The words of the room card and the way out of the room. Every word the player reads is in a texts file; the rest of the code deals in codes.
// The `Record` types make the compiler ask for a text whenever a new code is added.

export const roomText = {
  code: "Oda kodu",
  send: "Bu kodu arkadaşına söyle ya da gönder.",
  copy: "Kopyala",
};

export const leaveText = {
  label: "Odadan çık",
  question: "Odadan çıkmak istediğine emin misin?",
  stay: "Vazgeç",
  confirm: "Çık",
};
