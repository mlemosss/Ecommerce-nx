'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { SaleButton, fullPrice, isOnSale } from '../../components/sale-button';
import { api, resolveMediaUrl } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import type { Product } from '../../lib/types';

export default function SalePage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get<Product[]>('/products')
      .then(setProducts)
      .catch((err) => setError(err.message ?? 'Erro ao carregar produtos'));
  }, []);

  useEffect(load, [load]);

  const onSale = useMemo(() => (products ?? []).filter(isOnSale), [products]);

  const totalDesconto = onSale.reduce((sum, p) => sum + (fullPrice(p) - p.price), 0);

  return (
    <div>
      <TopBar title="Sale" />
      <div className="px-4 pt-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {products === null && <p className="mt-8 text-center text-sm text-black/50">Carregando...</p>}

        {products && onSale.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-black/60">Nenhuma peça em promoção.</p>
            <p className="mt-2 text-sm text-black/60">
              Coloque uma peça em promoção pela tela{' '}
              <Link href="/produtos" className="font-semibold underline underline-offset-4">
                Produtos
              </Link>
              .
            </p>
          </div>
        )}

        {onSale.length > 0 && (
          <>
            <div className="card !p-3">
              <p className="text-sm">
                <span className="font-bold">{onSale.length}</span>{' '}
                {onSale.length === 1 ? 'peça em promoção' : 'peças em promoção'} · desconto somado de{' '}
                <span className="font-bold">{formatPrice(totalDesconto)}</span> por unidade vendida
              </p>
              <p className="mt-1 text-xs text-black/60">
                Elas aparecem na aba <span className="font-semibold">Sale</span> da loja.
              </p>
            </div>

            <div className="mt-3 space-y-2">
              {onSale.map((product) => {
                const full = fullPrice(product);
                const off = Math.round((1 - product.price / full) * 100);
                const stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                return (
                  <div key={product.id} className="rounded-2xl bg-neutral-100 p-3">
                    <div className="flex items-center gap-3">
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(product.images[0])}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 shrink-0 rounded-xl bg-black/10" />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/produtos/${product.id}`}
                          className="truncate font-semibold underline-offset-4 hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-0.5 text-sm">
                          <span className="text-black/60 line-through">{formatPrice(full)}</span>{' '}
                          <span className="font-bold">{formatPrice(product.price)}</span>
                        </p>
                        <p className="text-xs text-black/60">{stock} em estoque</p>
                      </div>
                      <span className="shrink-0 bg-ink px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                        -{off}%
                      </span>
                    </div>

                    <div className="mt-3 border-t border-black/10 pt-3">
                      <SaleButton product={product} onDone={load} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
