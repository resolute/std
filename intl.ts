const listFormat = /* @__PURE__ */ new Intl.ListFormat('en-US', {
  style: 'long',
  type: 'conjunction',
});

export const conjunction: Intl.ListFormat['format'] = (list) =>
  listFormat
    .format(list);

const pluralRules = /* @__PURE__ */ new Intl.PluralRules();

export const plural = (ordinal: number, singular = '', plural = 's') =>
  pluralRules.select(ordinal) === 'one' ? singular : plural;
