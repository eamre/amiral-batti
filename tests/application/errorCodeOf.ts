import { GameRuleError } from "../../src/application/GameRuleError";

/** Runs the action and returns the code of the GameRuleError it throws. */
export function errorCodeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof GameRuleError ? error.code : "not a GameRuleError";
  }
  return undefined;
}
