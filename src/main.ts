import { BOARD_SIZE } from "./domain/constants";

const app = document.getElementById("app");
if (app) {
  app.textContent = `Amiral Battı hazır. Tahta ${BOARD_SIZE}x${BOARD_SIZE}.`;
}