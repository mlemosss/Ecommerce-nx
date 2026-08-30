'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { categories } from '../../lib/products';
import type { Category, Product } from '../../lib/types';
import { ProductCard } from '../../components/product-card';
import { RecentlyViewed } from '../../components/recently-viewed';

type SortOption = 'relevancia' | 'menor-preco' | 'maior-preco';

/**
 * Os produtos chegam prontos do servidor, já filtrados pela categoria da URL.
 * Antes esta tela buscava o catálogo sozinha e o robô do Google recebia
 * "Carregando…". Aqui sobrou o que precisa mesmo ser interativo: a ordenação.
 */
/** Categorias que têm endereço próprio; o resto continua vivendo no filtro. */
const CATEGORIAS_COM_PAGINA = new Set(['leggings', 'tops', 'shorts']);

function enderecoDaCategoria(value: Category | null): string {
  if (!value) return '/produtos';
  return CATEGORIAS_COM_PAGINA.has(value) ? `/${value}` : `/produtos?categoria=${value}`;
}

export function ProductsPageClient({
  products,
  categoria: categoriaParam,
  chamada,
}: {
  products: Product[];
  categoria: Category | null;
  /** Uma linha sobre a prateleira, quando ela tem endereço próprio. */
  chamada?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortOption>('relevancia');

  const filtered = useMemo(() => {
    if (sort === 'menor-preco') return [...products].sort((a, b) => a.price - b.price);
    if (sort === 'maior-preco') return [...products].sort((a, b) => b.price - a.price);
    return products;
  }, [sort, products]);

  // Selo em todo card não distingue nada (o catálogo inteiro é recente).
  const everythingIsNew = filtered.length > 0 && filtered.every((p) => p.isNew);

  function selectCategory(value: Category | null) {
    router.push(enderecoDaCategoria(value));
  }

  const activeLabel = categoriaParam
    ? categories.find((c) => c.value === categoriaParam)?.label
    : 'Todos os produtos';

  return (
    <div className="container-page py-14 sm:py-16">
      <p className="eyebrow text-ink/50">Vitrine</p>
      <h1 className="section-title mt-3">{activeLabel}</h1>
      {chamada && <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/70">{chamada}</p>}
      <p className="mt-2 text-sm text-ink/60">
        {filtered.length} {filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
      </p>

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
