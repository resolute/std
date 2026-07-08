import loaded from './loaded.ts';
import viewport from './viewport.ts';

export type ParallaxEvent = CustomEvent<number>;

const progress = (element: HTMLElement, viewportHeight: number, scrollY: number): number => {
  const { top, height, bottom } = element.getBoundingClientRect();
  const documentHeight = document.documentElement.scrollHeight;
  const aboveTheFoldAdjustment = Math.max(0, viewportHeight - (scrollY + top));
  const belowTheFoldAdjustment = Math.max(
    0,
    viewportHeight - (documentHeight - (scrollY + bottom)),
  );
  const progress = (viewportHeight - top - aboveTheFoldAdjustment) /
    (viewportHeight + height - aboveTheFoldAdjustment - belowTheFoldAdjustment);
  return progress;
};

const elements = /* @__PURE__ */ new Set<HTMLElement>();

const fire = (): void => {
  requestAnimationFrame(() => {
    const viewportHeight = viewport().height; // instead of window.innerHeight
    const queue: [HTMLElement, number][] = [];
    for (const element of elements) {
      const detail = progress(element, viewportHeight, scrollY);
      if (detail >= 0 && detail <= 1) {
        queue.push([element, detail]);
      }
    }
    for (const [element, detail] of queue) {
      const event: ParallaxEvent = new CustomEvent('parallax', {
        bubbles: false,
        detail,
      });
      element.dispatchEvent(event);
    }
  });
};

let listening = false;

const listen = (): void => {
  if (listening) {
    return;
  }
  listening = true;
  loaded(fire);
  addEventListener('resize', fire, { passive: true });
  addEventListener('scroll', fire, { passive: true });
};

/**
 * Enable "parallax" event dispatching on `element`. Listeners bound with
 * `element.addEventListener("parallax", listener)` receive ParallaxEvent (%
 * scroll progress) on scroll/resize.
 */
export default (element: HTMLElement): void => {
  elements.add(element);
  listen();
};
