import { createHmac } from "node:crypto";

export const LOGIN_WINDOW_MS = 15 * 60 * 1_000;
export const LOGIN_BLOCK_MS = 15 * 60 * 1_000;
export const LOGIN_MAX_FAILURES = 5;

export interface LoginAttemptState {
  failures: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
}

export function loginDimensionHash(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function isLoginBlocked(
  state: LoginAttemptState | null,
  now: Date,
): boolean {
  return Boolean(state?.blockedUntil && state.blockedUntil.getTime() > now.getTime());
}

export function nextLoginFailure(
  current: LoginAttemptState | null,
  now: Date,
): LoginAttemptState {
  const currentWindowExpired =
    !current ||
    current.windowStartedAt.getTime() + LOGIN_WINDOW_MS <= now.getTime();
  const currentBlockExpired = Boolean(
    current?.blockedUntil && current.blockedUntil.getTime() <= now.getTime(),
  );

  if (!current || currentWindowExpired || currentBlockExpired) {
    return {
      failures: 1,
      windowStartedAt: now,
      blockedUntil: null,
    };
  }

  const failures = current.failures + 1;

  return {
    failures,
    windowStartedAt: current.windowStartedAt,
    blockedUntil:
      failures >= LOGIN_MAX_FAILURES
        ? new Date(now.getTime() + LOGIN_BLOCK_MS)
        : current.blockedUntil,
  };
}
