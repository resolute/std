import {
  assertEquals, assertStrictEquals, assertObjectMatch,
  assertThrowsAsync, assertThrows, assertExists,
} from 'https://deno.land/std@0.112.0/testing/asserts.ts';

import {
  HttpError, isFormOrJsonPostRequest, readBody,
  statusCodeFromError, jsonResponse, readResponseError, fetchOk, fetchPass, method,
} from './http.ts';

const testGetRequest = new Request('file:///foo');

const testPutRequest = new Request('file:///foo', {
  method: 'PUT',
});

const testJsonRequest = new Request('file:///foo', {
  method: 'POST',
  headers: new Headers({
    'content-type': 'application/json',
  }),
  body: '{"foo":"bar"}',
});

const testJsonResponse = new Response(
  '{"foo":"bar"}',
  {
    headers: new Headers({
      'content-type': 'application/json',
    }),
  },
);

const testJsonResponseInvalid = new Response(
  'invalid json string',
  {
    headers: new Headers({
      'content-type': 'application/json',
    }),
  },
);

const testFormRequest = new Request('file:///foo', {
  method: 'POST',
  headers: new Headers({
    'content-type': 'form-data',
  }),
  body: new URLSearchParams({ foo: 'bar' }),
});

const testUrlSearchParamsResponse = new Response(
  new URLSearchParams({ foo: 'bar' }),
);

const testFormDataResponse = new Response((() => {
  const formData = new FormData();
  formData.append('foo', 'bar');
  return formData;
})());

const testTextRequest = new Request('file:///foo', {
  method: 'POST',
  headers: new Headers({
    'content-type': 'text/plain',
  }),
  body: 'foo: bar',
});

const testTextResponse = new Response(
  'foo: bar',
  {
    headers: new Headers({
      'content-type': 'text/plain',
    }),
  },
);

const testBlobRequest = new Request('file:///foo', {
  method: 'POST',
  headers: new Headers({
    'content-type': 'application/octet-stream',
  }),
  body: new Uint8Array([1, 2, 3, 4]),
});

const testBlobResponse = new Response(
  new Uint8Array([1, 2, 3, 4]),
  {
    headers: new Headers({
      'content-type': 'application/octet-stream',
    }),
  },
);

Deno.test('statusCodeFromError', () => {
  assertStrictEquals(statusCodeFromError(new Error('foo')), 500);
  assertStrictEquals(statusCodeFromError({}), undefined);
});

Deno.test('method', () => {
  assertStrictEquals(method(['GET'])(testGetRequest), testGetRequest);
  assertThrows(() => { method(['POST'])(testGetRequest); }, HttpError);
});

Deno.test('isFormOrJsonPostRequest', () => {
  assertThrows(() => { isFormOrJsonPostRequest(testGetRequest); });
  assertThrows(() => { isFormOrJsonPostRequest(testPutRequest); });
  assertThrows(() => { isFormOrJsonPostRequest(testTextRequest); });
  assertThrows(() => { isFormOrJsonPostRequest(testBlobRequest); });
  assertStrictEquals(isFormOrJsonPostRequest(testJsonRequest), testJsonRequest);
  assertStrictEquals(isFormOrJsonPostRequest(testFormRequest), testFormRequest);
});

Deno.test('readBody', async () => {
  await assertThrowsAsync(() => readBody({} as Response), TypeError);
  await assertThrowsAsync(() => readBody(testJsonResponseInvalid));
  assertStrictEquals(await readBody(testTextRequest), 'foo: bar');
  assertEquals(await readBody(testJsonRequest), { foo: 'bar' });
  assertEquals(await readBody(testBlobRequest), new Uint8Array([1, 2, 3, 4]).buffer);
  assertStrictEquals(await readBody(testTextResponse), 'foo: bar');
  assertEquals(await readBody(testJsonResponse), { foo: 'bar' });
  assertEquals(await readBody(testBlobResponse), new Uint8Array([1, 2, 3, 4]).buffer);
  assertEquals(await readBody(testUrlSearchParamsResponse), { foo: 'bar' });
  assertEquals(await readBody(testFormDataResponse), { foo: 'bar' });
});

Deno.test('jsonResponse', () => {
  const original = jsonResponse({ foo: 'bar' });
  const duplicate = jsonResponse(original);
  assertStrictEquals(original, duplicate);
});

Deno.test('readResponseError', async () => {
  const explicit = jsonResponse(new HttpError('not found', 404));
  const explicitError = await readResponseError(explicit);
  assertObjectMatch(explicitError, { message: 'not found', status: 404 });
  const implicit = jsonResponse('', 404);
  const implicitError = await readResponseError(implicit);
  assertObjectMatch(implicitError, { status: 404 });
});

Deno.test('fetchOk', async () => {
  await Promise.all([
    (async () => assertExists(await fetchOk('https://httpstat.us/200').then(readBody)))(),
    (async () => assertExists(await fetchOk('https://httpstat.us/301').then(readBody)))(),
    assertThrowsAsync(() => fetchOk('https://httpstat.us/301', { redirect: 'manual' }), HttpError),
    assertThrowsAsync(() => fetchOk('https://httpstat.us/301', { redirect: 'error' }), Error),
    assertThrowsAsync(() => fetchOk('https://httpstat.us/404'), HttpError),
    assertThrowsAsync(() => fetchOk('https://httpstat.us/500'), HttpError),
  ]);
});

Deno.test('fetchPass', async () => {
  await Promise.all([
    (async () => assertExists(await fetchPass(200, 'https://httpstat.us/200').then(readBody)))(),
    (async () => assertExists(await fetchPass(200, 'https://httpstat.us/301').then(readBody)))(),
    assertThrowsAsync(() => fetchPass(200, 'https://httpstat.us/301', { redirect: 'manual' }), HttpError),
    (async () => assertExists(await fetchPass(301, 'https://httpstat.us/301', { redirect: 'manual' }).then(readBody)))(),
    assertThrowsAsync(() => fetchPass(200, 'https://httpstat.us/301', { redirect: 'error' }), Error),
    assertThrowsAsync(() => fetchPass([200, 404], 'https://httpstat.us/403'), HttpError),
    (async () => assertExists(await fetchPass([200, 404], 'https://httpstat.us/404').then(readBody)))(),
    assertThrowsAsync(() => fetchPass(200, 'https://httpstat.us/500'), HttpError),
  ]);
});
