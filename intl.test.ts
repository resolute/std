import { assertStrictEquals } from 'https://deno.land/std@0.113.0/testing/asserts.ts';

import { conjunction, plural } from './intl.ts';

Deno.test('intl/conjunction', () => {
  assertStrictEquals(conjunction('1'), '1');
  assertStrictEquals(conjunction(['1', '2']), '1 and 2');
  assertStrictEquals(conjunction(['1', '2', '3']), '1, 2, and 3');
});

Deno.test('intl/plural', () => {
  assertStrictEquals(plural(1), '');
  assertStrictEquals(plural(0), 's');
  assertStrictEquals(plural(2), 's');
  assertStrictEquals(plural(1, 'frog', 'frogs'), 'frog');
  assertStrictEquals(plural(2, 'frog', 'frogs'), 'frogs');
});
