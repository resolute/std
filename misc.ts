import {
  coerce,
  defined,
  email,
  is,
  length,
  limit,
  not,
  prettyPhone,
  proper,
  quotes,
  spaces,
  string,
  trim,
  // @ts-ignore tsc non-sense
} from './coerce.ts';

export type MapNonNullable<T> = { [K in keyof T]: NonNullable<T[K]> };

export type MapKeyAValB<A, B> = {
  [K in keyof A as A[K] extends keyof B ? K : never]: A[K] extends keyof B ? B[A[K]]
    : never;
};

export type MapKeys<A, B> = {
  [K in keyof A as A[K] extends string ? A[K] : never]: K extends keyof B ? B[K] : never;
};

export const properName = /* @__PURE__ */ coerce(
  string,
  spaces,
  trim,
  quotes,
  proper,
  not(length(0)),
  limit(100),
  string,
);

export const cleanEmail = /* @__PURE__ */ coerce(string, email, limit(100), string);

export const cleanPhone = /* @__PURE__ */ coerce(string, prettyPhone);

/**
 * Type guard against any tuples containing `undefined` or `null`.
 */
// deno-lint-ignore no-explicit-any
export const isDefinedTuple = <T extends readonly any[]>(
  tuple: T,
): tuple is MapNonNullable<T> => tuple.every(is(defined));

/**
 * Match the keys of `a` to the values of `b` by matching the values of `a` to
 * the keys of `b` and eliminate undefined/null values.
 *
 * @example
 * ```ts
 * import { mapKeyAValB } from '@resolute/std/misc';
 * const a = { foo: 'a', bar: 'b', baz: 'c' };
 * const b = { a: 1, b: 2 };
 * mapKeyAValB(a, b); // { foo: 1, bar: 2 }
 * ```
 */
export const mapKeyAValB = <A, B>(
  a: A,
  b: B,
): MapKeyAValB<A, B> =>
  Object.fromEntries(
    Object.entries(a as {})
      // @ts-ignore too much fighting with Object.*entries()
      .map(([aKey, aVal]) => [aKey, b[aVal]])
      .filter(isDefinedTuple),
  );

/**
 * Match the keys of `a` to the values of `b` by matching the values of `a` to
 * the keys of `b` and eliminate undefined/null values.
 *
 * @example
 * ```ts
 * import { mapKeys } from '@resolute/std/misc';
 * const a = { a: 'foo', b: 'bar', c: 'baz' };
 * const b = { a: 1, b: 2 };
 * mapKeys(a, b); // { foo: 1, bar: 2 }
 * ```
 */
export const mapKeys = <A, B>(
  a: A,
  b: B,
): MapKeys<A, B> =>
  Object.fromEntries(
    Object.entries(a as {})
      // @ts-ignore too much fighting with Object.*entries()
      .map(([aKey, aVal]) => [aVal, b[aKey]])
      .filter(isDefinedTuple),
  );
