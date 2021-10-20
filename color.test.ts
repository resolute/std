import test from 'ava';
import {
  blend, fromHex, fromRgb, parse, toHex, toRgb,
} from './color';

test('parse', (t) => {
  t.deepEqual(toRgb(parse('#f00')), [255, 0, 0]);
  t.deepEqual(toRgb(fromHex('#f00')), [255, 0, 0]);
  t.is(toHex(parse([255, 0, 0])), '#ff0000');
  t.is(toHex(fromRgb([255, 0, 0])), '#ff0000');
  t.is(parse(0), 0);
  t.is(parse(undefined as unknown as number), 0);
});

test('blend', (t) => {
  const blender = blend('#000', '#888');
  t.is(toHex(blender(0.5)), '#444444');
});
