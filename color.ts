// @ts-ignore tsc non-sense
import { range } from './math.ts';

/**
 * Convert a hex color code string to an integer. Accepts 6-character hex
 * (#0033FF) or shorthand (#03F).
 * @param input hex color code
 */
export const fromHex = (input: string) => {
  // Expand shorthand (e.g. "03F") to (e.g. "0033FF")
  const cleaned = input
    .replace(/^#/, '')
    .replace(/^([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => r + r + g + g + b + b);
  return parseInt(`0x${cleaned}`, 16);
};

/**
 * Convert RGB array to an integer.
 * @param input `[r, g, b]` array
 */
export const fromRgb = ([r, g, b]: number[]) => (r << 16) | (g << 8) | b;

/**
 * Convert an integer to a hex color code.
 * @param input color integer
 */
export const toHex = (input: number) => `#${(`000000${input.toString(16)}`).slice(-6)}`;

/**
 * Convert an integer to a RGB array
 * @param input color integer
 */
export const toRgb = (input: number) => [input >> 16, (input >> 8) & 0xff, input & 0xff] as const;

/**
 * Convert a hex color code or RGB array to an integer.
 * @param input hex color code, RGBA array, or integer
 */
export const parse = (input: string | number | number[]) => {
  if (typeof input === 'number') {
    return input;
  }
  if (typeof input === 'string') {
    return fromHex(input);
  }
  if (Array.isArray(input)) {
    return fromRgb(input);
  }
  return 0;
};

// /**
//  * Represent a Color as a number and provide utilities to express as a hex code
//  * or RGB array.
//  */
// export class Color {
//   public value: number = 0;

//   constructor(input: string | number | number[]) {
//     this.value = parse(input);
//   }

//   public toHex() {
//     return toHex(this.value);
//   }

//   public toRgb() {
//     return toRgb(this.value);
//   }
// }

/**
 * Generate a function that will blend color `a` to color `b` by a percent
 * (fraction).
 *
 * **Warning:** be sure to `clamp()` your percent (fraction).
 * @example
 * ```ts
 * import { blend, toHex } from '@resolute/std/color';
 * const blender = blend('#000', '#888');
 * toHex(blender(0.5)); // #444444
 * ```
 * @param a initial color
 * @param b final color
 */
export const blend = (a: number | string | number[], b: number | string | number[]) => {
  const [R1, G1, B1] = toRgb(parse(a));
  const [R2, G2, B2] = toRgb(parse(b));
  return (
    /**
     * Blend color `a` and color `b` by a specified percent (fraction).
     *
     * **Warning:** be sure to `clamp()` your percent (fraction).
     *
     * @param percent fraction to blend
     */
    (percent: number) =>
      fromRgb([
        range(R1, R2)(percent),
        range(G1, G2)(percent),
        range(B1, B2)(percent),
      ])
  );
};
