'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '../lib/types';
import { useCart } from '../lib/cart-context';
import { getVariantPrice } from '../lib/products';
import { formatInstallments, formatPrice } from '../lib/format';
import { SizeGuide } from './size-guide';

export function AddToCart({ product, sizeGuide }: { product: Product; sizeGuide?: string }) {
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
    <div className="flex flex-col gap-7">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-black tracking-tight">{formatPrice(price)}</span>
          {product.compareAtPrice && (
            <span className="text-lg text-ink/60 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink/60">{formatInstallments(price)}</p>
      </div>

      {/* Descrição vem das Configurações do produto. Linha em branco separa
          parágrafos; vazia, a seção nem aparece (em vez de deixar um buraco). */}
      {product.description?.trim() && (
        <div className="space-y-3 border-t border-line pt-6">
          <p className="eyebrow text-ink/50">Descrição</p>
          {product.description
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index} className="text-sm leading-relaxed text-ink/75">
                {paragraph}
              </p>
            ))}
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="eyebrow text-ink/50">Tamanho</p>
          {sizeGuide && <SizeGuide category={product.category} sizeGuide={sizeGuide} />}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {product.sizes.map((s) => (
            <OptionButton
              key={s}
              active={size === s}
              onClick={() => {
                setSize(s);
                setAdded(false);
              }}
              className="h-11 min-w-[2.75rem] px-3"
            >
              {s}
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3 text-ink/50">Cor</p>
        <div className="flex flex-wrap gap-1.5">
          {product.colors.map((c) => (
            <OptionButton
              key={c}
              active={color === c}
              onClick={() => {
                setColor(c);
                setAdded(false);
              }}
              className="h-11 px-4"
            >
              {c}
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3 text-ink/50">Quantidade</p>
        <div className="inline-flex items-center border border-ink/15">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-lg transition hover:bg-paper"
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-bold">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(10, q + 1))}
            className="flex h-11 w-11 items-center justify-center text-lg transition hover:bg-paper"
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>
      </div>

      <button type="button" onClick={handleAdd} className="btn-primary w-full">
        Adicionar ao carrinho
      </button>

      {added && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center"
          onClick={() => setAdded(false)}
          role="dialog"
          aria-label="Produto adicionado ao carrinho"
        >
          <div
            className="w-full max-w-sm bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-[0.16em]">
                Adicionado ao carrinho
              </p>
            </div>
            <p className="mt-3 text-sm text-ink/60">
              {product.name} · {color} · {size} · {quantity} un
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/checkout" className="btn-primary w-full">
                Finalizar compra
              </Link>
              <Link href="/carrinho" className="btn-secondary w-full">
                Ver carrinho
              </Link>
              <button
                type="button"
                onClick={() => setAdded(false)}
                className="w-full py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60 underline underline-offset-4 transition hover:text-ink"
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

function OptionButton({
  active,
  onClick,
  className = '',
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border text-sm font-semibold transition ${className} ${
        active ? 'border-ink bg-ink text-white' : 'border-ink/15 hover:border-ink'
      }`}
    >
      {children}
    </button>
  );
}
