import { Suspense } from 'react';
import { SalesHistoryClient } from './sales-history-client';

export default function SalesHistoryPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-24 text-center text-sm text-black/50">Carregando...</div>}>
      <SalesHistoryClient />
    </Suspense>
  );
}
