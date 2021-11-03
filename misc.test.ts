import { equals, strict } from './deps.test.ts';

import { mapObject, properName } from './misc.ts';

Deno.test('mapObject', () => {
  const a = { foo: 'a', bar: 'b', baz: 'c' };
  const b = { a: 1, b: 2 };
  equals(mapObject(a as { foo: 'a'; bar: 'b' }, b), { foo: 1, bar: 2 });
});

Deno.test('properName', () => {
  strict(properName('  ol\' mcdonald, iv '), 'Ol’ McDonald, IV');
});
