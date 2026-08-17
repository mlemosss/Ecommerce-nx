'use client';

import { useEffect, useRef } from 'react';
import { getConsent } from '../lib/cookie-consent';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Dispara a compra para o GTM e para o Google Ads.
 *
 * O Meta saiu daqui de propósito.
 *
 * Esta tela recebe só número do pedido e total, pela URL — os itens já foram
 * embora com o carrinho. O `fbq('track','Purchase')` que existia aqui ia sem
 * `content_ids`, e é por isso que o Gerenciador de Eventos mostrava 2 compras
 * enquanto o Commerce Manager insistia que não recebia nenhuma: sem os ids das
 * variações, o evento existe para a Meta e não existe para o catálogo. Era o
 * sintoma da taxa de correspondência em 0%.
 *
 * A compra agora sai do checkout, onde os itens ainda estão em mãos, com
 * `content_ids` e `eventID` = número do pedido. Ver `lib/pixel.ts`.
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
