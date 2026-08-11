'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { SaleButton, fullPrice, isOnSale } from '../../components/sale-button';
import { api, resolveMediaUrl } from '../../lib/api';
import { colorSwatch } from '../../lib/colors';
import { formatPrice } from '../../lib/format';
import type { Product } from '../../lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get<Product[]>('/products')
      .then(setProducts)
      .catch((err) => setError(err.message ?? 'Erro ao carregar produtos'));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const term = search.trim().toLowerCase();
    return term ? products.filter((p) => p.name.toLowerCase().includes(term)) : products;
  }, [products, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const product of filtered) {
      const letter = product.name[0]?.toUpperCase() ?? '#';
      groups[letter] = groups[letter] ?? [];
      groups[letter].push(product);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div>
      <TopBar
        title="Produtos"
        rightAction={
          <Link href="/produtos/novo" className="btn-primary !px-4 !py-2 text-xs">
            + Novo
          </Link>
        }
      />

      <div className="px-4 pt-4">
        <div className="flex items-center justify-end">
          <Link href="/importar?tipo=produtos" className="text-xs font-semibold text-accent underline">
            Importar CSV/XML
          </Link>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar produto"
          className="input-field mt-2"
        />

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {products === null && !error && (
          <p className="mt-8 text-center text-sm text-black/50">Carregando produtos...</p>
        )}

        {products && products.length === 0 && (
          <p className="mt-8 text-center text-sm text-black/50">
            Nenhum produto cadastrado ainda. Crie o primeiro!
          </p>
        )}

        {grouped.map(([letter, items]) => (
          <div key={letter} className="mt-4">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/5 text-sm font-semibold">
              {letter}
            </span>
            <div className="mt-2 space-y-2">
              {items.map((product) => {
                const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                const colors = Array.from(new Set(product.variants.map((v) => v.color)));
                const sizes = Array.from(new Set(product.variants.map((v) => v.size)));
                const prices = product.variants.map((v) => v.price ?? product.price);
                const minPrice = prices.length ? Math.min(...prices) : product.price;
                const maxPrice = prices.length ? Math.max(...prices) : product.price;
                return (
                  <div key={product.id} className="rounded-2xl bg-neutral-100 p-3">
                  <Link
                    href={`/produtos/${product.id}`}
                    className="flex items-center gap-3"
                  >
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveMediaUrl(product.images[0])}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className="h-14 w-14 shrink-0 rounded-xl"
                        style={{ backgroundColor: colorSwatch(colors[0] ?? '') }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{product.name}</p>
                      {isOnSale(product) ? (
                        <p className="text-sm">
                          <span className="text-black/60 line-through">
                            {formatPrice(fullPrice(product))}
                          </span>{' '}
                          <span className="font-bold">{formatPrice(product.price)}</span>
                        </p>
                      ) : (
                        <p className="text-sm">
                          {minPrice === maxPrice
                            ? formatPrice(minPrice)
                            : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`}
                        </p>
                      )}
                      <p className="text-xs text-black/50">Custo: {formatPrice(product.costPrice)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-semibold shadow-sm">
                        📦 {totalStock}
                      </span>
                      <div className="flex gap-1">
                        {colors.slice(0, 3).map((c) => (
                          <span
                            key={c}
                            title={c}
                            className="h-4 w-4 rounded-sm border border-black/10"
                            style={{ backgroundColor: colorSwatch(c) }}
                          />
                        ))}
                        {colors.length > 3 && <span className="text-xs text-black/40">…</span>}
                      </div>
                      <div className="flex gap-1">
                        {sizes.slice(0, 3).map((s) => (
                          <span key={s} className="rounded bg-black/5 px-1 text-[10px] font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>

                  <div className="mt-3 border-t border-black/10 pt-3">
                    <SaleButton product={product} onDone={load} />
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
