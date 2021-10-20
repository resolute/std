import test from 'ava';
import 'isomorphic-fetch';
import { once, retry, sleep } from './control';
import { fetchThrow500 } from './http';

test('once', (t) => {
  let value = 0;
  const incr = () => ++value;
  t.is(once(incr)(), 1);
  t.is(once(incr)(), 1);
  t.is(incr(), 2);
  t.is(once(incr)(), 1);
});

test('retry', async (t) => {
  await t.notThrowsAsync(() => retry(fetchThrow500)('https://httpstat.us/200'));
  await t.throwsAsync(() => retry(fetchThrow500)('https://httpstat.us/500'));
});

test('sleep', async (t) => {
  const start = performance.now();
  await sleep(100);
  const stop = performance.now();
  t.true(stop - start > 90);
  let state = 0;
  const sleepyFunction = (number: number) => {
    state = number;
    return number + 1;
  };
  const sleepyPromise = sleep(10, sleepyFunction, 1);
  t.is(state, 0);
  t.is(await sleepyPromise, 2);
  t.is(state, 1);
});
