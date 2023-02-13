import { assert, equals, strict, throws } from './deps.test.ts';

import {
  array,
  arrayify,
  boolean,
  date,
  dateify,
  defined,
  digits,
  email,
  entries,
  func,
  future,
  instance,
  integer,
  is,
  iterable,
  length,
  limit,
  luhn,
  negative,
  nonempty,
  nonzero,
  not,
  number,
  numeric,
  object,
  or,
  own,
  pairs,
  past,
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
  stringify,
  to,
  trim,
  within,
  wrapError,
  zero,
} from './coerce.ts';

Deno.test('to', () => {
  strict(to()(1), 1);
  strict(to()(undefined), undefined);
});

Deno.test('wrapError', () => {
  const sampleTypeError = new TypeError('foo');
  const invalidErrorConstructor = ((arg: string) => new Error(arg)) as unknown as ErrorConstructor;
  strict(wrapError()(sampleTypeError), sampleTypeError);
  strict(wrapError(Error)(sampleTypeError), sampleTypeError);
  equals(wrapError(SyntaxError)(sampleTypeError), new SyntaxError(sampleTypeError.message));
  equals(wrapError()('foo'), new Error('foo'));
  equals(wrapError(SyntaxError)('foo'), new SyntaxError('foo'));
  throws(() => wrapError()(null as unknown as string));
  throws(() => wrapError(invalidErrorConstructor)('foo'));
});

Deno.test('is', () => {
  strict(is(number)(1), true);
  strict(
    ['foo', ' ', 'bar']
      .map(to(string, trim, or('')))
      .filter(is(nonempty))
      .join(''),
    'foobar',
  );
});

Deno.test('not', () => {
  strict(not(number)('1'), true);
  strict(is(number)(1), true);
  strict(not(length(0))(''), false);
  strict(is(nonempty)(''), false);
  strict(is(nonempty)('foo'), true);
});

Deno.test('string', () => {
  strict(to(string)('1'), '1');
  strict(to(stringify)(1), '1');
  strict(to(stringify)(1n), '1');
  throws(() => to(stringify)(true));
  throws(() => to(stringify)(Symbol(1)));
  throws(() => to(stringify)(new Error('foo')));
  throws(() => to(stringify)(new Uint8Array([1, 2, 3])));
  throws(() => to(stringify)(['1']));
  throws(() => to(stringify)(-Infinity));
  throws(() => to(stringify)(null));
  throws(() => to(stringify)(undefined));
  throws(() => to(stringify)({}));
  throws(() =>
    to(stringify)({
      toString() {
        return '1';
      },
    })
  );
  throws(() =>
    to(stringify)({
      noToStringMethod() {
        return '1';
      },
    })
  );
});

Deno.test('nonstring', () => {
  strict(to(not(string))(1), 1);
  throws(() => to(not(string))('foo'));
});

Deno.test('trim', () => {
  strict(to(trim)(' \t foo \n \t'), 'foo');
});

Deno.test('spaces', () => {
  strict(to(spaces)(`${String.fromCharCode(0x200A)}foo `), ' foo ');
});

Deno.test('nonempty', () => {
  strict(to(not(length(0)))(' '), ' ');
  strict(to(nonempty)(' '), ' ');
});

Deno.test('safe', () => {
  strict(
    to(safe)('INSERT INTO `foo` VALUES ("bar")'),
    'INSERT INTO foo VALUES bar',
  );
});

Deno.test('proper', () => {
  strict(to(quotes, proper)('abc company'), 'Abc Company');
  strict(to(quotes, proper)('ABC company'), 'ABC Company');
  strict(to(quotes, proper)('john q. o\'donnel, III'), 'John Q O’Donnel, III');
  strict(to(quotes, proper)('VON Trap'), 'von Trap');
});

Deno.test('postalCodeUs5', () => {
  strict(to(postalCodeUs5)('10001-1234'), '10001');
  strict(to(postalCodeUs5)('07417'), '07417');
  strict(to(postalCodeUs5)('07417-1111'), '07417');
  throws(() => to(postalCodeUs5)('0741'));
  // numbers not allowed because leading 0’s mess things up
  throws(() => to(postalCodeUs5)(10001));
});

Deno.test('defined', () => {
  strict(to(defined)('I am defined'), 'I am defined');
  throws(() => to(defined)(undefined));
  const input = [1, 2, undefined, null, 3];
  const result = input
    .filter(is(defined));
  // expectType<number[]>(result);
  equals(result, [1, 2, 3]);
});

Deno.test('boolean', () => {
  strict(to(boolean())(undefined), false);
  strict(to(boolean())(' null'), false);
  strict(to(boolean())(null), false);
  strict(to(boolean())(' '), false);
  strict(to(boolean())(false), false);
  strict(to(boolean())('false'), false);
  strict(to(boolean())(NaN), false);
  strict(to(boolean())('0'), false);
  strict(to(boolean())(0), false);
  strict(to(boolean())({}), true);
  strict(to(boolean())(new Error()), true);
  strict(to(boolean())(1), true);
  strict(to(boolean())('foo'), true);
  const truthy = Symbol('truthy');
  const falsy = Symbol('falsy');
  const nully = Symbol('nully');
  const undefy = Symbol('undefy');
  strict(to(boolean(truthy, falsy, nully, undefy))(true), truthy);
  strict(to(boolean(truthy, falsy, nully, undefy))(false), falsy);
  strict(to(boolean(truthy, falsy, nully, undefy))(null), nully);
  strict(to(boolean(truthy, falsy, nully, undefy))(undefined), undefy);
  strict(to(boolean(undefined))(true), undefined);
  strict(to(boolean(undefined, falsy, nully, undefy))(true), undefined);
  strict(to(boolean(undefined, falsy, nully))(undefined), nully);
  strict(to(boolean(truthy, falsy, nully))(undefined), nully);
  strict(to(boolean(truthy, falsy))(null), falsy);
  strict(to(boolean(truthy, falsy))(undefined), falsy);
});

Deno.test('iterable', () => {
  equals(to(iterable)(new Set([1, 2, 3])), new Set([1, 2, 3]));
  throws(() => to(iterable)(new WeakSet()));
});

Deno.test('array', () => {
  equals(to(arrayify)(new Map([[1, '1']])), [[1, '1']]);
  equals(to(arrayify)(new Set(['1', '2'])), ['1', '2']);
  equals(to(array)(['1']), ['1']);
  // not ['1', '2', '3'] even though Strings are iterable
  equals(to(arrayify)('123'), ['123']);
  // buffers → array of char codes
  equals(to(arrayify)(new Uint8Array('123'.split('').map((s) => s.charCodeAt(0)))), [
    49,
    50,
    51,
  ]);
  equals(to(arrayify)(true), [true]);
  equals(to(arrayify)(undefined), [undefined]);
  equals(to(arrayify)(undefined).filter(is(defined)), []);
  // WeakSet non-iterable, so it gets wrapped in array
  const weakSet = new WeakSet();
  equals(to(arrayify)(weakSet), [weakSet]);
});

Deno.test('entries', () => {
  equals(entries(new Map([[1, 2], [3, 4]])), [[1, 2], [3, 4]]);
  equals(entries({ foo: 1, bar: 2 }), [['foo', 1], ['bar', 2]]);
  equals(entries(new Set([1, 2, 3])), [1, 2, 3]);
  throws(() => entries(() => {}));
});

Deno.test('pairs', () => {
  equals(pairs(new Map([[1, 2], [3, 4]])), [[1, 2], [3, 4]]);
  equals(pairs(entries({ foo: 1, bar: 2 })), [['foo', 1], ['bar', 2]]);
  equals(pairs([[1, 2, 3, 4], [5, 6]] as [number, number][]), [[1, 2], [5, 6]]);
  equals(pairs(new Set([1, 2, 3]) as unknown as Map<number, number>), []);
});

Deno.test('number', () => {
  throws(() => to(number)(NaN));
  throws(() => to(number)(Infinity));
  throws(() => to(numeric)('foo'));
  throws(() => to(numeric)(''));
  throws(() => to(numeric)('-1.234.5'));
  throws(() => to(positive)(+0));
  throws(() => to(negative)(-0));
  strict(to(numeric)(0o10), 8);
  strict(to(numeric)(0xff), 255);
  strict(to(numeric)(2e3), 2000);
  strict(to(numeric)(1n), 1);
  strict(to(number)(1.1), 1.1);
  strict(to(numeric, positive)('1.2'), 1.2);
  strict(to(numeric)('-1.234'), -1.234);
  strict(to(numeric)('0'), 0);
  strict(to(number, negative)(-0.5), -0.5);
  strict(to(number, negative)(-1), -1);
  strict(to(numeric, negative)('-2.345'), -2.345);
  strict(to(not(zero), integer)(1.2), 1);
  throws(() => to(nonzero, integer)(0));
  throws(() => to(numeric)(BigInt(Number.MAX_SAFE_INTEGER) + 1n));
  throws(() => to(not(zero))(-0));
  throws(() => to(number, not(zero))(''));
});

Deno.test('object', () => {
  equals(to(object)({ is: 'object' }), { is: 'object' });
  throws(() => to(object)('not an object'));
});

Deno.test('func', () => {
  const fn = () => {};
  strict(to(func)(fn), fn);
  throws(() => to(func)({}));
});

Deno.test('instance', () => {
  const Nameless = (function Nameless() {}) as unknown as new () => void;
  Nameless.prototype.name = undefined;
  assert(to(instance(Date))(new Date(1)) instanceof Date);
  throws(() => to(instance(Error))(new Date(2)));
  throws(() => to(instance(Nameless))(new Date(3)));
  throws(() =>
    to(instance({ foo: 'bar' } as unknown as new () => Record<string, never>))(new Date(4))
  );
});

Deno.test('own', () => {
  const foo = { foo: 'foo' };
  const bar = { bar: 'bar' };
  throws(() => own('foo')({}));
  strict(own('foo')(foo), foo);
  throws(() => own('foo')(bar));
  equals(own('foo')({ foo: new Date(1) }), { foo: new Date(1) });
  equals(own('message')(new Error('foo')), new Error('foo'));
  throws(() => own('message')(new Date(1)));
  strict(to(object, own('foo'))(foo), foo);
  throws(() => to(object, own('foo'))(bar));
  throws(() => to(object, is(own('foo')))(bar));
  strict(to(own('foo'))(foo), foo);
  throws(() => to(own('foo'))(bar));
  strict(to(is(own('foo')))(foo), foo);
  throws(() => to(is(own('foo')))(bar));
  throws(() => to(not(own('foo')))(foo));
  strict(to(not(own('foo')))(bar), bar);
  const input = [foo, bar];
  const result = input
    .filter(is(own('foo')));
});

Deno.test('limit', () => {
  equals(to(limit(4))(5), 4);
  strict(to(limit(3))('foobar'), 'foo');
  equals(to(limit(2))([1, 2, 3, 4, 5]), [1, 2]);
  const foo = to(limit(2))([1, 2, 3, 4, 5]);
  throws(() => to(limit(1))({}));
  throws(() => to(limit(0))(null));
});

Deno.test('length', () => {
  equals(to(length(3))({ length: 3 }), { length: 3 });
  strict(to(length(3))('bar'), 'bar');
  equals(to(length(3))([1, 2, 3]), [1, 2, 3]);
  throws(() => to(length(3))([1, 2]));
  throws(() => to(length(3))({ length: 4 }));
});

Deno.test('split', () => {
  equals(to(split())('a,b,,,c d e foo'), ['a', 'b', 'c', 'd', 'e', 'foo']);
  equals(to(split())(',,,,,,   , , '), []);
  equals(to(split())('1\n2\r3'), ['1', '2', '3']);
});

Deno.test('within', () => {
  strict(to(within(['foo', 'bar']))('foo'), 'foo');
  throws(() => to(within(['foo', 'bar']))('baz'));
});

Deno.test('luhn', () => {
  strict(to(luhn)('49927398716'), '49927398716');
  throws(() => to(luhn)('49927398717'));
});

Deno.test('email', () => {
  strict(to(email)(' Foo@Bar.com'), 'foo@bar.com');
  // basically, `email` just checks for “@” surrounded by alphanumeric
  throws(() => to(email)('foo '));
});

Deno.test('phone', () => {
  strict(to(phone)('+1 (222) 333-4444x555'), '2223334444555');
  strict(to(prettyPhone)('+1 (333) 444-5555'), '(333) 444-5555');
  strict(to(prettyPhone)('+1 (444) 555-6666x777'), '(444) 555-6666 ext 777');
  strict(to(phone10)('+1 (222) 333-4444'), '2223334444');
  throws(() => to(phone10)('+1 (222) 333-444'));
  throws(() => to(phone10)('+1 (222) 333-44444'));
});

Deno.test('date', () => {
  throws(() => to(date)(new Date(0)));
  throws(() => to(dateify)(undefined!));
  equals(to(dateify)(1628623372929), new Date(1628623372929));
  // WARNING: do not use +1 when checking for future. It is possible that
  // `Date.now() + 1` will be the same as `Date.now()` when `future` is
  // executed. Use + 2 when testing for future.
  strict(is(future)(new Date(Date.now() + 2)), true);
  strict(is(past)(new Date(Date.now() - 1)), true);
  throws(() => to(future)(new Date(Date.now() - 1)));
  throws(() => to(past)(new Date(Date.now() + 2)));
});

Deno.test('chain/nest', () => {
  const trimNonEmpty = to(string, trim, nonempty);
  const trimNonEmptyOrNull = to(string, trim, nonempty, or(null));
  strict(to(trimNonEmpty)('a'), 'a');
  strict(to(trimNonEmpty, string, digits)('a'), '');
  strict(to(trimNonEmpty, or(null))(' '), null);
  strict(to(trimNonEmptyOrNull)(' '), null);
});

// a default/backup value
Deno.test('coerce(…, or(undefined))(…)', () => {
  const defaultValue = undefined;
  strict(to(number, or(defaultValue))('foo'), defaultValue);
});

// throw specific Error instance
Deno.test('coerce(…, or(new Error()))(…)', () => {
  const predefinedError = new Error('this is my error, there are many like it…');
  try {
    to(number, or(predefinedError))('foo');
  } catch (error) {
    strict(error, predefinedError);
  }
});
