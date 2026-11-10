import { combine, on, type Cleanup } from './dom.js';

/**
 * Contact form (original: Flo Forms Pro, a Vue app posting to WordPress).
 *
 * The static site posts the form to the endpoint configured at build time in
 * NEXT_PUBLIC_CONTACT_ENDPOINT (any service accepting multipart form posts,
 * e.g. Formspree). Without an endpoint the visitor's mail program is opened
 * with the filled-in message instead. On success the visitor is sent to
 * /danke-seite/ like on the original site.
 */
// Rendered into <meta name="hs-contact-endpoint"> at build time (see components/PageView.tsx).
const endpoint = () => document.querySelector<HTMLMetaElement>('meta[name="hs-contact-endpoint"]')?.content || '';
const MAIL_TO = 'photography@danielaheinisch.at';
const THANK_YOU = '/danke-seite/';
// Validation messages of vue-form-generator, as shown on the original site.
const MSG_REQUIRED = 'This field is required!';
const MSG_EMAIL = 'Invalid email';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initContactForm(): Cleanup {
  const cleanups: Cleanup[] = [];
  document.querySelectorAll<HTMLFormElement>('form[data-hs-form]').forEach((form) => {
    cleanups.push(on(form, 'submit', (e: SubmitEvent) => handleSubmit(e, form)));
    // Clear an error as soon as the field is corrected.
    cleanups.push(
      on(form, 'input', (e: Event) => {
        const group = (e.target as HTMLElement).closest<HTMLElement>('.form-group');
        if (group?.classList.contains('error')) validateGroup(group);
      }),
    );
  });
  return combine(cleanups);
}

function setError(group: HTMLElement, message: string | null) {
  group.querySelector('.errors.help-block')?.remove();
  group.classList.toggle('error', !!message);
  group.classList.toggle('valid', !message);
  if (message) {
    const box = document.createElement('div');
    box.className = 'errors help-block';
    box.setAttribute('role', 'alert');
    const span = document.createElement('span');
    span.textContent = message;
    box.appendChild(span);
    group.appendChild(box);
  }
}

function validateGroup(group: HTMLElement): boolean {
  if (group.classList.contains('flohp') || group.classList.contains('field-submit')) return true;
  const control = group.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([type=radio]), textarea');
  if (!control) return true;
  const value = control.value.trim();
  const required = group.classList.contains('required');
  let message: string | null = null;
  if (required && !value) message = MSG_REQUIRED;
  else if (value && control.getAttribute('type') === 'email' && !EMAIL_RE.test(value)) message = MSG_EMAIL;
  setError(group, message);
  return !message;
}

function collect(form: HTMLFormElement): [string, string][] {
  const fields: [string, string][] = [];
  form.querySelectorAll<HTMLElement>('.form-group').forEach((group) => {
    if (group.classList.contains('flohp') || group.classList.contains('field-submit')) return;
    const label = group.querySelector('label')?.textContent?.trim() || '';
    const radios = Array.from(group.querySelectorAll<HTMLInputElement>('input[type=radio]'));
    if (radios.length) {
      // The original form model pre-selects "Andere".
      const checked = radios.find((r) => r.checked)?.value || radios[radios.length - 1].value;
      fields.push([label, checked]);
      return;
    }
    const control = group.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select',
    );
    if (!control) return;
    const name = label || (control instanceof HTMLSelectElement ? 'Wie bist du auf mich aufmerksam geworden?' : control.name);
    fields.push([name, control.value.trim()]);
  });
  return fields;
}

async function handleSubmit(e: SubmitEvent, form: HTMLFormElement) {
  e.preventDefault();
  const groups = Array.from(form.querySelectorAll<HTMLElement>('.form-group'));
  const valid = groups.map(validateGroup).every(Boolean);
  if (!valid) {
    // like the original: scroll the top of the form to the top of the viewport
    window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
    form
      .querySelector<HTMLElement>('.form-group.error input, .form-group.error textarea')
      ?.focus({ preventScroll: true });
    return;
  }
  const honeypot = form.querySelector<HTMLInputElement>('[name="_honeypot"]');
  if (honeypot && honeypot.value) {
    window.location.href = THANK_YOU;
    return;
  }
  const fields = collect(form);
  const submit = form.querySelector<HTMLInputElement>('input[type=submit]');

  const ENDPOINT = endpoint();
  if (!ENDPOINT) {
    const body = fields.map(([k, v]) => `${k}: ${v}`).join('\n');
    const name = fields.slice(0, 2).map(([, v]) => v).join(' ');
    window.location.href = `mailto:${MAIL_TO}?subject=${encodeURIComponent(`Anfrage von ${name}`)}&body=${encodeURIComponent(body)}`;
    return;
  }

  const data = new FormData();
  fields.forEach(([k, v]) => data.append(k, v));
  const email = fields.find(([k]) => /e-?mail/i.test(k));
  if (email) data.append('_replyto', email[1]);
  data.append('_subject', 'Neue Anfrage über danielaheinisch.at');
  if (submit) submit.disabled = true;
  form.classList.add('flo-form--sending');
  try {
    const res = await fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    window.location.href = THANK_YOU;
  } catch {
    showResponseError(form);
  } finally {
    if (submit) submit.disabled = false;
    form.classList.remove('flo-form--sending');
  }
}

function showResponseError(form: HTMLFormElement) {
  let box = form.querySelector<HTMLElement>('.flo-response-error');
  if (!box) {
    box = document.createElement('div');
    box.className = 'flo-response-error';
    form.appendChild(box);
  }
  box.setAttribute('role', 'alert');
  box.textContent = `Die Nachricht konnte leider nicht gesendet werden. Bitte schreib mir direkt an ${MAIL_TO}.`;
  box.style.display = 'block';
}
