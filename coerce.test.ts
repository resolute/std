import {
  assert,
  assertEquals as equals,
  assertStrictEquals as strict,
  assertThrows as throws,
} from 'https://deno.land/std@0.112.0/testing/asserts.ts';
import {
  array,
  boolean,
  coerce,
  date,
  defined,
  email,
  func,
  instance,
  integer,
  iterable,
  length,
  limit,
  luhn,
  negative,
  nonempty,
  nonstring,
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

Deno.test('string', () => {
  strict(coerce(string)('1'), '1');
  strict(coerce(string)(1), '1');
  strict(coerce(string)(1n), '1');
  throws(() => coerce(string)(true as unknown as string));
  throws(() => coerce(string)(Symbol(1) as unknown as string));
  throws(() => coerce(string)(new Error('foo') as unknown as string));
  throws(() => coerce(string)(new Uint8Array([1, 2, 3]) as unknown as string));
  throws(() => coerce(string)(['1'] as unknown as string));
  throws(() => coerce(string)(-Infinity as unknown as string));
  throws(() => coerce(string)(null as unknown as string));
  throws(() => coerce(string)(undefined as unknown as string));
  throws(() => coerce(string)({} as unknown as string));
  throws(() =>
    coerce(string)({
      toString() {
        return '1';
      },
    } as unknown as string)
  );
  throws(() =>
    coerce(string)({
      noToStringMethod() {
        return '1';
      },
    } as unknown as string)
  );
});

Deno.test('nonstring', () => {
  strict(coerce(nonstring)(1), 1);
  throws(() => coerce(nonstring)('foo'));
});

Deno.test('trim', () => {
  strict(coerce(trim)(' \t foo \n \t'), 'foo');
});

Deno.test('spaces', () => {
  strict(coerce(spaces)(`${String.fromCharCode(0x200A)}foo `), ' foo ');
});

Deno.test('nonempty', () => {
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
  throws(() => coerce(postalCodeUs5)(10001 as unknown as string));
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
});

Deno.test('iterable', () => {
  equals(coerce(iterable)(new Set([1, 2, 3])), new Set([1, 2, 3]));
  throws(() => coerce(iterable)(new WeakSet() as unknown as Set<number>));
});

Deno.test('array', () => {
  equals(coerce(array)(new Map([[1, '1']])), [[1, '1']]);
  equals(coerce(array)(new Set(['1', '2'])), ['1', '2']);
  equals(coerce(array)(['1']), ['1']);
  // not ['1', '2', '3'] even though Strings are iterable
  equals(coerce(array)('123'), ['123']);
  // buffers → array of char codes
  equals(coerce(array)(new Uint8Array('123'.split('').map((s) => s.charCodeAt(0)))), [49, 50, 51]);
  equals(coerce(array)(true), [true]);
  equals(coerce(array)(undefined), [undefined]);
  // WeakSet non-iterable, so it gets wrapped in array
  const weakSet = new WeakSet();
  equals(coerce(array)(weakSet), [weakSet]);
});

Deno.test('number', () => {
  throws(() => coerce(number)(NaN));
  throws(() => coerce(number)(Infinity));
  throws(() => coerce(number)('foo'));
  throws(() => coerce(number)(''));
  throws(() => coerce(number)('-1.234.5'));
  throws(() => coerce(positive)(+0));
  throws(() => coerce(negative)(-0));
  strict(coerce(number)(0o10), 8);
  strict(coerce(number)(0xff), 255);
  strict(coerce(number)(2e3), 2000);
  strict(coerce(number)(1n), 1);
  strict(coerce(number)(1.1), 1.1);
  strict(coerce(number, positive)('1.2'), 1.2);
  strict(coerce(number)('-1.234'), -1.234);
  strict(coerce(number)('0'), 0);
  strict(coerce(number, negative)(-0.5), -0.5);
  strict(coerce(number, negative)(-1), -1);
  strict(coerce(number, negative)('-2.345'), -2.345);
  strict(coerce(nonzero, integer)(1.2), 1);
  throws(() => coerce(nonzero, integer)(0));
  throws(() => coerce(number, nonzero)(''));
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
Deno.test('limit', () => {
  equals(coerce(limit(3))(5), 3);
  strict(coerce(limit(3))('foobar'), 'foo');
  equals(coerce(limit(3))([1, 2, 3, 4, 5]), [1, 2, 3]);
  throws(() => coerce(limit(3))({} as number));
  throws(() => coerce(limit(3))(null as unknown as number));
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
  // this will also pass as the @ format is not validated
  strict(coerce(email)('foo '), 'foo');
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
  throws(() => coerce(date)(undefined!));
  equals(coerce(date)(1628623372929), new Date(1628623372929));
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
