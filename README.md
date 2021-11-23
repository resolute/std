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

```js
import { fetchOk } from '@resolute/std/http';
try {
  await fetchOk('https://httpstat.us/500');
} catch (error) {
  // `fetch` doesn’t throw on 500 responses.
  // `fetchOk` does :)
}
```

## [`./coerce`](https://github.com/resolute/std/blob/master/coerce.ts)

Type validation and sanitization.

### `coerce`

Coerce input to types and formats with sanitizers and validators.

```js
import { coerce, length, not, string, trim } from '@resolute/std/coerce';
coerce(string, trim, not(length(0)))(' foo '); // 'foo'
coerce(string, trim, not(length(0)))(' '); // TypeError
coerce(string, trim, not(length(0)))(' ', undefined); // undefined
```

## [`./color`](https://github.com/resolute/std/blob/master/color.ts)

Convert between hex, RGB array, and integer representations of colors. Additionally blend between
colors.

### `parse`

Convert a hex color string #xxxxxx or rgb array [r, g, b] to an integer.

```js
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

```js
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

```js
await retry(fetch)('https://…');
```

### `sleep`

Promisify `setTimeout`. Returns a Promise that settles with the return of the passed function after
`delay` milliseconds.

```js
await sleep(1000, (then) => Date.now() - then, Date.now());
// ~1000
```

### `defer`

Create and return a new promise along with its resolve and reject parameters. Especially useful when
“promisifying” a callback style API.

```js
const [promise, resolve, reject] = defer();
addEventListener('success', resolve);
addEventListener('error', reject);
return promise;
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

## [`./cookie`](https://github.com/resolute/std/blob/master/cookie.ts)

Parse and stringify cookies. Methods available for DOM and service worker contexts.

## [`./ease`](https://github.com/resolute/std/blob/master/ease.ts)

Easing functions from [easings.net](https://easings.net/).

## [`./http`](https://github.com/resolute/std/blob/master/http.ts)

Helpers for interacting with `Request` and `Response` objects.

### `method`

Throw if value is not in list.

```js
method(['GET', 'POST'])('POST'); // 'POST'
method(['GET', 'POST'])('PUT'); // HttpError: Method must be within [GET, POST]
```

### `readBody`

Invoke the correct Request/Response body reading method (json/text/formData/arrayBuffer) based on
the content-type header.

```js
const body = await readBody(anyRequest);
```

## [`./intl`](https://github.com/resolute/std/blob/master/intl.ts)

Intl helpers.

### `conjunction`

Transform an array to a en/US grammar list.

```js
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

```js
range(0, 10)(0.5); // 5
range(0, 10)(1.5); // 15
range(0, 10)(-0.5); // -5
```

### `scale`

Define a scaling function to calculate the percentage of `value` relative to `min` and `max`.

```js
scale(0, 10)(5); // 0.5
scale(0, 10)(15); // 1.5
scale(0, 10)(-5); // -0.5
```

### `clamp`

Define a clamping function to keep a `value` bound to the `min` and `max`.

```js
clamp(0, 1)(0.5); // 0.5
clamp(0, 1)(5); // 1
clamp(0, 1)(-5); // 0
```

### `divide`

Generate a scale for each member of an array with (optional) `overlap`. Use with array.map() to
generate the divided scales.

```js
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

```js
extToMime('avif'); // 'image/avif'
extToMime('.avif'); // 'image/avif'
extToMime('foo'); // TypeError “foo” is not a valid extension.
```

### `mimeToExt`

Convert a mime type to a file extension.

```js
mimeToExt('image/avif'); // 'avif'
mimeToExt('text/html; charset=utf-8'); // 'html'
mimeToExt('foo/bar'); // TypeError “foo/bar” is not a valid mime type.
```

## [`./misc`](https://github.com/resolute/std/blob/master/misc.ts)

Miscellaneous utilities without a home.

### `mapObject`

Match the keys of `a` to the values of `b` by matching the values of `a` to the keys of `b` and
eliminate undefined/null values.

```js
const a = { foo: 'a', bar: 'b', baz: 'c' };
const b = { a: 1, b: 2 };
mapObject(a, b); // { foo: 1, bar: 2 }
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

```js
const kept = keeper(expensive);
kept.stale(); // throws because cache is empty
await kept.get(); // triggers expensive() because cache is empty
kept.stale(); // sync returns the resolved value of expensive()
kept.fresh(); // causes a new expensive() invocation
```

TODO: document missing items
