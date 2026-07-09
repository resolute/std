/**
 * Benchmarks for the coerce module.
 *
 * Goal: guards should be as close to 0-cost as the hand-written checks they
 * replace. Every comparison group sets the LIBRARY call as `baseline: true`,
 * so deno's summary reads from the library's perspective: a red "Nx slower
 * than <hand-written>" line is overhead to eliminate (lower is better; 1.0x
 * is 0-cost), and a green "Nx faster than <try/catch>" line is the savings
 * the throw-free design delivers. deno bench has no option to invert its
 * green/red coding — choosing the baseline is the lever. Ratios, not raw
 * nanoseconds, are the numbers to track across machines.
 *
 * Methodology
 * - Guards are hoisted to module scope. Construction (`is(…)`, `to(…)`) is a
 *   one-time cost, measured separately in the "construction" group. Never
 *   construct a guard inside a hot loop.
 * - Results are written to `sink` so V8 cannot dead-code-eliminate the work
 *   under measurement.
 * - "mixed" benches cycle through rotating pass/fail inputs so branches and
 *   inline caches stay polymorphic. An all-pass loop over a constant lets the
 *   branch predictor and JIT produce unrealistically flattering numbers.
 * - Failure paths matter most. Constructing a `TypeError` captures a stack
 *   trace, which is catastrophically slow on workerd (Cloudflare Workers
 *   captures eagerly and ignores `Error.stackTraceLimit`). The "exception
 *   cost" group quantifies what the predicate fast path (ef912ff) avoids:
 *   `is`/`not`/`to(…, or(…))` chains built from pure validators must never
 *   construct an Error. Nested pipes (e.g. `email`) are flattened into their
 *   member stages, so their internal validators also reject throw-free; only
 *   stages without a predicate (mutators, foreign functions) still pay the
 *   throw when they themselves fail.
 *
 * Run: deno task bench
 */
import {
  array,
  email,
  instance,
  is,
  nonempty,
  not,
  number,
  numeric,
  object,
  or,
  own,
  positive,
  string,
  to,
  trim,
  within,
} from './coerce.ts';

// Defeat dead-code elimination: every bench assigns its result here.
let sink: unknown;
export const drain = (): unknown => sink;

/** Rotate through inputs so the JIT cannot specialize on a constant. */
const cycle = <T>(items: readonly T[]): () => T => {
  let index = 0;
  return () => items[index = (index + 1) % items.length];
};

//#region Exception cost — why the predicate fast path exists
// -----------------------------------------------------------------------------
// Documents the cost the library must avoid on failure paths. On workerd the
// `new TypeError` line is orders of magnitude worse than it appears here
// because the stack is captured eagerly on a deep call stack.

Deno.bench('predicate check (no Error)', { group: 'exception cost', baseline: true }, () => {
  sink = typeof 1 === 'string';
});

Deno.bench('new TypeError(…)', { group: 'exception cost' }, () => {
  sink = new TypeError('Expected “1” to be a string.');
});

Deno.bench('throw + catch TypeError', { group: 'exception cost' }, () => {
  try {
    throw new TypeError('Expected “1” to be a string.');
  } catch (error) {
    sink = error;
  }
});

//#endregion

//#region Construction — one-time cost, never in a hot loop
// -----------------------------------------------------------------------------

Deno.bench('construct arrow guard', { group: 'construction', baseline: true }, () => {
  sink = (value: unknown): value is string => typeof value === 'string';
});

Deno.bench('construct is(string)', { group: 'construction' }, () => {
  sink = is(string);
});

Deno.bench('construct to(string, or(null))', { group: 'construction' }, () => {
  sink = to(string, or(null));
});

Deno.bench('construct to(string, trim, nonempty)', { group: 'construction' }, () => {
  sink = to(string, trim, nonempty);
});

//#endregion

//#region Simple guard — pass and fail
// -----------------------------------------------------------------------------

const isString = is(string);
const isNotString = not(string);

Deno.bench('typeof "foo" === "string"', { group: 'string pass' }, () => {
  sink = typeof 'foo' === 'string';
});

Deno.bench('is(string)("foo") [hoisted]', { group: 'string pass', baseline: true }, () => {
  sink = isString('foo');
});

Deno.bench('string("foo") direct', { group: 'string pass' }, () => {
  sink = string('foo');
});

Deno.bench('typeof 1 === "string"', { group: 'string fail' }, () => {
  sink = typeof 1 === 'string';
});

Deno.bench('is(string)(1) [hoisted, throw-free]', { group: 'string fail', baseline: true }, () => {
  sink = isString(1);
});

Deno.bench('try { string(1) } catch [throws]', { group: 'string fail' }, () => {
  try {
    sink = string(1 as unknown as string);
  } catch {
    sink = false;
  }
});

Deno.bench('typeof 1 !== "string"', { group: 'string negated' }, () => {
  sink = typeof 1 !== 'string';
});

Deno.bench('not(string)(1) [hoisted]', { group: 'string negated', baseline: true }, () => {
  sink = isNotString(1);
});

//#endregion

//#region or() fallback — the workerd hot path
// -----------------------------------------------------------------------------
// `to(string, or(null))` on a failing input is the exact shape that regressed
// on Cloudflare Workers: it must resolve to the fallback WITHOUT constructing
// a TypeError. The try/catch variant shows the cost of the naive approach.

const stringOrNull = to(string, or(null));

Deno.bench('ternary fallback (pass)', { group: 'or fallback pass' }, () => {
  const value: unknown = 'foo';
  sink = typeof value === 'string' ? value : null;
});

Deno.bench('to(string, or(null))("foo")', { group: 'or fallback pass', baseline: true }, () => {
  sink = stringOrNull('foo');
});

Deno.bench('ternary fallback (fail)', { group: 'or fallback fail' }, () => {
  const value: unknown = 12345;
  sink = typeof value === 'string' ? value : null;
});

Deno.bench(
  'to(string, or(null))(12345) [throw-free]',
  { group: 'or fallback fail', baseline: true },
  () => {
    sink = stringOrNull(12345);
  },
);

Deno.bench('try { string(12345) } catch { null } [throws]', { group: 'or fallback fail' }, () => {
  try {
    sink = string(12345 as unknown as string);
  } catch {
    sink = null;
  }
});

// Realistic traffic: mostly valid with occasional garbage, polymorphic types.
const MIXED_STRINGS: readonly unknown[] = [
  'foo',
  'bar',
  42,
  'baz',
  null,
  'qux',
  undefined,
  'quux',
  { toString: () => 'nope' },
  'corge',
];
const nextMixedString = cycle(MIXED_STRINGS);

Deno.bench('hand-written (mixed traffic)', { group: 'or fallback mixed' }, () => {
  const value = nextMixedString();
  sink = typeof value === 'string' ? value : null;
});

Deno.bench(
  'to(string, or(null)) (mixed traffic)',
  { group: 'or fallback mixed', baseline: true },
  () => {
    sink = stringOrNull(nextMixedString());
  },
);

//#endregion

//#region Parameterized guards — within, instance, own
// -----------------------------------------------------------------------------

const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = typeof ROLES[number];
const isRole = is(within(ROLES));
const MIXED_ROLES: readonly unknown[] = ['admin', 'viewer', 'root', 'editor', '', 'admin', 42];
const nextRole = cycle(MIXED_ROLES);

Deno.bench('ROLES.indexOf(value) >= 0', { group: 'within (enum)' }, () => {
  sink = ROLES.indexOf(nextRole() as Role) >= 0;
});

Deno.bench('is(within(ROLES)) [hoisted]', { group: 'within (enum)', baseline: true }, () => {
  sink = isRole(nextRole());
});

const isDate = is(instance(Date));
const MIXED_DATES: readonly unknown[] = [new Date(1234567890123), 'not a date', new Date(1), null];
const nextDate = cycle(MIXED_DATES);

Deno.bench('value instanceof Date', { group: 'instance' }, () => {
  sink = nextDate() instanceof Date;
});

Deno.bench('is(instance(Date)) [hoisted]', { group: 'instance', baseline: true }, () => {
  sink = isDate(nextDate());
});

const hasId = is(own('id'));
const MIXED_OBJECTS: readonly Record<string, unknown>[] = [
  { id: 1, name: 'a' },
  { name: 'b' },
  { id: undefined },
  Object.create({ id: 'inherited' }),
];
const nextObject = cycle(MIXED_OBJECTS);

Deno.bench('Object.hasOwn(value, "id")', { group: 'own' }, () => {
  const value = nextObject();
  sink = value !== null && Object.hasOwn(value, 'id');
});

Deno.bench('is(own("id")) [hoisted]', { group: 'own', baseline: true }, () => {
  sink = hasId(nextObject());
});

//#endregion

//#region Mutator pipes — sanitize + validate chains
// -----------------------------------------------------------------------------
// Chains that transform the value carry mutator stages with no predicate, but
// pipes are flattened into their member stages, so every pure validator in
// the chain (even inside a nested pipe like `email`) still rejects without
// constructing an Error. Only a mutator itself failing pays the throw.

const cleanName = to(string, trim, nonempty, or(null));

Deno.bench('hand-written trim + check', { group: 'sanitize pass' }, () => {
  const value: unknown = '  Ada Lovelace  ';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    sink = trimmed.length !== 0 ? trimmed : null;
  } else {
    sink = null;
  }
});

Deno.bench(
  'to(string, trim, nonempty, or(null))',
  { group: 'sanitize pass', baseline: true },
  () => {
    sink = cleanName('  Ada Lovelace  ');
  },
);

const emailOrNull = to(string, email, or(null));
const MIXED_EMAILS: readonly unknown[] = [
  ' Ada@Example.com ',
  'grace.hopper@navy.mil',
  'not-an-email',
  12345,
  'linus@kernel.org',
  '',
];
const nextEmail = cycle(MIXED_EMAILS);

Deno.bench('hand-written email (mixed)', { group: 'email mixed' }, () => {
  const value = nextEmail();
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().replace(/\s+/g, '');
    sink = /[a-z0-9]@[a-z0-9]/.test(normalized) ? normalized : null;
  } else {
    sink = null;
  }
});

Deno.bench(
  'to(string, email, or(null)) (mixed)',
  { group: 'email mixed', baseline: true },
  () => {
    sink = emailOrNull(nextEmail());
  },
);

const MIXED_NUMERICS: readonly (string | number)[] = ['$1,234.56', 42, '19.99 USD', '7'];
const nextNumeric = cycle(MIXED_NUMERICS);

Deno.bench('hand-written numeric (mixed)', { group: 'numeric mixed' }, () => {
  const value = nextNumeric();
  if (typeof value === 'number' && Number.isFinite(value)) {
    sink = value;
  } else {
    const parsed = Number(String(value).replace(/[^0-9oex.-]/g, ''));
    sink = Number.isFinite(parsed) ? parsed : null;
  }
});

Deno.bench('numeric() (mixed)', { group: 'numeric mixed', baseline: true }, () => {
  sink = numeric(nextNumeric());
});

//#endregion

//#region Realistic payload — validate an API request object
// -----------------------------------------------------------------------------
// The end-to-end scenario: coerce an untrusted JSON body field-by-field, the
// way this library is used inside a Worker request handler. Compared against
// the imperative validation a developer would hand-write instead.

interface Payload {
  name: string;
  email: string;
  age: number;
  role: Role;
  tags: readonly string[];
}

const isObject = is(object);
const toName = to(string, trim, nonempty, or(null));
const toEmail = to(string, email, or(null));
const toAge = to(number, positive, or(null));
const toRole = to(within(ROLES), or(null));
const toTags = to(array, or(null));

const parsePayloadCoerce = (input: unknown): Payload | null => {
  if (!isObject(input)) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const name = toName(record.name);
  if (name === null) {
    return null;
  }
  const address = toEmail(record.email);
  if (address === null) {
    return null;
  }
  const age = toAge(record.age);
  if (age === null) {
    return null;
  }
  const role = toRole(record.role);
  if (role === null) {
    return null;
  }
  const tags = toTags(record.tags);
  if (tags === null) {
    return null;
  }
  return { name, email: address, age, role, tags: tags as readonly string[] };
};

const parsePayloadHand = (input: unknown): Payload | null => {
  if (typeof input !== 'object' || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (typeof record.name !== 'string') {
    return null;
  }
  const name = record.name.trim();
  if (name.length === 0) {
    return null;
  }
  if (typeof record.email !== 'string') {
    return null;
  }
  const address = record.email.toLowerCase().replace(/\s+/g, '');
  if (!/[a-z0-9]@[a-z0-9]/.test(address)) {
    return null;
  }
  const age = record.age;
  if (typeof age !== 'number' || !Number.isFinite(age) || age <= 0) {
    return null;
  }
  if (ROLES.indexOf(record.role as Role) < 0) {
    return null;
  }
  if (!Array.isArray(record.tags)) {
    return null;
  }
  return { name, email: address, age, role: record.role as Role, tags: record.tags };
};

const VALID_PAYLOAD = {
  name: ' Ada Lovelace ',
  email: 'Ada@Example.com',
  age: 36,
  role: 'admin',
  tags: ['math', 'computing'],
};

const MIXED_PAYLOADS: readonly unknown[] = [
  VALID_PAYLOAD,
  { name: 'Grace Hopper', email: 'grace@navy.mil', age: 85, role: 'editor', tags: [] },
  { name: '', email: 'ada@example.com', age: 36, role: 'admin', tags: [] },
  { name: 'Ada', email: 'not-an-email', age: 36, role: 'admin', tags: [] },
  { name: 'Ada', email: 'ada@example.com', age: -1, role: 'admin', tags: [] },
  { name: 'Ada', email: 'ada@example.com', age: 36, role: 'root', tags: [] },
  { name: 'Ada', email: 'ada@example.com', age: 36, role: 'viewer', tags: 'oops' },
  null,
  'not even an object',
  { name: 'Linus', email: 'linus@kernel.org', age: 55, role: 'viewer', tags: ['git'] },
];
const nextPayload = cycle(MIXED_PAYLOADS);

Deno.bench('hand-written parse (all valid)', { group: 'payload pass' }, () => {
  sink = parsePayloadHand(VALID_PAYLOAD);
});

Deno.bench('coerce parse (all valid)', { group: 'payload pass', baseline: true }, () => {
  sink = parsePayloadCoerce(VALID_PAYLOAD);
});

Deno.bench('hand-written parse (mixed)', { group: 'payload mixed' }, () => {
  sink = parsePayloadHand(nextPayload());
});

Deno.bench('coerce parse (mixed)', { group: 'payload mixed', baseline: true }, () => {
  sink = parsePayloadCoerce(nextPayload());
});

//#endregion
