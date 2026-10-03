import { TURN_SECONDS } from "./constants";

export function secondsLeft(
  turnStartedAt: number,
  now: number,
  limitSeconds: number = TURN_SECONDS,
): number {
  const elapsedMilliseconds = now - turnStartedAt;
  const leftMilliseconds = limitSeconds * 1000 - elapsedMilliseconds;

  return Math.max(0, Math.ceil(leftMilliseconds / 1000));
}

export function hasTurnExpired(
  turnStartedAt: number,
  now: number,
  limitSeconds: number = TURN_SECONDS,
): boolean {
  return secondsLeft(turnStartedAt, now, limitSeconds) === 0;
}
