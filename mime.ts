// @ts-ignore tsc non-sense
import { CoerceError, is, string, within } from './coerce.ts';

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

const extDatabase = Object.fromEntries(
  [...Object.entries(mimeDatabase)]
    .map(([mimetype, extensions]) =>
      extensions
        .map((extension) => [extension, mimetype as keyof typeof mimeDatabase] as const)
    ).flat(),
) as { [K in keyof typeof mimeDatabase as (typeof mimeDatabase)[K][0]]: K };

const check = <T>(regex: RegExp, keys: readonly T[], message: string) =>
  (input: unknown) => {
    const cleaned = string(input).replace(regex, '');
    if (is(within(keys))(cleaned)) {
      return cleaned;
    }
    throw new CoerceError(input, message);
  };

/**
 * Validate a file extension.
 */
export const ext = check(
  /^\./,
  Object.keys(extDatabase) as (keyof typeof extDatabase)[],
  'a valid extension',
);

export const isExt: (input: unknown) => input is keyof typeof extDatabase = is(ext);

/**
 * Convert a file extension to a mime type.
 */
export const extToMime = (input: unknown) => extDatabase[ext(input)];

/**
 * Validate a mime type.
 */
export const mime = check(
  /;.*$/,
  Object.keys(mimeDatabase) as (keyof typeof mimeDatabase)[],
  'a valid mime type',
);

/**
 * Type guard for mime type.
 */
export const isMime: (input: unknown) => input is keyof typeof mimeDatabase = is(mime);

/**
 * Convert a mime type to a file extension.
 */
export const mimeToExt = (input: unknown) => mimeDatabase[mime(input)][0];

export { mimeDatabase as database };
