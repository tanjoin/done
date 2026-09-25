const MAX_RATE_LIMIT_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 250;
const MAX_RETRY_DELAY_MS = 30_000;
const RATE_LIMIT_REASONS = new Set([
  'backendError',
  'dailyLimitExceeded',
  'quotaExceeded',
  'rateLimitExceeded',
  'sharingRateLimitExceeded',
  'userRateLimitExceeded',
]);

type GoogleErrorPayload = {
  error?: {
    reason?: unknown;
    errors?: Array<{reason?: unknown}>;
  };
  reason?: unknown;
};

function collectReasons(payload: GoogleErrorPayload): string[] {
  const reasons: string[] = [];
  const topLevelReason = payload.reason;
  const errorReason = payload.error?.reason;
  if (typeof topLevelReason === 'string') reasons.push(topLevelReason);
  if (typeof errorReason === 'string') reasons.push(errorReason);
  for (const error of payload.error?.errors || []) {
    if (typeof error.reason === 'string') reasons.push(error.reason);
  }
  return reasons;
}

async function hasRateLimitReason(response: Response): Promise<boolean> {
  if (response.status === 429) return true;
  if (response.status !== 403) return false;

  try {
    const payload = (await response.clone().json()) as GoogleErrorPayload;
    return collectReasons(payload).some(reason =>
      RATE_LIMIT_REASONS.has(reason),
    );
  } catch {
    return false;
  }
}

function getRetryAfterMs(response: Response): number | null {
  const value = response.headers.get('Retry-After');
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  }

  const retryAt = Date.parse(value);
  if (!Number.isNaN(retryAt)) {
    return Math.min(Math.max(0, retryAt - Date.now()), MAX_RETRY_DELAY_MS);
  }
  return null;
}

function getBackoffDelayMs(attempt: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithDriveRateLimitRetry(
  request: () => Promise<Response>,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await request();
    if (
      !(await hasRateLimitReason(response)) ||
      attempt >= MAX_RATE_LIMIT_RETRIES
    ) {
      return response;
    }

    await wait(getRetryAfterMs(response) ?? getBackoffDelayMs(attempt));
  }
}
