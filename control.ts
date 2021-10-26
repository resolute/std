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

const onceCache = new WeakMap<(...args: unknown[]) => unknown, unknown>();

/**
 * Wrap a function that to be executed once. Subsequent calls will return the
 * value of the first (and only) invocation.
 * @example
 * ```ts
 * import { once } from './once.ts';
 * let value = 0;
 * const incr = () => ++value;
 * once(incr)(); // 1
 * once(incr)(); // 1
 * incr(); // 2
 * once(incr)(); // 1
 * ```
 */
export const once = <T extends (...args: unknown[]) => void>(fn: T) =>
  (...args: Parameters<T>) => {
    if (!onceCache.has(fn)) {
      const result = fn(...args);
      onceCache.set(fn, result);
    }
    return onceCache.get(fn) as ReturnType<T>;
  };

/**
 * Promisify `setTimeout`. Returns a Promise that settles with the return of the
 * passed function after `delay` milliseconds.
 *
 * @param delay milliseconds.
 * @param fn async or Promise-returning delayed function.
 * @param args optional params to be passed to delayed function.
 */
export const sleep = <P extends unknown[], R>(
  delay = 0,
  fn = ((() => {}) as (...args: P) => R),
  ...args: P
) => {
  const [promise, resolve] = defer<R>();
  setTimeout(() => resolve(fn(...args)), delay);
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

/**
 * Wrap an async or promise-returning function that when called will retry up to
 * `retries` times or until it resolves, whichever comes first.
 * @param fn Promise-returning function that will be retried
 * @param options
 * @param options.retries limit of retries allowed. Default: 3
 * @param options.delay how long to wait before retrying. Default: exponential
 * backoff with random jitter
 * @param options.retryOn function called after each failure. Default: throw if
 * attempt + 1 > retries
 */
export const retry = <P extends unknown[], R>(
  fn: (...args: P) => Promise<R>,
  options: Partial<typeof retryDefaults> = {},
) => {
  const { retries, delay, retryOn } = { ...retryDefaults, ...options };
  let attempt = 0;
  const retry = async (...args: P): Promise<R> => {
    try {
      attempt += 1;
      const result = await fn(...args);
      return result;
    } catch (error) {
      await retryOn(error as Error, attempt, retries);
      return sleep(delay(attempt), retry, ...args);
    }
  };
  return retry;
};
