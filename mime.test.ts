import { strict, throws } from './deps.test.ts';

import { extToMime, mimeToExt } from './mime.ts';

Deno.test('mimeToExt', () => {
  strict(mimeToExt('image/avif'), 'avif');
  strict(mimeToExt('text/html; charset=utf-8'), 'html');
  throws(() => mimeToExt('foo/bar'));
});

Deno.test('extToMime', () => {
  strict(extToMime('avif'), 'image/avif');
  strict(extToMime('.avif'), 'image/avif');
  throws(() => extToMime('foo'));
});
