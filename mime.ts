import { is, string, to, within } from './coerce.ts';

export type MimeTypes = keyof typeof mimeDatabase;

export type MimeExtensions = keyof typeof extDatabase;

const mimeDatabase = {
  'text/html': ['html'],
  'text/plain': ['txt'],
  'text/css': ['css'],
  'application/javascript': ['js'],
  'application/pdf': ['pdf'],
  'font/woff': ['woff'],
  'font/woff2': ['woff2'],
  'video/mp4': ['mp4'],
  'image/avif': ['avif', 'heif'], // libvips reports "avif" as "heif"
  'image/webp': ['webp'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/svg+xml': ['svg'],
  'image/vnd.microsoft.icon': ['ico'],
} as const;

const extDatabase = /* @__PURE__ */ Object.fromEntries(
  [...Object.entries(mimeDatabase)]
    .map(([mimetype, extensions]) =>
      extensions
        .map((extension) => [extension, mimetype as MimeTypes] as const)
    ).flat(),
) as { [K in MimeTypes as (typeof mimeDatabase)[K][number]]: K };

const check = <T extends string>(
  regex: RegExp,
  keys: readonly T[],
  message: string,
): (input: unknown) => T =>
(input: unknown): T => {
  const cleaned = to(string)(input).replace(regex, '');
  if (is(within(keys))(cleaned)) {
    return cleaned as T;
  }
  throw new TypeError(`Expected “${input}” to be ${message}.`);
};

/**
 * Validate a file extension.
 */
export const ext: (input: unknown) => MimeExtensions = /* @__PURE__ */ check(
  /^\./,
  Object.keys(extDatabase) as MimeExtensions[],
  'a valid extension',
);

export const isExt: (input: unknown) => input is MimeExtensions = /* @__PURE__ */ is(ext);

/**
 * Convert a file extension to a mime type.
 */
export const extToMime = (input: unknown): MimeTypes => extDatabase[ext(input)];

/**
 * Validate a mime type.
 */
export const mime: (input: unknown) => MimeTypes = /* @__PURE__ */ check(
  /;.*$/,
  Object.keys(mimeDatabase) as MimeTypes[],
  'a valid mime type',
);

/**
 * Type guard for mime type.
 */
export const isMime: (input: unknown) => input is MimeTypes = /* @__PURE__ */ is(mime);

/**
 * Convert a mime type to a file extension.
 */
export const mimeToExt = (input: unknown): MimeExtensions => mimeDatabase[mime(input)][0];

export { mimeDatabase as database };
