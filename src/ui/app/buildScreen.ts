import { FleetEditor } from "../../application/FleetEditor";
import type { GameSettings } from "../../application/GameSettings";
import type { RandomSource } from "../../domain/random";
import type { ClientState, Scheduler } from "../../infrastructure/GameClient";
import type { Preferences } from "../../infrastructure/LocalStoragePreferences";
import type { CellDto, RoomRulesDto, RoomViewDto, ShipPlacementDto, ShotDto } from "../../shared/protocol";
import { createBattle } from "../battle/battle";
import { battleText } from "../battle/battleText";
import { ownWatersModel } from "../board/boardModel";
import { renderBoard } from "../board/boardView";
import { h } from "../dom/h";
import { createLobby } from "../lobby/lobby";
import { createPlacement } from "../placement/placement";
import { fromPlacementDto, toPlacementDto } from "../placement/placementDto";
import { createRoomCard } from "../room/roomCard";
import type { ScreenKind } from "./screenRules";

/** What the screens can ask the server to do. `GameClient` has all of these. */
export interface Commands {
  create(name: string, rules: RoomRulesDto): unknown;
  join(code: string, name: string): unknown;
  ready(ships: readonly ShipPlacementDto[]): unknown;
  fire(cell: CellDto): unknown;
  rematch(): unknown;
  leave(): unknown;
}

/** Everything a screen needs from the outside to be built. */
export interface ScreenContext {
  readonly commands: Commands;
  readonly preferences: Preferences;
  readonly copy: (text: string) => void;
  readonly random: RandomSource;
  readonly now: () => number;
  readonly schedule: Scheduler;
}

export interface ScreenView {
  readonly element: HTMLElement;
  update(state: ClientState, receivedAt: number): void;
  showShot(shot: ShotDto): void;
  tick(): void;
}

/** Builds the screen of a kind. The room is only needed, and only there, from the arranging of the fleet on. */
export function buildScreen(kind: ScreenKind, room: RoomViewDto | undefined, context: ScreenContext): ScreenView {
  switch (kind) {
    case "lobby":
      return lobbyScreen(context);
    case "placement":
      return placementScreen(context, requireRoom(room).game.settings);
    case "waiting":
      return waitingScreen(context);
    case "battle":
      return battleScreen(context);
  }
}

function lobbyScreen({ commands, preferences }: ScreenContext): ScreenView {
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

function placementScreen(context: ScreenContext, settings: GameSettings): ScreenView {
  const { commands, preferences } = context;
  const card = createRoomCard(context.copy);
  const saveLayout = (ships: readonly ShipPlacementDto[]) => preferences.saveLayout(settings.fleetPreset, ships);
  const placement = createPlacement({
    initial: initialFleet(context, settings),
    random: context.random,
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
function initialFleet({ preferences, random }: ScreenContext, settings: GameSettings): FleetEditor {
  const remembered = preferences.loadLayout(settings.fleetPreset);

  return (
    (remembered && FleetEditor.fromPlacements(settings, remembered.map(fromPlacementDto))) ??
    FleetEditor.random(settings, random)
  );
}

function waitingScreen(context: ScreenContext): ScreenView {
  const card = createRoomCard(context.copy);
  const boardSlot = h("div", { class: "board-slot" });

  return screenView(h("div", { class: "screen" }, card.element, boardSlot), (next) => {
    const room = requireRoom(next.room);

    card.update(room);
    boardSlot.replaceChildren(
      renderBoard(ownWatersModel(room.game), { label: battleText.ownWaters, onFire: () => undefined }),
    );
  });
}

function battleScreen({ commands, now, schedule }: ScreenContext): ScreenView {
  const battle = createBattle({
    now,
    schedule,
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

/** The screens that are built for a room are only ever asked for when there is one. */
function requireRoom(room: RoomViewDto | undefined): RoomViewDto {
  if (room === undefined) {
    throw new Error("This screen needs a room, but there is none.");
  }
  return room;
}
