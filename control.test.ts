import { assertExists, assertStrictEquals, assertThrowsAsync } from 'https://deno.land/std@0.112.0/testing/asserts.ts';

import { once, retry, sleep } from './control.ts';
import { fetchThrow500, readBody } from './http.ts';

Deno.test('once', () => {
  let value = 0;
  const incr = () => ++value;
  assertStrictEquals(once(incr)(), 1);
  assertStrictEquals(once(incr)(), 1);
  assertStrictEquals(incr(), 2);
  assertStrictEquals(once(incr)(), 1);
});

Deno.test('retry', async () => {
  assertExists(await retry(fetchThrow500)('https://httpstat.us/200').then(readBody));
  await assertThrowsAsync(() => retry(fetchThrow500)('https://httpstat.us/500'));
});

Deno.test('sleep', async () => {
  const start = Date.now();
  await sleep(100);
  const stop = Date.now();
  assertStrictEquals(stop - start > 90, true);
  let state = 0;
  const sleepyFunction = (number: number) => {
    state = number;
    return number + 1;
  };
  const sleepyPromise = sleep(10, sleepyFunction, 1);
  assertStrictEquals(state, 0);
  assertStrictEquals(await sleepyPromise, 2);
  assertStrictEquals(state, 1);
});
