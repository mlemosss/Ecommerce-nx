'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import type { Product } from '../../lib/types';

const LOW_STOCK_THRESHOLD = 5;

export default function StockPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [onlyLow, setOnlyLow] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    api.get<Product[]>('/products').then(setProducts);
  }

  useEffect(load, []);

  const rows = useMemo(() => {
    if (!products) return [];
    const all = products.flatMap((product) =>
      product.variants.map((variant) => ({ product, variant }))
    );
    return onlyLow ? all.filter((r) => r.variant.stock <= LOW_STOCK_THRESHOLD) : all;
  }, [products, onlyLow]);

  async function saveStock(variantId: string, stock: number) {
    setSavingId(variantId);
    try {
      await api.patch(`/products/variants/${variantId}/stock`, { stock });
      load();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <TopBar title="Estoque" />
      <div className="px-4 pt-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={onlyLow}
            onChange={(e) => setOnlyLow(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Mostrar apenas estoque baixo (≤ {LOW_STOCK_THRESHOLD})
        </label>

        {products === null && <p className="mt-8 text-center text-sm text-black/50">Carregando...</p>}

        <div className="mt-4 space-y-2">
          {rows.map(({ product, variant }) => (
            <div key={variant.id} className="card flex items-center justify-between gap-3 !p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{product.name}</p>
                <p className="text-xs text-black/50">
                  {variant.color} · {variant.size}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  defaultValue={variant.stock}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (value !== variant.stock) saveStock(variant.id, value);
                  }}
                  className={`w-16 rounded-lg border px-2 py-1.5 text-center text-sm ${
                    variant.stock <= LOW_STOCK_THRESHOLD
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-black/10'
                  }`}
                />
                {savingId === variant.id && <span className="text-xs text-black/40">salvando…</span>}
              </div>
            </div>
          ))}
          {rows.length === 0 && products && (
            <p className="mt-8 text-center text-sm text-black/50">Nenhum item encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
