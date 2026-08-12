'use client';

import { useMemo, useState } from 'react';

export interface SizeRow {
  category: string;
  size: string;
  bust?: number;
  waist?: number;
  hip?: number;
}

export function parseSizeGuide(raw: string | null | undefined): SizeRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((r): r is SizeRow => r && typeof r.category === 'string' && typeof r.size === 'string')
      : [];
  } catch {
    return [];
  }
}

const LABEL: Record<keyof Omit<SizeRow, 'category' | 'size'>, string> = {
  bust: 'Busto',
  waist: 'Cintura',
  hip: 'Quadril',
};

/**
 * Tabela de medidas e sugestão de tamanho.
 *
 * As medidas vêm das Configurações — não são inventadas em código. Tabela de
 * medidas errada gera troca e cliente irritado, então enquanto o lojista não
 * preencher, o botão nem aparece.
 */
export function SizeGuide({ category, sizeGuide }: { category: string; sizeGuide: string }) {
  const [open, setOpen] = useState(false);
  const [bust, setBust] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');

  const rows = useMemo(
    () => parseSizeGuide(sizeGuide).filter((r) => r.category === category),
    [sizeGuide, category]
  );

  // Colunas que realmente têm dado — top não tem quadril, legging não tem busto.
  const columns = (['bust', 'waist', 'hip'] as const).filter((key) =>
    rows.some((row) => typeof row[key] === 'number')
  );

  const suggestion = useMemo(() => {
    const informed: Partial<Record<'bust' | 'waist' | 'hip', number>> = {};
    if (bust) informed.bust = Number(bust);
    if (waist) informed.waist = Number(waist);
    if (hip) informed.hip = Number(hip);
    const keys = Object.keys(informed) as ('bust' | 'waist' | 'hip')[];
    if (keys.length === 0 || rows.length === 0) return null;

    // Menor distância entre o que a pessoa informou e a medida de cada tamanho.
    let best: { size: string; distance: number } | null = null;
    for (const row of rows) {
      const usable = keys.filter((k) => typeof row[k] === 'number');
      if (usable.length === 0) continue;
      const distance =
        usable.reduce((sum, k) => sum + Math.abs((row[k] as number) - (informed[k] as number)), 0) /
        usable.length;
      if (!best || distance < best.distance) best = { size: row.size, distance };
    }
    return best?.size ?? null;
  }, [bust, waist, hip, rows]);

  if (rows.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold uppercase tracking-[0.12em] underline underline-offset-4 transition hover:opacity-60"
      >
        Tabela de medidas
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Tabela de medidas"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto bg-white p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-ink/50">{category}</p>
                <h2 className="section-title mt-2 text-2xl">Tabela de medidas</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="text-2xl leading-none text-ink/50 hover:text-ink"
              >
                ×
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/15 text-left">
                    <th className="py-2 pr-4 text-[11px] font-bold uppercase tracking-[0.12em]">Tam.</th>
                    {columns.map((key) => (
                      <th key={key} className="py-2 pr-4 text-[11px] font-bold uppercase tracking-[0.12em]">
                        {LABEL[key]} (cm)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.size}
                      className={`border-b border-line ${suggestion === row.size ? 'bg-paper font-bold' : ''}`}
                    >
                      <td className="py-2.5 pr-4">{row.size}</td>
                      {columns.map((key) => (
                        <td key={key} className="py-2.5 pr-4 text-ink/75">
                          {typeof row[key] === 'number' ? row[key] : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <p className="eyebrow text-ink/50">Descubra seu tamanho</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                Informe suas medidas em centímetros. Sugerimos o tamanho mais próximo.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {columns.map((key) => (
                  <div key={key}>
                    <label htmlFor={`medida-${key}`} className="mb-1 block text-[11px] uppercase tracking-[0.12em] text-ink/60">
                      {LABEL[key]}
                    </label>
                    <input
                      id={`medida-${key}`}
                      inputMode="numeric"
                      value={key === 'bust' ? bust : key === 'waist' ? waist : hip}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                        if (key === 'bust') setBust(v);
                        else if (key === 'waist') setWaist(v);
                        else setHip(v);
                      }}
                      className="w-full border border-ink/20 px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {suggestion && (
                <p className="mt-5 bg-ink px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white">
                  Seu tamanho: {suggestion}
                </p>
              )}

              <p className="mt-4 text-xs leading-relaxed text-ink/60">
                É uma sugestão a partir das medidas da peça. Entre dois tamanhos, escolha o maior
                para caimento mais solto.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
