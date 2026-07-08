import { test } from 'node:test';
import { deepStrictEqual, fail, ok, strictEqual, throws } from 'node:assert/strict';

export { deepStrictEqual as equals, ok as assert, strictEqual as strict, test, throws };

export const exists = (value: unknown): void => {
  ok(value !== null && typeof value !== 'undefined');
};

export const matches = (
  actual: object,
  expected: Record<PropertyKey, unknown>,
): void => {
  for (const key of Reflect.ownKeys(expected)) {
    deepStrictEqual((actual as Record<PropertyKey, unknown>)[key], expected[key]);
  }
};

export const throwsAsync = async (
  fn: () => unknown,
  ErrorClass?: new (...args: any[]) => Error,
  messageIncludes?: string,
): Promise<void> => {
  try {
    await fn();
  } catch (error) {
    if (ErrorClass) {
      ok(error instanceof ErrorClass);
    }
    if (messageIncludes) {
      ok(error instanceof Error && error.message.includes(messageIncludes));
    }
    return;
  }
  fail('Expected function to reject.');
};
