import { equals, strict, test } from './assert.test.ts';

import { blend, fromHex, fromRgb, parse, toHex, toRgb } from './color.ts';

test('parse', () => {
  equals(toRgb(parse('#f00')), [255, 0, 0]);
  equals(toRgb(fromHex('#f00')), [255, 0, 0]);
  strict(toHex(parse([255, 0, 0])), '#ff0000');
  strict(toHex(fromRgb([255, 0, 0])), '#ff0000');
  strict(parse(0), 0);
  strict(parse(undefined as unknown as number), 0);
});

test('blend', () => {
  const blender = blend('#000', '#888');
  strict(toHex(blender(0.5)), '#444444');
});
