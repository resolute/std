# Standard JavaScript/TypeScript Library

Well tested TypeScript functions suitable for use in browser, service worker,
and Node.js contexts.

## Installation

```shell
npm i @resolute/std
```

## Usage

```js
import { fetchThrow } from '@resolute/std/http';
try {
  await fetchThrow(500, 'https://httpstat.us/500')
} catch (error) {
  // `fetch` doesn’t throw on 500 responses.
  // `fetchThrow` does :)
}
```

### [`coerce`](https://github.com/resolute/std/blob/master/coerce.ts)

* `coerce`: Coerce input to types and formats with sanitizers and validators.
  ```js
  coerce(string, trim, nonEmpty)(' foo '); // 'foo'
  coerce(string, trim, nonEmpty)('     '); // TypeError
  coerce(string, trim, nonEmpty)('     ', undefined); // undefined
  ```

### [`color`](https://github.com/resolute/std/blob/master/color.ts)

Convert between hex, `[r,g,b]`, and integer representations of colors.
Additionally blend between colors.

### [`control`](https://github.com/resolute/std/blob/master/control.ts)

Runtime and control flow helpers.

* `retry`: Wrap an async or promise-returning function that when called will
  retry up to `retries` times or until it resolves, whichever comes first.
  ```js
  await retry(fetch('https://…'));
  ```

* `sleep`: Promisify `setTimeout`. Returns a Promise that settles with the
  return of the passed function after `delay` milliseconds.
  ```js
  await sleep(1000, (then) => performance.now() - then, performance.now());
  // ~1000
  ```

* `defer`: Create and return a new promise along with its resolve and reject
  parameters. Especially useful when “promisifying” a callback style API.
  ```js
  const [promise, resolve, reject] = defer();
  addEventListener('something', resolve);
  addEventListener('somethingelse', reject);
  return promise;
  ```

* `once`: Wrap a function that to be executed once. Subsequent calls will return
  the value of the first (and only) invocation.
  ```js
  let value = 0;
  const incr = () => ++value;
  once(incr)(); // 1
  once(incr)(); // 1
  incr(); // 2
  once(incr)(); // 1
  ```

### [`cookie`](https://github.com/resolute/std/blob/master/cookie.ts)

Parse and stringify cookies. Methods available for DOM and service worker
contexts.

### [`ease`](https://github.com/resolute/std/blob/master/ease.ts)

Easing functions from [easings.net](https://easings.net/).

### [`http`](https://github.com/resolute/std/blob/master/http.ts)

Helpers for interacting with `Request` and `Response` objects.

* `method`: Throw if value is not in list.
  ```js
  method(['GET', 'POST'])('POST'); // 'POST'
  method(['GET', 'POST'])('PUT'); // HttpError: Method must be within [GET, POST]
  ```

* `readBody`: Invoke the correct Request/Response body reading method
  (json/text/formData/arrayBuffer) based on the content-type header.
  ```js
  const body = await readBody(anyRequest);
  ```

### [`intl`](https://github.com/resolute/std/blob/master/intl.ts)

Intl helpers. For now, only consists of conjunction which transforms an array to
a en/US grammar list.

### [`math`](https://github.com/resolute/std/blob/master/math.ts)

Ranging, scaling, random integers, and more.

### [`mime`](https://github.com/resolute/std/blob/master/mime.ts)

Validate mime types and file extensions as well as convert from mime to
extension and visa versa.

* `extToMime`: Convert a file extension to a mime type.
  ```js
  extToMime('avif'); // 'image/avif'
  extToMime('.avif'); // 'image/avif'
  extToMime('foo'); // TypeError “foo” is not a valid extension.
  ```

* `mimeToExt`: Convert a mime type to a file extension.
  ```js
  mimeToExt('image/avif'); // 'avif'
  mimeToExt('text/html; charset=utf-8'); // 'html'
  mimeToExt('foo/bar'); // TypeError “foo/bar” is not a valid mime type.
  ```

### [`misc`](https://github.com/resolute/std/blob/master/misc.ts)

Miscellaneous utilities without a home.

### [`promise`](https://github.com/resolute/std/blob/master/promise.ts)

Promise keeper utility.

* `keeper`: Provides caching behavior to an expensive function. Can perform
  periodic background refresh.

TODO: document missing items.
