'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CONSENT_EVENT, getConsent, setConsent } from '../lib/cookie-consent';

/**
 * Banner de consentimento.
 *
 * "Aceitar" e "Recusar" têm o mesmo peso visual de propósito: esconder a recusa
 * atrás de um link cinza é o truque clássico, e consentimento obtido assim não
 * vale. Enquanto não houver escolha, nenhum script de rastreamento carrega.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(getConsent() === null);
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-ink text-white"
    >
      <div className="container-page flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-white/75">
          Usamos cookies de medição e publicidade para entender como a loja é usada e mostrar
          nossos produtos para você em outros sites. Eles só são ativados se você aceitar.{' '}
          <Link href="/privacidade" className="text-white underline underline-offset-4">
            Saiba mais
          </Link>
          .
        </p>

        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => setConsent('rejected')}
            className="border border-white/40 px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:border-white"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={() => setConsent('accepted')}
            className="bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-ink transition hover:shadow-lg"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
