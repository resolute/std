import test from 'ava';
import { keeper } from './promise';
import { sleep } from './control';

/**
 * Mimic an expensive or time intensive function.
 */
const expensive = (duration = 10, state = 0) => async () => {
  // eslint-disable-next-line no-param-reassign
  ++state;
  await sleep(duration);
  return state;
};

test('keeper', async (t) => {
  const kept = keeper(expensive());
  // newly initialized should not contain any stale data
  t.throws(kept.stale);
  // since cache is stale, .get() will invoke the function
  t.is(await kept.get(), 1);
  // result will be red from cache
  t.is(await kept.get(), 1);
  // force a refresh
  const secondInvocation = kept.fresh();
  // read the stale cache while the refresh invocation resolves
  t.is(kept.stale(), 1);
  // .get() will wait for the pending promise to resolve
  t.is(await kept.get(), 2);
  // confirm the fresh promise is also the same
  t.is(await secondInvocation, 2);
  // confirm the cache is updated
  t.is(kept.stale(), 2);
  // stack two fresh() calls
  const thirdInvocation = kept.fresh();
  const fourthInvocation = kept.fresh();
  // retrieve what is in the cache
  t.is(kept.stale(), 2);
  // .get() will attach to the latest invocation
  t.is(await kept.get(), 4);
  // the 3rd invocation will still resolve to 3
  t.is(await thirdInvocation, 3);
  // and the 4th invocation resolves to 4
  t.is(await fourthInvocation, 4);
});

test('keeper + interval', async (t) => {
  const kept = keeper(expensive());
  kept.start(100);
  t.is(await kept.get(), 1);
  await sleep(350);
  t.is(kept.stale(), 4);
  kept.stop();
  await sleep(100);
  t.is(kept.stale(), 4);
});
