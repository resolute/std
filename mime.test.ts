import { assertStrictEquals, assertThrows } from 'https://deno.land/std@0.112.0/testing/asserts.ts';

import { extToMime, mimeToExt } from './mime.ts';

Deno.test('mimeToExt', () => {
  assertStrictEquals(mimeToExt('image/avif'), 'avif');
  assertStrictEquals(mimeToExt('text/html; charset=utf-8'), 'html');
  assertThrows(() => mimeToExt('foo/bar'));
});

Deno.test('extToMime', () => {
  assertStrictEquals(extToMime('avif'), 'image/avif');
  assertStrictEquals(extToMime('.avif'), 'image/avif');
  assertThrows(() => extToMime('foo'));
});
