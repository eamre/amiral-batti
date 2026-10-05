import { GameClient } from "./infrastructure/GameClient";
import { LocalStoragePreferences } from "./infrastructure/LocalStoragePreferences";
import { LocalStorageSessionStore } from "./infrastructure/LocalStorageSessionStore";
import { webSocketFactory } from "./infrastructure/webSocketFactory";
import { createApp } from "./ui/app/app";
import { SoundSwitch } from "./ui/sound/SoundSwitch";
import { createSoundEffects } from "./ui/sound/soundEffects";
import { TonePlayer } from "./ui/sound/TonePlayer";
import "./ui/styles/index.css";

const TICK_MILLISECONDS = 250;

const schedule = (action: () => void, delayMilliseconds: number): void => {
  setTimeout(action, delayMilliseconds);
};

// The app gives commands to the client, and the client reports to the app. Each needs the other
// when it is made, but a command is only given later, when both exist. So the commands look
// the client up at the moment they are used.
let client: GameClient;

const preferences = new LocalStoragePreferences(localStorage);
const sound = new SoundSwitch(new TonePlayer(() => new AudioContext()), preferences);
const effects = createSoundEffects(sound);

const app = createApp({
  commands: {
    create: (name, rules) => client.create(name, rules),
    join: (code, name) => client.join(code, name),
    ready: (ships) => client.ready(ships),
    fire: (cell) => client.fire(cell),
    rematch: () => client.rematch(),
    leave: () => client.leave(),
  },
  preferences,
  sound,
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
  // The screens and the sounds hear the same things.
  listener: {
    stateChanged(state) {
      app.listener.stateChanged(state);
      effects.stateChanged(state);
    },
    shotFired(shot) {
      app.listener.shotFired(shot);
      effects.shotFired(shot);
    },
    failed: (failure) => app.listener.failed(failure),
  },
});

// Browsers keep a page silent until the player has touched it, so the first touch wakes the sound up.
for (const type of ["pointerdown", "keydown"]) {
  addEventListener(type, () => sound.unlock(), { once: true });
}

document.getElementById("app")?.append(app.element);
setInterval(app.tick, TICK_MILLISECONDS);
client.start();
