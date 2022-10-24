// @ts-ignore tsc non-sense
import { instance, nonempty, or, string, to } from '../coerce.ts';
// @ts-ignore tsc non-sense
import { fetchThrow500, readResponseError } from '../http.ts';
// @ts-ignore tsc non-sense
import { retry } from '../control.ts';

export type SuccessEvent = CustomEvent<Response>;
export type FailureEvent = CustomEvent<Error>;

declare global {
  interface HTMLElementEventMap {
    'success': SuccessEvent;
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

const showError = (submit: HTMLInputElement) => (error: unknown) => {
  const { message } = to(
    instance(Error),
    or(new Error('Unexpected error encountered. Please try again.')),
  )(error);
  submit.insertAdjacentHTML('beforebegin', `<p class="error">${message}</p>`);
};

const handler = async (form: HTMLFormElement) => {
  const inputs = form.querySelectorAll('input');
  const submit = form.querySelector<HTMLInputElement>('input[type="submit"]')!;
  const method = to(string, nonempty, or('POST'))(form.getAttribute('method')) as string;
  const uri = to(string, nonempty, or(new TypeError(`Invalid “action” attribute on ${form}.`)))(
    form.getAttribute('action'),
  ) as string;
  const body = new FormData(form);
  clearError(form);
  submitting(inputs, submit);
  const options = { method, body };
  try {
    const retryFetch = retry(fetchThrow500);
    const response = await retryFetch(uri, options);
    if (!response.ok) {
      // On errors, we _do_ consume Response body to parse an error message.
      throw await readResponseError(response);
    }
    // Do _not_ consume Response object here since it is one-and-done.
    form.classList.add('thanks');
    form.dispatchEvent(new CustomEvent('success', { detail: response }));
  } catch (error) {
    showError(submit)(error);
    form.dispatchEvent(new CustomEvent('failure', { detail: error }));
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
