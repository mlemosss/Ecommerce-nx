import { Suspense } from 'react';
import { SearchPageClient } from './search-page-client';

export const metadata = {
  title: 'Busca — NO EXCUSE',
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container-page py-24 text-center">Carregando...</div>}>
      <SearchPageClient />
    </Suspense>
  );
}
