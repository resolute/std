import { assertEquals, assertStrictEquals } from 'https://deno.land/std@0.112.0/testing/asserts.ts';

import { mapObject, properName } from './misc.ts';

Deno.test('mapObject', () => {
  const a = { foo: 'a', bar: 'b', baz: 'c' };
  const b = { a: 1, b: 2 };
  assertEquals(mapObject(a as { foo: 'a'; bar: 'b' }, b), { foo: 1, bar: 2 });
});

Deno.test('properName', () => {
  assertStrictEquals(properName('  ol\' mcdonald, iv '), 'Ol’ McDonald, IV');
});
