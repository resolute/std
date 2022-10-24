const makeReadyStatePromise = (regexp: RegExp, event: 'DOMContentLoaded' | 'pageshow') =>
  new Promise<DOMHighResTimeStamp>((resolve) => {
    const rafResolve = requestAnimationFrame.bind(undefined, resolve);
    if (regexp.test(document.readyState)) {
      addEventListener(event, rafResolve, { once: true });
    } else {
      rafResolve();
    }
  });

export const interactive = /* @__PURE__ */ makeReadyStatePromise(/^l/, 'DOMContentLoaded');

export const loaded = /* @__PURE__ */ makeReadyStatePromise(/^c/, 'pageshow');

export default (fn: FrameRequestCallback) => loaded.then(requestAnimationFrame.bind(undefined, fn));
