import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchWithDriveRateLimitRetry} from '../src/google-drive-retry';

void test('Drive の429は成功するまで再試行する', async () => {
  let attempts = 0;
  const response = await fetchWithDriveRateLimitRetry(async () => {
    attempts++;
    return attempts === 1
      ? new Response('{}', {status: 429, headers: {'Retry-After': '0'}})
      : new Response('{"ok":true}', {status: 200});
  });

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
});

void test('レート制限理由を持つ403は再試行する', async () => {
  let attempts = 0;
  const response = await fetchWithDriveRateLimitRetry(async () => {
    attempts++;
    return attempts === 1
      ? new Response(
          JSON.stringify({
            error: {errors: [{reason: 'userRateLimitExceeded'}]},
          }),
          {status: 403, headers: {'Retry-After': '0'}},
        )
      : new Response('{"ok":true}', {status: 200});
  });

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
});

void test('認証系403は再試行しない', async () => {
  let attempts = 0;
  const response = await fetchWithDriveRateLimitRetry(async () => {
    attempts++;
    return new Response(
      JSON.stringify({error: {errors: [{reason: 'insufficientPermissions'}]}}),
      {status: 403},
    );
  });

  assert.equal(response.status, 403);
  assert.equal(attempts, 1);
});

void test('Retry-Afterの秒数を指数バックオフより優先する', async () => {
  const delays: number[] = [];
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((
    callback: (...args: never[]) => void,
    delay?: number,
  ) => {
    delays.push(delay || 0);
    return originalSetTimeout(callback, 0);
  }) as unknown as typeof setTimeout;

  try {
    let attempts = 0;
    await fetchWithDriveRateLimitRetry(async () => {
      attempts++;
      return attempts === 1
        ? new Response('{}', {status: 429, headers: {'Retry-After': '0'}})
        : new Response('{"ok":true}', {status: 200});
    });
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }

  assert.deepEqual(delays, [0]);
});
