import type { SocketFactory } from "./clientPorts";

/** Connects to the server with the browser's own WebSocket. */
export function webSocketFactory(url: string): SocketFactory {
  return (handlers) => {
    const socket = new WebSocket(url);

    socket.addEventListener("open", () => handlers.onOpen());
    socket.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        handlers.onMessage(event.data);
      }
    });
    socket.addEventListener("close", () => handlers.onClose());

    return {
      send: (text) => socket.send(text),
      close: () => socket.close(),
    };
  };
}
