'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import type { StoreSettings } from '../lib/types';

interface SizeRow {
  category: string;
  size: string;
  bust?: number;
  waist?: number;
  hip?: number;
}

const CATEGORIES = ['leggings', 'tops', 'shorts', 'camisetas', 'jaquetas', 'acessorios'];

function parse(raw: string | null | undefined): SizeRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Tabela de medidas por categoria e tamanho.
 *
 * Os números são do lojista: medida errada aqui vira troca e cliente irritado,
 * então nada é preenchido por padrão. Sem linhas, a loja não mostra o botão.
 */
export function SizeGuideSettings({ settings }: { settings: StoreSettings }) {
  const [rows, setRows] = useState<SizeRow[]>(parse(settings.sizeGuide));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function update(index: number, field: keyof SizeRow, value: string) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === 'category' || field === 'size') return { ...row, [field]: value };
        return { ...row, [field]: value === '' ? undefined : Number(value) };
      })
    );
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const clean = rows.filter((r) => r.category && r.size);
      await api.patch('/settings', { sizeGuide: JSON.stringify(clean) });
      setRows(clean);
      setSaved(true);
    } catch (err) {
      setError((err as Error)?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card mt-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Tabela de medidas</h2>
        <p className="mt-1 text-sm text-black/60">
          Medidas <span className="font-semibold">da peça</span>, em centímetros. Aparece na página
          do produto junto com o provador, que sugere o tamanho a partir das medidas do cliente.
          Enquanto estiver vazia, o botão não aparece na loja.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[1.3fr_0.7fr_1fr_1fr_1fr_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-black/50">
            <span>Categoria</span>
            <span>Tam.</span>
            <span>Busto</span>
            <span>Cintura</span>
            <span>Quadril</span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-[1.3fr_0.7fr_1fr_1fr_1fr_auto] gap-2">
              <select
                value={row.category}
                onChange={(e) => update(index, 'category', e.target.value)}
                className="rounded-lg border border-black/15 px-2 py-1.5 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={row.size}
                onChange={(e) => update(index, 'size', e.target.value.toUpperCase())}
                placeholder="M"
                className="rounded-lg border border-black/15 px-2 py-1.5 text-center text-sm"
              />
              {(['bust', 'waist', 'hip'] as const).map((field) => (
                <input
                  key={field}
                  type="number"
                  min="1"
                  value={row[field] ?? ''}
                  onChange={(e) => update(index, field, e.target.value)}
                  placeholder="—"
                  className="rounded-lg border border-black/15 px-2 py-1.5 text-center text-sm"
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  setRows((prev) => prev.filter((_, i) => i !== index));
                  setSaved(false);
                }}
                className="px-2 text-xs font-semibold text-black/50 hover:text-red-600"
                aria-label="Remover linha"
              >
                ✕
              </button>
            </div>
          ))}
          <p className="text-xs text-black/60">
            Deixe em branco a medida que não se aplica — top não tem quadril, legging não tem busto.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setRows((prev) => [...prev, { category: CATEGORIES[0], size: '' }]);
            setSaved(false);
          }}
          className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold hover:border-ink"
        >
          Adicionar linha
        </button>
        {rows.length === 0 && (
          <button
            type="button"
            onClick={() => {
              setRows(
                ['leggings', 'tops', 'shorts'].flatMap((category) =>
                  ['PP', 'P', 'M', 'G'].map((size) => ({ category, size }))
                )
              );
              setSaved(false);
            }}
            className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold hover:border-ink"
          >
            Começar com PP/P/M/G
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm font-semibold text-green-700">Tabela salva.</p>}

      <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">
        {saving ? 'Salvando...' : 'Salvar tabela'}
      </button>
    </section>
  );
}
