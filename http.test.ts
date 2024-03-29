import { wrapError } from './coerce.ts';
import { equals, exists, matches, strict, throws, throwsAsync } from './deps.test.ts';

import {
  cancelBody,
  fetchOk,
  fetchPass,
  fetchThrow500,
  HttpError,
  jsonResponse,
  method,
  readBody,
  readResponseError,
  statusCodeFromError,
  validDataPostRequest,
} from './http.ts';

const BASE_TEST_HTTP_URL = 'https://httpbin.org/status';
// const BASE_TEST_HTTP_URL = 'https://httpstat.us';

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

const testJsonResponse = new Response('{"foo":"bar"}', {
  headers: new Headers({
    'content-type': 'application/json',
  }),
});

const testJsonResponseInvalid = new Response('invalid json', {
  headers: new Headers({
    'content-type': 'application/json',
  }),
});

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
  strict(statusCodeFromError(new Error('foo')), 500);
  strict(statusCodeFromError({}), undefined);
});

Deno.test('method', () => {
  strict(method(['GET'])(testGetRequest), testGetRequest);
  throws(() => method(['POST'])(testGetRequest), HttpError);
});

Deno.test('isFormOrJsonPostRequest', () => {
  throws(() => validDataPostRequest(testGetRequest), HttpError);
  throws(() => validDataPostRequest(testPutRequest), HttpError);
  throws(() => validDataPostRequest(testTextRequest), HttpError);
  throws(() => validDataPostRequest(testBlobRequest), HttpError);
  strict(validDataPostRequest(testJsonRequest), testJsonRequest);
  strict(validDataPostRequest(testFormRequest), testFormRequest);
});

Deno.test('readBody', async () => {
  await throwsAsync(() => readBody({} as Response), TypeError);
  await throwsAsync(() => readBody(testJsonResponseInvalid));
  strict(await readBody(jsonResponse()), null);
  strict(await readBody(testTextRequest), 'foo: bar');
  strict(await readBody(testTextResponse), 'foo: bar');
  equals(await readBody(testJsonRequest), { foo: 'bar' });
  equals(await readBody(testJsonResponse), { foo: 'bar' });
  equals(await readBody(testBlobRequest), new Uint8Array([1, 2, 3, 4]).buffer);
  equals(await readBody(testBlobResponse), new Uint8Array([1, 2, 3, 4]).buffer);
  equals(await readBody(testUrlSearchParamsResponse), { foo: 'bar' });
  equals(await readBody(testFormDataResponse), { foo: 'bar' });
});

Deno.test('jsonResponse', async () => {
  const original = jsonResponse({ foo: 'bar' });
  equals(await original.json(), { foo: 'bar' });
  const duplicate = jsonResponse(original);
  strict(original, duplicate);
  strict(jsonResponse().status, 204);
  strict(jsonResponse(null).status, 204);
  strict(jsonResponse(null, 200).status, 204);
  strict(jsonResponse(false).status, 200);
  strict(await jsonResponse(false).json(), false);
});

Deno.test('readResponseError', async () => {
  const explicit = jsonResponse(new HttpError('not found', 404));
  const explicitError = await readResponseError(explicit);
  matches(explicitError, { message: 'not found', status: 404 });
  const implicit = jsonResponse('', 404);
  const implicitError = await readResponseError(implicit);
  matches(implicitError, { status: 404 });
});

Deno.test('fetchOk', () =>
  Promise.all([
    fetchOk(`${BASE_TEST_HTTP_URL}/200`).then(cancelBody).then(exists),
    fetchOk(`${BASE_TEST_HTTP_URL}/301`).then(cancelBody).then(exists),
    throwsAsync(() => fetchOk(`${BASE_TEST_HTTP_URL}/301`, { redirect: 'manual' }), HttpError),
    throwsAsync(() => fetchOk(`${BASE_TEST_HTTP_URL}/301`, { redirect: 'error' }), Error),
    throwsAsync(() => fetchOk(`${BASE_TEST_HTTP_URL}/404`), HttpError),
    throwsAsync(() => fetchOk(`${BASE_TEST_HTTP_URL}/500`), HttpError),
  ]).then(() => {}));

Deno.test('fetchPass', () =>
  Promise.all([
    fetchPass(200, `${BASE_TEST_HTTP_URL}/200`).then(readBody).then(exists),
    fetchPass(200, `${BASE_TEST_HTTP_URL}/301`).then(readBody).then(exists),
    fetchPass([200, 404], `${BASE_TEST_HTTP_URL}/404`).then(readBody).then(exists),
    fetchPass(301, `${BASE_TEST_HTTP_URL}/301`, { redirect: 'manual' }).then(readBody).then(
      exists,
    ),
    throwsAsync(
      () => fetchPass(200, `${BASE_TEST_HTTP_URL}/301`, { redirect: 'manual' }),
      HttpError,
    ),
    throwsAsync(
      () => fetchPass(200, `${BASE_TEST_HTTP_URL}/301`, { redirect: 'error' }),
      Error,
    ),
    throwsAsync(() => fetchPass([200, 404], `${BASE_TEST_HTTP_URL}/403`), HttpError),
    throwsAsync(() => fetchPass(200, `${BASE_TEST_HTTP_URL}/500`), HttpError),
  ]).then(() => {}));

Deno.test('fetchThrow500', () =>
  Promise.all([
    fetchThrow500(`${BASE_TEST_HTTP_URL}/200`).then(readBody).then(exists),
    throwsAsync(() => fetchThrow500(`${BASE_TEST_HTTP_URL}/500`)),
  ]).then(() => {}));

Deno.test('HttpError', () => {
  equals(wrapError(SyntaxError)('foo'), new SyntaxError('foo'));
  equals(wrapError(HttpError)('foo'), new HttpError('foo'));
});
