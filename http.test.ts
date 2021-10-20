import test from 'ava';
import 'isomorphic-fetch';
import {
  HttpError, isFormOrJsonPostRequest, readBody,
  statusCodeFromError, jsonResponse, readResponseError, fetchOk, fetchPass,
} from './http';

const testGetRequest = new Request('/foo');

const testPutRequest = new Request('/foo', {
  method: 'PUT',
});

const testJsonRequest = new Request('/foo', {
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

const testFormRequest = new Request('/foo', {
  method: 'POST',
  headers: new Headers({
    'content-type': 'form-data',
  }),
  body: new URLSearchParams({ foo: 'bar' }),
});

// const testFormResponse = new Response(
//   new URLSearchParams({ foo: 'bar' }),
// );
// const testFormResponse = new Response((() => {
//   const formData = new FormData();
//   formData.append('foo', 'bar');
//   return formData;
// })));

const testTextRequest = new Request('/foo', {
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

const testBlobRequest = new Request('/foo', {
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

test('statusCodeFromError', (t) => {
  t.is(statusCodeFromError(new Error('foo')), 500);
  t.is(statusCodeFromError({}), undefined);
});

test('isFormOrJsonPostRequest', (t) => {
  t.throws(() => { isFormOrJsonPostRequest(testGetRequest); });
  t.throws(() => { isFormOrJsonPostRequest(testPutRequest); });
  t.throws(() => { isFormOrJsonPostRequest(testTextRequest); });
  t.throws(() => { isFormOrJsonPostRequest(testBlobRequest); });
  t.notThrows(() => { isFormOrJsonPostRequest(testJsonRequest); });
  t.notThrows(() => { isFormOrJsonPostRequest(testFormRequest); });
});

test('readBody', async (t) => {
  await t.throwsAsync(() => readBody({} as Response), { instanceOf: TypeError });
  await t.throwsAsync(() => readBody(testJsonResponseInvalid));
  t.is(await readBody(testTextRequest), 'foo: bar');
  t.deepEqual(await readBody(testJsonRequest), { foo: 'bar' });
  t.deepEqual(await readBody(testBlobRequest), new Uint8Array([1, 2, 3, 4]).buffer);
  t.is(await readBody(testTextResponse), 'foo: bar');
  t.deepEqual(await readBody(testJsonResponse), { foo: 'bar' });
  t.deepEqual(await readBody(testBlobResponse), new Uint8Array([1, 2, 3, 4]).buffer);
  // TODO: unable to test Response.formData()
  // t.notThrows(() => { readBody(formResponse); });
});

test('jsonResponse', (t) => {
  const original = jsonResponse({ foo: 'bar' });
  const duplicate = jsonResponse(original);
  t.is(original, duplicate);
});

test('readResponseError', async (t) => {
  const explicit = jsonResponse(new HttpError('not found', 404));
  const explicitError = await readResponseError(explicit);
  t.like(explicitError, { message: 'not found', status: 404 });
  const implicit = jsonResponse('', 404);
  const implicitError = await readResponseError(implicit);
  t.like(implicitError, { status: 404 });
});

test('fetchOk', async (t) => {
  await Promise.all([
    t.notThrowsAsync(() => fetchOk('https://httpstat.us/200')),
    t.notThrowsAsync(() => fetchOk('https://httpstat.us/301')),
    t.throwsAsync(() => fetchOk('https://httpstat.us/301', { redirect: 'manual' }), { instanceOf: HttpError }),
    t.throwsAsync(() => fetchOk('https://httpstat.us/301', { redirect: 'error' }), { instanceOf: Error }),
    t.throwsAsync(() => fetchOk('https://httpstat.us/404'), { instanceOf: HttpError }),
    t.throwsAsync(() => fetchOk('https://httpstat.us/500'), { instanceOf: HttpError }),
  ]);
});

test('fetchPass', async (t) => {
  await Promise.all([
    t.notThrowsAsync(() => fetchPass(200, 'https://httpstat.us/200')),
    t.notThrowsAsync(() => fetchPass(200, 'https://httpstat.us/301')),
    t.throwsAsync(() => fetchPass(200, 'https://httpstat.us/301', { redirect: 'manual' }), { instanceOf: HttpError }),
    t.notThrowsAsync(() => fetchPass(301, 'https://httpstat.us/301', { redirect: 'manual' })),
    t.throwsAsync(() => fetchPass(200, 'https://httpstat.us/301', { redirect: 'error' }), { instanceOf: Error }),
    t.throwsAsync(() => fetchPass([200, 404], 'https://httpstat.us/403'), { instanceOf: HttpError }),
    t.notThrowsAsync(() => fetchPass([200, 404], 'https://httpstat.us/404')),
    t.throwsAsync(() => fetchPass(200, 'https://httpstat.us/500'), { instanceOf: HttpError }),
  ]);
});
