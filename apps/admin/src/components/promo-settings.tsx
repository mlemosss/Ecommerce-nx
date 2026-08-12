'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import type { StoreSettings } from '../lib/types';

interface Tier {
  minItems: number;
  percent: number;
}

/** Faixas padrão sugeridas: 1 peça 10%, 2 peças 20%, 3+ 30%. */
const SUGGESTED: Tier[] = [
  { minItems: 1, percent: 10 },
  { minItems: 2, percent: 20 },
  { minItems: 3, percent: 30 },
];

function parseTiers(raw: string | null | undefined): Tier[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Desconto progressivo e faixa de promoção.
 *
 * Tem envio próprio para o lojista poder ligar e desligar a promoção sem
 * precisar salvar o formulão de configurações inteiro.
 */
export function PromoSettings({ settings }: { settings: StoreSettings }) {
  const [tiers, setTiers] = useState<Tier[]>(parseTiers(settings.progressiveDiscount));
  const [text, setText] = useState(settings.promoBannerText ?? '');
  const [endsAt, setEndsAt] = useState(settings.promoBannerEndsAt?.slice(0, 10) ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function updateTier(index: number, field: keyof Tier, value: number) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    setSaved(false);
  }

  async function save(nextTiers: Tier[] = tiers) {
    setSaving(true);
    setError('');
    try {
      const clean = nextTiers
        .filter((t) => t.minItems > 0 && t.percent > 0 && t.percent < 100)
        .sort((a, b) => a.minItems - b.minItems);

      await api.patch('/settings', {
        progressiveDiscount: JSON.stringify(clean),
        promoBannerText: text,
        promoBannerEndsAt: endsAt || '',
      });
      setTiers(clean);
      setSaved(true);
    } catch (err) {
      setError((err as Error)?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  const active = tiers.length > 0;

  return (
    <section className="card mt-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Promoção</h2>
        <p className="mt-1 text-sm text-black/60">
          Desconto por quantidade de peças no carrinho. Não soma com cupom: o cliente recebe o maior
          dos dois.
        </p>
      </div>

      <div className="rounded-xl bg-black/5 px-3 py-2 text-sm">
        {active ? (
          <span>
            <span className="font-semibold">Ativa:</span>{' '}
            {tiers.map((t) => `${t.minItems}+ = ${t.percent}%`).join(' · ')}
          </span>
        ) : (
          <span className="text-black/60">Desligada — nenhum desconto por quantidade.</span>
        )}
      </div>

      {tiers.length > 0 && (
        <div className="space-y-2">
          {tiers.map((tier, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="text-black/60">A partir de</span>
              <input
                type="number"
                min="1"
                value={tier.minItems}
                onChange={(e) => updateTier(index, 'minItems', Number(e.target.value))}
                className="w-16 rounded-lg border border-black/15 px-2 py-1.5 text-center"
              />
              <span className="text-black/60">peças →</span>
              <input
                type="number"
                min="1"
                max="99"
                value={tier.percent}
                onChange={(e) => updateTier(index, 'percent', Number(e.target.value))}
                className="w-16 rounded-lg border border-black/15 px-2 py-1.5 text-center"
              />
              <span className="text-black/60">% off</span>
              <button
                type="button"
                onClick={() => {
                  setTiers((prev) => prev.filter((_, i) => i !== index));
                  setSaved(false);
                }}
                className="ml-auto text-xs font-semibold text-black/60 underline underline-offset-4 hover:text-red-600"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setTiers((prev) => [...prev, { minItems: prev.length + 1, percent: 10 }]);
            setSaved(false);
          }}
          className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold hover:border-ink"
        >
          Adicionar faixa
        </button>
        {tiers.length === 0 && (
          <button
            type="button"
            onClick={() => {
              setTiers(SUGGESTED);
              setSaved(false);
            }}
            className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold hover:border-ink"
          >
            Usar 10% / 20% / 30%
          </button>
        )}
        {tiers.length > 0 && (
          <button
            type="button"
            onClick={() => save([])}
            className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold text-black/60 hover:border-red-300 hover:text-red-600"
          >
            Desligar promoção
          </button>
        )}
      </div>

      <div className="border-t border-black/10 pt-4">
        <label className="mb-1 block text-sm font-semibold">Faixa no topo da loja</label>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          placeholder="Deixe vazio para montar sozinho a partir das faixas"
          className="input-field w-full"
        />
        <label className="mb-1 mt-3 block text-sm font-semibold">Acaba em (opcional)</label>
        <input
          type="date"
          value={endsAt}
          onChange={(e) => {
            setEndsAt(e.target.value);
            setSaved(false);
          }}
          className="input-field"
        />
        <p className="mt-1 text-xs text-black/60">
          Passada a data, a faixa some sozinha da loja. O desconto continua até você desligar.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm font-semibold text-green-700">Promoção salva.</p>}

      <button
        type="button"
        onClick={() => save()}
        disabled={saving}
        className="btn-primary disabled:opacity-60"
      >
        {saving ? 'Salvando...' : 'Salvar promoção'}
      </button>
    </section>
  );
}
