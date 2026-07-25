'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from '../../../components/top-bar';
import { ProductForm } from '../../../components/product-form';
import { api } from '../../../lib/api';
import type { Product } from '../../../lib/types';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Product>(`/products/${params.id}`)
      .then(setProduct)
      .catch((err) => setError(err.message ?? 'Produto não encontrado'));
  }, [params.id]);

  return (
    <div>
      <TopBar title="Editar produto" />
      {error && <p className="px-4 pt-4 text-sm text-red-600">{error}</p>}
      {!product && !error && <p className="px-4 pt-8 text-center text-sm text-black/50">Carregando...</p>}
      {product && <ProductForm product={product} />}
    </div>
  );
}
