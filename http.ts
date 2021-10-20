import {
  coerce, string, within, array, instance,
} from './coerce.js';
import { conjunction } from './intl.js';

/**
 * HttpError extends Error and adds a `status` property to be used when
 * sending the HTTP response.
 */
export class HttpError extends Error {
  public status: number;

  /**
   * Generate a HTTP error response
   * @param message User-friendly error message
   * @param status HTTP status code
   */
  constructor(message?: string, status = 500) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toString() {
    return this.message;
  }
}

/**
 * Return the `status` of a HttpError, 500 of a `Error`, or otherwise undefined
 * if the value is not an Error.
 */
export const statusCodeFromError = (value: any) => {
  if (value instanceof Error) {
    return (value as HttpError).status || 500;
  }
  return undefined;
};

/**
 * Replace Error objects with `{"message":"…"}` during JSON.stringify()
 *
 * @example
 * JSON.stringify(new Error('foo'), replaceErrors);
 * // '{"message":"Error: foo"}'
 */
export const replaceErrors = (_key: string, value: any) => {
  if (value instanceof Error) {
    return {
      message: value.toString(),
    };
  }
  return value;
};

/**
 * Request.method must be within `list`.
 */
export const method = <T extends string[]>(list: T) =>
  (request: Request) => {
    coerce(within(array(list)))(
      request.method,
      new HttpError(`Method must be within [${list.join(', ')}]`, 405),
    );
    return request;
  };

/**
 * Categorize Request or Response Content-Type as json, form, text, or blob.
 */
export const categorizeContentType = (input: Request | Response) => {
  const type = coerce(string)(input.headers.get('content-type'), '');
  if (type.includes('application/json')) {
    return 'json';
  }
  if (type.includes('form')) {
    return 'form';
  }
  if (type.includes('text')) {
    return 'text';
  }
  return 'blob';
};

/**
 * Request or Response Content Type “Category” must be within `list`.
 */
export const contentTypeCategory = (list: ReturnType<typeof categorizeContentType>[]) =>
  (input: Request | Response) => {
    coerce(within(list))(
      categorizeContentType(input),
      new HttpError(`Content-Type category must be ${conjunction(list)}`, 415),
    );
    return input;
  };

/**
 * Compound validation of a request that is method:POST and contains JSON or
 * form data.
 */
export const isFormOrJsonPostRequest = coerce(
  instance(globalThis.Request),
  method(['POST']),
  contentTypeCategory(['json', 'form']),
);

/**
 * Respond to client with JSON
 */
export const jsonResponse = (payload: any, status = 200) => {
  if (payload instanceof Response) {
    return payload;
  }
  return new Response(JSON.stringify(payload, replaceErrors), {
    status: statusCodeFromError(payload) || status,
    headers: new Headers({
      'Content-Type': 'application/json; charset=utf-8',
    }),
  });
};

/**
 * Invoke the correct Request/Response body reading method
 * (json/text/formData/arrayBuffer) based on the content-type header.
 */
export const readBody = async (input: Request | Response) => {
  // try {
  switch (categorizeContentType(input)) {
    case 'json': return input.json();
    case 'form': return Object.fromEntries((await input.formData()).entries());
    case 'text': return input.text();
    default: return input.arrayBuffer();
  }
  // } catch (error) {
  //   // Log internal errors.
  //   // eslint-disable-next-line no-console
  //   console.error(error);
  // }
  // // Only expose a more vague error indicating that there was some issue with
  // // the request.
  // throw new HttpError('Unable to read body.', 400);
};

/**
 * Read/craft an Error from a response.
 */
export const readResponseError = async (response: Response) => {
  const data = await response.json().catch(() => ({}));
  if (data.message) {
    return new HttpError(data.message, response.status);
  }
  const colon = response.statusText ? `: ${response.statusText}` : '';
  return new HttpError(`HTTP ${response.status} Error${colon}`, response.status);
};

/**
 * `fetch` does not throw on response.status. `fetchThrow` does :)
 */
export const fetchThrow = async (status: number, ...args: Parameters<typeof fetch>) => {
  const response = await fetch(...args);
  if (response.status >= status) {
    throw await readResponseError(response);
  }
  return response;
};

/**
 * Only pass if the Response.ok === true
 */
export const fetchOk = async (...args: Parameters<typeof fetch>) => {
  const response = await fetch(...args);
  if (!response.ok) {
    throw await readResponseError(response);
  }
  return response;
};

/**
 * Only pass if the Response.status is in the list of status(es).
 */
export const fetchPass = async (status: number | number[], ...args: Parameters<typeof fetch>) => {
  const response = await fetch(...args);
  try {
    coerce(within(array(status)))(response.status);
  } catch {
    throw await readResponseError(response);
  }
  return response;
};

export const fetchThrow500 = fetchThrow.bind(null, 500);
