import loaded from './loaded.js';
import { randomIntInclusive } from '../math.js';
import { defer } from '../control.js';

/**
 * Create and append `<script>` to DOM with async and defer.
 */
export const script = (src: string, timeout = 0, jitter = 1000) => {
  const element = document.createElement('script');
  element.async = true;
  element.defer = true;
  loaded(() => setTimeout(() => {
    element.src = src;
    document.body.appendChild(element);
  }, timeout + randomIntInclusive(0, jitter)));
  return element;
};

/**
 * Create and append `<script>` to DOM, but registers a one-time listener that
 * resolves the returned Promise.
 */
export const scriptP = (...args: Parameters<typeof script>) => {
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
