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
            <span className="text-lg text-black/40 line-through">
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
        <p className="rounded-xl bg-black/5 px-4 py-3 text-sm">
          Produto adicionado!{' '}
          <Link href="/carrinho" className="font-semibold underline underline-offset-4">
            Ir para o carrinho
          </Link>
        </p>
      )}
    </div>
  );
}
