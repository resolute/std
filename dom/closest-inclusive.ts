export default (element: Element, selector: string) => {
  if (element.matches(selector)) {
    return element;
  }
  return element.closest(selector);
};
