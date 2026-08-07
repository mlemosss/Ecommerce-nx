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
  const everythingIsNew = results.length > 0 && results.every((p) => p.isNew);

  return (
    <div className="container-page py-14 sm:py-16">
      <p className="eyebrow text-ink/50">Busca</p>
      <h1 className="section-title mt-3">Buscar produtos</h1>

      <form onSubmit={handleSubmit} className="mt-8 max-w-xl">
        <label htmlFor="busca" className="sr-only">
          O que você está procurando?
        </label>
        <input
          id="busca"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="O que você está procurando?"
          autoFocus
          className="w-full border border-ink/20 px-5 py-4 text-sm focus:border-ink focus:outline-none"
        />
      </form>

      {hasQuery ? (
        <>
          <p className="mt-6 text-sm text-ink/60" role="status">
            {results.length > 0
              ? `${results.length} resultado(s) para "${query}"`
              : `Nenhum resultado para "${query}"`}
          </p>

          {results.length > 0 && (
            <div className="mt-10 grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-3 lg:grid-cols-4">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} showBadge={!everythingIsNew} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 text-sm text-ink/60">Digite algo para buscar produtos.</p>
      )}

      <RecentlyViewed />
    </div>
  );
}
