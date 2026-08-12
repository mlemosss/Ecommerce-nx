'use client';

import { useEffect, useRef } from 'react';
import { getConsent } from '../lib/cookie-consent';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Dispara a compra para o GTM e para o Meta Pixel.
 *
 * Sem isto, o Pixel e o GTM registram apenas visita de página: o Google Ads não
 * consegue medir conversão e o Meta não tem evento de compra para otimizar. O
 * evento respeita o consentimento — sem aceite, nada é enviado.
 */
export function PurchaseEvent({
  orderNumber,
  total,
  googleAdsId,
  googleAdsConversionLabel,
}: {
  orderNumber: string;
  total: number;
  googleAdsId?: string | null;
  googleAdsConversionLabel?: string | null;
}) {
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

    // Conversão do Google Ads. A tag base sozinha só mede visita: é este evento,
    // com o rótulo da ação de conversão, que registra a venda.
    if (googleAdsId && googleAdsConversionLabel) {
      window.gtag?.('event', 'conversion', {
        send_to: `${googleAdsId}/${googleAdsConversionLabel}`,
        value: total,
        currency: 'BRL',
        transaction_id: orderNumber,
      });
    }
  }, [orderNumber, total, googleAdsId, googleAdsConversionLabel]);

  return null;
}
