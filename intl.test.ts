import test from 'ava';
import { conjunction } from './intl';

test('conjunction', (t) => {
  t.is(conjunction('1'), '1');
  t.is(conjunction(['1', '2']), '1 and 2');
  t.is(conjunction(['1', '2', '3']), '1, 2, and 3');
});
