// @ts-ignore tsc non-sense
import { string } from './coerce.ts';

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

/**
 * Type guard for file extension.
 */
export const isExt = (input: unknown): input is keyof typeof extDatabase =>
  (input as keyof typeof extDatabase) in extDatabase;

/**
 * Validate a file extension.
 */
export const ext = (input: unknown) => {
  const cleaned = string(input as string).replace(/^\./, '');
  if (isExt(cleaned)) {
    return cleaned;
  }
  throw new TypeError(`${input} is not a valid extension.`);
};

/**
 * Convert a file extension to a mime type.
 */
export const extToMime = (input: unknown) => extDatabase[ext(input)];

/**
 * Type guard for mime type.
 */
export const isMime = (input: unknown): input is keyof typeof mimeDatabase =>
  (input as keyof typeof mimeDatabase) in mimeDatabase;

/**
 * Validate a mime type.
 */
export const mime = (input: unknown) => {
  const cleaned = string(input as string).replace(/;.*$/, '');
  if (isMime(cleaned)) {
    return cleaned;
  }
  throw new TypeError(`${input} is not a valid mime type.`);
};

/**
 * Convert a mime type to a file extension.
 */
export const mimeToExt = (input: unknown) => mimeDatabase[mime(input)][0];

export { mimeDatabase as database };
