import { afterEach, expect, test, vi } from 'vitest';
import { greetingFor, greetings } from '../../apps/web/src/greetings';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('greeting stays steady during navigation and uses an updated username', () => {
  const first = greetingFor('greeting-stable', 'AdaByte');
  expect(greetingFor('greeting-stable', 'AdaByte')).toBe(first);
  expect(greetingFor('greeting-stable', 'NewName')).toBe(first.replace('AdaByte', 'NewName'));
});

test('next visit skips the previously displayed message', () => {
  const setItem = vi.fn();
  vi.stubGlobal('sessionStorage', { getItem: () => '0', setItem });
  vi.spyOn(Math, 'random').mockReturnValue(0);
  expect(greetingFor('greeting-repeat', 'Ada')).toBe(`${greetings[1][0]}, Ada${greetings[1][1]}`);
  expect(setItem).toHaveBeenCalledWith('codeclash:last-greeting', '1');
});

test('blocked storage and incomplete profiles still get a clean greeting', () => {
  vi.stubGlobal('sessionStorage', {
    getItem: () => {
      throw new Error('Blocked');
    },
    setItem: () => {
      throw new Error('Blocked');
    },
  });
  const text = greetingFor('greeting-no-storage');
  expect(text).not.toMatch(/undefined|null|your account/);
  expect(greetings.some(([message, punctuation]) => text === `${message}${punctuation}`)).toBe(
    true,
  );
});
