//#region Coerce
// -----------------------------------------------------------------------------

const SymbolGuardTest = Symbol('GuardTest');
const SymbolOtherwise = Symbol('Otherwise');

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
  if (not(own(SymbolOtherwise))(lastCoercer)) {
    return pipe(...coercers);
  }
  return <T>(value: T) => {
    const { value: otherwise } = lastCoercer;
    const revised = coercers.slice(0, coercerLengthMinusOne);
    try {
      return pipe(...revised)(value);
    } catch (error) {
      if (is(instance(Error))(otherwise)) {
        throw otherwise;
      }
      return otherwise;
    }
  };
};

/**
 * Alias `to`
 * @see to
 */
export const coerce = to;

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
export const is = <A extends UnaryFunction>(coercer: A) => {
  const guard = (value: unknown): value is ReturnType<A> => {
    try {
      coercer(value);
      return true;
    } catch {
      return false;
    }
  };
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
export const not = <A extends UnaryFunction>(coercer: A) => {
  const guard = <T>(value: T): value is T extends ReturnType<A> ? never : T => !is(coercer)(value);
  (guard as Not<A>)[SymbolGuardTest] = <T>(value: T) => {
    try {
      coercer(value);
    } catch {
      return value as T extends ReturnType<A> ? never : T;
    }
    throw makeError(value, `something else`);
  };
  return guard as Not<A>;
};

/**
 * Make uniform `TypeError`s
 * @param actual value
 * @param expected value
 * @returns TypeError
 */
const makeError = (actual: any, expected: string) =>
  new TypeError(`Expected “${actual}” to be ${expected}.`);

/**
 * Create a pipe of unary functions
 */
const pipe: To = (...fns: UnaryFunction[]) =>
  fns.reduce.bind(fns.map(guardInPipe), (value, fn) => fn(value)) as UnaryFunction;

/**
 * Since type guard functions return boolean, we need to wrap them when they are
 * used within `pipe` so that the value is passed along instead of a boolean.
 * @param coercer type guard (result of `is` or `not`) function or a coerce function
 * @returns
 */
const guardInPipe = <T extends Is<R> | UnaryFunction, R extends UnaryFunction>(
  coercer: T,
) => {
  if (is(own(SymbolGuardTest))(coercer)) {
    return coercer[SymbolGuardTest];
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
export const string = <T>(value: T) => {
  if (typeof value === 'string') {
    return value;
  }
  throw makeError(value, 'a string');
};

/**
 * `number` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `number`
 */
export const number = <T>(value: T): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  throw makeError(value, 'a number');
};

/**
 * `bigint` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `bigint`
 */
export const bigint = <T>(value: T) => {
  if (typeof value === 'bigint') {
    return value;
  }
  throw makeError(value, 'a bigint');
};

/**
 * `Date` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `Date`
 */
export const date = <T>(value: T) => {
  try {
    const valid = to(object, instance(Date))(value);
    to(finite, nonzero)(valid.valueOf());
    return valid;
  } catch {
    throw makeError(value, 'a date');
  }
};

/**
 * `Array` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `Array`
 */
export const array = <T, V>(value: Array<T> | V) => {
  if (Array.isArray(value)) {
    return value as Array<T>;
  }
  throw makeError(value, 'an array');
};

/**
 * `Iterable` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `Iterable`
 */
export const iterable = <T extends Iterable<U>, U>(value: T) => {
  if (is(object)(value) && (Symbol.iterator in value)) {
    return value as T & Iterable<T>;
  }
  throw makeError(value, 'iterable');
};

/**
 * Not `undefined` | `null` Guard
 * @param value unknown
 * @returns value
 * @throws if value is `undefined` or `null`
 */
export const defined = <T>(value: T) => {
  if (typeof value !== 'undefined' && value !== null) {
    return value as NonNullable<T>;
  }
  throw makeError(value, 'defined');
};

/**
 * `object` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not an `object`
 */
export const object = <T>(value: T) => {
  if (typeof value === 'object' && value !== null) {
    // deno-lint-ignore ban-types
    return value as NonNullable<T & {}>;
  }
  throw makeError(value, 'an object');
};

/**
 * `function` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not an `function`
 */
export const func = <T>(value: T) => {
  if (typeof value === 'function') {
    // deno-lint-ignore ban-types
    return value as T & Function;
  }
  throw makeError(value, 'a function');
};

/**
 * `instanceof …` Guard
 * @param value unknown
 * @returns value
 * @throws if value is not `instanceof …`
 */
export const instance = <T extends Constructor>(constructor: T) => (value: unknown) => {
  if (is(func)(constructor) && value instanceof constructor) {
    return value as InstanceType<T>;
  }
  throw makeError(value, `an instance of ${constructor}`);
};

export const own = <K extends string | number | symbol>(property: K) => <T>(value: T) => {
  if (Object.prototype.hasOwnProperty.call(value, property)) {
    return value as T & { [Property in K]: any };
  }
  throw makeError(value, `an object with own “${String(property)}” property`);
};
//#endregion

//#region Validators
// -----------------------------------------------------------------------------

/**
 * Finite number
 * @param value number
 * @returns value
 * @throws if value is not finite
 */
export const finite =
  // to(number, or(new TypeError('Expected a finite number.')));
  <T>(value: T) => to(number, or(makeError(value, 'a finite number.')))(value);

/**
 * Number is 0
 * @param value number
 * @returns value
 * @throws if value is not 0
 */
export const zero = <T extends number>(value: T) => {
  if (value === 0) {
    return value as 0;
  }
  throw makeError(value, '0');
};

/**
 * Alias `not(zero)`
 * @see zero
 */
export const nonzero = /* @__PURE__ */ not(zero);

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
    throw makeError(value, 'a positive number');
  },
);

/**
 * Number < 0
 * @param value number
 * @returns value
 * @throws if value >= 0
 */
export const negative = (value: number) =>
  to(
    nonzero,
    not(positive),
    or(makeError(value, 'a negative number')),
  )(value);

/**
 * Date is in the future
 * @param value date
 * @returns value
 * @throws if date is in the past
 */
export const future = (value: Date) => {
  if (value.valueOf() > Date.now()) {
    return value;
  }
  throw makeError(value, 'in the future');
};

/**
 * Date is in the past
 * @param value date
 * @returns value
 * @throws if date is in the future
 */
export const past = (value: Date) => {
  if (value.valueOf() < Date.now()) {
    return value;
  }
  throw makeError(value, 'in the past');
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
<T extends { length: number }>(value: T) => {
  if (value?.length === size) {
    return value as T & { length: N };
  }
  throw makeError(value, `of length: ${size}`);
};

/**
 * Alias `not(length(0))`
 * @see length
 */
// `not` kind of messes up the types here. Explicit type definition used:
export const nonempty = /* @__PURE__ */ not(length(0)) as <T extends { length: number }>(
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
<V>(value: V) => {
  if (list.indexOf(value as unknown as T) >= 0) {
    return value as V & T;
  }
  throw makeError(value, `one of ${list}`);
};

/**
 * Validate against the Luhn algorithm (adapted from
 * https://github.com/bendrucker/fast-luhn).
 * @param value string of digits
 * @returns value
 * @throws if value does not pass Luhn algorithm
 */
export const luhn = (value: string) => {
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
  throw makeError(value, 'able to pass the Luhn test');
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
export const stringify = <T extends string | number | bigint | { length: number }>(value: T) => {
  if (is(finite)(value) || is(bigint)(value)) {
    return value.toString();
  }
  return string(value);
};

/**
 * `number` Mutation
 * @param value string | number | bigint
 * @returns number
 * @throws if value cannot be mutated to `number`
 */
export const numeric = <T extends string | number | bigint | { length: number }>(value: T) => {
  if (is(finite)(value)) {
    return value;
  }
  return to(
    stringify,
    (value: string) => value.replace(/[^0-9oex.-]/g, ''),
    nonempty,
    (value: string) => finite(Number(value)),
    or(makeError(value, 'numeric')),
  )(value);
};

/**
 * `Date` Mutator
 * @param value number | string | Date
 * @returns Date
 * @throws if value cannot be mutated to `Date`
 */
export const dateify = <T extends number | string | Date>(value: T) =>
  to(date, or(makeError(value, 'a date')))(new Date(value));

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
) => {
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
  throw makeError(value, `transformable to entries`);
};

/**
 * Mutate to tuple pairs. Same as `entries`, but limits the entries array to a
 * length of 2 for each member.
 * @see entries
 * @param value iterable | object
 * @returns array
 * @throws if value cannot be transformed into an array of entries
 */
export const pairs = <T extends Iterable<[K, V]>, K, V>(value: T) =>
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
  if (is(instance(wrap))(value)) {
    return value;
  }
  if (is(instance(Error))(value)) {
    return new wrap(value.message);
  }
  if (is(string)(value)) {
    return new wrap(value);
  }
  throw makeError(value, `string, Error, or ${wrap.name}`);
};

/**
 * Round to integer
 * @param value number
 * @returns number
 * @throws if value is not a number
 */
export const integer = (value: number) => Math.round(value);

/**
 * Remove dangerous characters from string
 * @param value string
 * @returns string
 * @throws if value is not a string
 */
export const safe = (value: string) => value.replace(/[\\|";/?<>()*[\]{}=`\t\r\n]/g, '');

/**
 * Replace leading and trailing whitespace from a string
 * @warning Does _not_ remove half-space and other UTF SPACE-like characters. Chain
 * `spaces` before `trim` in order to remove these special SPACE characters from
 * the string.
 * @param value string
 * @returns string
 * @throws if value is not a string
 */
export const trim = (value: string) => value.trim();

/**
 * Replace all SPACE-like characters with a regular SPACE. Replace continuous
 * multiple SPACE characters with a single SPACE.
 * @see https://jkorpela.fi/chars/spaces.html
 * @param value string
 * @returns string
 * @throws if value is not a string
 */
export const spaces = (value: string) =>
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
export const quotes = (value: string) =>
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
export const ucfirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export const ucFirst = ucfirst;

const hasBothUpperAndLower = (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value);

const properNameCapitalizer = (mixedCase: boolean) => (match: string) => {
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
export const proper = (value: string) =>
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
export const email = /* @__PURE__ */ to(
  (value: string) => value.toLowerCase().replace(/\s+/g, ''),
  nonempty,
  (value: string) => {
    if (/[a-z0-9]@[a-z0-9]/.test(value)) {
      return value;
    }
    throw makeError(value, 'a valid email address');
  },
);

/**
 * Strip all non-digit characters from string
 * @param value string
 * @returns string with only [0-9] digits
 * @throws if value is not a string
 */
export const digits = (value: string) => value.replace(/[^\d]/g, '');

/**
 * Returns only the digits of a phone number without any formatting
 * @param value string
 * @returns string of 10+ digits
 * @throws if value is not a string of 10+ digits (excluding leading 0 or 1)
 */
export const phone = (value: string) => {
  const onlyDigits = digits(value).replace(/^[01]+/, '');
  if (onlyDigits.length >= 10) {
    return onlyDigits;
  }
  throw makeError(value, 'a valid US phone number');
};

/**
 * Requires the input phone number to be exactly 10-digits (no extension)
 * @param value string
 * @returns string of exactly 10 digits
 * @throws if value is not a string of exactly 10 digits (excluding leading 0 or 1)
 */
export const phone10 = (value: string) => {
  const valid = phone(value);
  if (valid.length === 10) {
    return valid;
  }
  throw makeError(value, 'a valid US 10-digit phone number');
};

/**
 * Format phone number as “(NNN) NNN-NNNN ext N…”
 * @param value string
 * @returns string of formatted phone number
 * @throws if value is not a string of at least 10 digits (excluding leading 0 or 1)
 */
export const prettyPhone = (value: string) => {
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
export const postalCodeUs5 = (value: string) =>
  to(
    digits,
    limit(5),
    string,
    length(5),
    or(makeError(value, 'a valid US postal code')),
  )(value);

/**
 * Limit the value of a `number`, characters in a `string`, or items in an
 * `array`
 * @param max number
 * @returns function to limit given input
 */
export const limit = (max: number) =>
/**
 * Limit the value of a `number`, characters in a `string`, or items in an
 * `array`
 * @param value number | string | array
 * @returns number | string | array limited to `max`
 * @throws if value is not a number, string, or array
 */
<T extends (number | string | any[] | readonly any[])>(value: T) => {
  if (is(number)(value)) {
    return Math.min(value, max) as T;
  }
  if (is(string)(value)) {
    return value.slice(0, max) as T;
  }
  if (is(array)(value)) {
    return value.slice(0, max) as T;
  }
  throw makeError(value, `able to be limited to ${max}`);
};

/**
 * Split a string into an array. Optionally define a separator RegExp. Default
 * separator is comma, newline, space, tab.
 * @param separator default: `/[,\r\n\s]+/g` commas, newlines, spaces, tabs
 * @param limit optionally limit the number of items in result
 */
export const split = (separator = /[,\r\n\s]+/g, limit?: number) =>
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
(value: string) =>
  value.split(separator, limit)
    .map(spaces) // remove irregular spaces
    .map(trim)
    .filter(nonempty);

//#endregion

//#region Types
// -----------------------------------------------------------------------------

export type Constructor = new (...args: any[]) => any;

export type UnaryFunction<P = any, R = any> = (value: P) => R;

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

export interface Is<A extends UnaryFunction> {
  (value: unknown): value is ReturnType<A>;
  [SymbolGuardTest]: <T extends ReturnType<A>>(value: T) => T;
}

export interface Not<A extends UnaryFunction> {
  <T>(value: T): value is T extends ReturnType<A> ? never : T;
  [SymbolGuardTest]: <T>(value: T) => T extends ReturnType<A> ? never : T;
}

export type UnaryReturnType<T extends UnaryFunction> = T extends Is<infer R> ? ReturnType<R>
  : (T extends Not<infer S> ? ReturnType<S> : ReturnType<T>);

export type UnaryExtends<A extends UnaryFunction, B extends UnaryFunction> =
  UnaryReturnType<A> extends UnaryReturnType<B> ? UnaryReturnType<A>
    : UnaryReturnType<B>;

export interface Otherwise<T> {
  value: T;
  [SymbolOtherwise]: boolean;
}

export interface ToResult<I, O> {
  <Input>(value: Input): Input extends I ? (Input extends O ? Input : O) : never;
}

export interface OrResult<I, O, Y> {
  <Input>(
    value: Input,
  ): (Input extends I ? (Input extends O ? Input : O) : never) | Exclude<Y, Error>;
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
  >(
    a: A,
    b: B,
    c: C,
  ): ToResult<Parameters<A>[0], UnaryReturnType<C>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
  ): ToResult<Parameters<A>[0], UnaryReturnType<D>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
  ): ToResult<Parameters<A>[0], UnaryReturnType<E>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
    F extends (value: UnaryExtends<D, E>) => any,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
  ): ToResult<Parameters<A>[0], UnaryReturnType<F>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
    F extends (value: UnaryExtends<D, E>) => any,
    G extends (value: UnaryExtends<E, F>) => any,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
  ): ToResult<Parameters<A>[0], UnaryReturnType<G>>;
  <
    A extends UnaryFunction,
    B extends (value: UnaryReturnType<A>) => any,
    C extends (value: UnaryExtends<A, B>) => any,
    D extends (value: UnaryExtends<B, C>) => any,
    E extends (value: UnaryExtends<C, D>) => any,
    F extends (value: UnaryExtends<D, E>) => any,
    G extends (value: UnaryExtends<E, F>) => any,
    H extends (value: UnaryExtends<F, G>) => any,
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
  ): ToResult<Parameters<A>[0], UnaryReturnType<H>>;
  <AZ extends UnaryFunction>(
    ...az: AZ[]
  ): ToResult<Parameters<AZ>[0], UnaryReturnType<AZ>>;
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
