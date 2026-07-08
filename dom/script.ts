import loaded from './loaded.ts';
import { randomIntInclusive } from '../math.ts';
import { defer } from '../control.ts';

/**
 * Create and append `<script>` to DOM with async and defer.
 */
export const script = (src: string, timeout = 0, jitter = 1000): HTMLScriptElement => {
  const element = document.createElement('script');
  element.async = true;
  element.defer = true;
  loaded(() =>
    setTimeout(() => {
      element.src = src;
      document.body.appendChild(element);
    }, timeout + randomIntInclusive(0, jitter))
  );
  return element;
};

/**
 * Create and append `<script>` to DOM, but registers a one-time listener that
 * resolves the returned Promise.
 */
export const scriptP = (...args: Parameters<typeof script>): Promise<Event> => {
  const [promise, resolve] = defer<Event>();
  const element = script(...args);
  element.addEventListener('load', resolve, { once: true });
  return promise;
};
// export const scriptP = (...args: Parameters<typeof script>) =>
//   new Promise<Event>((resolve) => {
//     const element = script(...args);
//     element.addEventListener('load', resolve, { once: true });
//   });
