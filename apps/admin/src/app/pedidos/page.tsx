import { Suspense } from 'react';
import { OrdersPageClient } from './orders-page-client';

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-24 text-center text-sm text-black/50">Carregando...</div>}>
      <OrdersPageClient />
    </Suspense>
  );
}
