const makeReadyStatePromise = (
  regexp: RegExp,
  event: 'DOMContentLoaded' | 'pageshow',
): Promise<DOMHighResTimeStamp> =>
  new Promise<DOMHighResTimeStamp>((resolve) => {
    const rafResolve = requestAnimationFrame.bind(undefined, resolve);
    if (regexp.test(document.readyState)) {
      addEventListener(event, rafResolve, { once: true });
    } else {
      rafResolve();
    }
  });

export const interactive: Promise<DOMHighResTimeStamp> = /* @__PURE__ */ makeReadyStatePromise(
  /^l/,
  'DOMContentLoaded',
);

export const loaded: Promise<DOMHighResTimeStamp> = /* @__PURE__ */ makeReadyStatePromise(
  /^c/,
  'pageshow',
);

export default (fn: FrameRequestCallback): Promise<DOMHighResTimeStamp> =>
  loaded.then(requestAnimationFrame.bind(undefined, fn));
