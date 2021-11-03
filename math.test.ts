import { equals, strict } from './deps.test.ts';

import { clamp, clamp01, divide, randomIntExclusiveMax, range, scale } from './math.ts';

Deno.test('clamp', () => {
  strict(clamp01(1.01), 1);
  strict(clamp01(-0), 0);
  strict(clamp()(-0.01), 0);
  strict(clamp(5, 10)(-1), 5);
  strict(clamp(5, 10)(11), 10);
});

Deno.test('range', () => {
  const ranger = range(0, 10);
  strict(ranger(0.5), 5);
  strict(ranger(1.5), 15);
  strict(ranger(-0.5), -5);
});

Deno.test('scale', () => {
  const scaler = scale(0, 10);
  strict(scaler(5), 0.5);
  strict(scaler(15), 1.5);
  strict(scaler(-5), -0.5);
});

Deno.test('divide', () => {
  equals(
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
  strict(alwaysMin, 0);
  const value = randomIntExclusiveMax(0, 2);
  strict(value === 0 || value === 1, true);
});
