import { defineConfig } from "vite";

const GAME_SERVER = "http://localhost:3000";

export default defineConfig({
  server: {
    proxy: {
      // The browser asks its own host for "/ws"; during development Vite passes it on to the game server.
      "/ws": { target: GAME_SERVER, ws: true },
    },
  },
});
