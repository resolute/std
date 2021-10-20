import test from 'ava';
import {
  divide, randomIntExclusiveMax, range, scale,
} from './math';

test('range', (t) => {
  const ranger = range(0, 10);
  t.is(ranger(0.5), 5);
  t.is(ranger(1.5), 15);
  t.is(ranger(-0.5), -5);
});

test('scale', (t) => {
  const scaler = scale(0, 10);
  t.is(scaler(5), 0.5);
  t.is(scaler(15), 1.5);
  t.is(scaler(-5), -0.5);
});

test('divide', (t) => {
  t.deepEqual(
    [1, 2, 3]
      .map(divide())
      .map(([, scaler]) => [
        Math.round(scaler(0 / 3)), // 0%
        Math.round(scaler(1 / 3)), // 33%
        Math.round(scaler(2 / 3)), // 66%
        Math.round(scaler(3 / 3)), // 100%
      ]),
    [
      [0, 1, 2, 3], // 1
      [-1, 0, 1, 2], // 2
      [-2, -1, 0, 1], // 3
    ],
  );
});

test('randomIntExclusiveMax', (t) => {
  const alwaysMin = randomIntExclusiveMax(0, 1);
  t.is(alwaysMin, 0);
  const value = randomIntExclusiveMax(0, 2);
  t.true(value === 0 || value === 1);
});
