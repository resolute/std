import { equals, throwsAsync } from './deps.test.ts';
import { all, defined, limit, LimitReached, stream, transform, unique } from './iterable.ts';

async function* foo() {
  yield 'A';
  yield 'B';
  yield 'C';
  yield 'D';
  yield 'E';
}

async function* bar() {
  yield 'A';
  yield 'A';
  yield 'B';
  yield 'B';
  yield 'C';
}

async function* baz() {
  yield 'A';
  yield undefined;
  yield 'C';
  yield null;
  yield 'E';
}

// async function* qux() {
//   yield 'A';
//   yield undefined;
//   yield 'C';
//   yield null;
//   yield 'E';
//   throw new Error('Fake out!');
// }

Deno.test('iterable/all', async () => {
  equals(await all(foo()), ['A', 'B', 'C', 'D', 'E']);
});

Deno.test('iterable/limit', async () => {
  equals(await all(limit(0)(foo())), []);
  equals(await all(limit(2)(foo())), ['A', 'B']);
});

Deno.test('iterable/limit/abort', async () => {
  const controller = new AbortController();
  equals(await all(limit(2, controller)(foo())), ['A', 'B']);
  throwsAsync(
    () =>
      new Promise((_resolve, reject) => {
        controller.signal.addEventListener('abort', reject);
      }),
    LimitReached,
    'Limit of',
  );
});

Deno.test('iterable/unique', async () => {
  equals(
    await all(unique((input: string) => input)(bar())),
    ['A', 'B', 'C'],
  );
});

Deno.test('iterable/defined', async () => {
  equals(
    await all(defined(baz())),
    ['A', 'C', 'E'],
  );
});

Deno.test('iterable/stream', async () => {
  equals(await all(stream(foo())), ['A', 'B', 'C', 'D', 'E']);
  equals(await all(stream(['A', 'B', 'C', 'D', 'E'])), ['A', 'B', 'C', 'D', 'E']);
  {
    // If we cancel the ReadableStream (before it is locked) we should _not_ get
    // an error. But, we will have zero items iterated.
    const s = stream(foo());
    await s.cancel(new Error('Fake out!'));
    equals(await all(s), []);
  }
});

Deno.test('iterable/transform', async () => {
  const nextChar = async (input: string) => String.fromCharCode(input.charCodeAt(0) + 1);
  equals(
    await all(transform(foo(), nextChar)),
    ['B', 'C', 'D', 'E', 'F'],
  );
});
