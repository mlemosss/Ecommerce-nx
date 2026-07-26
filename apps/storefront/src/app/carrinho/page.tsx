'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../lib/cart-context';
import { useProducts } from '../../lib/products-context';
import { formatPrice } from '../../lib/format';
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
    return <div className="container-page py-24 text-center text-black/50">Carregando carrinho...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="section-title">Seu carrinho está vazio</h1>
        <p className="text-black/60">Que tal dar uma olhada nos nossos lançamentos?</p>
        <Link href="/produtos" className="btn-primary">
          Ver produtos
        </Link>
      </div>
    );
  }

  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
  const total = subtotal + shipping;

  return (
    <div className="container-page py-10">
      <h1 className="section-title">Meu carrinho</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <ul className="space-y-4 lg:col-span-2">
          {items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            return (
              <li
                key={`${item.productId}-${item.size}-${item.color}`}
                className="flex gap-4 rounded-2xl border border-black/10 p-4"
              >
                <Link href={`/produtos/${product.slug}`} className="shrink-0">
                  <ProductImage
                    category={product.category}
                    gradient={product.gradient}
                    photo={product.images?.[0]}
                    className="h-24 w-24 rounded-xl"
                  />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/produtos/${product.slug}`} className="font-semibold hover:underline">
                        {product.name}
                      </Link>
                      <p className="text-sm text-black/50">
                        Tamanho {item.size} · Cor {item.color}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.size, item.color)}
                      className="text-sm text-black/40 hover:text-red-600"
                      aria-label="Remover item"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="inline-flex items-center rounded-full border border-black/15">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.size, item.color, item.quantity - 1)
                        }
                        className="flex h-8 w-8 items-center justify-center"
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.size, item.color, item.quantity + 1)
                        }
                        className="flex h-8 w-8 items-center justify-center"
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold">{formatPrice(product.price * item.quantity)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="h-fit rounded-2xl border border-black/10 p-6">
          <h2 className="text-lg font-bold">Resumo do pedido</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-black/60">Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black/60">Frete</dt>
              <dd>{shipping === 0 ? 'Grátis' : formatPrice(shipping)}</dd>
            </div>
            {shipping > 0 && (
              <p className="text-xs text-black/50">
                Falta {formatPrice(settings.freeShippingThreshold - subtotal)} para frete grátis.
              </p>
            )}
          </dl>
          <div className="mt-4 flex justify-between border-t border-black/10 pt-4 text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <Link href="/checkout" className="btn-primary mt-6 w-full">
            Finalizar compra
          </Link>
          <Link href="/produtos" className="mt-3 block text-center text-sm text-black/60 hover:underline">
            Continuar comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
