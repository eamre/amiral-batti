export function secondsLeft(
  turnStartedAt: number,
  now: number,
  limitSeconds: number,
): number {
  const elapsedMilliseconds = now - turnStartedAt;
  const leftMilliseconds = limitSeconds * 1000 - elapsedMilliseconds;

  return Math.max(0, Math.ceil(leftMilliseconds / 1000));
}

export function hasTurnExpired(
  turnStartedAt: number,
  now: number,
  limitSeconds: number,
): boolean {
  return secondsLeft(turnStartedAt, now, limitSeconds) === 0;
}
