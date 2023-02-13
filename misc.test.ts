import { equals, strict } from './deps.test.ts';

import { mapKeyAValB, mapKeys, properName, unique } from './misc.ts';

Deno.test('mapKeyAValB', () => {
  const a = { foo: 'a', bar: 'b', baz: 'c' } as const;
  const b = { a: 1, b: true } as const;
  const c = mapKeyAValB(a, b);
  equals(c, { foo: 1, bar: true });
});

Deno.test('mapKeys', () => {
  const a = { a: 'foo', b: 2, c: 'baz' } as const;
  const b = { a: 1, b: true } as const;
  const c = mapKeys(a, b);
  equals(c, { foo: 1, 2: true });
});

Deno.test('properName', () => {
  strict(properName('  ol\' mcdonald, iv '), 'Ol’ McDonald, IV');
});

Deno.test('misc/unique', () => {
  equals([1, 1, 2, 2, 3].filter(unique), [1, 2, 3]);
});
