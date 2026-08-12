import { Suspense } from 'react';
import { getSettings } from '../../lib/api';
import { OrderConfirmationClient } from './order-confirmation-client';

export const metadata = {
  title: 'Pedido confirmado — NO EXCUSE',
  // Traz número de pedido e link de pagamento na URL: não pode ser indexada.
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage() {
  const settings = await getSettings();

  return (
    <Suspense
      fallback={<div className="container-page py-24 text-center text-sm text-ink/60">Carregando...</div>}
    >
      <OrderConfirmationClient
        googleAdsId={settings.googleAdsId}
        googleAdsConversionLabel={settings.googleAdsConversionLabel}
      />
    </Suspense>
  );
}
