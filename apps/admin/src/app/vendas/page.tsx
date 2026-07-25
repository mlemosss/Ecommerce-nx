import { Suspense } from 'react';
import { SalesPageClient } from './sales-page-client';

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-24 text-center text-sm text-black/50">Carregando...</div>}>
      <SalesPageClient />
    </Suspense>
  );
}
