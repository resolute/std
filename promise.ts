export interface Keeper<R> {
  fresh: () => Promise<R>;
  get: () => Promise<R>;
  stale: () => R;
  start: (timeout?: number) => undefined;
  stop: () => void;
}

const empty = Symbol('Empty');

const storage = new WeakMap<() => Promise<unknown>, unknown>();

/**
 * Promise Keeper: caching for promises.
 *
 * Provides caching behavior to an expensive function. Can perform periodic
 * background refresh.
 *
 * The purpose of this module is to minimize waiting for time intensive
 * functions to complete. This can also be used to provide a
 * stale-while-revalidate pattern.
 *
 * Terminology
 * * **settled**: the last returned value of the expensive function, when it is
 *   a promise, then that promise has already settled.
 * * **pending**: the latest returned value of the expensive function, when it
 *   is a promise, it has not settled yet.
 *
 * Possible States:
 * | state   | cache | promise |
 * | ------: | ----: | ------: |
 * | empty   |   ❌   |    ❌    |
 * | pending |   ❌   |    ✅    |
 * | fresh   |   ✅   |    ❌    |
 * | stale   |   ✅   |    ✅    |
 */

const keep = <R>(fn: () => Promise<R>) => {
  let settled: R | typeof empty = empty;
  let pending: Promise<R> | typeof empty = empty;
  let timeout: number | undefined;

  const invoke = () => fn().then((data) => {
    settled = data;
    pending = empty;
    return data;
  });

  const fresh = () => {
    if (pending !== empty) {
      // If we already have an unsettled promise, then chain this invocation.
      pending = pending.then(invoke);
    } else {
      pending = invoke();
    }
    return pending;
  };

  const get = () => {
    if (pending !== empty) {
      return pending;
    }
    if (settled !== empty) {
      return Promise.resolve(settled);
    }
    return fresh();
  };

  const stale = () => {
    if (settled !== empty) {
      return settled;
    }
    throw new Error('No settled data available.');
  };

  /**
   * Terminate any keepFresh() intervals.
   */
  const stop = () => {
    if (timeout) {
      clearTimeout(timeout as number);
      timeout = undefined;
    }
  };

  /**
   * Refresh cache on a given interval.
   * @param delay milliseconds to keep refreshing data
   */
  const start = (delay = 1000 * 60 * 60 * 30) => {
    stop();
    timeout = setInterval(fresh, delay) as unknown as number;
    // @ts-ignore Node.js context, unref the timer
    timeout.unref?.();
  };
  return {
    fresh, get, stale, start, stop,
  };
};

export const keeper = <R>(fn: () => Promise<R>) => {
  if (!storage.has(fn)) {
    storage.set(fn, keep(fn));
  }
  return storage.get(fn) as Keeper<R>;
};
