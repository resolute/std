//#region Coerce
// -----------------------------------------------------------------------------

const SymbolGuardTest = /* @__PURE__ */ Symbol('GuardTest');
const SymbolOtherwise = /* @__PURE__ */ Symbol('Otherwise');
const SymbolPredicate = /* @__PURE__ */ Symbol('Predicate');

/**
 * Non-throwing test attached to pure validators. When present, `is`, `not`,
 * and `to(…, or(…))` chains consult it instead of invoking the coercer and
 * catching its `TypeError`. This matters because `Error` construction is
 * expensive on some runtimes — workerd (Cloudflare Workers) captures the stack
 * eagerly and ignores `Error.stackTraceLimit`, so exception-based control flow
 * costs tens of microseconds per throw on deep call stacks (e.g. inside an SSR
 * render). With predicates, a `TypeError` is only constructed when a failure
 * actually escapes to the caller.
 *
 * Only attach a predicate to a coercer that (a) never throws inside the
 * predicate itself and (b) returns its input unchanged when the predicate
 * passes (pure validator — no mutation).
 */
const predicateOf = (coercer: unknown): ((value: any) => boolean) | undefined =>
  typeof coercer === 'function'
    ? (coercer as { [SymbolPredicate]?: (value: any) => boolean })[SymbolPredicate]
    : undefined;

/**
 * Build a validating guard from a non-throwing `predicate`. The guard returns
 * its input unchanged when the predicate passes and throws a uniform
 * `TypeError` otherwise. `expected` may be a thunk so the failure message is
 * only computed when a failure actually happens.
 */
const validator = (predicate: (value: any) => boolean, expected: string | (() => string)) => {
  const coercer = (value: any) => {
    if (predicate(value)) {
      return value;
    }
    throw exception(value, typeof expected === 'string' ? expected : expected());
  };
  (coercer as { [SymbolPredicate]?: (value: any) => boolean })[SymbolPredicate] = predicate;
  return coercer;
};

/**
 * Chain a set of coercing functions.
 * @example
 * ```ts
 * import { to, string } from '@resolute/std/coerce';
 * const mustBeString = to(string);
 * mustBeString('foo'); // 'foo'
 * mustBeString(1); // throws TypeError
 * ```
 * @param coercers unary guards, sanitizers, mutators
 * @returns pipeline of coercers
 */
export const to: Coerce = (...coercers: UnaryFunction[]) => {
  const coercerLengthMinusOne = coercers.length - 1;
  const lastCoercer = coercers[coercerLengthMinusOne];
  if (
    !(typeof lastCoercer === 'object' && lastCoercer !== null && SymbolOtherwise in lastCoercer)
  ) {
    return pipe(...coercers);
  }
  const { value: otherwise } = lastCoercer as Otherwise<any>;
  const throwOtherwise = otherwise instanceof Error;
  // Compile the chain once. Stages with a predicate run throw-free: on a
  // predicate miss we jump straight to `otherwise` without ever constructing
  // the guard’s TypeError. Stages without a predicate (mutators, foreign
  // functions) run under try/catch as before.
  const stages = coercers.slice(0, coercerLengthMinusOne).map((coercer) => ({
    predicate: predicateOf(coercer),
    run: guardInPipe(coercer) as UnaryFunction,
  }));
  return <T>(value: T) => {
    let current: unknown = value;
    for (const stage of stages) {
      if (stage.predicate) {
        if (!stage.predicate(current)) {
          if (throwOtherwise) {
            throw otherwise;
          }
          return otherwise;
        }
        // pure validator: value passes through unchanged
      } else {
        try {
          current = stage.run(current);
        } catch {
          if (throwOtherwise) {
            throw otherwise;
          }
          return otherwise;
        }
      }
    }
    return current;
  };
};

/**
 * Alias `to`
 * @see to
 */
export const coerce = /* @__PURE__ */ to;

/**
 * Provide a backup value to be used when coercion fails. If `value` is an
 * `instanceof Error`, then that error will be `throw`n. Any other `value` will
 * be returned as-is.
 * @example
 * ```ts
 * import { or, to, string } from '@resolute/std/coerce';
 * to(string, or(null))('foo'); // 'foo'
 * to(string, or(null))(1); // 1
 * ```
 * @param value backup value if any coercers fail
 * @returns backup value to be used in `to` chain
 */
export const or = <Y>(value: NonFunction<Y>) => ({
  value,
  [SymbolOtherwise]: true,
});

/**
 * Type guard test. Use with any type guard or mutating function that `throw`s
 * on failure (almost all functions here do). The `is` function will catch the
 * error and return `false`, otherwise it will return `true`.
 * @example
 * ```ts
 * import { is, string } from '@resolute/std/coerce';
 * is(string)('foo'); // true
 * is(string)(12345); // false
 * ```
 * @param coercer any type guard or mutating function
 * @returns boolean
 */
export const is = <A extends UnaryFunction>(coercer: A): Is<A> => {
  const predicate = predicateOf(coercer);
  const guard = predicate
    ? (value: unknown): value is ReturnType<A> => predicate(value)
    : (value: unknown): value is ReturnType<A> => {
      try {
        coercer(value);
        return true;
      } catch {
        return false;
      }
    };
  if (predicate) {
    (guard as { [SymbolPredicate]?: (value: any) => boolean })[SymbolPredicate] = predicate;
  }
  (guard as Is<A>)[SymbolGuardTest] = <T extends ReturnType<A>>(value: T) => {
    coercer(value);
    return value;
  };
  return guard as Is<A>;
};

/**
 * Negate type guard test. Use with any type guard or mutating function that
 * `throw`s on failure (almost all functions here do). The `not` function will
 * catch the error and return `true`, otherwise it will return `false`.
 * @example
 * ```ts
 * import { not, string } from '@resolute/std/coerce';
 * not(string)('foo'); // false
 * not(string)(12345); // true
 * ```
 * @param coercer any type guard or mutating function
 * @returns
 */
export const not = <A extends UnaryFunction>(coercer: A): Not<A> => {
  const inner = predicateOf(coercer);
  const inverted = inner ? (value: any) => !inner(value) : undefined;
  const test = is(coercer);
  const guard = <T>(value: T): value is T extends ReturnType<A> ? never : T => !test(value);
  if (inverted) {
    (guard as { [SymbolPredicate]?: (value: any) => boolean })[SymbolPredicate] = inverted;
  }
  (guard as Not<A>)[SymbolGuardTest] = inverted
    ? <T>(value: T) => {
      if (inverted(value)) {
        return value as T extends ReturnType<A> ? never : T;
      }
      throw exception(value, `something else`);
    }
    : <T>(value: T) => {
      try {
        coercer(value);
      } catch {
        return value as T extends ReturnType<A> ? never : T;
      }
      throw exception(value, `something else`);
    };
  return guard as Not<A>;
};

/**
 * Construct uniform `TypeError`s
 * @param actual value
 * @param expected value
 * @returns TypeError
 */
const exception = (actual: any, expected: string) =>
  new TypeError(`Expected “${actual}” to be ${expected}.`);

/**
 * Create a pipe of unary functions
 */
const pipe: To = (...fns: UnaryFunction[]) => {
  const piped = fns.reduce.bind(fns.map(guardInPipe), (value, fn) => fn(value)) as UnaryFunction;
  // A pipe made exclusively of pure validators is itself a pure validator:
  // propagate a composite predicate so `is`/`not`/`to(…, or(…))` treat the
  // whole pipe throw-free (e.g. `nonzero`, `nonempty`).
  const predicates = fns.map(predicateOf);
  if (fns.length > 0 && predicates.every((predicate) => predicate)) {
    (piped as { [SymbolPredicate]?: (value: any) => boolean })[SymbolPredicate] = (value) =>
      (predicates as ((value: any) => boolean)[]).every((predicate) => predicate(value));
  }
  return piped;
};

/**
 * Since type guard functions return boolean, we need to wrap them when they are
 * used within `pipe` so that the value is passed along instead of a boolean.
 * @param coercer type guard (result of `is` or `not`) function or a coerce function
 * @returns
 */
const guardInPipe = <T extends Is<R> | UnaryFunction, R extends UnaryFunction>(
  coercer: T,
) => {
  if (typeof coercer === 'function' && SymbolGuardTest in coercer) {
    return (coercer as Is<R>)[SymbolGuardTest];
  }
  return coercer;
};

//#endregion

//#region Guards
// -----------------------------------------------------------------------------

/**
 * `string` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `string`
 */
export const string = /* @__PURE__ */ validator(
  (value) => typeof value === 'string',
  'a string',
) as (value: string) => string;

/**
 * `number` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `number`
 */
export const number = /* @__PURE__ */ validator(
  (value) => typeof value === 'number' && Number.isFinite(value),
  'a finite number',
) as (value: number) => number;

/**
 * `bigint` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `bigint`
 */
export const bigint = /* @__PURE__ */ validator(
  (value) => typeof value === 'bigint',
  'a bigint',
) as (value: bigint) => bigint;

/**
 * `Date` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `Date`
 */
export const date = /* @__PURE__ */ validator(
  // valueOf() must be finite and nonzero (the 1970-01-01T00:00:00.000Z epoch
  // itself is deliberately rejected — it is the signature of a zeroed-out or
  // defaulted date field, not a real value)
  (value) => {
    if (!(value instanceof Date)) {
      return false;
    }
    const ms = value.valueOf();
    return Number.isFinite(ms) && ms !== 0;
  },
  'a date',
) as (value: Date) => Date;

/**
 * `Array` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `Array`
 */
export const array = /* @__PURE__ */ validator(
  (value) => Array.isArray(value),
  'an array',
) as <T extends readonly any[]>(value: T) => T;

/**
 * `Iterable` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `Iterable`
 */
export const iterable = /* @__PURE__ */ validator(
  // mirrors `Symbol.iterator in value`, which throws for primitives — string
  // primitives intentionally test false here, matching the historical
  // `is(iterable)('foo') === false` behavior
  (value) =>
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    Symbol.iterator in value,
  'iterable',
) as <T extends Iterable<any>>(value: T) => T;

/**
 * Not `undefined` | `null` Guard
 * @param value unknown
 * @returns value
 * @throws if value is `undefined` or `null`
 */
export const defined = /* @__PURE__ */ validator(
  (value) => typeof value !== 'undefined' && value !== null,
  'defined',
) as <T>(value: T) => NonNullable<T>;

/**
 * `object` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not an `object`
 */
export const object = /* @__PURE__ */ validator(
  (value) => typeof value === 'object' && value !== null,
  'an object',
) as <T>(value: T) => NonNullable<T>;

/**
 * `function` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not an `function`
 */
export const func = /* @__PURE__ */ validator(
  (value) => typeof value === 'function',
  'a function',
) as <T extends Function>(value: T) => T;

/**
 * `instanceof …` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `instanceof …`
 */
export const instance = <T extends Constructor>(constructor: T) =>
  validator(
    (value) => typeof constructor === 'function' && value instanceof constructor,
    () => `an instance of ${constructor}`,
  ) as (value: unknown) => InstanceType<T>;

export const own = <K extends PropertyKey>(property: K) =>
  validator(
    (value) => value !== null && typeof value !== 'undefined' && Object.hasOwn(value, property),
    () => `an object with own “${String(property)}” property`,
  ) as <T extends {}>(
    value: T,
  ) =>
    & T
    // Test the intersection of `T` and `{ [property]: unknown }`
    & Extract<T, { [_ in K]: unknown }> extends never
    // When it fails, this will throw, so if it passes, then the result is at a minimum `{ [property]: unknown }`
    ? { [_ in K]: unknown }
    // Successful path is a union of `T` and `{ [property]: unknown }`
    : Extract<T, { [_ in K]: unknown }>;

//#endregion

//#region Validators
// -----------------------------------------------------------------------------

/**
 * Alias `number`
 * @param value number
 * @returns value
 * @throws if value is not finite
 * @see number
 */
export const finite = /* @__PURE__ */ number;

/**
 * Number is 0
 * @param value number
 * @returns value
 * @throws if value is not 0
 */
export const zero = /* @__PURE__ */ validator(
  (value) => value === 0,
  '0',
) as (value: number) => 0;

/**
 * Alias `not(zero)`
 * @see zero
 */
export const nonzero = /* @__PURE__ */ to(/* @__PURE__ */ not(zero)) as <T extends number>(
  input: T,
) => T extends 0 ? never : T;

/**
 * Number > 0
 * @param value number
 * @returns value
 * @throws if value <= 0
 */
export const positive = /* @__PURE__ */ to(
  nonzero,
  (value: number) => {
    if (value > 0) {
      return value;
    }
    throw exception(value, 'a positive number');
  },
) as (input: number) => number;

/**
 * Number < 0
 * @param value number
 * @returns value
 * @throws if value >= 0
 */
const negativePipe = /* @__PURE__ */ to(nonzero, /* @__PURE__ */ not(positive));
export const negative = (value: number): number => {
  try {
    return negativePipe(value);
  } catch {
    throw exception(value, 'a negative number');
  }
};

/**
 * Date is in the future
 * @param value date
 * @returns value
 * @throws if date is in the past
 */
export const future = (value: Date): Date => {
  if (value.valueOf() > Date.now()) {
    return value;
  }
  throw exception(value, 'in the future');
};

/**
 * Date is in the past
 * @param value date
 * @returns value
 * @throws if date is in the future
 */
export const past = (value: Date): Date => {
  if (value.valueOf() < Date.now()) {
    return value;
  }
  throw exception(value, 'in the past');
};

/**
 * Length of string or array is exactly `size`
 * @param size length
 * @returns validator
 */
export const length = <N extends number>(size: N) =>
  /**
   * Length of string or array is exactly `size`
   * @param value `string` or `array`
   * @returns value
   * @throws if value is not of length `size`
   */
  validator(
    (value) => value?.length === size,
    () => `of length: ${size}`,
  ) as <T extends { length: number }>(value: T) => T & { length: N };

/**
 * Alias `to(not(length(0)))`
 * @see length
 */
// `not` kind of messes up the types here. Explicit type definition used:
// export const nonempty = <T>(value: T) => to(not(length(0)))(value) as T & { length: number };
export const nonempty = /* @__PURE__ */ to(
  /* @__PURE__ */ not(/* @__PURE__ */ length(0)),
) as <T extends { length: number }>(
  value: T,
) => T;

/**
 * `value` is within `list` (a.k.a. Enum)
 */
export const within = <T>(list: readonly T[]) =>
  /**
   * @param value member of `list`
   * @returns value
   * @throws if value is not a member of `list`
   */
  validator(
    (value) => list.indexOf(value) >= 0,
    () => `one of ${list}`,
  ) as <V>(value: V) => V & T;

/**
 * Validate against the Luhn algorithm (adapted from
 * https://github.com/bendrucker/fast-luhn).
 * @param value string of digits
 * @returns value
 * @throws if value does not pass Luhn algorithm
 */
export const luhn = (value: string): string => {
  let { length } = value;
  let bit = 1;
  let sum = 0;
  while (length) {
    const int = parseInt(value.charAt(--length), 10);
    bit ^= 1;
    sum += bit ? [0, 2, 4, 6, 8, 1, 3, 5, 7, 9][int] : int;
  }
  if (sum % 10 === 0) {
    return value;
  }
  throw exception(value, 'able to pass the Luhn test');
};

//#endregion

//#region Mutators
// -----------------------------------------------------------------------------

/**
 * `string` Mutation
 * @param value string | number | bigint
 * @returns string
 * @throws if value cannot be mutated to `string`
 */
export const stringify = <T extends string | number | bigint>(value: T): string => {
  if (is(finite)(value) || is(bigint)(value)) {
    return value.toString();
  }
  return string(value as string);
};

/**
 * `number` Mutation
 * @param value string | number | bigint
 * @returns number
 * @throws if value cannot be mutated to `number`
 */
export const numeric = <T extends string | number | bigint>(value: T): number => {
  if (is(bigint)(value)) {
    if (value > Number.MIN_SAFE_INTEGER && value < Number.MAX_SAFE_INTEGER) {
      return Number(value);
    }
    throw exception(value, 'between SAFE_INTEGER bounds');
  }
  if (is(finite)(value)) {
    return value;
  }
  try {
    return numericPipe(value);
  } catch {
    throw exception(value, 'numeric');
  }
};

const numericPipe: (value: unknown) => number = /* @__PURE__ */ to(
  stringify,
  (value: string) => value.replace(/[^0-9oex.-]/g, ''),
  nonempty,
  (value: string) => finite(Number(value)),
);

/**
 * `Date` Mutator
 * @param value number | string | Date
 * @returns Date
 * @throws if value cannot be mutated to `Date`
 */
export const dateify = <T extends number | string | Date>(value: T): Date => {
  const mutated = new Date(value);
  if (is(date)(mutated)) {
    return mutated;
  }
  throw exception(value, 'a date');
};

/**
 * `boolean` Mutator
 * @param truthy returned when value evaluates true
 * @param falsy returned when value evaluates false (false, '0', 'false', …)
 * @param nully returned when value evaluates null (null, '', 'null')
 * @param undefy returned when value evaluates undefined (undefined, 'undefined', …)
 * @returns boolean
 */
export const boolean = <Truthy = true, Falsy = false, Nully = Falsy, Undefy = Nully>(
  ...args:
    | readonly []
    | readonly [truthy: Truthy]
    | readonly [truthy: Truthy, falsy: Falsy]
    | readonly [truthy: Truthy, falsy: Falsy, nully: Nully]
    | readonly [truthy: Truthy, falsy: Falsy, nully: Nully, undefy: Undefy]
): (value: unknown) => Truthy | Falsy | Nully | Undefy => {
  // This verbose nastiness handles cases where `undefined` is passed as any of
  // the truthy, falsy, nully, undefy parameters.
  const truthy = (args.length < 1 ? true : args[0]) as Truthy;
  const falsy = (args.length < 2 ? false : args[1]) as Falsy;
  const nully = (args.length < 3 ? falsy : args[2]) as Nully;
  const undefy = (args.length < 4 ? nully : args[3]) as Undefy;
  return (value: unknown) => {
    switch (typeof value) {
      case 'undefined':
        return undefy;
      case 'string':
        {
          const trimmed = value.trim();
          if (trimmed === '' || trimmed === 'null') {
            return nully;
          }
          if (trimmed === '0' || trimmed === 'false') {
            return falsy;
          }
        }
        break;
      case 'number':
        if (value === 0 || !Number.isFinite(value)) {
          return falsy;
        }
        break;
      default:
        if (value === null) {
          return nully;
        }
        break;
    }
    return value ? truthy : falsy;
  };
};

/**
 * `Array` Mutator. Transform any iterable into an array [...value], except for
 * `string`s. A `string` is wrapped as a single member array (`[value]`).
 * @example
 * ```ts
 * import { arrayify } from '@resolute/std/coerce';
 * arrayify('123'); // ['123']
 * arrayify(new Set([1,2,3])); // [1,2,3]
 * ```
 * @param value any iterable (Map, Set, …)
 * @returns array
 */
export const arrayify = <T>(value: T): IterableOrNot<T>[] => {
  // a `string` _is_ Iterable, but we do not want to return an array of
  // characters
  if (is(array)(value)) {
    return value as IterableOrNot<T>[];
  }
  if (!is(string)(value) && is(iterable)(value)) {
    return [...value] as IterableOrNot<T>[];
  }
  return [value] as IterableOrNot<T>[];
};

/**
 * Mutate iterables (except strings) and objects to an array of entries.
 * @param value iterable | object (Map, Set, Headers, URLSearchParams, …)
 * @returns array
 * @throws if value cannot be transformed into an array of entries
 */
export const entries: Entries = <T extends Iterable<any>>(value: T) => {
  if (is(iterable)(value)) {
    return arrayify(value);
  }
  if (is(object)(value)) {
    return Object.entries(value);
  }
  throw exception(value, `transformable to entries`);
};

/**
 * Mutate to tuple pairs. Same as `entries`, but limits the entries array to a
 * length of 2 for each member.
 * @see entries
 * @param value iterable | object
 * @returns array
 * @throws if value cannot be transformed into an array of entries
 */
export const pairs = <T extends Iterable<[K, V]>, K, V>(value: T): [K, V][] =>
  entries(value)
    .map(limit(2) as (value: [K, V]) => [K, V])
    .filter(is(length(2)));

/**
 * Gracefully wrap errors or strings with an Error wrapper. Prevents
 * double-wrapping errors.
 * @param wrapper Error constructor used to wrap
 * @returns wrapper
 * @throws if value is not a string or instanceof Error
 */
export const wrapError: WrapError = (wrapper?: ErrorConstructor) => (value: Error | string) => {
  const wrap = wrapper ?? Error;
  if (is(string)(value)) {
    return new wrap(value);
  }
  if (is(instance(wrap))(value)) {
    return value;
  }
  if (is(instance(Error))(value)) {
    return new wrap((value as Error).message);
  }
  throw exception(value, `string, Error, or ${wrap.name}`);
};

/**
 * Round to integer
 * @param value number
 * @returns number
 * @throws if value is not a number
 */
export const integer = (value: number): number => Math.round(value);

/**
 * Remove dangerous characters from string
 * @param value string
 * @returns string
 * @throws if value is not a string
 */
export const safe = (value: string): string => value.replace(/[\\|";/?<>()*[\]{}=`\t\r\n]/g, '');

/**
 * Replace leading and trailing whitespace from a string
 * @warning Does _not_ remove half-space and other UTF SPACE-like characters. Chain
 * `spaces` before `trim` in order to remove these special SPACE characters from
 * the string.
 * @param value string
 * @returns string
 * @throws if value is not a string
 */
export const trim = (value: string): string => value.trim();

/**
 * Replace all SPACE-like characters with a regular SPACE. Replace continuous
 * multiple SPACE characters with a single SPACE.
 * @see https://jkorpela.fi/chars/spaces.html
 * @param value string
 * @returns string
 * @throws if value is not a string
 */
export const spaces = (value: string): string =>
  value
    .replace(
      /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g,
      ' ',
    )
    .replace(/\s+/g, ' ');

/**
 * Replace ' and " with ‘’ and “” respectively.
 * @param value string
 * @returns string
 * @throws if value is not a string
 */
export const quotes = (value: string): string =>
  ([
    // triple prime
    [/'''/g, '‴'],
    // beginning "
    [/(\W|^)"(\w)/g, '$1“$2'],
    // ending "
    [/(“[^"]*)"([^"]*$|[^“"]*“)/g, '$1”$2'],
    // remaining " at end of word
    [/([^0-9])"/g, '$1”'],
    // double prime as two single quotes
    [/''/g, '″'],
    // beginning '
    [/(\W|^)'(\S)/g, '$1‘$2'],
    // conjunction possession
    [/([a-z])'([a-z])/gi, '$1’$2'],
    // abbrev. years like '93
    [
      /(‘)([0-9]{2}[^’]*)(‘([^0-9]|$)|$|’[a-z])/gi,
      '’$2$3',
    ],
    // ending '
    [/((‘[^']*)|[a-z])'([^0-9]|$)/gi, '$1’$3'],
    // backwards apostrophe
    [
      /(\B|^)‘(?=([^‘’]*’\b)*([^‘’]*\B\W[‘’]\b|[^‘’]*$))/gi,
      '$1’',
    ],
    // double prime
    [/"/g, '″'],
    // prime
    [/'/g, '\u2032'],
    // -- → —
    [/--/g, '—'],
    // .. → ellipsis
    [/\.\.+/g, '…'],
  ] as const).reduce(
    (subject, [search, replacement]) => subject.replace(search, replacement),
    value,
  );

/**
 * Capitalize the first letter of a string
 * @param value string
 * @returns string
 * @throws if value is not a string
 */
export const ucfirst = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
export const ucFirst = ucfirst;

const hasBothUpperAndLower = (value: string): boolean => /[A-Z]/.test(value) && /[a-z]/.test(value);

const properNameCapitalizer =
  (mixedCase: boolean): (match: string) => string => (match: string): string => {
    const lowerCaseMatch = match.toLowerCase();
    // single letters should be uppercase (middle initials, etc.)
    if (match.length === 1) {
      return match.toUpperCase();
    }
    if (match.length <= 3) {
      // suffixes that should be all uppercase
      if (['ii', 'iii', 'iv', 'v'].indexOf(lowerCaseMatch) > -1) {
        return match.toUpperCase();
      }
      // compound names that should be lowercase
      if (['dit', 'de', 'von'].indexOf(lowerCaseMatch) > -1) {
        return lowerCaseMatch;
      }
      if (mixedCase) {
        return match;
      }
    }
    return (
      ucfirst(lowerCaseMatch)
        // McXx, MacXx, O’Xx, D’Xx
        .replace(
          /^(ma?c|[od]’)(\S{2,}$)/i,
          (_m, p1, p2) => ucfirst(p1) + ucfirst(p2),
        )
    );
  };

/**
 * Fix capitalization of proper nouns: names, addresses
 * @param value string
 * @returns string
 * @throws if value is not a string
 */
export const proper = (value: string): string =>
  value
    // restrict character set for proper names and addresses
    .replace(/[^A-Za-z0-9\u00C0-\u00FF’ ,-]/g, ' ')
    // remove double spacing possibly introduced from previous replace
    .replace(/  +/g, ' ')
    // remove leading/trailing spaces possibly introduced from previous replace
    .trim()
    .replace(/([^ ,-]+)/g, properNameCapitalizer(hasBothUpperAndLower(value)));

/**
 * Format email addresses
 * @param value string
 * @returns string
 * @throws if value does not resemble an email
 */
export const email: ToResult<string, string> = /* @__PURE__ */ to(
  (value: string) => value.toLowerCase().replace(/\s+/g, ''),
  nonempty,
  (value: string) => {
    if (/[a-z0-9]@[a-z0-9]/.test(value)) {
      return value;
    }
    throw exception(value, 'a valid email address');
  },
);

/**
 * Strip all non-digit characters from string
 * @param value string
 * @returns string with only [0-9] digits
 * @throws if value is not a string
 */
export const digits = (value: string): string => value.replace(/[^\d]/g, '');

/**
 * Returns only the digits of a phone number without any formatting
 * @param value string
 * @returns string of 10+ digits
 * @throws if value is not a string of 10+ digits (excluding leading 0 or 1)
 */
export const phone = (value: string): string => {
  const onlyDigits = digits(value).replace(/^[01]+/, '');
  if (onlyDigits.length >= 10) {
    return onlyDigits;
  }
  throw exception(value, 'a valid US phone number');
};

/**
 * Requires the input phone number to be exactly 10-digits (no extension)
 * @param value string
 * @returns string of exactly 10 digits
 * @throws if value is not a string of exactly 10 digits (excluding leading 0 or 1)
 */
export const phone10 = (value: string): string => {
  const valid = phone(value);
  if (valid.length === 10) {
    return valid;
  }
  throw exception(value, 'a valid US 10-digit phone number');
};

/**
 * Format phone number as “(NNN) NNN-NNNN ext N…”
 * @param value string
 * @returns string of formatted phone number
 * @throws if value is not a string of at least 10 digits (excluding leading 0 or 1)
 */
export const prettyPhone = (value: string): string => {
  const valid = phone(value);
  if (valid.length === 10) {
    return valid.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  return valid.replace(/(\d{3})(\d{3})(\d{4})(\d+)/, '($1) $2-$3 ext $4');
};

/**
 * 5-digit US postal code
 * @param value string
 * @returns string of 5-digit zip code
 * @throws if value does not contain 5 digits
 */
// built lazily: `limit` is declared further down in this module
let postalCodeUs5Pipe: UnaryFunction | undefined;
export const postalCodeUs5 = (value: string): string & { length: 5 } => {
  const validate = postalCodeUs5Pipe ??= to(digits, limit(5), string, length(5));
  try {
    return validate(value) as string & { length: 5 };
  } catch {
    throw exception(value, 'a valid US postal code');
  }
};

/**
 * Limit the value of a `number`, characters in a `string`, or items in an
 * `array`
 * @param max number
 * @returns function to limit given input
 */
export const limit = <N extends number>(max: N): <T>(value: T) => Limit<N, T> =>
/**
 * Limit the value of a `number`, characters in a `string`, or items in an
 * `array`
 * @param value
 * @returns limited to `max`
 * @throws if value is not a number, string, or array
 */
<T>(value: T): Limit<N, T> => {
  if (is(number)(value)) {
    return Math.min(value, max) as Limit<N, T>;
  }
  if (is(string)(value)) {
    return value.slice(0, max) as Limit<N, T>;
  }
  if (is(array)(value)) {
    return value.slice(0, max) as Limit<N, T>;
  }
  throw exception(value, `able to be limited to ${max}`);
};

/**
 * Split a string into an array. Optionally define a separator RegExp. Default
 * separator is comma, newline, space, tab.
 * @param separator default: `/[,\r\n\s]+/g` commas, newlines, spaces, tabs
 * @param limit optionally limit the number of items in result
 */
export const split = (separator = /[,\r\n\s]+/g, limit?: number): (value: string) => string[] =>
/**
 * Split a string by given `separator` (default: comma, newline, space, tab).
 * Remove empty strings from returned array.
 * @example
 * ```ts
 * import { split } from '@resolute/std/coerce';
 * split()('a,b,,,c d e foo') // ['a', 'b', 'c', 'd', 'e', 'foo']
 * ```
 * @param value string
 * @returns array of strings split by `separator`
 * @throws if value is not a string
 */
(value: string): string[] =>
  value.split(separator, limit)
    .map(spaces) // remove irregular spaces
    .map(trim)
    .filter(is(nonempty));

//#endregion

//#region Types
// -----------------------------------------------------------------------------

export type Constructor = new (...args: any[]) => any;

export type IterableOrNot<T> = T extends Iterable<infer U> ? U : T;

export type NonFunction<T> = T extends (Function | ErrorConstructor | (new (...args: any[]) => any))
  ? never
  : T;

export interface WrapError {
  (): (value: Error | string) => Error;
  <T extends Constructor>(value: T): (value: Error | string) => InstanceType<T>;
}

export interface Entries {
  <T>(value: Iterable<T>): T[];
  <K extends string | number | symbol, V>(value: Record<K, V>): [K, V][];
  <T extends Iterable<I> | Record<K, V>, I, K extends string | number | symbol, V>(
    value: T,
  ): I[] | [K, V][];
}

export type TupleSplit<T, N extends number, O extends readonly any[] = readonly []> =
  O['length'] extends N ? [O, T]
    : T extends readonly [infer F, ...infer R] ? TupleSplit<readonly [...R], N, readonly [...O, F]>
    : [O, T];

export type TakeFirst<T extends readonly any[], N extends number> = TupleSplit<T, N>[0];

export type SkipFirst<T extends readonly any[], N extends number> = TupleSplit<T, N>[1];

export type TupleSlice<T extends readonly any[], S extends number, E extends number> = SkipFirst<
  TakeFirst<T, E>,
  S
>;

export type Limit<N extends number, T> = T extends number ? number
  : T extends (string | any[]) ? T & { length: N }
  : T extends readonly any[] ? TakeFirst<T, N>
  : never;

export type UnaryFunction = (value: any) => any;

export type UnaryReturnType<T extends UnaryFunction> = T extends Is<infer R> ? ReturnType<R>
  : (T extends Not<infer S> ? ReturnType<S> : ReturnType<T>);

export type UnaryExtends<A extends UnaryFunction, B extends UnaryFunction> =
  UnaryReturnType<A> extends UnaryReturnType<B> ? UnaryReturnType<A>
    : UnaryReturnType<B>;

export interface Is<A extends UnaryFunction> {
  <T>(value: T): value is Extract<T, ReturnType<A>>;
  [SymbolGuardTest]: <T extends ReturnType<A>>(value: T) => T;
}

export interface Not<A extends UnaryFunction> {
  <T>(value: T): value is T extends ReturnType<A> ? never : T;
  [SymbolGuardTest]: <T>(value: T) => T extends ReturnType<A> ? never : T;
}

export interface Otherwise<T> {
  value: T;
  [SymbolOtherwise]: boolean;
}

export interface ToResult<I, O> {
  <T>(value: T): T extends I ? (T extends O ? T : O) : (unknown extends T ? O : never);
}

export interface OrResult<I, O, Y> {
  <T>(value: T):
    | (T extends I ? (T extends O ? T : O) : (unknown extends T ? O : never))
    | Exclude<Y, Error>;
}

export interface To {
  (): <I>(value: I) => I;
  <A extends UnaryFunction>(
    a: A,
  ): ToResult<Parameters<A>[0], UnaryReturnType<A>>;
  <A extends UnaryFunction, B extends (value: UnaryReturnType<A>) => any>(
    a: A,
    b: B,
  ): ToResult<Parameters<A>[0], UnaryReturnType<B>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
  >(a: A, b: B, c: C): ToResult<Parameters<A>[0], UnaryReturnType<C>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
  >(a: A, b: B, c: C, d: D): ToResult<Parameters<A>[0], UnaryReturnType<D>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
  >(a: A, b: B, c: C, d: D, e: E): ToResult<Parameters<A>[0], UnaryReturnType<E>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
    F extends (value: UnaryExtends<D, E>) => any,
  >(a: A, b: B, c: C, d: D, e: E, f: F): ToResult<Parameters<A>[0], UnaryReturnType<F>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
    F extends (value: UnaryExtends<D, E>) => any,
    G extends (value: UnaryExtends<E, F>) => any,
  >(a: A, b: B, c: C, d: D, e: E, f: F, g: G): ToResult<Parameters<A>[0], UnaryReturnType<G>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
    F extends (value: UnaryExtends<D, E>) => any,
    G extends (value: UnaryExtends<E, F>) => any,
    H extends (value: UnaryExtends<F, G>) => any,
  >(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H): ToResult<Parameters<A>[0], UnaryReturnType<H>>;
  <AZ extends UnaryFunction>(...az: AZ[]): ToResult<Parameters<AZ>[0], UnaryReturnType<AZ>>;
}

export interface Coerce extends To {
  <A extends UnaryFunction, B extends Otherwise<any>>(
    a: A,
    b: B,
  ): OrResult<Parameters<A>[0], UnaryReturnType<A>, B['value']>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends Otherwise<any>,
  >(
    a: A,
    b: B,
    c: C,
  ): OrResult<Parameters<A>[0], UnaryReturnType<B>, C['value']>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends Otherwise<any>,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
  ): OrResult<Parameters<A>[0], UnaryReturnType<C>, D['value']>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends Otherwise<any>,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
  ): OrResult<Parameters<A>[0], UnaryReturnType<D>, E['value']>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
    F extends Otherwise<any>,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
  ): OrResult<Parameters<A>[0], UnaryReturnType<E>, F['value']>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
    F extends (value: UnaryExtends<D, E>) => any,
    G extends Otherwise<any>,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
  ): OrResult<Parameters<A>[0], UnaryReturnType<F>, G['value']>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
    F extends (value: UnaryExtends<D, E>) => any,
    G extends (value: UnaryExtends<E, F>) => any,
    H extends Otherwise<any>,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
  ): OrResult<Parameters<A>[0], UnaryReturnType<G>, H['value']>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
    F extends (value: UnaryExtends<D, E>) => any,
    G extends (value: UnaryExtends<E, F>) => any,
    H extends (value: UnaryExtends<F, G>) => any,
    I extends Otherwise<any>,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
  ): OrResult<Parameters<A>[0], UnaryReturnType<H>, I['value']>;
}

//#endregion

export default to;
