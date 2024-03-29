import {
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
  to,
  trim,
  // @ts-ignore tsc non-sense
} from './coerce.ts';

export type MapNonNullable<T> = { [K in keyof T]: NonNullable<T[K]> };

export type MapKeyAValB<A, B> = {
  [K in keyof A as A[K] extends keyof B ? K : never]: A[K] extends keyof B ? B[A[K]] : never;
};

export type MapKeys<A, B> = {
  [K in keyof A as A[K] extends PropertyKey ? A[K] : never]: K extends keyof B ? B[K] : never;
};

export const properName = /* @__PURE__ */ to(
  string,
  spaces,
  trim,
  quotes,
  proper,
  not(length(0)),
  limit(100),
  string,
);

export const cleanEmail = /* @__PURE__ */ to(string, email, limit(100), string);

export const cleanPhone = /* @__PURE__ */ to(string, prettyPhone);

/**
 * Use as an array `.filter` to remove any duplicate items.
 * @param value
 * @param index
 * @param array
 * @returns array with unique items
 */
export const unique = <T>(value: T, index: number, array: T[]) => array.indexOf(value) === index;

/**
 * Type guard against any tuples containing `undefined` or `null`.
 */
export const isDefinedTuple = <T extends readonly any[]>(
  tuple: T,
): tuple is MapNonNullable<T> => tuple.every(is(defined));

/**
 * Map keys or values of `a` to keys or values of `b`
 * @param a
 * @param map function
 * @returns mapped object
 */
export const mapTuple = <
  A extends {},
  MapFn extends ([a, b]: readonly [PropertyKey, any]) => readonly [any, any],
>(a: A, map: MapFn) =>
  Object.fromEntries(
    Object.entries(a)
      .map(map)
      .filter(isDefinedTuple),
  );

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
export const mapKeyAValB = <A extends {}, B extends {}>(a: A, b: B): MapKeyAValB<A, B> =>
  mapTuple(a, ([aKey, aVal]) => [aKey, b[aVal as keyof B]]);

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
export const mapKeys = <A extends {}, B extends {}>(a: A, b: B): MapKeys<A, B> =>
  mapTuple(a, ([aKey, aVal]) => [aVal, b[aKey as keyof B]]);
