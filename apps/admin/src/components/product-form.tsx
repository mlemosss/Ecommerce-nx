'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { api, ApiError, resolveMediaUrl, uploadProductImage } from '../lib/api';
import type { Product } from '../lib/types';

const CATEGORY_OPTIONS = ['leggings', 'tops', 'shorts', 'camisetas', 'jaquetas', 'acessorios'];

interface VariantRow {
  color: string;
  size: string;
  stock: number;
  price: string;
  costPrice: string;
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
  const [active, setActive] = useState(product?.active ?? true);
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((v) => ({
      color: v.color,
      size: v.size,
      stock: v.stock,
      price: v.price?.toString() ?? '',
      costPrice: v.costPrice?.toString() ?? '',
    })) ?? [{ color: '', size: '', stock: 0, price: '', costPrice: '' }]
  );
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError('');
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadProductImage(file);
        setImages((prev) => [...prev, url]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((img) => img !== url));
  }

  function updateVariant(index: number, patch: Partial<VariantRow>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addVariant() {
    setVariants((prev) => [...prev, { color: '', size: '', stock: 0, price: '', costPrice: '' }]);
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
      active,
      images,
      variants: validVariants.map((v) => ({
        color: v.color,
        size: v.size,
        stock: v.stock,
        price: v.price ? Number(v.price) : undefined,
        costPrice: v.costPrice ? Number(v.costPrice) : undefined,
      })),
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
    setError('');
    try {
      await api.delete(`/products/${product.id}`);
      router.push('/produtos');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao excluir produto');
    }
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
        {/* 14 linhas e redimensionável: a descrição real tem vários parágrafos e
            uma caixa de 3 linhas obrigava a rolar às cegas para conferir o texto. */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={14}
          className="input-field resize-y"
        />
        <p className="mt-1 text-xs text-black/40">
          Deixe uma <span className="font-semibold">linha em branco</span> entre os parágrafos: é ela
          que separa os blocos na loja. Quebra de linha simples vira espaço e o texto sai grudado.
        </p>
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

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
        Produto ativo (visível na loja)
      </label>

      <div>
        <label className="mb-1 block text-sm font-semibold">Fotos do produto</label>
        <div className="flex flex-wrap gap-3">
          {images.map((url) => (
            <div key={url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveMediaUrl(url)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                aria-label="Remover foto"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 text-xs text-black/50 disabled:opacity-60"
          >
            {uploading ? 'Enviando...' : '+ Foto'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </div>
        <p className="mt-1 text-xs text-black/40">JPG, PNG ou WEBP, até 5MB cada. A primeira foto é a capa do produto.</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-semibold">Variações (cor / tamanho / estoque)</label>
          <button type="button" onClick={addVariant} className="text-sm font-semibold text-accent">
            + Adicionar
          </button>
        </div>
        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div key={index} className="rounded-xl border border-black/10 p-2">
              <div className="flex items-center gap-2">
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
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Custo diferente (opcional)"
                  value={variant.costPrice}
                  onChange={(e) => updateVariant(index, { costPrice: e.target.value })}
                  className="input-field flex-1 !text-xs"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Preço diferente (opcional)"
                  value={variant.price}
                  onChange={(e) => updateVariant(index, { price: e.target.value })}
                  className="input-field flex-1 !text-xs"
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-black/40">
          Deixe em branco pra usar o custo/preço do produto. Preencha só quando essa cor/tamanho tiver um
          valor diferente.
        </p>
      </div>

      {isEdit && (
        <button type="button" onClick={handleDelete} className="btn-danger w-full">
          Excluir produto
        </button>
      )}

      {/* Barra de ação fixa no rodapé da tela para salvar sem precisar rolar. */}
      <div className="sticky bottom-0 z-50 mt-2 border-t border-black/10 bg-white/95 py-3 backdrop-blur">
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
