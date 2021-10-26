import { assertEquals, assertStrictEquals } from 'https://deno.land/std@0.112.0/testing/asserts.ts';
import {
  blend, fromHex, fromRgb, parse, toHex, toRgb,
} from './color.ts';

Deno.test('parse', () => {
  assertEquals(toRgb(parse('#f00')), [255, 0, 0]);
  assertEquals(toRgb(fromHex('#f00')), [255, 0, 0]);
  assertStrictEquals(toHex(parse([255, 0, 0])), '#ff0000');
  assertStrictEquals(toHex(fromRgb([255, 0, 0])), '#ff0000');
  assertStrictEquals(parse(0), 0);
  assertStrictEquals(parse(undefined as unknown as number), 0);
});

Deno.test('blend', () => {
  const blender = blend('#000', '#888');
  assertStrictEquals(toHex(blender(0.5)), '#444444');
});
