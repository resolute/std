const htmlToElements = <T extends HTMLElement>(html: string) => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return [...template.content.childNodes as unknown as NodeListOf<T>];
};

const appendElements = (elements: HTMLElement[]) => {
  for (const element of elements) {
    document.body.appendChild(element);
  }
};

const removeElements = (elements: HTMLElement[]) => {
  for (const element of elements) {
    element.remove();
  }
};

export default <T extends (fromClickEvent: boolean) => Promise<any>>(
  name: string,
  actual: T,
  facadeDomString: string,
) => {
  const elements = htmlToElements(facadeDomString);
  const element = elements[elements.length - 1]!;
  const loadActual = (fromClickEvent: boolean) => {
    if (fromClickEvent) {
      element.classList.add('loading');
      sessionStorage.setItem(name, '1');
    }
    return actual(fromClickEvent)
      .finally(() => {
        setTimeout(removeElements, 0, elements);
      });
  };
  if (sessionStorage.getItem(name)) {
    loadActual(false);
  } else {
    element.addEventListener('click', () => {
      loadActual(true);
    }, { once: true });
    appendElements(elements);
  }
  return loadActual;
};
