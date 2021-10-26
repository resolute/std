import {
  assert,
  assertStrictEquals,
  assertThrowsAsync,
} from 'https://deno.land/std@0.112.0/testing/asserts.ts';

import { once, retry, sleep } from './control.ts';

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
