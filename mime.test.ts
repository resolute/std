import test from 'ava';
import { extToMime, mimeToExt } from './mime';

test('mimeToExt', (t) => {
  t.is(mimeToExt('image/avif'), 'avif');
  t.is(mimeToExt('text/html; charset=utf-8'), 'html');
  t.throws(() => { mimeToExt('foo/bar'); });
});

test('extToMime', (t) => {
  t.is(extToMime('avif'), 'image/avif');
  t.is(extToMime('.avif'), 'image/avif');
  t.throws(() => { extToMime('foo'); });
});
