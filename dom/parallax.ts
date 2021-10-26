// @ts-ignore tsc non-sense
import loaded from './loaded.ts';
// @ts-ignore tsc non-sense
import viewport from './viewport.ts';

export type ParallaxEvent = CustomEvent<number>;

declare global {
  interface HTMLElementEventMap {
    'parallax': ParallaxEvent;
  }
}

// // THIS HAD NO IMPACT ON PERFORMANCE
// const debounceRaf = <T extends (...args: any[]) => any>(fn: T) => {
//   let lock = 0;
//   // let debugDebounceCount = 0;
//   return (...args: Parameters<T>) => {
//     if (lock === 0) {
//       lock = requestAnimationFrame(() => {
//         fn(...args);
//         lock = 0;
//         // console.log(`debounced ${debugDebounceCount} calls`);
//         // debugDebounceCount = 0;
//       });
//       // } else {
//       //   debugDebounceCount++;
//     }
//   };
// };

const progress = (element: HTMLElement, viewportHeight: number, scrollY: number) => {
  const { top, height } = element.getBoundingClientRect();
  const aboveTheFoldAdjustment = Math.max(0, viewportHeight - (scrollY + top));
  return (viewportHeight - top - aboveTheFoldAdjustment) /
    (viewportHeight + height - aboveTheFoldAdjustment);
  // intro: (viewportHeight - top) / viewportHeight
  // main (sort of works): viewportHeight - height - top) / height
  // outro: (viewportHeight - (top + height)) / viewportHeight
};

const elements = new Set<HTMLElement>();

const fire = () => {
  const viewportHeight = viewport().height; // instead of window.innerHeight
  for (const element of elements) {
    const detail = progress(element, viewportHeight, scrollY);
    if (detail >= 0 && detail <= 1) {
      const event: ParallaxEvent = new CustomEvent('parallax', {
        bubbles: false,
        detail,
      });
      element.dispatchEvent(event);
    }
  }
};

// const fireDebounced = debounceRaf(fire);

/**
 * Enable "parallax" event dispatching on `element`. Listeners bound with
 * `element.addEventListener("parallax", listener)` receive ParallaxEvent (%
 * scroll progress) on scroll/resize.
 */
export default (element: HTMLElement) => {
  elements.add(element);
};

loaded(fire);
addEventListener('resize', fire, { passive: true });
addEventListener('scroll', fire, { passive: true });
