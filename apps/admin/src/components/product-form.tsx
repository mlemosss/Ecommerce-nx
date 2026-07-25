'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import type { Product } from '../lib/types';

const CATEGORY_OPTIONS = ['leggings', 'tops', 'shorts', 'camisetas', 'jaquetas', 'acessorios'];

interface VariantRow {
  color: string;
  size: string;
  stock: number;
}

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? CATEGORY_OPTIONS[0]);
  const [description, setDescription] = useState(product?.description ?? '');
  const [costPrice, setCostPrice] = useState(product?.costPrice?.toString() ?? '');
  const [price, setPrice] = useState(product?.price?.toString() ?? '');
  const [compareAtPrice, setCompareAtPrice] = useState(product?.compareAtPrice?.toString() ?? '');
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((v) => ({ color: v.color, size: v.size, stock: v.stock })) ?? [
      { color: '', size: '', stock: 0 },
    ]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateVariant(index: number, patch: Partial<VariantRow>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addVariant() {
    setVariants((prev) => [...prev, { color: '', size: '', stock: 0 }]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const validVariants = variants.filter((v) => v.color.trim() && v.size.trim());
    if (validVariants.length === 0) {
      setError('Adicione ao menos uma variação com cor e tamanho.');
      return;
    }

    const payload = {
      name,
      category,
      description,
      costPrice: Number(costPrice),
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      variants: validVariants,
    };

    setSubmitting(true);
    try {
      if (isEdit && product) {
        await api.patch(`/products/${product.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      router.push('/produtos');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar produto');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    if (!window.confirm('Excluir este produto?')) return;
    await api.delete(`/products/${product.id}`);
    router.push('/produtos');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-4 pb-8 pt-4">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div>
        <label className="mb-1 block text-sm font-semibold">Nome do produto</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Categoria</label>
        <input
          required
          list="categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input-field"
        />
        <datalist id="categories">
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-semibold">Custo (R$)</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Preço de venda (R$)</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Preço &quot;de&quot; (opcional, para desconto)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={compareAtPrice}
          onChange={(e) => setCompareAtPrice(e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-semibold">Variações (cor / tamanho / estoque)</label>
          <button type="button" onClick={addVariant} className="text-sm font-semibold text-accent">
            + Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {variants.map((variant, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                placeholder="Cor"
                value={variant.color}
                onChange={(e) => updateVariant(index, { color: e.target.value })}
                className="input-field flex-1"
              />
              <input
                placeholder="Tam."
                value={variant.size}
                onChange={(e) => updateVariant(index, { size: e.target.value })}
                className="input-field w-20"
              />
              <input
                type="number"
                min="0"
                placeholder="Qtd."
                value={variant.stock}
                onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })}
                className="input-field w-20"
              />
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500"
                aria-label="Remover variação"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Salvando...' : 'Salvar'}
      </button>

      {isEdit && (
        <button type="button" onClick={handleDelete} className="btn-danger w-full">
          Excluir produto
        </button>
      )}
    </form>
  );
}
