'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { formatPrice } from '../lib/format';
import type { Product } from '../lib/types';

export function isOnSale(product: Product): boolean {
  return product.compareAtPrice != null && product.compareAtPrice > product.price;
}

/** Preço cheio da peça: o "de" quando está em promoção, senão o próprio preço. */
export function fullPrice(product: Product): number {
  return isOnSale(product) ? (product.compareAtPrice as number) : product.price;
}

/**
 * Coloca a peça em promoção ou tira dela. O preço cheio nunca se perde: ele vira
 * o "de" enquanto a promoção dura e volta ao lugar quando ela acaba.
 */
export function SaleButton({ product, onDone }: { product: Product; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSale = isOnSale(product);
  const full = fullPrice(product);

  async function apply(salePrice: number | null) {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/products/${product.id}/sale`, { salePrice });
      setEditing(false);
      setValue('');
      onDone();
    } catch (err) {
      setError((err as Error)?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (onSale && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-ink px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          -{Math.round((1 - product.price / full) * 100)}%
        </span>
        <button
          type="button"
          onClick={() => {
            setValue(String(product.price));
            setEditing(true);
          }}
          className="text-xs font-semibold underline underline-offset-4"
        >
          Alterar
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => apply(null)}
          className="text-xs font-semibold text-black/60 underline underline-offset-4 hover:text-red-600 disabled:opacity-50"
        >
          Tirar da promoção
        </button>
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold transition hover:border-ink"
      >
        Colocar em promoção
      </button>
    );
  }

  return (
    <div className="w-full">
      <p className="text-xs text-black/60">
        Preço cheio: <span className="font-semibold">{formatPrice(full)}</span>
      </p>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          min="0.01"
          autoFocus
          placeholder="Preço promocional"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32 rounded-lg border border-black/15 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={saving || !value}
          onClick={() => apply(Number(value))}
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Aplicar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError('');
          }}
          className="text-xs font-semibold text-black/60 underline underline-offset-4"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
