'use client';

import { useEffect, useState } from 'react';
import { CONSENT_EVENT, clearConsent, getConsent, setConsent } from '../lib/cookie-consent';
import type { ConsentChoice } from '../lib/cookie-consent';

const LABEL: Record<ConsentChoice, string> = {
  accepted: 'Você aceitou os cookies de medição e publicidade.',
  rejected: 'Você recusou os cookies de medição e publicidade.',
};

/** Deixa o titular revogar ou dar o consentimento a qualquer momento. */
export function ConsentPreferences() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => {
      setChoice(getConsent());
      setLoaded(true);
    };
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!loaded) return null;

  return (
    <div className="border border-line bg-paper p-5">
      <p className="text-sm text-ink/75">
        {choice ? LABEL[choice] : 'Você ainda não escolheu.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {choice !== 'accepted' && (
          <button
            type="button"
            onClick={() => setConsent('accepted')}
            className="btn-primary !px-6 !py-3"
          >
            Aceitar
          </button>
        )}
        {choice !== 'rejected' && (
          <button
            type="button"
            onClick={() => setConsent('rejected')}
            className="btn-secondary !px-6 !py-3"
          >
            Recusar
          </button>
        )}
        {choice && (
          <button
            type="button"
            onClick={clearConsent}
            className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60 underline underline-offset-4 transition hover:text-ink"
          >
            Perguntar de novo
          </button>
        )}
      </div>
      {choice === 'accepted' && (
        <p className="mt-3 text-xs text-ink/60">
          Ao recusar, os scripts param de carregar na próxima página que você abrir.
        </p>
      )}
    </div>
  );
}
