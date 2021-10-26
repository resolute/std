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

export default (
  name: string,
  actual: (fromClickEvent: boolean) => Promise<any>,
  facadeDomString: string,
) => {
  const elements = htmlToElements(facadeDomString);
  const element = elements[elements.length - 1]!;
  const loadActual = (fromClickEvent: boolean) =>
    actual(fromClickEvent)
      .finally(() => {
        setTimeout(removeElements, 0, elements);
      });

  if (sessionStorage.getItem(name)) {
    loadActual(false);
  } else {
    element.addEventListener('click', () => {
      element.classList.add('loading');
      sessionStorage.setItem(name, '1');
      loadActual(true);
    }, { once: true });
    appendElements(elements);
  }
};
