import { equals, strict } from './deps.test.ts';

import {
  getDomCookies,
  getRequestCookies,
  parse,
  setDomCookie,
  setResponseCookie,
  stringify,
} from './cookie.ts';

Deno.test('parse', () => {
  equals(parse('a=b;b=%3D'), { a: 'b', b: '=' });
});

Deno.test('stringify', () => {
  strict(stringify('key', 'value'), 'key=value;samesite=none;secure');
  strict(
    stringify('key', 'value', {
      expires: new Date('2040-01-01'),
      samesite: 'lax',
      secure: false,
    }),
    'key=value;expires=Sun, 01 Jan 2040 00:00:00 GMT;samesite=lax',
  );
  strict(
    stringify('key', ''),
    'key=;expires=Thu, 01 Jan 1970 00:00:00 GMT;samesite=none;secure',
  );
});

declare global {
  interface document {
    cookie: string;
  }
}

// @ts-ignore TODO reference global document in Deno
globalThis.document = { cookie: '' };

Deno.test('setDomCookie', () => {
  setDomCookie('key', 'value');
  // @ts-ignore TODO reference global document in Deno
  strict(document.cookie, 'key=value;samesite=none;secure');
});

Deno.test('getDomCookies', () => {
  equals(getDomCookies('a=b;b=%3D'), { a: 'b', b: '=' });
});

Deno.test('getRequestCookies', () => {
  const request = new Request('file:///', {
    headers: new Headers({ cookie: 'a=b;b=%3D' }),
  });
  equals(getRequestCookies(request), { a: 'b', b: '=' });
});

Deno.test('setResponseCookie', () => {
  const response = new Response('/');
  setResponseCookie(response, 'a', 'b');
  setResponseCookie(response, 'b', '=');
  equals(
    response.headers.get('set-cookie'),
    'a=b;samesite=none;secure, b=%3D;samesite=none;secure',
  );
});
