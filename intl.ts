/* eslint-disable import/prefer-default-export */

// Waiting for ListFormat to be in official spec. It’s already available in
// almost every platform:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/ListFormat
// Relevant bits borrowed from:
// https://github.com/wessberg/intl-list-format/blob/master/src/typings.d.ts
declare namespace Intl {
  class ListFormat {
    constructor(
      locales?: string | string[],
      options?: {
        style?: 'long' | 'short' | 'narrow',
        type?: 'conjunction' | 'disjunction' | 'unit',
        localeMatcher?: 'lookup' | 'best fit',
      }
    );
    public format(list?: Iterable<string>): string;
  }
}

export const conjunction: Intl.ListFormat['format'] = (list) =>
  new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' })
    .format(list);
