import {
  coerce,
  email,
  isDefined,
  limit,
  nonempty,
  prettyPhone,
  proper,
  quotes,
  spaces,
  string,
  trim,
  // @ts-ignore tsc non-sense
} from './coerce.ts';

export type MapNonNullable<T> = { [K in keyof T]: NonNullable<T[K]> };

export type MapObject<A, B> = {
  [K in keyof A as A[K] extends keyof B ? K : never]: A[K] extends keyof B ? B[A[K]]
    : never;
};

export const properName = coerce(string, spaces, trim, quotes, proper, nonempty, limit(100));

export const cleanEmail = coerce(string, email, limit(100));

export const cleanPhone = coerce(string, prettyPhone);

/**
 * Type guard against any tuples containing `undefined` or `null`.
 */
// deno-lint-ignore no-explicit-any
export const isDefinedTuple = <T extends readonly any[]>(
  tuple: T,
): tuple is MapNonNullable<T> => tuple.every(isDefined);

/**
 * Match the keys of `a` to the values of `b` by matching the values of `a` to
 * the keys of `b` and eliminate undefined/null values.
 *
 * @example
 * const a = { foo: 'a', bar: 'b', baz: 'c' };
 * const b = { a: 1, b: 2 };
 * mapObject(a, b); // { foo: 1, bar: 2 }
 */
export const mapObject = <A, B>(
  a: A,
  b: B,
): MapObject<A, B> =>
  Object.fromEntries(
    Object.entries(a)
      // @ts-ignore too much fighting with Object.*entries()
      .map(([aKey, aVal]) => [aKey, b[aVal]])
      .filter(isDefinedTuple),
  );
