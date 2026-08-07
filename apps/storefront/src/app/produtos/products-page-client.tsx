'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { categories } from '../../lib/products';
import { useProducts } from '../../lib/products-context';
import type { Category } from '../../lib/types';
import { ProductCard } from '../../components/product-card';
import { RecentlyViewed } from '../../components/recently-viewed';

type SortOption = 'relevancia' | 'menor-preco' | 'maior-preco';

export function ProductsPageClient() {
  const { products } = useProducts();
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
  }, [categoriaParam, sort, products]);

  // Selo em todo card não distingue nada (o catálogo inteiro é recente).
  const everythingIsNew = filtered.length > 0 && filtered.every((p) => p.isNew);

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
    <div className="container-page py-14 sm:py-16">
      <p className="eyebrow text-ink/50">Vitrine</p>
      <h1 className="section-title mt-3">{activeLabel}</h1>
      <p className="mt-2 text-sm text-ink/60">{filtered.length} produtos encontrados</p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-line py-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={!categoriaParam} onClick={() => selectCategory(null)}>
            Todos
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c.value}
              active={categoriaParam === c.value}
              onClick={() => selectCategory(c.value)}
            >
              {c.label}
            </FilterChip>
          ))}
        </div>

        <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/60">
          Ordenar
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="border border-ink/15 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink focus:border-ink focus:outline-none"
          >
            <option value="relevancia">Relevância</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm text-ink/60">
          Nenhum produto encontrado para esse filtro.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} showBadge={!everythingIsNew} />
          ))}
        </div>
      )}

      <RecentlyViewed />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
        active ? 'bg-ink text-white' : 'text-ink/60 hover:bg-paper hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
