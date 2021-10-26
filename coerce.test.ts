import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from 'https://deno.land/std@0.112.0/testing/asserts.ts';
import {
  array,
  boolean,
  coerce,
  Coercer,
  date,
  defined,
  email,
  instance,
  integer,
  limit,
  negative,
  nonempty,
  nonzero,
  number,
  object,
  phone,
  phone10,
  positive,
  postalCodeUs5,
  prettyPhone,
  proper,
  quotes,
  safe,
  spaces,
  split,
  string,
  trim,
  within,
} from './coerce.ts';

const pass = <I, O>(command: Coercer<I, O>, input: string, expected: unknown) => {
  Deno.test(
    `${input} = ${expected} (${typeof expected})`.trim(),
    () => {
      assertEquals(command(eval(input)), expected);
    },
  );
};

const fail = <I, O>(command: Coercer<I, O>, input: string) => {
  Deno.test(
    `${input} TypeError`.trim(),
    () => {
      assertThrows(() => {
        command(eval(input));
      }, TypeError);
    },
  );
};

const passInstance = <I, O>(
  command: Coercer<I, O>,
  input: string,
  expected: new (...args: unknown[]) => unknown,
) => {
  Deno.test(
    `${input} instanceOf ${expected}`.trim(),
    () => {
      assertStrictEquals(command(eval(input)) instanceof expected, true);
    },
  );
};

// string
pass(coerce(string), '\'1\'', '1');
pass(coerce(string), '1', '1');
fail(coerce(string), 'true');
fail(coerce(string), 'Symbol(1)');
fail(coerce(string), 'new Error("foo")');
fail(coerce(string), 'new Uint8Array([1,2,3])');
fail(coerce(string), '["1"]');
fail(coerce(string), '-Infinity');
fail(coerce(string), 'null');
fail(coerce(string), 'undefined');
fail(coerce(string), '{}');
fail(coerce(string), '{ function toString() { return "1"; } }');
fail(coerce(string), '{ function noToStringMethod() { return "1"; } }');

// trim
pass(coerce(trim), '\' \t foo \\n \t\'', 'foo');

// spaces
pass(coerce(spaces), '`${String.fromCharCode(0x200A)}foo `', ' foo ');

// nonEmpty
pass(coerce(nonempty), '" "', ' ');

// safe
pass(coerce(safe), '\'INSERT INTO `foo` VALUES ("bar")\'', 'INSERT INTO foo VALUES bar');

// proper
pass(coerce(quotes, proper), '\'abc company\'', 'Abc Company');
pass(coerce(quotes, proper), '\'ABC company\'', 'ABC Company');
pass(coerce(quotes, proper), '"john q. o\'donnel, III"', 'John Q O’Donnel, III');
pass(coerce(quotes, proper), '\'VON Trap\'', 'von Trap');

// Postal Code US
pass(coerce(postalCodeUs5), '\'10001-1234\'', '10001');
pass(coerce(postalCodeUs5), '\'07417\'', '07417');
pass(coerce(postalCodeUs5), '\'07417-1111\'', '07417');
fail(coerce(postalCodeUs5), '\'0741\'');
fail(coerce(postalCodeUs5), '10001'); // numbers not allowed because leading 0’s mess things up

// defined
pass(coerce(defined), '\'I am defined\'', 'I am defined');
fail(coerce(defined), '(\'I am _not_ defined\', undefined)');

// boolean
const trueOrFalse = boolean();
Object.defineProperty(trueOrFalse, 'name', { value: 'boolean' });
pass(coerce(trueOrFalse), 'undefined', false);
pass(coerce(trueOrFalse), '(null)', false);
pass(coerce(trueOrFalse), '\'\'', false);
pass(coerce(trueOrFalse), 'false', false);
pass(coerce(trueOrFalse), '\'false\'', false);
pass(coerce(trueOrFalse), '\'0\'', false);
pass(coerce(trueOrFalse), '0', false);
pass(coerce(trueOrFalse), '({})', true);
pass(coerce(trueOrFalse), 'new Error()', true);
pass(coerce(trueOrFalse), '1', true);
pass(coerce(trueOrFalse), '\'foo\'', true);

// array
pass(coerce(array), 'new Map([[1, \'1\']])', [[1, '1']]);
pass(coerce(array), 'new Set([\'1\', \'2\'])', ['1', '2']);
pass(coerce(array), '[\'1\']', ['1']);
pass(coerce(array), '\'123\'', ['123']); // not ['1', '2', '3'] even though Strings are iterable
pass(coerce(array), 'new Uint8Array(\'123\'.split(\'\').map(s=>s.charCodeAt(0)))', [49, 50, 51]); // Buffer will be char codes
pass(coerce(array), 'true', [true]);
pass(coerce(array), 'undefined', [undefined]);
// WeakSet non-iterable, so it gets wrapped in array, but we can’t compare with Deno
// pass(coerce(array), 'new WeakSet()', [new WeakSet()]);

// number
fail(coerce(number), 'NaN');
fail(coerce(number), 'Infinity');
fail(coerce(number), '\'foo\'');
fail(coerce(number), '\'\'');
fail(coerce(number), '\'-1.234.5\'');
fail(coerce(positive), '+0');
fail(coerce(negative), '-0');
pass(coerce(number), '0o10', 8);
pass(coerce(number), '0xff', 255);
pass(coerce(number), '2e3', 2000);
pass(coerce(number), '1n', 1);
pass(coerce(number), '1.1', 1.1);
pass(coerce(number, positive), '1.2', 1.2);
pass(coerce(number), '\'-1.234\'', -1.234);
pass(coerce(number), '\'0\'', 0);
pass(coerce(number, negative), '-0.5', -0.5);
pass(coerce(number, negative), '-1', -1);
pass(coerce(number, negative), '\'-2.345\'', -2.345);
pass(coerce(nonzero, integer), '1.2', 1);
fail(coerce(nonzero, integer), '0');
fail(coerce(number, nonzero), '');

// object
pass(coerce(object), '({is: "object"})', { is: 'object' });
fail(coerce(object), '"not an object"');

// instance
const Nameless = (function Nameless() {}) as unknown as new () => void;
Nameless.prototype.name = undefined;
passInstance(coerce(instance(Date)), 'new Date(1)', Date);
fail(coerce(instance(Error)), 'new Date(2)');
fail(coerce(instance(Nameless)), 'new Date(3)');
fail(coerce(instance({ foo: 'bar' } as unknown as new () => Record<string, null>)), 'new Date(4)');

// limit
const limit3 = limit(3);
Object.defineProperty(limit3, 'name', { value: 'limit' });
pass(coerce(limit3), '5', 3);
pass(coerce(limit3), '\'foobar\'', 'foo');
pass(coerce(limit3), '[1, 2, 3, 4, 5]', [1, 2, 3]);
fail(coerce(limit3), '({})');
fail(coerce(limit3), '((null))');

// split
const splitBasic = split();
Object.defineProperty(splitBasic, 'name', { value: 'split' });
pass(coerce(splitBasic), '\'a,b,,,c d e foo\'', ['a', 'b', 'c', 'd', 'e', 'foo']);
pass(coerce(splitBasic), '\',,,,,,   , , \'', []);

// within
const withinList = within(['foo', 'bar']);
Object.defineProperty(withinList, 'name', { value: 'within' });
pass(coerce(withinList), '\'foo\'', 'foo');
fail(coerce(withinList), '\'baz\'');

// email
pass(coerce(email), '\' Foo@Bar.com\'', 'foo@bar.com');
pass(coerce(email), '\'foo \'', 'foo'); // this will also pass as the @ format is not validated

// phone
pass(coerce(phone), '\'+1 (222) 333-4444x555\'', '2223334444555');
pass(coerce(prettyPhone), '\'+1 (333) 444-5555\'', '(333) 444-5555');
pass(coerce(prettyPhone), '\'+1 (444) 555-6666x777\'', '(444) 555-6666 ext 777');
pass(coerce(phone10), '\'+1 (222) 333-4444\'', '2223334444');
fail(coerce(phone10), '\'+1 (222) 333-444\'');
fail(coerce(phone10), '\'+1 (222) 333-44444\'');

// date
pass(coerce(date), '1628623372929', new Date(1628623372929));

// test coerce with a default value
Deno.test('coerce(…)(…, 0)', () => {
  const defaultValue = undefined;
  assertStrictEquals(coerce(number)('foo', defaultValue), defaultValue);
});

// test coerce throw specific Error instance
Deno.test('coerce(…)(…, new Error(…)))', () => {
  const predefinedError = new Error('this is my error, there are many like it…');
  assertThrows(
    () => coerce(number)('foo', predefinedError),
    Error,
    'this is my error, there are many like it…',
  );
});

// test coerce Error function factory
Deno.test('coerce(…)(…, () => CustomError))', () => {
  class CustomError extends Error {}
  const errorHandler = (error: Error) => new CustomError(error.message);
  assertThrows(() => coerce(number)('foo', errorHandler), CustomError);
});
