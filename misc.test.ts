import { equals, strict } from './deps.test.ts';

import { mapObject, properName } from './misc.ts';

Deno.test('mapObject', () => {
  const a = { foo: 'a', bar: 'b', baz: 'c' } as const;
  const b = { a: 1, b: true } as const;
  const c = mapObject(a, b);
  equals(c, { foo: 1, bar: true });
});

Deno.test('properName', () => {
  strict(properName('  ol\' mcdonald, iv '), 'Ol’ McDonald, IV');
});
