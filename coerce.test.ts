import { assert, equals, strict, throws } from './deps.test.ts';

import {
  array,
  arrayify,
  boolean,
  coerce,
  date,
  dateify,
  defined,
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
  trim,
  within,
  wrapError,
  zero,
} from './coerce.ts';

Deno.test('wrapError', () => {
  const sampleTypeError = new TypeError('foo');
  strict(wrapError()(sampleTypeError), sampleTypeError);
  strict(wrapError(Error)(sampleTypeError), sampleTypeError);
  equals(wrapError(SyntaxError)(sampleTypeError), new SyntaxError(sampleTypeError.message));
  equals(wrapError()('foo'), new TypeError('foo'));
  equals(wrapError(SyntaxError)('foo'), new SyntaxError('foo'));
  throws(() => wrapError()(null as unknown as string));
});

Deno.test('is', () => {
  strict(is(number)(1), true);
});

Deno.test('not', () => {
  strict(not(number)('1'), true);
});

Deno.test('string', () => {
  strict(coerce(string)('1'), '1');
  strict(coerce(stringify)(1), '1');
  strict(coerce(stringify)(1n), '1');
  throws(() => coerce(stringify)(true));
  throws(() => coerce(stringify)(Symbol(1)));
  throws(() => coerce(stringify)(new Error('foo')));
  throws(() => coerce(stringify)(new Uint8Array([1, 2, 3])));
  throws(() => coerce(stringify)(['1']));
  throws(() => coerce(stringify)(-Infinity));
  throws(() => coerce(stringify)(null));
  throws(() => coerce(stringify)(undefined));
  throws(() => coerce(stringify)({}));
  throws(() =>
    coerce(stringify)({
      toString() {
        return '1';
      },
    })
  );
  throws(() =>
    coerce(stringify)({
      noToStringMethod() {
        return '1';
      },
    })
  );
});

Deno.test('nonstring', () => {
  strict(coerce(not(string))(1), 1);
  throws(() => coerce(not(string))('foo'));
});

Deno.test('trim', () => {
  strict(coerce(trim)(' \t foo \n \t'), 'foo');
});

Deno.test('spaces', () => {
  strict(coerce(spaces)(`${String.fromCharCode(0x200A)}foo `), ' foo ');
});

Deno.test('nonempty', () => {
  strict(coerce(not(length(0)))(' '), ' ');
  strict(coerce(nonempty)(' '), ' ');
});

Deno.test('safe', () => {
  strict(
    coerce(safe)('INSERT INTO `foo` VALUES ("bar")'),
    'INSERT INTO foo VALUES bar',
  );
});

Deno.test('proper', () => {
  strict(coerce(quotes, proper)('abc company'), 'Abc Company');
  strict(coerce(quotes, proper)('ABC company'), 'ABC Company');
  strict(coerce(quotes, proper)('john q. o\'donnel, III'), 'John Q O’Donnel, III');
  strict(coerce(quotes, proper)('VON Trap'), 'von Trap');
});

Deno.test('postalCodeUs5', () => {
  strict(coerce(postalCodeUs5)('10001-1234'), '10001');
  strict(coerce(postalCodeUs5)('07417'), '07417');
  strict(coerce(postalCodeUs5)('07417-1111'), '07417');
  throws(() => coerce(postalCodeUs5)('0741'));
  // numbers not allowed because leading 0’s mess things up
  throws(() => coerce(postalCodeUs5)(10001));
});

Deno.test('defined', () => {
  strict(coerce(defined)('I am defined'), 'I am defined');
  throws(() => coerce(defined)(undefined));
});

Deno.test('boolean', () => {
  strict(coerce(boolean())(undefined), false);
  strict(coerce(boolean())(' null'), false);
  strict(coerce(boolean())(null), false);
  strict(coerce(boolean())(' '), false);
  strict(coerce(boolean())(false), false);
  strict(coerce(boolean())('false'), false);
  strict(coerce(boolean())(NaN), false);
  strict(coerce(boolean())('0'), false);
  strict(coerce(boolean())(0), false);
  strict(coerce(boolean())({}), true);
  strict(coerce(boolean())(new Error()), true);
  strict(coerce(boolean())(1), true);
  strict(coerce(boolean())('foo'), true);
  const truthy = Symbol('truthy');
  const falsy = Symbol('falsy');
  const nully = Symbol('nully');
  const undefy = Symbol('undefy');
  strict(coerce(boolean(truthy, falsy, nully, undefy))(true), truthy);
  strict(coerce(boolean(truthy, falsy, nully, undefy))(false), falsy);
  strict(coerce(boolean(truthy, falsy, nully, undefy))(null), nully);
  strict(coerce(boolean(truthy, falsy, nully, undefy))(undefined), undefy);
  strict(coerce(boolean(undefined))(true), undefined);
  strict(coerce(boolean(undefined, falsy, nully, undefy))(true), undefined);
  strict(coerce(boolean(undefined, falsy, nully))(undefined), nully);
  strict(coerce(boolean(truthy, falsy, nully))(undefined), nully);
  strict(coerce(boolean(truthy, falsy))(null), falsy);
  strict(coerce(boolean(truthy, falsy))(undefined), falsy);
});

Deno.test('iterable', () => {
  equals(coerce(iterable)(new Set([1, 2, 3])), new Set([1, 2, 3]));
  throws(() => coerce(iterable)(new WeakSet()));
});

Deno.test('array', () => {
  equals(coerce(arrayify)(new Map([[1, '1']])), [[1, '1']]);
  equals(coerce(arrayify)(new Set(['1', '2'])), ['1', '2']);
  equals(coerce(array)(['1']), ['1']);
  // not ['1', '2', '3'] even though Strings are iterable
  equals(coerce(arrayify)('123'), ['123']);
  // buffers → array of char codes
  equals(coerce(arrayify)(new Uint8Array('123'.split('').map((s) => s.charCodeAt(0)))), [
    49,
    50,
    51,
  ]);
  equals(coerce(arrayify)(true), [true]);
  equals(coerce(arrayify)(undefined), [undefined]);
  equals(coerce(arrayify)(undefined).filter(is(defined)), []);
  // WeakSet non-iterable, so it gets wrapped in array
  const weakSet = new WeakSet();
  equals(coerce(arrayify)(weakSet), [weakSet]);
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
  throws(() => coerce(number)(NaN));
  throws(() => coerce(number)(Infinity));
  throws(() => coerce(numeric)('foo'));
  throws(() => coerce(numeric)(''));
  throws(() => coerce(numeric)('-1.234.5'));
  throws(() => coerce(positive)(+0));
  throws(() => coerce(negative)(-0));
  strict(coerce(numeric)(0o10), 8);
  strict(coerce(numeric)(0xff), 255);
  strict(coerce(numeric)(2e3), 2000);
  strict(coerce(numeric)(1n), 1);
  strict(coerce(number)(1.1), 1.1);
  strict(coerce(numeric, positive)('1.2'), 1.2);
  strict(coerce(numeric)('-1.234'), -1.234);
  strict(coerce(numeric)('0'), 0);
  strict(coerce(number, negative)(-0.5), -0.5);
  strict(coerce(number, negative)(-1), -1);
  strict(coerce(numeric, negative)('-2.345'), -2.345);
  strict(coerce(not(zero), integer)(1.2), 1);
  throws(() => coerce(nonzero, integer)(0));
  throws(() => coerce(not(zero))(-0));
  throws(() => coerce(number, not(zero))(''));
});

Deno.test('object', () => {
  equals(coerce(object)({ is: 'object' }), { is: 'object' });
  throws(() => coerce(object)('not an object'));
});

Deno.test('func', () => {
  const fn = () => {};
  strict(coerce(func)(fn), fn);
  throws(() => coerce(func)({}));
});

Deno.test('instance', () => {
  const Nameless = (function Nameless() {}) as unknown as new () => void;
  Nameless.prototype.name = undefined;
  assert(coerce(instance(Date))(new Date(1)) instanceof Date);
  throws(() => coerce(instance(Error))(new Date(2)));
  throws(() => coerce(instance(Nameless))(new Date(3)));
  throws(() =>
    coerce(instance({ foo: 'bar' } as unknown as new () => Record<string, never>))(new Date(4))
  );
});

Deno.test('own', () => {
  const foo = { foo: 'foo' };
  const bar = { bar: 'bar' };
  throws(() => own('foo')({} as unknown as typeof foo));
  strict(own('foo')(foo), foo);
  throws(() => own('foo')(bar as unknown as typeof foo));
  equals(own('foo')({ foo: new Date(1) }), { foo: new Date(1) });
  equals(own('message')(new Error('foo')), new Error('foo'));
  throws(() => own('message')(new Date(1) as unknown as Error));
  strict(coerce(object, own('foo'))(foo), foo);
  throws(() => coerce(object, own('foo'))(bar));
  throws(() => coerce(object, is(own('foo')))(bar));
  strict(coerce(own('foo'))(foo), foo);
  throws(() => coerce(own('foo'))(bar));
  strict(coerce(is(own('foo')))(foo), foo);
  throws(() => coerce(is(own('foo')))(bar));
  throws(() => coerce(not(own('foo')))(foo));
  strict(coerce(not(own('foo')))(bar), bar);
});

Deno.test('limit', () => {
  equals(coerce(limit(4))(5), 4);
  strict(coerce(limit(3))('foobar'), 'foo');
  equals(coerce(limit(2))([1, 2, 3, 4, 5]), [1, 2]);
  throws(() => coerce(limit(1))({}));
  throws(() => coerce(limit(0))(null));
});

Deno.test('length', () => {
  equals(coerce(length(3))({ length: 3 }), { length: 3 });
  strict(coerce(length(3))('bar'), 'bar');
  equals(coerce(length(3))([1, 2, 3]), [1, 2, 3]);
  throws(() => coerce(length(3))([1, 2]));
  throws(() => coerce(length(3))({ length: 4 }));
});

Deno.test('split', () => {
  equals(coerce(split())('a,b,,,c d e foo'), ['a', 'b', 'c', 'd', 'e', 'foo']);
  equals(coerce(split())(',,,,,,   , , '), []);
});

Deno.test('within', () => {
  strict(coerce(within(['foo', 'bar']))('foo'), 'foo');
  throws(() => coerce(within(['foo', 'bar']))('baz'));
});

Deno.test('luhn', () => {
  strict(coerce(luhn)('49927398716'), '49927398716');
  throws(() => coerce(luhn)('49927398717'));
});

Deno.test('email', () => {
  strict(coerce(email)(' Foo@Bar.com'), 'foo@bar.com');
  // basically, `email` just checks for “@” surrounded by alphanumeric
  throws(() => coerce(email)('foo '));
});

Deno.test('phone', () => {
  strict(coerce(phone)('+1 (222) 333-4444x555'), '2223334444555');
  strict(coerce(prettyPhone)('+1 (333) 444-5555'), '(333) 444-5555');
  strict(coerce(prettyPhone)('+1 (444) 555-6666x777'), '(444) 555-6666 ext 777');
  strict(coerce(phone10)('+1 (222) 333-4444'), '2223334444');
  throws(() => coerce(phone10)('+1 (222) 333-444'));
  throws(() => coerce(phone10)('+1 (222) 333-44444'));
});

Deno.test('date', () => {
  throws(() => coerce(date)(new Date(0)));
  throws(() => coerce(dateify)(undefined!));
  equals(coerce(dateify)(1628623372929), new Date(1628623372929));
  // WARNING: do not use +1 when checking for future. It is possible that
  // `Date.now() + 1` will be the same as `Date.now()` when `future` is
  // executed. Use + 2 when testing for future.
  strict(is(future)(new Date(Date.now() + 2)), true);
  strict(is(past)(new Date(Date.now() - 1)), true);
  throws(() => coerce(future)(new Date(Date.now() - 1)));
  throws(() => coerce(past)(new Date(Date.now() + 2)));
});

// a default/backup value
Deno.test('coerce(…)(…, 0)', () => {
  const defaultValue = undefined;
  strict(coerce(number)('foo', defaultValue), defaultValue);
});

// throw specific Error instance
Deno.test('coerce(…)(…, new Error(…)))', () => {
  const predefinedError = new Error('this is my error, there are many like it…');
  try {
    coerce(number)('foo', predefinedError);
  } catch (error) {
    strict(error, predefinedError);
  }
});

// Error function factory
Deno.test('coerce(…)(…, () => CustomError))', () => {
  class CustomError extends Error {}
  const errorHandler = (error: Error) => new CustomError(error.message);
  throws(() => coerce(number)('foo', errorHandler), CustomError);
});
