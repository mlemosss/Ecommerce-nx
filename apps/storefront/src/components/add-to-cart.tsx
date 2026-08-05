'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '../lib/types';
import { useCart } from '../lib/cart-context';
import { getVariantPrice } from '../lib/products';
import { formatInstallments, formatPrice } from '../lib/format';

export function AddToCart({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const price = getVariantPrice(product, color, size);

  function handleAdd() {
    addItem({ productId: product.id, size, color, quantity });
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold">{formatPrice(price)}</span>
          {product.compareAtPrice && (
            <span className="text-lg text-black/60 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-black/50">{formatInstallments(price)}</p>
      </div>

      <p className="text-black/70">{product.description}</p>

      <div>
        <p className="mb-2 text-sm font-semibold">Tamanho</p>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSize(s);
                setAdded(false);
              }}
              className={`h-10 min-w-[2.5rem] rounded-lg border px-3 text-sm font-medium transition ${
                size === s ? 'border-ink bg-ink text-white' : 'border-black/15 hover:border-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Cor</p>
        <div className="flex flex-wrap gap-2">
          {product.colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setAdded(false);
              }}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                color === c ? 'border-ink bg-ink text-white' : 'border-black/15 hover:border-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Quantidade</p>
        <div className="inline-flex items-center rounded-full border border-black/15">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center text-lg"
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(10, q + 1))}
            className="flex h-10 w-10 items-center justify-center text-lg"
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>
      </div>

      <button type="button" onClick={handleAdd} className="btn-primary w-full sm:w-auto">
        Adicionar ao carrinho
      </button>

      {added && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setAdded(false)}
          role="dialog"
          aria-label="Produto adicionado ao carrinho"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-green-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
              </svg>
              <p className="text-sm font-bold uppercase tracking-wide">Adicionado ao carrinho</p>
            </div>
            <p className="mt-2 text-sm text-black/60">
              {product.name} · {color} · {size} · {quantity} un
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link href="/checkout" className="btn-primary w-full">
                Finalizar compra
              </Link>
              <Link href="/carrinho" className="btn-secondary w-full">
                Ver carrinho
              </Link>
              <button
                type="button"
                onClick={() => setAdded(false)}
                className="w-full py-2 text-sm font-semibold text-black/60 underline underline-offset-4 hover:text-ink"
              >
                Continuar comprando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
