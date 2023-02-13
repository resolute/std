// @ts-ignore tsc non-sense
import { randomIntInclusive } from './math.ts';

/**
 * Create and return a new promise along with its resolve and reject parameters.
 */
export const defer = <T>() => {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  // @ts-ignore resolve/reject assigned in Promise body
  return [promise, resolve, reject] as const;
};

const onceCache = /* @__PURE__ */ new WeakMap<(...args: any[]) => any, any>();

/**
 * Wrap a function that to be executed once. Subsequent calls will return the
 * value of the first (and only) invocation.
 * @example
 * ```ts
 * import { once } from '@resolute/std/control';
 * let value = 0;
 * const incr = () => ++value;
 * once(incr)(); // 1
 * once(incr)(); // 1
 * incr(); // 2
 * once(incr)(); // 1
 * ```
 */
export const once = <T extends (...args: any[]) => any>(fn: T) =>
  ((...args: Parameters<T>) => {
    if (!onceCache.has(fn)) {
      const result = fn(...args);
      onceCache.set(fn, result);
    }
    return onceCache.get(fn);
  }) as T;

const parseSleepArgs = <T extends (...args: any[]) => any>(
  input: readonly [
    (AbortSignal | T | undefined)?,
    (T | Parameters<T>[0] | undefined)?,
    ...(Parameters<T>[0] | Parameters<T>[1])[],
  ],
) => {
  let signal: AbortSignal | undefined;
  let fn: T = (() => {}) as T;
  let args = [] as [...Parameters<T>][];
  let cursor = 0;
  if (input[cursor] instanceof AbortSignal) {
    signal = input[cursor] as AbortSignal;
    cursor++;
  }
  if (typeof input[cursor] === 'function') {
    fn = input[cursor] as T;
    cursor++;
  } else if (typeof input[cursor + 1] === 'function') {
    fn = input[cursor + 1] as T;
    cursor += 2;
  }
  if (cursor <= input.length) {
    args = input.slice(cursor) as Parameters<T>;
  }
  return [signal, fn, args] as const;
};

/**
 * Promisify `setTimeout`. Returns a Promise that settles with the return of the
 * passed function after `delay` milliseconds.
 *
 * @param delay milliseconds.
 * @param signal optional AbortSignal
 * @param fn async or Promise-returning delayed function.
 * @param args optional params to be passed to delayed function.
 */
// deno-fmt-ignore
interface Sleep {
  <T extends (...args: any[]) => any>(delay: number, fn?: T, ...args: Parameters<T>): Promise<ReturnType<T>>;
  <T extends (...args: any[]) => any>(delay: number, signal?: AbortSignal, fn?: T, ...args: Parameters<T>): Promise<ReturnType<T>>;
}
export const sleep: Sleep = (delay = 0, ...input) => {
  const [signal, fn, args] = parseSleepArgs(input);
  const [promise, resolve, reject] = defer();
  if (signal) {
    if (signal?.aborted) {
      reject(signal.reason);
      return promise;
    }
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  }
  const timer = setTimeout(() => resolve(fn(...args)), delay);
  return promise;
};

/**
 * Exponential backoff with random jitter.
 *
 * Table of 5 runs
 *
 * | run | min  | max  | ex   |
 * | --: | ---: | ---: | ---: |
 * | 1   |  100 |  200 | 103  |
 * | 2   |  200 |  400 | 242  |
 * | 3   |  400 |  800 | 748  |
 * | 4   |  800 | 1600 | 1560 |
 * | 5   | 1600 | 3200 | 1696 |
 */
const delay = (attempt: number) => randomIntInclusive(100, 200) * (2 ** (attempt - 1));

/**
 * Logic that decides whether to perform a retry or not. To stop retrying,
 * `throw` the passed error or your own. To continue retrying, `return` _any_
 * value. Returning a Promise is also supported and the decision will wait
 * until it settles.
 * @param error the Error causing the retry
 * @param attempt number that just failed, starts at 1
 * @param retries limit passed in from the options
 */
const retryOn = (error: Error, attempt: number, retries: number): void | Promise<void> => {
  if (attempt + 1 > retries) {
    throw error;
  }
};

const retryDefaults = { retries: 3, delay, retryOn };

export type RetryOptions = Partial<typeof retryDefaults & { signal: AbortSignal }>;

/**
 * Wrap an async or promise-returning function that when called will retry up to
 * `retries` times or until it resolves, whichever comes first.
 * @param fn Promise-returning function that will be retried
 * @param options
 * @param options.signal optional AbortSignal
 * @param options.retries limit of retries allowed. Default: 3
 * @param options.delay how long to wait before retrying. Default: exponential
 * backoff with random jitter
 * @param options.retryOn function called after each failure. Default: throw if
 * attempt + 1 > retries
 */
export const retry = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {},
) => {
  const { signal, retries, delay, retryOn } = { ...retryDefaults, ...options };
  let attempt = 0;
  const retry = (async (...args: Parameters<T>) => {
    try {
      attempt += 1;
      const result = await fn(...args);
      return result;
    } catch (error) {
      await retryOn(error as Error, attempt, retries);
      // console.log(signal);
      return sleep(delay(attempt), signal, retry, ...args);
    }
  }) as T;
  return retry;
};

/**
 * Returns a function, that, as long as it continues to be invoked (.), will not
 * be triggered (*). The function will be called after it stops being called for
 * `threshold` milliseconds.
 *
 *       /-- 10s --\ /-- 10s --\ /-- 10s --\
 *      . . . . . . . . . . . . .           *
 *
 * @param   fn          Function to be throttled
 * @param   threshold   Milliseconds fn will be throttled
 * @return  Debounced wrapped `fn`
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  threshold: number,
  signal?: AbortSignal,
) => {
  let timeout = 0;
  const clearTimer = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
  };
  return ((...args: Parameters<T>) => {
    clearTimer();
    if (signal) {
      if (signal.aborted) {
        return;
      }
      signal.addEventListener('abort', clearTimer);
    }
    timeout = setTimeout(() => {
      timeout = 0;
      fn(...args);
    }, threshold) as unknown as number;
  }) as T;
};

export type ThrottledFunction<T extends (...args: any[]) => any> = T & {
  abort: AbortController['abort'];
};

/**
 * Limit the number of invocations of a given function (or different functions)
 * within an interval window. Useful for avoiding API rate limits.
 * @param limit invocations within given interval
 * @param interval milliseconds
 * @returns wrapped throttled function
 */
export const throttle = (limit: number, interval: number) => {
  const queue = new Map<number, (reason?: unknown) => void>();
  let currentTick = 0;
  let activeCount = 0;
  const getDelay = () => {
    const now = Date.now();
    if ((now - currentTick) > interval) {
      activeCount = 1;
      currentTick = now;
      return 0;
    }
    if (activeCount < limit) {
      activeCount++;
    } else {
      currentTick += interval;
      activeCount = 1;
    }
    return currentTick - now;
  };
  return <T extends (...args: any[]) => any>(fn: T) => {
    const controller = new AbortController();
    const { signal } = controller;
    signal.addEventListener('abort', () => {
      for (const [timeout, reject] of queue.entries()) {
        clearTimeout(timeout);
        reject(signal.reason);
      }
      queue.clear();
    });
    const throttled = ((...args: any[]) => {
      const [promise, resolve, reject] = defer<ReturnType<T>>();
      const execute = () => {
        resolve(fn(...args));
        queue.delete(timeout);
      };
      const timeout = setTimeout(execute, getDelay()) as unknown as number;
      queue.set(timeout, reject);
      return promise as ReturnType<T>;
    }) as ThrottledFunction<T>;
    throttled.abort = controller.abort.bind(controller);
    return throttled;
  };
};
