import { Suspense } from 'react';
import { AccountsPageClient } from './accounts-page-client';

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-24 text-center text-sm text-black/50">Carregando...</div>}>
      <AccountsPageClient />
    </Suspense>
  );
}
