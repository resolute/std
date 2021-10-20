import test from 'ava';
import { properName, mapObject } from './misc';

test('mapObject', (t) => {
  const a = { foo: 'a', bar: 'b', baz: 'c' };
  const b = { a: 1, b: 2 };
  t.deepEqual(mapObject(a as { foo: 'a', bar: 'b' }, b), { foo: 1, bar: 2 });
});

test('properName', (t) => {
  t.is(properName("  ol' mcdonald, iv "), 'Ol’ McDonald, IV');
});
