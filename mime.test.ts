import { strict, test, throws } from './assert.test.ts';

import { extToMime, mimeToExt } from './mime.ts';

test('mimeToExt', () => {
  strict(mimeToExt('image/avif'), 'avif');
  strict(mimeToExt('text/html; charset=utf-8'), 'html');
  throws(() => mimeToExt('foo/bar'));
});

test('extToMime', () => {
  strict(extToMime('avif'), 'image/avif');
  strict(extToMime('.avif'), 'image/avif');
  throws(() => extToMime('foo'));
});
