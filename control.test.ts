import {
  assert,
  assertStrictEquals,
  assertThrowsAsync,
} from 'https://deno.land/std@0.112.0/testing/asserts.ts';

import { debounce, once, retry, sleep, throttle } from './control.ts';

Deno.test('once', () => {
  let value = 0;
  const incr = () => ++value;
  assertStrictEquals(once(incr)(), 1);
  assertStrictEquals(once(incr)(), 1);
  assertStrictEquals(incr(), 2);
  assertStrictEquals(once(incr)(), 1);
});

const fauxFail = (passOnRun = 3) => {
  let run = 0;
  return <T>(input: T) => {
    run += 1;
    if (run >= passOnRun) {
      return Promise.resolve(input);
    }
    return Promise.reject(new Error(`Failed run # ${run}`));
  };
};

Deno.test('retry:pass', async () => {
  assertStrictEquals(await retry(fauxFail(3))('foo'), 'foo');
});

Deno.test('retry:fail', async () => {
  await assertThrowsAsync(() => retry(fauxFail(4))('foo'));
});

Deno.test('sleep', async () => {
  assert(
    await sleep(50, (then) => Date.now() - then, Date.now()) >= 50,
  );
});

Deno.test('debounce', async () => {
  let state = 0;
  const fn = (value: number) => state += value;
  const debounced = debounce(fn, 50);
  debounced(1);
  await sleep(10);
  debounced(1);
  await sleep(10);
  debounced(1);
  await sleep(50);
  assertStrictEquals(state, 1);
});

Deno.test('throttle', async () => {
  const totalRuns = 25;
  const limit = 5;
  const interval = 60;
  const start = Date.now();
  const throttled = throttle(limit, interval)(async () => {});
  const totalTime = (totalRuns * interval) / limit;
  await Promise.all(Array.from({ length: totalRuns }).fill(0).map(throttled));
  const duration = Date.now() - start;
  assert(duration > totalTime - interval);
  assert(duration < totalTime + interval);
});

Deno.test('throttle.abort', async () => {
  const limit = 1;
  const interval = 10_000;
  const start = Date.now();
  const throttled = throttle(limit, interval)(async () => {});
  await throttled();
  const promise = throttled();
  throttled.abort(new Error('Had to bail!'));
  await assertThrowsAsync(() => promise, Error, 'Had to bail!');
  assert(Date.now() - start < 100);
});
