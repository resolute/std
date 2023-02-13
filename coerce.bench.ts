import to, { is, string } from './coerce.ts';

Deno.bench('FAIL typeof 1 === "string"', { group: 'string fail', baseline: true }, () => {
  typeof 1 === 'string';
});

Deno.bench('FAIL is(string)(1)', { group: 'string fail' }, () => {
  is(string)(1);
});

Deno.bench('FAIL try { string(1) } catch {}', { group: 'string fail' }, () => {
  try {
    string(1);
  } catch {}
});

Deno.bench('FAIL (input) => typeof input === "string"', { group: 'string fail' }, () => {
  const foo = (input: unknown): input is string => typeof input === 'string';
  foo(1);
});

Deno.bench('PASS typeof "foo" === "string"', { group: 'string pass', baseline: true }, () => {
  typeof 'foo' === 'string';
});

Deno.bench('PASS is(string)("foo")', { group: 'string pass' }, () => {
  is(string)('foo');
});

Deno.bench('PASS try { string("foo") } catch {}', { group: 'string pass' }, () => {
  try {
    string('foo');
  } catch {}
});

Deno.bench('PASS (input) => typeof input === "string"', { group: 'string pass' }, () => {
  const foo = (input: unknown): input is string => typeof input === 'string';
  foo('foo');
});
