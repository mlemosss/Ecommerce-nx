export type ConsentChoice = 'accepted' | 'rejected';

const STORAGE_KEY = 'no-excuse:cookie-consent';

/** Evento interno: o banner avisa os scripts sem precisar recarregar a página. */
export const CONSENT_EVENT = 'no-excuse:consent-changed';

export function getConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'accepted' || stored === 'rejected' ? stored : null;
}

export function setConsent(choice: ConsentChoice): void {
  window.localStorage.setItem(STORAGE_KEY, choice);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

/** Permite ao titular mudar de ideia: usado pelo link no rodapé. */
export function clearConsent(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}
