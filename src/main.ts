import { GameClient } from "./infrastructure/GameClient";
import { LocalStoragePreferences } from "./infrastructure/LocalStoragePreferences";
import { LocalStorageSessionStore } from "./infrastructure/LocalStorageSessionStore";
import { webSocketFactory } from "./infrastructure/webSocketFactory";
import { createApp } from "./ui/app";
import "./ui/styles.css";

const TICK_MILLISECONDS = 250;

const schedule = (action: () => void, delayMilliseconds: number): void => {
  setTimeout(action, delayMilliseconds);
};

// The app gives commands to the client, and the client reports to the app. Each needs the other
// when it is made, but a command is only given later, when both exist. So the commands look
// the client up at the moment they are used.
let client: GameClient;

const app = createApp({
  commands: {
    create: (name, rules) => client.create(name, rules),
    join: (code, name) => client.join(code, name),
    ready: (ships) => client.ready(ships),
    fire: (cell) => client.fire(cell),
    rematch: () => client.rematch(),
    leave: () => client.leave(),
  },
  preferences: new LocalStoragePreferences(localStorage),
  // Only pages served over https (or from localhost) may use the clipboard.
  copy: (text) => void navigator.clipboard?.writeText(text),
  random: Math.random,
  now: Date.now,
  schedule,
});

const protocol = location.protocol === "https:" ? "wss:" : "ws:";

client = new GameClient({
  createSocket: webSocketFactory(`${protocol}//${location.host}/ws`),
  store: new LocalStorageSessionStore(localStorage),
  schedule,
  listener: app.listener,
});

document.getElementById("app")?.append(app.element);
setInterval(app.tick, TICK_MILLISECONDS);
client.start();
