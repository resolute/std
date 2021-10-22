/* eslint-disable max-classes-per-file */
/* eslint-disable no-eval */
import test, { Macro } from 'ava';
import {
  coerce,
  string, safe, nonempty, spaces, trim, quotes, proper, postalCodeUs5,
  defined,
  instance,
  boolean,
  array,
  object,
  number, positive, negative,
  limit, split, within, email, phone, phone10, prettyPhone, integer, nonzero, date,
} from './coerce';

const pass: Macro<any, any> = (t, command, input, expected) => {
  t.deepEqual(command(eval(input)), expected);
};
pass.title = (providedTitle = '', _command, input, expected) =>
  `${providedTitle} ${input} = ${expected} (${typeof expected})`.trim();

const fail: Macro<any> = (t, command, input) => {
  t.throws(() => { command(eval(input)); }, { instanceOf: TypeError });
};
fail.title = (providedTitle = '', _command, input) =>
  `${providedTitle} ${input} TypeError`.trim();

const passInstance: Macro<any, any> = (t, command, input, expected) => {
  t.true(command(eval(input)) instanceof expected);
};
passInstance.title = (providedTitle = '', _command, input, expected) =>
  `${providedTitle} ${input} instanceOf ${expected}`.trim();

// string
test(pass, coerce(string), "'1'", '1');
test(pass, coerce(string), '1', '1');
test(fail, coerce(string), 'true');
test(fail, coerce(string), 'Symbol(1)');
test(fail, coerce(string), 'new Error("foo")');
test(fail, coerce(string), 'Buffer.from("foo")');
test(fail, coerce(string), '["1"]');
test(fail, coerce(string), '-Infinity');
test(fail, coerce(string), 'null');
test(fail, coerce(string), 'undefined');
test(fail, coerce(string), '{}');
test(fail, coerce(string), '{ function toString() { return "1"; } }');
test(fail, coerce(string), '{ function noToStringMethod() { return "1"; } }');

// trim
test(pass, coerce(trim), "' \t foo \\n \t'", 'foo');

// spaces
// eslint-disable-next-line no-template-curly-in-string
test(pass, coerce(spaces), '`${String.fromCharCode(0x200A)}foo `', ' foo ');

// nonEmpty
test(pass, coerce(nonempty), '" "', ' ');

// safe
test(pass, coerce(safe), '\'INSERT INTO `foo` VALUES ("bar")\'', 'INSERT INTO foo VALUES bar');

// proper
test(pass, coerce(quotes, proper), "'abc company'", 'Abc Company');
test(pass, coerce(quotes, proper), "'ABC company'", 'ABC Company');
test(pass, coerce(quotes, proper), '"john q. o\'donnel, III"', 'John Q O’Donnel, III');
test(pass, coerce(quotes, proper), "'VON Trap'", 'von Trap');

// Postal Code US
test(pass, coerce(postalCodeUs5), "'10001-1234'", '10001');
test(pass, coerce(postalCodeUs5), "'07417'", '07417');
test(pass, coerce(postalCodeUs5), "'07417-1111'", '07417');
test(fail, coerce(postalCodeUs5), "'0741'");
test(fail, coerce(postalCodeUs5), '10001'); // numbers not allowed because leading 0’s mess things up

// defined
test(pass, coerce(defined), "'I am defined'", 'I am defined');
test(fail, coerce(defined), "('I am _not_ defined', undefined)", undefined);

// boolean
const trueOrFalse = boolean();
Object.defineProperty(trueOrFalse, 'name', { value: 'boolean' });
test(pass, coerce(trueOrFalse), 'undefined', false);
test(pass, coerce(trueOrFalse), '(null)', false);
test(pass, coerce(trueOrFalse), "''", false);
test(pass, coerce(trueOrFalse), 'false', false);
test(pass, coerce(trueOrFalse), "'false'", false);
test(pass, coerce(trueOrFalse), "'0'", false);
test(pass, coerce(trueOrFalse), '0', false);
test(pass, coerce(trueOrFalse), '({})', true);
test(pass, coerce(trueOrFalse), 'new Error()', true);
test(pass, coerce(trueOrFalse), '1', true);
test(pass, coerce(trueOrFalse), "'foo'", true);

// array
test(pass, coerce(array), "new Map([[1, '1']])", [[1, '1']]);
test(pass, coerce(array), "new Set(['1', '2'])", ['1', '2']);
test(pass, coerce(array), "['1']", ['1']);
test(pass, coerce(array), "'123'", ['123']); // not ['1', '2', '3'] even though Strings are iterable
test(pass, coerce(array), "Buffer.from('123')", [49, 50, 51]); // Buffer will be char codes
test(pass, coerce(array), 'true', [true]);
test(pass, coerce(array), 'undefined', [undefined]);
test(pass, coerce(array), 'new WeakSet()', [new WeakSet()]); // WeakSet non-iterable, so it gets wrapped in array

// number
test(fail, coerce(number), 'NaN');
test(fail, coerce(number), 'Infinity');
test(fail, coerce(number), "'foo'");
test(fail, coerce(number), "''");
test(fail, coerce(number), "'-1.234.5'");
test(fail, coerce(positive), '+0');
test(fail, coerce(negative), '-0');
test(pass, coerce(number), '0o10', 8);
test(pass, coerce(number), '0xff', 255);
test(pass, coerce(number), '2e3', 2000);
test(pass, coerce(number), '1n', 1);
test(pass, coerce(number), '1.1', 1.1);
test(pass, coerce(number, positive), '1.2', 1.2);
test(pass, coerce(number), "'-1.234'", -1.234);
test(pass, coerce(number), "'0'", 0);
test(pass, coerce(number, negative), '-0.5', -0.5);
test(pass, coerce(number, negative), '-1', -1);
test(pass, coerce(number, negative), "'-2.345'", -2.345);
test(pass, coerce(nonzero, integer), '1.2', 1);
test(fail, coerce(nonzero, integer), '0');
test(fail, coerce(number, nonzero), '');

// object
test(pass, coerce(object), '({is: "object"})', { is: 'object' });
test(fail, coerce(object), '"not an object"');

// instance
const Nameless = (function Nameless() { }) as unknown as new () => void;
Nameless.prototype.name = undefined;
test(passInstance, coerce(instance(Date)), 'new Date(1)', Date);
test(fail, coerce(instance(Error)), 'new Date(2)');
test(fail, coerce(instance(Nameless)), 'new Date(3)');
test(fail, coerce(instance({ foo: 'bar' } as unknown as new () => {})), 'new Date(4)');

// limit
const limit3 = limit(3);
Object.defineProperty(limit3, 'name', { value: 'limit' });
test(pass, coerce(limit3), '5', 3);
test(pass, coerce(limit3), "'foobar'", 'foo');
test(pass, coerce(limit3), '[1, 2, 3, 4, 5]', [1, 2, 3]);
test(fail, coerce(limit3), '({})');
test(fail, coerce(limit3), '((null))');

// split
const splitBasic = split();
Object.defineProperty(splitBasic, 'name', { value: 'split' });
test(pass, coerce(splitBasic), "'a,b,,,c d e foo'", ['a', 'b', 'c', 'd', 'e', 'foo']);
test(pass, coerce(splitBasic), "',,,,,,   , , '", []);

// within
const withinList = within(['foo', 'bar']);
Object.defineProperty(withinList, 'name', { value: 'within' });
test(pass, coerce(withinList), "'foo'", 'foo');
test(fail, coerce(withinList), "'baz'");

// email
test(pass, coerce(email), "' Foo@Bar.com'", 'foo@bar.com');
test(pass, coerce(email), "'foo '", 'foo'); // this will also pass as the @ format is not validated

// phone
test(pass, coerce(phone), "'+1 (222) 333-4444x555'", '2223334444555');
test(pass, coerce(prettyPhone), "'+1 (333) 444-5555'", '(333) 444-5555');
test(pass, coerce(prettyPhone), "'+1 (444) 555-6666x777'", '(444) 555-6666 ext 777');
test(pass, coerce(phone10), "'+1 (222) 333-4444'", '2223334444');
test(fail, coerce(phone10), "'+1 (222) 333-444'");
test(fail, coerce(phone10), "'+1 (222) 333-44444'");

// date
test(pass, coerce(date), '1628623372929', new Date(1628623372929));

// test coerce with a default value
test('coerce(…)(…, 0)', (t) => {
  const defaultValue = undefined;
  t.is(coerce(number)('foo', defaultValue), defaultValue);
});

// test coerce throw specific Error instance
test('coerce(…)(…, new Error(…)))', (t) => {
  const predefinedError = new Error('this is my error, there are many like it…');
  t.throws(() => coerce(number)('foo', predefinedError), {
    is: predefinedError,
  });
});

// test coerce Error function factory
test('coerce(…)(…, () => CustomError))', (t) => {
  class CustomError extends Error { }
  const errorHandler = (error: Error) => new CustomError(error.message);
  t.throws(() => coerce(number)('foo', errorHandler), {
    instanceOf: CustomError,
  });
});
