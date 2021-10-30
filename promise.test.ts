import { assertStrictEquals, assertThrows } from 'https://deno.land/std@0.112.0/testing/asserts.ts';

import { keeper } from './promise.ts';
import { sleep } from './control.ts';

/**
 * Mimic an expensive or time intensive function.
 */
const expensive = (duration = 10, state = 0) =>
  async () => {
    ++state;
    await sleep(duration);
    return state;
  };

Deno.test('keeper', async () => {
  const kept = keeper(expensive());
  // newly initialized should not contain any stale data
  assertThrows(kept.stale);
  // since cache is stale, .get() will invoke the function
  assertStrictEquals(await kept.get(), 1);
  // result will be red from cache
  assertStrictEquals(await kept.get(), 1);
  // force a refresh
  const secondInvocation = kept.fresh();
  // read the stale cache while the refresh invocation resolves
  assertStrictEquals(kept.stale(), 1);
  // .get() will wait for the pending promise to resolve
  assertStrictEquals(await kept.get(), 2);
  // confirm the fresh promise is also the same
  assertStrictEquals(await secondInvocation, 2);
  // confirm the cache is updated
  assertStrictEquals(kept.stale(), 2);
  // stack two fresh() calls
  const thirdInvocation = kept.fresh();
  const fourthInvocation = kept.fresh();
  // retrieve what is in the cache
  assertStrictEquals(kept.stale(), 2);
  // .get() will attach to the latest invocation
  assertStrictEquals(await kept.get(), 4);
  // the 3rd invocation will still resolve to 3
  assertStrictEquals(await thirdInvocation, 3);
  // and the 4th invocation resolves to 4
  assertStrictEquals(await fourthInvocation, 4);
});

Deno.test('keeper + interval', async () => {
  const kept = keeper(expensive());
  assertStrictEquals(await kept.get(), 1);
  kept.start(100);
  await sleep(350);
  assertStrictEquals(kept.stale() >= 3, true);
  kept.stop();
  await sleep(100);
  assertStrictEquals(kept.stale() >= 3, true);
});
