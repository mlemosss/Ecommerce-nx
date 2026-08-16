import { Suspense } from 'react';
import { SearchPageClient } from './search-page-client';

export const metadata = {
  title: 'Busca — NO EXCUSE',
  /**
   * Resultado de busca interna não entra no índice: cada `?q=` viraria uma URL
   * rasa e o Google acaba com centenas de páginas quase vazias no lugar das
   * dez que importam. `follow` fica ligado para os links de produto daqui
   * continuarem valendo como caminho de rastreamento.
   */
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container-page py-24 text-center">Carregando...</div>}>
      <SearchPageClient />
    </Suspense>
  );
}
