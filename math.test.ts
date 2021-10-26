import { assertEquals, assertStrictEquals } from 'https://deno.land/std@0.112.0/testing/asserts.ts';

import { divide, randomIntExclusiveMax, range, scale } from './math.ts';

Deno.test('range', () => {
  const ranger = range(0, 10);
  assertStrictEquals(ranger(0.5), 5);
  assertStrictEquals(ranger(1.5), 15);
  assertStrictEquals(ranger(-0.5), -5);
});

Deno.test('scale', () => {
  const scaler = scale(0, 10);
  assertStrictEquals(scaler(5), 0.5);
  assertStrictEquals(scaler(15), 1.5);
  assertStrictEquals(scaler(-5), -0.5);
});

Deno.test('divide', () => {
  assertEquals(
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

Deno.test('randomIntExclusiveMax', () => {
  const alwaysMin = randomIntExclusiveMax(0, 1);
  assertStrictEquals(alwaysMin, 0);
  const value = randomIntExclusiveMax(0, 2);
  assertStrictEquals(value === 0 || value === 1, true);
});
