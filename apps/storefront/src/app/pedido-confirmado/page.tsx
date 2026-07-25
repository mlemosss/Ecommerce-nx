import { Suspense } from 'react';
import { OrderConfirmationClient } from './order-confirmation-client';

export const metadata = {
  title: 'Pedido confirmado — NO EXCUSE',
};

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="container-page py-24 text-center">Carregando...</div>}>
      <OrderConfirmationClient />
    </Suspense>
  );
}
