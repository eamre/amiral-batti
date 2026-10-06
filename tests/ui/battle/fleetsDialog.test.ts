// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createFleetsDialog } from "../../../src/ui/battle/fleetsDialog";
import { gameView } from "../fixtures";

const revealed = [{ cells: [{ row: 2, column: 2 }, { row: 2, column: 3 }], quarterTurns: 0 }];
const over = (changes = {}) => gameView({ phase: "finished", revealedEnemyShips: revealed, ...changes });

function fleetsDialog(game = over()) {
  const view = createFleetsDialog();
  view.update(game);
  const find = (role: string) => view.element.querySelector<HTMLElement>(`[data-role=${role}]`);
  const dialog = () => find("fleets-dialog") as HTMLDialogElement;

  return { view, find, dialog, boards: () => [...view.element.querySelectorAll(".board")] };
}

describe("createFleetsDialog", () => {
  it("offers a button once the game is over and the fleet is known", () => {
    const { view, find } = fleetsDialog();

    expect(view.element.hidden).toBe(false);
    expect(find("fleets-open")?.textContent).toBe("Filoları göster");
  });

  it("offers nothing while the battle goes on", () => {
    expect(fleetsDialog(gameView()).view.element.hidden).toBe(true);
  });

  it("offers nothing during the battle even if a fleet were sent along", () => {
    expect(fleetsDialog(over({ phase: "battle" })).view.element.hidden).toBe(true);
  });

  it("offers nothing when the server did not reveal a fleet", () => {
    expect(fleetsDialog(over({ revealedEnemyShips: [] })).view.element.hidden).toBe(true);
  });

  it("opens a modal dialog when the button is pressed", () => {
    const { find, dialog } = fleetsDialog();

    expect(dialog().open).toBe(false);
    find("fleets-open")?.click();
    expect(dialog().open).toBe(true);
  });

  it("opens it as a modal, so the page behind it cannot be pressed", () => {
    const { find } = fleetsDialog();
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");

    find("fleets-open")?.click();

    expect(showModal).toHaveBeenCalledOnce();
    showModal.mockRestore();
  });

  it("shows the own fleet and the fleet of the opponent, each with a name", () => {
    const { boards } = fleetsDialog();

    expect(boards().map((board) => board.getAttribute("aria-label"))).toEqual(["Senin filon", "Rakibin filosu"]);
  });

  it("gives every board a slot of its own, so the boards can share the height of a phone", () => {
    const { view } = fleetsDialog();

    expect(view.element.querySelectorAll(".fleets__board > .fleets__slot > .board").length).toBe(2);
  });

  it("draws the ships that were never found on the board of the opponent", () => {
    const { boards } = fleetsDialog();

    expect(boards()[1]?.querySelectorAll(".ship:not(.ship--sunk)").length).toBe(1);
  });

  it("closes with its own button", () => {
    const { find, dialog } = fleetsDialog();

    find("fleets-open")?.click();
    find("fleets-close")?.click();
    expect(dialog().open).toBe(false);
  });

  it("closes and hides when the next game begins", () => {
    const { view, find, dialog } = fleetsDialog();

    find("fleets-open")?.click();
    view.update(gameView({ phase: "placing" }));

    expect(dialog().open).toBe(false);
    expect(view.element.hidden).toBe(true);
  });

  it("stays open when the room changes in a way that does not matter to it", () => {
    const { view, find, dialog } = fleetsDialog();

    find("fleets-open")?.click();
    view.update(over());

    expect(dialog().open).toBe(true);
  });
});
