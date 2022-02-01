/**
 * Define a ranging function to calculate the number bound by `min` and `max`
 * and a percent or fraction (0 through 1).
 *
 * **Note**: `percent`s (fractions) less than 0 or greater than 1 will return
 * values outside of the `min`–`max` range.
 * @example
 * ```ts
 * import { range } from '@resolute/std/math';
 * const ranger = range(0, 10);
 * ranger(0.5); // 5
 * ranger(1.5); // 15
 * ranger(-0.5); // -5
 * ```
 * @param min lower bound
 * @param max upper bound
 */
export const range = (min: number, max: number) =>
  /**
   * Calculate the number in the defined range (`min`, `max`) specified by
   * `percent`.
   *
   * **Note**: `percent`s (fractions) less than 0 or greater than 1 will return
   * values outside of the `min`–`max` range.
   * @param percent fraction
   */
  (percent: number) => min + (max - min) * percent;

/**
 * Define a scaling function to calculate the percentage of `value` relative to
 * `min` and `max`.
 * @example
 * ```ts
 * import { scale } from '@resolute/std/math';
 * const scaler = scale(0, 10);
 * scaler(5); // 0.5
 * scaler(15); // 1.5
 * scaler(-5); // -0.5
 * ```
 * @param min lower bound
 * @param max upper bound
 */
export const scale = (min: number, max: number) =>
  /**
   * Calculate the percentage of `value` relative to `min` and `max`.
   * @param value relative to `min` and `max`
   */
  (value: number) => (value - min) / (max - min);

/**
 * Define a clamping function to keep a `value` bound to the `min` and
 * `max`.
 * @example
 * ```ts
 * import { clamp } from '@resolute/std/math';
 * clamp(0, 1)(0.5); // 0.5
 * clamp(0, 1)(5); // 1
 * clamp(0, 1)(-5); // 0
 * ```
 * @param min optional lower bound. Default 0
 * @param max optional upper bound. Default 1
 */
export const clamp = (min = 0, max = 1) =>
  /**
   * Clamp a `value` to the bounds defined by `min` and `max`
   * @param value to be bounded to `min` and `max`
   */
  (value: number) => Math.min(max, Math.max(min, value));

export const clamp01 = clamp();

/**
 * Generate a scale for each member of an array with (optional) `overlap`.
 * @example
 * ```ts
 * import { divide } from '@resolute/std/math';
 * [1, 2, 3]
 *   .map(divide())
 *   .map(([value, scaler]) => [
 *     scaler(0),     // 0%
 *     scaler(1 / 3), // 33%
 *     scaler(2 / 3), // 66%
 *     scaler(3 / 3), // 100%
 *   ]);
 * // [
 * //   [  0,  1, 2, 3 ], // 1
 * //   [ -1,  0, 1, 2 ], // 2
 * //   [ -2, -1, 0, 1 ]  // 3
 * // ]
 * ```
 * @param overlap multiplier factor of overlap (1 means no overlap)
 */
export const divide = (overlap = 1) =>
  /**
   * Use with array.map() to generate the divided scales.
   */
  <T>(value: T, index: number, array: T[]) => {
    const unit = 1 / array.length;
    const min = index * unit;
    const max = min + unit * overlap;
    return [value, scale(min, max)] as const;
  };

/**
 * Generate a random number **inclusively** between `min` and `max`.
 */
export const randomIntInclusive = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Generate a random number **exclusively** between `min` and `max`.
 */
export const randomIntExclusiveMax = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min) + min);
