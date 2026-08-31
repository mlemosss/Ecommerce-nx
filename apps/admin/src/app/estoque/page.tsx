'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import type { Product } from '../../lib/types';

const LOW_STOCK_THRESHOLD = 5;

/**
 * Peça com a prateleira quase vazia.
 *
 * Metade dos tamanhos esgotados, ou três peças no total contando tudo. Nos dois
 * casos o resultado é o mesmo para quem clica no anúncio: não acha o tamanho
 * dela.
 */
interface PrateleiraVazia {
  id: string;
  name: string;
  slug: string;
  variacoes: number;
  esgotadas: number;
  estoque: number;
  faltando: string[];
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [onlyLow, setOnlyLow] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [quaseVazias, setQuaseVazias] = useState<PrateleiraVazia[]>([]);

  function load() {
    api.get<Product[]>('/products').then(setProducts);
    api
      .get<PrateleiraVazia[]>('/products/prateleira-vazia')
      .then(setQuaseVazias)
      .catch(() => setQuaseVazias([]));
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
        {/* O aviso vem antes da lista. Estoque baixo por variação já existia,
            mas ninguém soma dez linhas de cabeça para perceber que a peça
            inteira está acabando — e é a peça, não a variação, que continua
            aparecendo no anúncio. */}
        {quaseVazias.length > 0 && (
          <div className="card mb-4 border border-amber-200 bg-amber-50">
            <p className="text-sm font-semibold text-amber-900">
              {quaseVazias.length === 1
                ? '1 peça com a prateleira quase vazia'
                : `${quaseVazias.length} peças com a prateleira quase vazia`}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Elas continuam entrando no anúncio, porque ainda têm tamanho em estoque. A cliente
              clica, chega na página e descobre que o dela acabou — e o clique já foi pago.
            </p>

            <ul className="mt-3 space-y-2">
              {quaseVazias.map((p) => (
                <li key={p.id} className="rounded-xl bg-white/70 px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="text-xs text-amber-900">
                      {p.esgotadas} de {p.variacoes} tamanhos fora ·{' '}
                      {p.estoque === 0
                        ? 'esgotada'
                        : `${p.estoque} ${p.estoque === 1 ? 'peça' : 'peças'} no total`}
                    </span>
                  </div>
                  {p.faltando.length > 0 && (
                    <p className="mt-1 text-xs text-amber-800">
                      Faltando: {p.faltando.slice(0, 6).join(' · ')}
                      {p.faltando.length > 6 ? ` e mais ${p.faltando.length - 6}` : ''}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <p className="mt-3 text-xs leading-relaxed text-amber-800">
              O que fazer: repor, ou tirar a peça do anúncio no Meta. Não precisa apagar do site —
              quem chega pelo orgânico ainda compra o tamanho que sobrou, e o &quot;Avise-me&quot;
              guarda o e-mail de quem quer o que faltou.
            </p>
          </div>
        )}

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
