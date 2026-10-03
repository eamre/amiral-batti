/** The clock turns red when this many seconds are left. */
const URGENT_SECONDS = 5;

/**
 * The server says how many seconds are left only when something happens, not every second.
 * Between two messages the browser counts down itself, from the moment the message came.
 * A second stays on the clock until it has fully passed, as on a kitchen timer.
 */
export function secondsShown(
  secondsLeft: number | undefined,
  receivedAt: number,
  now: number,
): number | undefined {
  if (secondsLeft === undefined) {
    return undefined;
  }
  const passed = (now - receivedAt) / 1000;

  return Math.max(0, Math.ceil(secondsLeft - passed));
}

export function isUrgent(seconds: number): boolean {
  return seconds <= URGENT_SECONDS;
}
