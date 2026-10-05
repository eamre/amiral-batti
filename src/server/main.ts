import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { Connection } from "./ConnectedPlayers";
import { GameServer } from "./GameServer";

const PORT = Number(process.env.PORT ?? 3000);
const MAX_MESSAGE_BYTES = 16 * 1024;
const TICK_MILLISECONDS = 1_000;
const SWEEP_MILLISECONDS = 10 * 60 * 1000;
const PING_MILLISECONDS = 25_000;
const OPEN = 1;

const game = new GameServer({
  clock: Date.now,
  random: Math.random,
  newToken: randomUUID,
});

const http = createServer((request, response) => {
  if (request.url === "/healthz") {
    response.end("ok");
    return;
  }
  response.writeHead(404).end();
});

const sockets = new WebSocketServer({ server: http, maxPayload: MAX_MESSAGE_BYTES });

function connectionFor(socket: WebSocket): Connection {
  return {
    send: (message) => {
      if (socket.readyState === OPEN) {
        socket.send(JSON.stringify(message));
      }
    },
    close: () => socket.close(),
  };
}

sockets.on("connection", (socket) => {
  const connection = connectionFor(socket);
  let isAlive = true;

  socket.on("pong", () => {
    isAlive = true;
  });
  socket.on("message", (data) => {
    try {
      game.receive(connection, data.toString());
    } catch (error) {
      console.error("Unexpected error while handling a message:", error);
    }
  });
  socket.on("close", () => game.disconnect(connection));

  // Proxies cut idle connections, so we ping; a browser that never answers is gone.
  const heartbeat = setInterval(() => {
    if (!isAlive) {
      socket.terminate();
      return;
    }
    isAlive = false;
    socket.ping();
  }, PING_MILLISECONDS);

  socket.on("close", () => clearInterval(heartbeat));
});

setInterval(() => game.tick(), TICK_MILLISECONDS);
setInterval(() => {
  const removed = game.sweep();

  if (removed.length > 0) {
    console.log(`Forgot abandoned rooms: ${removed.join(", ")}`);
  }
}, SWEEP_MILLISECONDS);

http.listen(PORT, () => console.log(`Listening on ${PORT}`));
