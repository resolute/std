import { strict, throws } from './deps.test.ts';

import { keeper } from './promise.ts';
import { sleep } from './control.ts';

/**
 * Mimic an expensive or time intensive function.
 */
const expensive = (duration = 10, state = 0) => async () => {
  ++state;
  await sleep(duration);
  return state;
};

Deno.test('keeper', async () => {
  const kept = keeper(expensive());
  // newly initialized should not contain any stale data
  throws(kept.stale);
  // since cache is stale, .get() will invoke the function
  strict(await kept.get(), 1);
  // result will be red from cache
  strict(await kept.get(), 1);
  // force a refresh
  const secondInvocation = kept.fresh();
  // read the stale cache while the refresh invocation resolves
  strict(kept.stale(), 1);
  // .get() will wait for the pending promise to resolve
  strict(await kept.get(), 2);
  // confirm the fresh promise is also the same
  strict(await secondInvocation, 2);
  // confirm the cache is updated
  strict(kept.stale(), 2);
  // stack two fresh() calls
  const thirdInvocation = kept.fresh();
  const fourthInvocation = kept.fresh();
  // retrieve what is in the cache
  strict(kept.stale(), 2);
  // .get() will attach to the latest invocation
  strict(await kept.get(), 4);
  // the 3rd invocation will still resolve to 3
  strict(await thirdInvocation, 3);
  // and the 4th invocation resolves to 4
  strict(await fourthInvocation, 4);
});

Deno.test('keeper + interval', async () => {
  const kept = keeper(expensive());
  strict(await kept.get(), 1);
  kept.start(100);
  await sleep(400); // 300 would be exact, but trying to avoid premature test fails
  strict(kept.stale() >= 3, true);
  kept.stop();
  await sleep(100);
  strict(kept.stale() >= 3, true);
});
