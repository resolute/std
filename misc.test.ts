import { equals, strict } from './deps.test.ts';

import { mapKeyAValB, mapKeys, properName } from './misc.ts';

Deno.test('mapKeyAValB', () => {
  const a = { foo: 'a', bar: 'b', baz: 'c' } as const;
  const b = { a: 1, b: true } as const;
  const c = mapKeyAValB(a, b);
  equals(c, { foo: 1, bar: true });
});

Deno.test('mapKeys', () => {
  const a = { a: 'foo', b: 'bar', c: 'baz' } as const;
  const b = { a: 1, b: true } as const;
  const c = mapKeys(a, b);
  equals(c, { foo: 1, bar: true });
});

Deno.test('properName', () => {
  strict(properName('  ol\' mcdonald, iv '), 'Ol’ McDonald, IV');
});
