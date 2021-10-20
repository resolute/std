import test from 'ava';
import 'isomorphic-fetch';
import {
  getDomCookies, getRequestCookies, parse, setDomCookie, setResponseCookie, stringify,
} from './cookie';

test('parse', (t) => {
  t.deepEqual(parse('a=b;b=%3D'), { a: 'b', b: '=' });
});

test('stringify', (t) => {
  t.is(stringify('key', 'value'), 'key=value;samesite=none;secure');
  t.is(stringify('key', 'value', {
    expires: new Date(2040, 1, 1),
    samesite: 'lax',
    secure: false,
  }), 'key=value;expires=Wed, 01 Feb 2040 05:00:00 GMT;samesite=lax');
  t.is(stringify('key', ''), 'key=;expires=Thu, 01 Jan 1970 00:00:00 GMT;samesite=none;secure');
});

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface document {
    cookie: string;
  }
}
// @ts-ignore
globalThis.document = { cookie: '' };

test('setDomCookie', (t) => {
  setDomCookie('key', 'value');
  t.is(document.cookie, 'key=value;samesite=none;secure');
});

test('getDomCookies', (t) => {
  t.deepEqual(getDomCookies('a=b;b=%3D'), { a: 'b', b: '=' });
});

test('getRequestCookies', (t) => {
  const request = new Request('/', {
    headers: new Headers({ cookie: 'a=b;b=%3D' }),
  });
  t.deepEqual(getRequestCookies(request), { a: 'b', b: '=' });
});

test('setResponseCookie', (t) => {
  const response = new Response('/');
  setResponseCookie(response, 'a', 'b');
  setResponseCookie(response, 'b', '=');
  t.deepEqual(response.headers.get('set-cookie'), 'a=b;samesite=none;secure, b=%3D;samesite=none;secure');
});
