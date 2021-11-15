// @ts-ignore tsc non-sense
import { instance, length, not, string, to } from '../coerce.ts';
// @ts-ignore tsc non-sense
import { fetchThrow500, readResponseError } from '../http.ts';
// @ts-ignore tsc non-sense
import { retry } from '../control.ts';

export type FailureEvent = CustomEvent<Error>;

declare global {
  interface HTMLElementEventMap {
    'success': CustomEvent;
    'failure': FailureEvent;
  }
}

const submitting = (inputs: Iterable<HTMLInputElement>, submit: HTMLInputElement) => {
  for (const input of inputs) {
    input.setAttribute('readonly', '');
  }
  submit.setAttribute('disabled', '');
};

const finished = (inputs: Iterable<HTMLInputElement>, submit: HTMLInputElement) => {
  for (const input of inputs) {
    input.removeAttribute('readonly');
  }
  submit.removeAttribute('disabled');
};

const clearError = (form: HTMLFormElement) => {
  const errorElement = form.querySelector('.error');
  if (errorElement) {
    errorElement.remove();
  }
};

const showError = (submit: HTMLInputElement) =>
  (error: unknown) => {
    const { message } = to(instance(Error))(
      error,
      new Error('Unexpected error encountered. Please try again.'),
    );
    submit.insertAdjacentHTML('beforebegin', `<p class="error">${message}</p>`);
  };

const handler = async (form: HTMLFormElement) => {
  const inputs = form.querySelectorAll('input');
  const submit = form.querySelector<HTMLInputElement>('input[type="submit"]')!;
  const method = to(string, not(length(0)))(form.getAttribute('method')!, 'POST');
  const uri = to(string, not(length(0)))(
    form.getAttribute('action')!,
    new TypeError(`Invalid “action” attribute on ${form}.`),
  );
  const body = new FormData(form);
  clearError(form);
  submitting(inputs, submit);
  const options = { method, body };
  try {
    const retryFetch = retry(fetchThrow500);
    const response = await retryFetch(uri, options);
    if (!response.ok) {
      throw await readResponseError(response);
    }
    // TODO: design decision: should we include the response in the success
    // event?
    // const data = await response.json();
    form.classList.add('thanks');
    form.dispatchEvent(new CustomEvent('success'));
  } catch (error) {
    showError(submit)(error);
    form.dispatchEvent(new CustomEvent('failure', { detail: error }) as FailureEvent);
  } finally {
    finished(inputs, submit);
  }
};

export default (form: HTMLFormElement | null) => {
  if (!form) {
    return;
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handler(form);
  }, false);
};
