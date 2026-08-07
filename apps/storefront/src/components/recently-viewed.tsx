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
    <section className="mt-20">
      <p className="eyebrow text-ink/50">Você viu</p>
      <h2 className="section-title mt-3">Vistos recentemente</h2>
      <div className="mt-10 grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-3 lg:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} showBadge={false} />
        ))}
      </div>
    </section>
  );
}
