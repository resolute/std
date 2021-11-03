import { assertStrictEquals } from 'https://deno.land/std@0.113.0/testing/asserts.ts';

import { conjunction } from './intl.ts';

Deno.test('conjunction', () => {
  assertStrictEquals(conjunction('1'), '1');
  assertStrictEquals(conjunction(['1', '2']), '1 and 2');
  assertStrictEquals(conjunction(['1', '2', '3']), '1, 2, and 3');
});
