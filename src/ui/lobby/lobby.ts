import { FLEET_PRESET_IDS, type FleetPresetId } from "../../domain/fleetPresets";
import type { RoomRulesDto } from "../../shared/protocol";
import { h } from "../dom/h";
import { fleetSummary } from "./fleetSummary";
import { lobbyText, presetName } from "./lobbyText";

const CODE_LENGTH = 4;
const NAME_LENGTH = 16;

export interface LobbyCallbacks {
  create(name: string, rules: RoomRulesDto): void;
  join(code: string, name: string): void;
}

export interface LobbyView {
  readonly element: HTMLElement;
  setOnline(online: boolean): void;
}

/**
 * The first screen: the player's name, and either a new room or the code of an existing one.
 * What the player typed lives in the fields themselves; only the choices that no field holds
 * (fleet, touching) are kept here.
 */
export function createLobby(callbacks: LobbyCallbacks, rememberedName = ""): LobbyView {
  let online = true;
  let fleetPreset: FleetPresetId = "classic";

  const nameField = h("input", {
    class: "field",
    attrs: {
      type: "text",
      placeholder: lobbyText.namePlaceholder,
      "aria-label": lobbyText.nameLabel,
      maxlength: String(NAME_LENGTH),
      autocomplete: "nickname",
      "data-role": "name",
    },
  });
  nameField.value = rememberedName;

  const summary = h("p", { class: "hint", attrs: { "data-role": "summary" } });
  const touchingHint = h("p", { class: "hint" });
  const touchingBox = h("input", {
    attrs: { type: "checkbox", "data-role": "touching" },
    on: { change: () => showTouchingHint() },
  });

  const presetButtons = FLEET_PRESET_IDS.map((id) =>
    h(
      "button",
      {
        class: "choice__option",
        attrs: { type: "button", "data-preset": id },
        on: {
          click: () => {
            fleetPreset = id;
            showChosenFleet();
          },
        },
      },
      presetName[id],
    ),
  );

  const createButton = h(
    "button",
    {
      class: "button button--primary button--block",
      attrs: { type: "button", "data-role": "create" },
      on: { click: () => callbacks.create(nameField.value.trim(), rules()) },
    },
    lobbyText.createButton,
  );

  const codeField = h("input", {
    class: "field field--code",
    attrs: {
      type: "text",
      placeholder: lobbyText.codePlaceholder,
      "aria-label": lobbyText.codePlaceholder,
      maxlength: String(CODE_LENGTH),
      autocapitalize: "characters",
      autocomplete: "off",
      "data-role": "code",
    },
    on: {
      input: () => {
        codeField.value = codeField.value.toUpperCase();
        refreshButtons();
      },
    },
  });

  const joinButton = h(
    "button",
    {
      class: "button button--block",
      attrs: { type: "button", "data-role": "join" },
      on: { click: () => callbacks.join(codeField.value, nameField.value.trim()) },
    },
    lobbyText.joinButton,
  );

  function rules(): RoomRulesDto {
    return { fleetPreset, allowTouching: touchingBox.checked };
  }

  function showChosenFleet(): void {
    for (const button of presetButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.preset === fleetPreset));
    }
    summary.textContent = lobbyText.summary(fleetSummary(fleetPreset));
  }

  function showTouchingHint(): void {
    touchingHint.textContent = lobbyText.touchingHint(touchingBox.checked);
  }

  function refreshButtons(): void {
    createButton.disabled = !online;
    joinButton.disabled = !online || codeField.value.length < CODE_LENGTH;
  }

  showChosenFleet();
  showTouchingHint();
  refreshButtons();

  const element = h(
    "div",
    { class: "screen" },
    h("section", { class: "card" }, nameField),
    h(
      "section",
      { class: "card" },
      h("h2", { class: "card__title" }, lobbyText.createTitle),
      h("div", { class: "choice" }, ...presetButtons),
      summary,
      h("label", { class: "check" }, touchingBox, lobbyText.touchingLabel),
      touchingHint,
      createButton,
    ),
    h(
      "section",
      { class: "card" },
      h("h2", { class: "card__title" }, lobbyText.joinTitle),
      codeField,
      joinButton,
      h("p", { class: "hint" }, lobbyText.joinHint),
    ),
  );

  return {
    element,
    setOnline(isOnline) {
      online = isOnline;
      refreshButtons();
    },
  };
}
