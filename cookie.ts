import {
  boolean,
  coerce,
  date,
  integer,
  isDefined,
  nonempty,
  number,
  positive,
  string,
  trim,
  within,
  // @ts-ignore tsc non-sense
} from './coerce.ts';
// @ts-ignore tsc non-sense
import { isDefinedTuple } from './misc.ts';

declare global {
  interface document {
    cookie: string;
  }
}

export interface CookieOptions {
  expires?: ConstructorParameters<typeof Date>[0];
  maxage?: number;
  path?: string;
  domain?: string;
  samesite?: 'none' | 'lax' | 'strict';
  secure?: boolean;
  httponly?: boolean;
}

export const parse = (cookieString: string, decoder = decodeURIComponent) => {
  const sanitizer = coerce(decoder, trim, nonempty);
  const splitPair = (pair: string) => {
    const [key, value] = pair.split('=', 2);
    return [sanitizer(key, undefined), sanitizer(value, undefined)] as const;
  };
  const pairs = cookieString.split(/; */)
    .map(splitPair)
    .filter(isDefinedTuple);
  return Object.fromEntries(pairs);
};

export const stringify = (
  key: string,
  value: string | null,
  options: CookieOptions & { encoder?: typeof encodeURIComponent } = {},
) => {
  const encoder = options.encoder || encodeURIComponent;
  const keyEncoded = coerce(string, trim, nonempty, encoder)(
    key,
    new TypeError(`“${key}” invalid cookie key.`),
  );
  const valueEncoded = coerce(string, trim, encoder)(value!, '');

  // If `value` is anything other than a non-empty string, then this is a delete
  // operation and we set the `expires` to 0.
  let { expires } = options;
  if (valueEncoded === '') {
    expires = new Date(0).toUTCString();
  } else if (isDefined(expires)) {
    expires = coerce(date)(expires, new TypeError(`“${options.expires}” invalid cookie expires.`))
      .toUTCString();
  }

  return [
    [keyEncoded, valueEncoded] as const,
    ['expires', expires] as const,
    ['maxage', coerce(number, integer, positive)(options.maxage!, undefined)] as const,
    ['domain', coerce(string, trim, nonempty)(options.domain!, undefined)] as const,
    ['path', coerce(string, trim, nonempty)(options.path!, undefined)] as const,
    ['samesite', coerce(within(['none', 'lax', 'strict']))(options.samesite, 'none')] as const,
    ['secure', coerce(boolean(true, false, true, true))(options.secure)] as const,
    ['httponly', coerce(boolean(true, false, false, false))(options.httponly)] as const,
  ]
    .map(([k, v]) => {
      if (typeof v === 'string') {
        return `${k}=${v}`;
      }
      if (v === true) {
        return k;
      }
      return undefined;
    })
    .filter(isDefined)
    .join(';');
};

// @ts-ignore TODO reference global document in Deno
export const getDomCookies = (cookieString = document.cookie, decoder = decodeURIComponent) =>
  parse(cookieString, decoder);

export const setDomCookie = (...args: Parameters<typeof stringify>) => {
  // @ts-ignore TODO reference global document in Deno
  document.cookie = stringify(...args);
};

/**
 * Parse request cookies and as an object. Optionally, provide a custom decoder
 * (decodeURIComponent is the default).
 */
export const getRequestCookies = (request: Request, decoder = decodeURIComponent) =>
  parse(coerce(string)(request.headers.get('cookie')!, ''), decoder);

export const setResponseCookie = (response: Response, ...args: Parameters<typeof stringify>) => {
  response.headers.append('set-cookie', stringify(...args));
};
