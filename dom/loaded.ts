// Instead of DOMContentLoaded and readyState = "interactive",
// which is the traditional DOM ready state, rely on "complete"
// or window.onload.

let loaded = /^c/.test(document.readyState);

const fns: FrameRequestCallback[] = [];

const recurse: FrameRequestCallback = (time) => {
  const fn = fns.shift();
  if (!fn) {
    return;
  }
  fn(time);
  requestAnimationFrame(recurse);
};

/**
 * Invoke function after Window “load” event. If load has transpired, function
 * is invoked using `requestAnimationFrame()`.
 */
export default (fn: FrameRequestCallback) => {
  if (loaded) {
    requestAnimationFrame(fn);
  } else {
    fns.push(fn);
  }
};

if (!loaded) {
  addEventListener('load', () => {
    loaded = true;
    requestAnimationFrame(recurse);
  }, { once: true });
}
