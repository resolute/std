const ruler = document.createElement('div');
ruler.style.width = '100vw';
ruler.style.height = '100vh';
ruler.style.position = 'fixed';
ruler.style.top = '0';
ruler.style.left = '0';
ruler.style.pointerEvents = 'none';
ruler.style.opacity = '0';
document.body.appendChild(ruler);

/**
 * iOS (and others) change the size of `window.innerHeight` when the address
 * bar/footer expand or contract. This workaround returns the DOMRect of a 100vw
 * x 100vh element, which does _not_ change when the address bar/footer
 * expands/collapses.
 *
 * Note: the `.top` of elements _do_ change when the address bar/footer
 * expands/collapses, because the `window.scrollY` _also_ changes. Since the
 * physical viewport _is_ scrolled, you must use the `.top` property in your
 * formulas. This will incur a slight change in an element’s scroll progress,
 * but it is factual since the viewport is actually being scrolled. Using this
 * viewport hack (instead of `window.innerHeight`) will result in a smoother
 * calculation.
 *
 * For example, when the address bar/footer expands, the `window.scrollY`
 * increases (scrolls down). This will increase your element’s progress forward
 * slightly based on the delta of `window.scrollY`. However, if you use
 * `window.innerHeight` directly, it will shrink, because the viewport gets
 * smaller, and your percent progress of an element will actually go backwards.
 * This is the jarring effect that can be mitigated by using this workaround vs
 * `window.innerHeight`.
 */
export default () => ruler.getBoundingClientRect();
