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

export const properName = coerce(string, spaces, trim, quotes, proper, nonempty, limit(100));

export const cleanEmail = coerce(string, email, limit(100));

export const cleanPhone = coerce(string, prettyPhone);

/**
 * Type guard against any tuples containing `undefined` or `null`.
 */
export type MapNonNullable<T> = { [K in keyof T]: NonNullable<T[K]> };
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
export const mapObject = <T extends { [k: string]: keyof U }, U>(a: T, b: U) =>
  Object.fromEntries(
    Object.entries(a)
      .map(([aKey, aVal]) => [aKey, b[aVal]] as const)
      .filter(isDefinedTuple),
  );
