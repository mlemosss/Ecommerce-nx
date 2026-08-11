'use client';

import { useEffect, useRef } from 'react';
import { getConsent } from '../lib/cookie-consent';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Dispara a compra para o GTM e para o Meta Pixel.
 *
 * Sem isto, o Pixel e o GTM registram apenas visita de página: o Google Ads não
 * consegue medir conversão e o Meta não tem evento de compra para otimizar. O
 * evento respeita o consentimento — sem aceite, nada é enviado.
 */
export function PurchaseEvent({ orderNumber, total }: { orderNumber: string; total: number }) {
  const sent = useRef(false);

  useEffect(() => {
    // O React roda o efeito duas vezes em desenvolvimento; a compra é uma só.
    if (sent.current) return;
    if (getConsent() !== 'accepted') return;
    if (!orderNumber || !Number.isFinite(total)) return;

    sent.current = true;

    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: orderNumber,
        value: total,
        currency: 'BRL',
      },
    });

    window.fbq?.('track', 'Purchase', { value: total, currency: 'BRL' });
  }, [orderNumber, total]);

  return null;
}
