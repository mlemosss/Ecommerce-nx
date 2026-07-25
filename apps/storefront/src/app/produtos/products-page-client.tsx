'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { categories, products } from '../../lib/products';
import type { Category } from '../../lib/types';
import { ProductCard } from '../../components/product-card';

type SortOption = 'relevancia' | 'menor-preco' | 'maior-preco';

export function ProductsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoriaParam = searchParams.get('categoria') as Category | null;
  const [sort, setSort] = useState<SortOption>('relevancia');

  const filtered = useMemo(() => {
    let list = categoriaParam
      ? products.filter((p) => p.category === categoriaParam)
      : products;

    if (sort === 'menor-preco') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sort === 'maior-preco') {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [categoriaParam, sort]);

  function selectCategory(value: Category | null) {
    if (!value) {
      router.push('/produtos');
    } else {
      router.push(`/produtos?categoria=${value}`);
    }
  }

  const activeLabel = categoriaParam
    ? categories.find((c) => c.value === categoriaParam)?.label
    : 'Todos os produtos';

  return (
    <div className="container-page py-12">
      <h1 className="section-title">{activeLabel}</h1>
      <p className="mt-2 text-black/60">{filtered.length} produtos encontrados</p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectCategory(null)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              !categoriaParam ? 'border-ink bg-ink text-white' : 'border-black/10 hover:border-ink'
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => selectCategory(c.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                categoriaParam === c.value
                  ? 'border-ink bg-ink text-white'
                  : 'border-black/10 hover:border-ink'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          Ordenar por
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-full border border-black/10 px-3 py-2 text-sm focus:border-ink focus:outline-none"
          >
            <option value="relevancia">Relevância</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-black/50">
          Nenhum produto encontrado para esse filtro.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
