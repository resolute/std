import { defined as _defined, is } from './coerce.ts';

/**
 * LimitReached extends RangeError and can be used to identify when an
 * AsyncIterator consumer limit was reached.
 */
export class LimitReached extends RangeError {
  constructor(...args: ConstructorParameters<typeof RangeError>) {
    super(...args);
    this.name = 'LimitReached';
    // @ts-ignore tsc barks at Error.captureStackTrace, but this is safe
    if (Error.captureStackTrace) {
      // @ts-ignore tsc barks at Error.captureStackTrace, but this is safe
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export type AsyncIterableType<T> = T extends AsyncIterable<infer U> ? U : never;

/**
 * Collect all of the `yield`ed values of an AsyncIterable.
 * @param asyncIterable
 * @returns array of all `yield`ed items of an AsyncIterable
 */
export async function all<T extends AsyncIterable<any>>(asyncIterable: T) {
  const array: AsyncIterableType<T>[] = [];
  for await (const item of asyncIterable) {
    array.push(item);
  }
  return await Promise.all(array);
}

/**
 * Limits the number of items in an AsyncIterable. Optionally will `.abort()` an
 * AbortController if provided.
 * @param limit
 * @param controller
 */
export function limit(limit = Infinity, controller?: AbortController) {
  return async function* limiter<T extends AsyncIterable<any>>(asyncIterable: T) {
    let count = 0;
    if (limit === 0) {
      return;
    }
    for await (const item of asyncIterable) {
      yield item as AsyncIterableType<T>;
      count++;
      if (count >= limit) {
        controller?.abort(new LimitReached(`Limit of ${limit} reached.`));
        break;
      }
    }
  };
}

/**
 * Filters null/undefined values from an AsyncIterable
 * @param iterable
 * @yields values that are not null/undefined
 */
export async function* defined<T>(iterable: AsyncIterable<T> | ReadableStream<T>) {
  for await (const item of iterable) {
    const result = await item;
    if (is(_defined)(result)) {
      yield result as NonNullable<Awaited<T>>;
    }
  }
}

/**
 * Yields only unique values of an iterable.
 * @param makeUniqueKey function that creates a unique string representation of each item
 * @param db optionally, pass in an object that will be used as the unique test database.
 * @returns an AsyncGenerator that will only yield unique values
 */
export function unique<T>(makeUniqueKey: (input: T) => string, db: Record<string, T[]> = {}) {
  return async function* uniquer<G extends AsyncIterable<T>>(gen: G) {
    for await (const item of gen) {
      const key = makeUniqueKey(item);
      if (db[key]) {
        // // TODO: we shouldn't throw, but we should log that this generator emitted a duplicate
        // console.warn(`⚠️ Duplicate item found for key: ${key}`);
        db[key].push(item);
        continue;
      } else {
        db[key] = [item];
        yield item as AsyncIterableType<G>;
      }
    }
  };
}

/**
 * [Async]Iterable → Stream.
 *
 * Allows specifying the strategy of the ReadableStream, especially the
 * `highWaterMark` which allows the iterator to “read ahead.” This is in
 * contrast to the default iterator protocol, which only invokes the `next()`
 * method when it is called.
 *
 * This has been adapted from Deno’s standard library
 * streams/readable_stream_from_iterable.ts
 */
export function stream<T>(
  iterable: Iterable<T> | AsyncIterable<T>,
  strategy?: QueuingStrategy<T>,
): ReadableStream<T> {
  const iterator: Iterator<T> | AsyncIterator<T> =
    (iterable as AsyncIterable<T>)[Symbol.asyncIterator]?.() ??
      (iterable as Iterable<T>)[Symbol.iterator]?.();
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    async cancel(reason) {
      if (typeof iterator.throw === 'function') {
        try {
          await iterator.throw(reason);
        } catch {
          // `iterator.throw()` always throws on site, ignore it here.
        }
      }
    },
  }, strategy);
}

/**
 * ( [Async]Iterable + async function ) → ( ReadableStream + TransformStream )
 * TODO: this would be kind of cool: if we could pass an AsyncGenerator as the
 * `transform` function, but this runs into the double for loop issue.
 * @param iterable [Async]Iterable input
 * @param transform async transform function
 * @param strategy backpressure
 * @returns ReadableStream of Promises
 */
export function transform<Input, Output>(
  iterable: Iterable<Input> | AsyncIterable<Input>,
  transform: (input: Input) => Promise<Output>,
  strategy?: QueuingStrategy,
) {
  return stream(iterable, strategy)
    .pipeThrough(
      new TransformStream<Input, Promise<Output>>(
        {
          transform(input, controller) {
            controller.enqueue(transform(input));
          },
        },
        strategy,
        strategy,
      ),
    );
}
