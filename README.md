# Standard TypeScript Development

[![Deno CI](https://github.com/resolute/std/actions/workflows/deno-ci.yml/badge.svg)](https://github.com/resolute/std/actions/workflows/deno-ci.yml)
[![CodeQL](https://github.com/resolute/std/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/resolute/std/actions/workflows/codeql-analysis.yml)
[![codecov](https://codecov.io/gh/resolute/std/branch/master/graph/badge.svg?token=R168PSFGID)](https://codecov.io/gh/resolute/std)

Well tested TypeScript functions suitable for use in browser, service worker, and Node.js contexts.

## Installation

```shell
npm i @resolute/std
```

## Usage

```ts
import { fetchOk } from '@resolute/std/http';
try {
  await fetchOk('https://httpstat.us/500');
} catch (error) {
  // `fetch` doesn’t throw on 500 responses.
  // `fetchOk` does :)
}
```

## [`./coerce`](https://github.com/resolute/std/blob/master/coerce.ts)

Type validation and sanitization. This module contains a handful of utility functions and
“coercers.” Coercers are unary functions that return validated/mutated input, or `throw`. The
utility function `to` (alias `coerce`) allow you to chain these coercers. The `or` utility function
may be used in the chain in order to specify a backup value to be returned instead of throwing an
error.

Additionally, the `is` and `not` utility functions return `true` if a coercer or chain of coercers
(`to(…)`) passes or `false` if it throws.

### Utility Functions

### `to`

Chain unary coercing functions.

```ts
import { nonempty, or, string, to, trim } from '@resolute/std/coerce';
to(string, trim, nonempty)(' foo '); // 'foo'
to(string, trim, nonempty)(' '); // throws TypeError
to(string, trim, nonempty, or(undefined))(' '); // undefined
```

### `or`

Provide a backup value to be used when a coercer fails. If `instanceof Error`, then that error will
be `throw`n. For any other value, it will be returned. The `or(…)` utility function must be the last
parameter in `to`.

```ts
import { or, string, to } from '@resolute/std/coerce';
to(string, or(null))('foo'); // 'foo'
to(string, or(null))(1); // null
to(string, or(new Error('foo')))(1); // throws Error: foo
```

### `is`

Type guard test. Use with any type guard or mutating function that `throw`s on failure (almost all
functions here do). The `is` function will catch the error and return `false`, otherwise it will
return `true`.

```ts
import { is, string } from '@resolute/std/coerce';
is(string)('foo'); // true
is(string)(12345); // false
```

### `not`

Negate type guard test. Use with any type guard or mutating function that `throw`s on failure
(almost all functions here do). The `not` function will catch the error and return `true`, otherwise
it will return `false`. @example

```ts
import { not, string } from '@resolute/std/coerce';
not(string)('foo'); // false
not(string)(12345); // true
```

### Type Guard Functions

### `string`

Returns the input if it is a string. Throws otherwise.

### `number`

Returns the input if it is a finite number. Throws otherwise including when input is `NaN` or
`Infinity`.

## [`./color`](https://github.com/resolute/std/blob/master/color.ts)

Convert between hex, RGB array, and integer representations of colors. Additionally blend between
colors.

### `parse`

Convert a hex color string #xxxxxx or rgb array [r, g, b] to an integer.

```ts
import { parse } from '@resolute/std/color';
parse('#888'); // 8947848
```

### `fromHex`

#XXXXXX → integer

### `fromRgb`

[r, g, b] → integer

### `toHex`

integer → #XXXXXX

### `toRgb`

integer → [r, g, b]

### `blend`

Blend two colors using a percent.

```ts
import { blend, toHex } from '@resolute/std/color';
const blender = blend('#000', '#888');
toHex(blender(0.0)); // #000000 (0%)
toHex(blender(0.5)); // #444444 (50%)
toHex(blender(1.0)); // #888888 (100%)
```

## [`./control`](https://github.com/resolute/std/blob/master/control.ts)

Runtime and control flow helpers.

### `retry`

Wrap an async or promise-returning function that when called will retry up to `retries` times or
until it resolves, whichever comes first.

```ts
import { retry } from '@resolute/std/control';
await retry(fetch)('https://httpstat.us/200');
```

### `sleep`

Promisify `setTimeout`. Returns a Promise that settles with the return of the passed function after
`delay` milliseconds.

```ts
import { sleep } from '@resolute/std/control';
await sleep(1000, (then) => Date.now() - then, Date.now());
// ~1000
```

### `defer`

Create and return a new promise along with its resolve and reject parameters. Especially useful when
“promisifying” a callback style API.

```ts
import { defer } from '@resolute/std/control';
const [promise, resolve, reject] = defer();
addEventListener('success', resolve);
addEventListener('error', reject);
await promise;
```

### `once`

Wrap a function that to be executed once. Subsequent calls will return the value of the first (and
only) invocation.

```ts
import { once } from '@resolute/std/control';
let value = 0;
const incr = () => ++value;
once(incr)(); // 1
once(incr)(); // 1
incr(); // 2
once(incr)(); // 1
```

### `throttle`

Limit the number of invocations of a given function (or different functions) within an interval
window. Useful for avoiding API rate limits.

```ts
import { throttle } from '@resolute/std/control';
const throttled = throttle(1, 1_000)(async () => {});
await throttled();
await throttled(); // 1s later
```

### `debounce`

Returns a function, that, as long as it continues to be invoked (.), will not be triggered (*). The
function will be called after it stops being called for `threshold` milliseconds.

```ts
//  /-- 10s --\ /-- 10s --\ /-- 10s --\
// . . . . . . . . . . . . .           *
import { debounce } from '@resolute/std/control';
let state = 0;
const fn = (value: number) => state += value;
const debounced = debounce(fn, 50);
debounced(1);
debounced(1);
debounced(1);
// state === 1
```

## [`./cookie`](https://github.com/resolute/std/blob/master/cookie.ts)

Parse and stringify cookies. Methods available for DOM and service worker contexts.

## [`./ease`](https://github.com/resolute/std/blob/master/ease.ts)

Easing functions from [easings.net](https://easings.net/).

## [`./http`](https://github.com/resolute/std/blob/master/http.ts)

Helpers for interacting with `Request` and `Response` objects.

### `fetchOk`

Throw if value is not in list.

```ts
import { fetchOk } from '@resolute/std/http';
await fetchOk('https://httpstat.us/500'); // HttpError: HTTP 500 Error
```

### `method`

Throw if value is not in list.

```ts
import { method } from '@resolute/std/http';
method(['GET', 'POST'])(new Request('/', { method: 'POST' })); // 'POST'
method(['GET', 'POST'])(new Request('/', { method: 'PUT' })); // HttpError: Method must be within [GET, POST]
```

### `readBody`

Invoke the correct Request/Response body reading method (json/text/formData/arrayBuffer) based on
the content-type header.

```ts
import { readBody } from '@resolute/std/http';
const body = await readBody(new Response());
```

## [`./intl`](https://github.com/resolute/std/blob/master/intl.ts)

Intl helpers.

### `conjunction`

Transform an array to a en/US grammar list.

```ts
import { conjunction } from '@resolute/std/intl';
conjunction('1'); // '1'
conjunction(['1', '2']); // '1 and 2'
conjunction(['1', '2', '3']); // '1, 2, and 3'
```

## [`./math`](https://github.com/resolute/std/blob/master/math.ts)

Ranging, scaling, random integers, and more.

### `range`

Define a ranging function to calculate the number bound by `min` and `max` and a percent or fraction
(0 through 1). Note: `percent`s (fractions) less than 0 or greater than 1 will return values outside
of the `min`–`max` range.

```ts
import { range } from '@resolute/std/math';
range(0, 10)(0.5); // 5
range(0, 10)(1.5); // 15
range(0, 10)(-0.5); // -5
```

### `scale`

Define a scaling function to calculate the percentage of `value` relative to `min` and `max`.

```ts
import { scale } from '@resolute/std/math';
scale(0, 10)(5); // 0.5
scale(0, 10)(15); // 1.5
scale(0, 10)(-5); // -0.5
```

### `clamp`

Define a clamping function to keep a `value` bound to the `min` and `max`.

```ts
import { clamp } from '@resolute/std/math';
clamp(0, 1)(0.5); // 0.5
clamp(0, 1)(5); // 1
clamp(0, 1)(-5); // 0
```

### `divide`

Generate a scale for each member of an array with (optional) `overlap`. Use with array.map() to
generate the divided scales.

```ts
import { divide } from '@resolute/std/math';
[1, 2, 3]
  .map(divide())
  .map(([value, scaler]) => [
    scaler(0), // 0%
    scaler(1 / 3), // 33%
    scaler(2 / 3), // 66%
    scaler(3 / 3), // 100%
  ]);
// [
//   [  0,  1, 2, 3 ], // 1
//   [ -1,  0, 1, 2 ], // 2
//   [ -2, -1, 0, 1 ]  // 3
// ]
```

### `randomIntInclusive`

Generate a random number **inclusively** between `min` and `max`.

### `randomIntExclusiveMax`

Generate a random number between `min` (**inclusively**) and `max` (**exclusively**).

## [`./mime`](https://github.com/resolute/std/blob/master/mime.ts)

Validate mime types and file extensions as well as convert from mime to extension and visa versa.

### `extToMime`

Convert a file extension to a mime type.

```ts
import { extToMime } from '@resolute/std/mime';
extToMime('avif'); // 'image/avif'
extToMime('.avif'); // 'image/avif'
extToMime('foo'); // TypeError “foo” is not a valid extension.
```

### `mimeToExt`

Convert a mime type to a file extension.

```ts
import { mimeToExt } from '@resolute/std/mime';
mimeToExt('image/avif'); // 'avif'
mimeToExt('text/html; charset=utf-8'); // 'html'
mimeToExt('foo/bar'); // TypeError “foo/bar” is not a valid mime type.
```

## [`./misc`](https://github.com/resolute/std/blob/master/misc.ts)

Miscellaneous utilities without a home.

### `mapKeyAValB`

Match the keys of `a` to the values of `b` by matching the values of `a` to the keys of `b` and
eliminate undefined/null values.

```ts
import { mapKeyAValB } from '@resolute/std/misc';
const a = { foo: 'a', bar: 'b', baz: 'c' };
const b = { a: 1, b: 2 };
mapKeyAValB(a, b); // { foo: 1, bar: 2 }
```

### `mapKeys`

Match the keys of `a` to the values of `b` by matching the values of `a` to the keys of `b` and
eliminate undefined/null values.

```ts
import { mapKeys } from '@resolute/std/misc';
const a = { a: 'foo', b: 'bar', c: 'baz' };
const b = { a: 1, b: 2 };
mapKeys(a, b); // { foo: 1, bar: 2 }
```

### `properName`

Composite coerce function to fix the capitalization of proper nouns.

### `cleanEmail`

Composite coerce function to sanitize an email address.

### `cleanPhone`

Composite coerce function to sanitize and format a 10-digit US phone number.

## [`./promise`](https://github.com/resolute/std/blob/master/promise.ts)

Promise keeper utility.

### `keeper`

Provides caching behavior to an expensive function. Can perform periodic background refresh.

- `.stale()`: _sync_ return what is in the cache; throws if empty
- `.get()`: _async_ return cache or new invocation if cache is empty
- `.fresh()`: _async_ return a new invocation of the expensive function
- `.start(delay)`: continuously invoke expensive function
- `.stop()`: continuous invocation

```ts
import { keeper } from '@resolute/std/promise';
const expensive = async () => Math.random() ** Math.random();
const kept = keeper(expensive);
kept.stale(); // sync; throws because cache is empty
await kept.get(); // invokes expensive() because cache is empty
kept.stale(); // sync; returns the resolved value of expensive()
kept.fresh(); // forces a new expensive() invocation
```

TODO: document missing items
