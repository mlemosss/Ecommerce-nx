import { Suspense } from 'react';
import { ProductsPageClient } from './products-page-client';

export const metadata = {
  title: 'Produtos — GRITWEAR',
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container-page py-24 text-center">Carregando...</div>}>
      <ProductsPageClient />
    </Suspense>
  );
}
