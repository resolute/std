export default (element: Element, selector: string): Element | null => {
  if (element.matches(selector)) {
    return element;
  }
  return element.closest(selector);
};
