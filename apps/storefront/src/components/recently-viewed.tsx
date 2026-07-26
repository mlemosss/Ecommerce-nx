'use client';

import { useEffect, useState } from 'react';
import type { Product } from '../lib/types';
import { useProducts } from '../lib/products-context';
import { getRecentlyViewedIds } from '../lib/recently-viewed';
import { ProductCard } from './product-card';

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { products } = useProducts();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    const ids = getRecentlyViewedIds().filter((id) => id !== excludeId);
    const found = ids
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));
    setItems(found);
  }, [excludeId, products]);

  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="section-title">Vistos recentemente</h2>
      <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
