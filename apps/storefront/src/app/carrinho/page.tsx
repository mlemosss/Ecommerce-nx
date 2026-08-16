'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../lib/cart-context';
import { useProducts } from '../../lib/products-context';
import { getVariantPrice } from '../../lib/products';
import { formatPrice } from '../../lib/format';
import { discountPercentFor, nextTier, parseTiers } from '../../lib/progressive-discount';
import { ProductImage } from '../../components/product-image';
import { DEFAULT_SETTINGS, getSettings } from '../../lib/api';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal, isLoaded } = useCart();
  const { products } = useProducts();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  if (!isLoaded) {
    return (
      <div className="container-page py-24 text-center text-sm text-ink/60" role="status">
        Carregando carrinho...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center gap-5 py-24 text-center">
        <p className="eyebrow text-ink/50">Carrinho</p>
        <h1 className="section-title">Seu carrinho está vazio</h1>
        <p className="text-sm text-ink/60">Que tal dar uma olhada nos nossos lançamentos?</p>
        <Link href="/produtos" className="btn-primary mt-2">
          Ver produtos
        </Link>
      </div>
    );
  }

  // O frete real depende do CEP e sai da cotação do Melhor Envio, no
  // checkout. Aqui só se sabe uma coisa com certeza: se passou do valor de
  // frete grátis, é grátis.
  //
  // Antes esta linha mostrava , uma taxa fixa de
  // R$ 19,90 que o checkout nem usa. A cliente somava o total no carrinho,
  // avançava, via outro número, e desistia no último passo — o pior lugar
  // possível para uma surpresa de preço.
  const freteGratis = subtotal >= settings.freeShippingThreshold;

  const tiers = parseTiers(settings.progressiveDiscount);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const percent = discountPercentFor(totalItems, tiers);
  const discount = Math.round(((subtotal * percent) / 100) * 100) / 100;
  const upcoming = nextTier(totalItems, tiers);

  const total = Math.max(0, subtotal - discount);

  return (
    <div className="container-page py-14 sm:py-16">
      <p className="eyebrow text-ink/50">Carrinho</p>
      <h1 className="section-title mt-3">Meu carrinho</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-3 lg:gap-16">
        <ul className="border-t border-line lg:col-span-2">
          {items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            return (
              <li
                key={`${item.productId}-${item.size}-${item.color}`}
                className="flex gap-4 border-b border-line py-5"
              >
                <Link href={`/produtos/${product.slug}`} className="shrink-0">
                  <ProductImage
                    category={product.category}
                    gradient={product.gradient}
                    photo={product.images?.[0]}
                    className="h-24 w-20 sm:h-28 sm:w-24"
                  />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/produtos/${product.slug}`}
                        className="text-xs font-semibold uppercase tracking-[0.12em] underline-offset-4 hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-xs text-ink/60">
                        Tamanho {item.size} · Cor {item.color}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.size, item.color)}
                      className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60 underline underline-offset-4 transition hover:text-ink"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="inline-flex items-center border border-ink/15">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.size, item.color, item.quantity - 1)
                        }
                        className="flex h-9 w-9 items-center justify-center transition hover:bg-paper"
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span className="w-9 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.size, item.color, item.quantity + 1)
                        }
                        className="flex h-9 w-9 items-center justify-center transition hover:bg-paper"
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-bold">
                      {formatPrice(getVariantPrice(product, item.color, item.size) * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="h-fit bg-paper p-7">
          <p className="eyebrow text-ink/50">Resumo do pedido</p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink/60">Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-semibold">
                <dt>Desconto {percent}%</dt>
                <dd>-{formatPrice(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink/60">Frete</dt>
              <dd className={freteGratis ? 'font-semibold' : 'text-ink/60'}>
                {freteGratis ? 'Grátis' : 'Calculado no próximo passo'}
              </dd>
            </div>
            {upcoming && (
              <p className="border-t border-ink/10 pt-3 text-xs leading-relaxed text-ink">
                Leve mais {upcoming.minItems - totalItems}{' '}
                {upcoming.minItems - totalItems === 1 ? 'peça' : 'peças'} e ganhe{' '}
                <span className="font-bold">{upcoming.percent}% de desconto</span>.
              </p>
            )}
            {!freteGratis && (
              <p className="pt-1 text-xs text-ink/60">
                Falta {formatPrice(settings.freeShippingThreshold - subtotal)} para frete grátis.
                Informe o CEP no próximo passo para ver o valor e os prazos.
              </p>
            )}
          </dl>
          <div className="mt-5 flex items-baseline justify-between border-t border-ink/15 pt-5">
            <span className="eyebrow">{freteGratis ? 'Total' : 'Total sem frete'}</span>
            <span className="text-xl font-black tracking-tight">{formatPrice(total)}</span>
          </div>
          <Link href="/checkout" className="btn-primary mt-6 w-full">
            Finalizar compra
          </Link>
          <Link
            href="/produtos"
            className="mt-4 block text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60 underline underline-offset-4 transition hover:text-ink"
          >
            Continuar comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
