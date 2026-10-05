import { FleetEditor } from "../../application/FleetEditor";
import type { GameSettings } from "../../application/GameSettings";
import type { RandomSource } from "../../domain/random";
import type { ClientListener, ClientState, Scheduler } from "../../infrastructure/GameClient";
import type { Preferences } from "../../infrastructure/LocalStoragePreferences";
import type { CellDto, RoomRulesDto, RoomViewDto, ShipPlacementDto, ShotDto } from "../../shared/protocol";
import { ownWatersModel } from "../board/boardModel";
import { createBattle } from "../battle/battle";
import { renderBoard } from "../board/boardView";
import { h } from "../dom/h";
import { createLeaveControl } from "../room/leaveControl";
import { createLobby } from "../lobby/lobby";
import { createPlacement } from "../placement/placement";
import { fromPlacementDto, toPlacementDto } from "../placement/placementDto";
import { createRoomCard } from "../room/roomCard";
import type { Muting } from "../sound/sound";
import { createSoundToggle } from "../sound/soundToggle";
import { screenKindOf, type ScreenKind } from "./screen";
import { battleText } from "../battle/battleText";
import { APP_TITLE, appText, connectionText, errorText } from "./appText";

/** What the screens can ask the server to do. `GameClient` has all of these. */
export interface Commands {
  create(name: string, rules: RoomRulesDto): unknown;
  join(code: string, name: string): unknown;
  ready(ships: readonly ShipPlacementDto[]): unknown;
  fire(cell: CellDto): unknown;
  rematch(): unknown;
  leave(): unknown;
}

export interface AppOptions {
  readonly commands: Commands;
  readonly preferences: Preferences;
  /** The player's choice to hear the game or not. The app only shows and changes it; the sounds are played elsewhere. */
  readonly sound: Muting;
  readonly copy: (text: string) => void;
  readonly random: RandomSource;
  readonly now: () => number;
  readonly schedule: Scheduler;
}

export interface App {
  readonly element: HTMLElement;
  /** Give it to the `GameClient`: this is how the app hears what happens. */
  readonly listener: ClientListener;
  /** Call it every now and then (a few times a second) so that the clock of the battle keeps running. */
  tick(): void;
}

/** How long a complaint stays on the screen. */
const COMPLAINT_MILLISECONDS = 4_000;

interface ScreenView {
  readonly element: HTMLElement;
  update(state: ClientState, receivedAt: number): void;
  showShot(shot: ShotDto): void;
  tick(): void;
}

/**
 * Puts the screens together: it looks at what the server said, picks the screen that fits
 * (lobby, arranging the fleet, waiting, battle), builds it when the player gets there, and
 * keeps it while he stays. A screen that is kept is never rebuilt, so a ship that a finger
 * is dragging is not taken away because the opponent has come into the room.
 */
export function createApp(options: AppOptions): App {
  const { commands, preferences } = options;
  let state: ClientState = { status: "connecting", opponentOnline: false };
  let receivedAt = options.now();
  let current: { readonly kind: ScreenKind; readonly view: ScreenView } | undefined;
  let complaint = "";
  let latestComplaint = 0;

  const connection = h("span", { class: "connection", attrs: { "data-role": "connection" } });
  const leave = createLeaveControl(() => commands.leave());
  const notice = h("p", { class: "notice", attrs: { role: "status", "data-role": "notice" } });
  const slot = h("div", { class: "screen" });
  const element = h(
    "div",
    { class: "screen" },
    h(
      "header",
      { class: "header" },
      h("h1", { class: "title" }, `⚓ ${APP_TITLE}`),
      h("div", { class: "header__side" }, connection, createSoundToggle(options.sound), leave.element),
    ),
    notice,
    slot,
  );

  function render(): void {
    connection.textContent = connectionText[state.status];
    connection.setAttribute("data-state", state.status);

    const kind = screenKindOf(state.room);
    // There is a room to leave from the moment one is joined; the lobby has none.
    leave.setVisible(kind !== "lobby");
    // The page uses this to make a game fit the window while a form may scroll.
    element.setAttribute("data-screen", kind);
    const view = current?.kind === kind ? current.view : switchTo(kind, state.room);

    view.update(state, receivedAt);
    showNotice();
  }

  function switchTo(kind: ScreenKind, room: RoomViewDto | undefined): ScreenView {
    const view = buildScreen(kind, room);

    slot.replaceChildren(view.element);
    current = { kind, view };
    return view;
  }

  function showNotice(): void {
    notice.textContent = complaint !== "" ? complaint : presenceNotice(state);
  }

  function buildScreen(kind: ScreenKind, room: RoomViewDto | undefined): ScreenView {
    switch (kind) {
      case "lobby":
        return lobbyScreen();
      case "placement":
        return placementScreen(requireRoom(room).game.settings);
      case "waiting":
        return waitingScreen();
      case "battle":
        return battleScreen();
    }
  }

  function lobbyScreen(): ScreenView {
    const lobby = createLobby(
      {
        create: (name, rules) => {
          preferences.saveName(name);
          commands.create(name, rules);
        },
        join: (code, name) => {
          preferences.saveName(name);
          commands.join(code, name);
        },
      },
      preferences.loadName(),
    );

    return screenView(lobby.element, (next) => lobby.setOnline(next.status === "online"));
  }

  function placementScreen(settings: GameSettings): ScreenView {
    const card = createRoomCard(options.copy);
    const saveLayout = (ships: readonly ShipPlacementDto[]) => preferences.saveLayout(settings.fleetPreset, ships);
    const placement = createPlacement({
      initial: initialFleet(settings),
      random: options.random,
      changed: (editor) => saveLayout(editor.toPlacements().map(toPlacementDto)),
      ready: (placements) => {
        const ships = placements.map(toPlacementDto);

        saveLayout(ships);
        commands.ready(ships);
      },
    });

    return screenView(h("div", { class: "screen" }, card.element, placement.element), (next) => {
      card.update(requireRoom(next.room));
      placement.setOnline(next.status === "online");
    });
  }

  /** The fleet that was left the last time with these rules, if the rules still allow it; otherwise a new one. */
  function initialFleet(settings: GameSettings): FleetEditor {
    const remembered = preferences.loadLayout(settings.fleetPreset);

    return (
      (remembered && FleetEditor.fromPlacements(settings, remembered.map(fromPlacementDto))) ??
      FleetEditor.random(settings, options.random)
    );
  }

  function waitingScreen(): ScreenView {
    const card = createRoomCard(options.copy);
    const boardSlot = h("div", { class: "board-slot" });

    return screenView(h("div", { class: "screen" }, card.element, boardSlot), (next) => {
      const room = requireRoom(next.room);

      card.update(room);
      boardSlot.replaceChildren(
        renderBoard(ownWatersModel(room.game), { label: battleText.ownWaters, onFire: () => undefined }),
      );
    });
  }

  function battleScreen(): ScreenView {
    const battle = createBattle({
      now: options.now,
      schedule: options.schedule,
      onFire: (cell) => commands.fire(cell),
      onRematch: () => commands.rematch(),
    });

    return screenView(
      battle.element,
      (next, time) => {
        const room = requireRoom(next.room);

        battle.setOnline(next.status === "online");
        battle.update(room, time);
      },
      { showShot: (shot) => battle.showShot(shot), tick: () => battle.tick() },
    );
  }

  render();

  return {
    element,
    tick: () => current?.view.tick(),
    listener: {
      stateChanged(next) {
        state = next;
        receivedAt = options.now();
        render();
      },
      shotFired(shot) {
        current?.view.showShot(shot);
      },
      failed(failure) {
        const mine = ++latestComplaint;

        complaint = errorText[failure.code];
        showNotice();
        options.schedule(() => {
          // Only the latest complaint may take the notice away.
          if (mine === latestComplaint) {
            complaint = "";
            showNotice();
          }
        }, COMPLAINT_MILLISECONDS);
      },
    },
  };
}

function screenView(
  element: HTMLElement,
  update: ScreenView["update"],
  extras: Partial<Pick<ScreenView, "showShot" | "tick">> = {},
): ScreenView {
  return {
    element,
    update,
    showShot: extras.showShot ?? (() => undefined),
    tick: extras.tick ?? (() => undefined),
  };
}

/** The opponent's connection matters only while ours works, and only once he has come. */
function presenceNotice(state: ClientState): string {
  const opponentHasLeft = state.room?.opponentName !== undefined && !state.opponentOnline;

  return state.status === "online" && opponentHasLeft ? appText.opponentOffline : "";
}

/** The screens that are built for a room are only ever asked for when there is one. */
function requireRoom(room: RoomViewDto | undefined): RoomViewDto {
  if (room === undefined) {
    throw new Error("This screen needs a room, but there is none.");
  }
  return room;
}
