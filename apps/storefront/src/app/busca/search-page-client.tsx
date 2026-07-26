'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProducts } from '../../lib/products-context';
import { ProductCard } from '../../components/product-card';
import { RecentlyViewed } from '../../components/recently-viewed';

export function SearchPageClient() {
  const { products } = useProducts();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return products.filter((p) =>
      [p.name, p.category, p.description].some((field) => field.toLowerCase().includes(term))
    );
  }, [query, products]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.replace(`/busca?q=${encodeURIComponent(query)}`);
  }

  const hasQuery = query.trim().length > 0;

  return (
    <div className="container-page py-12">
      <h1 className="section-title">Buscar produtos</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="O que você está procurando?"
          autoFocus
          className="w-full rounded-full border border-black/10 px-5 py-3 text-sm focus:border-ink focus:outline-none"
        />
      </form>

      {hasQuery ? (
        <>
          <p className="mt-6 text-black/60">
            {results.length > 0
              ? `${results.length} resultado(s) para "${query}"`
              : `Nenhum resultado para "${query}"`}
          </p>

          {results.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 text-black/50">Digite algo para buscar produtos.</p>
      )}

      <RecentlyViewed />
    </div>
  );
}
